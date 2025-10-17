# 🚀 Quick Fix Guide: Mobile Password Reset

## Immediate Actions Required

### 1. ⚙️ Update Supabase Settings (5 minutes)

```
1. Go to: https://supabase.com/dashboard
2. Select your WizNote project
3. Navigate to: Authentication → URL Configuration
4. Update these settings:

   Email Link Expiry: 86400 (24 hours)
   
   Redirect URLs - Add these:
   ✓ https://your-production-domain.com/reset-password
   ✓ wiznote://reset-password
   ✓ http://localhost:8081/reset-password
```

### 2. 📱 Get Android SHA256 (2 minutes)

**Option A - From Google Play Console (Easiest):**
```
1. Go to Google Play Console
2. Select WizNote app
3. Release → Setup → App Signing
4. Copy SHA-256 certificate fingerprint
```

**Option B - From Command Line:**
```bash
node scripts/get-android-sha256.js debug
```

### 3. ✏️ Update Configuration Files (2 minutes)

**File 1:** `public/.well-known/assetlinks.json`
```
Replace: UPDATE_THIS_WITH_YOUR_RELEASE_KEY_SHA256_FINGERPRINT
With:    Your SHA256 from step 2
```

**File 2:** `public/.well-known/apple-app-site-association`
```
Replace: UPDATE_THIS_TEAM_ID
With:    Your Apple Team ID (from Apple Developer Account)
```

### 4. 🚀 Deploy Files (1 minute)

Deploy your web app so these files are accessible:
- `https://your-domain.com/.well-known/assetlinks.json`
- `https://your-domain.com/.well-known/apple-app-site-association`

**Verify deployment:**
```bash
curl https://your-domain.com/.well-known/assetlinks.json
curl https://your-domain.com/.well-known/apple-app-site-association
```

### 5. 📦 Rebuild App (15-30 minutes)

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## Testing (5 minutes)

### Test Password Reset:
1. Open your app
2. Click "Forgot Password?"
3. Enter email
4. Check email on phone
5. Click reset link
6. ✅ App should open automatically
7. ✅ Reset password

### Test Link Expiration:
1. Request password reset
2. Wait 2 hours
3. Click link
4. ✅ Should still work (24-hour validity)

## Quick Verification

```bash
# Check Supabase
✓ Email link expiry = 86400
✓ Redirect URLs added

# Check Files
✓ assetlinks.json has real SHA256 (not "UPDATE_THIS...")
✓ apple-app-site-association has real Team ID
✓ Both files accessible via HTTPS

# Check App
✓ New build created with updated app.config.js
✓ Deep linking tested on real device
```

## If Something Doesn't Work

### Link Expires Too Fast
→ Check Supabase email link expiry setting

### App Doesn't Open (Android)
→ Rebuild app + verify SHA256 in assetlinks.json

### App Doesn't Open (iOS)
→ Check Team ID + test on real device (not simulator)

### Link Opens Browser
→ This is okay! User can still reset password in browser

## Support

- **Full Documentation:** `MOBILE_PASSWORD_RESET_FIX.md`
- **Detailed Guide:** `docs/PASSWORD_RESET_MOBILE_FIX.md`
- **SHA256 Helper:** `scripts/get-android-sha256.js`

---

**Total Time:** ~30 minutes (including build time)  
**Priority:** High (affects user experience)  
**Status:** Implementation complete, configuration required

