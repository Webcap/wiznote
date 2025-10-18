# Password Reset - Debugging "Invalid or Expired Link"

## 🔍 The Issue

You're seeing "Invalid or expired reset link" when clicking the password reset link on mobile.

## 📋 Debug Steps

### Step 1: Check Browser Console

When you click the reset link on mobile, open the browser's developer console (if possible) or check the logs. You should see:

```
🔄 Checking session for password reset...
📍 Current URL: https://wiznote.app/reset-password#access_token=...
📍 Hash: #access_token=xxxxx&refresh_token=xxxxx&type=recovery
📍 Search: 
🔍 URL parameters: {hasHash: true, hasAccessToken: true, ...}
```

**Look for:**
- ✅ Is there an `access_token` in the hash?
- ✅ Is the `type` set to `recovery`?
- ❌ Is there an `error` in the URL?

### Step 2: Verify Supabase Configuration

#### Check Site URL:
```
Should be: https://wiznote.app
NOT: http://localhost:3000
```

#### Check Redirect URLs (Must Include):
```
✓ https://wiznote.app/reset-password
✓ https://wiznote.app/auth/callback
```

#### Check Email Link Expiry:
```
Should be: 86400 (24 hours)
NOT: 3600 (1 hour)
```

### Step 3: Test the Reset Flow

**Copy the email link and analyze it:**

The link should look like:
```
https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/verify?
  token=xxxxx
  &type=recovery
  &redirect_to=https://wiznote.app/reset-password
```

**Check:**
- ✅ Does it have `redirect_to=https://wiznote.app/reset-password`?
- ❌ Does it say `redirect_to=wiznote://reset-password`? (This won't work!)
- ❌ Does it say `redirect_to=http://localhost:8081`? (Can't reach from mobile!)

---

## 🔧 Common Causes & Fixes

### Cause 1: Wrong Redirect URL in .env

**Check your `.env` file:**
```bash
# Should be (for mobile to work):
EXPO_PUBLIC_WEB_URL=https://wiznote.app

# NOT:
EXPO_PUBLIC_WEB_URL=http://localhost:8081  ❌
# NOT:
EXPO_PUBLIC_WEB_URL=wiznote://reset-password  ❌
```

**Fix:**
```bash
# Update .env
EXPO_PUBLIC_WEB_URL=https://wiznote.app

# Restart server
npx expo start --clear
```

### Cause 2: Supabase Redirect URL Not Allowed

**Check Supabase Dashboard:**

Authentication → URL Configuration → Redirect URLs

**Must include:**
```
https://wiznote.app/reset-password
```

**Fix:**
1. Add the URL to Supabase
2. Save
3. Request new password reset
4. Test again

### Cause 3: Link Already Used

Password reset links are **single-use only**. Once you use a link, it becomes invalid.

**Fix:**
- Request a new password reset
- Don't click the same link twice

### Cause 4: Link Expired

**Check how old the email is:**
- Links are valid for 24 hours (after our fix)
- If email is older than 24 hours, it won't work

**Fix:**
- Request a new password reset
- Use the link within 24 hours

### Cause 5: Supabase Not Processing Token

**Check browser console for:**
```
❌ Error in URL: access_denied
❌ error_description: Email link is invalid or has expired
```

**This means:**
- Link was already used, OR
- Link has expired, OR
- Token is malformed

**Fix:**
- Request new password reset
- Use link immediately

---

## ✅ What Should Happen (Normal Flow)

```
1. User requests password reset from mobile app
   📧 Email sent

2. User clicks link in email on mobile
   🌐 Opens: https://wiznote.app/reset-password#access_token=xxx&type=recovery

3. Browser loads wiznote.app
   🔄 Supabase processes token (automatic)

4. Page checks for session
   ✅ Session found! (user authenticated via token)

5. Shows password reset form
   📝 User enters new password

6. Password updated
   ✅ Success! Redirects to login
```

---

## 🧪 Test Right Now

### Quick Test:

1. **Update .env:**
   ```bash
   EXPO_PUBLIC_WEB_URL=https://wiznote.app
   ```

2. **Restart server:**
   ```bash
   npx expo start --clear
   ```

3. **Request password reset:**
   - From mobile app
   - Enter your email
   - Submit

4. **Check email:**
   - Look at the reset link
   - Should contain: `redirect_to=https://wiznote.app/reset-password`

5. **Click link on mobile:**
   - Should open in browser
   - Should show loading spinner (3-4 seconds)
   - Should show password reset form

### If It Still Shows "Invalid or Expired":

**Check Console Logs:**

Open the browser console on mobile (or test on desktop first) and look for:

```bash
# Good indicators:
✅ Password recovery token detected
✅ Valid session found for password reset

# Bad indicators:
❌ No token in URL
❌ Error in URL: access_denied
❌ No valid session found after 3 attempts
```

**Share the console logs** and I can help diagnose the exact issue.

---

## 🎯 Checklist

Before testing, verify:

- [ ] `.env` has `EXPO_PUBLIC_WEB_URL=https://wiznote.app`
- [ ] Server restarted with `--clear` flag
- [ ] Supabase Site URL is `https://wiznote.app`
- [ ] Supabase Redirect URLs includes `https://wiznote.app/reset-password`
- [ ] Supabase Email Link Expiry is `86400`
- [ ] wiznote.app is deployed and accessible
- [ ] Requesting NEW password reset (not using old link)

---

## 📞 Still Not Working?

If you've completed all the above and it still doesn't work:

1. **Share the console logs** from the browser
2. **Share the email link** (you can redact the token)
3. **Confirm Supabase settings** are correct

The console logs will tell us exactly what's happening and why the session isn't being established.

---

**Most Common Fix:** Update `.env` with `EXPO_PUBLIC_WEB_URL=https://wiznote.app` and restart server!



