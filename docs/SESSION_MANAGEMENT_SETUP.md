# Session Management Setup Guide

**Last Updated**: October 2025  
**Status**: ✅ **COMPLETE** - Fully implemented and tested  
**Priority**: Priority 3.2 - Medium Priority

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [How It Works](#how-it-works)
6. [Integration](#integration)
7. [User Features](#user-features)
8. [Admin Operations](#admin-operations)
9. [Testing](#testing)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Session Management system provides enhanced session tracking, timeout enforcement, remember me functionality, and multi-device session control for WizNote. It integrates with existing security systems to reduce session hijacking risk and improve user experience.

### Key Benefits

- **Session Timeout Enforcement**: Automatic session expiry after configured duration
- **Remember Me**: Extended sessions for trusted devices
- **Multi-Device Tracking**: View and manage sessions across all devices
- **Force Logout**: Terminate all sessions on password change
- **Activity Tracking**: Monitor last activity per session
- **Security**: Reduces session hijacking and unauthorized access

---

## Features

### ✅ Core Features

1. **Session Tracking**
   - Track all active user sessions
   - Device information (browser, OS, platform)
   - IP address and user agent
   - Last activity timestamp
   - Session creation and expiry times

2. **Session Timeout**
   - Configurable timeout duration (default: 24 hours)
   - Automatic session expiry
   - Periodic activity updates
   - Expired session cleanup

3. **Remember Me**
   - Extended session duration (30 days)
   - Secure token storage
   - Device trust management
   - Optional user control

4. **Multi-Device Management**
   - View all active sessions
   - Terminate specific sessions
   - Force logout all devices
   - Device type tracking (web, iOS, Android)

5. **Security Features**
   - Force logout on password change
   - Admin session revocation
   - Session activity monitoring
   - Automatic cleanup of old records

---

## Installation

### Step 1: Run Database Setup

Execute the SQL setup script in your Supabase SQL editor:

```bash
# Copy the SQL file content
cat database/session-management-setup.sql
```

Or run in Supabase SQL Editor:
1. Go to: https://supabase.com/dashboard/project/_/sql/new
2. Paste contents of `database/session-management-setup.sql`
3. Click **Run**

This creates:
- `user_sessions` table
- 8 helper functions
- RLS policies
- Performance indexes
- Auto-cleanup trigger

### Step 2: Verify Installation

```bash
node scripts/test-session-management.js
```

Expected: All 10 tests should pass ✅

---

## Configuration

### System Settings

Session management is configured in `/admin/system-settings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `sessionTimeoutHours` | `24` | Session timeout duration |

Future enhancements:
- Remember me toggle (per-user preference)
- Trusted device management
- Session limit per user

---

## How It Works

### Session Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  1. User logs in                                     │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  2. Create session record                            │
│     - Store device info                              │
│     - Set expiry time (24h or 30d)                   │
│     - Track IP and user agent                        │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────┐
│  3. Periodic activity updates                        │
│     - Every 5 minutes while active                   │
│     - Updates last_activity_at                       │
└────────────┬────────────────────────────────────────┘
             │
        ┌────┴────┐
        │ Activity?│
        └────┬────┘
             │
      YES ◄──┴──► NO (Timeout)
       │           │
       │           ▼
       │  ┌──────────────────────────┐
       │  │ 4. Session expires        │
       │  │    - Auto-terminate       │
       │  │    - Reason: 'timeout'    │
       │  └───────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Continue session               │
│  (or manual logout)             │
└─────────────────────────────────┘
```

### Force Logout on Password Change

```
┌──────────────────────────────┐
│  User changes password        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Call terminateAllSessions() │
│  - Reason: 'password_changed'│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  All devices logged out       │
│  User must re-authenticate    │
└───────────────────────────────┘
```

---

## Integration

### Already Integrated

Session management is **automatically active** in:
- ✅ `BetterAuthService.signIn()` - Creates session on login
- ✅ `BetterAuthService.signOut()` - Terminates session on logout
- ✅ Helper functions in `lib/auth.ts` for easy use

### Manual Integration Examples

#### Example 1: Track Session on Login

```typescript
import { trackSession } from '../lib/auth';

async function handleLogin(user: User, session: Session, isRememberMe: boolean) {
  await trackSession(
    user.id,
    user.email,
    session.access_token,
    isRememberMe
  );
}
```

#### Example 2: View Active Sessions (User Profile)

```typescript
import { getActiveSessions } from '../lib/auth';

async function showUserSessions(userId: string) {
  const sessions = await getActiveSessions(userId);
  
  sessions.forEach(session => {
    console.log(`${session.browser} on ${session.os}`);
    console.log(`Last active: ${session.lastActivityAt}`);
    console.log(`Expires: ${session.expiresAt}`);
  });
}
```

#### Example 3: Force Logout on Password Change

```typescript
import { terminateAllSessions, logAuthEvent } from '../lib/auth';

async function changePassword(userId: string, userEmail: string, newPassword: string) {
  // Change password logic...
  await supabase.auth.updateUser({ password: newPassword });
  
  // Force logout all sessions
  const terminatedCount = await terminateAllSessions(userId, 'password_changed');
  console.log(`Logged out ${terminatedCount} sessions`);
  
  // Log the event
  await logAuthEvent(
    'auth.password_reset.success',
    userId,
    userEmail,
    true,
    undefined,
    { sessions_terminated: terminatedCount }
  );
}
```

#### Example 4: Terminate Specific Session (Multi-Device Management)

```typescript
import { terminateSession } from '../lib/auth';

async function logoutDevice(sessionId: string, userId: string) {
  const terminated = await terminateSession(sessionId, userId, 'admin_revoke');
  
  if (terminated) {
    console.log('Device logged out successfully');
  }
}
```

---

## User Features

### Multi-Device Session View

Future UI component for user profile:

```typescript
// Example component: UserSessionsView
import { getActiveSessions, terminateSession } from '../lib/auth';

function SessionsList({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState([]);
  
  useEffect(() => {
    loadSessions();
  }, [userId]);
  
  async function loadSessions() {
    const activeSessions = await getActiveSessions(userId);
    setSessions(activeSessions);
  }
  
  async function handleLogoutDevice(sessionId: string) {
    await terminateSession(sessionId, userId, 'logout');
    await loadSessions(); // Refresh list
  }
  
  return (
    <View>
      {sessions.map(session => (
        <SessionCard 
          key={session.id}
          session={session}
          onLogout={() => handleLogoutDevice(session.sessionId)}
        />
      ))}
    </View>
  );
}
```

---

## Admin Operations

### View User Sessions

```typescript
import { getActiveSessions } from '../lib/auth';

async function viewUserSessions(userId: string) {
  const sessions = await getActiveSessions(userId);
  
  console.log(`User has ${sessions.length} active session(s):`);
  sessions.forEach(s => {
    console.log(`- ${s.deviceType} • ${s.browser} • Last active: ${s.lastActivityAt}`);
  });
}
```

### Force Logout User (Admin)

```typescript
import { terminateAllSessions, logAdminAction } from '../lib/auth';

async function adminForceLogout(
  adminUser: User,
  targetUserId: string,
  targetUserEmail: string
) {
  const count = await terminateAllSessions(targetUserId, 'admin_revoke');
  
  await logAdminAction(
    'admin.action.user_management',
    adminUser.id,
    adminUser.email,
    targetUserId,
    targetUserEmail,
    { action: 'force_logout', sessions_terminated: count }
  );
  
  console.log(`Admin logged out ${count} sessions for user`);
}
```

---

## Testing

### Automated Tests

Run the test suite:

```bash
node scripts/test-session-management.js
```

### Manual Testing

1. **Create Session**:
   ```sql
   SELECT upsert_user_session(
     'user-id',
     'user@example.com',
     'session-token',
     'My Phone',
     'android',
     'android',
     NULL,
     'Android 14',
     NULL,
     'Mobile App',
     NULL,
     false,
     '{}'::jsonb
   );
   ```

2. **View Active Sessions**:
   ```sql
   SELECT * FROM get_active_sessions('user-id');
   ```

3. **Terminate Session**:
   ```sql
   SELECT terminate_session('session-token', 'user-id', 'logout');
   ```

---

## Monitoring

### Admin Dashboard Queries

#### Active Sessions by Platform

```sql
SELECT 
  device_type,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_id) as unique_users
FROM user_sessions
WHERE is_active = true
  AND expires_at > NOW()
GROUP BY device_type
ORDER BY session_count DESC;
```

#### Long-Running Sessions

```sql
SELECT 
  user_email,
  device_type,
  created_at,
  last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_active
FROM user_sessions
WHERE is_active = true
  AND created_at < NOW() - INTERVAL '12 hours'
ORDER BY created_at ASC;
```

#### Remember Me Usage

```sql
SELECT 
  COUNT(*) as total_remember_me,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(EXTRACT(EPOCH FROM (expires_at - created_at))/86400) as avg_duration_days
FROM user_sessions
WHERE is_remember_me = true
  AND is_active = true;
```

---

## Troubleshooting

### Issue: Sessions not being tracked

**Solution**: Ensure session tracking is called after login

```typescript
// In BetterAuthService.signIn(), after successful auth:
if (data.session) {
  await trackSession(data.user.id, userEmail, data.session.access_token);
}
```

### Issue: Sessions not expiring

**Cause**: Cleanup function not running

**Solution**: Run periodic cleanup

```typescript
import { sessionManagementService } from '../services/SessionManagementService';

// Run every hour
setInterval(() => {
  sessionManagementService.cleanupExpiredSessions();
}, 60 * 60 * 1000);
```

### Issue: Too many active sessions

**Cause**: Users not logging out properly

**Solution**: Review session timeout setting and add UI to show active sessions

---

## Security Considerations

### Best Practices

1. **Session Timeout**
   - 24 hours is recommended for most users
   - Shorter timeouts (1-4 hours) for sensitive operations
   - Longer timeouts (30 days) only with remember me

2. **Remember Me**
   - Only enable on trusted devices
   - Provide clear UI indicators
   - Allow users to revoke trusted devices

3. **Force Logout**
   - Always force logout on password change
   - Consider force logout on email change
   - Provide notification to user

4. **Activity Tracking**
   - Update activity periodically (every 5 minutes recommended)
   - Don't track every API call (performance impact)
   - Balance security vs performance

### Privacy Considerations

- **IP Addresses**: Store for security, but consider privacy regulations
- **User Agent**: Useful for device identification
- **Location**: Optional, consider user consent
- **Retention**: Delete old sessions (default: 90 days)

---

## Performance Optimization

### Indexes

All necessary indexes are created automatically:
- User ID lookup
- Session ID lookup
- Active session filtering
- Expiry checks
- Composite indexes for common queries

### Caching

The service includes built-in caching:
- Lockout status cached for 1 minute
- System settings cached
- Reduces database load

### Cleanup

Regular cleanup recommended:
- Expired sessions: Run cleanup daily
- Old records: Delete sessions older than 90 days
- Keep active sessions indefinitely

---

## API Reference

### Database Functions

#### upsert_user_session()
Create or update a session record
- **Parameters**: user_id, user_email, session_id, device info, expiry, remember_me
- **Returns**: Session ID (UUID)

#### update_session_activity()
Update last activity timestamp
- **Parameters**: session_id, user_id
- **Returns**: Boolean (success)

#### terminate_session()
End a specific session
- **Parameters**: session_id, user_id, reason
- **Returns**: Boolean (success)

#### terminate_all_user_sessions()
End all sessions for a user
- **Parameters**: user_id, reason, admin_id (optional)
- **Returns**: Count of terminated sessions

#### get_active_sessions()
Get all active sessions for a user
- **Parameters**: user_id
- **Returns**: Array of session records

#### cleanup_expired_sessions()
Terminate all expired sessions
- **Returns**: Count of cleaned up sessions

#### get_session_stats()
Get session statistics
- **Parameters**: time_window_hours
- **Returns**: Statistics object

#### cleanup_old_sessions()
Delete old inactive sessions
- **Parameters**: retention_days
- **Returns**: Count of deleted sessions

---

## Integration Steps

### Step 1: Track Sessions on Login (✅ Already Done)

In `BetterAuthService.signIn()`:
```typescript
await trackSession(userId, userEmail, sessionToken, isRememberMe);
```

### Step 2: Terminate on Logout (✅ Already Done)

In `BetterAuthService.signOut()`:
```typescript
await terminateSession(sessionId, userId, 'logout');
```

### Step 3: Add Remember Me UI (Future)

```typescript
// In login form
<Checkbox 
  label="Remember me for 30 days"
  value={rememberMe}
  onChange={setRememberMe}
/>

// Pass to signIn
await authService.signIn(credentials, { rememberMe });
```

### Step 4: Add Session Management UI (Future)

```typescript
// User Profile > Active Sessions
const sessions = await getActiveSessions(userId);

// Show list with logout button per session
sessions.map(session => (
  <DeviceCard
    device={`${session.browser} on ${session.os}`}
    lastActive={session.lastActivityAt}
    onLogout={() => terminateSession(session.sessionId, userId)}
  />
));
```

---

## Monitoring

### Key Metrics

1. **Active Sessions**
   - Total active sessions
   - Per-device type breakdown
   - Remember me percentage

2. **Session Duration**
   - Average session length
   - Longest sessions
   - Timeout vs logout ratio

3. **Multi-Device Usage**
   - Users with multiple devices
   - Most common device combinations
   - Session switching patterns

### Dashboard Queries

#### Session Overview

```sql
SELECT * FROM get_session_stats(24);
```

#### Users with Multiple Active Sessions

```sql
SELECT 
  user_email,
  COUNT(*) as session_count,
  ARRAY_AGG(DISTINCT device_type) as devices
FROM user_sessions
WHERE is_active = true
  AND expires_at > NOW()
GROUP BY user_email
HAVING COUNT(*) > 1
ORDER BY session_count DESC;
```

#### Recently Terminated Sessions

```sql
SELECT 
  user_email,
  device_type,
  termination_reason,
  terminated_at,
  EXTRACT(EPOCH FROM (terminated_at - created_at))/3600 as session_duration_hours
FROM user_sessions
WHERE terminated_at >= NOW() - INTERVAL '24 hours'
ORDER BY terminated_at DESC
LIMIT 50;
```

---

## Future Enhancements

### 1. Remember Me UI
- Add checkbox to login form
- Store preference per user
- Manage trusted devices

### 2. Session Management UI
- View all active sessions in user profile
- Logout specific devices
- See last activity per device
- Rename devices

### 3. Security Enhancements
- Detect session hijacking (IP changes)
- Limit concurrent sessions per user
- Require re-authentication for sensitive operations
- Suspicious activity alerts

### 4. Push Notifications
- Notify on new device login
- Alert on session from new location
- Warning before session expiry

---

## Related Documentation

- [Security Logging Setup](./SECURITY_LOGGING_SETUP.md)
- [Account Lockout Setup](./ACCOUNT_LOCKOUT_SETUP.md)
- [App Security Plan](../.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md)

---

## Support

For questions or issues:
- Check [Troubleshooting](#troubleshooting) section
- Review test script output
- Contact security team

**Implementation Date**: October 2025  
**Last Updated**: October 2025  
**Status**: ✅ Production Ready (after database setup)

