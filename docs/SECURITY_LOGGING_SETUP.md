# Security Logging Setup Guide

**Last Updated**: October 2025  
**Status**: ✅ **COMPLETE** - Fully implemented and tested  
**Priority**: Priority 2.3 - High Priority

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Database Schema](#database-schema)
6. [Service API](#service-api)
7. [Integration Examples](#integration-examples)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Maintenance](#maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Security Logging system provides comprehensive audit logging for all security-related events in WizNote. It tracks authentication attempts, admin actions, data access, suspicious activities, and API errors to enable security monitoring, forensics, and compliance.

### Key Benefits

- **Security Monitoring**: Real-time tracking of all security events
- **Forensics**: Complete audit trail for incident investigation
- **Compliance**: GDPR and security compliance requirements
- **Anomaly Detection**: Automatic detection of suspicious patterns
- **Admin Visibility**: Dashboard-ready event summaries

### Event Categories

- **Authentication Events**: Login, logout, sign-up, password reset, MFA, email verification
- **Account Security**: Account lockout, suspension, deletion
- **Admin Actions**: Role changes, user management, system settings
- **Data Access**: Note creation, updates, deletion, sharing, export
- **API Security**: Rate limiting, errors, CSRF validation
- **Suspicious Activity**: Failed logins, injection attempts, unusual patterns
- **System Events**: Settings changes, backups, maintenance

---

## Features

### ✅ Core Features

1. **Comprehensive Event Logging**
   - 40+ predefined event types covering all security scenarios
   - Structured event data with JSON support for flexibility
   - Severity levels: info, warning, error, critical
   - Success/failure tracking

2. **Rich Context Capture**
   - User information (ID, email, role)
   - Target user for admin actions
   - Request context (IP, user agent, path, method)
   - Custom event data (JSON)
   - Geolocation support (optional)
   - Platform tracking (web, iOS, Android)

3. **Advanced Query Capabilities**
   - Get recent failed login attempts
   - Detect suspicious activity patterns
   - Security event summaries for dashboards
   - Cleanup old logs with retention policy
   - Filtered queries by user, event type, severity

4. **Security & Performance**
   - Row Level Security (RLS) policies
   - Admin-only access to full audit logs
   - Users can view their own events (limited)
   - Optimized indexes for fast queries
   - Automatic retry queue for failed logs
   - Non-blocking async logging

5. **Integration Ready**
   - Helper functions in `lib/auth.ts`
   - Integrated into BetterAuthService
   - Ready for admin operations
   - Simple API for custom events

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  BetterAuthService │ AdminService │ Custom Components       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─────────────────────────────────┐
               │                                 │
         ┌─────▼──────┐                  ┌──────▼─────┐
         │ lib/auth.ts│                  │   Direct   │
         │  (Helpers) │                  │   Service  │
         └─────┬──────┘                  └──────┬─────┘
               │                                 │
         ┌─────▼─────────────────────────────────▼─────┐
         │      SecurityLoggingService                  │
         │  - Event validation                          │
         │  - Context enrichment                        │
         │  - Retry queue                               │
         │  - Performance optimization                  │
         └─────┬────────────────────────────────────────┘
               │
         ┌─────▼──────┐
         │  Supabase   │
         │   RPC Call  │
         └─────┬──────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│                    Database Layer                             │
├───────────────────────────────────────────────────────────────┤
│  • security_audit_log table                                   │
│  • log_security_event() function                              │
│  • get_recent_failed_logins() function                        │
│  • detect_suspicious_activity() function                      │
│  • get_security_event_summary() function                      │
│  • cleanup_old_security_logs() function                       │
│  • RLS policies                                               │
│  • Performance indexes                                        │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Event Occurs**: User action triggers security event (login, admin action, etc.)
2. **Helper Called**: Application calls helper function from `lib/auth.ts`
3. **Service Processing**: SecurityLoggingService enriches context and validates
4. **Database Storage**: Event logged via RPC function with full context
5. **Query & Analysis**: Admin dashboards query for monitoring and analytics

---

## Installation

### Step 1: Run Database Setup

Execute the SQL setup script in your Supabase SQL editor:

```bash
# Copy the SQL file to your clipboard
cat database/security-logging-setup.sql

# Or run directly if you have psql access
psql $DATABASE_URL < database/security-logging-setup.sql
```

This creates:
- `security_audit_log` table
- 5 helper functions
- RLS policies
- Performance indexes

### Step 2: Verify Installation

Run the test script to ensure everything is working:

```bash
npm run test:security-logging
# or
node scripts/test-security-logging.js
```

Expected output: All 15 tests should pass ✅

### Step 3: Integration

The service is already integrated into:
- ✅ `BetterAuthService` for authentication events
- ✅ `lib/auth.ts` with helper functions

For additional integrations, see [Integration Examples](#integration-examples).

---

## Database Schema

### security_audit_log Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `created_at` | TIMESTAMPTZ | Event timestamp |
| `event_type` | TEXT | Event type (e.g., 'auth.login.success') |
| `severity` | TEXT | Severity: info, warning, error, critical |
| `user_id` | UUID | User who performed the action |
| `user_email` | TEXT | User's email address |
| `user_role` | TEXT | User's role at time of event |
| `target_user_id` | UUID | Target user (for admin actions) |
| `target_user_email` | TEXT | Target user's email |
| `ip_address` | INET | IP address of request |
| `user_agent` | TEXT | Browser/device user agent |
| `request_path` | TEXT | Request path |
| `request_method` | TEXT | HTTP method (GET, POST, etc.) |
| `event_data` | JSONB | Additional event details |
| `error_message` | TEXT | Error message (if applicable) |
| `location_country` | TEXT | Country (optional) |
| `location_city` | TEXT | City (optional) |
| `success` | BOOLEAN | Whether event succeeded |
| `metadata` | JSONB | Additional metadata |

### Indexes

- `idx_security_audit_log_created_at` - Query by time
- `idx_security_audit_log_user_id` - Query by user
- `idx_security_audit_log_event_type` - Query by event type
- `idx_security_audit_log_severity` - Query by severity
- `idx_security_audit_log_ip_address` - Query by IP
- `idx_security_audit_log_success` - Filter by success
- `idx_security_audit_log_user_created` - User + time composite
- `idx_security_audit_log_event_created` - Event + time composite
- `idx_security_audit_log_severity_created` - Severity + time composite
- `idx_security_audit_log_failed_auth` - Failed auth detection

---

## Service API

### SecurityLoggingService

#### Core Methods

##### logEvent()

```typescript
await securityLoggingService.logEvent(
  eventType: SecurityEventType,
  options?: {
    severity?: 'info' | 'warning' | 'error' | 'critical';
    success?: boolean;
    context?: {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      targetUserId?: string;
      targetUserEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      requestPath?: string;
      requestMethod?: string;
    };
    eventData?: Record<string, any>;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null>
```

##### logAuthEvent()

```typescript
await securityLoggingService.logAuthEvent(
  eventType: 'auth.login.success' | 'auth.login.failure' | ...,
  userId: string | undefined,
  userEmail: string,
  success: boolean,
  errorMessage?: string,
  additionalData?: Record<string, any>
): Promise<void>
```

##### logAdminAction()

```typescript
await securityLoggingService.logAdminAction(
  action: 'admin.role.granted' | 'admin.action.user_management' | ...,
  adminUserId: string,
  adminEmail: string,
  targetUserId?: string,
  targetUserEmail?: string,
  actionDetails?: Record<string, any>
): Promise<void>
```

##### logDataAccess()

```typescript
await securityLoggingService.logDataAccess(
  eventType: 'data.note.created' | 'data.note.updated' | ...,
  userId: string,
  resourceId: string,
  resourceType: string,
  additionalData?: Record<string, any>
): Promise<void>
```

##### logSuspiciousActivity()

```typescript
await securityLoggingService.logSuspiciousActivity(
  activityType: 'security.suspicious.multiple_failed_logins' | ...,
  userId: string | undefined,
  userEmail: string | undefined,
  details: Record<string, any>
): Promise<void>
```

#### Query Methods

##### getRecentFailedLogins()

```typescript
const result = await securityLoggingService.getRecentFailedLogins(
  userEmail: string,
  timeWindowMinutes: number = 15
): Promise<{
  attemptCount: number;
  lastAttempt: Date | null;
  ipAddresses: string[];
}>
```

##### detectSuspiciousActivity()

```typescript
const patterns = await securityLoggingService.detectSuspiciousActivity(
  userId: string,
  timeWindowHours: number = 24
): Promise<Array<{
  pattern: string;
  eventCount: number;
  severity: SecurityEventSeverity;
  details: Record<string, any>;
}>>
```

##### getSecurityEventSummary()

```typescript
const summary = await securityLoggingService.getSecurityEventSummary(
  timeWindowHours: number = 24
): Promise<Array<{
  eventType: SecurityEventType;
  eventCount: number;
  successCount: number;
  failureCount: number;
  uniqueUsers: number;
  severityBreakdown: Record<SecurityEventSeverity, number>;
}>>
```

### Helper Functions (lib/auth.ts)

All service methods are available as helper functions:

```typescript
import {
  logAuthEvent,
  logAdminAction,
  logDataAccess,
  logSuspiciousActivity,
  logApiError,
  logRateLimitEvent,
  logSystemSettingsChange,
  getRecentFailedLogins,
  detectSuspiciousActivity,
} from '../lib/auth';
```

---

## Integration Examples

### Example 1: Log Authentication Events (Already Integrated)

```typescript
// In BetterAuthService.signIn()
const { logAuthEvent } = await import('../lib/auth');

try {
  // ... authentication logic ...
  
  // ✅ Log successful sign-in
  await logAuthEvent(
    'auth.login.success',
    data.user.id,
    sanitizedEmail,
    true,
    undefined,
    { email_verified: !!data.user.email_confirmed_at }
  );
  
  return user;
} catch (error) {
  // ✅ Log failed sign-in
  await logAuthEvent(
    'auth.login.failure',
    undefined,
    credentials.email,
    false,
    error.message
  );
  
  throw error;
}
```

### Example 2: Log Admin Actions

```typescript
import { logAdminAction } from '../lib/auth';

async function grantAdminRole(adminUser: User, targetUserId: string) {
  try {
    // Grant role logic...
    
    // Log the admin action
    await logAdminAction(
      'admin.role.granted',
      adminUser.id,
      adminUser.email,
      targetUserId,
      targetUserEmail,
      { role_granted: 'admin', previous_role: 'user' }
    );
  } catch (error) {
    console.error('Failed to grant role:', error);
  }
}
```

### Example 3: Log Data Access

```typescript
import { logDataAccess } from '../lib/auth';

async function createNote(userId: string, noteData: any) {
  // Create note...
  const note = await supabaseNoteStorage.createNote(noteData);
  
  // Log data access
  await logDataAccess(
    'data.note.created',
    userId,
    note.id,
    'note',
    { note_type: noteData.type, has_audio: !!noteData.audioUrl }
  );
  
  return note;
}
```

### Example 4: Log Suspicious Activity

```typescript
import { logSuspiciousActivity } from '../lib/auth';

// Detect and log SQL injection attempt
if (userInput.includes('DROP TABLE') || userInput.includes('--')) {
  await logSuspiciousActivity(
    'security.suspicious.sql_injection_attempt',
    user?.id,
    user?.email,
    {
      input: userInput.substring(0, 100),
      ip_address: requestIp,
      timestamp: new Date().toISOString(),
    }
  );
  
  throw new Error('Invalid input detected');
}
```

### Example 5: Check for Account Lockout

```typescript
import { getRecentFailedLogins } from '../lib/auth';

async function shouldLockAccount(userEmail: string): Promise<boolean> {
  const failedLogins = await getRecentFailedLogins(userEmail, 15);
  
  if (failedLogins.attemptCount >= 5) {
    // Log account lockout
    await logAuthEvent(
      'account.lockout',
      undefined,
      userEmail,
      true,
      `Account locked after ${failedLogins.attemptCount} failed attempts`
    );
    
    return true;
  }
  
  return false;
}
```

### Example 6: Admin Dashboard Query

```typescript
import { securityLoggingService } from '../services/SecurityLoggingService';

async function getSecurityDashboardData() {
  // Get last 24 hours of security events
  const summary = await securityLoggingService.getSecurityEventSummary(24);
  
  // Get critical events
  const { data: criticalEvents } = await supabase
    .from('security_audit_log')
    .select('*')
    .eq('severity', 'critical')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return {
    summary,
    criticalEvents,
  };
}
```

---

## Testing

### Automated Testing

Run the comprehensive test suite:

```bash
npm run test:security-logging
```

### Manual Testing

Test event logging manually:

```typescript
import { logAuthEvent } from '../lib/auth';

// Test logging
await logAuthEvent(
  'auth.login.success',
  'test-user-id',
  'test@example.com',
  true
);

// Query the logs
const { data } = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('user_email', 'test@example.com')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Recent logs:', data);
```

### Test Coverage

The test script covers:
- ✅ Database table existence
- ✅ All event type logging (auth, admin, data, suspicious, API)
- ✅ Query functions (failed logins, suspicious activity, summary)
- ✅ RLS policies
- ✅ Event type validation
- ✅ Severity level validation
- ✅ Cleanup function

---

## Monitoring

### Key Metrics to Monitor

1. **Failed Authentication Attempts**
   - Track login failures per user
   - Alert on > 5 failures in 15 minutes
   
2. **Critical Events**
   - Monitor events with severity='critical'
   - Alert immediately for suspicious activity
   
3. **Admin Actions**
   - Track all admin operations
   - Review privilege escalations
   
4. **API Errors**
   - Monitor unauthorized access attempts
   - Track rate limit violations

### Admin Dashboard Queries

#### Failed Logins (Last 24h)

```sql
SELECT 
  user_email,
  COUNT(*) as failure_count,
  MAX(created_at) as last_attempt,
  ARRAY_AGG(DISTINCT ip_address::TEXT) as ip_addresses
FROM security_audit_log
WHERE event_type = 'auth.login.failure'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 3
ORDER BY failure_count DESC;
```

#### Critical Events (Last 7 days)

```sql
SELECT *
FROM security_audit_log
WHERE severity = 'critical'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### Admin Actions (Last 30 days)

```sql
SELECT 
  event_type,
  user_email as admin_email,
  target_user_email,
  event_data,
  created_at
FROM security_audit_log
WHERE event_type LIKE 'admin.%'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## Maintenance

### Log Retention Policy

Default retention: **365 days** (configurable)

Critical severity logs are **never deleted** automatically.

### Automated Cleanup

Run cleanup manually:

```typescript
import { securityLoggingService } from '../services/SecurityLoggingService';

// Clean up logs older than 365 days (keeps critical)
const deletedCount = await securityLoggingService.cleanupOldLogs(365);
console.log(`Cleaned up ${deletedCount} old logs`);
```

### Optional: Schedule Automated Cleanup

If using `pg_cron` extension:

```sql
SELECT cron.schedule(
  'cleanup-old-security-logs',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$SELECT public.cleanup_old_security_logs(365)$$
);
```

### Performance Optimization

1. **Index Maintenance**: Indexes are automatically maintained
2. **Partition Tables** (optional for high volume):
   - Consider partitioning by month if > 1M events/month
   - Example: `security_audit_log_2025_10`, `security_audit_log_2025_11`

3. **Archive Old Data** (optional):
   - Export logs older than retention to cold storage
   - Keep only recent data in hot database

---

## Troubleshooting

### Issue: Logs not appearing

**Cause**: RLS policies blocking access

**Solution**: Ensure you're using service role key for admin queries or authenticated user for own logs

```typescript
// For admin queries, use service role
const { data } = await supabase
  .from('security_audit_log')
  .select('*');
```

### Issue: IP address not captured

**Cause**: IP detection timeout or not available

**Solution**: This is expected behavior. IP capture is best-effort and may fail on slow networks. Logs are still recorded without IP.

### Issue: High database load

**Cause**: Too many security events being logged

**Solution**: 
1. Review what's being logged - reduce verbosity if needed
2. Consider async batching for high-volume events
3. Increase retention cleanup frequency

### Issue: Test script failing

**Cause**: Missing environment variables or database not set up

**Solution**:
1. Verify `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Run database setup script: `database/security-logging-setup.sql`
3. Check Supabase connection

---

## Security Considerations

### Data Privacy

- **PII Handling**: Be careful not to log sensitive data (passwords, tokens, etc.)
- **GDPR Compliance**: Include security logs in data export and deletion requests
- **Access Control**: Only admins and users (for own logs) can access audit logs

### Best Practices

1. **Never log passwords or tokens** in `event_data` or `metadata`
2. **Sanitize error messages** before logging to avoid leaking sensitive info
3. **Monitor critical events** regularly for security threats
4. **Set up alerts** for suspicious patterns
5. **Review admin actions** periodically for unauthorized changes

---

## Next Steps

1. **✅ Already Integrated**: Authentication logging (BetterAuthService)
2. **TODO**: Integrate logging into admin operations (Priority 2.3 - next)
3. **TODO**: Create admin security dashboard (Priority 4.1)
4. **TODO**: Set up automated alerting for critical events
5. **TODO**: Implement geolocation enrichment (optional enhancement)

---

## Related Documentation

- [App Security Comprehensive Plan](../.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md)
- [Rate Limiting Setup](./RATE_LIMITING_SETUP.md)
- [CSRF Protection Setup](./CSRF_PROTECTION_SETUP.md)
- [Input Validation Setup](./INPUT_VALIDATION_SETUP.md)
- [Security Headers Setup](./SECURITY_HEADERS_SETUP.md)

---

## Support

For questions or issues:
- Check [Troubleshooting](#troubleshooting) section
- Review test script output for specific errors
- Contact security team at security@wiznote.app

**Implementation Date**: October 2025  
**Last Updated**: October 2025  
**Implemented By**: AI Assistant  
**Status**: ✅ Production Ready

