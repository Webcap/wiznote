-- SQL script to add email column and populate user emails in user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the email column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Update user_profiles with emails from auth.users
UPDATE user_profiles
SET email = auth.users.email
FROM auth.users
WHERE user_profiles.id = auth.users.id;

-- Step 3: Verify the update
SELECT 
  id, 
  display_name, 
  email,
  role
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

