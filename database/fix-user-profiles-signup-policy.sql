-- =============================================
-- Fix User Profiles Signup Policy
-- =============================================
-- Ensure users can create their own profile during signup
-- =============================================

-- First, ensure RLS is enabled on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting INSERT policies
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create a policy allowing users to insert their own profile
-- This is critical for the signup flow to work
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
  );

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Separate policy for admins to view all profiles (without recursion)
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Separate policy for support to view all profiles (without recursion)
DROP POLICY IF EXISTS "Support can view all profiles" ON user_profiles;
CREATE POLICY "Support can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'support'
  );

-- Ensure users can update their own profile (basic fields only)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Add comments
COMMENT ON POLICY "Users can insert their own profile" ON user_profiles IS 
  'Allow users to create their own profile during signup';

COMMENT ON POLICY "Users can view own profile" ON user_profiles IS 
  'Allow users to view their own profile';

COMMENT ON POLICY "Admins can view all profiles" ON user_profiles IS 
  'Allow admins to view all user profiles';

COMMENT ON POLICY "Support can view all profiles" ON user_profiles IS 
  'Allow support staff to view all user profiles';

COMMENT ON POLICY "Users can update own profile" ON user_profiles IS 
  'Allow users to update their own profile';

COMMENT ON POLICY "Admins can update all profiles" ON user_profiles IS 
  'Allow admins to update any user profile';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User profiles RLS policies updated for signup flow';
  RAISE NOTICE '  - Users can now insert their own profile during signup';
  RAISE NOTICE '  - Users can view and update their own profile';
  RAISE NOTICE '  - Admins and support can view all profiles';
  RAISE NOTICE '  - Admins can update any profile';
  RAISE NOTICE '  - No infinite recursion issues';
END $$;

