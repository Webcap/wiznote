# Stripe Price Mismatch Fix Guide

## 🔍 Problem Identified

**Error:** `No such price: 'price_1SKY2EJOYGB6eofbLZzNjKOR'`

**Root Cause:**
- Your database plan "Monthly" uses Stripe price ID: `price_1SKY2EJOYGB6eofbLZzNjKOR`
- This price ID exists in your **TEST MODE** Stripe account
- Your production (Starlight/Spaceship Hyperlift) uses **LIVE MODE** Stripe keys
- When users try to subscribe, stripe-guardian looks for this price in LIVE mode and fails

## 🎯 Solution Options

### Option 1: Create the Price in LIVE Mode Stripe (Recommended)

1. **Go to Stripe Dashboard (LIVE MODE)**
   - Visit: https://dashboard.stripe.com/prices
   - Make sure toggle in top-left is set to "**Live**" (not Test)

2. **Create a New Price**
   - Product: Create or select "Monthly" product
   - Price: $9.99
   - Billing: Recurring - Monthly
   - Click "Save price"

3. **Copy the LIVE Price ID**
   - It will start with `price_1...` (different from your test one)
   - Example: `price_1SomeOtherIdHere...`

4. **Update Your Database Plan**
   ```powershell
   # In PowerShell
   node scripts/update-plan-stripe-price.js 84a7907d-f673-4d98-bc08-3877fbd78c3f price_1YourNewLivePriceId
   ```

### Option 2: Use an Existing LIVE Price (Faster)

1. **Check What LIVE Prices You Have**
   
   Two ways to do this:
   
   **A. Via Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/prices
   - Toggle to "**Live**" mode
   - Look for a $9.99/month price

   **B. Via Script (if you have live key handy):**
   ```powershell
   # Set your live Stripe key temporarily
   $env:STRIPE_LIVE_KEY="sk_live_YOUR_LIVE_KEY_HERE"
   node scripts/check-live-prices.js
   ```

2. **Update Your Database**
   ```powershell
   node scripts/update-plan-stripe-price.js 84a7907d-f673-4d98-bc08-3877fbd78c3f price_1YourExistingLivePrice
   ```

### Option 3: Switch Production to TEST Mode (Not Recommended for Production)

Only do this if Starlight is actually a staging/test environment:

1. Update Starlight environment variables:
   - `STRIPE_SECRET_KEY=sk_test_...` (your test key)
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...` (your test publishable key)

2. Restart the Starlight deployment

⚠️ **Warning:** This means all payments will be test transactions only!

## 📋 Step-by-Step Fix (Recommended Path)

### Step 1: Find Your LIVE Price

Go to Stripe Dashboard → Toggle to **"Live"** mode → Prices:
https://dashboard.stripe.com/prices

Look for a price that matches your plan ($9.99/month).

**Don't have one?** Create it:
1. Click "**+ New**"
2. Select or create product "Monthly"  
3. Set price $9.99, recurring monthly
4. Click "Save"
5. Copy the price ID (starts with `price_1...`)

### Step 2: Update Database

```powershell
# In your wiznote-new directory
node scripts/update-plan-stripe-price.js 84a7907d-f673-4d98-bc08-3877fbd78c3f price_1YourLivePriceId
```

Replace `price_1YourLivePriceId` with the actual live price ID from Step 1.

### Step 3: Verify

```powershell
# Check the plan was updated
node scripts/list-plans.js
```

Look for the "Monthly" plan and verify it now shows the correct LIVE price ID.

### Step 4: Test

Try subscribing to the plan in your app. The error should be gone!

## 🔍 Verify Your Current Plans

```powershell
node scripts/list-plans.js
```

Output should show:
```
Plan 3: Monthly
   ID: 84a7907d-f673-4d98-bc08-3877fbd78c3f
   Price: $9.99/monthly
   Status: ✅ Active
   Stripe Synced: ✅ price_1[NEW_LIVE_ID]  ← Should be different now
```

## 🎓 Understanding TEST vs LIVE Mode

| Mode | Secret Key Format | Price ID Format | Use Case |
|------|------------------|----------------|----------|
| **TEST** | `sk_test_...` | `price_test_...` or `price_1...` | Development, Testing |
| **LIVE** | `sk_live_...` | `price_1...` | Production, Real payments |

**Your Setup:**
- Frontend (wiznote-new): TEST mode ✅ (fine for development)
- Backend (stripe-guardian on Starlight): LIVE mode ✅ (correct for production)
- Database plans: Must use **LIVE** price IDs to match production backend

## 📞 Need Help?

If you're still seeing errors after updating:

1. Check the stripe-guardian logs on Starlight
2. Verify the price ID was actually updated in database
3. Make sure the price is **active** in Stripe dashboard
4. Confirm stripe-guardian is using your LIVE Stripe keys

## ✅ Checklist

- [ ] Found or created $9.99/month price in LIVE mode Stripe
- [ ] Copied the LIVE price ID
- [ ] Ran update script with correct plan ID and price ID
- [ ] Verified plan shows new price ID with `list-plans.js`
- [ ] Tested subscription flow in app
- [ ] Error is gone! 🎉

---

**Quick Fix Command (once you have the live price ID):**

```powershell
node scripts/update-plan-stripe-price.js 84a7907d-f673-4d98-bc08-3877fbd78c3f price_1YourLivePriceIdHere
```


