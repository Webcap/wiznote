# Supabase API Key Migration Guide

## Overview
Supabase has introduced a new **Publishable Key** format (`sb_publishable_...`) to replace the legacy anon key format. This guide helps you migrate to the new format.

## Key Types

### 1. Publishable Key (NEW ✅ - Client Side)
- **Format:** `sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd`
- **Environment Variable:** `EXPO_PUBLIC_SUPABASE_KEY` (for Expo projects)
- **Safe to expose:** ✅ Yes (can be in client-side code)
- **Protected by:** Row Level Security (RLS)
- **Use for:** Client-side applications (web, mobile)
- **Replaces:** Anon Key (JWT-based)

### 2. Secret Key (NEW ✅ - Server Side)
- **Format:** `sb_secret_...`
- **Environment Variable:** `SUPABASE_SECRET_KEY`
- **Safe to expose:** ❌ **NEVER!** Server-side only!
- **Protected by:** Nothing - bypasses ALL security (RLS)
- **Use for:** Server-side scripts, admin operations, Edge Functions
- **Replaces:** Service Role Key (JWT-based)
- **Benefits over Service Role Key:**
  - ✅ Easier to rotate without downtime
  - ✅ Not tied to JWT secret
  - ✅ Can be individually revoked
  - ✅ Browser detection (won't work in browsers)
  - ✅ Better security practices

### 3. Anon Key (LEGACY - Client Side)
- **Format:** `eyJhbGc...` (JWT token)
- **Safe to expose:** ✅ Yes (can be in client-side code)
- **Protected by:** Row Level Security (RLS)
- **Status:** ⚠️ Legacy, but still works (not recommended)
- **Limitation:** Coupled to JWT secret, hard to rotate

### 4. Service Role Key (LEGACY - Server Side)
- **Format:** `eyJhbGc...` (JWT token with `"role":"service_role"`)
- **Safe to expose:** ❌ **NEVER!** Server-side only!
- **Protected by:** Nothing - bypasses ALL security
- **Status:** ⚠️ Legacy, but still works (not recommended)
- **Limitations:**
  - ❌ Coupled to JWT secret
  - ❌ 10-year expiry (security risk)
  - ❌ Cannot rotate without downtime
  - ❌ Rotating affects all keys simultaneously
  - ❌ Problematic for mobile apps (App Store review delays)

## Migration Steps

### Step 1: Get Your New Keys from Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy your keys:
   - **Publishable key** (starts with `sb_publishable_`) - for client-side
   - **Secret key** (starts with `sb_secret_`) - for server-side

### Step 2: Update Environment Variables

Create or update your `.env` file:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://kmzubtegijexwguadyfw.supabase.co

# CLIENT-SIDE: Use the NEW publishable key format (recommended)
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd

# Legacy client-side anon key (NOT NEEDED if using new publishable key)
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-legacy-anon-key

# SERVER-SIDE: Use the NEW secret key format (recommended)
# NEVER commit to git! Get from Supabase Dashboard
SUPABASE_SECRET_KEY=sb_secret_your_secret_key_here

# Legacy server-side service role key (NOT NEEDED if using new secret key)
# SUPABASE_SERVICE_ROLE_KEY=your-legacy-service-role-key
```

### Step 3: The Code Already Supports Both!

The codebase has been updated to support both new and legacy formats with automatic fallback:

**Client-side** (`lib/supabase.ts`):
```typescript
// Tries publishable key first, falls back to anon key
const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_KEY || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

**Server-side** (`lib/supabase-admin.ts`):
```typescript
// Tries secret key first, falls back to service_role key
function getAdminKey() {
  if (process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) {
    return process.env.SUPABASE_SECRET_KEY;
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
```

### Step 4: Verify It Works

1. Create a `.env` file in your project root with the new key
2. Restart your development server
3. Check the console logs (if `EXPO_PUBLIC_SUPABASE_LOGS=true`)
4. You should see: `Using key format: Publishable (New)`

## Security Best Practices

### ✅ DO:
- Use **Publishable Key** (`sb_publishable_...`) in client-side code
- Use **Secret Key** (`sb_secret_...`) in server-side code only
- Enable Row Level Security (RLS) on all tables
- Keep Secret/Service Role Keys in `.env` (never commit them)
- Rotate keys regularly (easier with new format!)
- Use separate secret keys for different backend services

### ❌ DON'T:
- Never commit Secret/Service Role Keys to git
- Never use Secret/Service Role Keys in client-side code
- Never use Secret/Service Role Keys in browsers (even localhost!)
- Never disable RLS without good reason
- Never share admin keys publicly or in chat/email
- Never log full API keys (only first 6 chars if needed)

## Migration Strategy

The system supports both new and legacy formats, so you can migrate gradually without downtime:

### Client-Side Keys (Publishable vs Anon)
1. **Phase 1:** Add `EXPO_PUBLIC_SUPABASE_KEY` (publishable) alongside `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. **Phase 2:** Test all client-side functionality works
3. **Phase 3:** Remove/comment out `EXPO_PUBLIC_SUPABASE_ANON_KEY` when ready

### Server-Side Keys (Secret vs Service Role)
1. **Phase 1:** Add `SUPABASE_SECRET_KEY` alongside `SUPABASE_SERVICE_ROLE_KEY`
2. **Phase 2:** Test all server-side scripts and admin operations
3. **Phase 3:** Remove/comment out `SUPABASE_SERVICE_ROLE_KEY` when ready

### Benefits of New Keys
- ✅ **Individual rotation:** Rotate keys independently without affecting others
- ✅ **Zero downtime:** Keep old key active while switching clients to new key
- ✅ **Better security:** Can revoke individual keys if compromised
- ✅ **Mobile friendly:** No app store review delays for key rotation
- ✅ **Audit trail:** Track which key was used via logs/metrics

## Files Updated

### Client-Side
- ✅ `lib/supabase.ts` - Supports both publishable and anon keys
- ✅ `env.template` - Updated with new key formats

### Server-Side
- ✅ `lib/supabase-admin.ts` - NEW! Admin client with support for both secret and service_role keys
- ✅ `env.template` - Updated with server-side secret key support

### Scripts
All scripts will automatically use the new keys if available, falling back to legacy keys:
- Scripts in `scripts/` folder (admin operations)
- Edge Functions in `supabase/functions/`
- Netlify Functions in `netlify/functions/`

## Need Help?

- [Supabase API Settings](https://supabase.com/dashboard/project/_/settings/api)
- [Supabase Documentation](https://supabase.com/docs)

