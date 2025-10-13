# Database Setup for Complete Account Deletion

## Overview

To enable **complete** account deletion (including the auth user), you need to run a SQL migration that creates a database function allowing users to delete their own account.

## Why This Is Needed

Supabase's `auth.admin.deleteUser()` requires service role permissions and cannot be called from the client. Instead, we create a database function with `SECURITY DEFINER` that:

1. ✅ Runs with elevated permissions
2. ✅ Verifies the user is authenticated
3. ✅ Deletes only the calling user's own account
4. ✅ Is safe and cannot be abused

## Setup Instructions

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `database/delete-user-function.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

**OR** run via command line:

```bash
# Using psql
psql -h YOUR_DB_HOST -U postgres -d postgres -f database/delete-user-function.sql

# Using Supabase CLI
supabase db push
```

### Step 2: Verify the Function

Run this query in the SQL Editor to verify the function was created:

```sql
SELECT proname, proargnames, prosrc 
FROM pg_proc 
WHERE proname = 'delete_current_user';
```

You should see the `delete_current_user` function listed.

### Step 3: Test the Function (Optional)

Create a test user and try deleting it:

```sql
-- Test with a user ID (replace with actual test user ID)
SELECT delete_current_user();
```

### Step 4: Update Your .env (Optional)

No environment variables are needed! The function is automatically available to all authenticated users.

## What the Migration Does

### 1. Creates `delete_current_user()` Function

```sql
CREATE OR REPLACE FUNCTION delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
```

This function:
- ✅ Gets the current authenticated user's ID using `auth.uid()`
- ✅ Verifies the user is authenticated
- ✅ Deletes the user from `auth.users`
- ✅ Cascades to all related tables (due to foreign keys)

### 2. Creates Cleanup Trigger

```sql
CREATE TRIGGER trigger_cleanup_user_profile
  BEFORE DELETE ON auth.users
```

This trigger:
- ✅ Automatically deletes the user profile when auth user is deleted
- ✅ Ensures data consistency
- ✅ Handles edge cases

## Security

### ✅ Safe
- Users can **only** delete their own account
- Function uses `auth.uid()` to get the current user
- No user ID parameter that could be manipulated

### ✅ Verified
- Checks that user is authenticated before deletion
- Raises exception if not authenticated

### ✅ Auditable
- Logs deletions with `RAISE NOTICE`
- Can be monitored in Supabase logs

## Testing

### Manual Test

1. Create a test account in your app
2. Go to Settings → Danger Zone → Delete Account
3. Complete the deletion process
4. Verify in Supabase Dashboard:
   - ✅ User is gone from Authentication → Users
   - ✅ User profile is gone from `user_profiles` table
   - ✅ All user data is gone

### SQL Test

```sql
-- Check if auth user exists
SELECT id, email FROM auth.users WHERE id = 'user-id-here';

-- Check if profile exists
SELECT id, display_name FROM user_profiles WHERE id = 'user-id-here';
```

Both should return no results after deletion.

## Rollback

If you need to remove this function:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_cleanup_user_profile ON auth.users;

-- Remove the trigger function
DROP FUNCTION IF EXISTS cleanup_user_profile_on_auth_delete();

-- Remove the delete function
DROP FUNCTION IF EXISTS delete_current_user();
```

## Troubleshooting

### Error: "relation auth.users does not exist"

This means the function doesn't have access to the auth schema. Make sure you're running the migration as a superuser (postgres role in Supabase).

**Solution**: Run the migration via the Supabase SQL Editor which automatically uses the correct permissions.

### Error: "Not authenticated"

The user is not logged in when trying to delete their account.

**Solution**: Ensure the user is authenticated before calling the delete function. The AccountDeletionService already handles this.

### Trigger Not Working

If the cleanup trigger isn't working:

```sql
-- Check if trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'trigger_cleanup_user_profile';
```

If not found, re-run the migration.

## Migration Status Check

Run this to verify everything is set up correctly:

```sql
-- Check function exists
SELECT 
  'delete_current_user function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'delete_current_user'
  ) THEN '✅ Exists' ELSE '❌ Missing' END as status;

-- Check trigger exists
SELECT 
  'cleanup trigger' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_cleanup_user_profile'
  ) THEN '✅ Exists' ELSE '❌ Missing' END as status;
```

Expected output:
```
component                        | status
--------------------------------|----------
delete_current_user function    | ✅ Exists
cleanup trigger                 | ✅ Exists
```

## Summary

✅ **Run the migration**: `database/delete-user-function.sql`  
✅ **Verify it works**: Test with a dummy account  
✅ **Users can now completely delete their accounts!**  

After running this migration, the account deletion feature will **completely** remove users from the system, including the auth record.

