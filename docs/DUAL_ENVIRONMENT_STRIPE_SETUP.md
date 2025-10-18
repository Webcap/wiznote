# 🎯 Dual Environment Stripe Setup Guide

Complete guide to setting up **separate TEST and PRODUCTION** Stripe environments for WizNote.

## 📋 Overview

This setup keeps your testing completely isolated from production:

| Environment | Stripe Guardian | Stripe Keys | Use Case |
|------------|----------------|-------------|----------|
| **🧪 Development** | Render | TEST keys (`sk_test_*`) | Local testing, fake cards |
| **🔴 Production** | Starlight Hyperlift | LIVE keys (`sk_live_*`) | Real customer payments |

---

## 🚀 Quick Start

### Step 1: Get Your Stripe Keys

#### **Test Keys (Development)**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle **"Test mode"** ON (orange banner at top)
3. Navigate to **Developers → API keys**
4. Copy:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

#### **Live Keys (Production)**
1. In Stripe Dashboard, toggle **"Test mode"** OFF
2. Navigate to **Developers → API keys**
3. Copy:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

⚠️ **IMPORTANT**: Keep LIVE keys extremely secure! Never commit them to Git.

---

## 🔧 Step 2: Configure WizNote App

### Create Development Environment File

Create `.env` (or `.env.development`) in your `wiznote-new` directory:

```bash
# Supabase (same for all environments)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY

# Web URL
EXPO_PUBLIC_WEB_URL=http://localhost:8081

# ========================================
# 🧪 STRIPE TEST KEYS
# ========================================
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET

# ========================================
# 🧪 STRIPE GUARDIAN TEST INSTANCE
# Point to your Render deployment (see Step 3)
# Format: https://your-service.onrender.com (NO /api)
# ========================================
EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL=https://YOUR_RENDER_SERVICE.onrender.com

# Other services
EXPO_PUBLIC_GEMINI_API_KEY=YOUR_KEY
NODE_ENV=development
DEBUG=true
```

### Create Production Environment File

Create `.env.production` in your `wiznote-new` directory:

```bash
# Supabase (same for all environments)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY

# Web URL
EXPO_PUBLIC_WEB_URL=https://wiznote.app

# ========================================
# 🔴 STRIPE LIVE KEYS
# ⚠️  THESE PROCESS REAL PAYMENTS!
# ========================================
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_WEBHOOK_SECRET

# ========================================
# 🔴 STRIPE GUARDIAN PRODUCTION
# Automatically uses: https://api.webcap.media/api
# No need to set EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL
# ========================================

# Other services
EXPO_PUBLIC_GEMINI_API_KEY=YOUR_KEY
NODE_ENV=production
DEBUG=false
```

---

## 🌐 Step 3: Deploy Stripe Guardian to Render

### Option A: Create New Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +" → "Web Service"**
3. Connect your `stripe-guardian` repository
4. Configure:
   - **Name**: `stripe-guardian-test` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### Option B: Use Existing Render Service

If you already have a Render service, you can use it! Just note the URL.

### Set Environment Variables in Render

Add these in your Render service settings:

```bash
# ========================================
# 🧪 STRIPE TEST KEYS (in Render)
# ========================================
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_TEST_WEBHOOK_SECRET

# Supabase credentials (same as your app)
WIZNOTE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY
# OR if using legacy keys:
WIZNOTE_SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY

# Server configuration
NODE_ENV=development
PORT=8080
```

### Get Your Render URL

After deployment, your service will be at:
```
https://YOUR-SERVICE-NAME.onrender.com
```

**Copy this URL** and use it in your `.env` file as `EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL`.

---

## 🔗 Step 4: Configure Stripe Webhooks

### Test Webhook (for Development)

1. In Stripe Dashboard, toggle **"Test mode"** ON
2. Go to **Developers → Webhooks**
3. Click **"Add endpoint"**
4. Enter: `https://YOUR_RENDER_SERVICE.onrender.com/api/stripe/webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Copy the **Signing secret** (`whsec_test_...`)
7. Add it to:
   - Render environment variables: `STRIPE_WEBHOOK_SECRET`
   - Your `.env` file: `STRIPE_WEBHOOK_SECRET`

### Live Webhook (for Production)

1. In Stripe Dashboard, toggle **"Test mode"** OFF
2. Go to **Developers → Webhooks**
3. Click **"Add endpoint"**
4. Enter: `https://api.webcap.media/api/stripe/webhook`
5. Select the same events as above
6. Copy the **Signing secret** (`whsec_live_...`)
7. Add it to:
   - Starlight Hyperlift environment variables
   - Your `.env.production` file

---

## 🧪 Step 5: Test Your Setup

### Test Development Environment

```bash
cd wiznote-new

# Start your development server
npm start

# Or for web
npm run web
```

**In your app console, you should see:**
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Webhook Base URL: https://YOUR_RENDER_SERVICE.onrender.com
   Stripe Mode: 🧪 TEST MODE
```

### Test with Fake Credit Cards

Use these [Stripe test cards](https://stripe.com/docs/testing):

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | ✅ Successful payment |
| `4000 0025 0000 3155` | ✅ Requires authentication |
| `4000 0000 0000 9995` | ❌ Declined |

**Use any:**
- Future expiry date (e.g., `12/34`)
- Any 3-digit CVC  
- Any ZIP code

### Verify Webhook Connectivity

```bash
# Test Render health check
curl https://YOUR_RENDER_SERVICE.onrender.com/api/health

# Test production health check
curl https://api.webcap.media/api/health
```

---

## 📱 Step 6: Build for Production

### Update Build Configuration

When building for production, ensure you're using the production environment variables:

```bash
# Build with production env
APP_VARIANT=production npm run build
```

Or configure in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "APP_VARIANT": "production",
        "NODE_ENV": "production"
      }
    },
    "development": {
      "env": {
        "APP_VARIANT": "development",
        "NODE_ENV": "development"
      }
    }
  }
}
```

---

## 🔍 Debugging

### Check Current Environment

Add this to any component:

```typescript
import { logApiConfig } from '@/constants/ApiConfig';

// In your component
useEffect(() => {
  logApiConfig();
}, []);
```

### Common Issues

#### ❌ Getting 404 from Stripe Guardian

**Problem**: `EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL` is not set or incorrect.

**Solution**: 
1. Check your `.env` file
2. Verify the Render URL (no `/api` suffix)
3. Restart your development server

#### ❌ Webhook signature verification failed

**Problem**: Wrong `STRIPE_WEBHOOK_SECRET` or mismatch between Stripe and your server.

**Solution**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Copy the **Signing secret**
4. Update environment variables in Render
5. Redeploy Render service

#### ❌ Still using TEST keys in production

**Problem**: `.env.production` not being used or build misconfigured.

**Solution**:
1. Check `APP_VARIANT` and `NODE_ENV` during build
2. Verify `.env.production` exists
3. Use `logApiConfig()` to check which keys are loaded

---

## 🎯 Summary

You now have:

✅ **Development Environment**:
- Uses Stripe TEST keys
- Points to Render Stripe Guardian
- Safe for testing with fake cards

✅ **Production Environment**:
- Uses Stripe LIVE keys
- Points to Starlight Hyperlift
- Processes real customer payments

✅ **Complete Isolation**:
- Test and production data never mix
- Can test freely without affecting customers
- Clear visibility into which environment you're using

---

## 🔗 Quick Reference

### Stripe Dashboard Links

- [Test Mode API Keys](https://dashboard.stripe.com/test/apikeys)
- [Live Mode API Keys](https://dashboard.stripe.com/apikeys)
- [Test Mode Webhooks](https://dashboard.stripe.com/test/webhooks)
- [Live Mode Webhooks](https://dashboard.stripe.com/webhooks)
- [Test Card Numbers](https://stripe.com/docs/testing)

### Service URLs

- **Test Stripe Guardian**: `https://YOUR_RENDER_SERVICE.onrender.com`
- **Production Stripe Guardian**: `https://api.webcap.media/api`
- **Render Dashboard**: https://dashboard.render.com
- **Starlight Hyperlift**: https://starlight.hyperlift.io

---

## 📞 Need Help?

If you encounter issues:

1. Check the [Stripe Testing Guide](https://stripe.com/docs/testing)
2. Review [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
3. Check Render logs for your test Stripe Guardian
4. Use `logApiConfig()` to verify configuration

---

**Last Updated**: October 2025

