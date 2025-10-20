-- =====================================================
-- Quick Test Promotion
-- =====================================================
-- Run this after running promotions-setup.sql
-- This creates a test promotion that targets all users

-- First, verify the tables exist
SELECT 'Checking promotions table...' AS status;
SELECT COUNT(*) as promotion_count FROM public.promotions;

-- Create a test promotion
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
  is_active,
  modal_config,
  banner_config,
  inline_config
) VALUES (
  'Test Promotion - 30% Off Premium',
  'This is a test promotion to verify the system is working. Get 30% off your first month!',
  'percentage',
  30.00,
  NOW() - INTERVAL '1 hour',  -- Started 1 hour ago
  NOW() + INTERVAL '7 days',  -- Ends in 7 days
  '["modal", "banner", "inline"]'::jsonb,
  '["all"]'::jsonb,  -- Target everyone for testing
  1,  -- Max 1 redemption per user
  100,  -- High priority
  true,  -- Active
  '{"title": "Special Test Offer!", "buttonText": "Claim Test Offer", "showCountdown": true}'::jsonb,
  '{"position": "top", "backgroundColor": "#6A5ACD", "dismissible": true}'::jsonb,
  '{"variant": "card", "featured": true, "gradient": true}'::jsonb
)
RETURNING id, name, discount_value, is_active;

-- Verify the promotion was created
SELECT 
  id,
  name,
  discount_type,
  discount_value,
  is_active,
  start_date,
  end_date,
  target_segments,
  display_methods,
  priority
FROM public.promotions
ORDER BY created_at DESC
LIMIT 1;

-- Check if promotion is visible to users (RLS check)
SELECT 'Testing RLS policies...' AS status;
SELECT COUNT(*) as visible_promotions 
FROM public.promotions 
WHERE is_active = true 
  AND NOW() BETWEEN start_date AND end_date;

