-- =====================================================
-- Premium Promotion System Database Schema
-- =====================================================
-- Creates tables for managing promotional campaigns with
-- Stripe integration, user segmentation, and interaction tracking

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Main promotions table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'special_price')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  -- Stripe integration
  stripe_coupon_id VARCHAR(255), -- Stripe coupon/promo code ID
  stripe_price_id VARCHAR(255), -- Alternative: discounted price ID
  
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Display configuration
  display_methods JSONB DEFAULT '["modal", "banner", "inline"]'::jsonb,
  modal_config JSONB DEFAULT '{}'::jsonb, -- Modal popup settings
  banner_config JSONB DEFAULT '{}'::jsonb, -- Banner settings
  inline_config JSONB DEFAULT '{}'::jsonb, -- In-page promotion settings
  
  -- Targeting
  target_segments JSONB DEFAULT '["all"]'::jsonb, -- ['new_users', 'free_users', 'near_limit', 'inactive', 'churned']
  target_conditions JSONB DEFAULT '{}'::jsonb, -- Additional targeting rules
  
  -- Usage limits
  max_redemptions INTEGER, -- NULL = unlimited
  current_redemptions INTEGER DEFAULT 0,
  max_per_user INTEGER DEFAULT 1,
  
  -- Priority (higher = shown first)
  priority INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- Promotion interactions tracking table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.promotion_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'viewed', 'dismissed', 'clicked', 'redeemed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Note: Removed UNIQUE constraint to allow multiple views/clicks over time
-- Only redemptions should be limited via application logic

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_promotions_active 
  ON public.promotions(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_promotions_priority 
  ON public.promotions(priority DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_dates 
  ON public.promotions(start_date, end_date) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promotion_interactions_user 
  ON public.promotion_interactions(user_id, promotion_id);

CREATE INDEX IF NOT EXISTS idx_promotion_interactions_action 
  ON public.promotion_interactions(promotion_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_promotion_interactions_user_action 
  ON public.promotion_interactions(user_id, action, created_at);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_interactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Users can view active promotions" ON public.promotions;
DROP POLICY IF EXISTS "Users can view own interactions" ON public.promotion_interactions;
DROP POLICY IF EXISTS "Users can create own interactions" ON public.promotion_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.promotion_interactions;
DROP POLICY IF EXISTS "Admins can manage interactions" ON public.promotion_interactions;

-- Admin can manage all promotions
CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Users can view active promotions (within date range)
CREATE POLICY "Users can view active promotions" ON public.promotions
  FOR SELECT USING (
    is_active = true 
    AND NOW() BETWEEN start_date AND end_date
  );

-- Users can view their own interactions
CREATE POLICY "Users can view own interactions" ON public.promotion_interactions
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own interactions
CREATE POLICY "Users can create own interactions" ON public.promotion_interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all interactions
CREATE POLICY "Admins can view all interactions" ON public.promotion_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Admins can manage all interactions (for cleanup/moderation)
CREATE POLICY "Admins can manage interactions" ON public.promotion_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS promotions_updated_at_trigger ON public.promotions;
CREATE TRIGGER promotions_updated_at_trigger
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Function to get active promotions for a user segment
CREATE OR REPLACE FUNCTION get_active_promotions_for_segment(segment_name TEXT)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  description TEXT,
  discount_type VARCHAR,
  discount_value DECIMAL,
  stripe_coupon_id VARCHAR,
  stripe_price_id VARCHAR,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  display_methods JSONB,
  modal_config JSONB,
  banner_config JSONB,
  inline_config JSONB,
  max_per_user INTEGER,
  priority INTEGER,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.discount_type,
    p.discount_value,
    p.stripe_coupon_id,
    p.stripe_price_id,
    p.start_date,
    p.end_date,
    p.display_methods,
    p.modal_config,
    p.banner_config,
    p.inline_config,
    p.max_per_user,
    p.priority,
    p.metadata
  FROM public.promotions p
  WHERE 
    p.is_active = true
    AND NOW() BETWEEN p.start_date AND p.end_date
    AND (
      p.target_segments @> jsonb_build_array(segment_name)
      OR p.target_segments @> '["all"]'::jsonb
    )
    AND (p.max_redemptions IS NULL OR p.current_redemptions < p.max_redemptions)
  ORDER BY p.priority DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has redeemed a promotion
CREATE OR REPLACE FUNCTION has_user_redeemed_promotion(promo_id UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  redemption_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get max redemptions per user for this promotion
  SELECT max_per_user INTO max_allowed
  FROM public.promotions
  WHERE id = promo_id;
  
  -- Count user's redemptions
  SELECT COUNT(*) INTO redemption_count
  FROM public.promotion_interactions
  WHERE promotion_id = promo_id 
    AND user_id = user_uuid 
    AND action = 'redeemed';
  
  RETURN redemption_count >= max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.promotions IS 'Stores premium subscription promotional campaigns with Stripe integration';
COMMENT ON TABLE public.promotion_interactions IS 'Tracks user interactions with promotions (views, clicks, redemptions)';

COMMENT ON COLUMN public.promotions.discount_type IS 'Type of discount: percentage, fixed_amount, or special_price';
COMMENT ON COLUMN public.promotions.stripe_coupon_id IS 'Stripe coupon ID for percentage or fixed discounts';
COMMENT ON COLUMN public.promotions.stripe_price_id IS 'Alternative Stripe price ID for special pricing';
COMMENT ON COLUMN public.promotions.display_methods IS 'Array of display methods: modal, banner, inline';
COMMENT ON COLUMN public.promotions.target_segments IS 'User segments to target: all, new_users, free_users, near_limit, inactive, churned';
COMMENT ON COLUMN public.promotions.max_redemptions IS 'Maximum total redemptions (NULL = unlimited)';
COMMENT ON COLUMN public.promotions.max_per_user IS 'Maximum redemptions per user';
COMMENT ON COLUMN public.promotions.priority IS 'Display priority (higher shown first)';

-- =====================================================
-- Sample data (optional, for testing)
-- =====================================================
-- Uncomment to insert sample promotion:
/*
INSERT INTO public.promotions (
  name,
  description,
  discount_type,
  discount_value,
  start_date,
  end_date,
  display_methods,
  target_segments,
  max_per_user,
  priority,
  metadata
) VALUES (
  'New Year Special - 30% Off',
  'Start the new year with premium features at 30% off!',
  'percentage',
  30.00,
  NOW(),
  NOW() + INTERVAL '30 days',
  '["modal", "banner", "inline"]'::jsonb,
  '["all"]'::jsonb,
  1,
  100,
  '{"campaign": "new_year_2025", "theme": "celebration"}'::jsonb
);
*/

