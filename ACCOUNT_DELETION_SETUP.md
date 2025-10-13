# Account Deletion Feature - Setup Guide

This guide explains how to set up the complete account deletion feature for WizNote.

## Overview

The account deletion feature allows users to permanently delete their account and all associated data. It includes:

1. **Password verification** - Users must confirm their password
2. **Double confirmation** - Users must type "DELETE" to confirm
3. **Final warning** - A final confirmation dialog before deletion
4. **Complete data deletion** - All user data is removed from the database
5. **Auth user deletion** - The authentication account is fully deleted

## Current Implementation Status

✅ **Implemented:**
- Password verification
- Confirmation dialogs
- Deletion of all user data:
  - Notes and related data
  - Quizzes, flashcards, and quiz attempts
  - Shared notes
  - Audio and PDF storage records
  - Usage tracking and analytics
  - User profile

⚠️ **Requires Setup:**
- Complete auth user deletion (requires Supabase Edge Function)

## Why Auth User Deletion Needs a Backend Function

The Supabase `admin.deleteUser()` method requires **service role permissions**, which cannot be safely exposed to the client. Therefore, we need to create a backend function (Edge Function) that:

1. Verifies the user is authenticated
2. Uses the service role key to delete the auth user
3. Returns success/failure to the client

## Setup Instructions

### Option 1: Deploy Supabase Edge Function (Recommended)

#### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

#### Step 2: Login to Supabase

```bash
supabase login
```

#### Step 3: Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

#### Step 4: Deploy the Edge Function

The edge function is already created at `supabase/functions/delete-user-account/index.ts`. Deploy it:

```bash
supabase functions deploy delete-user-account
```

#### Step 5: Set Environment Variables

The function automatically has access to these environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (automatically available)
- `SUPABASE_ANON_KEY` - Your anon key (automatically available)

#### Step 6: Update Your Client Code

Add the edge function URL to your `.env` file:

```env
EXPO_PUBLIC_DELETE_ACCOUNT_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-user-account
```

#### Step 7: Update AccountDeletionService.ts

Replace the auth deletion section with a call to the edge function:

```typescript
// In services/AccountDeletionService.ts
// After deleting user profile, call the edge function

const functionUrl = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_FUNCTION_URL;

if (functionUrl) {
  console.log('🔐 Calling edge function to delete auth user...');
  
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Edge function error:', error);
      // Don't throw - user data is already deleted
    } else {
      console.log('✅ Auth user deleted via edge function');
    }
  }
}
```

### Option 2: Use Database Trigger (Alternative)

If you prefer not to use Edge Functions, you can set up a database trigger:

#### Step 1: Create the Trigger Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Create a function to delete auth user when profile is deleted
CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: This requires the auth schema to be accessible
  -- You may need additional permissions for this to work
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_delete_auth_user ON user_profiles;
CREATE TRIGGER trigger_delete_auth_user
  BEFORE DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user_on_profile_delete();
```

**Note:** This approach may require additional configuration in Supabase and might not work in all cases due to permission restrictions.

### Option 3: Manual Cleanup (Temporary Solution)

If you can't set up the backend function immediately, the current implementation:

1. ✅ Deletes all user data
2. ✅ Deletes the user profile
3. ✅ Signs the user out
4. ⚠️ Leaves the auth user in the system (but they can't log back in without a profile)

The auth user record will remain in Supabase's `auth.users` table, but it's essentially orphaned and cannot be used to access the app.

To clean these up manually:
1. Go to Supabase Dashboard → Authentication → Users
2. Manually delete users who have no profile

## Security Considerations

1. **Password Verification**: Always required before deletion
2. **Multiple Confirmations**: Prevents accidental deletion
3. **No Recovery**: Once deleted, data cannot be recovered
4. **Cascade Deletion**: Database relationships handle related data deletion
5. **Service Role**: Edge function keeps service role key secure on the backend

## Testing

Test the account deletion feature in a development/staging environment first:

1. Create a test user account
2. Add some test data (notes, quizzes, etc.)
3. Go to Settings → Danger Zone → Delete Account
4. Follow the deletion process
5. Verify all data is removed from the database
6. Verify the auth user is deleted (if using Edge Function)

## Database Migration

Run the optional migration to add the `deleted_at` column:

```bash
psql -h YOUR_DB_HOST -U postgres -d postgres -f database/add-deleted-at-column.sql
```

This column is currently not used but can be useful for:
- Soft deletes (mark as deleted instead of actually deleting)
- Audit trails
- Preventing immediate re-registration

## Troubleshooting

### "User not allowed" Error

This means the client is trying to use `admin.deleteUser()` without service role permissions. Follow Option 1 to set up the Edge Function.

### Tables Not Found (404 Errors)

Some tables might not exist in your database (e.g., `audio_storage`, `pdf_storage`). This is normal - the deletion service safely handles missing tables.

### Auth User Still Exists

If the auth user remains after deletion:
- Check that the Edge Function is deployed and accessible
- Verify the function URL in your `.env` file
- Check the Edge Function logs in Supabase Dashboard

## Support

For issues or questions:
1. Check the Supabase Dashboard logs
2. Check browser console for client-side errors
3. Check Edge Function logs for backend errors
4. Review this documentation for setup steps

