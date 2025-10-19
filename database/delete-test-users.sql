-- Delete all test users matching test.*@webcap.cc pattern
-- Run this in Supabase SQL Editor with caution!
--
-- WARNING: This will permanently delete auth users and cannot be undone!

BEGIN;

-- Step 1: Delete from auth.identities (blocks auth.users deletion)
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email ~ '^test\.\d+@webcap\.cc$'
);

-- Step 2: Delete from auth.users
DELETE FROM auth.users
WHERE email ~ '^test\.\d+@webcap\.cc$';

-- Show summary of what was deleted
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % test users matching pattern test.*@webcap.cc', deleted_count;
END $$;

COMMIT;

-- Verify deletion
SELECT 
  'Remaining test users:' as status,
  COUNT(*) as count
FROM auth.users
WHERE email ~ '^test\.\d+@webcap\.cc$';

