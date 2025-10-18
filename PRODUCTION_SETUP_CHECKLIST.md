# ✅ Production + Development Setup Checklist

This checklist will help you set up **LIVE keys for production** and **TEST keys for development**.

## 📊 Current Status

✅ `.env` file created for development  
⏳ Need to fill in Stripe keys  
⏳ Need to configure Starlight Hyperlift for production  

---

## 🧪 Part 1: Development Environment (Local Testing)

### 1.1 Get Stripe TEST Keys

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Toggle **"Test mode"** ON (you'll see an orange "TEST DATA" banner)
- [ ] Go to **Developers → API keys**
- [ ] Copy your keys:
  - `pk_test_...` (Publishable key)
  - `sk_test_...` (Secret key)

### 1.2 Update Your .env File

Open `.env` in your `wiznote-new` folder and update these values:

```bash
# ========================================
# STRIPE CONFIGURATION - TEST KEYS
# ========================================
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_TEST_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_TEST_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_TEST_KEY

# Leave this empty for now (or set up Render - see Part 3)
EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL=
```

Also update your Supabase and other credentials if needed.

### 1.3 Test Development Environment

```bash
# Restart your dev server
npm start
```

**In console, verify you see:**
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Stripe Mode: 🧪 TEST MODE
   Webhook Base URL: https://api.webcap.media/api
```

⚠️ **Note**: Until you deploy to Render (Part 3), your dev environment will temporarily use the production Stripe Guardian. Make sure it has TEST keys configured in Starlight!

### 1.4 Test with Fake Credit Card

- [ ] Try creating a subscription in your app
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date (e.g., `12/34`)
- [ ] CVC: Any 3 digits (e.g., `123`)
- [ ] ZIP: Any 5 digits (e.g., `12345`)

✅ **Development environment ready!**

---

## 🔴 Part 2: Production Environment (Starlight Hyperlift)

### 2.1 Get Stripe LIVE Keys

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Toggle **"Test mode"** OFF (normal blue/purple interface)
- [ ] Go to **Developers → API keys**
- [ ] Copy your **LIVE** keys:
  - `pk_live_...` (Publishable key)
  - `sk_live_...` (Secret key)

⚠️ **CRITICAL**: These process REAL payments. Handle with extreme care!

### 2.2 Configure Starlight Hyperlift

1. Go to your Starlight Hyperlift dashboard
2. Navigate to your Stripe Guardian service settings
3. Update environment variables:

```bash
# ========================================
# STRIPE LIVE KEYS (PRODUCTION)
# ========================================
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET

# Supabase (same as development)
WIZNOTE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY

# Server configuration
NODE_ENV=production
PORT=8080
```

4. Save and redeploy the service

### 2.3 Configure LIVE Stripe Webhook

- [ ] In Stripe Dashboard (Test mode **OFF**)
- [ ] Go to **Developers → Webhooks**
- [ ] Click **"Add endpoint"**
- [ ] Enter: `https://api.webcap.media/api/stripe/webhook`
- [ ] Select events:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.payment_failed`
- [ ] Click **"Add endpoint"**
- [ ] Copy the **Signing secret** (`whsec_...` - starts WITHOUT "test")
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Starlight Hyperlift
- [ ] Redeploy

### 2.4 Verify Production Setup

Test the health endpoint:
```bash
curl https://api.webcap.media/api/health
```

Should return:
```json
{
  "status": "healthy",
  "environment": {
    "hasStripeKey": true,
    "hasWiznoteSupabaseUrl": true
  }
}
```

✅ **Production environment ready!**

---

## 🎯 Part 3: Optional - Deploy Render for Better Dev Isolation

**Why?** Right now your dev environment uses the production Stripe Guardian (just with TEST keys). For better isolation, deploy a separate Render instance.

### 3.1 Deploy to Render

Follow: [docs/RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md](./docs/RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md)

**Quick steps:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. New + → Web Service
3. Connect your `stripe-guardian` repository
4. Configure:
   - **Name**: `stripe-guardian-test`
   - **Start Command**: `node server.js`
   - **Health Check**: `/api/health`

### 3.2 Set Render Environment Variables

```bash
# Stripe TEST keys
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET

# Supabase
WIZNOTE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY

# Config
NODE_ENV=development
PORT=8080
```

### 3.3 Configure TEST Stripe Webhook

- [ ] In Stripe Dashboard (Test mode **ON**)
- [ ] Go to **Developers → Webhooks**
- [ ] Add endpoint: `https://YOUR-RENDER-SERVICE.onrender.com/api/stripe/webhook`
- [ ] Select same events as production
- [ ] Copy signing secret (`whsec_test_...`)
- [ ] Update Render environment variable

### 3.4 Update Your .env File

```bash
EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

### 3.5 Restart Dev Server

```bash
npm start
```

**Verify console shows:**
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Stripe Mode: 🧪 TEST MODE
   Webhook Base URL: https://YOUR-RENDER-SERVICE.onrender.com
```

✅ **Complete isolation achieved!**

---

## 🎉 Final Verification

### Development Checklist

- [ ] `.env` file has TEST Stripe keys (`pk_test_`, `sk_test_`)
- [ ] Dev server shows "🧪 TEST MODE" in console
- [ ] Can create subscriptions with test card `4242 4242 4242 4242`
- [ ] Webhooks working (check Stripe Dashboard → Events)

### Production Checklist

- [ ] Starlight Hyperlift has LIVE Stripe keys (`pk_live_`, `sk_live_`)
- [ ] LIVE webhook configured in Stripe
- [ ] Health endpoint responding: `https://api.webcap.media/api/health`
- [ ] Ready to accept real payments

### Safety Checks

- [ ] ✅ `.env` is in `.gitignore` (already done)
- [ ] ✅ Never committed LIVE keys to Git
- [ ] ✅ Development uses TEST keys only
- [ ] ✅ Production uses LIVE keys only
- [ ] ✅ Clear separation between environments

---

## 📚 Documentation Reference

- **Quick Start**: [docs/DUAL_ENVIRONMENT_QUICK_START.md](./docs/DUAL_ENVIRONMENT_QUICK_START.md)
- **Full Guide**: [docs/DUAL_ENVIRONMENT_STRIPE_SETUP.md](./docs/DUAL_ENVIRONMENT_STRIPE_SETUP.md)
- **Render Deployment**: [docs/RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md](./docs/RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md)
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe Webhooks**: https://stripe.com/docs/webhooks

---

## 🆘 Troubleshooting

### "Stripe sync failed (404)"

**In Development**:
- Check `EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL` is set correctly (if using Render)
- Or verify production Stripe Guardian has TEST keys temporarily

**In Production**:
- Verify Starlight Hyperlift is running
- Check `https://api.webcap.media/api/health`

### "Using wrong Stripe keys"

Check console output:
```bash
🔧 API Configuration:
   Stripe Mode: 🧪 TEST MODE  ← Development should show this
   Stripe Mode: 🔴 LIVE MODE  ← Production should show this
```

If wrong, verify:
- `.env` file has correct keys for development
- Starlight Hyperlift has correct keys for production
- Restarted dev server after changing `.env`

### "Webhook signature verification failed"

- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check you're using TEST secret for dev, LIVE secret for prod
- Redeploy after updating secrets

---

## 🎯 You're All Set!

You now have:
- ✅ **Development**: Safe testing with TEST Stripe keys
- ✅ **Production**: Real payments with LIVE Stripe keys
- ✅ **Isolation**: No risk of mixing test and production data
- ✅ **Visibility**: Clear indication of which mode you're in

**Happy building!** 🚀

---

**Questions?** Check the docs folder or review the setup guides.

