# Mobile Password Reset Fix - Complete Guide

## Problem Summary
Users clicking password reset links on mobile devices experienced:
1. ❌ **Links expire too quickly** (1 hour default)
2. ❌ **App doesn't open** - links open in browser instead

## Solution Implemented

### ✅ 1. Extended Link Expiration
**Changed:** Password reset links now configured for 24-hour expiration

**Code Changes:**
- Updated `services/BetterAuthService.ts` to request longer expiration
- Supabase dashboard needs manual configuration update

### ✅ 2. Deep Linking Configuration
**Added:** Universal links and custom URL scheme support

**Platforms Supported:**
- 📱 **Android**: Universal HTTPS links + custom `wiznote://` scheme  
- 🍎 **iOS**: Associated domains + custom scheme

**Code Changes:**
- Updated `app.config.js` with intent filters (Android)
- Added associated domains (iOS)
- Created universal links configuration files

### ✅ 3. Universal Links Files
**Created:**
- `public/.well-known/assetlinks.json` (Android)
- `public/.well-known/apple-app-site-association` (iOS)

## Quick Setup Guide

### Step 1: Configure Supabase (REQUIRED)

1. **Update Email Link Expiry:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set **Email Link Expiry** to `86400` (24 hours)

2. **Add Redirect URLs:**
   - Go to Authentication → URL Configuration → Redirect URLs
   - Add these URLs:
     ```
     https://your-domain.com/reset-password
     wiznote://reset-password
     http://localhost:8081/reset-password (for development)
     ```

### Step 2: Deploy Universal Links Files

1. **Update Configuration Files:**
   
   **For Android** (`public/.well-known/assetlinks.json`):
   ```bash
   # Get your SHA256 fingerprint
   node scripts/get-android-sha256.js debug
   
   # Or from Google Play Console:
   # Play Console → App Signing → SHA-256 certificate fingerprint
   ```
   
   Update the fingerprint in `assetlinks.json`

   **For iOS** (`public/.well-known/apple-app-site-association`):
   ```
   # Get your Team ID from Apple Developer Account
   # Update: UPDATE_THIS_TEAM_ID → YOUR_ACTUAL_TEAM_ID
   ```

2. **Deploy Files:**
   - Ensure files are accessible at:
     - `https://your-domain.com/.well-known/assetlinks.json`
     - `https://your-domain.com/.well-known/apple-app-site-association`
   
   - Files must be served with proper content-type:
     - `assetlinks.json`: `application/json`
     - `apple-app-site-association`: `application/json` (no file extension!)

### Step 3: Build and Deploy App

```bash
# Android
eas build --platform android --profile production

# iOS  
eas build --platform ios --profile production
```

### Step 4: Testing

#### Test on Android:
```bash
# Test deep link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://your-domain.com/reset-password"

# Should open the app to reset password screen
```

#### Test on iOS:
1. Request password reset
2. Open email on iOS device
3. Tap link - app should open
4. If not, check associated domains in Xcode

#### Test Link Expiration:
1. Request password reset
2. Wait 2 hours
3. Link should still work (24-hour validity)

## Files Modified

### Code Files:
- ✅ `services/BetterAuthService.ts` - Extended expiration request
- ✅ `app.config.js` - Deep linking configuration
- ✅ `app/reset-password.tsx` - Already configured (no changes needed)

### Configuration Files Created:
- ✅ `public/.well-known/assetlinks.json` - Android universal links
- ✅ `public/.well-known/apple-app-site-association` - iOS universal links
- ✅ `scripts/get-android-sha256.js` - Helper script
- ✅ `docs/PASSWORD_RESET_MOBILE_FIX.md` - Detailed documentation

## How It Works

### Link Expiration:
```
Before: 1 hour (3600 seconds)
After:  24 hours (86400 seconds)
```

### Deep Linking Flow:

**Scenario 1: App Installed (Best Case)**
```
User clicks email link
  ↓
Universal link detected
  ↓
App opens directly to reset-password screen
  ↓
User resets password
```

**Scenario 2: Universal Links Not Configured**
```
User clicks email link
  ↓
Opens in mobile browser
  ↓
Browser detects custom scheme (wiznote://)
  ↓
Prompts to open app
  ↓
User confirms, app opens
```

**Scenario 3: App Not Installed**
```
User clicks email link
  ↓
Opens in mobile browser
  ↓
Responsive web version loads
  ↓
User can reset password in browser
```

## Verification Checklist

Before deploying to production:

- [ ] Supabase email link expiry set to 86400 seconds
- [ ] All redirect URLs added to Supabase dashboard
- [ ] Android SHA256 fingerprint updated in `assetlinks.json`
- [ ] iOS Team ID updated in `apple-app-site-association`
- [ ] Universal links files deployed and accessible
- [ ] Universal links files served with correct content-type
- [ ] Tested deep linking on Android device
- [ ] Tested deep linking on iOS device
- [ ] Tested link still works after 2+ hours
- [ ] Tested from various email clients

## Troubleshooting

### Link Still Expires Too Fast
**Cause:** Supabase configuration not updated  
**Fix:** Update in Supabase Dashboard → Authentication → URL Configuration

### App Doesn't Open on Android
**Causes:**
1. Intent filters not configured → Rebuild app
2. Universal links file not accessible → Check `/.well-known/assetlinks.json`
3. SHA256 fingerprint wrong → Get from Play Console

**Debug:**
```bash
# Check if intent is registered
adb shell dumpsys package com.WizNote.app | grep -A 5 "android.intent.action.VIEW"

# Test deep link
adb shell am start -W -a android.intent.action.VIEW -d "wiznote://reset-password"
```

### App Doesn't Open on iOS
**Causes:**
1. Associated domains not configured → Check Xcode settings
2. Universal links file not accessible → Check `/.well-known/apple-app-site-association`
3. Team ID wrong → Update in configuration file

**Debug:**
- Check Xcode → Target → Signing & Capabilities → Associated Domains
- Should show: `applinks:wiznote.app`
- Test on device, not simulator (universal links don't work in simulator)

### Link Opens Browser Instead of App
**Expected behavior if:**
- User hasn't installed the app
- Universal links not fully configured yet

**User can still:**
- Complete password reset in mobile browser
- Download app afterward

## Support for Other Auth Flows

The same deep linking configuration works for:
- ✅ Email verification links
- ✅ Magic link authentication
- ✅ OAuth callbacks
- ✅ Any Supabase auth flow

Just update the paths in intent filters and associated domains!

## Additional Resources

- **Full Documentation:** `docs/PASSWORD_RESET_MOBILE_FIX.md`
- **Android Deep Links:** https://developer.android.com/training/app-links
- **iOS Universal Links:** https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- **Supabase Auth:** https://supabase.com/docs/guides/auth

---

**Status:** ✅ Implemented  
**Last Updated:** October 2025  
**Requires:** Manual Supabase configuration + App rebuild

