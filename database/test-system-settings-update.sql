-- =============================================================================
-- TEST: System Settings Update
-- =============================================================================
-- Run this while logged in as your admin user to test if RLS allows updates
-- =============================================================================

-- First, check if you can see the current settings
SELECT 
  'Current Settings' as test,
  id,
  email_verification_required,
  mfa_enabled,
  google_sign_in_enabled,
  updated_at,
  updated_by
FROM system_settings
WHERE id = 'default';

-- Test the helper function
SELECT 
  'Permission Check' as test,
  can_manage_system_settings() as can_manage,
  auth.uid() as current_user_id,
  (SELECT role FROM user_profiles WHERE id = auth.uid()) as user_role,
  (SELECT permissions FROM user_profiles WHERE id = auth.uid()) as user_permissions;

-- Try a test update (this will only work if RLS allows it)
UPDATE system_settings
SET updated_at = NOW()
WHERE id = 'default'
RETURNING id, updated_at, updated_by;

-- If the above update worked, you should see the row returned
-- If it didn't work, you'll get a permission error or no rows returned

-- Check what policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'system_settings'
ORDER BY policyname;

