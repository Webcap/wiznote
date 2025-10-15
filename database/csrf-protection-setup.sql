-- ============================================================
-- CSRF Protection Setup
-- ============================================================
-- This script sets up the database infrastructure for CSRF protection
-- including token storage, settings, and cleanup functions.
--
-- Features:
-- - CSRF token storage with expiration
-- - Admin-configurable CSRF enforcement
-- - Automatic cleanup of expired tokens
-- - Row-level security for token access
-- - Audit logging for security events
--
-- Author: WizNote Security Team
-- Last Updated: October 2025
-- ============================================================

-- ============================================================
-- 1. Create CSRF Tokens Table
-- ============================================================

-- Store CSRF tokens with user association and expiration
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT token_not_empty CHECK (char_length(token) >= 20),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_valid ON csrf_tokens(user_id, expires_at) WHERE expires_at > NOW();

-- Add comment
COMMENT ON TABLE csrf_tokens IS 'Stores CSRF tokens for cross-site request forgery protection';
COMMENT ON COLUMN csrf_tokens.token IS 'The CSRF token value (minimum 20 characters)';
COMMENT ON COLUMN csrf_tokens.expires_at IS 'Token expiration timestamp (typically 1 hour from creation)';
COMMENT ON COLUMN csrf_tokens.last_used_at IS 'Last time the token was validated';

-- ============================================================
-- 2. Enable Row-Level Security
-- ============================================================

ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tokens
CREATE POLICY csrf_tokens_select_own ON csrf_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own tokens
CREATE POLICY csrf_tokens_insert_own ON csrf_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tokens
CREATE POLICY csrf_tokens_update_own ON csrf_tokens
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own tokens
CREATE POLICY csrf_tokens_delete_own ON csrf_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all tokens (for debugging/auditing)
CREATE POLICY csrf_tokens_admin_all ON csrf_tokens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- ============================================================
-- 3. Add CSRF Settings to System Settings
-- ============================================================

-- Add CSRF protection columns to system_settings table
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS csrf_protection_enabled BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS csrf_origin_check_enabled BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS csrf_token_expiry_minutes INTEGER DEFAULT 60 NOT NULL;

-- Add constraints
ALTER TABLE system_settings
ADD CONSTRAINT csrf_token_expiry_positive CHECK (csrf_token_expiry_minutes > 0),
ADD CONSTRAINT csrf_token_expiry_reasonable CHECK (csrf_token_expiry_minutes <= 1440); -- Max 24 hours

-- Add comments
COMMENT ON COLUMN system_settings.csrf_protection_enabled IS 'Enable/disable CSRF token validation (secure default: TRUE)';
COMMENT ON COLUMN system_settings.csrf_origin_check_enabled IS 'Enable/disable origin/referer header verification (secure default: TRUE)';
COMMENT ON COLUMN system_settings.csrf_token_expiry_minutes IS 'CSRF token validity duration in minutes (default: 60)';

-- ============================================================
-- 4. Create Helper Functions
-- ============================================================

-- Function: Generate a new CSRF token for a user
CREATE OR REPLACE FUNCTION generate_csrf_token(
    p_user_id UUID,
    p_token TEXT,
    p_expiry_minutes INTEGER DEFAULT 60
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiration time
    v_expires_at := NOW() + (p_expiry_minutes || ' minutes')::INTERVAL;
    
    -- Insert the token
    INSERT INTO csrf_tokens (token, user_id, expires_at)
    VALUES (p_token, p_user_id, v_expires_at);
    
    RETURN p_token;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Token already exists';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to generate CSRF token: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION generate_csrf_token IS 'Generate and store a new CSRF token for a user';

-- Function: Validate a CSRF token
CREATE OR REPLACE FUNCTION validate_csrf_token(
    p_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if token exists, belongs to user, and is not expired
    SELECT EXISTS(
        SELECT 1 FROM csrf_tokens
        WHERE token = p_token
        AND user_id = p_user_id
        AND expires_at > NOW()
    ) INTO v_exists;
    
    -- Update last_used_at if token is valid
    IF v_exists THEN
        UPDATE csrf_tokens
        SET last_used_at = NOW()
        WHERE token = p_token;
    END IF;
    
    RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION validate_csrf_token IS 'Validate a CSRF token for a specific user';

-- Function: Clean up expired CSRF tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired tokens
    DELETE FROM csrf_tokens
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_csrf_tokens IS 'Remove expired CSRF tokens and return count of deleted tokens';

-- Function: Get user's valid tokens
CREATE OR REPLACE FUNCTION get_user_csrf_tokens(p_user_id UUID)
RETURNS TABLE (
    token TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.token,
        t.created_at,
        t.expires_at,
        t.last_used_at
    FROM csrf_tokens t
    WHERE t.user_id = p_user_id
    AND t.expires_at > NOW()
    ORDER BY t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_csrf_tokens IS 'Get all valid CSRF tokens for a user';

-- Function: Revoke user's CSRF tokens (on logout/password change)
CREATE OR REPLACE FUNCTION revoke_user_csrf_tokens(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete all tokens for the user
    DELETE FROM csrf_tokens
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION revoke_user_csrf_tokens IS 'Revoke all CSRF tokens for a user (use on logout/password change)';

-- ============================================================
-- 5. Create Automatic Cleanup Job (pg_cron extension)
-- ============================================================

-- Note: This requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, tokens can be cleaned up manually or via scheduled functions

-- Enable pg_cron extension (requires superuser - may need to be done via Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour (commented out - enable if pg_cron is available)
-- SELECT cron.schedule(
--     'cleanup-expired-csrf-tokens',
--     '0 * * * *', -- Every hour
--     $$SELECT cleanup_expired_csrf_tokens()$$
-- );

-- Alternative: Create a trigger-based cleanup on insert
CREATE OR REPLACE FUNCTION trigger_cleanup_csrf_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Randomly trigger cleanup (1% chance on each insert)
    IF random() < 0.01 THEN
        PERFORM cleanup_expired_csrf_tokens();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER csrf_tokens_cleanup_trigger
    AFTER INSERT ON csrf_tokens
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_csrf_tokens();

-- ============================================================
-- 6. Create Audit Log for CSRF Events
-- ============================================================

-- Add CSRF event types to audit log (if not exists)
-- This assumes you have an audit_logs or security_logs table

CREATE TABLE IF NOT EXISTS csrf_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    token_id UUID REFERENCES csrf_tokens(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    origin TEXT,
    referer TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_csrf_audit_log_user_id ON csrf_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_audit_log_created_at ON csrf_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csrf_audit_log_event_type ON csrf_audit_log(event_type);

-- Enable RLS
ALTER TABLE csrf_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY csrf_audit_log_admin_view ON csrf_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Function to log CSRF events
CREATE OR REPLACE FUNCTION log_csrf_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_token_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_origin TEXT DEFAULT NULL,
    p_referer TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO csrf_audit_log (
        event_type,
        user_id,
        token_id,
        ip_address,
        user_agent,
        origin,
        referer,
        error_message
    ) VALUES (
        p_event_type,
        p_user_id,
        p_token_id,
        p_ip_address,
        p_user_agent,
        p_origin,
        p_referer,
        p_error_message
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_csrf_event IS 'Log CSRF-related security events for audit trail';

-- ============================================================
-- 7. Initialize Default Settings
-- ============================================================

-- Update system_settings with default CSRF values (if row exists)
UPDATE system_settings SET
    csrf_protection_enabled = TRUE,
    csrf_origin_check_enabled = TRUE,
    csrf_token_expiry_minutes = 60
WHERE id = 1;

-- Insert if no settings exist (should not happen if system_settings is already set up)
INSERT INTO system_settings (
    id,
    csrf_protection_enabled,
    csrf_origin_check_enabled,
    csrf_token_expiry_minutes
)
SELECT 
    1,
    TRUE,
    TRUE,
    60
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);

-- ============================================================
-- 8. Grant Necessary Permissions
-- ============================================================

-- Grant access to authenticated users (RLS policies will restrict access)
GRANT SELECT, INSERT, UPDATE, DELETE ON csrf_tokens TO authenticated;
GRANT SELECT, INSERT ON csrf_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION generate_csrf_token TO authenticated;
GRANT EXECUTE ON FUNCTION validate_csrf_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_csrf_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_csrf_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION log_csrf_event TO authenticated;

-- Only service role can cleanup
GRANT EXECUTE ON FUNCTION cleanup_expired_csrf_tokens TO service_role;

-- ============================================================
-- 9. Verification Queries
-- ============================================================

-- Verify table creation
SELECT 
    'csrf_tokens' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT user_id) as unique_users
FROM csrf_tokens;

-- Verify settings
SELECT 
    csrf_protection_enabled,
    csrf_origin_check_enabled,
    csrf_token_expiry_minutes
FROM system_settings
WHERE id = 1;

-- ============================================================
-- Setup Complete
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ CSRF Protection database setup complete!';
    RAISE NOTICE '📋 Tables created: csrf_tokens, csrf_audit_log';
    RAISE NOTICE '🔒 RLS policies enabled on all tables';
    RAISE NOTICE '⚙️  Helper functions created for token management';
    RAISE NOTICE '🧹 Automatic cleanup trigger configured';
    RAISE NOTICE '📊 Audit logging enabled for security events';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test CSRF token generation: SELECT generate_csrf_token(auth.uid(), ''test-token-123'', 60);';
    RAISE NOTICE '2. Configure admin settings in /admin/system-settings';
    RAISE NOTICE '3. Integrate CSRFService into your application';
    RAISE NOTICE '4. Run test script: node scripts/test-csrf-protection.js';
END $$;


