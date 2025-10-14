# Email Verification Sign-In Protection

## Overview

This document explains how WizNote enforces email verification during both **signup** and **sign-in** flows, ensuring unverified users cannot access the application when email verification is enabled.

---

## Implementation

### 1. Sign-Up Flow Protection

**File**: `services/BetterAuthService.ts` (lines 368-405)

When a user signs up:
1. System checks WizNote settings to see if email verification is required
2. If required AND email not confirmed:
   - Throws error: "Please check your email to verify your account before signing in."
   - User cannot proceed
   - User must click verification link in email

```typescript
// During signup
const { shouldRequireEmailVerification } = await import('../lib/auth');
const requireEmailVerification = await shouldRequireEmailVerification();

if (requireEmailVerification && !data.user.email_confirmed_at) {
  throw new Error('Please check your email to verify your account before signing in.');
}
```

### 2. Sign-In Flow Protection ✅ **NEW**

**File**: `services/BetterAuthService.ts` (lines 326-366)

When a user signs in:
1. Supabase authenticates credentials (email + password)
2. **IF credentials are valid**, system checks email verification status
3. System checks WizNote settings for email verification requirement
4. If required BUT email not confirmed:
   - Throws error: "Email not confirmed. Please check your email inbox and click the verification link before signing in."
   - User is blocked from signing in
5. If verification passed or not required:
   - User signs in successfully

```typescript
// During sign-in (AFTER password verification)
const { shouldRequireEmailVerification } = await import('../lib/auth');
const requireEmailVerification = await shouldRequireEmailVerification();

if (requireEmailVerification && !data.user.email_confirmed_at) {
  console.log('Sign-in blocked: Email verification required but not completed');
  throw new Error('Email not confirmed. Please check your email inbox and click the verification link before signing in.');
}
```

### 3. Login Screen Error Handling

**File**: `app/(auth)/login.tsx` (lines 102-106)

The login UI displays user-friendly error messages:

```typescript
// Email not confirmed
else if (message.includes('email not confirmed')) {
  errorMessage = 'Please verify your email address. Check your inbox for the confirmation link.';
  errorDuration = 8000;
}
```

---

## Security Architecture

### Three-Layer Protection

1. **WizNote System Settings** (Primary Control)
   - Admin controls via `/admin/system-settings`
   - Setting: `email_verification_required`
   - Default: `true` (secure)

2. **Application Layer** (Enforcement)
   - `BetterAuthService.signUp()` - Blocks unverified signups
   - `BetterAuthService.signIn()` - Blocks unverified sign-ins
   - Both check system settings dynamically

3. **UI Layer** (User Feedback)
   - Login screen catches errors
   - Displays clear, actionable messages
   - 8-second display for verification errors

---

## Flow Diagrams

### Sign-Up Flow (Email Verification Enabled)

```
User enters email/password
         ↓
BetterAuthService.signUp()
         ↓
Check system settings: email_verification_required = true
         ↓
Supabase creates user account
         ↓
Check: user.email_confirmed_at = null
         ↓
❌ BLOCKED: "Please check your email to verify..."
         ↓
User receives verification email
         ↓
User clicks verification link
         ↓
Email confirmed: user.email_confirmed_at = [timestamp]
         ↓
User can now sign in ✅
```

### Sign-In Flow (Email Verification Enabled)

```
User enters email/password
         ↓
BetterAuthService.signIn()
         ↓
Supabase validates credentials
         ↓
✅ Credentials valid
         ↓
Check system settings: email_verification_required = true
         ↓
Check: user.email_confirmed_at = null
         ↓
❌ BLOCKED: "Email not confirmed. Please check your email..."
         ↓
OR
         ↓
Check: user.email_confirmed_at = [timestamp]
         ↓
✅ ALLOWED: User signs in successfully
```

### Sign-In Flow (Email Verification Disabled)

```
User enters email/password
         ↓
BetterAuthService.signIn()
         ↓
Supabase validates credentials
         ↓
✅ Credentials valid
         ↓
Check system settings: email_verification_required = false
         ↓
✅ SKIP verification check
         ↓
✅ ALLOWED: User signs in immediately
```

---

## Testing

### Test Case 1: Sign-Up with Verification Enabled

**Setup:**
- Email verification enabled in system settings

**Steps:**
1. Navigate to signup page
2. Enter email and password
3. Click "Sign Up"

**Expected Result:**
- ❌ Error: "Please check your email to verify your account before signing in."
- User cannot sign in until email is verified

### Test Case 2: Sign-In with Unverified Email

**Setup:**
- Email verification enabled
- User signed up but hasn't verified email

**Steps:**
1. Navigate to login page
2. Enter correct email and password
3. Click "Sign In"

**Expected Result:**
- ✅ Password is correct (Supabase auth succeeds)
- ❌ Blocked: "Email not confirmed. Please check your email inbox and click the verification link before signing in."
- User cannot access app

### Test Case 3: Sign-In with Verified Email

**Setup:**
- Email verification enabled
- User verified email

**Steps:**
1. Navigate to login page
2. Enter correct email and password
3. Click "Sign In"

**Expected Result:**
- ✅ Password is correct
- ✅ Email verified
- ✅ User signs in successfully
- ✅ Redirected to app

### Test Case 4: Sign-In with Verification Disabled

**Setup:**
- Email verification disabled in system settings

**Steps:**
1. Navigate to login page
2. Enter correct email and password (even if unverified)
3. Click "Sign In"

**Expected Result:**
- ✅ Password is correct
- ✅ Verification check skipped
- ✅ User signs in successfully
- ✅ Redirected to app

---

## Database Queries for Testing

### Check User's Email Verification Status

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Verified ✅'
    ELSE 'Not Verified ❌'
  END as verification_status
FROM auth.users
WHERE email = 'user@example.com';
```

### Check System Settings

```sql
SELECT 
  email_verification_required,
  updated_by,
  updated_at
FROM system_settings
WHERE id = 'default';
```

### Manually Verify a User (For Testing)

```sql
-- ⚠️ Use only for testing! This bypasses the email verification flow
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@example.com';
```

### Manually Unverify a User (For Testing)

```sql
-- ⚠️ Use only for testing!
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email = 'test@example.com';
```

---

## Error Messages

### For Users

| Scenario | Error Message | Duration |
|----------|---------------|----------|
| Sign-up with verification enabled | "Please check your email to verify your account before signing in." | Immediate |
| Sign-in with unverified email | "Email not confirmed. Please check your email inbox and click the verification link before signing in." | 8 seconds |
| Invalid credentials | "Invalid email or password. Please check your credentials and try again." | 7 seconds |

### For Developers (Console Logs)

```typescript
// Sign-in blocked
console.log('Sign-in blocked: Email verification required but not completed');

// Verification check passed
console.log('Email verification check passed:', {
  required: true,
  confirmed: true
});
```

---

## Security Considerations

### ✅ What's Protected

1. **Signup abuse prevented**: Users must verify email to access app
2. **Sign-in blocked**: Unverified users cannot sign in even with correct password
3. **Admin-controlled**: Can be toggled instantly via system settings
4. **Secure defaults**: Enabled by default, requires manual disable
5. **Double-checked**: Verified during both signup AND sign-in

### ⚠️ Important Notes

1. **Password is still checked**: Supabase verifies the password first, then we check email verification
   - This is secure - invalid credentials are rejected before verification check
   - Prevents user enumeration attacks

2. **Supabase settings don't matter**: WizNote system settings override Supabase dashboard
   - Admin can disable in Supabase dashboard
   - WizNote code will still enforce based on system settings

3. **Performance**: Two checks per sign-in:
   - Supabase password validation (~100ms)
   - System settings query (~10ms, cached)
   - Total: ~110ms overhead (acceptable)

---

## Troubleshooting

### User Can't Sign In After Verification

**Symptom**: User clicked verification link but still sees "Email not confirmed" error

**Solution**:
1. Check database:
   ```sql
   SELECT email, email_confirmed_at FROM auth.users WHERE email = 'user@example.com';
   ```
2. If `email_confirmed_at` is NULL, verification link didn't work
3. Resend verification email from Supabase dashboard
4. Or manually verify (testing only)

### Verified Users Getting Blocked

**Symptom**: User has `email_confirmed_at` timestamp but still blocked

**Solution**:
1. Check system settings:
   ```bash
   node scripts/test-email-verification-settings.js
   ```
2. Verify code is checking system settings correctly
3. Check console logs for verification status
4. Clear cache (wait 60 seconds)

### Verification Emails Not Sending

**Symptom**: Users sign up but don't receive verification emails

**Solution**:
1. Check SMTP configuration in Supabase dashboard
2. Verify `support@webcap.media` is configured
3. Check Supabase auth logs for email send failures
4. See `docs/SUPABASE_EMAIL_SETUP.md` for SMTP setup

---

## Code References

### Files Modified

1. **services/BetterAuthService.ts**
   - Lines 326-366: `signIn()` method with verification check
   - Lines 368-405: `signUp()` method with verification check

2. **lib/auth.ts**
   - Lines 8-16: `shouldRequireEmailVerification()` helper function

3. **app/(auth)/login.tsx**
   - Lines 102-106: Error handling for unverified emails

### Related Files

- `services/SystemSettingsService.ts` - Settings management
- `database/system-settings-setup.sql` - Database schema
- `docs/EMAIL_VERIFICATION_SETUP.md` - Full email setup guide
- `docs/SUPABASE_EMAIL_SETUP.md` - Supabase SMTP configuration

---

## Summary

✅ **Sign-Up Protection**: Users with unverified emails cannot complete signup when verification is enabled

✅ **Sign-In Protection**: Users with unverified emails cannot sign in, even with correct password

✅ **Admin Control**: Verification requirement controlled via `/admin/system-settings`

✅ **User-Friendly**: Clear error messages with actionable instructions

✅ **Secure by Default**: Verification enabled unless explicitly disabled by admin

✅ **Performance**: Minimal overhead (~110ms per sign-in)

**Both signup and sign-in flows now properly enforce email verification based on WizNote system settings!** 🎉

