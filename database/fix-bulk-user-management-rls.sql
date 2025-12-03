-- =============================================================================
-- FIX: Bulk User Management RLS Recursion
-- =============================================================================
-- This script fixes the infinite recursion issue in user_profiles policies
-- by using a SECURITY DEFINER helper function for role checks.
-- =============================================================================

-- 1. Ensure the helper function exists and is SECURITY DEFINER
-- This function runs with the privileges of the creator (postgres/admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- 2. Drop problematic policies that might cause recursion
DROP POLICY IF EXISTS "Admin and support can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin and support can update user premium" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Support can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- 3. Re-create safe policies using the helper function

-- Policy: View Access
-- Admins and Support can view ALL profiles
-- Users can view ONLY their own profile
CREATE POLICY "view_user_profiles_policy"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can view their own profile
    id = auth.uid()
    OR
    -- Admin/Support can view all profiles (via helper function to avoid recursion)
    public.get_user_role(auth.uid()) IN ('admin', 'support')
  );

-- Policy: Update Access
-- Admins can update ANY profile
-- Support can update ANY profile (for premium/usage resets)
-- Users can update ONLY their own profile
CREATE POLICY "update_user_profiles_policy"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    id = auth.uid()
    OR
    -- Admin/Support can update all profiles
    public.get_user_role(auth.uid()) IN ('admin', 'support')
  )
  WITH CHECK (
    -- Same rules for the new state
    id = auth.uid()
    OR
    public.get_user_role(auth.uid()) IN ('admin', 'support')
  );

-- Policy: Insert Access
-- Users can insert their own profile (during signup)
CREATE POLICY "insert_user_profiles_policy"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Comments
COMMENT ON FUNCTION public.get_user_role IS 'Helper to safely get user role without triggering RLS recursion';
COMMENT ON POLICY "view_user_profiles_policy" ON user_profiles IS 'Users see own profile; Admins/Support see all';
COMMENT ON POLICY "update_user_profiles_policy" ON user_profiles IS 'Users update own profile; Admins/Support update all';
COMMENT ON POLICY "insert_user_profiles_policy" ON user_profiles IS 'Users create their own profile on signup';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed user_profiles RLS policies to prevent infinite recursion';
  RAISE NOTICE '✅ Verified get_user_role SECURITY DEFINER function';
END $$;

