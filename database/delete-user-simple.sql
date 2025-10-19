-- Simple user deletion by ID
-- Replace bb058de1-df9d-4a11-9f4a-2297b4882ade with the actual user ID and run in Supabase SQL Editor

-- Delete all user data
DELETE FROM notes WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM quizzes WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM quiz_attempts WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM support_tickets WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM support_ticket_messages WHERE sender_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM user_sessions WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM account_lockouts WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM feature_usage WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade'::text;
DELETE FROM note_shares WHERE owner_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM user_profiles WHERE id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';

-- Clean up security logs (SET NULL instead of delete to preserve audit trail)
UPDATE security_audit_log SET user_id = NULL WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
UPDATE security_audit_log SET target_user_id = NULL WHERE target_user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';

-- Delete from auth schema
DELETE FROM auth.identities WHERE user_id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';
DELETE FROM auth.users WHERE id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ User deleted successfully'
    ELSE '❌ User still exists'
  END as status
FROM auth.users
WHERE id = 'bb058de1-df9d-4a11-9f4a-2297b4882ade';

