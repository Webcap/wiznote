-- =============================================
-- Fix User Profiles Signup Policy (No Recursion)
-- =============================================
-- This version uses a SECURITY DEFINER function to avoid infinite recursion
-- =============================================

-- First, ensure RLS is enabled on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Grant execute to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Support can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins have full access" ON user_profiles;

-- Policy 1: Allow users to insert their own profile (critical for signup)
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 2: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Admins can view all profiles (no recursion via helper function)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Policy 4: Support can view all profiles (no recursion via helper function)
CREATE POLICY "Support can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'support');

-- Policy 5: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 6: Admins can update any profile (no recursion via helper function)
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Add comments
COMMENT ON FUNCTION public.get_user_role IS 
  'Helper function to get user role without RLS recursion. Used by user_profiles policies.';

COMMENT ON POLICY "Users can insert their own profile" ON user_profiles IS 
  'Allow users to create their own profile during signup';

COMMENT ON POLICY "Users can view own profile" ON user_profiles IS 
  'Allow users to view their own profile';

COMMENT ON POLICY "Admins can view all profiles" ON user_profiles IS 
  'Allow admins to view all user profiles (uses helper function to avoid recursion)';

COMMENT ON POLICY "Support can view all profiles" ON user_profiles IS 
  'Allow support staff to view all user profiles (uses helper function to avoid recursion)';

COMMENT ON POLICY "Users can update own profile" ON user_profiles IS 
  'Allow users to update their own profile';

COMMENT ON POLICY "Admins can update all profiles" ON user_profiles IS 
  'Allow admins to update any user profile (uses helper function to avoid recursion)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User profiles RLS policies updated with helper function';
  RAISE NOTICE '  - Created public.get_user_role() function to avoid recursion';
  RAISE NOTICE '  - Users can insert their own profile during signup';
  RAISE NOTICE '  - Users can view and update their own profile';
  RAISE NOTICE '  - Admins and support can view all profiles';
  RAISE NOTICE '  - Admins can update any profile';
  RAISE NOTICE '  - Zero recursion issues!';
END $$;

