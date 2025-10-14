-- =============================================================================
-- FIX: Infinite Recursion in User Profiles RLS
-- =============================================================================
-- The problem: RLS policy checks user_profiles to see if user is admin,
-- which triggers the same policy = infinite loop
-- Solution: Use a helper function with SECURITY DEFINER
-- =============================================================================

-- Step 1: Create a helper function to check if current user is admin/support
-- This bypasses RLS
CREATE OR REPLACE FUNCTION is_admin_or_support()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'support')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin_or_support() TO authenticated;

COMMENT ON FUNCTION is_admin_or_support IS 
  'Check if current user has admin or support role. Uses SECURITY DEFINER to bypass RLS.';

-- Step 2: Drop all existing SELECT policies
DROP POLICY IF EXISTS "Admin and support can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Step 3: Create new SELECT policies using the helper function

-- Policy A: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy B: Admin/support can view all profiles (using helper function)
CREATE POLICY "Admin and support can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin_or_support());

-- Step 4: Fix UPDATE policy with same helper function
DROP POLICY IF EXISTS "Admin and support can update user premium" ON user_profiles;

CREATE POLICY "Admin and support can update user premium"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_support())
  WITH CHECK (is_admin_or_support());

-- Step 5: Verify setup
DO $$
DECLARE
  is_admin BOOLEAN;
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Check current user
  SELECT is_admin_or_support() INTO is_admin;
  
  SELECT email, role INTO user_email, user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS Infinite Recursion Fix Complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Your email: %', user_email;
  RAISE NOTICE 'Your role: %', user_role;
  RAISE NOTICE 'is_admin_or_support(): %', is_admin;
  RAISE NOTICE '';
  
  IF is_admin THEN
    RAISE NOTICE '✅ You are recognized as admin/support';
    RAISE NOTICE '✅ You can now view and update all user profiles';
  ELSE
    RAISE NOTICE '⚠️  You are NOT admin/support';
    RAISE NOTICE '   To fix, run:';
    RAISE NOTICE '   UPDATE user_profiles SET role = ''admin'' WHERE id = auth.uid();';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Helper function created: is_admin_or_support()';
  RAISE NOTICE '✅ RLS policies updated to use helper function';
  RAISE NOTICE '✅ No more infinite recursion!';
  RAISE NOTICE '';
END $$;

-- Step 6: Test the fix
SELECT 
  'RLS Policies' as info_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

