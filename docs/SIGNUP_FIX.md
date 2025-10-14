# Signup Error Fix

## Problem Description

When users tried to sign up, they encountered an error where:
1. The page returned to login
2. The user account was not created properly
3. Users couldn't sign in even after verifying their email

## Root Cause

The issue was caused by the signup flow when email verification was required:

1. **Original Flow (Broken)**:
   - User submits signup form
   - Supabase auth user is created
   - **Email verification check happens**
   - **Error thrown: "Please check your email to verify your account"**
   - **User profile never created in `user_profiles` table** ❌
   - User redirected to login
   - After verifying email, user tries to login
   - Login fails because no profile exists in `user_profiles` table ❌

2. **Secondary Issues**:
   - RLS policies on `system_settings` table blocked unauthenticated users from reading `email_verification_required` setting
   - RLS policies on `user_profiles` table may have prevented profile creation during signup

## Solution

### 1. Code Fix (Already Applied)

**File**: `services/BetterAuthService.ts`

**Change**: Moved user profile creation to happen **before** the email verification check:

```typescript
// Create user profile immediately after successful sign-up (even if email verification is required)
// This ensures the profile exists when the user verifies their email and tries to sign in
console.log('Creating user profile for new user:', data.user.id);
const userProfile = await this.createUserProfile(data.user);

// If email verification is required, inform user to check their email
if (requireEmailVerification && !data.user.email_confirmed_at) {
  console.log('Email verification required - user must confirm email before accessing account');
  console.log('User profile created successfully, waiting for email verification');
  throw new Error('Please check your email to verify your account before signing in.');
}
```

**New Flow (Fixed)**:
1. User submits signup form
2. Supabase auth user is created
3. **User profile created in `user_profiles` table** ✅
4. Email verification check happens
5. Error thrown: "Please check your email to verify your account"
6. User redirected to login
7. After verifying email, user tries to login
8. **Login succeeds because profile exists** ✅

### 2. Database Policy Fixes (Need to Apply)

#### Fix A: System Settings Public Access

**File**: `database/fix-system-settings-public-access.sql`

This allows unauthenticated users to read system settings (needed to check if email verification is required during signup).

**To Apply**:
```bash
# Run in Supabase SQL Editor or via CLI
psql -h <your-db-host> -U postgres -d postgres -f database/fix-system-settings-public-access.sql
```

Or copy and paste the SQL from the file into your Supabase SQL Editor.

#### Fix B: User Profiles Signup Policy

**File**: `database/fix-user-profiles-signup-policy.sql`

This ensures users can create their own profile during signup.

**To Apply**:
```bash
# Run in Supabase SQL Editor or via CLI
psql -h <your-db-host> -U postgres -d postgres -f database/fix-user-profiles-signup-policy.sql
```

Or copy and paste the SQL from the file into your Supabase SQL Editor.

## Testing the Fix

### Test Case 1: New User Signup with Email Verification

1. Go to signup page
2. Fill in email, password, and optional display name
3. Click "Create Account"
4. **Expected**: Success message appears saying to check email
5. **Expected**: User is redirected to login page
6. Check email and click verification link
7. Go to login page
8. Enter email and password
9. **Expected**: Login succeeds and user is redirected to main app ✅

### Test Case 2: New User Signup without Email Verification

1. (Admin) Disable email verification in system settings
2. Go to signup page
3. Fill in email, password, and optional display name
4. Click "Create Account"
5. **Expected**: Account created successfully
6. **Expected**: User is automatically logged in and redirected to main app ✅

### Verification Queries

Check if user profile was created:
```sql
SELECT id, email, display_name, role, created_at 
FROM user_profiles 
WHERE email = 'test@example.com';
```

Check if auth user was created:
```sql
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'test@example.com';
```

## Rollback Plan

If you need to rollback these changes:

### Rollback Code Changes

```bash
git revert <commit-hash>
```

### Rollback Database Policies

```sql
-- Restore admin-only system settings policy
DROP POLICY IF EXISTS "Public can view auth-related settings" ON system_settings;

CREATE POLICY "Admins can view system settings"
  ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

## Additional Notes

- **Email Verification Default**: The system defaults to requiring email verification (`email_verification_required: true`). This is a security best practice.
- **Profile Creation**: User profiles are now created immediately during signup, regardless of email verification status.
- **RLS Security**: The RLS policies still maintain security - users can only create/read/update their own profiles, and admins have full access.

## Related Files

- `services/BetterAuthService.ts` - Main authentication service (code fix applied here)
- `app/(auth)/signup.tsx` - Signup screen UI
- `lib/auth.ts` - Auth helper utilities
- `database/fix-system-settings-public-access.sql` - Database policy fix for system settings
- `database/fix-user-profiles-signup-policy.sql` - Database policy fix for user profiles
- `services/SystemSettingsService.ts` - System settings service

## Support

If you encounter issues after applying this fix:

1. Check the browser console for errors
2. Check Supabase logs for database errors
3. Verify RLS policies are applied correctly
4. Test with a fresh email address
5. Check if email verification emails are being sent

## Change Log

- **2025-10-14**: Initial fix applied
  - Modified `BetterAuthService.ts` to create user profile before email verification check
  - Created database policy fixes for system settings and user profiles
  - Added comprehensive documentation

