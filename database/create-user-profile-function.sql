-- =============================================================================
-- CREATE USER PROFILE FUNCTION
-- =============================================================================
-- This function creates user profiles with SECURITY DEFINER to bypass RLS
-- This is needed because during signup, the user session might not be fully
-- established yet, causing RLS to block the profile creation
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT);

-- Create function to safely create user profiles
CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
  user_id UUID,
  user_email TEXT,
  user_display_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'user'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  preferences JSONB,
  premium JSONB,
  permissions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  default_preferences JSONB;
  default_premium JSONB;
  default_permissions JSONB;
  profile_display_name TEXT;
BEGIN
  -- Set default values
  default_preferences := jsonb_build_object(
    'theme', 'auto',
    'language', 'en',
    'autoSync', true,
    'notifications', true
  );
  
  default_premium := jsonb_build_object(
    'isActive', false,
    'type', null
  );
  
  default_permissions := jsonb_build_object(
    'canCreateNotes', true,
    'canShareNotes', true,
    'canExportNotes', true
  );
  
  -- Use provided display name or generate from email
  profile_display_name := COALESCE(
    user_display_name,
    SPLIT_PART(user_email, '@', 1)
  );
  
  -- Insert or update the user profile
  RETURN QUERY
  INSERT INTO user_profiles (
    id,
    email,
    display_name,
    role,
    preferences,
    premium,
    permissions,
    last_login_at
  ) VALUES (
    user_id,
    user_email,
    profile_display_name,
    user_role,
    default_preferences,
    default_premium,
    default_permissions,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    updated_at = NOW(),
    last_login_at = NOW()
  RETURNING 
    user_profiles.id,
    user_profiles.email,
    user_profiles.display_name,
    user_profiles.role,
    user_profiles.preferences,
    user_profiles.premium,
    user_profiles.permissions,
    user_profiles.created_at,
    user_profiles.updated_at,
    user_profiles.last_login_at;
END;
$$;

-- Grant execute to authenticated users and anonymous (for signup)
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.create_user_profile_safe IS 
  'Safely creates user profiles during signup. Uses SECURITY DEFINER to bypass RLS. Accessible to authenticated and anonymous users.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User profile creation function created successfully';
  RAISE NOTICE '  - Function: create_user_profile_safe';
  RAISE NOTICE '  - Bypasses RLS for profile creation during signup';
  RAISE NOTICE '  - Accessible to authenticated and anonymous users';
END $$;

