-- Admin Account Management Queries
-- Use these to view, verify, and manage @wiznote.app admin accounts

-- ============================================
-- VIEW ALL ADMIN ACCOUNTS
-- ============================================

-- Query 1: View all admin accounts with verification status
SELECT 
  up.id as user_id,
  up.email,
  up.display_name,
  up.role,
  up.created_at as account_created,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Verified'
    ELSE '⚠️  Unverified'
  END as verification_status,
  CASE 
    WHEN up.email LIKE '%@wiznote.app' THEN '✅ Official Domain'
    ELSE '❌ Non-official'
  END as domain_status,
  up.updated_at as last_updated
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;

-- ============================================
-- VIEW UNVERIFIED ADMIN ACCOUNTS
-- ============================================

-- Query 2: Find admin accounts that need email verification
SELECT 
  up.id as user_id,
  up.email,
  up.display_name,
  up.created_at,
  (NOW() - up.created_at) as account_age,
  CASE 
    WHEN (NOW() - up.created_at) > INTERVAL '24 hours' THEN '🔴 Overdue'
    WHEN (NOW() - up.created_at) > INTERVAL '1 hour' THEN '🟡 Pending'
    ELSE '🟢 Recent'
  END as urgency
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
  AND au.email_confirmed_at IS NULL
ORDER BY up.created_at DESC;

-- ============================================
-- VIEW ADMIN ACCOUNT CREATION HISTORY
-- ============================================

-- Query 3: View admin account creation events from security log
SELECT 
  created_at,
  user_email,
  event_data->>'assigned_by' as assigned_by,
  event_data->>'reason' as reason,
  event_data->>'domain' as domain,
  event_data->>'is_official_domain' as is_official_domain,
  ip_address,
  success
FROM security_audit_log
WHERE event_type = 'admin.role.granted'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- VERIFY ADMIN ACCOUNT
-- ============================================

-- Query 4: Manually verify an admin account (if email verification fails)
-- Replace 'user-id-here' with actual user ID
-- UNCOMMENT to use:
/*
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'user-id-here'
  AND email LIKE '%@wiznote.app';
*/

-- ============================================
-- REVOKE ADMIN ROLE
-- ============================================

-- Query 5: Revoke admin role from unauthorized account
-- Replace 'user-id-here' with actual user ID
-- UNCOMMENT to use:
/*
UPDATE user_profiles
SET role = 'user',
    permissions = jsonb_build_object(
      'canAccessAdmin', false,
      'canManageUsers', false,
      'canManageContent', false,
      'canViewAnalytics', false,
      'canManageSettings', false
    ),
    updated_at = NOW()
WHERE id = 'user-id-here'
  AND role = 'admin';

-- Log the revocation
INSERT INTO security_audit_log (
  event_type,
  severity,
  user_id,
  user_email,
  event_data,
  success
)
SELECT 
  'admin.role.revoked',
  'critical',
  up.id,
  up.email,
  jsonb_build_object(
    'revoked_by', 'manual_intervention',
    'reason', 'Unauthorized admin access',
    'previous_role', 'admin'
  ),
  true
FROM user_profiles up
WHERE up.id = 'user-id-here';
*/

-- ============================================
-- COUNT ADMIN ACCOUNTS BY STATUS
-- ============================================

-- Query 6: Summary of admin accounts
SELECT 
  COUNT(*) FILTER (WHERE au.email_confirmed_at IS NOT NULL) as verified_admins,
  COUNT(*) FILTER (WHERE au.email_confirmed_at IS NULL) as unverified_admins,
  COUNT(*) FILTER (WHERE up.email LIKE '%@wiznote.app') as official_domain_admins,
  COUNT(*) FILTER (WHERE up.email NOT LIKE '%@wiznote.app') as non_official_domain_admins,
  COUNT(*) as total_admins
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin';

-- ============================================
-- FIND SUSPICIOUS ADMIN ACCOUNTS
-- ============================================

-- Query 7: Find admin accounts that might be unauthorized
SELECT 
  up.id,
  up.email,
  up.display_name,
  up.created_at,
  au.email_confirmed_at,
  CASE 
    WHEN up.email NOT LIKE '%@wiznote.app' THEN '🔴 Non-official domain'
    WHEN au.email_confirmed_at IS NULL THEN '🟡 Unverified'
    ELSE '✅ OK'
  END as alert_level,
  ARRAY_AGG(DISTINCT sal.event_type) FILTER (WHERE sal.event_type IS NOT NULL) as recent_events
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
LEFT JOIN security_audit_log sal ON sal.user_id = up.id 
  AND sal.created_at > NOW() - INTERVAL '7 days'
WHERE up.role = 'admin'
GROUP BY up.id, up.email, up.display_name, up.created_at, au.email_confirmed_at
HAVING 
  up.email NOT LIKE '%@wiznote.app'
  OR au.email_confirmed_at IS NULL
ORDER BY 
  CASE 
    WHEN up.email NOT LIKE '%@wiznote.app' THEN 1
    WHEN au.email_confirmed_at IS NULL THEN 2
    ELSE 3
  END,
  up.created_at DESC;

-- ============================================
-- ADMIN ACCOUNT ACTIVITY LOG
-- ============================================

-- Query 8: View recent admin actions
SELECT 
  sal.created_at,
  sal.event_type,
  sal.user_email,
  sal.target_user_email,
  sal.event_data->>'action' as action,
  sal.event_data->>'reason' as reason,
  sal.ip_address,
  sal.success
FROM security_audit_log sal
JOIN user_profiles up ON up.id = sal.user_id
WHERE up.role = 'admin'
  AND sal.event_type LIKE 'admin.%'
  AND sal.created_at > NOW() - INTERVAL '30 days'
ORDER BY sal.created_at DESC
LIMIT 100;

-- ============================================
-- SEND EMAIL REMINDER FOR UNVERIFIED ADMINS
-- ============================================

-- Query 9: Get list of unverified admins for email reminders
SELECT 
  up.email,
  up.display_name,
  up.created_at,
  (NOW() - up.created_at) as time_since_creation,
  au.confirmation_sent_at,
  CASE 
    WHEN au.confirmation_sent_at IS NULL THEN 'Never sent'
    ELSE (NOW() - au.confirmation_sent_at)::text
  END as time_since_last_email
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
  AND up.email LIKE '%@wiznote.app'
  AND au.email_confirmed_at IS NULL
  AND (NOW() - up.created_at) > INTERVAL '1 hour' -- Don't spam immediately
ORDER BY up.created_at;

-- ============================================
-- CLEANUP: REMOVE OLD UNVERIFIED ADMIN ACCOUNTS
-- ============================================

-- Query 10: Find old unverified admin accounts (90+ days)
-- These might be test accounts or abandoned signups
SELECT 
  up.id,
  up.email,
  up.created_at,
  (NOW() - up.created_at) as account_age
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
  AND au.email_confirmed_at IS NULL
  AND (NOW() - up.created_at) > INTERVAL '90 days'
ORDER BY up.created_at;

-- UNCOMMENT to delete old unverified accounts:
/*
-- Delete from auth first (cascades to user_profiles if set up correctly)
DELETE FROM auth.users
WHERE id IN (
  SELECT up.id
  FROM user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  WHERE up.role = 'admin'
    AND au.email_confirmed_at IS NULL
    AND (NOW() - up.created_at) > INTERVAL '90 days'
)
RETURNING id, email;
*/

