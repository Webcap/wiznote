-- =============================================================================
-- SUPPORT DASHBOARD USER SEARCH SETUP
-- =============================================================================
-- This script sets up everything needed for the support dashboard to search users
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Add email column to user_profiles if it doesn't exist
-- This allows fallback searching when the RPC function isn't available
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Step 2: Populate user_profiles with emails from auth.users
-- This sync ensures all existing users have their emails in user_profiles
UPDATE user_profiles
SET email = auth.users.email
FROM auth.users
WHERE user_profiles.id = auth.users.id
  AND user_profiles.email IS NULL;

-- Step 3: Create or replace the user search function
-- This allows searching users by email or display name with access to auth.users
CREATE OR REPLACE FUNCTION search_users_by_email_or_name(search_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to access auth.users
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT as email,
    COALESCE(
      up.display_name,
      au.raw_user_meta_data->>'display_name',
      SPLIT_PART(au.email, '@', 1)
    )::TEXT as display_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE 
    au.email ILIKE '%' || search_query || '%'
    OR up.display_name ILIKE '%' || search_query || '%'
    OR au.raw_user_meta_data->>'display_name' ILIKE '%' || search_query || '%'
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_by_email_or_name(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION search_users_by_email_or_name IS 
  'Search users by email or display name for support dashboard. Accessible to authenticated users.';

-- Step 4: Create trigger to keep email in sync
-- This ensures new users automatically get their email in user_profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_user_email ON user_profiles;

-- Create trigger on insert and update
CREATE TRIGGER trigger_sync_user_email
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (NEW.email IS NULL)
  EXECUTE FUNCTION sync_user_email();

-- Step 5: Verify the setup
DO $$
DECLARE
  user_count INTEGER;
  users_with_email INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT COUNT(*) INTO users_with_email FROM user_profiles WHERE email IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Support User Search Setup Complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Users with email: %', users_with_email;
  RAISE NOTICE 'Missing emails: %', user_count - users_with_email;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Email column added to user_profiles';
  RAISE NOTICE '✅ Email index created for fast searches';
  RAISE NOTICE '✅ Emails synced from auth.users';
  RAISE NOTICE '✅ search_users_by_email_or_name function created';
  RAISE NOTICE '✅ Auto-sync trigger created';
  RAISE NOTICE '';
  RAISE NOTICE 'Support dashboard can now search users by email!';
  RAISE NOTICE '';
END $$;

