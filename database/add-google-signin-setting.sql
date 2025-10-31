-- =============================================
-- Add Google Sign-In Toggle to System Settings
-- =============================================

-- Add google_sign_in_enabled column to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS google_sign_in_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN system_settings.google_sign_in_enabled IS 'Enable/disable Google Sign-In and Sign-Up for all users';

-- Update existing row to set default value
UPDATE system_settings
SET google_sign_in_enabled = true
WHERE id = 'default' AND google_sign_in_enabled IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Google Sign-In setting added to system_settings';
  RAISE NOTICE '  - google_sign_in_enabled: BOOLEAN (default: true)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Access admin dashboard to toggle: /admin-dashboard';
END $$;

