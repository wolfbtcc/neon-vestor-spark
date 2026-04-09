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

    const DAILY_RATE = 0.006 // 0.6% per day
    const POOL_RATE = 0.15
    const PLATFORM_RATE = 0.15

    // Get all profiles with invested > 0
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, invested, profits, balance')
      .gt('invested', 0)

    if (profileError) throw profileError
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No active investors', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toISOString().split('T')[0]
    let totalProcessed = 0

    for (const profile of profiles) {
      // Check if yield was already generated today for this user
      const { data: existing } = await supabase
        .from('profit_history')
        .select('id')
        .eq('user_id', profile.user_id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`)
        .limit(1)

      if (existing && existing.length > 0) continue // Already processed today

      const grossProfit = profile.invested * DAILY_RATE
      const poolFee = grossProfit * POOL_RATE
      const afterPool = grossProfit - poolFee
      const platformFee = afterPool * PLATFORM_RATE
      const netProfit = afterPool - platformFee

      // Insert profit history entry
      const { error: insertError } = await supabase.from('profit_history').insert({
        user_id: profile.user_id,
        amount: grossProfit,
        fee: poolFee,
        platform_fee: platformFee,
        net: netProfit,
        investment_id: null,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`Error inserting profit for user ${profile.user_id}:`, insertError)
        continue
      }

      // Update user profile
      const { error: updateError } = await supabase.from('profiles').update({
        profits: profile.profits + netProfit,
        balance: profile.balance + netProfit,
      }).eq('user_id', profile.user_id)

      if (updateError) {
        console.error(`Error updating profile for user ${profile.user_id}:`, updateError)
        continue
      }

      totalProcessed++
    }

    console.log(`Daily yield generated for ${totalProcessed} users on ${today}`)

    return new Response(
      JSON.stringify({ message: 'Daily yields generated', processed: totalProcessed, date: today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating daily yields:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
