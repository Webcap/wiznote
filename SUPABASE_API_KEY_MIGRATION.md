# Supabase API Key Migration Guide

## Overview
Supabase has introduced a new **Publishable Key** format (`sb_publishable_...`) to replace the legacy anon key format. This guide helps you migrate to the new format.

## Key Types

### 1. Publishable Key (NEW ✅)
- **Format:** `sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd`
- **Environment Variable:** `EXPO_PUBLIC_SUPABASE_KEY` (for Expo projects)
- **Safe to expose:** ✅ Yes (can be in client-side code)
- **Protected by:** Row Level Security (RLS)
- **Use for:** Client-side applications (web, mobile)

### 2. Anon Key (LEGACY)
- **Format:** `eyJhbGc...` (JWT token)
- **Safe to expose:** ✅ Yes (can be in client-side code)
- **Protected by:** Row Level Security (RLS)
- **Status:** Legacy, but still works

### 3. Service Role Key (SECRET ⚠️)
- **Format:** `eyJhbGc...` (JWT token with `"role":"service_role"`)
- **Safe to expose:** ❌ **NEVER!** Server-side only!
- **Protected by:** Nothing - bypasses ALL security
- **Use for:** Server-side scripts, admin operations only

## Migration Steps

### Step 1: Get Your New Publishable Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy your **Publishable key** (starts with `sb_publishable_`)

### Step 2: Update Environment Variables

Create or update your `.env` file:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://kmzubtegijexwguadyfw.supabase.co

# Use the NEW publishable key format (required for Expo)
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd

# Legacy anon key (NOT NEEDED if using new publishable key)
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-legacy-key

# Service Role Key (NEVER commit to git! Get from Supabase Dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
```

### Step 3: The Code Already Supports Both!

The codebase has been updated to support both formats. It will use the publishable key if available, otherwise fall back to the anon key:

```typescript
// lib/supabase.ts
const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_KEY || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

### Step 4: Verify It Works

1. Create a `.env` file in your project root with the new key
2. Restart your development server
3. Check the console logs (if `EXPO_PUBLIC_SUPABASE_LOGS=true`)
4. You should see: `Using key format: Publishable (New)`

## Security Best Practices

### ✅ DO:
- Use the **Publishable Key** in client-side code
- Enable Row Level Security (RLS) on all tables
- Keep Service Role Key in `.env` (never commit it)
- Use Service Role Key only in server-side scripts

### ❌ DON'T:
- Never commit Service Role Key to git
- Never use Service Role Key in client-side code
- Never disable RLS without good reason
- Never share Service Role Key publicly

## Backwards Compatibility

The system supports both formats, so you can migrate gradually:

1. **Phase 1:** Add publishable key alongside anon key
2. **Phase 2:** Test everything works
3. **Phase 3:** Remove anon key when ready

## Files Updated

- ✅ `lib/supabase.ts` - Now supports both key formats
- ✅ `env.template` - Updated with new key format
- ✅ `scripts/update-user-emails.js` - Fixed to require env vars (no hardcoded keys)

## Need Help?

- [Supabase API Settings](https://supabase.com/dashboard/project/_/settings/api)
- [Supabase Documentation](https://supabase.com/docs)

