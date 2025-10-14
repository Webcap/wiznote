-- =============================================
-- System Settings Table
-- For configurable application settings
-- =============================================

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  
  -- Security Settings
  email_verification_required BOOLEAN NOT NULL DEFAULT true,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_required_for_admin BOOLEAN NOT NULL DEFAULT false,
  account_lockout_enabled BOOLEAN NOT NULL DEFAULT true,
  account_lockout_attempts INTEGER NOT NULL DEFAULT 5,
  account_lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
  session_timeout_hours INTEGER NOT NULL DEFAULT 24,
  password_min_length INTEGER NOT NULL DEFAULT 8,
  password_require_special_chars BOOLEAN NOT NULL DEFAULT true,
  
  -- Rate Limiting Settings
  rate_limit_enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limit_auth_attempts INTEGER NOT NULL DEFAULT 5,
  rate_limit_auth_window_minutes INTEGER NOT NULL DEFAULT 15,
  rate_limit_api_requests INTEGER NOT NULL DEFAULT 100,
  rate_limit_api_window_minutes INTEGER NOT NULL DEFAULT 1,
  
  -- Feature Flags
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  new_user_registration_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit Fields
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata for change tracking
  change_history JSONB DEFAULT '[]'::jsonb,
  
  -- Ensure only one row exists
  CONSTRAINT single_row_constraint CHECK (id = 'default')
);

-- Insert default settings
INSERT INTO system_settings (id) 
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Create audit table for settings changes
CREATE TABLE IF NOT EXISTS system_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_audit_changed_at 
ON system_settings_audit(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_settings_audit_changed_by 
ON system_settings_audit(changed_by);

CREATE INDEX IF NOT EXISTS idx_system_settings_audit_setting_key 
ON system_settings_audit(setting_key);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view system settings
CREATE POLICY "Admins can view system settings"
  ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Only admins can update system settings
CREATE POLICY "Admins can update system settings"
  ON system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS on audit table
ALTER TABLE system_settings_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view settings audit"
  ON system_settings_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Anyone authenticated can insert audit logs (for trigger)
CREATE POLICY "System can insert audit logs"
  ON system_settings_audit
  FOR INSERT
  WITH CHECK (true);

-- Create function to log settings changes
CREATE OR REPLACE FUNCTION log_system_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_keys TEXT[];
  key TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Get list of changed columns
  SELECT ARRAY(
    SELECT column_name::TEXT
    FROM information_schema.columns
    WHERE table_name = 'system_settings'
    AND column_name NOT IN ('id', 'updated_at', 'updated_by', 'change_history', 'created_at')
  ) INTO changed_keys;
  
  -- Log each changed field
  FOREACH key IN ARRAY changed_keys
  LOOP
    -- Get old and new values using dynamic SQL
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', key, key) 
    INTO old_val, new_val 
    USING OLD, NEW;
    
    -- Only log if value actually changed
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO system_settings_audit (
        setting_key,
        old_value,
        new_value,
        changed_by,
        changed_by_email
      ) VALUES (
        key,
        old_val,
        new_val,
        NEW.updated_by,
        (SELECT email FROM auth.users WHERE id = NEW.updated_by)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS system_settings_change_trigger ON system_settings;
CREATE TRIGGER system_settings_change_trigger
  AFTER UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_system_settings_change();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_settings_updated_at ON system_settings;
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Grant permissions
GRANT SELECT ON system_settings TO authenticated;
GRANT UPDATE ON system_settings TO authenticated; -- RLS will restrict to admins
GRANT SELECT ON system_settings_audit TO authenticated;
GRANT INSERT ON system_settings_audit TO authenticated;

-- Add comments
COMMENT ON TABLE system_settings IS 'Global system configuration settings. Only one row with id=default';
COMMENT ON TABLE system_settings_audit IS 'Audit log of all system settings changes';
COMMENT ON COLUMN system_settings.email_verification_required IS 'Require email verification for new accounts';
COMMENT ON COLUMN system_settings.mfa_enabled IS 'Enable multi-factor authentication feature';
COMMENT ON COLUMN system_settings.mfa_required_for_admin IS 'Require MFA for admin/support roles';
COMMENT ON COLUMN system_settings.account_lockout_enabled IS 'Enable account lockout after failed login attempts';
COMMENT ON COLUMN system_settings.rate_limit_enabled IS 'Enable rate limiting for API and auth endpoints';
COMMENT ON COLUMN system_settings.maintenance_mode IS 'Put application in maintenance mode (read-only)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ System settings tables created successfully';
  RAISE NOTICE '  - system_settings: Configuration table';
  RAISE NOTICE '  - system_settings_audit: Audit log table';
  RAISE NOTICE '  - Triggers: Auto-audit logging for all changes';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Default Settings:';
  RAISE NOTICE '  - Email verification: ENABLED';
  RAISE NOTICE '  - Account lockout: ENABLED (5 attempts, 30 min)';
  RAISE NOTICE '  - Rate limiting: ENABLED';
  RAISE NOTICE '  - Session timeout: 24 hours';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Access admin settings to configure: /admin/system-settings';
END $$;

