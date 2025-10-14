-- =============================================================================
-- FIX: Support User Search RLS Policies
-- =============================================================================
-- This adds the necessary RLS policies for support/admin to search and view users
-- =============================================================================

-- Policy 1: Allow admin/support to SELECT (view) all user profiles
DROP POLICY IF EXISTS "Admin and support can view all user profiles" ON user_profiles;

CREATE POLICY "Admin and support can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if current user is admin or support
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'support')
    )
    -- OR it's their own profile
    OR id = auth.uid()
  );

COMMENT ON POLICY "Admin and support can view all user profiles" ON user_profiles IS 
  'Allows admin and support staff to view all user profiles for the support dashboard';

-- Policy 2: Ensure the update policy exists (from previous script)
DROP POLICY IF EXISTS "Admin and support can update user premium" ON user_profiles;

CREATE POLICY "Admin and support can update user premium"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if current user is admin or support
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'support')
    )
  )
  WITH CHECK (
    -- Same check for the updated data
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'support')
    )
  );

COMMENT ON POLICY "Admin and support can update user premium" ON user_profiles IS 
  'Allows admin and support staff to grant/revoke premium access for users';

-- Verify policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
    AND policyname LIKE '%admin%'
    OR policyname LIKE '%support%';
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Support RLS Policies Setup Complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Admin/Support policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Admin/Support can view all user profiles';
  RAISE NOTICE '✅ Admin/Support can update user premium';
  RAISE NOTICE '';
  RAISE NOTICE 'Support dashboard should now work!';
  RAISE NOTICE '';
END $$;

