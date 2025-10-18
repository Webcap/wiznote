# Dual Stripe Guardian Setup

## Overview

Wiznote now uses **two separate Stripe Guardian instances** for different environments:

- **🟢 Production:** Starlight Hyperlift → `https://api.webcap.media/api`
- **🟡 Development:** Render → `https://stripe-guardian.onrender.com/api`

The app **automatically** selects the correct instance based on the build environment.

## How It Works

### Automatic URL Selection

The app uses `constants/ApiConfig.ts` to automatically select the correct Stripe Guardian instance:

```typescript
// Development builds (APP_VARIANT=development, __DEV__=true, or Expo Go)
→ https://stripe-guardian.onrender.com/api

// Production builds
→ https://api.webcap.media/api
```

### Environment Detection

The app is considered "development" if ANY of these are true:
- `APP_VARIANT === 'development'`
- `NODE_ENV === 'development'`
- Running in Expo Go (`Constants.appOwnership === 'expo'`)
- React Native dev mode (`__DEV__ === true`)

## Files Updated

### New Configuration File
- ✅ `constants/ApiConfig.ts` - Centralized API configuration

### Components Updated
- ✅ `components/PaymentSheetForm.native.tsx` - Mobile payment sheet
- ✅ `components/PaymentForm.tsx` - Web payment form
- ✅ `services/SubscriptionManagementService.ts` - Subscription management

### Admin Components Updated
- ✅ `app/admin-dashboard.tsx` - Admin dashboard monitoring
- ✅ `app/admin/enhanced-plans.tsx` - Plan synchronization
- ✅ `app/payment-success.tsx` - Payment verification

## Usage

### In Your Components

```typescript
import { ApiConfig } from '../constants/ApiConfig';

// Get the webhook base URL (automatically dev or prod)
const webhookUrl = ApiConfig.WEBHOOK_BASE_URL;

// Access specific endpoints
const createCheckout = ApiConfig.STRIPE.CREATE_CHECKOUT;

// Check environment
if (ApiConfig.IS_DEVELOPMENT) {
  console.log('Running in development mode');
}

// Debug: Log current configuration
import { logApiConfig } from '../constants/ApiConfig';
logApiConfig();
```

### Manual Override

If you need to override the automatic selection, set the environment variable:

```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://custom-url.com/api
```

This will override the automatic selection for ALL builds.

## Testing

### Development Build
```bash
# Build with development variant
npx expo start --dev-client

# or
APP_VARIANT=development npx expo start
```

**Should log:**
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Webhook Base URL: https://stripe-guardian.onrender.com/api
```

### Production Build
```bash
# Build for production
eas build --platform ios --profile production
```

**Should log:**
```
🔧 API Configuration:
   Environment: PRODUCTION
   Webhook Base URL: https://api.webcap.media/api
```

## Stripe Guardian Instances

### Production - Starlight Hyperlift

**URL:** `https://api.webcap.media/api`

**Configuration:**
- Platform: Starlight Hyperlift (Docker)
- Branch: `main` (auto-deploy)
- Uses: `Dockerfile`
- Environment: Production
- API Keys: NEW format (`sb_secret_...`)

**Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WIZNOTE_SUPABASE_URL=https://...supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_...
```

### Development - Render

**URL:** `https://stripe-guardian.onrender.com/api`

**Configuration:**
- Platform: Render
- Branch: `main` (manual deploy)
- Uses: `render.yaml` → `scripts/auto-stripe-guardian-render.js`
- Environment: Development
- API Keys: NEW format (`sb_secret_...`)

**Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
WIZNOTE_SUPABASE_URL=https://...supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_...
NODE_ENV=development
```

## Benefits

✅ **Automatic Environment Selection** - No manual configuration needed  
✅ **Safe Testing** - Development builds use test Stripe keys  
✅ **Isolated Environments** - Dev and prod data stay separate  
✅ **Easy Debugging** - Clear logs show which environment is being used  
✅ **Consistent Configuration** - Single source of truth in `ApiConfig.ts`

## Troubleshooting

### Wrong URL Being Used

**Check the logs:**
```
Using webhook base URL: <url> (Environment: DEV/PROD)
```

**If wrong environment detected:**
1. Check `APP_VARIANT` environment variable
2. Verify build configuration
3. Check if running in Expo Go (always dev)

### Manual Override Not Working

Make sure you set:
```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://your-url.com/api
```

And restart your development server:
```bash
npx expo start --clear
```

### Payment Errors

1. **Check logs** for which URL is being used
2. **Verify the Stripe Guardian instance** is running:
   - Dev: https://stripe-guardian.onrender.com/health
   - Prod: https://api.webcap.media/api/health
3. **Check environment variables** on both Guardian instances

## Migration Checklist

- [x] Create `constants/ApiConfig.ts`
- [x] Update `PaymentSheetForm.native.tsx`
- [x] Update `PaymentForm.tsx`
- [x] Update `SubscriptionManagementService.ts`
- [x] Update `admin-dashboard.tsx`
- [x] Update `admin/enhanced-plans.tsx`
- [x] Update `payment-success.tsx`
- [x] Update `env.template` documentation
- [ ] Test development build → should use Render
- [ ] Test production build → should use Starlight Hyperlift
- [ ] Verify Render instance has correct environment variables
- [ ] Verify Starlight Hyperlift instance has correct environment variables

## See Also

- `DEPLOYMENT_INFO.md` (in stripe-guardian repo) - Stripe Guardian deployment details
- `SUPABASE_DATABASE_FIX.md` (in stripe-guardian repo) - Database connection fix
- `constants/ApiConfig.ts` - API configuration source code

---

**Last Updated:** October 18, 2025  
**Status:** ✅ Implemented and ready for testing

