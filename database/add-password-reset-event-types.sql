-- =====================================================
-- Add Password Reset Event Types to Security Audit Log
-- =====================================================
-- Description: Adds new password reset event types to the security_audit_log table constraint
-- Created: October 2025
-- Purpose: Support forgot password and reset password features
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.security_audit_log 
DROP CONSTRAINT IF EXISTS security_audit_log_event_type_check;

-- Recreate the constraint with the new event types
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

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Security audit log constraint updated successfully';
    RAISE NOTICE '📝 Added password reset event types:';
    RAISE NOTICE '   - auth.password_reset.requested';
    RAISE NOTICE '   - auth.password_reset.request_failed';
    RAISE NOTICE '   - auth.password_reset.completed';
    RAISE NOTICE '   - auth.password_reset.update_failed';
END $$;

