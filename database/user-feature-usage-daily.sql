-- =============================================
-- Create daily usage tracking table
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_feature_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure we only have one row per user/feature/day
    UNIQUE (user_id, feature_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.user_feature_usage_daily ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for viewing
CREATE POLICY "Users can view their own usage history" 
    ON public.user_feature_usage_daily FOR SELECT 
    USING (auth.uid() = user_id);

-- Add RLS policy for admins/support
CREATE POLICY "Admins/Support can view all usage history"
    ON public.user_feature_usage_daily FOR SELECT
    USING (public.get_user_role(auth.uid()) IN ('admin', 'support'));

-- Add index for performance in 30-day queries
CREATE INDEX IF NOT EXISTS idx_usage_daily_lookup 
    ON public.user_feature_usage_daily (user_id, usage_date);
