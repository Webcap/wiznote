-- =============================================================================
-- VERIFY: System Settings RLS Policies
-- =============================================================================
-- Run this to check if the RLS policies are correctly configured
-- =============================================================================

-- Check if the helper function exists
SELECT 
  'Helper Function' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'can_manage_system_settings'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check if policies exist
SELECT 
  'SELECT Policy' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'system_settings'
      AND policyname = 'Admins and authorized users can view system settings'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'UPDATE Policy' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'system_settings'
      AND policyname = 'Admins and authorized users can update system settings'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'Audit SELECT Policy' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'system_settings_audit'
      AND policyname = 'Admins and authorized users can view settings audit'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Test the helper function (will show NULL if not logged in, TRUE/FALSE if logged in)
SELECT 
  'Function Test' as check_type,
  can_manage_system_settings() as result,
  auth.uid() as current_user_id;

-- Show current policies
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
WHERE tablename IN ('system_settings', 'system_settings_audit')
ORDER BY tablename, policyname;

