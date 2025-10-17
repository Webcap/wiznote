# Password Reset Mobile Configuration

## Issue
Users clicking password reset links on mobile devices experience two problems:
1. **Links expire too quickly** - Default is 1 hour
2. **App doesn't open automatically** - Links open in browser instead of app

## Solution

### 1. Configure Supabase for Longer Link Expiration

Password reset link expiration is controlled by Supabase settings:

**Steps to update in Supabase Dashboard:**

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Update **Email Link Expiry** to `86400` (24 hours in seconds)
   - Default: `3600` (1 hour)
   - Recommended: `86400` (24 hours)
   - Maximum: `604800` (7 days)

**Alternative: Via SQL**
```sql
-- Update auth configuration to extend password reset link validity
UPDATE auth.config
SET email_confirm_link_expiry_seconds = 86400
WHERE id = (SELECT id FROM auth.config LIMIT 1);
```

### 2. Configure Deep Linking for Mobile

#### Android Configuration

The app is configured to handle these URL schemes:

1. **HTTPS Universal Links** (Preferred)
   - `https://wiznote.app/reset-password`
   - `https://*.wiznote.app/reset-password`

2. **Custom Scheme** (Fallback)
   - `wiznote://reset-password`

**Intent Filters Added:**
```javascript
// In app.config.js
intentFilters: [
  {
    action: 'VIEW',
    autoVerify: true,
    data: [
      {
        scheme: 'https',
        host: '*.wiznote.app',
        pathPrefix: '/reset-password',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  },
  {
    action: 'VIEW',
    data: [
      {
        scheme: 'wiznote',
        host: 'reset-password',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  },
]
```

#### iOS Configuration

**Associated Domains Added:**
```javascript
associatedDomains: [
  'applinks:wiznote.app',
  'applinks:*.wiznote.app',
  'webcredentials:wiznote.app',
]
```

### 3. Configure Supabase Email Templates

Update the password reset email template in Supabase to use the correct redirect URL:

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Update the confirmation link to use your domain:

```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

**Redirect URL Configuration in Supabase:**

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `https://wiznote.app/reset-password`
   - `https://your-domain.com/reset-password` (if using custom domain)
   - `wiznote://reset-password` (for deep linking)

### 4. Testing

#### Web Testing
1. Request password reset from web app
2. Check email - link should redirect to `https://your-domain.com/reset-password`
3. Link should be valid for 24 hours

#### Mobile Testing (Android)
1. Request password reset from mobile app
2. Open email on mobile device
3. Click reset link
4. App should open automatically to reset password screen
5. If app doesn't open, link should work in mobile browser

#### Mobile Testing (iOS)
1. Request password reset from mobile app
2. Open email on iOS device
3. Click reset link
4. Universal link should open the app
5. If universal links not configured, custom scheme will work

### 5. Universal Links Setup (Production)

For universal links to work in production, you need to:

#### For Android:
Create `.well-known/assetlinks.json` at your domain root:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.WizNote.app",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_CERT_FINGERPRINT"
    ]
  }
}]
```

**Get SHA256 fingerprint:**
```bash
keytool -list -v -keystore your-release-key.keystore
```

#### For iOS:
Create `.well-known/apple-app-site-association` at your domain root:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.WizNote.app",
        "paths": [
          "/reset-password",
          "/auth/callback"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.com.WizNote.app"]
  }
}
```

### 6. Code Changes Made

#### BetterAuthService.ts
- Updated `resetPasswordForEmail` to include options for longer expiration
- Kept custom redirect URL logic for platform-specific handling

#### app.config.js
- Added intent filters for password reset deep links
- Added associated domains for iOS universal links
- Added webcredentials for password autofill

### 7. Deployment Checklist

- [ ] Update Supabase email link expiry to 86400 seconds
- [ ] Add redirect URLs to Supabase dashboard
- [ ] Deploy universal links files (`.well-known` folder)
- [ ] Build new app version with updated config
- [ ] Test deep linking on both Android and iOS
- [ ] Verify email links work and don't expire too quickly

### 8. Troubleshooting

**Link expires too fast:**
- Check Supabase dashboard email link expiry setting
- Verify it's set to 86400 (24 hours) or higher

**App doesn't open on click:**
- Android: Verify intent filters in `app.config.js`
- iOS: Verify associated domains are configured
- Both: Check that universal links files are deployed at `/.well-known/`
- Verify redirect URLs are added in Supabase dashboard

**Link opens browser instead of app:**
- This is expected if universal links aren't fully configured
- Users can still complete the password reset in mobile browser
- Browser will redirect to app if deep link scheme is working

**Link doesn't work at all:**
- Check that email was sent successfully
- Verify the redirect URL in Supabase matches your configuration
- Check Supabase logs for any authentication errors

### 9. Future Improvements

1. **Email Customization**
   - Add WizNote branding to password reset emails
   - Include app download links if user doesn't have app installed

2. **Magic Links**
   - Implement passwordless login as alternative
   - Same deep linking configuration applies

3. **Session Management**
   - Consider implementing "remember this device" feature
   - Reduce password reset frequency for trusted devices

---

**Last Updated:** October 2025
**Related Files:**
- `services/BetterAuthService.ts`
- `app.config.js`
- `app/reset-password.tsx`

