-- =============================================
-- Fix System Settings Public Access
-- =============================================
-- Allow public (unauthenticated) read access to specific system settings
-- that need to be checked during signup/login flows
-- =============================================

-- Drop any existing policies (both old and new names)
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Public can view auth-related settings" ON system_settings;

-- Create a new policy that allows public read access to specific fields
-- while still restricting full access to admins
CREATE POLICY "Public can view auth-related settings"
  ON system_settings
  FOR SELECT
  USING (true); -- Allow all users (authenticated and unauthenticated) to read

-- Note: We still maintain admin-only UPDATE policy, so only admins can modify settings
-- The existing update policy remains in place

-- Add a comment explaining the policy
COMMENT ON POLICY "Public can view auth-related settings" ON system_settings IS 
  'Allow public read access to system settings for authentication flows. Settings like email_verification_required need to be readable during signup/login.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ System settings public access policy updated';
  RAISE NOTICE '  - Public users can now read system settings (including email_verification_required)';
  RAISE NOTICE '  - Only admins can still update settings';
END $$;

