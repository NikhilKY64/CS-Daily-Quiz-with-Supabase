# Profile Import Instructions

## Understanding the Foreign Key Constraint Error

When you see the error: `Failed to import data: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"`, it means you're trying to add profile records with IDs that don't exist in the `auth.users` table.

## Database Relationship

In Supabase, the `profiles` table has a foreign key constraint that requires each profile's `id` to match an existing user ID in the `auth.users` table. This ensures that profiles are only created for actual authenticated users.

## How to Properly Import Profiles

### Option 1: Create Users First

1. First, create users through the authentication system (sign up users via the app or Supabase Auth UI)
2. Then create profiles for those users with matching IDs

### Option 2: Manual Import with Existing User IDs

1. Get a list of existing user IDs from your Supabase dashboard:
   - Go to Authentication > Users
   - Note the IDs of existing users
2. Modify the CSV file to use these existing user IDs
3. Import the modified CSV

## CSV Format Example

```csv
id,name,total_points,current_streak,last_attempt_date,today_completed,created_at,updated_at
<actual-user-id>,John Doe,150,3,2023-11-15,true,2023-10-01T10:00:00Z,2023-11-15T14:30:00Z
```

## Automatic Profile Creation

The app has been updated to automatically create profiles for new users when they log in for the first time. This means:

1. When a user signs up and logs in, they'll automatically get a profile
2. You don't need to manually create profiles for new users
3. The profile will be initialized with default values

## Testing the Fix

1. Create a new user through the authentication system
2. Log in with that user
3. The app should no longer prompt to create a profile repeatedly