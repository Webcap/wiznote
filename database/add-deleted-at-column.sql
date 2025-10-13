-- Add deleted_at column to user_profiles table
-- This allows us to mark accounts as deleted without fully removing them from the database
-- Useful for audit trails and preventing re-registration with the same email

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on deleted accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at 
ON user_profiles(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN user_profiles.deleted_at IS 'Timestamp when the user account was marked as deleted. NULL means account is active.';

