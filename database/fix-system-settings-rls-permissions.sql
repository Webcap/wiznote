-- =============================================================================
-- FIX: System Settings RLS Policies to Support canManageSystemSettings Permission
-- =============================================================================
-- The issue: RLS policies only check for admin role, but the service code
-- also allows users with canManageSystemSettings permission.
-- This fix updates the policies to check for both admin role AND permission.
-- =============================================================================

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;

-- Step 2: Create helper function to check if user can manage system settings
-- This checks both admin role AND canManageSystemSettings permission
CREATE OR REPLACE FUNCTION can_manage_system_settings()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
BEGIN
  -- Get user role and permissions
  SELECT role, permissions
  INTO user_role, user_permissions
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Check if user is admin
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has canManageSystemSettings permission
  IF user_permissions IS NOT NULL THEN
    -- Handle both JSONB and TEXT formats
    IF jsonb_typeof(user_permissions) = 'string' THEN
      user_permissions := user_permissions::text::jsonb;
    END IF;
    
    IF user_permissions->>'canManageSystemSettings' = 'true' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_manage_system_settings() TO authenticated;

COMMENT ON FUNCTION can_manage_system_settings IS 
  'Check if current user can manage system settings (admin role OR canManageSystemSettings permission). Uses SECURITY DEFINER to bypass RLS.';

-- Step 3: Create updated SELECT policy
CREATE POLICY "Admins and authorized users can view system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (can_manage_system_settings());

-- Step 4: Create updated UPDATE policy
CREATE POLICY "Admins and authorized users can update system settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (can_manage_system_settings())
  WITH CHECK (can_manage_system_settings());

-- Step 5: Also update audit log SELECT policy to match
DROP POLICY IF EXISTS "Admins can view settings audit" ON system_settings_audit;

CREATE POLICY "Admins and authorized users can view settings audit"
  ON system_settings_audit
  FOR SELECT
  TO authenticated
  USING (can_manage_system_settings());

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ System settings RLS policies updated successfully';
  RAISE NOTICE '  - Now supports both admin role AND canManageSystemSettings permission';
  RAISE NOTICE '  - Helper function: can_manage_system_settings()';
  RAISE NOTICE '  - Updated policies: SELECT, UPDATE, and audit log access';
END $$;

