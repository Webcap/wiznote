-- =============================================================================
-- CRITICAL SECURITY FIX: RESOLVE PUBLIC ACCESS AND DATA EXPOSURE
-- =============================================================================
-- This script addresses two critical security vulnerabilities:
-- 1. rls_disabled_in_public: Tables in the public schema missing RLS
-- 2. auth_users_exposed: View/Function exposing sensitive auth.users data
--
-- Instructions: Run this in the Supabase SQL Editor as a superuser (admin).
-- =============================================================================

BEGIN;

--------------------------------------------------------------------------------
-- 1. FIX: rls_disabled_in_public
-- Ensure Row-Level Security is ENABLED on all tables in 'public' schema
--------------------------------------------------------------------------------
DO $$
DECLARE
    row_record RECORD;
BEGIN
    FOR row_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', row_record.tablename);
        RAISE NOTICE '✅ Enabled Row-Level Security on table: public.%', row_record.tablename;
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 2. FIX: Administrative Table Lockdown
-- Ensure internal tables have strict policies if not already defined
--------------------------------------------------------------------------------

-- Table: email_notifications_queue (identified as missing RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_notifications_queue') THEN
        -- Enable RLS
        ALTER TABLE public.email_notifications_queue ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if any
        DROP POLICY IF EXISTS "Admins can manage the email queue" ON public.email_notifications_queue;
        
        -- Admin policy: Only admins can see and manage the email queue
        CREATE POLICY "Admins can manage the email queue"
          ON public.email_notifications_queue
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = 'admin'
            )
          );
        
        RAISE NOTICE '✅ Hardened security for: public.email_notifications_queue';
    ELSE
        RAISE NOTICE 'ℹ️ Table not found, skipping: public.email_notifications_queue';
    END IF;
END $$;

-- Table: user_deletion_audit
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_deletion_audit') THEN
        ALTER TABLE public.user_deletion_audit ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can view deletion audit" ON public.user_deletion_audit;
        
        CREATE POLICY "Admins can view deletion audit"
          ON public.user_deletion_audit
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.user_profiles
              WHERE user_profiles.id = auth.uid()
              AND user_profiles.role = 'admin'
            )
          );
        
        RAISE NOTICE '✅ Hardened security for: public.user_deletion_audit';
    ELSE
        RAISE NOTICE 'ℹ️ Table not found, skipping: public.user_deletion_audit';
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. FIX: auth_users_exposed
-- Refactor search_users_by_email_or_name to provide tiered access
--------------------------------------------------------------------------------

-- Helper Function to mask email addresses
CREATE OR REPLACE FUNCTION public.mask_email(email TEXT)
RETURNS TEXT AS $$
DECLARE
    parts TEXT[];
    local_part TEXT;
    domain_part TEXT;
BEGIN
    IF email IS NULL OR email NOT LIKE '%@%' THEN
        RETURN email;
    END IF;
    
    parts := string_to_array(email, '@');
    local_part := parts[1];
    domain_part := parts[2];
    
    -- Return first character followed by asterisks and the domain
    RETURN left(local_part, 1) || '***@' || domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Refactored Tiered Search Function
DROP FUNCTION IF EXISTS public.search_users_by_email_or_name(text);

CREATE OR REPLACE FUNCTION public.search_users_by_email_or_name(search_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  premium JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Elevated privileges to access auth.users
SET search_path = public
AS $$
DECLARE
  v_is_admin_or_support BOOLEAN;
BEGIN
  -- Check if caller is admin or support
  v_is_admin_or_support := EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'support')
  );

  RETURN QUERY
  SELECT 
    au.id,
    -- TIERED ACCESS:
    -- 1. Admins/Support see the full email
    -- 2. Users see the full email IF it's their own or an EXACT match (for sharing)
    -- 3. Otherwise, users see a MASKED email to prevent harvesting
    CASE 
      WHEN v_is_admin_or_support OR au.id = auth.uid() OR au.email = search_query THEN au.email::TEXT
      ELSE public.mask_email(au.email::TEXT)
    END as email,
    COALESCE(
      up.display_name,
      au.raw_user_meta_data->>'display_name',
      SPLIT_PART(au.email, '@', 1)
    )::TEXT as display_name,
    up.role::TEXT as role,
    up.premium as premium
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE 
    -- Search by email (exact or prefix) or display name
    (au.email ILIKE search_query || '%' OR au.email = search_query)
    OR up.display_name ILIKE '%' || search_query || '%'
    OR au.raw_user_meta_data->>'display_name' ILIKE '%' || search_query || '%'
  LIMIT 10;
END;
$$;

-- Ensure execution permissions are correct
GRANT EXECUTE ON FUNCTION public.search_users_by_email_or_name(TEXT) TO authenticated;

DO $$ BEGIN
    RAISE NOTICE '✅ Refactored: public.search_users_by_email_or_name (v3 Tiered Access)';
END $$;

--------------------------------------------------------------------------------
-- 4. FIX: security_definer_view
-- Ensure views run with the security context of the invoker, not the definer
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'enhanced_plans') THEN
        ALTER VIEW public.enhanced_plans SET (security_invoker = true);
        RAISE NOTICE '✅ Secured view: public.enhanced_plans (now uses security invoker).';
    ELSE
        RAISE NOTICE 'ℹ️ View not found locally, skipping: public.enhanced_plans';
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 5. FINAL VERIFICATION
--------------------------------------------------------------------------------
DO $$
DECLARE
    unsecured_count INTEGER;
BEGIN
    SELECT count(*) INTO unsecured_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false;
      
    IF unsecured_count = 0 THEN
        RAISE NOTICE '🎉 ALL TABLES SECURED! 0 unsecured tables remaining in public schema.';
    ELSE
        RAISE WARNING '⚠️  There are still % unsecured tables in the public schema.', unsecured_count;
    END IF;
END $$;

COMMIT;
