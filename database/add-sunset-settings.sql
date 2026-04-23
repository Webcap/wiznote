-- =============================================
-- Add Sunsetting Settings to System Settings
-- =============================================

-- Add sunset_mode_enabled and sunset_shutdown_date columns to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS sunset_mode_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sunset_shutdown_date TIMESTAMPTZ NOT NULL DEFAULT '2026-05-23 00:00:00+00';

-- Add comments
COMMENT ON COLUMN system_settings.sunset_mode_enabled IS 'Enable/disable platform-wide decommissioning (show notices, block new notes/signups)';
COMMENT ON COLUMN system_settings.sunset_shutdown_date IS 'Target date for final platform shutdown';

-- Update existing row to set default values
UPDATE system_settings
SET 
  sunset_mode_enabled = true,
  sunset_shutdown_date = '2026-05-23 00:00:00+00'
WHERE id = 'default';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sunsetting settings added to system_settings';
  RAISE NOTICE '  - sunset_mode_enabled: BOOLEAN (default: true)';
  RAISE NOTICE '  - sunset_shutdown_date: TIMESTAMPTZ (default: 2026-05-23)';
END $$;
