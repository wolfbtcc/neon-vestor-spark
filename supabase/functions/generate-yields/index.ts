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

    // Group investments by user for batch updates
    const userUpdates: Record<string, { netTotal: number; completedIds: string[] }> = {}

    for (const inv of activeInvestments) {
      const endDate = new Date(inv.end_date).getTime()
      const startDate = new Date(inv.start_date).getTime()

      // Check if investment has ended
      if (now >= endDate) {
        // Mark as completed
        await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id)
        if (!userUpdates[inv.user_id]) userUpdates[inv.user_id] = { netTotal: 0, completedIds: [] }
        userUpdates[inv.user_id].completedIds.push(inv.id)
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

      // Need at least 30 seconds elapsed
      if (elapsedMs < 30000) continue

      const intervals = Math.floor(elapsedMs / 30000)
      if (intervals <= 0) continue

      // High precision calculation
      const amount = inv.amount
      const returnPct = inv.return_percent
      const durationDays = inv.duration_days

      const totalProfit = amount * (returnPct / 100)
      const durationSeconds = durationDays * 86400
      const profitPer30s = totalProfit / (durationSeconds / 30)

      const totalBruto = profitPer30s * intervals
      const fee = totalBruto * POOL_RATE
      const net = totalBruto - fee

      // Insert aggregated profit entry
      const { error: insertError } = await supabase.from('profit_history').insert({
        user_id: inv.user_id,
        amount: totalBruto,
        fee: fee,
        net: net,
        investment_id: inv.id,
      })

      if (insertError) {
        console.error(`Error inserting profit for investment ${inv.id}:`, insertError)
        continue
      }

      if (!userUpdates[inv.user_id]) userUpdates[inv.user_id] = { netTotal: 0, completedIds: [] }
      userUpdates[inv.user_id].netTotal += net

      totalProcessed++
    }

    // Batch update user profiles
    for (const [userId, update] of Object.entries(userUpdates)) {
      if (update.netTotal > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profits, balance')
          .eq('user_id', userId)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            profits: profile.profits + update.netTotal,
            balance: profile.balance + update.netTotal,
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
