# Email Verification Configuration

## Overview

WizNote uses a **system settings-based approach** for email verification control. This allows administrators to enable/disable email verification requirements **without modifying Supabase dashboard settings or deploying new code**.

## How It Works

### Three-Layer Configuration

1. **WizNote System Settings** (Database) - **PRIMARY CONTROL** ✅
   - Location: `system_settings` table, `email_verification_required` column
   - Admin UI: `/admin/system-settings`
   - Default: `TRUE` (secure default)
   - **This setting takes precedence over all others**

2. **Supabase Auth Settings** (Dashboard) - **OVERRIDDEN**
   - Can be enabled or disabled in Supabase dashboard
   - WizNote code ignores this setting
   - System settings control the actual behavior

3. **Code Implementation** (Auto-configured)
   - `lib/auth.ts`: Checks system settings dynamically
   - `services/BetterAuthService.ts`: Enforces system settings
   - No hardcoded values

### Implementation Details

#### lib/auth.ts

```typescript
// Helper function to get email verification requirement from system settings
async function shouldRequireEmailVerification(): Promise<boolean> {
  try {
    return await systemSettingsService.isEmailVerificationRequired();
  } catch (error) {
    console.error('Error checking email verification requirement:', error);
    // Default to secure setting (require verification) if settings can't be loaded
    return true;
  }
}

const supabaseAdapter = {
  async createUser(userData: any) {
    // Check system settings to determine if email verification is required
    const requireEmailVerification = await shouldRequireEmailVerification();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: !requireEmailVerification, // Auto-confirm if verification NOT required
    });
    
    if (error) throw error;
    return data.user;
  },
}
```

#### services/BetterAuthService.ts

```typescript
async signUp(credentials: SignupCredentials): Promise<User> {
  // Import the helper function to check email verification requirement
  const { shouldRequireEmailVerification } = await import('../lib/auth');
  const requireEmailVerification = await shouldRequireEmailVerification();
  
  console.log('Email verification required:', requireEmailVerification);
  
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        display_name: credentials.displayName,
      },
      emailRedirectTo: typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  });

  // If email verification is required, inform user to check their email
  if (requireEmailVerification && !data.user.email_confirmed_at) {
    console.log('Email verification required - user must confirm email before accessing account');
    throw new Error('Please check your email to verify your account before signing in.');
  }
  
  // ... continue with user profile creation
}
```

## Admin Control

### Enabling Email Verification

1. Navigate to `/admin/system-settings` (admin access required)
2. Toggle "Email Verification Required" to **ON**
3. Changes take effect **immediately** (no deployment needed)
4. New signups will require email confirmation
5. Users receive verification emails automatically
6. Users cannot sign in until email is confirmed

### Disabling Email Verification

1. Navigate to `/admin/system-settings` (admin access required)
2. Toggle "Email Verification Required" to **OFF**
3. Changes take effect **immediately**
4. New signups do NOT require email confirmation
5. Users can sign in immediately after signup
6. No verification emails sent

### Audit Trail

All changes to email verification settings are logged in the `system_settings_audit` table:

- Who made the change (admin user ID and email)
- When the change was made (timestamp)
- What changed (old value → new value)
- IP address (if available)
- User agent (if available)
- Reason for change (optional)

## Testing

### Manual Test

1. **Check Current Setting:**
   ```bash
   node scripts/test-email-verification-settings.js
   ```

2. **Test with Email Verification ENABLED:**
   - Go to `/admin/system-settings` and enable email verification
   - Try to sign up a new user
   - Expected: User receives "Please check your email to verify..." message
   - Expected: User cannot sign in until email is confirmed

3. **Test with Email Verification DISABLED:**
   - Go to `/admin/system-settings` and disable email verification
   - Try to sign up a new user
   - Expected: User can sign in immediately
   - Expected: No verification email sent

### Database Query

Check the current setting directly:

```sql
SELECT 
  email_verification_required,
  updated_by,
  updated_at
FROM system_settings
WHERE id = 'default';
```

View audit history:

```sql
SELECT 
  setting_key,
  old_value,
  new_value,
  changed_by_email,
  changed_at,
  reason
FROM system_settings_audit
WHERE setting_key = 'email_verification_required'
ORDER BY changed_at DESC
LIMIT 10;
```

## Security Considerations

### Secure Defaults

- **If system settings are unavailable**: Defaults to `TRUE` (require verification)
- **If database query fails**: Defaults to `TRUE` (require verification)
- **If setting is not found**: Defaults to `TRUE` (require verification)

This ensures that email verification is always required unless explicitly disabled by an admin.

### Caching

System settings are cached for 1 minute to reduce database queries:

- Cache duration: 60 seconds
- Cache invalidation: Automatic on settings update
- Performance impact: Minimal (1 query per minute max)

### RLS Policies

Only admins can modify system settings:

```sql
-- Only admins can update system settings
CREATE POLICY admin_update_system_settings ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

## Troubleshooting

### Email Verification Not Working

1. **Check system settings:**
   ```bash
   node scripts/test-email-verification-settings.js
   ```

2. **Verify Supabase email templates are configured:**
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Ensure "Confirm signup" template is configured
   - Check that email provider is set up (e.g., SendGrid, Mailgun)

3. **Check application logs:**
   - Look for "Email verification required:" log messages
   - Verify the correct setting value is being loaded

4. **Verify user's email confirmation status:**
   ```sql
   SELECT 
     id,
     email,
     email_confirmed_at,
     created_at
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

### Setting Changes Not Taking Effect

1. **Clear cache manually:**
   - Settings are cached for 1 minute
   - Wait 60 seconds after making changes
   - Or restart the application

2. **Check audit logs:**
   ```sql
   SELECT * FROM system_settings_audit
   WHERE setting_key = 'email_verification_required'
   ORDER BY changed_at DESC LIMIT 1;
   ```

3. **Verify RLS policies allow the update:**
   - Ensure you're logged in as an admin
   - Check that the `user_profiles` table has correct role assignment

## Migration Notes

### Before This Implementation

- Email verification was **hardcoded** to `email_confirm: true`
- All new signups bypassed email verification (security vulnerability)
- Changes required code deployment

### After This Implementation

- Email verification is **admin-controlled** via system settings
- Secure default (enabled) with ability to disable if needed
- Changes take effect immediately without code deployment
- Full audit trail of all changes

## Related Documentation

- [System Settings Setup](./SYSTEM_SETTINGS_SETUP.md)
- [System Settings API](./SYSTEM_SETTINGS.md)
- [Security Implementation Status](./SECURITY_IMPLEMENTATION_STATUS.md)
- [App Security Plan](../.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md)

