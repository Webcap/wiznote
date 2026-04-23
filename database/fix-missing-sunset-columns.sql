-- =============================================
-- Fix missing Sunsetting Columns in System Settings
-- =============================================

-- Add missing columns to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS landing_sunset_banner_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_header_title TEXT,
ADD COLUMN IF NOT EXISTS landing_header_subtitle TEXT,
ADD COLUMN IF NOT EXISTS login_header_title TEXT,
ADD COLUMN IF NOT EXISTS login_header_subtitle TEXT;

-- Add comments
COMMENT ON COLUMN system_settings.landing_sunset_banner_enabled IS 'Show a prominent sunsetting notice on the public landing page';
COMMENT ON COLUMN system_settings.landing_header_title IS 'Custom title for the landing page header';
COMMENT ON COLUMN system_settings.landing_header_subtitle IS 'Custom subtitle for the landing page header';
COMMENT ON COLUMN system_settings.login_header_title IS 'Custom title for the login page header';
COMMENT ON COLUMN system_settings.login_header_subtitle IS 'Custom subtitle for the login page header';

-- Update existing row to set default values for new columns
UPDATE system_settings
SET 
  landing_sunset_banner_enabled = true
WHERE id = 'default';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Missing sunsetting columns added to system_settings';
  RAISE NOTICE '  - landing_sunset_banner_enabled: BOOLEAN (default: true)';
END $$;
