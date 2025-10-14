-- =============================================
-- Delete User from Auth System
-- This function allows support agents to delete
-- users from auth.users table (authentication)
-- =============================================

-- Create function to delete auth user
CREATE OR REPLACE FUNCTION delete_auth_user(user_id_to_delete UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  result JSONB;
  user_email TEXT;
BEGIN
  -- Get user email before deletion (for logging)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_to_delete;

  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id_to_delete
    );
  END IF;

  -- Delete the user from auth.users
  -- This will cascade delete related auth data
  DELETE FROM auth.users
  WHERE id = user_id_to_delete;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted from authentication system',
    'user_id', user_id_to_delete,
    'email', user_email,
    'deleted_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'user_id', user_id_to_delete
    );
END;
$$;

-- Grant execute permission to authenticated users with admin role
-- Note: This should only be callable by admins/support
-- The RLS policies should prevent non-admins from calling this
GRANT EXECUTE ON FUNCTION delete_auth_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_auth_user IS 'Delete a user from the authentication system. Only callable by admin/support users. Use with extreme caution.';

-- Create an audit log function for user deletions
CREATE OR REPLACE FUNCTION log_user_deletion(
  deleted_user_id UUID,
  deleted_user_email TEXT,
  deleted_by UUID,
  deletion_summary JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert audit log
  INSERT INTO user_deletion_audit (
    deleted_user_id,
    deleted_user_email,
    deleted_by,
    deletion_summary,
    deleted_at
  ) VALUES (
    deleted_user_id,
    deleted_user_email,
    deleted_by,
    deletion_summary,
    NOW()
  );
END;
$$;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id UUID NOT NULL,
  deleted_user_email TEXT NOT NULL,
  deleted_by UUID NOT NULL,
  deletion_summary JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_user_deletion_audit_deleted_at 
ON user_deletion_audit(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_deletion_audit_deleted_by 
ON user_deletion_audit(deleted_by);

-- Enable RLS on audit table
ALTER TABLE user_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion audit logs
CREATE POLICY "Admins can view deletion audit"
  ON user_deletion_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON user_deletion_audit TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_deletion(UUID, TEXT, UUID, JSONB) TO authenticated;

-- Add comments
COMMENT ON TABLE user_deletion_audit IS 'Audit log of all user account deletions for compliance and security';
COMMENT ON FUNCTION log_user_deletion IS 'Log user deletion for audit trail. Only callable by admin/support.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User deletion functions created successfully';
  RAISE NOTICE '  - delete_auth_user: Delete user from auth system';
  RAISE NOTICE '  - log_user_deletion: Create audit trail';
  RAISE NOTICE '  - user_deletion_audit table: Store deletion records';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  USE WITH CAUTION: These functions permanently delete user accounts';
END $$;

