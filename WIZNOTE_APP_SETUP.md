# WizNote.app - Mobile Password Reset Setup Guide

## Your Configuration

**Domain:** wiznote.app  
**Hosting:** Netlify  
**Mobile App:** com.WizNote.app

---

## ✅ Quick Setup (5 Steps)

### Step 1: Add Environment Variable

Add to your `.env` file:

```bash
EXPO_PUBLIC_WEB_URL=https://wiznote.app
```

For development, you can use:
```bash
EXPO_PUBLIC_WEB_URL=http://localhost:8081
```

### Step 2: Update Supabase Redirect URLs

Go to: https://supabase.com/dashboard → Your Project → Authentication → URL Configuration

**Add these Redirect URLs:**
```
https://wiznote.app/reset-password
https://wiznote.app/auth/callback
http://localhost:8081/reset-password
http://localhost:8081/auth/callback
```

**Set Email Link Expiry:**
```
86400 (24 hours in seconds)
```

### Step 3: Deploy Universal Links Files to Netlify

The files are already in your `public/.well-known/` folder and will be automatically deployed by Netlify.

**Verify after deployment:**
```bash
curl https://wiznote.app/.well-known/assetlinks.json
curl https://wiznote.app/.well-known/apple-app-site-association
```

Both should return JSON (not 404).

### Step 4: Update Configuration Files

#### For Android:
Get your SHA256 fingerprint from Google Play Console:
1. Go to Google Play Console
2. Select WizNote app
3. Release → Setup → App Signing
4. Copy **SHA-256 certificate fingerprint**

Update `public/.well-known/assetlinks.json`:
```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.WizNote.app",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FROM_PLAY_CONSOLE"
    ]
  }
}
```

#### For iOS:
Get your Team ID from Apple Developer Account

Update `public/.well-known/apple-app-site-association`:
Replace `UPDATE_THIS_WITH_YOUR_APPLE_TEAM_ID` with your actual Team ID:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.WizNote.app",
        ...
      }
    ]
  },
  "webcredentials": {
    "apps": ["YOUR_TEAM_ID.com.WizNote.app"]
  }
}
```

### Step 5: Deploy to Netlify & Rebuild App

```bash
# Deploy web app to Netlify (if not already deployed)
git push origin main  # Or your deploy branch

# Rebuild mobile app
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## Testing Guide

### Test Password Reset:

1. **Request Reset:**
   - Open WizNote mobile app
   - Tap "Forgot Password?"
   - Enter your email
   - Submit

2. **Check Email:**
   - Open email on your mobile device
   - You should see a password reset link

3. **Click Link:**
   - Link should look like:
     ```
     https://your-supabase-project.supabase.co/auth/v1/verify?
     token=...&type=recovery&redirect_to=https://wiznote.app/reset-password
     ```
   - Should redirect to `https://wiznote.app/reset-password`

4. **Expected Behavior:**
   - **Best Case:** App opens automatically to reset password screen
   - **Fallback:** Web page opens in browser (user can still reset password)

### Verify Deep Linking:

**On Android:**
```bash
# Test if app opens from wiznote.app link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://wiznote.app/reset-password"

# Should open the app
```

**On iOS:**
- Test on real device (not simulator)
- Universal links only work on physical devices
- Click link from Notes app or Messages to test

---

## Netlify-Specific Configuration

### Ensure Proper Headers

Netlify should serve the universal links files with correct headers. Check your `netlify.toml`:

```toml
[[headers]]
  for = "/.well-known/*"
  [headers.values]
    Content-Type = "application/json"
    Access-Control-Allow-Origin = "*"
```

### Verify Deployment

After deploying, check:
```bash
# Should return JSON, not HTML
curl -I https://wiznote.app/.well-known/assetlinks.json

# Should show: Content-Type: application/json
```

---

## Troubleshooting

### "Site Can't Be Reached" Error

**Cause:** Environment variable not set or mobile can't reach localhost

**Fix:**
```bash
# In your .env file:
EXPO_PUBLIC_WEB_URL=https://wiznote.app  # Not localhost!

# Restart app
npx expo start --clear
```

### "Redirect URL Not Allowed"

**Cause:** URL not added to Supabase

**Fix:**
1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Add `https://wiznote.app/reset-password`
4. Save

### Link Opens Browser, Not App

**Status:** This is expected if universal links aren't fully configured yet

**User Impact:** Minimal - they can still reset password in browser

**To Fix:**
1. Update SHA256 in `assetlinks.json`
2. Deploy to Netlify
3. Rebuild app
4. Test again

### Universal Links Not Working

**Checklist:**
- [ ] Files deployed to https://wiznote.app/.well-known/
- [ ] SHA256 matches production certificate
- [ ] Team ID is correct
- [ ] App rebuilt after configuration changes
- [ ] Testing on real device (not simulator)
- [ ] Domain verified in Android/iOS settings

---

## Development Workflow

### Local Development

For testing password reset during development:

**Option 1: Use ngrok**
```bash
# Terminal 1
npx expo start

# Terminal 2
ngrok http 8081

# Update .env
EXPO_PUBLIC_WEB_URL=https://abc123.ngrok.io

# Restart Expo
npx expo start --clear
```

**Option 2: Use Production URL**
```bash
# In .env
EXPO_PUBLIC_WEB_URL=https://wiznote.app

# Links will go to production web app
# Useful for testing the full flow
```

### Testing Before Production

```bash
# Build preview
eas build --platform android --profile preview

# Test with preview build before production release
```

---

## Production Checklist

Before releasing to production:

- [ ] `EXPO_PUBLIC_WEB_URL=https://wiznote.app` in production environment
- [ ] Supabase redirect URLs include `https://wiznote.app/reset-password`
- [ ] Supabase email link expiry set to 86400 seconds
- [ ] Universal links files deployed to Netlify
- [ ] SHA256 fingerprint updated (from Play Console)
- [ ] Apple Team ID updated
- [ ] Netlify serving files with correct content-type
- [ ] App rebuilt with updated configuration
- [ ] Tested password reset from production app
- [ ] Verified link doesn't expire too quickly (wait 2+ hours and test)

---

## What Happens Now

### When User Requests Password Reset:

1. User opens mobile app
2. Taps "Forgot Password?"
3. Enters email
4. Email sent with link to: `https://wiznote.app/reset-password`

### When User Clicks Link:

**With Deep Linking Configured:**
```
Click link → wiznote.app detected → App opens → Reset password in app
```

**Without Deep Linking:**
```
Click link → wiznote.app opens in browser → User resets password
```

**Either way, it works!** Deep linking just makes it smoother.

---

## Next Steps

1. **Right Now:**
   - Add `EXPO_PUBLIC_WEB_URL=https://wiznote.app` to `.env`
   - Update Supabase redirect URLs
   - Restart your dev server

2. **Before Next Release:**
   - Update SHA256 in `assetlinks.json`
   - Update Team ID in `apple-app-site-association`
   - Deploy to Netlify
   - Rebuild mobile app

3. **After Release:**
   - Test password reset on real device
   - Verify links work and don't expire too quickly

---

## Support Files

- **Detailed Guide:** `MOBILE_PASSWORD_RESET_FIX.md`
- **URL Fix Guide:** `MOBILE_RESET_URL_FIX.md`
- **SHA256 Helper:** `scripts/get-android-sha256.js`

---

**Your Domain:** wiznote.app ✅  
**Status:** Configured  
**Ready for:** Testing & deployment

