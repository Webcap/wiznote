-- =============================================================================
-- Allow Admin and Support to count notes for any user
-- =============================================================================
-- The notes table RLS only allows users to see their own notes (auth.uid() = user_id).
-- This blocks admin/support from counting notes when viewing user profiles.
-- This migration adds a policy so admin and support can SELECT notes for counting.
-- =============================================================================

-- Ensure get_user_role exists (from fix-bulk-user-management-rls.sql)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id
  LIMIT 1;
  RETURN user_role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Add policy: Admin and Support can SELECT notes (for user profile note counts)
-- This allows support tools and user management to show accurate note counts
DROP POLICY IF EXISTS "admin_support_can_select_notes" ON notes;
CREATE POLICY "admin_support_can_select_notes"
ON notes
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'support')
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added admin_support_can_select_notes policy to notes table';
  RAISE NOTICE '   Admin and Support users can now count notes for any user';
  RAISE NOTICE '   Run this in Supabase SQL Editor if get_user_role() does not exist';
END $$;
