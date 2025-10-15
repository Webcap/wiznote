# Account Lockout Setup Guide

**Last Updated**: October 2025  
**Status**: ✅ **COMPLETE** - Fully implemented and tested  
**Priority**: Priority 3.1 - Medium Priority

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [How It Works](#how-it-works)
6. [Integration](#integration)
7. [Admin Operations](#admin-operations)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Account Lockout system prevents brute force attacks by temporarily locking user accounts after too many failed login attempts. It integrates with the existing security logging and rate limiting systems to provide comprehensive protection.

### Key Benefits

- **Brute Force Prevention**: Stops attackers after configurable failed attempts
- **Automatic Protection**: No user intervention needed
- **Auto-Unlock**: Accounts automatically unlock after timeout
- **Manual Override**: Admins can unlock accounts immediately
- **Audit Trail**: Complete lockout history for compliance
- **Configurable**: Admin can adjust thresholds via system settings

---

## Features

### ✅ Core Features

1. **Automatic Account Lockout**
   - Lock account after N failed login attempts (default: 5)
   - Configurable lockout duration (default: 30 minutes)
   - Tracks IP addresses of failed attempts
   - Records detailed lockout context

2. **Auto-Unlock**
   - Accounts automatically unlock after configured duration
   - No manual intervention required
   - Database trigger for instant unlock on expired lockouts
   - Periodic cleanup job available

3. **Manual Unlock Options**
   - Admin can unlock accounts immediately
   - Email verification unlock (future enhancement)
   - Self-service unlock via email link (future enhancement)

4. **Lockout History & Analytics**
   - Complete lockout history per user
   - Statistics for admin dashboard
   - Failed attempt tracking with IP addresses
   - Unlock method tracking (auto, admin, email)

5. **Integration with Security Systems**
   - Works with Security Logging for failed attempt tracking
   - Integrates with Rate Limiting system
   - Admin-configurable via System Settings
   - Event logging for compliance

---

## Installation

### Step 1: Run Database Setup

Execute the SQL setup script in your Supabase SQL editor:

```bash
# Copy the SQL file content
cat database/account-lockout-setup.sql
```

Or run directly in Supabase SQL Editor:
1. Go to: https://supabase.com/dashboard/project/_/sql/new
2. Paste the entire contents of `database/account-lockout-setup.sql`
3. Click **Run**

This creates:
- `account_lockouts` table
- 7 helper functions
- RLS policies
- Performance indexes
- Auto-unlock trigger

### Step 2: Verify Installation

Run the test script:

```bash
node scripts/test-account-lockout.js
```

Expected output: All 10 tests should pass ✅

---

## Configuration

### System Settings (Admin Panel)

Account lockout is configured in `/admin/system-settings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `accountLockoutEnabled` | `true` | Enable/disable account lockout |
| `accountLockoutAttempts` | `5` | Failed attempts before lockout |
| `accountLockoutDurationMinutes` | `30` | How long account stays locked |

### Environment Variables

No additional environment variables needed. Uses existing Supabase configuration.

---

## How It Works

### Login Flow with Account Lockout

```
┌─────────────────────────────────────────────────────────┐
│  1. User attempts login                                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  2. Check if account is locked                           │
│     - Query account_lockouts table                       │
│     - Check if locked_until > NOW()                      │
└────────────┬────────────────────────────────────────────┘
             │
        ┌────┴────┐
        │ Locked? │
        └────┬────┘
             │
      YES ◄──┴──► NO
       │           │
       │           ▼
       │  ┌─────────────────────────────────────────┐
       │  │  3. Proceed with authentication         │
       │  │     - Validate credentials              │
       │  │     - Check email verification          │
       │  └────────┬────────────────────────────────┘
       │           │
       │      ┌────┴────┐
       │      │ Success?│
       │      └────┬────┘
       │           │
       │    YES ◄──┴──► NO
       │     │           │
       │     │           ▼
       │     │  ┌──────────────────────────────────┐
       │     │  │ 4. Log failed attempt            │
       │     │  │ 5. Check if should lock account  │
       │     │  │    - Count recent failures       │
       │     │  │    - Compare to threshold        │
       │     │  └────────┬─────────────────────────┘
       │     │           │
       │     │      ┌────┴──────┐
       │     │      │ Lock now? │
       │     │      └────┬──────┘
       │     │           │
       │     │    YES ◄──┴──► NO
       │     │     │           │
       │     │     ▼           ▼
       │     │  ┌──────┐   ┌────────┐
       │     │  │Lock  │   │ Reject │
       │     │  │Acct  │   │ Login  │
       │     │  └──────┘   └────────┘
       │     ▼
       │  ┌──────────────┐
       │  │ Login Success│
       │  └──────────────┘
       ▼
┌──────────────────────────┐
│  Reject: Account Locked  │
│  "Try again in X minutes"│
└──────────────────────────┘
```

### Auto-Unlock Process

1. **Database Trigger** (Immediate):
   - Checks `locked_until` on every access
   - Auto-unlocks if expired

2. **Periodic Job** (Optional):
   - Call `auto_unlock_expired_lockouts()` periodically
   - Cleans up expired locks in batch

---

## Integration

### Already Integrated

Account lockout is **automatically active** in:
- ✅ `BetterAuthService.signIn()` - Checks lockout before auth
- ✅ Failed login tracking via Security Logging
- ✅ Admin system settings integration

### Usage in Your Code

```typescript
import { 
  isAccountLocked,
  lockAccount,
  unlockAccount,
  shouldLockAccount,
  formatLockoutMessage,
  getLockoutHistory 
} from '../lib/auth';

// Example 1: Check if account is locked
const lockStatus = await isAccountLocked('user@example.com');
if (lockStatus.isLocked) {
  console.log(`Account locked for ${lockStatus.remainingMinutes} more minutes`);
}

// Example 2: Lock an account manually (admin)
await lockAccount(userId, userEmail, {
  failedAttempts: 5,
  lockReason: 'admin_action',
  durationMinutes: 60,
});

// Example 3: Unlock an account (admin)
await unlockAccount('user@example.com', 'admin');

// Example 4: Get lockout history
const history = await getLockoutHistory('user@example.com');
history.forEach(entry => {
  console.log(`Locked at: ${entry.lockedAt}, Unlocked: ${entry.unlockMethod}`);
});
```

---

## Admin Operations

### Unlock a User Account

```typescript
import { unlockAccount, logAdminAction } from '../lib/auth';

async function adminUnlockAccount(
  adminUser: User,
  targetUserEmail: string
) {
  // Unlock the account
  const unlocked = await unlockAccount(targetUserEmail, 'admin');
  
  if (unlocked) {
    // Log the admin action
    await logAdminAction(
      'account.unlock',
      adminUser.id,
      adminUser.email,
      undefined,
      targetUserEmail,
      { unlock_method: 'admin', reason: 'Support request' }
    );
    
    console.log(`✅ Account ${targetUserEmail} unlocked by admin`);
  }
}
```

### Lock a User Account (Admin)

```typescript
async function adminLockAccount(
  adminUser: User,
  targetUserId: string,
  targetUserEmail: string,
  reason: string
) {
  await lockAccount(targetUserId, targetUserEmail, {
    lockReason: reason,
    durationMinutes: 60, // 1 hour
  });
  
  await logAdminAction(
    'account.lockout',
    adminUser.id,
    adminUser.email,
    targetUserId,
    targetUserEmail,
    { manual_lock: true, reason }
  );
}
```

---

## Testing

### Automated Tests

Run the test suite:

```bash
node scripts/test-account-lockout.js
```

### Manual Testing

Test the lockout flow:

1. **Trigger Lockout**:
   - Attempt to login with wrong password 5 times
   - Account should lock automatically

2. **Verify Lockout**:
   - Try to login again (should fail with lockout message)
   - Check `account_lockouts` table in Supabase

3. **Wait for Auto-Unlock**:
   - Wait 30 minutes (or adjust duration for testing)
   - Account should unlock automatically

4. **Manual Unlock**:
   ```sql
   SELECT unlock_account('user@example.com', 'admin');
   ```

---

## Monitoring

### Admin Dashboard Queries

#### Active Lockouts

```sql
SELECT 
  user_email,
  locked_at,
  locked_until,
  failed_attempt_count,
  lock_reason,
  EXTRACT(EPOCH FROM (locked_until - NOW()))/60 as minutes_remaining
FROM account_lockouts
WHERE is_locked = true
  AND locked_until > NOW()
ORDER BY locked_at DESC;
```

#### Lockout History (Last 7 Days)

```sql
SELECT 
  user_email,
  COUNT(*) as lockout_count,
  MAX(locked_at) as last_lockout,
  ARRAY_AGG(DISTINCT ip_addresses) as ip_patterns
FROM account_lockouts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_email
HAVING COUNT(*) > 1
ORDER BY lockout_count DESC;
```

#### Lockout Statistics

```sql
SELECT * FROM get_lockout_stats(24);
```

---

## Troubleshooting

### Issue: Account locked but shouldn't be

**Solution**: Check Security Logging for failed attempts

```sql
SELECT *
FROM security_audit_log
WHERE user_email = 'user@example.com'
  AND event_type = 'auth.login.failure'
  AND created_at >= NOW() - INTERVAL '15 minutes'
ORDER BY created_at DESC;
```

### Issue: Account won't unlock

**Cause**: Lockout duration hasn't expired

**Solution**: Manually unlock via admin

```sql
SELECT unlock_account('user@example.com', 'admin');
```

### Issue: Too many lockouts

**Cause**: Attackers or users forgetting passwords

**Solution**: Review system settings

- Increase lockout attempts threshold (default: 5)
- Decrease lockout duration (default: 30 min)
- Review failed login patterns

---

## Security Best Practices

### 1. Monitor Lockouts Regularly
- Review lockout statistics weekly
- Investigate patterns of lockouts
- Look for targeted attacks

### 2. Balance Security vs Usability
- 5 attempts is recommended (not too strict, not too lenient)
- 30 minutes is reasonable lockout duration
- Consider user experience

### 3. Provide Clear Messaging
- Tell users why account is locked
- Show remaining time
- Provide support contact

### 4. Admin Access Control
- Only admins can unlock accounts
- Log all admin unlock actions
- Require reason for manual unlocks

---

## Related Documentation

- [Security Logging Setup](./SECURITY_LOGGING_SETUP.md)
- [Rate Limiting Setup](./RATE_LIMITING_SETUP.md)
- [App Security Plan](../.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md)

---

## Next Steps

1. **✅ Already Integrated**: BetterAuthService checks lockout before login
2. **TODO**: Add lockout status to user profile UI
3. **TODO**: Create admin dashboard for lockout management
4. **TODO**: Add email notification for lockouts
5. **TODO**: Implement self-service unlock via email

**Implementation Date**: October 2025  
**Status**: ✅ Production Ready (after database setup)

