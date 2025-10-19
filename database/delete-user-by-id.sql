-- Delete a user by user ID
-- Run this in Supabase SQL Editor
--
-- USAGE: Replace 'ea5a030b-38ff-4732-a760-4eb1a4bcb0c1' with the actual user ID
--
-- WARNING: This will permanently delete the user and cannot be undone!

BEGIN;

-- Set the user ID to delete
DO $$
DECLARE
  target_user_id UUID := 'ea5a030b-38ff-4732-a760-4eb1a4bcb0c1'; -- Replace with actual user ID
  user_email TEXT;
  deleted_notes INTEGER;
  deleted_profiles INTEGER;
BEGIN
  -- Get user email for logging
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  
  IF user_email IS NULL THEN
    RAISE NOTICE 'User not found with ID: %', target_user_id;
  ELSE
    RAISE NOTICE 'Deleting user: % (ID: %)', user_email, target_user_id;
    
    -- Step 1: Delete from public schema tables
    RAISE NOTICE 'Step 1: Deleting related data from public schema...';
    
    DELETE FROM notes WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_notes = ROW_COUNT;
    RAISE NOTICE '  - Deleted % notes', deleted_notes;
    
    DELETE FROM quizzes WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted quizzes';
    
    DELETE FROM quiz_attempts WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted quiz attempts';
    
    DELETE FROM support_tickets WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted support tickets';
    
    DELETE FROM support_ticket_messages WHERE sender_id = target_user_id;
    RAISE NOTICE '  - Deleted support ticket messages';
    
    DELETE FROM user_sessions WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted user sessions';
    
    DELETE FROM account_lockouts WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted account lockouts';
    
    DELETE FROM feature_usage WHERE user_id = target_user_id::text;
    RAISE NOTICE '  - Deleted feature usage';
    
    DELETE FROM note_shares WHERE owner_id = target_user_id;
    RAISE NOTICE '  - Deleted note shares';
    
    -- Delete from tables that reference user as foreign key with SET NULL
    UPDATE security_audit_log SET user_id = NULL WHERE user_id = target_user_id;
    UPDATE security_audit_log SET target_user_id = NULL WHERE target_user_id = target_user_id;
    RAISE NOTICE '  - Cleaned security audit log';
    
    DELETE FROM user_profiles WHERE id = target_user_id;
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;
    RAISE NOTICE '  - Deleted % user profiles', deleted_profiles;
    
    -- Step 2: Delete from auth.identities
    RAISE NOTICE 'Step 2: Deleting from auth.identities...';
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    RAISE NOTICE '  - Deleted auth identities';
    
    -- Step 3: Delete from auth.users
    RAISE NOTICE 'Step 3: Deleting from auth.users...';
    DELETE FROM auth.users WHERE id = target_user_id;
    RAISE NOTICE '  - Deleted auth user';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ User deletion completed successfully!';
    RAISE NOTICE 'Deleted user: % (ID: %)', user_email, target_user_id;
  END IF;
END $$;

COMMIT;

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User successfully deleted'
    ELSE '❌ User still exists'
  END as status
FROM auth.users
WHERE id = 'ea5a030b-38ff-4732-a760-4eb1a4bcb0c1'; -- Replace with the same user ID

