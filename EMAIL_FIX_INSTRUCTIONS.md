# Fix for Missing User Emails in Admin Panel

## Problem
User emails are showing as "Email not available" in the admin user management panel because the `email` field in the `user_profiles` table is not populated for existing users.

## Root Cause
The `user_profiles` table stores user profile data, but the `email` column was not being populated when users signed up. The email is stored in Supabase's `auth.users` table but not synced to `user_profiles`.

## Solution

### For Existing Users (One-Time Fix)
You need to copy emails from the `auth.users` table to the `user_profiles` table. Run the SQL script in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Open the file `database/fix-user-emails.sql` and copy its contents
4. Paste and run the SQL in the Supabase SQL Editor
5. Verify that emails are now populated by checking the results

The SQL script will:
- Update all `user_profiles` records with their corresponding email from `auth.users`
- Only update records where email is currently NULL or empty
- Show you the first 10 users to verify the update worked

### For New Users (Already Fixed)
The code has been updated in `services/BetterAuthService.ts` to automatically include the email when creating new user profiles. The following functions now save the email:
- `createUserProfile()` - line 719
- `createMinimalUserProfile()` - line 801

## Verification
After running the SQL script:

1. Refresh your admin user management page
2. You should now see user emails displayed prominently on each user card
3. The emails will be shown in a purple highlighted box below the user's display name

## Files Modified
1. `services/BetterAuthService.ts` - Added email field to profile creation
2. `app/user-management.tsx` - Already displays email (no changes needed for display)
3. `database/fix-user-emails.sql` - **NEW** SQL script to fix existing users

## Technical Details
- The `user_profiles.email` column should match `auth.users.email`
- The email is displayed in the UI at line 743-745 of `app/user-management.tsx`
- Future user signups will automatically include the email field

