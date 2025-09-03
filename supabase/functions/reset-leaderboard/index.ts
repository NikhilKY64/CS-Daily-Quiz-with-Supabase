// Supabase Edge Function for resetting the leaderboard every 2 weeks
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check if this is a scheduled invocation or manual
    const isScheduled = req.headers.get('X-Scheduled') === 'true'
    
    // Reset all users' total_points to 0
    const { error: resetError } = await supabaseClient
      .from('profiles')
      .update({ total_points: 0 })
    
    if (resetError) {
      throw resetError
    }
    
    // Calculate the next reset date (2 weeks from now, on Monday)
    const nextResetDate = calculateNextResetDate()
    
    // Update or create the leaderboard_meta record
    const { data: metaData, error: metaError } = await supabaseClient
      .from('leaderboard_meta')
      .select('*')
      .limit(1)
      .single()
    
    if (metaError && metaError.code !== 'PGRST116') {
      throw metaError
    }
    
    if (metaData) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('leaderboard_meta')
        .update({ next_reset: nextResetDate })
        .eq('id', metaData.id)
      
      if (updateError) {
        throw updateError
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseClient
        .from('leaderboard_meta')
        .insert({ next_reset: nextResetDate })
      
      if (insertError) {
        throw insertError
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Leaderboard reset successfully',
        next_reset: nextResetDate,
        triggered_by: isScheduled ? 'schedule' : 'manual',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Helper function to calculate the next reset date (2 weeks from now, on Monday)
function calculateNextResetDate(): string {
  const today = new Date()
  const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  const daysUntilMonday = (dayOfWeek === 0) ? 1 : (dayOfWeek === 1) ? 14 : 8 - dayOfWeek + 7
  
  const nextMonday = new Date(today)
  nextMonday.setUTCDate(today.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)
  
  return nextMonday.toISOString()
}