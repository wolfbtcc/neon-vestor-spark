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

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Get all profiles with invested > 0
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, invested, profits, balance')
      .gt('invested', 0)

    if (profilesError) throw profilesError
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with active balance', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const DAILY_RATE = 0.01 // 1% per day
    const USER_SHARE = 0.70 // 70% to user
    const PLATFORM_SHARE = 0.30 // 30% platform fee
    let totalProcessed = 0

    for (const profile of profiles) {
      // Check if yield already generated today for this user
      const { data: existing } = await supabase
        .from('profit_history')
        .select('id')
        .eq('user_id', profile.user_id)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)
        .limit(1)

      if (existing && existing.length > 0) continue // Already processed today

      const grossProfit = profile.invested * DAILY_RATE
      const platformFee = grossProfit * PLATFORM_SHARE
      const netProfit = grossProfit * USER_SHARE

      // Insert profit history entry
      const { error: insertError } = await supabase.from('profit_history').insert({
        user_id: profile.user_id,
        amount: grossProfit,
        fee: 0, // No pool fee in new model
        platform_fee: platformFee,
        net: netProfit,
        investment_id: null, // No longer tied to specific investment
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`Error inserting profit for user ${profile.user_id}:`, insertError)
        continue
      }

      // Update user profile balance
      await supabase.from('profiles').update({
        profits: profile.profits + netProfit,
        balance: profile.balance + netProfit,
      }).eq('user_id', profile.user_id)

      totalProcessed++
    }

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
