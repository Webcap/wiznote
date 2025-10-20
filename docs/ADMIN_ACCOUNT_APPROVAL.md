# Admin Account Approval System

Complete guide for managing `@wiznote.app` domain admin accounts with automatic role assignment, verification requirements, and security logging.

## Overview

WizNote uses **domain-based automatic admin assignment** for official `@wiznote.app` email addresses. This ensures team members automatically receive admin privileges while maintaining security through email verification requirements.

## How It Works

```
┌──────────────────────────┐
│ User signs up with       │
│ name@wiznote.app         │
└──────────┬───────────────┘
           │
           │ 1. Signup initiated
           ▼
┌──────────────────────────┐
│ RoleService              │
│ determineUserRole()      │
│                          │
│ ✅ domain = wiznote.app  │
│ → Assign ADMIN role      │
└──────────┬───────────────┘
           │
           │ 2. Role assigned (unverified)
           ▼
┌──────────────────────────┐
│ Email Verification       │
│ Required                 │
│                          │
│ ⚠️  Limited access until │
│    email is verified     │
└──────────┬───────────────┘
           │
           │ 3. User verifies email
           ▼
┌──────────────────────────┐
│ Full Admin Access        │
│ Granted                  │
│                          │
│ 🔐 Logged to security    │
│    audit log             │
└──────────────────────────┘
```

## Authorized Domains

### Admin Role
- `@wiznote.app` - Official WizNote employees/team

### Support Role
- `@support.wiznote.app` - Support team
- `@help.wiznote.app` - Help desk team

### Regular User Role
- All other domains

## Security Features

### ✅ Automatic Role Assignment
- **Email detected**: System automatically assigns appropriate role
- **No manual approval needed**: Streamlined onboarding for team
- **Consistent**: Everyone with `@wiznote.app` gets admin

### 🔐 Email Verification Required
- **Prevents impersonation**: Must verify email ownership
- **Blocks spam accounts**: Can't use fake `@wiznote.app` emails
- **Industry standard**: Same approach as Google Workspace, Slack, etc.

### 📊 Security Logging
All admin account creations are logged with:
- User email and ID
- Timestamp
- Domain verification status
- IP address (if available)
- Assignment reason
- Event type: `admin.role.granted`

### 🔍 Monitoring & Alerts
- View all admin accounts in Security Dashboard
- Track unverified admin accounts
- Monitor admin actions and changes
- Audit trail for compliance

## User Experience

### For Team Members (@wiznote.app)

**Step 1: Sign Up**
```
Email: alice@wiznote.app
Password: ********
```
✅ Account created with **admin role** automatically

**Step 2: Verify Email**
```
📧 Check your inbox
Click verification link
```
✅ Email verified → Full admin access granted

**Step 3: Start Using**
```
Access /admin-dashboard
Manage users
View analytics
Configure settings
```

### For Regular Users

**Standard Signup**
```
Email: user@gmail.com
Password: ********
```
✅ Account created with **user role**
✅ Standard features available
❌ No admin access

## Admin Management Queries

### View All Admin Accounts

```sql
-- Run in Supabase SQL Editor
SELECT 
  up.email,
  up.display_name,
  up.created_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Verified'
    ELSE '⚠️  Unverified'
  END as status
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;
```

### Find Unverified Admin Accounts

```sql
SELECT 
  up.email,
  up.created_at,
  (NOW() - up.created_at) as account_age
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
  AND au.email_confirmed_at IS NULL
ORDER BY up.created_at DESC;
```

### View Admin Creation History

```sql
SELECT 
  created_at,
  user_email,
  event_data->>'domain' as domain,
  event_data->>'reason' as reason
FROM security_audit_log
WHERE event_type = 'admin.role.granted'
ORDER BY created_at DESC
LIMIT 20;
```

## Configuration

### Current Settings

Located in `services/RoleService.ts`:

```typescript
// Line 60: Admin domain check
if (domain === 'wiznote.app') {
  console.log('🔐 WizNote official domain detected - assigning ADMIN role');
  return 'admin';
}
```

### Adding New Admin Domains

To add more domains (e.g., `@partner.wiznote.app`):

```typescript
// In services/RoleService.ts
if (domain === 'wiznote.app' || domain === 'partner.wiznote.app') {
  console.log('🔐 Official domain detected - assigning ADMIN role');
  return 'admin';
}
```

### Adding Support Domains

```typescript
// In services/RoleService.ts
if (domain === 'support.wiznote.app' || domain === 'help.wiznote.app') {
  console.log('🛠️  Support domain detected - assigning SUPPORT role');
  return 'support';
}
```

## Manual Admin Management

### Manually Grant Admin Role

From User Management screen or SQL:

```sql
-- Grant admin to specific user
UPDATE user_profiles
SET role = 'admin',
    permissions = jsonb_build_object(
      'canAccessAdmin', true,
      'canManageUsers', true,
      'canManageContent', true,
      'canViewAnalytics', true,
      'canManageSettings', true
    )
WHERE id = 'user-id-here';
```

### Revoke Admin Role

```sql
-- Revoke admin from user
UPDATE user_profiles
SET role = 'user',
    permissions = jsonb_build_object(
      'canAccessAdmin', false,
      'canManageUsers', false,
      'canManageContent', false,
      'canViewAnalytics', false,
      'canManageSettings', false
    )
WHERE id = 'user-id-here';

-- Log the revocation
INSERT INTO security_audit_log (
  event_type, severity, user_id, user_email, 
  event_data, success
)
VALUES (
  'admin.role.revoked', 'critical', 'user-id', 'user-email',
  '{"reason": "Manual revocation", "revoked_by": "admin"}',
  true
);
```

## Troubleshooting

### Admin Not Getting Admin Role

**Check 1: Email Domain**
```sql
SELECT email FROM auth.users WHERE id = 'user-id';
-- Must be: @wiznote.app
```

**Check 2: Profile Creation**
```sql
SELECT role FROM user_profiles WHERE id = 'user-id';
-- Should be: admin
```

**Fix**: Force update role
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'user-id' 
AND email LIKE '%@wiznote.app';
```

### Email Verification Not Sent

**Check 1: Supabase Email Settings**
- Go to Supabase Dashboard → Authentication → Email Templates
- Verify "Confirm signup" template is enabled
- Check SMTP settings

**Check 2: Resend Verification**
```sql
-- Check current status
SELECT email, email_confirmed_at, confirmation_sent_at 
FROM auth.users 
WHERE id = 'user-id';

-- Trigger resend (through Supabase UI or API)
```

**Fix**: Manual verification (if needed)
```sql
-- ONLY for legitimate team members
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE id = 'user-id' 
AND email LIKE '%@wiznote.app';
```

### Admin Can't Access Admin Dashboard

**Check 1: Email Verified?**
```sql
SELECT email_confirmed_at FROM auth.users WHERE id = 'user-id';
-- Should NOT be NULL
```

**Check 2: Role Correct?**
```sql
SELECT role FROM user_profiles WHERE id = 'user-id';
-- Should be: admin
```

**Check 3: Browser Cache**
```
Clear browser cache
Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

## Security Best Practices

### ✅ DO

1. **Monitor unverified admins** - Check weekly for accounts pending verification
2. **Review admin logs** - Audit admin account creations in Security Dashboard
3. **Verify email ownership** - Never manually verify without confirming identity
4. **Document changes** - Log reason when manually granting/revoking admin
5. **Use 2FA** - Enable multi-factor authentication for all admins (future)

### ❌ DON'T

1. **Don't bypass verification** - Unless you personally verified identity
2. **Don't grant admin to non-official domains** - Maintain domain restrictions
3. **Don't disable logging** - Keep security audit trail intact
4. **Don't share admin credentials** - Each person should have their own account
5. **Don't ignore alerts** - Investigate suspicious admin creations

## Monitoring Dashboard

Access: `/admin/security-dashboard`

**Metrics to Watch**:
- Total admin accounts
- Unverified admins (should be near 0)
- Recent admin role grants
- Admin actions in last 24h

**Alerts**:
- 🔴 Admin account from non-official domain
- 🟡 Unverified admin > 24 hours old
- 🟢 New verified admin account

## Future Enhancements

Planned improvements:

1. **Email Notifications**
   - Alert existing admins when new admin account is created
   - Weekly summary of unverified accounts
   
2. **2FA Requirement**
   - Require multi-factor auth for admin accounts
   - Grace period: 7 days to set up

3. **Admin Approval Workflow** (optional)
   - Require existing admin to approve new admin accounts
   - Useful for larger teams

4. **Role Expiration** (optional)
   - Temporary admin access
   - Auto-revoke after specified period

5. **Geo-Restrictions** (optional)
   - Limit admin access by country/IP range
   - Additional security layer

## SQL Queries Reference

All admin management queries are in:
📄 `database/admin-account-management.sql`

**Quick Links**:
- [Query 1] View all admin accounts
- [Query 2] View unverified admins
- [Query 3] View creation history
- [Query 4] Manually verify account
- [Query 5] Revoke admin role
- [Query 6] Count by status
- [Query 7] Find suspicious accounts
- [Query 8] View admin activity
- [Query 9] Get unverified list
- [Query 10] Cleanup old accounts

## Support

For admin account issues:
1. Check this documentation
2. Run relevant SQL queries
3. Check Security Dashboard
4. Review Supabase logs
5. Contact team lead if needed

## Related Documentation

- [Security Logging Setup](./SECURITY_LOGGING_SETUP.md)
- [Role-Based Access Control](./RBAC.md)
- [User Management](./USER_MANAGEMENT.md)
- [Security Dashboard](./SECURITY_DASHBOARD.md)

