-- Support Premium Management RLS Policies
-- Allows admin and support staff to grant/revoke premium access

-- ============================================================================
-- 1. Allow Admin/Support to Update Premium Field
-- ============================================================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Admin and support can update user premium" ON user_profiles;

-- Create policy for admin and support to update premium field
CREATE POLICY "Admin and support can update user premium"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if current user is admin or support
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'support')
    )
  )
  WITH CHECK (
    -- Same check for the updated data
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'support')
    )
  );

COMMENT ON POLICY "Admin and support can update user premium" ON user_profiles IS 
  'Allows admin and support staff to grant/revoke premium access for users';

-- ============================================================================
-- 2. Verify Existing Policies
-- ============================================================================

-- Admins should already have view access from previous setup
-- If not, the policy creation would fail, which is fine since it likely already exists

-- Optionally, you can verify policies exist with:
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles' AND policyname LIKE '%admin%';

-- ============================================================================
-- 3. Create Premium Audit Log Table (Optional but Recommended)
-- ============================================================================

CREATE TABLE IF NOT EXISTS premium_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'granted', 'revoked', 'extended'
  duration TEXT,
  plan_id TEXT,
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL,
  granted_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB -- Additional context
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_premium_audit_user_id 
  ON premium_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_premium_audit_granted_by 
  ON premium_audit_logs(granted_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_premium_audit_created_at 
  ON premium_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE premium_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin and support can view audit logs
CREATE POLICY "Admin and support can view premium audit logs"
  ON premium_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'support')
    )
  );

-- System can insert audit logs
CREATE POLICY "Authenticated users can insert premium audit logs"
  ON premium_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE premium_audit_logs IS 'Audit trail for premium access grants/revokes';
COMMENT ON COLUMN premium_audit_logs.action IS 'Type of action: granted, revoked, extended';
COMMENT ON COLUMN premium_audit_logs.granted_by IS 'Support agent or admin who performed the action';

-- ============================================================================
-- 4. Helper Function to Log Premium Actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_premium_action(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_duration TEXT DEFAULT NULL,
  p_plan_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_granted_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_granted_by_email TEXT;
BEGIN
  -- Get granted by email
  SELECT email INTO v_granted_by_email
  FROM user_profiles
  WHERE id = p_granted_by;
  
  -- Insert audit log
  INSERT INTO premium_audit_logs (
    user_id,
    user_email,
    action,
    duration,
    plan_id,
    reason,
    granted_by,
    granted_by_email,
    metadata
  ) VALUES (
    p_user_id,
    p_user_email,
    p_action,
    p_duration,
    p_plan_id,
    p_reason,
    p_granted_by,
    v_granted_by_email,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_premium_action IS 'Logs premium grant/revoke actions for audit trail';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_premium_action TO authenticated;

-- ============================================================================
-- Setup Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Support Premium Management Setup Complete!';
  RAISE NOTICE '- RLS policies updated for admin/support access';
  RAISE NOTICE '- Premium audit log table created';
  RAISE NOTICE '- Helper functions created';
  RAISE NOTICE '- Admin and support can now grant/revoke premium from UI';
END $$;

