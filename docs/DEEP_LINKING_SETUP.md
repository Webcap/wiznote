# Deep Linking Setup for Email Verification

This document explains how deep linking is configured for email verification in WizNote, allowing users to be automatically redirected back to the mobile app after clicking verification links in their email.

## Overview

When users sign up on mobile, they receive an email with a verification link. When they tap this link, it automatically opens the WizNote app and completes the verification process - no need to manually return to the app!

## How It Works

1. **User signs up** → Account is created in Supabase
2. **Supabase sends verification email** → Contains deep link (`wiznote://auth/callback`)
3. **User taps link in email** → Mobile OS opens WizNote app
4. **App handles verification** → Automatically verifies email and redirects to login

## Configuration

### 1. Supabase Dashboard Setup

You need to configure allowed redirect URLs in your Supabase project:

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   ```
   wiznote://auth/callback
   ```
3. For web support, also add:
   ```
   https://yourdomain.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

### 2. App Configuration (Already Done)

The following configurations are already set up in the codebase:

#### app.config.js
- Deep link scheme: `wiznote://`
- iOS associated domains configured
- Android intent filters configured

#### services/BetterAuthService.ts
- Platform-specific redirect URLs
- Mobile: `wiznote://auth/callback`
- Web: `${window.location.origin}/auth/callback`

#### app/auth/callback.tsx
- Handles email verification tokens
- Redirects user appropriately after verification

#### app/_layout.native.tsx
- Listens for deep links
- Routes to callback handler with parameters

## URL Formats

### Deep Link URL (Mobile)
```
wiznote://auth/callback?token_hash=<token>&type=signup
```

### Web URL
```
https://yourdomain.com/auth/callback?token_hash=<token>&type=signup
```

## Testing

### Test on Mobile

1. **Sign up** with a real email address you can access
2. **Check your email** for the verification link
3. **Tap the link** on your mobile device
4. **Verify** that:
   - The app opens automatically
   - You see a "Verifying..." screen
   - You're redirected to login after verification

### Test on Web

1. **Sign up** with a real email address
2. **Check your email** for the verification link
3. **Click the link** in a browser
4. **Verify** that:
   - You're taken to the callback page
   - Email is verified successfully
   - You're redirected to login

## Troubleshooting

### Deep Link Not Opening App

**Issue**: Tapping the email link opens a browser instead of the app.

**Solutions**:
1. Ensure you're testing on a physical device (not simulator/emulator)
2. Verify the deep link scheme is registered in `app.config.js`
3. Rebuild the app after changing deep link configuration:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios  # or run:android
   ```
4. On iOS: Check associated domains in Xcode
5. On Android: Verify intent filters in AndroidManifest.xml

### Redirect URL Not Allowed

**Issue**: Error message about redirect URL not being allowed.

**Solutions**:
1. Check Supabase dashboard → Authentication → URL Configuration
2. Ensure `wiznote://auth/callback` is added to Redirect URLs
3. Wait a few minutes after saving (changes may take time to propagate)
4. Clear app cache and restart

### Verification Fails

**Issue**: App opens but email verification fails.

**Solutions**:
1. Check that `token_hash` and `type` parameters are being passed correctly
2. Review logs in `app/auth/callback.tsx`
3. Verify Supabase project is correctly configured
4. Ensure verification link hasn't expired (usually valid for 24 hours)

## Platform-Specific Notes

### iOS
- Deep links are handled via Universal Links
- Associated domains must be configured in Apple Developer Portal
- Requires app to be signed and distributed (doesn't work in Expo Go)

### Android
- Deep links are handled via intent filters
- App Links verification is automatic with `autoVerify: true`
- Works in development builds

### Web
- Uses standard HTTP redirect URLs
- No special configuration needed beyond Supabase redirect URLs

## Security Considerations

1. **Deep link scheme** (`wiznote://`) is app-specific and secure
2. **Token validation** is handled by Supabase's `verifyOtp` method
3. **Tokens are single-use** and expire after use
4. **HTTPS required** for web callbacks in production

## Future Enhancements

Potential improvements to consider:

1. **Custom domains**: Use `https://app.wiznote.com/auth/callback` for iOS Universal Links
2. **Error handling**: Better error messages for expired/invalid tokens
3. **Analytics**: Track verification completion rates
4. **Retry mechanism**: Allow users to request new verification email if link expires

## Related Files

- `app.config.js` - Deep link configuration
- `app/auth/callback.tsx` - Verification handler
- `app/_layout.native.tsx` - Deep link listener
- `services/BetterAuthService.ts` - Redirect URL logic
- `app/(auth)/signup.tsx` - User messaging

## Support

If you encounter issues with deep linking:

1. Check the console logs for deep link events
2. Verify all configuration steps are complete
3. Test on a physical device (simulators may not handle deep links correctly)
4. Review Supabase authentication logs for errors

