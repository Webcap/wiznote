-- =============================================================================
-- SECURITY FIX: SECURE EXPOSED ADMIN ACTIONS VIEW
-- =============================================================================
-- This script addresses the vulnerability where public.recent_admin_actions
-- exposes sensitive auth.users data to unauthorized roles.
-- =============================================================================

BEGIN;

-- 1. Secure the recent_admin_actions entity
DO $$
BEGIN
    -- Check if it's a regular view
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'recent_admin_actions') THEN
        -- Set security_invoker to true so it respects underlying RLS policies
        -- This ensures that users can only see rows they are permitted to see
        -- (e.g., admins can see all, users see limited, anon see none)
        ALTER VIEW public.recent_admin_actions SET (security_invoker = true);
        
        -- Explicitly revoke permissions from public roles to be safe
        -- PostgREST will only be able to access it if we grant it back specifically
        -- but usually we want to keep it accessible only to admins
        REVOKE ALL ON public.recent_admin_actions FROM anon;
        REVOKE ALL ON public.recent_admin_actions FROM authenticated;
        
        -- Grant access to authenticated users (RLS will filter the data)
        GRANT SELECT ON public.recent_admin_actions TO authenticated;
        
        RAISE NOTICE '✅ Secured view: public.recent_admin_actions (security_invoker enabled)';
        
    -- Check if it's a materialized view
    ELSIF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'recent_admin_actions') THEN
        -- Materialized views do not support Row-Level Security directly.
        -- The safest approach is to revoke all public access.
        REVOKE ALL ON public.recent_admin_actions FROM anon;
        REVOKE ALL ON public.recent_admin_actions FROM authenticated;
        
        -- If it needs to be accessed by admins, it should be done via a SECURITY DEFINER function
        -- or by granting to a specific admin role if using custom roles.
        
        RAISE NOTICE '⚠️  Secured materialized view: public.recent_admin_actions (Public access revoked)';
    ELSE
        RAISE NOTICE 'ℹ️  Entity public.recent_admin_actions not found in public schema.';
    END IF;
END $$;

-- 2. Final verification of security audit log RLS (the primary data source)
-- Ensure that it has the policy that only allows admins to view logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_audit_log') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'security_audit_log' 
            AND policyname = 'Admins can view all security audit logs'
        ) THEN
            RAISE WARNING '⚠️  Warning: Primary audit log table is missing the expected admin policy.';
        END IF;
    END IF;
END $$;

COMMIT;
