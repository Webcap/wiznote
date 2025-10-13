# Stripe Subscription Cancellation Integration

## Overview

This document describes the implementation of Stripe subscription cancellation functionality that ensures users won't be charged in future billing cycles when they cancel their subscription.

## Changes Made

### 1. Stripe Guardian API Endpoints

Created two new endpoints in the Stripe Guardian service to handle subscription management:

#### `/api/stripe/cancel-subscription` 
- **Method**: POST
- **Purpose**: Cancels a subscription in Stripe at the end of the current billing period
- **Request Body**:
  ```json
  {
    "userId": "user-uuid",
    "subscriptionId": "sub_xxxxx"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Subscription will be canceled at the end of the current billing period...",
    "subscription": {
      "id": "sub_xxxxx",
      "status": "active",
      "cancel_at_period_end": true,
      "current_period_end": "2025-10-16T02:14:02.000Z",
      "canceled_at": "2025-10-13T..."
    }
  }
  ```

#### `/api/stripe/reactivate-subscription`
- **Method**: POST
- **Purpose**: Reactivates a subscription that was scheduled for cancellation
- **Request Body**:
  ```json
  {
    "userId": "user-uuid",
    "subscriptionId": "sub_xxxxx"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Subscription has been reactivated successfully...",
    "subscription": {
      "id": "sub_xxxxx",
      "status": "active",
      "cancel_at_period_end": false,
      "current_period_end": "2025-10-16T02:14:02.000Z"
    }
  }
  ```

### 2. Updated SubscriptionManagementService

**File**: `services/SubscriptionManagementService.ts`

#### Key Changes:

1. **Added Stripe Guardian URL configuration**:
   ```typescript
   private stripeGuardianUrl: string;
   
   private constructor() {
     this.stripeGuardianUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'https://api.webcap.media/api';
   }
   ```

2. **Updated `cancelSubscription()` method**:
   - Now calls the Stripe Guardian API to cancel in Stripe
   - Updates local database after Stripe confirms cancellation
   - Returns detailed error messages if cancellation fails

3. **Updated `reactivateSubscription()` method**:
   - Now calls the Stripe Guardian API to reactivate in Stripe
   - Updates local database after Stripe confirms reactivation
   - Returns detailed error messages if reactivation fails

### 3. Additional Improvements

#### Date Parsing
Added `parseDateSafely()` helper method to handle:
- "N/A" strings
- Invalid dates
- null/undefined values
- Provides sensible defaults based on plan interval

#### Billing Date Sync
Created scripts to sync billing dates from Stripe:
- `scripts/sync-billing-dates-from-stripe.js` - Syncs actual billing dates from Stripe
- `scripts/fix-billing-dates.js` - Fixes local "N/A" dates with calculated defaults

## How It Works

### Cancellation Flow

1. **User clicks "Cancel Subscription"** in the app
2. **Frontend calls** `subscriptionManagementService.cancelSubscription(userId)`
3. **Service calls** Stripe Guardian API at `/api/stripe/cancel-subscription`
4. **Stripe Guardian**:
   - Calls Stripe API: `stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })`
   - Updates user profile in Supabase with cancellation status
5. **User receives confirmation** that they won't be charged after current period ends
6. **User retains access** until the end of the current billing period

### Reactivation Flow

1. **User clicks "Reactivate Subscription"** in the app
2. **Frontend calls** `subscriptionManagementService.reactivateSubscription(userId)`
3. **Service calls** Stripe Guardian API at `/api/stripe/reactivate-subscription`
4. **Stripe Guardian**:
   - Calls Stripe API: `stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })`
   - Updates user profile in Supabase with active status
5. **User receives confirmation** that billing will continue

## Testing

### Manual Testing

Use the test script to verify cancellation works:

```bash
node scripts/test-cancel-subscription.js <user_id>
```

This script will:
1. Show current subscription status
2. Call the cancel API
3. Verify database was updated
4. Display summary of changes

### Testing Cancellation in Stripe Dashboard

1. Log into Stripe Dashboard
2. Go to **Customers** → Find the customer
3. View their **Subscriptions**
4. You should see "Cancels on [date]" if cancellation was successful

## Important Notes

### Security

- ✅ Stripe secret key is **never** exposed to the frontend
- ✅ All Stripe API calls go through the **Stripe Guardian** backend service
- ✅ CORS headers are properly configured for cross-origin requests

### User Experience

- ✅ Users **keep access** until the end of their paid period
- ✅ Users **won't be charged** after the period ends
- ✅ Users can **reactivate** anytime before the period ends
- ✅ Clear messages explain what will happen

### Data Consistency

- ✅ Stripe is the **source of truth** for subscription status
- ✅ Local database is updated after Stripe confirms changes
- ✅ Webhooks can further sync data when Stripe events occur

## Files Modified/Created

### Stripe Guardian (Backend)
- ✅ `stripe-guardian/api/stripe/cancel-subscription.js` (new)
- ✅ `stripe-guardian/api/stripe/reactivate-subscription.js` (new)

### Wiznote App (Frontend)
- ✅ `services/SubscriptionManagementService.ts` (modified)
- ✅ `scripts/sync-billing-dates-from-stripe.js` (new)
- ✅ `scripts/fix-billing-dates.js` (new)
- ✅ `scripts/test-cancel-subscription.js` (new)
- ✅ `scripts/import-stripe-plans.js` (new)
- ✅ `scripts/check-plan-by-stripe-price.js` (new)
- ✅ `scripts/test-get-subscription.js` (new)

## Environment Variables Required

Make sure these are set in your `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook/API Configuration
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://api.webcap.media/api

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next Steps

To fully deploy this feature:

1. ✅ Deploy the Stripe Guardian service with the new endpoints
2. ✅ Test cancellation in development
3. ✅ Test reactivation in development
4. ✅ Verify webhook handling for subscription updates
5. ✅ Test in production with a test subscription

## Support

If users have issues canceling:

1. Check Stripe Dashboard for subscription status
2. Check application logs for API errors
3. Verify Stripe Guardian is running and accessible
4. Confirm environment variables are set correctly
5. Use the test scripts to diagnose issues

---

**Last Updated**: October 13, 2025
**Version**: 1.0.0

