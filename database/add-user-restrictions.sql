-- =============================================================================
-- USER RESTRICTIONS AND AI RATE LIMITING SETUP
-- =============================================================================
-- This script adds fields to user_profiles to support per-user restrictions
-- and custom usage multipliers for AI features.
-- =============================================================================

-- Step 1: Add restriction-related columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restriction_reason TEXT,
ADD COLUMN IF NOT EXISTS custom_ai_limit_multiplier NUMERIC DEFAULT 1.0;

-- Create index for faster filtering of restricted users
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_restricted ON user_profiles(is_restricted) WHERE is_restricted = TRUE;

-- Step 2: Add comments for clarity
COMMENT ON COLUMN user_profiles.is_restricted IS 'Flag to indicate if the user is currently restricted or rate-limited';
COMMENT ON COLUMN user_profiles.restriction_reason IS 'Context or reason why a user has been restricted';
COMMENT ON COLUMN user_profiles.custom_ai_limit_multiplier IS 'Multiplier applied to the user''s AI usage limits (e.g., 0.5 reduces limits by half)';

-- Step 3: Verify the setup
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'User Restrictions Setup Complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Columns added: is_restricted, restriction_reason, custom_ai_limit_multiplier';
  RAISE NOTICE 'Index created: idx_user_profiles_is_restricted';
  RAISE NOTICE '';
END $$;
