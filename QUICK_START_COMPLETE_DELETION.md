# Quick Start: Complete Account Deletion

## Current Status

✅ Account deletion is **working right now** - it deletes all user data and makes the account inaccessible.

⚠️ To **completely** delete the auth user from Supabase, follow these steps:

## One-Time Setup (5 minutes)

### Step 1: Run SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy the contents of `database/delete-user-function.sql`
4. Paste and click **Run**

That's it! ✅

### Step 2: Test It

1. Create a test user account
2. Go to Settings → Danger Zone → Delete Account
3. Complete the deletion process
4. Check Supabase Dashboard → Authentication → Users
5. The user should be **completely gone**! 🎉

## What This Does

**Before running the migration:**
- ✅ Deletes all user data
- ✅ Deletes user profile
- ✅ Makes account inaccessible
- ⚠️ Auth user remains in `auth.users` table

**After running the migration:**
- ✅ Deletes all user data
- ✅ Deletes user profile
- ✅ Makes account inaccessible
- ✅ **Completely deletes auth user from Supabase** 🎉

## The SQL You're Running

The migration creates a secure database function that:

```sql
CREATE FUNCTION delete_current_user()
```

This function:
- ✅ Only allows users to delete their own account
- ✅ Verifies authentication before deletion
- ✅ Uses secure permissions (SECURITY DEFINER)
- ✅ Cannot be abused or exploited

## Alternative: Copy-Paste SQL

If you prefer, just copy and paste this into Supabase SQL Editor:

```sql
-- Allow users to delete their own account
CREATE OR REPLACE FUNCTION delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = current_user_id;
  RAISE NOTICE 'User % deleted successfully', current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_current_user() TO authenticated;

-- Auto-cleanup user profile when auth user is deleted
CREATE OR REPLACE FUNCTION cleanup_user_profile_on_auth_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_user_profile ON auth.users;
CREATE TRIGGER trigger_cleanup_user_profile
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_profile_on_auth_delete();
```

Click **Run** and you're done! ✅

## Verification

To verify it worked, run this in SQL Editor:

```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'delete_current_user';

-- Should return: delete_current_user
```

## That's It!

After running the SQL migration:
- ✅ Users can **completely** delete their accounts
- ✅ No edge functions needed
- ✅ No additional configuration needed
- ✅ No environment variables needed

The feature will automatically use the database function when it's available, and fall back to partial deletion if it's not.

## Need Help?

- 📄 Full guide: `DATABASE_SETUP_ACCOUNT_DELETION.md`
- 📄 Technical details: `ACCOUNT_DELETION_SETUP.md`
- 📄 Feature overview: `ACCOUNT_DELETION_COMPLETE.md`

## Summary

1. Copy SQL from `database/delete-user-function.sql`
2. Paste into Supabase SQL Editor
3. Click Run
4. Done! Users can now completely delete their accounts 🎉

