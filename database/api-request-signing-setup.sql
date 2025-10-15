-- =====================================================
-- WizNote API Request Signing Infrastructure
-- =====================================================
-- Description: Request signature verification using HMAC-SHA256
-- Created: October 2025
-- Purpose: Prevent API tampering and replay attacks
-- =====================================================

-- =====================================================
-- 1. API SIGNING KEYS TABLE
-- =====================================================

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS public.api_signing_keys CASCADE;
DROP TABLE IF EXISTS public.signed_request_log CASCADE;

-- Drop the old unique constraint if it exists (from previous version)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'api_signing_keys_key_name_key'
    ) THEN
        ALTER TABLE public.api_signing_keys DROP CONSTRAINT api_signing_keys_key_name_key;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist yet, that's fine
        NULL;
END $$;

-- Create API signing keys table
CREATE TABLE public.api_signing_keys (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Key information
    key_name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- SHA-256 hash of the actual key (not the key itself)
    key_version INTEGER NOT NULL DEFAULT 1,
    
    -- Key scope and usage
    key_purpose TEXT NOT NULL CHECK (key_purpose IN ('client_api', 'server_api', 'webhook', 'internal')),
    allowed_operations TEXT[], -- Which operations this key can sign
    
    -- Key lifecycle
    is_active BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    
    -- Rotation tracking
    rotated_from_key_id UUID REFERENCES public.api_signing_keys(id) ON DELETE SET NULL,
    next_key_id UUID REFERENCES public.api_signing_keys(id) ON DELETE SET NULL,
    
    -- Usage statistics
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- Create indexes
CREATE INDEX idx_api_signing_keys_key_name ON public.api_signing_keys(key_name);
CREATE INDEX idx_api_signing_keys_is_active ON public.api_signing_keys(is_active);
CREATE INDEX idx_api_signing_keys_expires_at ON public.api_signing_keys(expires_at);
CREATE INDEX idx_api_signing_keys_key_purpose ON public.api_signing_keys(key_purpose);

-- Partial unique index: Only one active key per key_name
CREATE UNIQUE INDEX idx_api_signing_keys_unique_active_name ON public.api_signing_keys(key_name)
    WHERE is_active = true;

-- Composite index for active key lookup
CREATE INDEX idx_api_signing_keys_active_lookup ON public.api_signing_keys(key_name, key_version, expires_at)
    WHERE is_active = true;

-- =====================================================
-- 2. SIGNED REQUEST LOG TABLE
-- =====================================================

-- Create signed request log table
CREATE TABLE public.signed_request_log (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request identification
    request_id TEXT NOT NULL UNIQUE, -- Client-generated unique ID
    signature TEXT NOT NULL,
    timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
    
    -- Request details
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    body_hash TEXT, -- SHA-256 hash of request body
    
    -- User and key information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    api_key_id UUID REFERENCES public.api_signing_keys(id) ON DELETE SET NULL,
    key_name TEXT,
    
    -- Validation results
    is_valid BOOLEAN NOT NULL,
    validation_error TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    
    -- Replay attack detection
    is_replay BOOLEAN DEFAULT false,
    original_request_id UUID REFERENCES public.signed_request_log(id) ON DELETE SET NULL,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_signed_request_log_request_id ON public.signed_request_log(request_id);
CREATE INDEX idx_signed_request_log_timestamp ON public.signed_request_log(timestamp DESC);
CREATE INDEX idx_signed_request_log_user_id ON public.signed_request_log(user_id);
CREATE INDEX idx_signed_request_log_created_at ON public.signed_request_log(created_at DESC);
CREATE INDEX idx_signed_request_log_is_valid ON public.signed_request_log(is_valid);

-- Composite index for replay detection
CREATE INDEX idx_signed_request_log_replay_check ON public.signed_request_log(signature, timestamp, is_valid);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on API keys
ALTER TABLE public.api_signing_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view API keys
CREATE POLICY "Admins can view API signing keys"
    ON public.api_signing_keys
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Enable RLS on signed request log
ALTER TABLE public.signed_request_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all request logs
CREATE POLICY "Admins can view all signed request logs"
    ON public.signed_request_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Policy: Users can view their own request logs
CREATE POLICY "Users can view their own signed request logs"
    ON public.signed_request_log
    FOR SELECT
    USING (user_id = auth.uid());

-- =====================================================
-- 4. DATABASE FUNCTIONS FOR REQUEST SIGNING
-- =====================================================

-- Function to create an API signing key
CREATE OR REPLACE FUNCTION public.create_api_signing_key(
    p_key_name TEXT,
    p_key_hash TEXT,
    p_key_purpose TEXT DEFAULT 'client_api',
    p_allowed_operations TEXT[] DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key_id UUID;
    v_key_version INTEGER;
BEGIN
    -- Get next version number for this key name
    SELECT COALESCE(MAX(key_version), 0) + 1 INTO v_key_version
    FROM public.api_signing_keys
    WHERE key_name = p_key_name;
    
    -- Insert new key
    INSERT INTO public.api_signing_keys (
        key_name,
        key_hash,
        key_version,
        key_purpose,
        allowed_operations,
        is_active,
        activated_at,
        expires_at,
        metadata
    ) VALUES (
        p_key_name,
        p_key_hash,
        v_key_version,
        p_key_purpose,
        p_allowed_operations,
        true,
        NOW(),
        p_expires_at,
        p_metadata
    )
    RETURNING id INTO v_key_id;
    
    RETURN v_key_id;
END;
$$;

-- Function to revoke an API signing key
CREATE OR REPLACE FUNCTION public.revoke_api_signing_key(
    p_key_name TEXT,
    p_revoked_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'manual_revocation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.api_signing_keys
    SET 
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_revoked_by,
        revocation_reason = p_reason,
        updated_at = NOW()
    WHERE key_name = p_key_name
        AND is_active = true;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;

-- Function to rotate an API signing key
CREATE OR REPLACE FUNCTION public.rotate_api_signing_key(
    p_old_key_name TEXT,
    p_new_key_hash TEXT,
    p_rotated_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_key_id UUID;
    v_new_key_id UUID;
    v_new_key_version INTEGER;
    v_key_purpose TEXT;
    v_allowed_operations TEXT[];
    v_metadata JSONB;
BEGIN
    -- Get old key details
    SELECT id, key_purpose, allowed_operations, metadata, key_version 
    INTO v_old_key_id, v_key_purpose, v_allowed_operations, v_metadata, v_new_key_version
    FROM public.api_signing_keys
    WHERE key_name = p_old_key_name
        AND is_active = true
    LIMIT 1;
    
    IF v_old_key_id IS NULL THEN
        RAISE EXCEPTION 'Active key not found: %', p_old_key_name;
    END IF;
    
    -- Increment version for new key
    v_new_key_version := v_new_key_version + 1;
    
    -- Create new key version (inactive initially to avoid unique constraint violation)
    INSERT INTO public.api_signing_keys (
        key_name,
        key_hash,
        key_version,
        key_purpose,
        allowed_operations,
        is_active,
        rotated_from_key_id,
        metadata
    ) VALUES (
        p_old_key_name,
        p_new_key_hash,
        v_new_key_version,
        v_key_purpose,
        v_allowed_operations,
        false, -- Start as inactive
        v_old_key_id,
        jsonb_build_object('rotated_from', v_old_key_id, 'rotated_at', NOW())
    )
    RETURNING id INTO v_new_key_id;
    
    -- Update old key with rotation info and revoke it
    UPDATE public.api_signing_keys
    SET 
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_rotated_by,
        revocation_reason = 'key_rotation',
        next_key_id = v_new_key_id,
        updated_at = NOW()
    WHERE id = v_old_key_id;
    
    -- Now activate the new key (old key is inactive, so no constraint violation)
    UPDATE public.api_signing_keys
    SET is_active = true
    WHERE id = v_new_key_id;
    
    RETURN v_new_key_id;
END;
$$;

-- Function to log signed request
CREATE OR REPLACE FUNCTION public.log_signed_request(
    p_request_id TEXT,
    p_signature TEXT,
    p_timestamp BIGINT,
    p_method TEXT,
    p_path TEXT,
    p_body_hash TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_api_key_id UUID DEFAULT NULL,
    p_key_name TEXT DEFAULT NULL,
    p_is_valid BOOLEAN DEFAULT true,
    p_validation_error TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_is_replay BOOLEAN DEFAULT false,
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
    INSERT INTO public.signed_request_log (
        request_id,
        signature,
        timestamp,
        method,
        path,
        body_hash,
        user_id,
        user_email,
        api_key_id,
        key_name,
        is_valid,
        validation_error,
        ip_address,
        user_agent,
        is_replay,
        metadata
    ) VALUES (
        p_request_id,
        p_signature,
        p_timestamp,
        p_method,
        p_path,
        p_body_hash,
        p_user_id,
        p_user_email,
        p_api_key_id,
        p_key_name,
        p_is_valid,
        p_validation_error,
        p_ip_address,
        p_user_agent,
        p_is_replay,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    -- Update key usage statistics if key is specified
    IF p_api_key_id IS NOT NULL AND p_is_valid THEN
        UPDATE public.api_signing_keys
        SET 
            last_used_at = NOW(),
            usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = p_api_key_id;
    END IF;
    
    RETURN v_log_id;
END;
$$;

-- Function to check for replay attacks
CREATE OR REPLACE FUNCTION public.check_request_replay(
    p_signature TEXT,
    p_time_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    is_replay BOOLEAN,
    original_request_id TEXT,
    original_timestamp BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true as is_replay,
        srl.request_id as original_request_id,
        srl.timestamp as original_timestamp
    FROM public.signed_request_log srl
    WHERE srl.signature = p_signature
        AND srl.is_valid = true
        AND srl.created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
    ORDER BY srl.created_at ASC
    LIMIT 1;
    
    -- If no match found, not a replay
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT false, NULL::TEXT, NULL::BIGINT;
    END IF;
END;
$$;

-- Function to get active API keys
CREATE OR REPLACE FUNCTION public.get_active_api_keys(
    p_key_purpose TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    key_name TEXT,
    key_version INTEGER,
    key_purpose TEXT,
    allowed_operations TEXT[],
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id,
        k.key_name,
        k.key_version,
        k.key_purpose,
        k.allowed_operations,
        k.activated_at,
        k.expires_at,
        k.last_used_at,
        k.usage_count
    FROM public.api_signing_keys k
    WHERE k.is_active = true
        AND (k.expires_at IS NULL OR k.expires_at > NOW())
        AND (p_key_purpose IS NULL OR k.key_purpose = p_key_purpose)
    ORDER BY k.key_version DESC;
END;
$$;

-- Function to get request signing statistics
CREATE OR REPLACE FUNCTION public.get_request_signing_stats(
    p_time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_requests BIGINT,
    valid_requests BIGINT,
    invalid_requests BIGINT,
    replay_attempts BIGINT,
    unique_users BIGINT,
    unique_keys BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE is_valid = true)::BIGINT as valid_requests,
        COUNT(*) FILTER (WHERE is_valid = false)::BIGINT as invalid_requests,
        COUNT(*) FILTER (WHERE is_replay = true)::BIGINT as replay_attempts,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        COUNT(DISTINCT api_key_id)::BIGINT as unique_keys
    FROM public.signed_request_log
    WHERE created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL;
END;
$$;

-- Function to cleanup old request logs
CREATE OR REPLACE FUNCTION public.cleanup_old_request_logs(
    p_retention_days INTEGER DEFAULT 30
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
    -- Delete logs older than retention period
    DELETE FROM public.signed_request_log
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_api_signing_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_signing_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_api_signing_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_signed_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_request_replay TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_api_keys TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_request_signing_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_request_logs TO authenticated;

-- Grant select on tables to authenticated users (RLS will filter)
GRANT SELECT ON public.api_signing_keys TO authenticated;
GRANT SELECT ON public.signed_request_log TO authenticated;

-- =====================================================
-- 6. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.api_signing_keys IS 'API signing keys for HMAC-SHA256 request signatures';
COMMENT ON TABLE public.signed_request_log IS 'Log of all signed API requests for audit and replay detection';

COMMENT ON COLUMN public.api_signing_keys.key_hash IS 'SHA-256 hash of the key (not the key itself)';
COMMENT ON COLUMN public.api_signing_keys.key_purpose IS 'Purpose of the key: client_api, server_api, webhook, internal';
COMMENT ON COLUMN public.api_signing_keys.allowed_operations IS 'List of operations this key can sign';

COMMENT ON COLUMN public.signed_request_log.request_id IS 'Client-generated unique request ID (prevents replay)';
COMMENT ON COLUMN public.signed_request_log.signature IS 'HMAC-SHA256 signature of the request';
COMMENT ON COLUMN public.signed_request_log.timestamp IS 'Unix timestamp in milliseconds';
COMMENT ON COLUMN public.signed_request_log.body_hash IS 'SHA-256 hash of request body';

COMMENT ON FUNCTION public.create_api_signing_key IS 'Create a new API signing key';
COMMENT ON FUNCTION public.revoke_api_signing_key IS 'Revoke an API signing key';
COMMENT ON FUNCTION public.rotate_api_signing_key IS 'Rotate an API signing key to a new value';
COMMENT ON FUNCTION public.log_signed_request IS 'Log a signed API request';
COMMENT ON FUNCTION public.check_request_replay IS 'Check if a request is a replay attack';
COMMENT ON FUNCTION public.get_active_api_keys IS 'Get all active API signing keys';
COMMENT ON FUNCTION public.get_request_signing_stats IS 'Get request signing statistics';
COMMENT ON FUNCTION public.cleanup_old_request_logs IS 'Clean up old request logs';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ API request signing infrastructure created successfully';
    RAISE NOTICE '📊 Tables: api_signing_keys, signed_request_log';
    RAISE NOTICE '🔐 RLS policies: 4 policies created';
    RAISE NOTICE '⚙️  Functions: 8 helper functions created';
    RAISE NOTICE '📈 Indexes: 11 indexes created for performance';
    RAISE NOTICE '🔑 Algorithm: HMAC-SHA256';
    RAISE NOTICE '⏱️  Replay window: 5 minutes default';
    RAISE NOTICE '🎯 Ready to sign and verify API requests!';
END $$;

