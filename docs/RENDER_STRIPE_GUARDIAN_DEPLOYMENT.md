# 🚀 Render Stripe Guardian Deployment Guide

Quick guide to deploy a **TEST** Stripe Guardian instance to Render.

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Render account ([sign up free](https://dashboard.render.com))
- [ ] `stripe-guardian` code pushed to GitHub
- [ ] Stripe TEST keys ready

---

## 🌐 Step 1: Deploy to Render

### Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +" → "Web Service"**
3. Click **"Connect account"** if you haven't connected GitHub
4. Select your `stripe-guardian` repository
5. Click **"Connect"**

### Configure Service

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `stripe-guardian-test` (or your choice) |
| **Region** | Choose closest to you |
| **Branch** | `main` (or your branch) |
| **Root Directory** | Leave empty |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

### Health Check Path

Scroll down to **"Health Check Path"** and enter:
```
/api/health
```

---

## 🔐 Step 2: Set Environment Variables

In the **"Environment Variables"** section, add:

### Required Variables

```bash
# Stripe TEST keys
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET

# Supabase credentials
WIZNOTE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
WIZNOTE_SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY

# Server configuration
NODE_ENV=development
PORT=8080
```

### Get These Values

**Stripe TEST Keys**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle **"Test mode"** ON
3. Go to **Developers → API keys**
4. Copy `sk_test_...`

**Stripe Webhook Secret** (temporary):
- Use a placeholder for now: `whsec_test_placeholder`
- We'll update this after creating the webhook endpoint

**Supabase Credentials**:
- Copy from your WizNote app's `.env` file
- Or get from [Supabase Dashboard](https://supabase.com/dashboard)

---

## 🚀 Step 3: Deploy

1. Click **"Create Web Service"** at the bottom
2. Render will start building and deploying
3. Wait 2-5 minutes for deployment to complete
4. Your service will be available at:
   ```
   https://YOUR-SERVICE-NAME.onrender.com
   ```

---

## ✅ Step 4: Verify Deployment

### Test Health Endpoint

Open in browser or use curl:
```bash
curl https://YOUR-SERVICE-NAME.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T...",
  "environment": {
    "nodeEnv": "development",
    "hasStripeKey": true,
    "hasWiznoteSupabaseUrl": true,
    "hasWiznoteSupabaseKey": true,
    "port": 8080
  }
}
```

### Test Ready Endpoint

```bash
curl https://YOUR-SERVICE-NAME.onrender.com/api/ready
```

Expected response:
```json
{
  "ok": true,
  "status": "ready",
  "checks": {
    "database": true,
    "stripe": true
  }
}
```

---

## 🔗 Step 5: Configure Stripe Webhook

Now that your Render service is live, set up the webhook:

### Create Webhook in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle **"Test mode"** ON
3. Go to **Developers → Webhooks**
4. Click **"Add endpoint"**
5. Enter endpoint URL:
   ```
   https://YOUR-SERVICE-NAME.onrender.com/api/stripe/webhook
   ```
6. Click **"Select events"**
7. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
8. Click **"Add events"**
9. Click **"Add endpoint"**

### Update Webhook Secret

1. In Stripe, click on your newly created webhook endpoint
2. Copy the **Signing secret** (starts with `whsec_test_...`)
3. Go back to your Render service
4. Go to **"Environment"** tab
5. Find `STRIPE_WEBHOOK_SECRET`
6. Click **"Edit"** and paste the real signing secret
7. Click **"Save Changes"**
8. Your service will automatically redeploy

---

## 🧪 Step 6: Test the Integration

### Update WizNote Configuration

1. Open your `wiznote-new` project
2. Edit your `.env` file:
   ```bash
   EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL=https://YOUR-SERVICE-NAME.onrender.com
   ```
3. Restart your development server

### Test a Payment

1. Start your WizNote app
2. Check console output:
   ```
   🔧 API Configuration:
      Environment: DEVELOPMENT
      Webhook Base URL: https://YOUR-SERVICE-NAME.onrender.com
      Stripe Mode: 🧪 TEST MODE
   ```
3. Try creating a subscription
4. Use test card: `4242 4242 4242 4242`
5. Check Render logs for webhook events

---

## 📊 Step 7: Monitor Your Service

### View Logs

1. In Render Dashboard, click on your service
2. Go to **"Logs"** tab
3. Watch for:
   - Health checks (every ~30 seconds)
   - Incoming webhook events
   - Any errors

### Common Log Messages

**Good:**
```
POST /api/stripe/webhook
✅ Webhook signature verified
✅ Subscription created successfully
```

**Needs attention:**
```
❌ Webhook signature verification failed
❌ Database connection error
```

---

## 🔧 Troubleshooting

### Service Won't Start

**Check**:
- Environment variables are set correctly
- Build logs for errors
- Start command is `node server.js`

### Webhook Signature Failures

**Fix**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Make sure you're using TEST mode webhook secret
3. Redeploy service after updating

### Service Keeps Sleeping (Free Plan)

**Behavior**: Free Render services sleep after 15 minutes of inactivity

**Solutions**:
- Upgrade to paid plan ($7/month)
- Use [UptimeRobot](https://uptimerobot.com) to ping your service every 5 minutes
- Accept the sleep behavior for development

### Database Connection Issues

**Check**:
- `WIZNOTE_SUPABASE_URL` is correct
- `WIZNOTE_SUPABASE_SECRET_KEY` has proper permissions
- Supabase project is active

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Service deployed and healthy
2. ✅ Webhook configured in Stripe
3. ✅ WizNote app configured to use test instance
4. ✅ Test payments working

**Now you can:**
- Test subscription flows safely
- Debug webhook handling
- Develop new payment features
- Keep production data isolated

---

## 📝 Service Information

Save these for reference:

| Item | Value |
|------|-------|
| **Service URL** | `https://YOUR-SERVICE-NAME.onrender.com` |
| **Health Check** | `https://YOUR-SERVICE-NAME.onrender.com/api/health` |
| **Webhook URL** | `https://YOUR-SERVICE-NAME.onrender.com/api/stripe/webhook` |
| **Dashboard** | https://dashboard.render.com |
| **Environment** | TEST (development) |
| **Stripe Mode** | Test mode with `sk_test_*` keys |

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Support](https://render.com/docs/support)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

## 💡 Pro Tips

1. **Name your service clearly**: Use `-test` or `-dev` suffix to distinguish from production
2. **Monitor logs initially**: Watch for the first few webhook events to ensure everything works
3. **Keep secrets secure**: Never commit environment variables to Git
4. **Test thoroughly**: Use various test cards to verify all scenarios
5. **Document your URL**: Save the Render URL in your project docs for your team

---

**Ready to deploy? Click "Create Web Service" and you'll be live in minutes!** 🚀

