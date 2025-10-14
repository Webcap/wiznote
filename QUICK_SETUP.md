# 🚀 Quick Setup Instructions

## Immediate Action Required

Your Supabase project has **legacy API keys disabled**, so you need to use the new publishable key format.

### Step 1: Create `.env` File

Create a file named `.env` in your project root (`C:\Users\cnieves\Desktop\projects\wiznote\.env`) with this content:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://kmzubtegijexwguadyfw.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd

# Get your Service Role Key from Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 2: Fix Missing User Emails

Run this SQL in your **Supabase SQL Editor**:

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `database/fix-user-emails.sql`:

```sql
-- Add email column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Copy emails from auth.users
UPDATE user_profiles
SET email = auth.users.email
FROM auth.users
WHERE user_profiles.id = auth.users.id;

-- Verify
SELECT id, display_name, email, role
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
```

### Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

### Step 4: Verify Everything Works

1. Open your app in the browser
2. Navigate to User Management (admin panel)
3. You should now see:
   - All users loading without errors
   - Email addresses displayed on each user card
   - Subscription status and billing history

## Files Updated

- ✅ `lib/supabase.ts` - Now uses `EXPO_PUBLIC_SUPABASE_KEY`
- ✅ `components/NetworkDiagnostic.tsx` - Updated to use new key
- ✅ `env.template` - Updated with your actual values
- ✅ `database/fix-user-emails.sql` - SQL to add email column and populate data
- ✅ `scripts/update-user-emails.js` - Removed hardcoded keys (security fix)

## Security Notes

- ✅ Publishable key (`sb_publishable_...`) is SAFE to expose
- ⚠️ Service role key should NEVER be committed to git
- ✅ `.env` file is already in `.gitignore`

You're all set! 🎉

