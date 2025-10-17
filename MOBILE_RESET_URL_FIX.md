# Fix: "Site Can't Be Reached" on Mobile Password Reset

## Problem
When users click the password reset link from a mobile device, they get "site can't be reached" error.

## Root Cause
The app was generating `wiznote://reset-password` custom scheme URLs for mobile password resets. Email clients can't open these custom schemes directly - they need a regular HTTPS URL that can then trigger the app to open via deep linking.

## Solution
✅ **Use web URLs for all password reset links**, regardless of platform. Deep linking will automatically open the app when the user has it installed.

---

## Quick Fix (IMMEDIATE)

### Step 1: Add Web URL to Environment Variables

Add this to your `.env` file:

```bash
# For Development
EXPO_PUBLIC_WEB_URL=http://localhost:8081

# For Production (update with your actual domain)
# EXPO_PUBLIC_WEB_URL=https://your-domain.com
# OR if using Netlify/Vercel subdomain:
# EXPO_PUBLIC_WEB_URL=https://your-app.netlify.app
```

### Step 2: Update Supabase Redirect URLs

Go to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**Add these URLs:**
```
http://localhost:8081/reset-password
https://your-production-domain.com/reset-password
```

**Remove (if present):**
```
wiznote://reset-password  ← This doesn't work in email links
```

### Step 3: Restart Development Server

```bash
# Clear cache and restart
npx expo start --clear
```

### Step 4: Test

1. Request password reset from mobile app
2. Check email on mobile device
3. Click link
4. ✅ Should open the reset password page (in app or browser)

---

## How It Works Now

### Development Mode:
```
User requests reset → Email sent with link:
https://your-supabase-project.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:8081/reset-password

User clicks link on mobile → Opens localhost:8081 (if dev server running)
OR → Shows error (expected if dev server not accessible from mobile)
```

### Production Mode:
```
User requests reset → Email sent with link:
https://your-supabase-project.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://your-domain.com/reset-password

User clicks link on mobile → Opens your-domain.com/reset-password
                           → Deep linking triggers → App opens automatically!
                           → OR web page loads if app not installed
```

---

## Production Deployment Checklist

Before deploying to production, ensure:

### 1. Environment Variable Set
```bash
EXPO_PUBLIC_WEB_URL=https://your-actual-domain.com
```

### 2. Supabase Redirect URLs Updated
- [ ] Production web URL added to Supabase redirect URLs
- [ ] Custom scheme URL removed (or keep as fallback)

### 3. Web App Deployed
- [ ] Your web app is accessible at the configured domain
- [ ] The `/reset-password` route works
- [ ] HTTPS is properly configured

### 4. Deep Linking Configured (Optional but Recommended)
- [ ] Universal links files deployed (`.well-known/`)
- [ ] App config has correct intent filters (already done ✅)
- [ ] Tested that web links open the app when installed

---

## Testing Scenarios

### Scenario 1: Development Testing
**Problem:** Mobile can't reach `localhost:8081`  
**Solution:** Use ngrok or similar to expose dev server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your dev server
ngrok http 8081

# Use the ngrok URL in .env
EXPO_PUBLIC_WEB_URL=https://abc123.ngrok.io
```

### Scenario 2: Production Testing
**Requirements:**
- Production web URL set in environment variable
- Web app deployed and accessible
- Supabase redirect URL updated

**Test Flow:**
1. Build and deploy production app
2. Request password reset from app
3. Open email on mobile
4. Click link → Should work!

### Scenario 3: App Opens Automatically
**Requirements:**
- Web URL used (✅ now implemented)
- Universal links configured
- App installed on device

**Expected:** Link opens directly in app  
**Fallback:** Link opens in browser (still works!)

---

## Common Issues & Solutions

### Issue 1: "Site Can't Be Reached" (Current Problem)

**Cause:** Using custom scheme URL or localhost not accessible from mobile

**Fix:**
```bash
# Set a reachable web URL
EXPO_PUBLIC_WEB_URL=https://your-domain.com

# For development, use ngrok:
EXPO_PUBLIC_WEB_URL=https://abc123.ngrok.io
```

### Issue 2: "Redirect URL Not Allowed"

**Cause:** URL not added to Supabase allowed list

**Fix:**
1. Go to Supabase → Authentication → URL Configuration
2. Add your web URL to Redirect URLs
3. Save changes

### Issue 3: Link Opens Browser Instead of App

**Expected Behavior** if universal links not configured yet

**User Experience:**
- Link opens in mobile browser
- User can still reset password
- ✅ Still works, just not as smooth

**To Fix:**
- Deploy universal links files (see `MOBILE_PASSWORD_RESET_FIX.md`)
- Rebuild app
- Test again

### Issue 4: Works on Web, Fails on Mobile

**Check:**
1. Is EXPO_PUBLIC_WEB_URL accessible from mobile network?
2. Is HTTPS configured (required for production)?
3. Is the URL added to Supabase redirect URLs?

---

## Development Workflow Options

### Option A: Use ngrok (Recommended for mobile testing)

```bash
# Terminal 1: Start Expo
npx expo start

# Terminal 2: Start ngrok
ngrok http 8081

# Terminal 3: Update .env with ngrok URL
echo "EXPO_PUBLIC_WEB_URL=https://abc123.ngrok.io" >> .env

# Restart Expo
npx expo start --clear
```

**Pros:** Works from any device  
**Cons:** URL changes each time (or pay for static URL)

### Option B: Use Expo Tunnel

```bash
npx expo start --tunnel
```

**Pros:** Built-in, no extra tools  
**Cons:** Can be slower, sometimes unstable

### Option C: Deploy to Staging

```bash
# Deploy web app to staging
netlify deploy --prod

# Use staging URL
EXPO_PUBLIC_WEB_URL=https://staging.your-domain.com
```

**Pros:** Most realistic testing  
**Cons:** Requires deployment for each test

---

## Production Configuration Example

### `.env.production`:
```bash
# Production Web URL
EXPO_PUBLIC_WEB_URL=https://wiznote.app

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-production-key
```

### Supabase Redirect URLs:
```
https://wiznote.app/reset-password
https://wiznote.app/auth/callback
```

### Universal Links (Optional):
```
https://wiznote.app/.well-known/assetlinks.json
https://wiznote.app/.well-known/apple-app-site-association
```

---

## Code Changes Made

### ✅ `services/BetterAuthService.ts`
- Updated redirect URL logic to always use web URLs
- Added support for `EXPO_PUBLIC_WEB_URL` environment variable
- Falls back to `localhost:8081` in development

### ✅ `env.template`
- Added `EXPO_PUBLIC_WEB_URL` with documentation
- Provided examples for dev and production

---

## Next Steps

1. **Right Now:** Add `EXPO_PUBLIC_WEB_URL` to your `.env` file
2. **Before Production:** Deploy web app and update the URL
3. **Optional:** Configure universal links for seamless app opening

---

## Related Documentation

- **Deep Linking Setup:** `MOBILE_PASSWORD_RESET_FIX.md`
- **Quick Start:** `QUICK_FIX_GUIDE.md`
- **Universal Links:** `docs/PASSWORD_RESET_MOBILE_FIX.md`

---

**Status:** ✅ Fixed  
**Priority:** Critical  
**Testing Required:** Yes - test on actual mobile device

