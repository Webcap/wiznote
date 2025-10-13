-- =============================================================================
-- USER SEARCH AND DETAILS FUNCTIONS
-- =============================================================================
-- These functions allow the app to search users and retrieve user details
-- including email addresses from auth.users (which is not directly accessible
-- from the client)
-- =============================================================================

-- Function 1: Search users by email or display name
-- This is used in the share modal to find users to share notes with
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
COMMENT ON FUNCTION search_users_by_email_or_name IS 'Search users by email or display name. Accessible to authenticated users for note sharing.';

-- Function 2: Get user details by IDs (including email)
-- This is used to display "Shared by" information in the shared notes list
CREATE OR REPLACE FUNCTION get_user_details_by_ids(user_ids UUID[])
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
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_details_by_ids(UUID[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_details_by_ids IS 'Get user details including email by user IDs. Accessible to authenticated users for displaying shared note info.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User functions created successfully';
  RAISE NOTICE '  - search_users_by_email_or_name: Search users by email/name';
  RAISE NOTICE '  - get_user_details_by_ids: Get user details with email';
END $$;

