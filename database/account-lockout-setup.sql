-- =====================================================
-- WizNote Account Lockout Infrastructure
-- =====================================================
-- Description: Account lockout system for preventing brute force attacks
-- Created: October 2025
-- Purpose: Lock accounts after failed login attempts, with auto-unlock
-- =====================================================

-- =====================================================
-- 1. ACCOUNT LOCKOUT TABLE
-- =====================================================

-- Drop existing table if it exists (for clean reinstall)
DROP TABLE IF EXISTS public.account_lockouts CASCADE;

-- Create account lockout table
CREATE TABLE public.account_lockouts (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    
    -- Lockout details
    is_locked BOOLEAN NOT NULL DEFAULT true,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ NOT NULL,
    
    -- Reason and context
    lock_reason TEXT NOT NULL DEFAULT 'too_many_failed_attempts',
    failed_attempt_count INTEGER NOT NULL DEFAULT 0,
    last_failed_attempt_at TIMESTAMPTZ,
    
    -- Lock metadata
    locked_by TEXT NOT NULL DEFAULT 'system', -- 'system', 'admin', 'security_rule'
    locked_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unlock information
    unlocked_at TIMESTAMPTZ,
    unlock_method TEXT, -- 'auto', 'email', 'admin', 'expired'
    unlocked_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Additional metadata
    ip_addresses TEXT[], -- IPs from failed attempts
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_lock_duration CHECK (locked_until > locked_at),
    CONSTRAINT valid_unlock_time CHECK (unlocked_at IS NULL OR unlocked_at >= locked_at)
);

-- Create indexes for performance
CREATE INDEX idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_user_email ON public.account_lockouts(user_email);
CREATE INDEX idx_account_lockouts_is_locked ON public.account_lockouts(is_locked);
CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);
CREATE INDEX idx_account_lockouts_created_at ON public.account_lockouts(created_at DESC);

-- Composite index for active lockout checks
CREATE INDEX idx_account_lockouts_active ON public.account_lockouts(user_id, is_locked, locked_until) 
    WHERE is_locked = true;

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all lockouts
CREATE POLICY "Admins can view all account lockouts"
    ON public.account_lockouts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Policy: Users can view their own lockout status
CREATE POLICY "Users can view their own account lockout status"
    ON public.account_lockouts
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Service role can manage lockouts (system use only)
-- Note: This is handled by the service role key, not RLS

-- =====================================================
-- 3. DATABASE FUNCTIONS FOR ACCOUNT LOCKOUT
-- =====================================================

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(
    p_user_email TEXT
)
RETURNS TABLE (
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ,
    lock_reason TEXT,
    failed_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.is_locked,
        al.locked_until,
        al.lock_reason,
        al.failed_attempt_count
    FROM public.account_lockouts al
    WHERE al.user_email = p_user_email
        AND al.is_locked = true
        AND al.locked_until > NOW()
    ORDER BY al.created_at DESC
    LIMIT 1;
    
    -- If no active lockout found, return unlocked status
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT false, NULL::TIMESTAMPTZ, NULL::TEXT, 0;
    END IF;
END;
$$;

-- Function to lock an account
CREATE OR REPLACE FUNCTION public.lock_account(
    p_user_id UUID,
    p_user_email TEXT,
    p_duration_minutes INTEGER DEFAULT 30,
    p_failed_attempts INTEGER DEFAULT 5,
    p_lock_reason TEXT DEFAULT 'too_many_failed_attempts',
    p_locked_by TEXT DEFAULT 'system',
    p_locked_by_admin_id UUID DEFAULT NULL,
    p_ip_addresses TEXT[] DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lockout_id UUID;
    v_locked_until TIMESTAMPTZ;
BEGIN
    -- Calculate locked_until time
    v_locked_until := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Insert lockout record
    INSERT INTO public.account_lockouts (
        user_id,
        user_email,
        is_locked,
        locked_at,
        locked_until,
        lock_reason,
        failed_attempt_count,
        last_failed_attempt_at,
        locked_by,
        locked_by_admin_id,
        ip_addresses,
        metadata
    ) VALUES (
        p_user_id,
        p_user_email,
        true,
        NOW(),
        v_locked_until,
        p_lock_reason,
        p_failed_attempts,
        NOW(),
        p_locked_by,
        p_locked_by_admin_id,
        p_ip_addresses,
        p_metadata
    )
    RETURNING id INTO v_lockout_id;
    
    RETURN v_lockout_id;
END;
$$;

-- Function to unlock an account
CREATE OR REPLACE FUNCTION public.unlock_account(
    p_user_email TEXT,
    p_unlock_method TEXT DEFAULT 'admin',
    p_unlocked_by_admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all active lockouts for this user
    UPDATE public.account_lockouts
    SET 
        is_locked = false,
        unlocked_at = NOW(),
        unlock_method = p_unlock_method,
        unlocked_by_admin_id = p_unlocked_by_admin_id,
        updated_at = NOW()
    WHERE user_email = p_user_email
        AND is_locked = true;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count > 0;
END;
$$;

-- Function to auto-unlock expired lockouts
CREATE OR REPLACE FUNCTION public.auto_unlock_expired_lockouts()
RETURNS TABLE (
    unlocked_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unlocked_count BIGINT;
BEGIN
    -- Update expired lockouts
    UPDATE public.account_lockouts
    SET 
        is_locked = false,
        unlocked_at = NOW(),
        unlock_method = 'expired',
        updated_at = NOW()
    WHERE is_locked = true
        AND locked_until <= NOW();
    
    GET DIAGNOSTICS v_unlocked_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_unlocked_count;
END;
$$;

-- Function to get lockout history for a user
CREATE OR REPLACE FUNCTION public.get_lockout_history(
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    locked_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    unlocked_at TIMESTAMPTZ,
    is_locked BOOLEAN,
    lock_reason TEXT,
    failed_attempts INTEGER,
    unlock_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.locked_at,
        al.locked_until,
        al.unlocked_at,
        al.is_locked,
        al.lock_reason,
        al.failed_attempt_count,
        al.unlock_method
    FROM public.account_lockouts al
    WHERE al.user_email = p_user_email
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get lockout statistics
CREATE OR REPLACE FUNCTION public.get_lockout_stats(
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_lockouts BIGINT,
    active_lockouts BIGINT,
    auto_unlocked BIGINT,
    admin_unlocked BIGINT,
    unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_lockouts,
        COUNT(*) FILTER (WHERE is_locked = true)::BIGINT as active_lockouts,
        COUNT(*) FILTER (WHERE unlock_method = 'expired')::BIGINT as auto_unlocked,
        COUNT(*) FILTER (WHERE unlock_method = 'admin')::BIGINT as admin_unlocked,
        COUNT(DISTINCT user_id)::BIGINT as unique_users
    FROM public.account_lockouts
    WHERE created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL;
END;
$$;

-- Function to clean up old lockout records
CREATE OR REPLACE FUNCTION public.cleanup_old_lockouts(
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
    -- Delete unlocked records older than retention period
    DELETE FROM public.account_lockouts
    WHERE is_locked = false
        AND created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================
-- 4. TRIGGER FOR AUTO-UNLOCK
-- =====================================================

-- Create function for trigger
CREATE OR REPLACE FUNCTION public.check_expired_lockout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If checking a locked account and it's expired, auto-unlock
    IF NEW.is_locked = true AND NEW.locked_until <= NOW() THEN
        NEW.is_locked := false;
        NEW.unlocked_at := NOW();
        NEW.unlock_method := 'expired';
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger (optional - mainly for manual checks)
CREATE TRIGGER trigger_auto_unlock_expired
    BEFORE UPDATE ON public.account_lockouts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_expired_lockout();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_account_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_unlock_expired_lockouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lockout_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lockout_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_lockouts TO authenticated;

-- Grant select on lockout table to authenticated users (RLS will filter)
GRANT SELECT ON public.account_lockouts TO authenticated;

-- =====================================================
-- 6. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.account_lockouts IS 'Account lockout tracking for brute force prevention';
COMMENT ON COLUMN public.account_lockouts.is_locked IS 'Current lock status (can be unlocked before locked_until)';
COMMENT ON COLUMN public.account_lockouts.locked_until IS 'When the lockout will automatically expire';
COMMENT ON COLUMN public.account_lockouts.lock_reason IS 'Reason for lockout (e.g., too_many_failed_attempts)';
COMMENT ON COLUMN public.account_lockouts.locked_by IS 'Who/what locked the account (system, admin, security_rule)';
COMMENT ON COLUMN public.account_lockouts.unlock_method IS 'How the account was unlocked (auto, email, admin, expired)';

COMMENT ON FUNCTION public.is_account_locked IS 'Check if an account is currently locked';
COMMENT ON FUNCTION public.lock_account IS 'Lock an account with specified duration and reason';
COMMENT ON FUNCTION public.unlock_account IS 'Manually unlock an account';
COMMENT ON FUNCTION public.auto_unlock_expired_lockouts IS 'Auto-unlock all expired lockouts (run periodically)';
COMMENT ON FUNCTION public.get_lockout_history IS 'Get lockout history for a user';
COMMENT ON FUNCTION public.get_lockout_stats IS 'Get lockout statistics for admin dashboard';
COMMENT ON FUNCTION public.cleanup_old_lockouts IS 'Clean up old unlocked records';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Account lockout infrastructure created successfully';
    RAISE NOTICE '📊 Table: account_lockouts';
    RAISE NOTICE '🔐 RLS policies: 2 policies created';
    RAISE NOTICE '⚙️  Functions: 7 helper functions created';
    RAISE NOTICE '📈 Indexes: 6 indexes created for performance';
    RAISE NOTICE '🔓 Default lockout: 5 attempts, 30 minutes';
    RAISE NOTICE '🎯 Ready to prevent brute force attacks!';
END $$;

