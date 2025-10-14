# Supabase Secret Keys Setup Guide

## Quick Start: Getting Your New Secret Keys

This guide shows you how to obtain the new `sb_secret_...` and `sb_publishable_...` keys from your Supabase dashboard.

## Step-by-Step Instructions

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in to your account
3. Select your project

### 2. Navigate to API Settings

1. Click on **Settings** (⚙️ icon in left sidebar)
2. Click on **API** in the settings menu

### 3. Locate Your Keys

You'll see several keys on the API settings page:

#### For Client-Side (Safe to expose)
```
📱 Publishable Key (anon)
Format: sb_publishable_RiZvQ79ufl7j68BPdlnqdA_w6hjjZMd...
```
- **Use in:** React Native app, web app, mobile apps
- **Environment Variable:** `EXPO_PUBLIC_SUPABASE_KEY`
- **Safe to expose:** ✅ Yes (protected by RLS)

#### For Server-Side (NEVER expose publicly)
```
🔐 Secret Key (service_role)
Format: sb_secret_AbCdEf1234567890...
```
- **Use in:** Server-side scripts, Edge Functions, admin operations
- **Environment Variable:** `SUPABASE_SECRET_KEY`
- **Safe to expose:** ❌ **NEVER!** (bypasses all RLS)

### 4. Copy Keys to Environment File

Create or update your `.env` file:

```bash
# Supabase URL
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# CLIENT-SIDE: Publishable key (NEW format)
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_your_key_here

# SERVER-SIDE: Secret key (NEW format)
# ⚠️ NEVER commit this to git!
SUPABASE_SECRET_KEY=sb_secret_your_key_here
```

## Visual Guide

```
Supabase Dashboard → Settings → API
│
├── Project URL
│   └── https://xxxxx.supabase.co
│   
├── 📱 API Keys (Client-Side)
│   ├── Publishable key (anon) [NEW ✅]
│   │   └── sb_publishable_... ← Use this for EXPO_PUBLIC_SUPABASE_KEY
│   │
│   └── anon key [LEGACY ⚠️]
│       └── eyJhbGc... ← Old format, still works
│
└── 🔐 API Keys (Server-Side)
    ├── Secret key (service_role) [NEW ✅]
    │   └── sb_secret_... ← Use this for SUPABASE_SECRET_KEY
    │
    └── service_role key [LEGACY ⚠️]
        └── eyJhbGc... ← Old format, still works
```

## Security Checklist

### ✅ Before You Start
- [ ] Ensure your `.env` file is in `.gitignore`
- [ ] Never commit `.env` to version control
- [ ] Use environment variables in production (not hardcoded)

### ✅ After Setup
- [ ] Verify client-side key starts with `sb_publishable_`
- [ ] Verify server-side key starts with `sb_secret_`
- [ ] Test both keys work correctly
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Review RLS policies for `anon` and `authenticated` roles

## Troubleshooting

### "I don't see the new key formats"

If you only see JWT-based keys (`eyJhbGc...`):
1. Your Supabase project may not have the new keys enabled yet
2. Check the **API Keys** section for a button to "Enable new key formats"
3. Contact Supabase support if the option is not available

### "Which key should I use where?"

| Location | Key Type | Format | Environment Variable |
|----------|----------|--------|---------------------|
| React Native App | Publishable | `sb_publishable_` | `EXPO_PUBLIC_SUPABASE_KEY` |
| Web App (Frontend) | Publishable | `sb_publishable_` | `EXPO_PUBLIC_SUPABASE_KEY` |
| Server Scripts | Secret | `sb_secret_` | `SUPABASE_SECRET_KEY` |
| Edge Functions | Secret | `sb_secret_` | `SUPABASE_SECRET_KEY` |
| Netlify Functions | Secret | `sb_secret_` | `SUPABASE_SECRET_KEY` |
| Admin Operations | Secret | `sb_secret_` | `SUPABASE_SECRET_KEY` |

### "Can I use both old and new keys?"

Yes! The codebase supports both formats:
- Client-side tries `EXPO_PUBLIC_SUPABASE_KEY` first, falls back to `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Server-side tries `SUPABASE_SECRET_KEY` first, falls back to `SUPABASE_SERVICE_ROLE_KEY`

This allows zero-downtime migration.

## Common Mistakes to Avoid

### ❌ DON'T DO THIS:

```javascript
// ❌ Hardcoding keys in source code
const supabase = createClient(
  'https://xxx.supabase.co',
  'sb_secret_hardcoded_key_here'  // NEVER DO THIS!
);

// ❌ Using secret key in client-side code
// In React component:
const SUPABASE_SECRET = 'sb_secret_...';  // DANGER!

// ❌ Committing .env file to git
git add .env  // NO!
```

### ✅ DO THIS:

```javascript
// ✅ Using environment variables
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

// ✅ Server-side only
// In server/admin script:
const supabaseAdmin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY  // Server-side only!
);

// ✅ Proper .gitignore
echo ".env" >> .gitignore
```

## Environment-Specific Setup

### Development
```bash
# .env.development
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_dev_key
SUPABASE_SECRET_KEY=sb_secret_dev_key
```

### Production
```bash
# .env.production or hosting platform settings
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_prod_key
SUPABASE_SECRET_KEY=sb_secret_prod_key
```

### Testing
```bash
# .env.test
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_test_key
SUPABASE_SECRET_KEY=sb_secret_test_key
```

## Next Steps

1. ✅ Get your keys from Supabase dashboard
2. ✅ Add them to `.env` file
3. ✅ Verify `.env` is in `.gitignore`
4. ✅ Test client-side connection (app should work)
5. ✅ Test server-side scripts (admin operations)
6. ✅ Review Row Level Security policies
7. ✅ Deploy to production with environment variables

## Related Documentation

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Migration Guide](../SUPABASE_API_KEY_MIGRATION.md)
- [Quick Setup Guide](../QUICK_SETUP.md)

## Support

If you encounter issues:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Supabase Documentation](https://supabase.com/docs)
- Contact Supabase support via dashboard

