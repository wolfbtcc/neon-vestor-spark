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

    for (const inv of activeInvestments) {
      const endDate = new Date(inv.end_date).getTime()
      const startDate = new Date(inv.start_date).getTime()

      // Check if investment has ended
      if (now >= endDate) {
        await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id)
      }

      // Find last profit entry for this investment
      const { data: lastProfit } = await supabase
        .from('profit_history')
        .select('created_at')
        .eq('investment_id', inv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastTime = lastProfit && lastProfit.length > 0
        ? new Date(lastProfit[0].created_at).getTime()
        : startDate

      // Calculate effective end time (don't generate past end date)
      const effectiveNow = Math.min(now, endDate)
      const elapsedMs = effectiveNow - lastTime

      // Need at least 5 minutes (300s) elapsed
      if (elapsedMs < 300000) continue

      const intervals = Math.floor(elapsedMs / 300000)
      if (intervals <= 0) continue

      // Precise calculation per 5-minute interval
      const amount = inv.amount
      const returnPct = inv.return_percent
      const durationDays = inv.duration_days

      const totalProfit = amount * (returnPct / 100)
      const durationSeconds = durationDays * 86400
      const totalIntervals = durationSeconds / 300
      const profitPer5min = totalProfit / totalIntervals

      const poolPer5min = profitPer5min * POOL_RATE
      const netPer5min = profitPer5min - poolPer5min

      // Create individual entries for each 5-minute interval
      const rows = []
      for (let i = 0; i < intervals; i++) {
        const entryTime = new Date(lastTime + (i + 1) * 300000).toISOString()
        rows.push({
          user_id: inv.user_id,
          amount: profitPer5min,
          fee: poolPer5min,
          net: netPer5min,
          investment_id: inv.id,
          created_at: entryTime,
        })
      }

      // Insert in batches of 50 to avoid payload limits
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error: insertError } = await supabase.from('profit_history').insert(batch)
        if (insertError) {
          console.error(`Error inserting profit batch for investment ${inv.id}:`, insertError)
        }
      }

      // Accumulate net total for user profile update
      const totalNet = netPer30s * intervals
      if (!userUpdates[inv.user_id]) userUpdates[inv.user_id] = 0
      userUpdates[inv.user_id] += totalNet

      totalProcessed += intervals
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
