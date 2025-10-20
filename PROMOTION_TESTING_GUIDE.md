# Promotion System Testing Guide

## 🐛 Troubleshooting "Apply Offer" Not Working

### Quick Checklist

1. **Have you run the database migration?**
   ```sql
   -- In Supabase SQL Editor, run this file:
   database/promotions-setup.sql
   ```

2. **Have you created a test promotion?**
   - Go to `/admin/promotions`
   - Click "+ Create Promotion"
   - Fill in the form and save

3. **Check browser console for errors**
   - Open DevTools (F12)
   - Look for console.log messages starting with "Applying promotion:"
   - Look for any red errors

4. **Is the user logged in?**
   - The promotion system requires authentication
   - Check if `user` exists in your session

---

## 🧪 Step-by-Step Testing

### Step 1: Deploy Database Schema

```bash
# Copy the contents of database/promotions-setup.sql
# Paste into Supabase SQL Editor
# Run the query
```

You should see:
```
✅ Table promotions created
✅ Table promotion_interactions created
✅ Indexes created
✅ RLS policies created
✅ Helper functions created
```

### Step 2: Create a Test Promotion

1. Navigate to `/admin/promotions`
2. Click "+ Create Promotion"
3. Fill in:
   - **Name**: "Test Promotion - 30% Off"
   - **Description**: "This is a test promotion"
   - **Discount Type**: Percentage
   - **Discount Value**: 30
   - **Start Date**: Today (or earlier)
   - **End Date**: 7 days from now
   - **Target Segments**: Check "all"
   - **Max Per User**: 1
   - **Priority**: 100

4. Click "Create Promotion"

### Step 3: Verify in Database

In Supabase SQL Editor:
```sql
SELECT * FROM public.promotions;
```

You should see your test promotion.

### Step 4: Test as a User

#### Option A: Test with PromotionCard (Inline)
1. Go to `/join-premium`
2. You should see a promotion card at the top
3. Click "Apply Offer"
4. You should navigate to join-premium with the promotion applied

#### Option B: Test with PromotionModal (Popup)
1. Refresh the app or navigate to home
2. A modal should pop up (if modal is enabled in display_methods)
3. Click "Claim Offer"
4. Should navigate to join-premium

#### Option C: Test with PromotionBanner
1. Navigate through the app
2. Banner should appear at top or bottom
3. Click on the banner
4. Should navigate to join-premium

### Step 5: Check Console Logs

When you click "Apply Offer", you should see:
```
Applying promotion: Test Promotion - 30% Off <promotion-id>
Navigating to join-premium with params: { promotionId: "...", couponId: "..." }
```

---

## 🔍 Common Issues & Fixes

### Issue 1: No promotions showing up

**Cause**: Promotions table not created or no promotions in database

**Fix**:
```sql
-- Check if table exists
SELECT * FROM public.promotions LIMIT 1;

-- If error, run the setup file
-- database/promotions-setup.sql
```

### Issue 2: "Apply Offer" does nothing

**Possible causes**:
- User not logged in → Check `useAuth()` hook
- Navigation not working → Check console for errors
- Missing router import → Fixed in latest update

**Debug**:
```typescript
// In browser console, check:
console.log('User ID:', user?.id);
console.log('Eligible promotions:', eligiblePromotions);
```

### Issue 3: Promotion shows but discount not applied

**Cause**: Stripe coupon not created or not passed to checkout

**Fix**:
1. Check if promotion has `stripeCouponId` or `stripePriceId`
2. If not, you need to create Stripe coupon first
3. Use the `/api/stripe/create-coupon` endpoint

### Issue 4: User not eligible for promotions

**Cause**: User segment doesn't match target_segments

**Fix**:
- Set promotion target to "all" for testing
- Or check user's actual segment with:
```sql
SELECT * FROM user_profiles WHERE id = 'your-user-id';
```

---

## 🎯 Quick Test with SQL

Create a test promotion directly in Supabase:

```sql
INSERT INTO public.promotions (
  name,
  description,
  discount_type,
  discount_value,
  start_date,
  end_date,
  display_methods,
  target_segments,
  max_per_user,
  priority,
  is_active
) VALUES (
  'Quick Test - 25% Off',
  'Test promotion for debugging',
  'percentage',
  25.00,
  NOW(),
  NOW() + INTERVAL '7 days',
  '["modal", "banner", "inline"]'::jsonb,
  '["all"]'::jsonb,
  1,
  100,
  true
);
```

Then check:
```sql
SELECT * FROM public.promotions WHERE name LIKE 'Quick Test%';
```

---

## 🔧 Debug Mode

Add this to your component to debug:

```typescript
// In any component using usePromotions
const { eligiblePromotions, loading, error } = usePromotions(user?.id);

useEffect(() => {
  console.log('=== PROMOTION DEBUG ===');
  console.log('User ID:', user?.id);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Eligible Promotions:', eligiblePromotions);
  console.log('=======================');
}, [user, loading, error, eligiblePromotions]);
```

---

## ✅ Expected Behavior

When working correctly:

1. **On /admin/promotions**: Can create/edit promotions
2. **On /join-premium**: Promotion card appears above plans
3. **Click "Apply Offer"**: 
   - Console shows "Applying promotion..."
   - Navigates to /join-premium
   - URL includes `?promotionId=xxx`
   - Promotion card is highlighted/selected
4. **At checkout**: Discount is visible in payment form

---

## 💡 Next Steps

If still not working, please:

1. **Check browser console** - Share any error messages
2. **Verify database** - Confirm promotions table exists
3. **Check user auth** - Ensure you're logged in
4. **Share screenshots** - Of the promotion card and console

The system includes extensive logging - check the console for detailed info!

