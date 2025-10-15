-- =====================================================
-- WizNote Session Management Infrastructure
-- =====================================================
-- Description: Enhanced session tracking and management
-- Created: October 2025
-- Purpose: Track active sessions, enforce timeouts, implement remember me
-- =====================================================

-- =====================================================
-- 1. ACTIVE SESSIONS TABLE
-- =====================================================

-- Drop existing table if it exists (for clean reinstall)
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Create user sessions table
CREATE TABLE public.user_sessions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User and session information
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    session_id TEXT NOT NULL, -- Supabase session ID
    
    -- Session metadata
    device_name TEXT,
    device_type TEXT, -- 'web', 'ios', 'android'
    platform TEXT,
    browser TEXT,
    os TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Session lifecycle
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Remember me feature
    is_remember_me BOOLEAN NOT NULL DEFAULT false,
    remember_me_expires_at TIMESTAMPTZ,
    
    -- Session termination
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT, -- 'logout', 'timeout', 'password_changed', 'admin_revoke', 'force_logout'
    terminated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Location (optional)
    location_country TEXT,
    location_city TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT valid_termination CHECK (terminated_at IS NULL OR terminated_at >= created_at),
    CONSTRAINT unique_active_session UNIQUE NULLS NOT DISTINCT (user_id, session_id, is_active)
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);
CREATE INDEX idx_user_sessions_created_at ON public.user_sessions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_user_sessions_active_user ON public.user_sessions(user_id, is_active) 
    WHERE is_active = true;
-- Note: Can't use NOW() in index predicate, so we index all active sessions by expiry
CREATE INDEX idx_user_sessions_active_expiry ON public.user_sessions(expires_at, is_active) 
    WHERE is_active = true;

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all user sessions"
    ON public.user_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Service role can manage sessions (system use only)
-- Note: This is handled by the service role key, not RLS

-- =====================================================
-- 3. DATABASE FUNCTIONS FOR SESSION MANAGEMENT
-- =====================================================

-- Function to create or update session
CREATE OR REPLACE FUNCTION public.upsert_user_session(
    p_user_id UUID,
    p_user_email TEXT,
    p_session_id TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_platform TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_is_remember_me BOOLEAN DEFAULT false,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_remember_expires_at TIMESTAMPTZ;
BEGIN
    -- Calculate expiry time if not provided (default: 24 hours)
    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '24 hours');
    
    -- Calculate remember me expiry (30 days)
    IF p_is_remember_me THEN
        v_remember_expires_at := NOW() + INTERVAL '30 days';
        v_expires_at := v_remember_expires_at;
    END IF;
    
    -- Insert or update session
    INSERT INTO public.user_sessions (
        user_id,
        user_email,
        session_id,
        device_name,
        device_type,
        platform,
        browser,
        os,
        ip_address,
        user_agent,
        last_activity_at,
        expires_at,
        is_active,
        is_remember_me,
        remember_me_expires_at,
        metadata
    ) VALUES (
        p_user_id,
        p_user_email,
        p_session_id,
        p_device_name,
        p_device_type,
        p_platform,
        p_browser,
        p_os,
        p_ip_address,
        p_user_agent,
        NOW(),
        v_expires_at,
        true,
        p_is_remember_me,
        v_remember_expires_at,
        p_metadata
    )
    ON CONFLICT (user_id, session_id, is_active) 
    DO UPDATE SET
        last_activity_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION public.update_session_activity(
    p_session_id TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.user_sessions
    SET 
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE session_id = p_session_id
        AND user_id = p_user_id
        AND is_active = true;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;

-- Function to terminate a session
CREATE OR REPLACE FUNCTION public.terminate_session(
    p_session_id TEXT,
    p_user_id UUID,
    p_reason TEXT DEFAULT 'logout',
    p_terminated_by_admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.user_sessions
    SET 
        is_active = false,
        terminated_at = NOW(),
        termination_reason = p_reason,
        terminated_by_admin_id = p_terminated_by_admin_id,
        updated_at = NOW()
    WHERE session_id = p_session_id
        AND user_id = p_user_id
        AND is_active = true;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;

-- Function to terminate all user sessions
CREATE OR REPLACE FUNCTION public.terminate_all_user_sessions(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'force_logout',
    p_terminated_by_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
    terminated_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_terminated_count BIGINT;
BEGIN
    UPDATE public.user_sessions
    SET 
        is_active = false,
        terminated_at = NOW(),
        termination_reason = p_reason,
        terminated_by_admin_id = p_terminated_by_admin_id,
        updated_at = NOW()
    WHERE user_id = p_user_id
        AND is_active = true;
    
    GET DIAGNOSTICS v_terminated_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_terminated_count;
END;
$$;

-- Function to get active sessions for user
CREATE OR REPLACE FUNCTION public.get_active_sessions(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    device_name TEXT,
    device_type TEXT,
    platform TEXT,
    ip_address INET,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_remember_me BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.session_id,
        s.device_name,
        s.device_type,
        s.platform,
        s.ip_address,
        s.last_activity_at,
        s.created_at,
        s.expires_at,
        s.is_remember_me
    FROM public.user_sessions s
    WHERE s.user_id = p_user_id
        AND s.is_active = true
        AND s.expires_at > NOW()
    ORDER BY s.last_activity_at DESC;
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TABLE (
    terminated_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_terminated_count BIGINT;
BEGIN
    -- Terminate expired sessions
    UPDATE public.user_sessions
    SET 
        is_active = false,
        terminated_at = NOW(),
        termination_reason = 'timeout',
        updated_at = NOW()
    WHERE is_active = true
        AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_terminated_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_terminated_count;
END;
$$;

-- Function to get session statistics
CREATE OR REPLACE FUNCTION public.get_session_stats(
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_sessions BIGINT,
    active_sessions BIGINT,
    web_sessions BIGINT,
    mobile_sessions BIGINT,
    remember_me_sessions BIGINT,
    unique_users BIGINT,
    avg_session_duration_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_sessions,
        COUNT(*) FILTER (WHERE is_active = true)::BIGINT as active_sessions,
        COUNT(*) FILTER (WHERE device_type = 'web')::BIGINT as web_sessions,
        COUNT(*) FILTER (WHERE device_type IN ('ios', 'android'))::BIGINT as mobile_sessions,
        COUNT(*) FILTER (WHERE is_remember_me = true)::BIGINT as remember_me_sessions,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        AVG(
            EXTRACT(EPOCH FROM (
                COALESCE(terminated_at, NOW()) - created_at
            )) / 60
        )::NUMERIC as avg_session_duration_minutes
    FROM public.user_sessions
    WHERE created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL;
END;
$$;

-- Function to cleanup old session records
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions(
    p_retention_days INTEGER DEFAULT 90
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
    -- Delete inactive sessions older than retention period
    DELETE FROM public.user_sessions
    WHERE is_active = false
        AND created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================
-- 4. AUTOMATED SESSION CLEANUP TRIGGER
-- =====================================================

-- Create function for trigger
CREATE OR REPLACE FUNCTION public.check_session_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If session is expired, mark as inactive
    IF NEW.is_active = true AND NEW.expires_at <= NOW() THEN
        NEW.is_active := false;
        NEW.terminated_at := NOW();
        NEW.termination_reason := 'timeout';
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_check_session_expiry
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_session_expiry();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.upsert_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_all_user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions TO authenticated;

-- Grant select on sessions table to authenticated users (RLS will filter)
GRANT SELECT ON public.user_sessions TO authenticated;

-- =====================================================
-- 6. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.user_sessions IS 'Active user session tracking for security and management';
COMMENT ON COLUMN public.user_sessions.session_id IS 'Supabase session identifier';
COMMENT ON COLUMN public.user_sessions.last_activity_at IS 'Last time session was used';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'When session will expire';
COMMENT ON COLUMN public.user_sessions.is_remember_me IS 'Whether this is a "remember me" session with extended duration';
COMMENT ON COLUMN public.user_sessions.termination_reason IS 'Why the session was terminated';

COMMENT ON FUNCTION public.upsert_user_session IS 'Create or update a user session';
COMMENT ON FUNCTION public.update_session_activity IS 'Update last activity time for a session';
COMMENT ON FUNCTION public.terminate_session IS 'Terminate a specific session';
COMMENT ON FUNCTION public.terminate_all_user_sessions IS 'Terminate all sessions for a user';
COMMENT ON FUNCTION public.get_active_sessions IS 'Get all active sessions for a user';
COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Cleanup expired sessions (run periodically)';
COMMENT ON FUNCTION public.get_session_stats IS 'Get session statistics for admin dashboard';
COMMENT ON FUNCTION public.cleanup_old_sessions IS 'Clean up old session records';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Session management infrastructure created successfully';
    RAISE NOTICE '📊 Table: user_sessions';
    RAISE NOTICE '🔐 RLS policies: 2 policies created';
    RAISE NOTICE '⚙️  Functions: 8 helper functions created';
    RAISE NOTICE '📈 Indexes: 8 indexes created for performance';
    RAISE NOTICE '⏰ Default session timeout: 24 hours';
    RAISE NOTICE '🔄 Remember me duration: 30 days';
    RAISE NOTICE '🎯 Ready to track and manage sessions!';
END $$;


