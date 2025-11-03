-- Migration: Add Google Sign-In Feature Flag
-- This adds the google_sign_in feature flag to the feature_flags table
-- Note: Google Sign-In also respects system_settings.google_sign_in_enabled
-- Both must be enabled for Google Sign-In to work

-- 1. Insert the google_sign_in feature flag
INSERT INTO feature_flags (
  id,
  name,
  description,
  enabled,
  rollout_percentage,
  target_environments,
  target_roles,
  target_users,
  premium_only,
  tracking_enabled,
  created_by,
  created_at,
  updated_at
) VALUES (
  'google_sign_in',
  'Google Sign-In',
  'Enable Google OAuth sign-in and sign-up functionality',
  true,                                                        -- enabled: true by default
  100,                                                         -- rollout_percentage: 100% rollout
  to_jsonb(ARRAY['development', 'staging', 'production']),    -- target_environments (cast to jsonb)
  NULL,                                                        -- target_roles: NULL (auth feature, checked before login)
  NULL,                                                        -- target_users: NULL (auth feature, checked before login)
  false,                                                       -- premium_only: false (available to all users)
  false,                                                       -- tracking_enabled: false (don't track authentication methods)
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
  target_roles = EXCLUDED.target_roles,
  target_users = EXCLUDED.target_users,
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
WHERE id = 'google_sign_in';

-- 3. Add comment
COMMENT ON TABLE feature_flags IS 'Feature flags for controlling application features. Updated to include google_sign_in feature.';

-- Note: To disable Google Sign-In completely, you can either:
-- 1. Set enabled = false in this feature flag, OR
-- 2. Set google_sign_in_enabled = false in system_settings table
-- Both checks are performed - if either is disabled, Google Sign-In will be disabled.
-- System settings take precedence (if disabled in system_settings, it's disabled regardless of feature flag).
--
-- IMPORTANT: This is an authentication feature, so target_roles and target_users are set to NULL.
-- The feature flag service will skip role/user targeting when checking this flag before authentication.
-- This allows the Google Sign-In button to be shown/hidden on login/signup screens even when users aren't signed in yet.

