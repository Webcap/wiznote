# Supabase Secret Key - Quick Setup Guide

## 🚀 Quick Start

Your project uses the **new Supabase Secret Keys** format (`sb_secret_...`), which is more secure than legacy JWT-based service role keys.

## 📝 Add to Your `.env` File

Add this line to your `.env` file:

```bash
SUPABASE_SECRET_KEY=sb_secret_your_actual_secret_key_here
```

## 🔍 Where to Find Your Secret Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your WizNote project
3. Navigate to **Settings** → **API**
4. Scroll to the **"Secret keys"** section (NEW - not "Project API keys")
5. Copy the key that starts with `sb_secret_`

### Visual Guide

```
Supabase Dashboard → Settings → API
│
├── Project API keys (OLD)
│   ├── anon / public key ← Use in Expo (EXPO_PUBLIC_SUPABASE_KEY)
│   └── service_role key ← LEGACY (disabled in your project)
│
└── Secret keys (NEW) ⭐
    └── sb_secret_... ← Use this for SUPABASE_SECRET_KEY
```

## ✅ Your Complete `.env` File

```bash
# Public variables (bundled into Expo app - safe to expose)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGc...your-anon-key

# Server-side secrets (Node.js scripts ONLY - NEVER expose to client)
SUPABASE_SECRET_KEY=sb_secret_your_actual_secret_key

# Other variables...
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
STRIPE_SECRET_KEY=sk_test_...
# etc...
```

## 🔒 Security Rules

### ✅ Safe to Use (Client-Side)
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_KEY` - Anon/public key (respects RLS)
- Any variable starting with `EXPO_PUBLIC_*`

### ❌ NEVER Expose (Server-Side Only)
- `SUPABASE_SECRET_KEY` - Bypasses Row Level Security!
- `STRIPE_SECRET_KEY` - Full Stripe access
- `BETTER_AUTH_SECRET` - Auth encryption key

## 🧪 Test Your Setup

After adding the key, test it:

```bash
node scripts/test-rate-limiting.js
```

You should see:

```
✅ Using NEW Supabase Secret Key (sb_secret_...)
```

## 🆚 New vs. Legacy Keys

| Feature | New Secret Keys | Legacy Service Role |
|---------|----------------|---------------------|
| Format | `sb_secret_...` | `eyJhbGc...` (JWT) |
| Security | ✅ Better | ⚠️ Coupled to JWT secret |
| Rotation | ✅ Easy | ❌ Difficult |
| Status | ✅ Recommended | ⚠️ Deprecated |
| Your Project | ✅ Enabled | ❌ Disabled |

## 🔄 Automatic Fallback

Your codebase supports **both** formats automatically:

```typescript
// Tries new format first, falls back to legacy
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
```

But since service role keys are disabled in your project, you **must** use `SUPABASE_SECRET_KEY`.

## 📚 More Information

For detailed migration guide, see:
- `docs/SUPABASE_SECRET_KEYS_SETUP.md`
- `SUPABASE_API_KEY_MIGRATION.md`

## ❓ Troubleshooting

### Error: "Missing required environment variables"

**Solution**: Add `SUPABASE_SECRET_KEY` to your `.env` file

### Error: "Invalid API key"

**Solutions**:
1. Verify you copied the entire key (starts with `sb_secret_`)
2. Make sure there are no extra spaces
3. Regenerate the key in Supabase Dashboard if needed

### Where's the service role key?

**Answer**: Disabled in your project. Use the new secret keys instead.

---

**Last Updated**: October 2025  
**Status**: ✅ New Secret Keys Active

