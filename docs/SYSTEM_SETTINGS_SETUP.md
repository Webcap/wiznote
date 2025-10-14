# System Settings - Quick Setup Guide

## ✨ What's New?

We've added a **System Settings** admin panel that allows you to configure security settings without code changes!

### New Features
✅ Toggle email verification on/off
✅ Configure MFA/2FA settings
✅ Control account lockout behavior
✅ Adjust rate limiting
✅ Enable maintenance mode
✅ Full audit trail of all changes

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Setup

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste contents of: `database/system-settings-setup.sql`
3. Click **Run**

You should see:
```
✅ System settings tables created successfully
  - system_settings: Configuration table
  - system_settings_audit: Audit log table
  - Triggers: Auto-audit logging for all changes

⚠️  Default Settings:
  - Email verification: ENABLED
  - Account lockout: ENABLED (5 attempts, 30 min)
  - Rate limiting: ENABLED
  - Session timeout: 24 hours
```

### Step 2: Access Admin Panel

Navigate to: `/admin/system-settings`

**Requirements:**
- You must be logged in
- You must have `admin` role

### Step 3: Configure Your Settings

**For Production:**
- Keep email verification **ENABLED**
- Keep account lockout **ENABLED**
- Keep rate limiting **ENABLED**

**For Development:**
- You can **DISABLE** email verification for faster testing
- Keep other security features enabled

## 📋 Key Settings Explained

| Setting | Recommended | Why |
|---------|-------------|-----|
| **Email Verification** | ✅ ON (Production)<br>❌ OFF (Development) | Prevents fake accounts |
| **Account Lockout** | ✅ ON | Prevents brute force attacks |
| **Rate Limiting** | ✅ ON | Prevents API abuse |
| **MFA/2FA** | 📅 Future | Enhanced security (coming soon) |
| **Maintenance Mode** | ❌ OFF | Only during maintenance |

## 🔒 Security

- **Admin Only**: Only admins can view/change settings
- **Audit Trail**: Every change is logged with who/when/what
- **Safe Defaults**: Secure settings if database unavailable
- **Real-time**: Changes apply immediately

## 📖 Using in Code

### Check if email verification is required

```typescript
import { shouldRequireEmailVerification } from '../lib/auth';

const requireVerif = await shouldRequireEmailVerification();
if (requireVerif) {
  // Send verification email
}
```

### Get all settings

```typescript
import { systemSettingsService } from '../services/SystemSettingsService';

const settings = await systemSettingsService.getSettings();
console.log('Email verification:', settings.emailVerificationRequired);
console.log('MFA enabled:', settings.mfaEnabled);
```

## 🎯 Common Use Cases

### 1. Disable Email Verification for Testing

```
1. Go to /admin/system-settings
2. Toggle "Email Verification Required" OFF
3. Click "Save Changes"
4. New signups won't require email verification
```

### 2. Enable Maintenance Mode

```
1. Go to /admin/system-settings
2. Toggle "Maintenance Mode" ON
3. Click "Save Changes"
4. System enters read-only mode
```

### 3. Adjust Rate Limits

```
1. Go to /admin/system-settings
2. Under "Rate Limiting" section
3. Adjust "Auth Attempts" or "API Requests Per Minute"
4. Click "Save Changes"
```

### 4. View Change History

```
1. Go to /admin/system-settings
2. Click "View Audit Logs"
3. See who changed what and when
```

## ⚠️ Important Notes

1. **Changes are immediate** - Settings apply to all users right away
2. **Production defaults are secure** - Don't disable security features in production
3. **Audit everything** - All changes are logged for compliance
4. **Admin only** - Regular users can't see or change these settings

## 🆘 Troubleshooting

### Can't access /admin/system-settings

**Solution**: Verify your user has `role = 'admin'` in `user_profiles` table

```sql
-- Check your role
SELECT id, email, role FROM user_profiles 
WHERE id = 'your-user-id';

-- Grant admin if needed
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'your-user-id';
```

### Settings not saving

**Solution**: Check browser console and Supabase logs for RLS policy errors

### Database setup failed

**Solution**: Ensure you have proper permissions in Supabase

## 📚 Full Documentation

For complete documentation, see: [`docs/SYSTEM_SETTINGS.md`](./SYSTEM_SETTINGS.md)

## ✅ Checklist

- [ ] Run `database/system-settings-setup.sql` in Supabase
- [ ] Verify tables created: `system_settings`, `system_settings_audit`
- [ ] Access `/admin/system-settings` and confirm you see the interface
- [ ] Make a test change and verify it saves
- [ ] Check audit logs appear
- [ ] Configure settings for your environment (production vs development)

## 🎉 You're Done!

You can now control security settings through the admin panel!

**Next Steps:**
- Review other security features in the [Security Plan](./app-security-comprehensive-plan.plan.md)
- Set up rate limiting implementation
- Configure MFA when ready
- Review audit logs regularly

