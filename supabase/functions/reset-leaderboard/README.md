# Leaderboard Reset Edge Function

This Edge Function automatically resets the leaderboard points for all users every two weeks on Monday and updates the next reset date in the `leaderboard_meta` table.

## Deployment Instructions

### 1. Deploy the Edge Function

```bash
supabase functions deploy reset-leaderboard --project-ref your-project-ref
```

### 2. Set up Scheduled Function Execution

To schedule the function to run automatically every two weeks on Monday, you'll need to set up a cron job using the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Database > Functions > Hooks
3. Create a new scheduled hook with the following settings:
   - Name: `reset-leaderboard-schedule`
   - Schedule: `0 0 * * 1` (This runs at midnight every Monday)
   - SQL Function: 
   ```sql
   -- Create a SQL function that calls the Edge Function
   CREATE OR REPLACE FUNCTION public.trigger_reset_leaderboard()
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
     next_reset_date TIMESTAMPTZ;
   BEGIN
     -- Get the next reset date from leaderboard_meta
     SELECT next_reset INTO next_reset_date FROM public.leaderboard_meta LIMIT 1;
     
     -- Only trigger the reset if today is the reset date
     IF next_reset_date::date = CURRENT_DATE THEN
       -- Call the Edge Function
       PERFORM net.http_post(
         url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/reset-leaderboard',
         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.anon_key') || '"}',
         body := '{"triggered_from": "scheduled_function"}'
       );
     END IF;
   END;
   $$;
   ```

### 3. Test the Function

You can manually trigger the function to test it:

```bash
curl -L -X POST 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/reset-leaderboard' \
-H 'Authorization: Bearer [YOUR_ANON_KEY]' \
-H 'Content-Type: application/json' \
--data '{"manual_trigger": true}'
```

## Function Logic

The Edge Function performs the following actions:

1. Resets the `total_points` to 0 for all user profiles
2. Updates the `last_reset` field in the `leaderboard_meta` table to the current date
3. Calculates and sets the `next_reset` field to the Monday two weeks from now

## Troubleshooting

If the function is not running as expected:

1. Check the function logs in the Supabase Dashboard
2. Verify that the `leaderboard_meta` table exists and contains a record
3. Ensure the SQL function `trigger_reset_leaderboard()` is correctly created
4. Check that the scheduled hook is active and properly configured