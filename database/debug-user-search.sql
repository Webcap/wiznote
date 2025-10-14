-- =============================================================================
-- DEBUG: Support User Search
-- =============================================================================
-- Run these queries one by one to debug the user search issue
-- =============================================================================

-- 1. Check if email column exists and has data
SELECT 
  id,
  email,
  display_name,
  role,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if the specific user exists in user_profiles
SELECT 
  id,
  email,
  display_name,
  role,
  premium
FROM user_profiles
WHERE email ILIKE '%solox312%'
   OR display_name ILIKE '%solox312%';

-- 3. Check if the user exists in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email ILIKE '%solox312%';

-- 4. Test the search function directly
SELECT * FROM search_users_by_email_or_name('solox312@gmail.com');

-- 5. Check RLS policies on user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 6. Check if current user has admin/support role
SELECT 
  id,
  email,
  role
FROM user_profiles
WHERE id = auth.uid();

-- 7. Count total users
SELECT 
  COUNT(*) as total_users,
  COUNT(email) as users_with_email
FROM user_profiles;

