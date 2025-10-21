# Mobile App Configuration Fix

## 🎯 Problem Identified

Your mobile app is creating **TEST mode** SetupIntents but sending them to your **LIVE mode** Starlight backend, causing the error:

```
Payment failed: No such setupintent: 'seti_1SKYLCJCI2ZCT6sS12cpMYkM'
```

## 🔍 Root Cause

- **Development Environment**: Correctly uses Render TEST server
- **Mobile App Build**: Uses Starlight LIVE server (different configuration)

## 🔧 Solutions

### Option 1: Force Mobile App to Use Render TEST Server (Recommended for Development)

Add this to your mobile app's `.env` file:

```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://stripe-guardian.onrender.com/api
```

This will make your mobile app use the same TEST backend as your development environment.

### Option 2: Update Mobile App to Use LIVE Stripe Keys (For Production)

If you want your mobile app to work with Starlight (LIVE mode), update your mobile app's Stripe keys:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY_HERE
```

### Option 3: Check Your Mobile App's Actual Configuration

Run this in your mobile app to see what URLs it's actually using:

```javascript
import { ApiConfig } from './constants/ApiConfig';

console.log('Mobile App Configuration:');
console.log('Webhook Base URL:', ApiConfig.WEBHOOK_BASE_URL);
console.log('Create PaymentSheet URL:', ApiConfig.STRIPE.CREATE_PAYMENTSHEET);
console.log('Confirm PaymentSheet URL:', ApiConfig.STRIPE.CONFIRM_PAYMENTSHEET);
```

## 🧪 Testing

After making changes:

1. **Restart your mobile app** (environment variables are loaded at build time)
2. **Try the subscription flow again**
3. **Check the logs** to see which URLs are being used

## 📋 Quick Fix Commands

### For Development (Use Render TEST server):
```bash
# Add to your .env file
echo "EXPO_PUBLIC_WEBHOOK_BASE_URL=https://stripe-guardian.onrender.com/api" >> .env
```

### For Production (Use Starlight LIVE server):
```bash
# Update your Stripe keys to LIVE mode
# (You'll need to get your LIVE publishable key from Stripe dashboard)
```

## ✅ Verification

After applying the fix, the SetupIntent should be created and confirmed using the same Stripe mode, eliminating the "No such setupintent" error.

---

**Recommended Approach**: Use Option 1 (Render TEST server) for development, then switch to Option 2 (LIVE keys) when ready for production.



