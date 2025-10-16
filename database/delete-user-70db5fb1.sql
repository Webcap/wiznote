-- Delete specific user: 70db5fb1-79a2-4c20-893e-51d1e83d1fbe
-- This will delete from both auth.users and user_profiles

-- Step 1: Delete from user_profiles first
DELETE FROM user_profiles 
WHERE id = '70db5fb1-79a2-4c20-893e-51d1e83d1fbe';

-- Step 2: Delete from auth.users
-- This requires elevated permissions
DELETE FROM auth.users 
WHERE id = '70db5fb1-79a2-4c20-893e-51d1e83d1fbe';

-- Verify deletion
DO $$
DECLARE
  profile_exists BOOLEAN;
  auth_exists BOOLEAN;
BEGIN
  -- Check if profile was deleted
  SELECT EXISTS(
    SELECT 1 FROM user_profiles WHERE id = '70db5fb1-79a2-4c20-893e-51d1e83d1fbe'
  ) INTO profile_exists;
  
  -- Check if auth user was deleted (this might fail due to permissions)
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM auth.users WHERE id = '70db5fb1-79a2-4c20-893e-51d1e83d1fbe'
    ) INTO auth_exists;
  EXCEPTION WHEN OTHERS THEN
    auth_exists := NULL; -- Can't check auth.users from client
  END;
  
  IF NOT profile_exists THEN
    RAISE NOTICE '✅ User profile deleted successfully';
  ELSE
    RAISE NOTICE '⚠️  User profile still exists';
  END IF;
  
  IF auth_exists IS NULL THEN
    RAISE NOTICE 'ℹ️  Cannot verify auth.users deletion (permissions required)';
  ELSIF NOT auth_exists THEN
    RAISE NOTICE '✅ Auth user deleted successfully';
  ELSE
    RAISE NOTICE '⚠️  Auth user still exists';
  END IF;
END $$;

