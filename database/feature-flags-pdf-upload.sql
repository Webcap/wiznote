-- Migration: Add PDF Upload Feature Flag
-- This adds the pdf_upload feature flag to the feature_flags table

-- 1. Insert the pdf_upload feature flag
INSERT INTO feature_flags (
  id,
  name,
  description,
  enabled,
  rollout_percentage,
  target_environments,
  premium_only,
  tracking_enabled,
  created_by,
  created_at,
  updated_at
) VALUES (
  'pdf_upload',
  'PDF Upload',
  'Enable PDF document upload and text extraction functionality',
  true,                                                        -- enabled: true for testing
  100,                                                         -- rollout_percentage: 100% rollout
  to_jsonb(ARRAY['development', 'staging', 'production']),    -- target_environments (cast to jsonb)
  false,                                                       -- premium_only: false for testing (will be true in production)
  true,                                                        -- tracking_enabled: true to track usage
  'system',                                                    -- created_by: system
  NOW(),                                                       -- created_at
  NOW()                                                        -- updated_at
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  target_environments = EXCLUDED.target_environments,
  premium_only = EXCLUDED.premium_only,
  tracking_enabled = EXCLUDED.tracking_enabled,
  updated_at = NOW();

-- 2. Verify the insert
SELECT 
  id,
  name,
  enabled,
  premium_only,
  tracking_enabled
FROM feature_flags
WHERE id = 'pdf_upload';

-- 3. Add comment
COMMENT ON TABLE feature_flags IS 'Feature flags for controlling application features. Updated to include pdf_upload feature.';

