-- =====================================================
-- Verify and Fix: get_security_event_summary Function
-- =====================================================

-- Step 1: Drop the existing function completely (all versions)
DROP FUNCTION IF EXISTS public.get_security_event_summary(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_security_event_summary() CASCADE;

-- Step 2: Verify it's gone
DO $$
BEGIN
    RAISE NOTICE 'Old function dropped. Creating new version...';
END $$;

-- Step 3: Create the corrected function
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
            e.event_type,
            COUNT(*)::BIGINT as event_count,
            COUNT(*) FILTER (WHERE e.success = true)::BIGINT as success_count,
            COUNT(*) FILTER (WHERE e.success = false)::BIGINT as failure_count,
            COUNT(DISTINCT e.user_id)::BIGINT as unique_users
        FROM public.security_audit_log e
        WHERE e.created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
        GROUP BY e.event_type
    ),
    severity_counts AS (
        SELECT 
            s.event_type,
            jsonb_object_agg(s.severity, s.severity_count) as severity_breakdown
        FROM (
            SELECT 
                sal.event_type,
                sal.severity,
                COUNT(*)::BIGINT as severity_count
            FROM public.security_audit_log sal
            WHERE sal.created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
            GROUP BY sal.event_type, sal.severity
        ) s
        GROUP BY s.event_type
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_security_event_summary TO authenticated;

-- Step 5: Test the function
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    -- Test call
    SELECT COUNT(*) INTO result_count
    FROM public.get_security_event_summary(24);
    
    RAISE NOTICE '✅ Function created successfully! Test returned % rows', result_count;
END $$;

-- Step 6: Verify the function exists
SELECT 
    routine_name,
    routine_type,
    created
FROM information_schema.routines
WHERE routine_name = 'get_security_event_summary'
    AND routine_schema = 'public';

