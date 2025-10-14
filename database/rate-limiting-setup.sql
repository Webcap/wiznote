-- Rate Limiting Setup
-- This creates the infrastructure for tracking and enforcing rate limits

-- ============================================================================
-- 1. Rate Limit Attempts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Email, IP address, or user ID
  attempt_type TEXT NOT NULL, -- 'auth_signin', 'auth_signup', 'api_request'
  endpoint TEXT, -- Optional: specific endpoint being accessed
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB, -- Additional context (e.g., error message, user details)
  
  -- Indexes for efficient querying
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_type 
  ON rate_limit_attempts(identifier, attempt_type, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempted_at 
  ON rate_limit_attempts(attempted_at DESC);

-- Add comments
COMMENT ON TABLE rate_limit_attempts IS 'Tracks authentication and API attempts for rate limiting';
COMMENT ON COLUMN rate_limit_attempts.identifier IS 'Email for auth attempts, IP for API requests';
COMMENT ON COLUMN rate_limit_attempts.attempt_type IS 'Type: auth_signin, auth_signup, api_request';
COMMENT ON COLUMN rate_limit_attempts.attempted_at IS 'When the attempt occurred';

-- ============================================================================
-- 2. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Admin-only access to rate limit data
CREATE POLICY "Admins can view all rate limit attempts"
  ON rate_limit_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- System can insert rate limit attempts (no direct user access)
CREATE POLICY "Service role can insert rate limit attempts"
  ON rate_limit_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 3. Helper Functions
-- ============================================================================

-- Function to check if rate limit is exceeded
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
)
RETURNS TABLE(
  is_limited BOOLEAN,
  attempt_count INTEGER,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_attempt_count INTEGER;
BEGIN
  -- Calculate the time window
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count attempts within the window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM rate_limit_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND attempted_at >= v_window_start;
  
  -- Return the result
  RETURN QUERY SELECT
    v_attempt_count >= p_max_attempts AS is_limited,
    v_attempt_count AS attempt_count,
    v_window_start AS window_start,
    NOW() AS window_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_rate_limit IS 'Checks if a rate limit has been exceeded for a given identifier';

-- Function to record a rate limit attempt
CREATE OR REPLACE FUNCTION record_rate_limit_attempt(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_endpoint TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO rate_limit_attempts (
    identifier,
    attempt_type,
    endpoint,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_identifier,
    p_attempt_type,
    p_endpoint,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_rate_limit_attempt IS 'Records a rate limit attempt for tracking';

-- Function to clean up old rate limit attempts (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_attempts(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_attempts
  WHERE attempted_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_rate_limit_attempts IS 'Cleans up old rate limit attempts (default: keep 30 days)';

-- ============================================================================
-- 4. Insert Default Settings (if not exists)
-- ============================================================================

-- Ensure system_settings table has rate limiting columns
-- (This should already exist from system-settings-setup.sql, but we verify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings'
    AND column_name = 'rate_limit_enabled'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN rate_limit_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE system_settings ADD COLUMN rate_limit_auth_attempts INTEGER NOT NULL DEFAULT 5;
    ALTER TABLE system_settings ADD COLUMN rate_limit_auth_window_minutes INTEGER NOT NULL DEFAULT 15;
    ALTER TABLE system_settings ADD COLUMN rate_limit_api_requests INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE system_settings ADD COLUMN rate_limit_api_window_minutes INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- ============================================================================
-- 5. Grant Permissions
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION record_rate_limit_attempt TO authenticated;

-- Only admins can cleanup
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_attempts TO authenticated;

-- ============================================================================
-- Setup Complete
-- ============================================================================

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Rate Limiting Setup Complete!';
  RAISE NOTICE '- Table: rate_limit_attempts';
  RAISE NOTICE '- Functions: check_rate_limit, record_rate_limit_attempt, cleanup_rate_limit_attempts';
  RAISE NOTICE '- RLS Policies: Enabled (admin-only access)';
  RAISE NOTICE '- Rate limiting can be enabled/disabled via system_settings.rate_limit_enabled';
END $$;

