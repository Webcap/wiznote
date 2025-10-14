-- =============================================================================
-- COMPLETE FIX: Support Dashboard RLS Policies
-- =============================================================================
-- This fixes the 406 error when searching users
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Check current RLS status
DO $$
BEGIN
  RAISE NOTICE 'Checking current RLS policies...';
END $$;

-- Step 2: Drop ALL existing SELECT policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Admin and support can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Step 3: Create comprehensive SELECT policies

-- Policy A: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy B: Admin and support can view ALL profiles
CREATE POLICY "Admin and support can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role IN ('admin', 'support')
    )
  );

-- Step 4: Ensure UPDATE policy exists for admin/support
DROP POLICY IF EXISTS "Admin and support can update user premium" ON user_profiles;

CREATE POLICY "Admin and support can update user premium"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role IN ('admin', 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role IN ('admin', 'support')
    )
  );

-- Step 5: Fix the search function permissions
DROP FUNCTION IF EXISTS search_users_by_email_or_name(TEXT);

CREATE OR REPLACE FUNCTION search_users_by_email_or_name(search_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  premium JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
BEGIN
  -- Only allow admin/support to use this function
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'support')
  ) THEN
    RAISE EXCEPTION 'Only admin and support can search users';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT as email,
    COALESCE(
      up.display_name,
      au.raw_user_meta_data->>'display_name',
      SPLIT_PART(au.email, '@', 1)
    )::TEXT as display_name,
    up.role::TEXT as role,
    up.premium as premium
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE 
    au.email ILIKE '%' || search_query || '%'
    OR up.display_name ILIKE '%' || search_query || '%'
    OR au.raw_user_meta_data->>'display_name' ILIKE '%' || search_query || '%'
  LIMIT 10;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_users_by_email_or_name(TEXT) TO authenticated;

COMMENT ON FUNCTION search_users_by_email_or_name IS 
  'Search users by email or name. Only accessible to admin/support roles.';

-- Step 6: Verify your admin status
DO $$
DECLARE
  current_user_role TEXT;
  current_user_email TEXT;
  policy_count INTEGER;
BEGIN
  -- Get current user info
  SELECT role, email INTO current_user_role, current_user_email
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Support Dashboard RLS Fix Complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Your user email: %', current_user_email;
  RAISE NOTICE 'Your role: %', current_user_role;
  RAISE NOTICE 'Total RLS policies on user_profiles: %', policy_count;
  RAISE NOTICE '';
  
  IF current_user_role IN ('admin', 'support') THEN
    RAISE NOTICE '✅ You have admin/support access';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Your role is "%" - not admin/support!', current_user_role;
    RAISE NOTICE '   Run this to fix:';
    RAISE NOTICE '   UPDATE user_profiles SET role = ''admin'' WHERE email = ''%'';', current_user_email;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SELECT policies created (own profile + admin view all)';
  RAISE NOTICE '✅ UPDATE policy created (admin can update premium)';
  RAISE NOTICE '✅ Search function recreated with permission checks';
  RAISE NOTICE '';
  RAISE NOTICE 'Try searching again in the support dashboard!';
  RAISE NOTICE '';
END $$;

-- Step 7: List all current policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

