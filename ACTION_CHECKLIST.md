# 🚀 Action Checklist: Fix Mobile Password Reset

## Do These 3 Things NOW ⚡

### 1️⃣ Add to Your `.env` File (30 seconds)

```bash
EXPO_PUBLIC_WEB_URL=https://wiznote.app
```

### 2️⃣ Update Supabase (2 minutes)

Go to: https://supabase.com/dashboard

**Authentication → URL Configuration → Redirect URLs**

Add:
```
https://wiznote.app/reset-password
https://wiznote.app/auth/callback
```

**Authentication → URL Configuration → Email Link Expiry**

Change to:
```
86400
```
(24 hours instead of 1 hour)

### 3️⃣ Restart Your Dev Server (10 seconds)

```bash
npx expo start --clear
```

---

## ✅ Test It Works

1. Open your app
2. Click "Forgot Password?"
3. Enter email
4. Check email on mobile
5. Click link
6. Should open https://wiznote.app/reset-password (works!)

---

## 📱 For Production Deploy (Do Before Next Release)

### Get SHA256 Fingerprint

**From Google Play Console:**
1. Google Play Console → WizNote
2. Release → Setup → App Signing  
3. Copy SHA-256 certificate fingerprint

### Update Android Config

Edit: `public/.well-known/assetlinks.json`

Replace `UPDATE_THIS_WITH_YOUR_RELEASE_KEY_SHA256_FINGERPRINT` with your SHA256

### Update iOS Config

Edit: `public/.well-known/apple-app-site-association`

Replace `UPDATE_THIS_WITH_YOUR_APPLE_TEAM_ID` with your Team ID
(Get from Apple Developer Account)

### Deploy & Rebuild

```bash
# Deploy web app (will auto-deploy via Netlify on git push)
git add .
git commit -m "Configure password reset for wiznote.app"
git push

# Rebuild mobile apps
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## ✅ Success Criteria

After completing the 3 steps above:

- ✅ Password reset links use https://wiznote.app (not custom scheme)
- ✅ Links work when clicked from mobile email
- ✅ Links valid for 24 hours (not 1 hour)
- ✅ User can reset password successfully

---

## 📚 More Info

- **Your Domain Setup:** `WIZNOTE_APP_SETUP.md`
- **Full Documentation:** `MOBILE_PASSWORD_RESET_FIX.md`
- **URL Fix Details:** `MOBILE_RESET_URL_FIX.md`

---

**Priority:** 🔴 HIGH  
**Time to Fix:** 3 minutes (+ 30 min for production deploy)  
**Status:** Ready to implement

