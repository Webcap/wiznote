-- DIRECT FIX: Allow anonymous users to insert their own profile during signup
-- This is the simplest solution - just fix the RLS policy

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow signup profile creation" ON user_profiles;

-- Create new policy that allows BOTH authenticated AND anonymous users to insert
-- Anonymous users need this during the signup process before they're fully authenticated
CREATE POLICY "Allow signup profile creation"
  ON user_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    auth.uid() = id
  );

-- Ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed RLS policies for signup';
  RAISE NOTICE '  - Anonymous users can now create profiles during signup';
  RAISE NOTICE '  - This allows the signup flow to complete successfully';
END $$;

