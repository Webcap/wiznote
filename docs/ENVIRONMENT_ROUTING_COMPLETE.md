# ✅ Environment-Based Routing Complete

## Summary

Wiznote now **automatically routes** to the correct Stripe Guardian instance based on the build environment.

## 🎯 How It Works

### Development Builds
- **Detects:** `APP_VARIANT=development`, `__DEV__=true`, Expo Go, or `NODE_ENV=development`
- **Routes to:** `https://stripe-guardian.onrender.com/api` (Render)
- **Uses:** Stripe TEST keys

### Production Builds
- **Detects:** None of the above conditions
- **Routes to:** `https://api.webcap.media/api` (Starlight Hyperlift)
- **Uses:** Stripe LIVE keys

## 📝 Changes Made

### New Files Created
1. ✅ `constants/ApiConfig.ts` - Smart environment detection & routing
2. ✅ `docs/DUAL_STRIPE_GUARDIAN_SETUP.md` - Complete setup guide
3. ✅ `DUAL_ENVIRONMENT_SETUP.md` - Quick reference

### Files Updated (7)
1. ✅ `components/PaymentSheetForm.native.tsx`
2. ✅ `components/PaymentForm.tsx`
3. ✅ `services/SubscriptionManagementService.ts`
4. ✅ `app/admin-dashboard.tsx`
5. ✅ `app/admin/enhanced-plans.tsx`
6. ✅ `app/payment-success.tsx`
7. ✅ `env.template`

### What Changed
- Replaced all hardcoded URLs with `ApiConfig.WEBHOOK_BASE_URL`
- Added environment logging for debugging
- Removed dependency on `EXPO_PUBLIC_WEBHOOK_BASE_URL` environment variable (now optional override)

## 🧪 Testing

### Check Console Logs

When you start the app, you'll see:

**Development:**
```
Using webhook base URL: https://stripe-guardian.onrender.com/api (Environment: DEV)
SubscriptionManagementService: Using Stripe Guardian URL: https://stripe-guardian.onrender.com/api (Environment: DEV)
```

**Production:**
```
Using webhook base URL: https://api.webcap.media/api (Environment: PROD)
SubscriptionManagementService: Using Stripe Guardian URL: https://api.webcap.media/api (Environment: PROD)
```

### Manual Test

Add to any component:
```typescript
import { logApiConfig } from '../constants/ApiConfig';

useEffect(() => {
  logApiConfig();
}, []);
```

## 🔧 Stripe Guardian Instances

### Production (Starlight Hyperlift)
- ✅ URL: https://api.webcap.media
- ✅ Status: Running
- ✅ Auto-deploy: ON (from `main` branch)
- ✅ API Keys: NEW format (`sb_secret_...`)

### Development (Render)
- ✅ URL: https://stripe-guardian.onrender.com
- ✅ Status: Running ([verified](https://stripe-guardian.onrender.com/health))
- ⏳ Auto-deploy: OFF (manual deploys only)
- ✅ API Keys: NEW format (`sb_secret_...`)

## 🎓 Usage Examples

### In a Component
```typescript
import { ApiConfig } from '../constants/ApiConfig';

// Use the auto-selected URL
const createPayment = async () => {
  const response = await fetch(ApiConfig.STRIPE.CREATE_CHECKOUT, {
    method: 'POST',
    // ...
  });
};

// Check environment
if (ApiConfig.IS_DEVELOPMENT) {
  console.log('Testing payment with test keys');
}
```

### Manual Override (Optional)
```env
# Force a specific URL (bypasses automatic selection)
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://custom-guardian.com/api
```

## ✅ Benefits

- 🎯 **Zero Configuration** - Works automatically
- 🔒 **Safe Testing** - Dev never touches production data
- 🐛 **Easy Debugging** - Clear environment logs
- 🚀 **Production Ready** - Stable Starlight instance for live traffic
- 🧪 **Isolated Testing** - Render instance for development

## 📊 Current Status

| Component | Status | Environment Detection | Logging |
|-----------|--------|----------------------|---------|
| Payment Sheet (Mobile) | ✅ | Yes | Yes |
| Payment Form (Web) | ✅ | Yes | Yes |
| Subscription Service | ✅ | Yes | Yes |
| Admin Dashboard | ✅ | Yes | No |
| Enhanced Plans | ✅ | Yes | No |
| Payment Success | ✅ | Yes | Yes |

## 🚨 Important Notes

1. **No .env changes needed** - Automatic detection handles everything
2. **Logs show environment** - Look for `(Environment: DEV)` or `(Environment: PROD)`
3. **Test keys safe** - Development builds never use live Stripe keys
4. **Manual override available** - Set `EXPO_PUBLIC_WEBHOOK_BASE_URL` if needed

## 🔗 Related Documentation

- `docs/DUAL_STRIPE_GUARDIAN_SETUP.md` - Detailed technical guide
- `constants/ApiConfig.ts` - Source code & implementation
- `stripe-guardian/DEPLOYMENT_INFO.md` - Stripe Guardian deployment details

---

**Status:** ✅ Complete - Ready for testing  
**Date:** October 18, 2025  
**No Breaking Changes** - Backward compatible with manual URL override

