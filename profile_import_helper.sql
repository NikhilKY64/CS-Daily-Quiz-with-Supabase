-- Profile Import Helper SQL Script

-- 1. Query to view existing user IDs from auth.users table
-- Run this in the Supabase SQL Editor to get valid user IDs
SELECT id, email, created_at 
FROM auth.users;

-- 2. Query to check existing profiles
-- This helps you see which users already have profiles
SELECT profiles.id, auth.users.email, profiles.name, profiles.total_points
FROM profiles
JOIN auth.users ON profiles.id = auth.users.id;

-- 3. Example of manually inserting a profile with a valid user ID
-- Replace 'actual-user-id-here' with a real user ID from auth.users
INSERT INTO profiles (id, name, total_points, current_streak, last_attempt_date, today_completed, created_at, updated_at)
VALUES 
('actual-user-id-here', 'John Doe', 0, 0, NULL, false, NOW(), NOW());

-- 4. Query to find users without profiles
-- This helps identify which authenticated users need profiles
SELECT auth.users.id, auth.users.email
FROM auth.users
LEFT JOIN profiles ON auth.users.id = profiles.id
WHERE profiles.id IS NULL;