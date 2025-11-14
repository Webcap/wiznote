-- =============================================
-- Verify google_sign_in_enabled Column Exists
-- =============================================
-- Run this in Supabase SQL Editor to check if the column exists
-- and what its current value is

-- Check if column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'system_settings'
  AND column_name = 'google_sign_in_enabled';

-- Get current value
SELECT 
  id,
  google_sign_in_enabled,
  pg_typeof(google_sign_in_enabled) as value_type,
  google_sign_in_enabled::text as value_as_text,
  CASE 
    WHEN google_sign_in_enabled = false THEN 'FALSE (boolean)'
    WHEN google_sign_in_enabled = true THEN 'TRUE (boolean)'
    WHEN google_sign_in_enabled IS NULL THEN 'NULL'
    ELSE 'OTHER: ' || google_sign_in_enabled::text
  END as value_description
FROM system_settings
WHERE id = 'default';

-- If column doesn't exist, run this to add it:
-- ALTER TABLE system_settings
-- ADD COLUMN IF NOT EXISTS google_sign_in_enabled BOOLEAN NOT NULL DEFAULT true;

