# 🚀 Dual Environment Setup Complete

## ✅ What's Been Configured

Wiznote now automatically uses different Stripe Guardian instances based on build environment:

### 🟢 Production Builds
- **URL:** `https://api.webcap.media/api`
- **Platform:** Starlight Hyperlift (Docker)
- **Stripe Keys:** Live keys
- **When:** Production builds, app store builds

### 🟡 Development Builds  
- **URL:** `https://stripe-guardian.onrender.com/api`
- **Platform:** Render
- **Stripe Keys:** Test keys
- **When:** Dev builds, Expo Go, local development

## How It Works

### Automatic Detection

The app checks these conditions (in order):
1. `process.env.APP_VARIANT === 'development'` → DEV
2. `process.env.NODE_ENV === 'development'` → DEV
3. Running in Expo Go (`Constants.appOwnership === 'expo'`) → DEV
4. React Native dev mode (`__DEV__ === true`) → DEV
5. Otherwise → PROD

### New Configuration Module

**File:** `constants/ApiConfig.ts`

**Exports:**
- `ApiConfig.WEBHOOK_BASE_URL` - Auto-selected URL
- `ApiConfig.IS_DEVELOPMENT` - Boolean flag
- `ApiConfig.STRIPE.*` - All Stripe endpoints
- `ApiConfig.HEALTH.*` - Health check endpoints
- `logApiConfig()` - Debug helper

## Files Updated

### Wiznote App (7 files)
1. ✅ `constants/ApiConfig.ts` - NEW: Environment-aware config
2. ✅ `components/PaymentSheetForm.native.tsx` - Mobile payments
3. ✅ `components/PaymentForm.tsx` - Web payments
4. ✅ `services/SubscriptionManagementService.ts` - Subscription management
5. ✅ `app/admin-dashboard.tsx` - Admin monitoring
6. ✅ `app/admin/enhanced-plans.tsx` - Plan sync
7. ✅ `app/payment-success.tsx` - Payment verification
8. ✅ `env.template` - Updated documentation

### Stripe Guardian (5 files)
1. ✅ `.dockerignore` - Removed `server/` exclusion
2. ✅ `Dockerfile` - Added `server/` directory
3. ✅ `scripts/auto-stripe-guardian-render.js` - Updated for Render dev
4. ✅ `render.yaml` - Configured for dev deployment
5. ✅ `DEPLOYMENT_INFO.md` - Platform documentation

## Testing

### Check Which Environment You're Using

Add this to any component:
```typescript
import { logApiConfig } from '../constants/ApiConfig';

// In your component
useEffect(() => {
  logApiConfig();
}, []);
```

### Expected Console Output

**Development:**
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Webhook Base URL: https://stripe-guardian.onrender.com/api
   APP_VARIANT: development
   NODE_ENV: development
   __DEV__: true
```

**Production:**
```
🔧 API Configuration:
   Environment: PRODUCTION
   Webhook Base URL: https://api.webcap.media/api
   APP_VARIANT: production
   NODE_ENV: production
   __DEV__: false
```

## Manual Override (Optional)

To force a specific URL regardless of environment:

**.env file:**
```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://custom-url.com/api
```

This overrides the automatic selection.

## Build Commands

### Development Build
```bash
# Start development server
npx expo start

# Build development variant
APP_VARIANT=development eas build --platform ios --profile development
```

### Production Build
```bash
# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Stripe Guardian Setup

### Production Instance (Starlight Hyperlift)

**Already configured:**
- ✅ Auto-deploys from `main` branch
- ✅ Uses Docker
- ✅ Environment variables set
- ✅ Running at: https://api.webcap.media

### Development Instance (Render)

**To set up:**

1. **Create Render Service** (if not already created)
   - Use `render.yaml` as blueprint
   - Name: `stripe-guardian-dev`
   - Auto-deploy: OFF (manual only)

2. **Set Environment Variables** on Render:
   ```env
   STRIPE_SECRET_KEY=sk_test_...           # TEST key
   STRIPE_WEBHOOK_SECRET=whsec_test_...    # TEST webhook
   WIZNOTE_SUPABASE_URL=https://...supabase.co
   WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_...
   NODE_ENV=development
   ```

3. **Verify it's running:**
   - Visit: https://stripe-guardian.onrender.com/health
   - Should return: `{"status": "healthy", ...}`

## Environment Variables Needed

### For Render (Development)
```env
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook
WIZNOTE_SUPABASE_URL=https://your-project.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_your_key
NODE_ENV=development
```

### For Starlight Hyperlift (Production)
```env
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook
WIZNOTE_SUPABASE_URL=https://your-project.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_your_key
NODE_ENV=production
```

## Logs to Watch For

### Successful Configuration
```
✅ Using NEW WIZNOTE_SUPABASE Secret Key (sb_secret_...)
Using webhook base URL: https://stripe-guardian.onrender.com/api (Environment: DEV)
SubscriptionManagementService: Using Stripe Guardian URL: https://stripe-guardian.onrender.com/api (Environment: DEV)
```

### Errors

❌ **"Legacy API keys are disabled"**
- Fix: Update Supabase environment variables to new format

❌ **"Cannot find module '../server/lib/supabase-admin'"**
- Fix: Ensure `server/` directory is in Dockerfile and NOT in `.dockerignore`

❌ **"Database error while checking user"**
- Fix: Verify `WIZNOTE_SUPABASE_*` environment variables are set

## Benefits

✅ **Safe Testing** - Dev builds never touch production Stripe data  
✅ **No Manual Switching** - Automatic environment detection  
✅ **Clear Separation** - Test vs Live Stripe keys in different instances  
✅ **Better Debugging** - Logs show which environment is active  
✅ **Production Safety** - Production always uses stable Starlight instance

## Quick Reference

| Aspect | Development | Production |
|--------|-------------|------------|
| **Platform** | Render | Starlight Hyperlift |
| **URL** | stripe-guardian.onrender.com | api.webcap.media |
| **Stripe Keys** | Test (`sk_test_`) | Live (`sk_live_`) |
| **Auto-Deploy** | Manual | Automatic |
| **Build Type** | Dev/Debug | Release |
| **Environment** | `development` | `production` |

---

**Status:** ✅ Complete and ready for testing  
**Created:** October 18, 2025  
**See Also:** `docs/DUAL_STRIPE_GUARDIAN_SETUP.md` for detailed documentation

