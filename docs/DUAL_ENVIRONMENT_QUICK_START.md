# ⚡ Dual Environment Quick Start

**5-minute setup guide** for separate TEST and PRODUCTION Stripe environments.

## 🎯 What You're Setting Up

```
┌─────────────────────────────────────────────────────┐
│  DEVELOPMENT (Local Testing)                        │
│  • Stripe TEST keys (pk_test_*, sk_test_*)         │
│  • Render Stripe Guardian                           │
│  • Fake credit cards                                │
│  • Safe to experiment                               │
└─────────────────────────────────────────────────────┘
                        ↓ Build
┌─────────────────────────────────────────────────────┐
│  PRODUCTION (Live App)                              │
│  • Stripe LIVE keys (pk_live_*, sk_live_*)         │
│  • Starlight Hyperlift Stripe Guardian              │
│  • Real payments                                     │
│  • Customer data                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

### 1️⃣ Get Stripe TEST Keys (2 minutes)

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- [ ] Toggle **"Test mode"** ON (orange banner)
- [ ] Go to **Developers → API keys**
- [ ] Copy `pk_test_...` and `sk_test_...`

### 2️⃣ Configure Your Local .env (2 minutes)

Edit `.env` in `wiznote-new`:

```bash
# Use TEST keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY

# Point to Render (once deployed)
EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL=https://YOUR-SERVICE.onrender.com
```

### 3️⃣ Deploy Stripe Guardian to Render (5 minutes)

Follow: [RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md](./RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md)

**Quick version**:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. New + → Web Service
3. Connect `stripe-guardian` repo
4. Name: `stripe-guardian-test`
5. Start Command: `node server.js`
6. Add environment variables (TEST Stripe keys)
7. Deploy!

### 4️⃣ Configure Stripe Webhook (2 minutes)

- [ ] In Stripe Dashboard (Test mode)
- [ ] Go to **Developers → Webhooks**
- [ ] Add endpoint: `https://YOUR-SERVICE.onrender.com/api/stripe/webhook`
- [ ] Select events: `checkout.session.completed`, `customer.subscription.*`
- [ ] Copy signing secret
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Render

### 5️⃣ Test It! (2 minutes)

```bash
cd wiznote-new
npm start
```

In console, verify:
```
🔧 API Configuration:
   Environment: DEVELOPMENT
   Webhook Base URL: https://YOUR-SERVICE.onrender.com
   Stripe Mode: 🧪 TEST MODE
```

Try a test payment with: `4242 4242 4242 4242`

---

## 🔴 Production Setup (Later)

When ready for real payments:

1. Get Stripe LIVE keys (Test mode OFF)
2. Create `.env.production`:
   ```bash
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
   STRIPE_SECRET_KEY=sk_live_YOUR_KEY
   # No EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL needed
   # Automatically uses Starlight Hyperlift
   ```
3. Configure LIVE webhook in Stripe → `https://api.webcap.media/api/stripe/webhook`
4. Build with production config

---

## 📚 Full Documentation

Need more details? See:

- [DUAL_ENVIRONMENT_STRIPE_SETUP.md](./DUAL_ENVIRONMENT_STRIPE_SETUP.md) - Complete guide
- [RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md](./RENDER_STRIPE_GUARDIAN_DEPLOYMENT.md) - Render deployment
- [Stripe Testing Guide](https://stripe.com/docs/testing) - Test cards and scenarios

---

## 🆘 Troubleshooting

### ❌ "Stripe sync failed (404)"

**Fix**: Set `EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL` in your `.env` file

### ❌ "Webhook signature verification failed"

**Fix**: Update `STRIPE_WEBHOOK_SECRET` in Render to match Stripe Dashboard

### ❌ Still seeing production URL

**Fix**: Restart your dev server after changing `.env`

---

## 🎉 That's It!

You now have:
- ✅ Separate test and production environments
- ✅ Safe testing with fake credit cards
- ✅ Zero risk to production data
- ✅ Clear visibility into which mode you're in

**Happy testing!** 🚀

