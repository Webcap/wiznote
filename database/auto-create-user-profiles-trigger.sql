-- =============================================
-- AUTO-CREATE USER PROFILES ON SIGNUP (TRIGGER)
-- =============================================
-- This trigger automatically creates user profiles when
-- a new user signs up, even before email verification.
-- It bypasses RLS using SECURITY DEFINER.
-- =============================================

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile for new user (ignore if already exists)
  INSERT INTO public.user_profiles (
    id,
    email,
    display_name,
    role,
    preferences,
    premium,
    permissions,
    last_login_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'user',  -- Default role
    jsonb_build_object(
      'theme', 'auto',
      'language', 'en',
      'autoSync', true,
      'notifications', true
    ),
    jsonb_build_object(
      'isActive', false,
      'type', null
    ),
    jsonb_build_object(
      'canCreateNotes', true,
      'canShareNotes', true,
      'canExportNotes', true
    ),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't update if profile already exists
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to Supabase auth admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.user_profiles TO supabase_auth_admin;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS 
  'Automatically creates user profile when a new auth user is created. Runs with elevated privileges to bypass RLS.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Trigger that creates user profile automatically when a new user signs up.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User profile auto-creation trigger installed successfully';
  RAISE NOTICE '  - Trigger: on_auth_user_created';
  RAISE NOTICE '  - Function: handle_new_user()';
  RAISE NOTICE '  - Profiles will be created automatically on signup';
  RAISE NOTICE '  - Works even with email verification enabled';
END $$;

