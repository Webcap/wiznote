# Password Reset Event Types Migration

## Problem
The security audit log is rejecting password reset events because the event types are not in the allowed constraint list.

Error:
```
new row for relation "security_audit_log" violates check constraint "security_audit_log_event_type_check"
```

## Solution
Run the SQL migration to add the missing event types.

## Steps to Apply

1. **Go to your Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Navigate to your WizNote project
   - Click on "SQL Editor" in the left sidebar

2. **Create a new query**
   - Click "New Query"

3. **Copy and paste the following SQL:**

```sql
-- =====================================================
-- Add Password Reset Event Types to Security Audit Log
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.security_audit_log 
DROP CONSTRAINT IF EXISTS security_audit_log_event_type_check;

-- Recreate the constraint with ALL event types including the new ones
ALTER TABLE public.security_audit_log
ADD CONSTRAINT security_audit_log_event_type_check CHECK (event_type IN (
    -- Authentication events
    'auth.login.success',
    'auth.login.failure',
    'auth.logout',
    'auth.signup.success',
    'auth.signup.failure',
    'auth.password_reset.request',
    'auth.password_reset.requested',
    'auth.password_reset.request_failed',
    'auth.password_reset.success',
    'auth.password_reset.completed',
    'auth.password_reset.failure',
    'auth.password_reset.update_failed',
    'auth.email_verification.success',
    'auth.email_verification.failure',
    'auth.mfa.enabled',
    'auth.mfa.disabled',
    'auth.mfa.success',
    'auth.mfa.failure',
    'auth.session.expired',
    'auth.session.revoked',
    
    -- Account security events
    'account.lockout',
    'account.unlock',
    'account.deleted',
    'account.suspended',
    'account.reactivated',
    
    -- Admin & privilege events
    'admin.role.granted',
    'admin.role.revoked',
    'admin.action.user_management',
    'admin.action.system_settings',
    'admin.action.premium_grant',
    'admin.action.support_ticket',
    'admin.privilege.escalation',
    
    -- Data access events
    'data.note.created',
    'data.note.updated',
    'data.note.deleted',
    'data.note.shared',
    'data.note.accessed',
    'data.export.requested',
    'data.export.completed',
    
    -- API & security events
    'api.rate_limit.exceeded',
    'api.rate_limit.warning',
    'api.error.unauthorized',
    'api.error.forbidden',
    'api.error.server',
    'csrf.validation.success',
    'csrf.validation.failure',
    'csrf.token.generated',
    'csrf.token.expired',
    
    -- Suspicious activity
    'security.suspicious.multiple_failed_logins',
    'security.suspicious.unusual_location',
    'security.suspicious.unusual_time',
    'security.suspicious.sql_injection_attempt',
    'security.suspicious.xss_attempt',
    'security.suspicious.path_traversal_attempt',
    
    -- System events
    'system.settings.updated',
    'system.backup.created',
    'system.maintenance.started',
    'system.maintenance.completed'
));
```

4. **Click "Run" or press Ctrl+Enter**

5. **Verify the migration succeeded**
   - You should see a success message
   - The constraint will now accept the new password reset event types

## What This Fixes

After running this migration, the security logging will work properly for:
- ✅ `auth.password_reset.requested` - When a user requests a password reset
- ✅ `auth.password_reset.request_failed` - When the request fails
- ✅ `auth.password_reset.completed` - When password is successfully updated
- ✅ `auth.password_reset.update_failed` - When password update fails

## Verification

After applying the migration:
1. Try the forgot password feature again
2. Check the browser console - you should no longer see the constraint violation errors
3. The security events should now be logged successfully in the `security_audit_log` table

---

**File Location:** `database/add-password-reset-event-types.sql` (same SQL as above)

