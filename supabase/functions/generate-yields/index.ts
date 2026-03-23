import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get all active investments
    const { data: activeInvestments, error: invError } = await supabase
      .from('investments')
      .select('*')
      .eq('status', 'active')

    if (invError) throw invError
    if (!activeInvestments || activeInvestments.length === 0) {
      return new Response(JSON.stringify({ message: 'No active investments', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = Date.now()
    const POOL_RATE = 0.15
    let totalProcessed = 0

    // Track net totals per user for batch profile updates
    const userUpdates: Record<string, number> = {}

    // Batch: get the latest profit entry per investment in ONE query
    const investmentIds = activeInvestments.map(i => i.id)
    const { data: latestProfits } = await supabase
      .rpc('get_latest_profit_times', { p_investment_ids: investmentIds })

    // Fallback: if RPC doesn't exist, use individual queries
    let lastTimeMap: Record<string, number> = {}

    if (latestProfits && Array.isArray(latestProfits)) {
      for (const lp of latestProfits) {
        lastTimeMap[lp.investment_id] = new Date(lp.last_created_at).getTime()
      }
    } else {
      // Fallback: single query to get all latest profits for these investments
      const { data: allLastProfits } = await supabase
        .from('profit_history')
        .select('investment_id, created_at')
        .in('investment_id', investmentIds)
        .order('created_at', { ascending: false })

      if (allLastProfits) {
        // Keep only the latest per investment_id
        for (const p of allLastProfits) {
          if (!lastTimeMap[p.investment_id]) {
            lastTimeMap[p.investment_id] = new Date(p.created_at).getTime()
          }
        }
      }
    }

    // Collect all rows to insert in one batch
    const allRows: any[] = []

    for (const inv of activeInvestments) {
      const endDate = new Date(inv.end_date).getTime()
      const startDate = new Date(inv.start_date).getTime()

      // Check if investment has ended
      if (now >= endDate) {
        await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id)
      }

      const lastTime = lastTimeMap[inv.id] || startDate

      // Calculate effective end time (don't generate past end date)
      const effectiveNow = Math.min(now, endDate)
      const elapsedMs = effectiveNow - lastTime

      // Need at least 30 seconds elapsed
      if (elapsedMs < 30000) continue

      const intervals = Math.floor(elapsedMs / 30000)
      if (intervals <= 0) continue

      // Cap intervals to avoid generating too many rows at once
      const maxIntervals = Math.min(intervals, 120) // max 1 hour catch-up

      // Precise calculation per 30s interval
      const amount = Number(inv.amount)
      const returnPct = Number(inv.return_percent)
      const durationDays = Number(inv.duration_days)

      const totalProfit = amount * (returnPct / 100)
      const durationSeconds = durationDays * 86400
      const totalIntervals = durationSeconds / 30
      const profitPer30s = totalProfit / totalIntervals

      const poolPer30s = profitPer30s * POOL_RATE
      const netPer30s = profitPer30s - poolPer30s

      for (let i = 0; i < maxIntervals; i++) {
        const entryTime = new Date(lastTime + (i + 1) * 30000).toISOString()
        allRows.push({
          user_id: inv.user_id,
          amount: profitPer30s,
          fee: poolPer30s,
          net: netPer30s,
          investment_id: inv.id,
          created_at: entryTime,
        })
      }

      // Accumulate net total for user profile update
      const totalNet = netPer30s * maxIntervals
      if (!userUpdates[inv.user_id]) userUpdates[inv.user_id] = 0
      userUpdates[inv.user_id] += totalNet

      totalProcessed += maxIntervals
    }

    // Insert all rows in batches of 100
    for (let i = 0; i < allRows.length; i += 100) {
      const batch = allRows.slice(i, i + 100)
      const { error: insertError } = await supabase.from('profit_history').insert(batch)
      if (insertError) {
        console.error(`Error inserting profit batch:`, insertError)
      }
    }

    // Batch update user profiles
    for (const [userId, netTotal] of Object.entries(userUpdates)) {
      if (netTotal > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profits, balance')
          .eq('user_id', userId)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            profits: profile.profits + netTotal,
            balance: profile.balance + netTotal,
          }).eq('user_id', userId)
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Yields generated', processed: totalProcessed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating yields:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
