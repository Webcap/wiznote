# System Settings

## Overview

WizNote now features a centralized **System Settings** interface that allows administrators to configure security and operational settings through the admin panel instead of modifying code. This provides flexibility, auditability, and real-time control over critical system behaviors.

## Features

### 🔐 Security Settings (Configurable)

1. **Email Verification**
   - Toggle: Require new users to verify email before accessing the app
   - Default: **ENABLED** (recommended for production)
   - Use case: Disable for development/testing environments

2. **Multi-Factor Authentication (MFA)**
   - Toggle: Enable MFA/2FA support
   - Toggle: Require MFA for admin/support roles
   - Default: Disabled (enable when ready)

3. **Account Lockout**
   - Toggle: Enable account lockout after failed login attempts
   - Setting: Number of attempts before lockout (3-10, default: 5)
   - Setting: Lockout duration in minutes (5-120, default: 30)
   - Default: **ENABLED** (recommended for production)

4. **Session Management**
   - Setting: Session timeout in hours (1-168, default: 24)
   - Auto-logout users after inactivity period

5. **Password Requirements**
   - Setting: Minimum password length (6-20, default: 8)
   - Toggle: Require special characters in passwords
   - Default: **ENABLED** for special characters

### ⚡ Rate Limiting (Configurable)

1. **Rate Limiting Toggle**
   - Master switch for all rate limiting features
   - Default: **ENABLED** (recommended for production)

2. **Authentication Rate Limits**
   - Setting: Max login attempts per window (3-20, default: 5)
   - Setting: Time window in minutes (5-60, default: 15)
   - Prevents brute force attacks

3. **API Rate Limits**
   - Setting: Max API requests per minute per user (10-1000, default: 100)
   - Prevents API abuse

### ⚙️ System Features

1. **Maintenance Mode**
   - Toggle: Put system in read-only mode
   - Use case: Emergency maintenance or system updates
   - Default: Disabled

2. **New User Registration**
   - Toggle: Allow new users to create accounts
   - Use case: Temporarily close registration during maintenance
   - Default: **ENABLED**

## Setup Instructions

### 1. Create Database Tables

Run the setup SQL in Supabase SQL Editor:

```bash
# Navigate to database folder
cd database/

# Run in Supabase SQL Editor
system-settings-setup.sql
```

This creates:
- `system_settings` table with all configuration fields
- `system_settings_audit` table for change tracking
- RLS policies (admin-only access)
- Triggers for automatic audit logging
- Default secure settings

### 2. Access Admin Settings

Navigate to the admin panel:

```
/admin/system-settings
```

**Requirements:**
- Must be logged in
- Must have `admin` role in `user_profiles` table
- RLS policies enforce admin-only access

### 3. Configure Settings

1. Review current settings
2. Toggle or adjust values as needed
3. Click "Save Changes"
4. Review audit log to confirm changes

## Usage in Code

### Reading Settings

```typescript
import { systemSettingsService } from '../services/SystemSettingsService';

// Get all settings
const settings = await systemSettingsService.getSettings();
console.log(settings.emailVerificationRequired); // true/false

// Check specific features
const requireEmailVerif = await systemSettingsService.isEmailVerificationRequired();
const mfaEnabled = await systemSettingsService.isMfaEnabled();
const rateLimitEnabled = await systemSettingsService.isRateLimitEnabled();

// Get rate limit configuration
const authRateLimitConfig = await systemSettingsService.getAuthRateLimitConfig();
// Returns: { enabled: boolean, attempts: number, windowMinutes: number }

// Get account lockout configuration
const lockoutConfig = await systemSettingsService.getAccountLockoutConfig();
// Returns: { enabled: boolean, attempts: number, durationMinutes: number }
```

### Using Settings in Authentication

```typescript
import { shouldRequireEmailVerification } from '../lib/auth';

// During signup flow
async function handleSignup(email: string, password: string) {
  const requireVerification = await shouldRequireEmailVerification();
  
  if (requireVerification) {
    // Send verification email
    await sendVerificationEmail(email);
    return { success: true, message: 'Please check your email to verify your account' };
  } else {
    // Allow immediate access
    return { success: true, message: 'Account created successfully' };
  }
}
```

### Updating Settings (Admin Only)

```typescript
import { systemSettingsService } from '../services/SystemSettingsService';

// Update settings
const result = await systemSettingsService.updateSettings(
  {
    emailVerificationRequired: false, // Disable email verification
    rateLimitAuthAttempts: 10,       // Increase auth attempts to 10
    maintenanceMode: true,            // Enable maintenance mode
  },
  currentUser.id, // Admin user ID
  'Preparing for system maintenance' // Optional reason
);

if (result.success) {
  console.log('Settings updated successfully');
} else {
  console.error('Error:', result.error);
}
```

## Security Features

### 🔒 Access Control

- **RLS Policies**: Only admins can view/update system settings
- **Admin Verification**: Service validates user role before updates
- **Audit Logging**: All changes tracked with user, timestamp, and values

### 📊 Audit Trail

Every setting change is automatically logged with:
- Setting key (field name)
- Old value → New value
- Changed by (user ID and email)
- Timestamp
- Optional reason/notes

View audit logs in the admin interface:
```typescript
const logs = await systemSettingsService.getAuditLogs(50);
// Returns last 50 changes
```

### 🛡️ Safe Defaults

If system settings can't be loaded, the system falls back to **secure defaults**:
- Email verification: **REQUIRED**
- Account lockout: **ENABLED**
- Rate limiting: **ENABLED**
- MFA: Disabled (not enforced until explicitly enabled)
- Maintenance mode: Disabled

### ⚡ Performance

- **Caching**: Settings cached for 1 minute to reduce database queries
- **Fast Reads**: Cached reads take <1ms
- **Cache Invalidation**: Automatic cache clear on update

## Best Practices

### Production Settings

**Recommended production configuration:**
```
✅ Email Verification: ENABLED
✅ Account Lockout: ENABLED (5 attempts, 30 min)
✅ Rate Limiting: ENABLED (5 auth attempts per 15 min)
✅ Session Timeout: 24 hours
✅ Password Min Length: 8+ characters
✅ Special Characters: REQUIRED
✅ MFA: ENABLED (optional for users, required for admins)
❌ Maintenance Mode: DISABLED (except during maintenance)
✅ New User Registration: ENABLED
```

### Development Settings

**Recommended development configuration:**
```
❌ Email Verification: DISABLED (faster testing)
✅ Account Lockout: ENABLED (still test security)
✅ Rate Limiting: ENABLED (test with realistic limits)
✅ Session Timeout: 24 hours
✅ Password Min Length: 6 characters (easier testing)
❌ Special Characters: DISABLED (easier testing)
❌ MFA: DISABLED (until implementing)
❌ Maintenance Mode: DISABLED
✅ New User Registration: ENABLED
```

### When to Change Settings

#### Disable Email Verification
- ✅ Development/staging environments
- ✅ Internal testing
- ✅ QA environments
- ❌ Production (keep enabled)

#### Enable Maintenance Mode
- ✅ System updates
- ✅ Database migrations
- ✅ Emergency fixes
- ✅ Scheduled maintenance windows
- ❌ Normal operations

#### Disable New Registration
- ✅ Beta testing (invite-only)
- ✅ Capacity issues
- ✅ Security incidents
- ✅ System overload
- ❌ Normal growth

#### Adjust Rate Limits
- **Increase** if legitimate users are blocked
- **Decrease** if seeing attack patterns
- **Monitor** via audit logs and security dashboard

## Monitoring & Alerts

### Setting Change Notifications

All setting changes are logged and can trigger alerts:

```typescript
// Example: Monitor for security setting changes
const recentLogs = await systemSettingsService.getAuditLogs(10);
const securityChanges = recentLogs.filter(log => 
  log.settingKey.includes('verification') ||
  log.settingKey.includes('lockout') ||
  log.settingKey.includes('rate_limit')
);

if (securityChanges.length > 0) {
  // Send alert to security team
  await sendSecurityAlert('Security settings changed', securityChanges);
}
```

### Regular Audits

**Weekly:**
- Review audit logs for unauthorized changes
- Verify production settings match security policy

**Monthly:**
- Review all settings for optimization
- Update settings based on user feedback
- Check for new security features

**Quarterly:**
- Full security settings audit
- Update security policies
- Review and update defaults

## Troubleshooting

### Settings Not Loading

**Symptom**: Settings show default values or "Failed to load"

**Solutions**:
1. Verify database table exists: `SELECT * FROM system_settings;`
2. Check RLS policies allow admin access
3. Verify user has admin role
4. Check Supabase connection

### Settings Not Saving

**Symptom**: Save button doesn't work or shows error

**Solutions**:
1. Verify user is logged in
2. Confirm user has admin role
3. Check RLS policies
4. Review browser console for errors
5. Check Supabase logs for permission errors

### Email Verification Not Working

**Symptom**: Users not required to verify email despite setting enabled

**Solutions**:
1. Verify setting is saved: Check in admin panel
2. Clear cache: `systemSettingsService.clearCache()`
3. Check signup flow uses `shouldRequireEmailVerification()`
4. Verify email service is configured

### Audit Logs Not Showing

**Symptom**: No audit logs visible in admin interface

**Solutions**:
1. Verify `system_settings_audit` table exists
2. Check RLS policies allow admin to read audit table
3. Trigger updates should run automatically (check trigger exists)
4. Review database logs for errors

## Database Schema

### system_settings Table

```sql
CREATE TABLE system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  
  -- Security
  email_verification_required BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_required_for_admin BOOLEAN DEFAULT false,
  account_lockout_enabled BOOLEAN DEFAULT true,
  account_lockout_attempts INTEGER DEFAULT 5,
  account_lockout_duration_minutes INTEGER DEFAULT 30,
  session_timeout_hours INTEGER DEFAULT 24,
  password_min_length INTEGER DEFAULT 8,
  password_require_special_chars BOOLEAN DEFAULT true,
  
  -- Rate Limiting
  rate_limit_enabled BOOLEAN DEFAULT true,
  rate_limit_auth_attempts INTEGER DEFAULT 5,
  rate_limit_auth_window_minutes INTEGER DEFAULT 15,
  rate_limit_api_requests INTEGER DEFAULT 100,
  rate_limit_api_window_minutes INTEGER DEFAULT 1,
  
  -- Features
  maintenance_mode BOOLEAN DEFAULT false,
  new_user_registration_enabled BOOLEAN DEFAULT true,
  
  -- Audit
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### system_settings_audit Table

```sql
CREATE TABLE system_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT
);
```

## API Reference

See [`services/SystemSettingsService.ts`](../services/SystemSettingsService.ts) for complete API documentation.

### Key Methods

- `getSettings()` - Get all settings (cached)
- `updateSettings(updates, userId, reason?)` - Update settings (admin only)
- `getAuditLogs(limit?)` - Get change history
- `isEmailVerificationRequired()` - Check email verification setting
- `isMfaEnabled()` - Check MFA setting
- `isRateLimitEnabled()` - Check rate limiting setting
- `clearCache()` - Force settings refresh

## Migration Guide

### Migrating from Hardcoded Settings

**Before:**
```typescript
// lib/auth.ts
requireEmailVerification: false, // Hardcoded
```

**After:**
```typescript
// lib/auth.ts
requireEmailVerification: false, // Controlled via admin panel

// In signup code
const requireVerif = await shouldRequireEmailVerification();
```

### Migrating Environment Variables

If you previously used environment variables for these settings, you can migrate to system settings:

1. Run database setup
2. Access admin panel
3. Configure settings to match your environment variables
4. Remove environment variables from `.env`
5. Update code to use `systemSettingsService`

## Related Documentation

- [Security Plan](./app-security-comprehensive-plan.plan.md)
- [Support Ticket System](./SUPPORT_TICKET_SYSTEM.md)
- [Admin Dashboard Documentation](./ADMIN_FEATURES.md)
- [RLS Policies Guide](./DATABASE_SECURITY.md)

## Support

For issues or questions:
- Review troubleshooting section above
- Check Supabase logs
- Review audit logs
- Contact: security@wiznote.app

