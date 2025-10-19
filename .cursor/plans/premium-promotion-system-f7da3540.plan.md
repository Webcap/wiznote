<!-- f7da3540-7c1d-4f54-b405-6c271593bc1a 9b498422-cb8e-4126-8c33-aba07be35d91 -->
# Premium Promotion System

## Overview

Create a dynamic promotional system that allows admin to create, schedule, and manage premium promotions with multiple display touchpoints, Stripe integration, and user segmentation.

## Database Schema

### 1. Create promotions table (`database/promotions-setup.sql`)

```sql
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'special_price')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  -- Stripe integration
  stripe_coupon_id VARCHAR(255), -- Stripe coupon/promo code ID
  stripe_price_id VARCHAR(255), -- Alternative: discounted price ID
  
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Display configuration
  display_methods JSONB DEFAULT '["modal", "banner", "inline"]'::jsonb,
  modal_config JSONB DEFAULT '{}'::jsonb, -- Modal popup settings
  banner_config JSONB DEFAULT '{}'::jsonb, -- Banner settings
  inline_config JSONB DEFAULT '{}'::jsonb, -- In-page promotion settings
  
  -- Targeting
  target_segments JSONB DEFAULT '["all"]'::jsonb, -- ['new_users', 'free_users', 'near_limit', 'inactive']
  target_conditions JSONB DEFAULT '{}'::jsonb, -- Additional targeting rules
  
  -- Usage limits
  max_redemptions INTEGER, -- NULL = unlimited
  current_redemptions INTEGER DEFAULT 0,
  max_per_user INTEGER DEFAULT 1,
  
  -- Priority (higher = shown first)
  priority INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table for tracking user interactions with promotions
CREATE TABLE IF NOT EXISTS public.promotion_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'viewed', 'dismissed', 'clicked', 'redeemed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(promotion_id, user_id, action)
);

-- Indexes
CREATE INDEX idx_promotions_active ON public.promotions(is_active, start_date, end_date);
CREATE INDEX idx_promotions_priority ON public.promotions(priority DESC);
CREATE INDEX idx_promotion_interactions_user ON public.promotion_interactions(user_id, promotion_id);

-- RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_interactions ENABLE ROW LEVEL SECURITY;

-- Admin can manage all promotions
CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Users can view active promotions
CREATE POLICY "Users can view active promotions" ON public.promotions
  FOR SELECT USING (is_active = true AND NOW() BETWEEN start_date AND end_date);

-- Users can track their own interactions
CREATE POLICY "Users can view own interactions" ON public.promotion_interactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own interactions" ON public.promotion_interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all interactions
CREATE POLICY "Admins can view all interactions" ON public.promotion_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );
```

## Services Layer

### 2. Create PromotionService (`services/PromotionService.ts`)

Handle all promotion logic including:

- CRUD operations for promotions
- Check if user is eligible for promotion based on segments
- Track user interactions (viewed, dismissed, clicked, redeemed)
- Validate redemption limits
- Get active promotions for specific user
- Integration with Stripe for promo code creation

Key methods:

- `createPromotion(data)` - Create with optional Stripe coupon
- `updatePromotion(id, data)` - Update and sync Stripe
- `getEligiblePromotions(userId)` - Get promotions for user segment
- `trackInteraction(promotionId, userId, action)`
- `redeemPromotion(promotionId, userId)` - Mark as redeemed, increment count
- `getUserSegment(userId)` - Determine user segment (new, free, near_limit, inactive)

### 3. Extend StripeService for promotions

Add methods to Stripe Guardian's `StripeService.server.js`:

- `createPromotionCoupon(promotionData)` - Create Stripe coupon/promo code
- `createDiscountedPrice(planId, discountValue)` - Create discounted price ID
- `applyCouponToCheckout(sessionParams, couponId)` - Apply to checkout session
- `validateCoupon(couponId)` - Verify coupon is valid

## Admin Dashboard

### 4. Create promotions admin screen (`app/admin/promotions.tsx`)

Full-featured admin interface following pattern from `enhanced-plans.tsx`:

- List view with filters (active, scheduled, expired)
- Metrics cards (active promos, total redemptions, conversion rate)
- Create/Edit promotion form with tabs:
  - **Basic Info**: Name, description, dates
  - **Discount**: Type (%, fixed, special price), value
  - **Stripe**: Auto-create coupon or discounted price
  - **Display**: Toggle modal/banner/inline, configure appearance
  - **Targeting**: Select segments, set conditions
  - **Limits**: Max redemptions, per-user limit
- Preview promotion in all display modes
- Realtime subscription for updates
- Quick actions: Activate/Deactivate, Duplicate, Delete
- View analytics: impressions, clicks, redemptions

### 5. Add to admin layout (`app/admin/_layout.tsx`)

Add `<Stack.Screen name="promotions" />` to navigation

### 6. Update AdminSidebar (`components/web/AdminSidebar.tsx`)

Add "Promotions" menu item with star icon

## Display Components

### 7. Create PromotionModal component (`components/PromotionModal.tsx`)

Modal popup following pattern from existing modals:

- Animated slide-in from bottom
- Dismissible with X button
- Show promotion details, discount badge
- CTA button: "Claim Offer" → navigate to join-premium with promo applied
- Track "viewed" and "dismissed" interactions
- Respect user preferences (don't show if dismissed recently)

### 8. Create PromotionBanner component (`components/PromotionBanner.tsx`)

Non-intrusive banner (similar to SmartAppBanner):

- Fixed position at top or bottom of screen
- Slide-in animation
- Compact design with discount highlight
- Dismiss button (X icon)
- Tap to expand or navigate to join-premium
- Auto-dismiss after X seconds (configurable)

### 9. Create PromotionCard component (`components/PromotionCard.tsx`)

In-page promotion card for join-premium screen:

- Highlight box above plan selection
- Show limited-time badge if expiring soon
- Display discount details
- "Apply" button to activate promo code
- Visual emphasis (border, background color)

### 10. Create PromotionManager component (`components/PromotionManager.tsx`)

Central controller that:

- Fetches eligible promotions for current user
- Determines which promotions to show and when
- Manages display priority and frequency
- Tracks interactions automatically
- Handles trigger logic (on app open, after X actions, when near limit)
- Prevents showing too many promos at once

## Integration Points

### 11. Update join-premium screen (`app/join-premium.tsx`)

- Show active promotions inline above plans
- Pass promo code to UnifiedPaymentForm
- Display discounted price if promo has stripe_price_id
- Show "X% off" badge on plan cards
- Add promo code input field for manual entry

### 12. Update UnifiedPaymentForm (`components/UnifiedPaymentForm.tsx`)

- Accept optional `promoCode` prop
- Pass to Stripe checkout session
- Show applied discount in summary
- Handle promo code validation errors

### 13. Add PromotionManager to key screens

Add to:

- `app/index.tsx` (home) - Show modal for high-priority promos
- `app/(tabs)/_layout.tsx` - Show banner for ongoing promos
- `app/usage.tsx` - Show targeted promos when near limits

### 14. Create usePromotions hook (`hooks/usePromotions.ts`)

Convenient hook for components:

```typescript
const {
  activePromotions,
  eligiblePromotions,
  loading,
  applyPromotion,
  dismissPromotion,
  redeemPromotion
} = usePromotions(userId);
```

## Stripe Guardian Integration

### 15. Add promotion endpoints to Stripe Guardian

In `stripe-guardian/api/stripe/`:

- `create-coupon.js` - Create Stripe coupon from promo data
- `create-discounted-price.js` - Create discounted price for plan
- `validate-coupon.js` - Check if coupon is valid and not expired
- `apply-promotion.js` - Apply promo to checkout session

### 16. Update checkout endpoints

Modify `create-checkout.js` and `create-paymentsheet.js`:

- Accept optional `promoCode` or `couponId` parameter
- Apply discount to session
- Store redemption in promotion_interactions table

## User Segmentation Logic

### 17. Implement segment detection in PromotionService

Segments to detect:

- **new_users**: Account created < 7 days ago
- **free_users**: No active premium subscription
- **near_limit**: Used >80% of any feature limit
- **inactive**: No activity in last 30 days
- **churned**: Had premium, now cancelled
- **all**: Everyone

Query user data from:

- `user_profiles` table for account age, premium status
- `feature_usage` table for usage stats
- `notes` table for activity tracking

## Types & Interfaces

### 18. Create promotion types (`types/Promotion.ts`)

```typescript
export interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount' | 'special_price';
  discountValue: number;
  stripeCouponId?: string;
  stripePriceId?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  displayMethods: ('modal' | 'banner' | 'inline')[];
  modalConfig: ModalConfig;
  bannerConfig: BannerConfig;
  inlineConfig: InlineConfig;
  targetSegments: UserSegment[];
  targetConditions: Record<string, any>;
  maxRedemptions?: number;
  currentRedemptions: number;
  maxPerUser: number;
  priority: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type UserSegment = 'all' | 'new_users' | 'free_users' | 'near_limit' | 'inactive' | 'churned';

export interface PromotionInteraction {
  id: string;
  promotionId: string;
  userId: string;
  action: 'viewed' | 'dismissed' | 'clicked' | 'redeemed';
  createdAt: string;
  metadata: Record<string, any>;
}
```

## Testing & Analytics

### 19. Add promotion analytics to admin dashboard

In `app/admin/promotions.tsx`, show for each promotion:

- Impressions (viewed count)
- Click-through rate (clicked / viewed)
- Conversion rate (redeemed / clicked)
- Revenue impact (if trackable)
- Top performing segments

### 20. Create promotion preview mode

Allow admins to preview promotions before activation:

- Test modal appearance
- Test banner placement
- Verify Stripe integration
- Check targeting logic

## Documentation

### 21. Create PROMOTIONS_GUIDE.md

Document:

- How to create effective promotions
- Best practices for timing and targeting
- Stripe coupon vs discounted price when to use each
- A/B testing strategies
- Troubleshooting common issues

## Key Files Summary

**New Files:**

- `database/promotions-setup.sql` - Database schema
- `services/PromotionService.ts` - Core promotion logic
- `app/admin/promotions.tsx` - Admin dashboard
- `components/PromotionModal.tsx` - Modal popup
- `components/PromotionBanner.tsx` - Banner display
- `components/PromotionCard.tsx` - Inline card
- `components/PromotionManager.tsx` - Central controller
- `hooks/usePromotions.ts` - React hook
- `types/Promotion.ts` - TypeScript definitions
- `stripe-guardian/api/stripe/create-coupon.js` - Stripe coupon creation
- `stripe-guardian/api/stripe/create-discounted-price.js` - Discounted pricing
- `stripe-guardian/api/stripe/validate-coupon.js` - Coupon validation
- `stripe-guardian/api/stripe/apply-promotion.js` - Apply to checkout

**Modified Files:**

- `app/admin/_layout.tsx` - Add promotions route
- `components/web/AdminSidebar.tsx` - Add menu item
- `app/join-premium.tsx` - Show promotions, apply discounts
- `components/UnifiedPaymentForm.tsx` - Handle promo codes
- `app/index.tsx` - Add PromotionManager
- `app/(tabs)/_layout.tsx` - Add promotion banner
- `app/usage.tsx` - Show limit-based promos
- `stripe-guardian/api/stripe/create-checkout.js` - Accept promo codes
- `stripe-guardian/api/stripe/create-paymentsheet.js` - Accept promo codes
- `stripe-guardian/server/services/StripeService.server.js` - Add promotion methods

## Implementation Notes

1. **Priority System**: Higher priority promotions show first; only show one modal at a time
2. **Frequency Caps**: Don't show same promo modal to user more than once per day
3. **Graceful Degradation**: If Stripe integration fails, still show promotion UI
4. **Performance**: Cache active promotions, refresh every 5 minutes
5. **Mobile vs Web**: Adapt modal/banner styles for each platform
6. **Accessibility**: Ensure all components are keyboard navigable and screen reader friendly

### To-dos

- [ ] Create database schema for promotions and interactions tables with RLS policies
- [ ] Build PromotionService with CRUD operations, eligibility checking, and user segmentation
- [ ] Extend Stripe Guardian with coupon creation, discounted pricing, and validation endpoints
- [ ] Create comprehensive promotions admin screen with form, list view, and analytics
- [ ] Build PromotionModal, PromotionBanner, and PromotionCard display components
- [ ] Create PromotionManager controller and usePromotions hook for centralized logic
- [ ] Update join-premium screen and UnifiedPaymentForm to handle promo codes and discounts
- [ ] Integrate PromotionManager into key app screens (home, tabs, usage)
- [ ] Create TypeScript types and documentation for promotion system