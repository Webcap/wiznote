-- Create a function that allows users to delete their own auth account
-- This function has SECURITY DEFINER which allows it to access the auth schema

-- First, create the function
CREATE OR REPLACE FUNCTION delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete the user from auth.users
  -- This will cascade to all related tables due to foreign key constraints
  DELETE FROM auth.users WHERE id = current_user_id;
  
  -- Log the deletion
  RAISE NOTICE 'User % deleted successfully', current_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_current_user() TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_current_user() IS 'Allows authenticated users to delete their own account. This will cascade to all related data.';

-- Optional: Create a trigger to clean up user_profiles when auth user is deleted
-- This ensures profile is always deleted when auth user is deleted
CREATE OR REPLACE FUNCTION cleanup_user_profile_on_auth_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the user profile if it exists
  DELETE FROM user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cleanup_user_profile ON auth.users;
CREATE TRIGGER trigger_cleanup_user_profile
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_profile_on_auth_delete();

COMMENT ON FUNCTION cleanup_user_profile_on_auth_delete() IS 'Automatically cleans up user profile when auth user is deleted';

