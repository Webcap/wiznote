-- =====================================================
-- WizNote Security Audit Logging Infrastructure
-- =====================================================
-- Description: Comprehensive security event logging system
-- Created: October 2025
-- Purpose: Track authentication, admin actions, data access, and suspicious activities
-- =====================================================

-- =====================================================
-- 1. SECURITY AUDIT LOG TABLE
-- =====================================================

-- Drop existing table if it exists (for clean reinstall)
DROP TABLE IF EXISTS public.security_audit_log CASCADE;

-- Create security audit log table
CREATE TABLE public.security_audit_log (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Event classification
    event_type TEXT NOT NULL CHECK (event_type IN (
        -- Authentication events
        'auth.login.success',
        'auth.login.failure',
        'auth.logout',
        'auth.signup.success',
        'auth.signup.failure',
        'auth.password_reset.request',
        'auth.password_reset.success',
        'auth.password_reset.failure',
        'auth.email_verification.success',
        'auth.email_verification.failure',
        'auth.mfa.enabled',
        'auth.mfa.disabled',
        'auth.mfa.success',
        'auth.mfa.failure',
        'auth.session.expired',
        'auth.session.revoked',
        
        -- Account security events
        'account.lockout',
        'account.unlock',
        'account.deleted',
        'account.suspended',
        'account.reactivated',
        
        -- Admin & privilege events
        'admin.role.granted',
        'admin.role.revoked',
        'admin.action.user_management',
        'admin.action.system_settings',
        'admin.action.premium_grant',
        'admin.action.support_ticket',
        'admin.privilege.escalation',
        
        -- Data access events
        'data.note.created',
        'data.note.updated',
        'data.note.deleted',
        'data.note.shared',
        'data.note.accessed',
        'data.export.requested',
        'data.export.completed',
        
        -- API & security events
        'api.rate_limit.exceeded',
        'api.rate_limit.warning',
        'api.error.unauthorized',
        'api.error.forbidden',
        'api.error.server',
        'csrf.validation.success',
        'csrf.validation.failure',
        'csrf.token.generated',
        'csrf.token.expired',
        
        -- Suspicious activity
        'security.suspicious.multiple_failed_logins',
        'security.suspicious.unusual_location',
        'security.suspicious.unusual_time',
        'security.suspicious.sql_injection_attempt',
        'security.suspicious.xss_attempt',
        'security.suspicious.path_traversal_attempt',
        
        -- System events
        'system.settings.updated',
        'system.backup.created',
        'system.maintenance.started',
        'system.maintenance.completed'
    )),
    
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    
    -- Target information (for admin actions on other users)
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_email TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method TEXT,
    
    -- Event details
    event_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    
    -- Geolocation (optional, can be populated by external service)
    location_country TEXT,
    location_city TEXT,
    
    -- Success indicator
    success BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_severity ON public.security_audit_log(severity);
CREATE INDEX idx_security_audit_log_ip_address ON public.security_audit_log(ip_address);
CREATE INDEX idx_security_audit_log_success ON public.security_audit_log(success);

-- Composite indexes for common queries
CREATE INDEX idx_security_audit_log_user_created ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_event_created ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX idx_security_audit_log_severity_created ON public.security_audit_log(severity, created_at DESC);

-- Index for suspicious activity detection
CREATE INDEX idx_security_audit_log_failed_auth ON public.security_audit_log(user_email, event_type, created_at DESC) 
    WHERE success = false AND event_type LIKE 'auth.%';

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all security audit logs"
    ON public.security_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Policy: Users can view their own security events (limited)
CREATE POLICY "Users can view their own security audit logs"
    ON public.security_audit_log
    FOR SELECT
    USING (
        user_id = auth.uid()
        AND event_type IN (
            'auth.login.success',
            'auth.logout',
            'auth.password_reset.success',
            'auth.email_verification.success',
            'auth.mfa.enabled',
            'auth.mfa.disabled',
            'data.note.created',
            'data.note.updated',
            'data.note.deleted'
        )
    );

-- Policy: Service role can insert audit logs (system use only)
-- Note: This is handled by the service role key, not RLS

-- =====================================================
-- 3. DATABASE FUNCTIONS FOR SECURITY LOGGING
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_severity TEXT DEFAULT 'info',
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_user_role TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_target_user_email TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_error_message TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Insert security audit log entry
    INSERT INTO public.security_audit_log (
        event_type,
        severity,
        user_id,
        user_email,
        user_role,
        target_user_id,
        target_user_email,
        ip_address,
        user_agent,
        request_path,
        request_method,
        event_data,
        error_message,
        success,
        metadata
    ) VALUES (
        p_event_type,
        p_severity,
        p_user_id,
        p_user_email,
        p_user_role,
        p_target_user_id,
        p_target_user_email,
        p_ip_address,
        p_user_agent,
        p_request_path,
        p_request_method,
        p_event_data,
        p_error_message,
        p_success,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to get recent failed login attempts for a user
CREATE OR REPLACE FUNCTION public.get_recent_failed_logins(
    p_user_email TEXT,
    p_time_window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
    attempt_count BIGINT,
    last_attempt TIMESTAMPTZ,
    ip_addresses TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as attempt_count,
        MAX(created_at) as last_attempt,
        ARRAY_AGG(DISTINCT ip_address::TEXT) as ip_addresses
    FROM public.security_audit_log
    WHERE user_email = p_user_email
        AND event_type = 'auth.login.failure'
        AND success = false
        AND created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
END;
$$;

-- Function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
    p_user_id UUID,
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    suspicious_pattern TEXT,
    event_count BIGINT,
    severity TEXT,
    details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Multiple failed logins
    RETURN QUERY
    SELECT 
        'multiple_failed_logins'::TEXT as suspicious_pattern,
        COUNT(*)::BIGINT as event_count,
        'warning'::TEXT as severity,
        jsonb_build_object(
            'ip_addresses', ARRAY_AGG(DISTINCT ip_address::TEXT),
            'time_range', jsonb_build_object(
                'start', MIN(created_at),
                'end', MAX(created_at)
            )
        ) as details
    FROM public.security_audit_log
    WHERE user_id = p_user_id
        AND event_type LIKE 'auth.%.failure'
        AND success = false
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
    HAVING COUNT(*) >= 3;
    
    -- Multiple IP addresses
    RETURN QUERY
    SELECT 
        'multiple_ip_addresses'::TEXT as suspicious_pattern,
        COUNT(DISTINCT ip_address)::BIGINT as event_count,
        'info'::TEXT as severity,
        jsonb_build_object(
            'ip_addresses', ARRAY_AGG(DISTINCT ip_address::TEXT),
            'time_range', jsonb_build_object(
                'start', MIN(created_at),
                'end', MAX(created_at)
            )
        ) as details
    FROM public.security_audit_log
    WHERE user_id = p_user_id
        AND event_type LIKE 'auth.%'
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
    HAVING COUNT(DISTINCT ip_address) >= 3;
END;
$$;

-- Function to get security event summary for admin dashboard
CREATE OR REPLACE FUNCTION public.get_security_event_summary(
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    unique_users BIGINT,
    severity_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH event_summary AS (
        SELECT 
            sal.event_type,
            COUNT(*)::BIGINT as event_count,
            COUNT(*) FILTER (WHERE sal.success = true)::BIGINT as success_count,
            COUNT(*) FILTER (WHERE sal.success = false)::BIGINT as failure_count,
            COUNT(DISTINCT sal.user_id)::BIGINT as unique_users
        FROM public.security_audit_log sal
        WHERE sal.created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
        GROUP BY sal.event_type
    ),
    severity_counts AS (
        SELECT 
            sub.event_type,
            jsonb_object_agg(sub.severity, sub.severity_count) as severity_breakdown
        FROM (
            SELECT 
                event_type,
                severity,
                COUNT(*)::BIGINT as severity_count
            FROM public.security_audit_log
            WHERE created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
            GROUP BY event_type, severity
        ) sub
        GROUP BY sub.event_type
    )
    SELECT 
        es.event_type,
        es.event_count,
        es.success_count,
        es.failure_count,
        es.unique_users,
        COALESCE(sc.severity_breakdown, '{}'::jsonb) as severity_breakdown
    FROM event_summary es
    LEFT JOIN severity_counts sc ON es.event_type = sc.event_type
    ORDER BY es.event_count DESC;
END;
$$;

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS TABLE (
    deleted_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count BIGINT;
BEGIN
    -- Delete audit logs older than retention period
    -- Keep critical severity logs indefinitely
    DELETE FROM public.security_audit_log
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
        AND severity != 'critical';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================
-- 4. AUTOMATED CLEANUP JOB (Optional - requires pg_cron extension)
-- =====================================================

-- NOTE: This requires the pg_cron extension to be enabled
-- Run this manually if pg_cron is available:
-- 
-- SELECT cron.schedule(
--     'cleanup-old-security-logs',
--     '0 2 * * 0', -- Run every Sunday at 2 AM
--     $$SELECT public.cleanup_old_security_logs(365)$$
-- );

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_failed_logins TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_event_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs TO authenticated;

-- Grant select on audit log table to authenticated users (RLS will filter)
GRANT SELECT ON public.security_audit_log TO authenticated;

-- =====================================================
-- 6. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.security_audit_log IS 'Comprehensive security audit log for tracking all security-related events';
COMMENT ON COLUMN public.security_audit_log.event_type IS 'Type of security event (e.g., auth.login.success, admin.role.granted)';
COMMENT ON COLUMN public.security_audit_log.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON COLUMN public.security_audit_log.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.security_audit_log.target_user_id IS 'User affected by the action (for admin operations)';
COMMENT ON COLUMN public.security_audit_log.event_data IS 'Additional event details in JSON format';
COMMENT ON COLUMN public.security_audit_log.metadata IS 'Additional metadata for future extensibility';

COMMENT ON FUNCTION public.log_security_event IS 'Log a security event to the audit log';
COMMENT ON FUNCTION public.get_recent_failed_logins IS 'Get count and details of recent failed login attempts';
COMMENT ON FUNCTION public.detect_suspicious_activity IS 'Detect suspicious activity patterns for a user';
COMMENT ON FUNCTION public.get_security_event_summary IS 'Get summary of security events for admin dashboard';
COMMENT ON FUNCTION public.cleanup_old_security_logs IS 'Clean up old audit logs based on retention policy';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Security audit logging infrastructure created successfully';
    RAISE NOTICE '📊 Table: security_audit_log';
    RAISE NOTICE '🔐 RLS policies: 2 policies created';
    RAISE NOTICE '⚙️  Functions: 5 helper functions created';
    RAISE NOTICE '📈 Indexes: 9 indexes created for performance';
    RAISE NOTICE '🎯 Ready to track security events!';
END $$;

