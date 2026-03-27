import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 20
const INTERVAL_MS = 3600000 // 1 hour in milliseconds
const MIN_ELAPSED_MS = 3000000 // ~50 minutes minimum to avoid double-processing
const POOL_RATE = 0.15

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
    let totalProcessed = 0

    // Process investments in batches to avoid overloading the database
    for (let batchStart = 0; batchStart < activeInvestments.length; batchStart += BATCH_SIZE) {
      const batch = activeInvestments.slice(batchStart, batchStart + BATCH_SIZE)

      // Track net totals per user for batch profile updates
      const userUpdates: Record<string, number> = {}

      for (const inv of batch) {
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

        // Need at least ~50 minutes elapsed to avoid double-processing
        if (elapsedMs < MIN_ELAPSED_MS) continue

        // Calculate how many full hours have elapsed
        const intervals = Math.floor(elapsedMs / INTERVAL_MS)
        if (intervals <= 0) continue

        // Calculate profit per hour (same total profit, just grouped into hourly chunks)
        const amount = inv.amount
        const returnPct = inv.return_percent
        const durationDays = inv.duration_days

        const totalProfit = amount * (returnPct / 100)
        const durationHours = durationDays * 24
        const profitPerHour = totalProfit / durationHours

        const poolPerHour = profitPerHour * POOL_RATE
        const netPerHour = profitPerHour - poolPerHour

        // Create one entry per hour interval
        const rows = []
        for (let i = 0; i < intervals; i++) {
          const entryTime = new Date(lastTime + (i + 1) * INTERVAL_MS).toISOString()
          rows.push({
            user_id: inv.user_id,
            amount: profitPerHour,
            fee: poolPerHour,
            net: netPerHour,
            investment_id: inv.id,
            created_at: entryTime,
          })
        }

        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50)
          const { error: insertError } = await supabase.from('profit_history').insert(chunk)
          if (insertError) {
            console.error(`Error inserting profit batch for investment ${inv.id}:`, insertError)
          }
        }

        // Accumulate net total for user profile update
        const totalNet = netPerHour * intervals
        if (!userUpdates[inv.user_id]) userUpdates[inv.user_id] = 0
        userUpdates[inv.user_id] += totalNet

        totalProcessed += intervals
      }

      // Batch update user profiles for this batch of investments
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
    }

    return new Response(
      JSON.stringify({ message: 'Yields generated (hourly)', processed: totalProcessed }),
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
