# Netlify Environment Variables Setup

**Quick guide to add `SUPABASE_SECRET_KEY` to your Netlify deployment**

## 🔐 Why You Need This

Your WizNote Netlify functions require admin access to Supabase to:
- Reset monthly usage records
- Perform security logging
- Handle authentication events
- Run scheduled cron jobs

The `SUPABASE_SECRET_KEY` provides the necessary admin privileges with the modern `sb_secret_` format that your project uses.

## 📝 Step-by-Step: Add to Netlify

### Option 1: Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Sign in to your account

2. **Select Your Site**
   - Click on "WizNote" (or your site name)

3. **Navigate to Environment Variables**
   - Click **"Site configuration"** in the left sidebar
   - Click **"Environment variables"**

4. **Add the New Secret Key**
   - Click **"Add a variable"**
   - **Variable name**: `SUPABASE_SECRET_KEY`
   - **Value**: Your secret key (starts with `sb_secret_`)
   - Click **"Add variable"**

5. **Verify Existing Variables**
   - Ensure these are already set:
     - `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `EXPO_PUBLIC_SUPABASE_KEY` - Your anon/public key
   
6. **Remove Legacy Key (Optional)**
   - If you have `SUPABASE_SERVICE_ROLE_KEY` set and it's causing errors, you can:
     - Keep it if legacy keys are still enabled in your Supabase project
     - Remove it if you're only using the new `sb_secret_` format
     - The functions will automatically prefer `SUPABASE_SECRET_KEY` if both are set

7. **Redeploy**
   - Go to **"Deploys"** tab
   - Click **"Trigger deploy"** → **"Clear cache and deploy site"**
   - Wait for deployment to complete

### Option 2: netlify.toml (Not Recommended)

⚠️ **Security Warning**: Don't commit secrets to version control!

If you must use `netlify.toml` for environment variables (e.g., for Netlify CLI development), add them like this:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  # These are safe to commit (public keys only)
  EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
  EXPO_PUBLIC_SUPABASE_KEY = "your-anon-key"

# Use netlify.toml[context] for secrets in CLI only
[context.dev.environment]
  SUPABASE_SECRET_KEY = "sb_secret_your_key_here"
```

**Important**: Never commit actual secret keys to Git! Use the Netlify dashboard instead.

## 🔍 Where to Find Your Secret Key

### Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your **WizNote** project
3. Navigate to **Settings** → **API**
4. Scroll down to **"Secret keys"** section (NEW - not "Project API keys")
5. Copy the key that starts with `sb_secret_`

### Visual Guide

```
Supabase Dashboard → Settings → API

Project API keys (OLD/LEGACY)
├── anon / public key ← Use for EXPO_PUBLIC_SUPABASE_KEY
└── service_role key ← DISABLED in most projects

Secret keys (NEW) ⭐
└── sb_secret_... ← Copy THIS for SUPABASE_SECRET_KEY
```

## ✅ Verify Your Setup

### Check Netlify Function Logs

After deploying, trigger the monthly usage reset and check the logs:

1. Go to **Netlify Dashboard** → **Functions** → **Logs**
2. Click **"manual-reset"** function
3. Look for this message:
   ```
   ✅ Using NEW Supabase Secret Key (sb_secret_...)
   ```

If you see this, you're good! ✅

### Test the Function

Run this in your browser console or use curl:

```bash
# Replace with your actual admin API key if configured
curl -X POST https://wiznote.app/.netlify/functions/manual-reset \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Manual usage reset completed",
  "resetCount": 123,
  "timestamp": "2025-10-30T..."
}
```

## 🔒 Security Checklist

- [ ] Secret key is stored in Netlify dashboard (not in code)
- [ ] Secret key starts with `sb_secret_` (new format)
- [ ] Never committed to Git
- [ ] Only used in Netlify functions (server-side)
- [ ] Old legacy keys removed from Netlify if no longer needed

## 🆘 Troubleshooting

### Error: "Legacy API keys are disabled"

**Cause**: Netlify is still using the old `SUPABASE_SERVICE_ROLE_KEY` format that's been disabled in your Supabase project.

**Solution**: 
1. Add `SUPABASE_SECRET_KEY` with your new `sb_secret_` key
2. Redeploy your Netlify site
3. The functions will automatically use the new key

### Error: "Missing Supabase environment variables"

**Cause**: Either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is missing in Netlify.

**Solution**:
1. Go to Netlify dashboard → Environment variables
2. Add `SUPABASE_SECRET_KEY=sb_secret_your_key`
3. Save and redeploy

### Error: "Invalid API key"

**Cause**: You copied the wrong key or the key is malformed.

**Solution**:
1. Verify you copied the entire key (should be very long)
2. Check it starts with `sb_secret_`
3. Make sure there are no extra spaces or newlines
4. Regenerate the key in Supabase if needed

### Still Seeing Old Key in Logs

**Cause**: Cached deployment or key not properly set.

**Solution**:
1. Go to Netlify dashboard → Deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait for deployment to complete
4. Check logs again - should now show "Using NEW Supabase Secret Key"

## 📚 Related Documentation

- [`SUPABASE_SECRET_KEY_QUICK_GUIDE.md`](./SUPABASE_SECRET_KEY_QUICK_GUIDE.md) - Quick setup
- [`SUPABASE_SECRET_KEYS_SETUP.md`](./SUPABASE_SECRET_KEYS_SETUP.md) - Detailed guide
- [`MONTHLY_USAGE_RESET_SETUP.md`](./MONTHLY_USAGE_RESET_SETUP.md) - Usage reset setup
- [Netlify Environment Variables Docs](https://docs.netlify.com/environment-variables/overview/)

---

**Last Updated**: October 2025  
**Status**: ✅ Active  
**Key Format**: `sb_secret_...` (new) preferred over `SUPABASE_SERVICE_ROLE_KEY` (legacy)

