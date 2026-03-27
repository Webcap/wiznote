-- =============================================================================
-- PROTECT SENSITIVE USER PROFILE FIELDS
-- =============================================================================
-- This script creates a trigger to prevent non-privileged users from
-- modifying sensitive columns like premium status, role, and rate limits.
-- =============================================================================

-- Step 1: Create the protection function
CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_current_user_role TEXT;
BEGIN
  -- Get the role of the user performing the update
  -- Using a SECURITY DEFINER function to bypass RLS for role check
  v_current_user_role := public.get_user_role(auth.uid());

  -- If the user is an admin or support, allow all changes
  IF v_current_user_role IN ('admin', 'support') THEN
    RETURN NEW;
  END IF;

  -- For all other users, ensure sensitive fields have not changed
  
  -- 1. Protect Premium Status
  IF NEW.premium IS DISTINCT FROM OLD.premium THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify premium status';
  END IF;

  -- 2. Protect User Role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify user role';
  END IF;

  -- 3. Protect AI Restriction Flag
  IF NEW.is_restricted IS DISTINCT FROM OLD.is_restricted THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify restriction status';
  END IF;

  -- 4. Protect AI Limit Multiplier
  IF NEW.custom_ai_limit_multiplier IS DISTINCT FROM OLD.custom_ai_limit_multiplier THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify usage limits';
  END IF;

  -- 5. Protect Email (Should only be updated via Auth services)
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify email via profile';
  END IF;

  -- 6. Protect ID (Safety check)
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify user ID';
  END IF;

  -- If we reached here, only permitted fields (like display_name) are being changed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS trigger_protect_user_profile_fields ON user_profiles;

CREATE TRIGGER trigger_protect_user_profile_fields
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_fields();

-- Step 3: Add comments
COMMENT ON FUNCTION public.protect_user_profile_fields() IS 
  'Prevents non-admin users from modifying sensitive columns in user_profiles.';

-- Step 4: Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'User Profile Security Setup Complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'The following fields are now PROTECTED:';
  RAISE NOTICE ' - premium';
  RAISE NOTICE ' - role';
  RAISE NOTICE ' - is_restricted';
  RAISE NOTICE ' - custom_ai_limit_multiplier';
  RAISE NOTICE ' - email';
  RAISE NOTICE ' - id';
  RAISE NOTICE '';
  RAISE NOTICE 'Only users with "admin" or "support" roles can modify these fields.';
  RAISE NOTICE '';
END $$;
