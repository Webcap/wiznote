-- Delete auth user by ID (use this when user data is already cleaned)
-- Run this in Supabase SQL Editor
--
-- USAGE: Replace 'YOUR_USER_ID_HERE' with the actual user ID
--
-- This is a simplified version that only deletes from auth schema
-- Use this if you've already cleaned up user_profiles, notes, etc.

-- Delete from auth.identities
DELETE FROM auth.identities 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Delete from auth.users
DELETE FROM auth.users 
WHERE id = 'YOUR_USER_ID_HERE';

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User deleted successfully'
    ELSE '❌ User still exists'
  END as status,
  COUNT(*) as remaining_users
FROM auth.users
WHERE id = 'YOUR_USER_ID_HERE';

