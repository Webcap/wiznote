/**
 * Premium Promotion System Types
 * 
 * Type definitions for the promotional campaign system including
 * promotions, user interactions, segments, and display configurations.
 */

// =====================================================
// Core Types
// =====================================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'special_price';

export type UserSegment = 
  | 'all' 
  | 'new_users' 
  | 'free_users' 
  | 'near_limit' 
  | 'inactive' 
  | 'churned';

export type DisplayMethod = 'modal' | 'banner' | 'inline';

export type InteractionAction = 'viewed' | 'dismissed' | 'clicked' | 'redeemed';

// =====================================================
// Display Configuration Types
// =====================================================

export interface ModalConfig {
  /** Title text for the modal */
  title?: string;
  /** Custom button text (default: "Claim Offer") */
  buttonText?: string;
  /** Theme color for the modal */
  theme?: string;
  /** Show countdown timer if expiring soon */
  showCountdown?: boolean;
  /** Auto-dismiss after X seconds (0 = manual dismiss only) */
  autoDismissSeconds?: number;
  /** Image URL for modal header */
  imageUrl?: string;
  /** Animation style */
  animation?: 'slide' | 'fade' | 'scale';
}

export interface BannerConfig {
  /** Position of banner */
  position?: 'top' | 'bottom';
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Auto-hide after X seconds (0 = stays visible) */
  autoHideSeconds?: number;
  /** Compact or expanded style */
  style?: 'compact' | 'expanded';
  /** Icon to show */
  icon?: string;
}

export interface InlineConfig {
  /** Placement within the page */
  placement?: 'top' | 'middle' | 'bottom';
  /** Visual style */
  variant?: 'card' | 'banner' | 'highlight';
  /** Show as featured/urgent */
  featured?: boolean;
  /** Border style */
  borderStyle?: 'solid' | 'dashed' | 'none';
  /** Background gradient */
  gradient?: boolean;
}

// =====================================================
// Target Conditions Type
// =====================================================

export interface TargetConditions {
  /** Minimum account age in days */
  minAccountAgeDays?: number;
  /** Maximum account age in days */
  maxAccountAgeDays?: number;
  /** Minimum usage percentage (0-100) */
  minUsagePercent?: number;
  /** Required note count threshold */
  minNoteCount?: number;
  /** Days since last activity */
  daysSinceLastActivity?: number;
  /** Specific plan types to target */
  planTypes?: string[];
  /** Custom SQL condition */
  customCondition?: string;
}

// =====================================================
// Main Promotion Interface
// =====================================================

export interface Promotion {
  /** Unique promotion ID */
  id: string;
  
  /** Display name for admin */
  name: string;
  
  /** User-facing description */
  description: string;
  
  // Discount Configuration
  /** Type of discount being offered */
  discountType: DiscountType;
  
  /** Numeric value of discount (e.g., 30 for 30%, or 5.99 for $5.99 off) */
  discountValue: number;
  
  // Stripe Integration
  /** Stripe coupon or promo code ID */
  stripeCouponId?: string;
  
  /** Alternative: Stripe price ID with discount baked in */
  stripePriceId?: string;
  
  // Scheduling
  /** When promotion becomes active */
  startDate: string;
  
  /** When promotion expires */
  endDate: string;
  
  /** Whether promotion is currently active (admin toggle) */
  isActive: boolean;
  
  // Display Configuration
  /** Methods to display this promotion */
  displayMethods: DisplayMethod[];
  
  /** Configuration for modal popup */
  modalConfig: ModalConfig;
  
  /** Configuration for banner display */
  bannerConfig: BannerConfig;
  
  /** Configuration for inline display */
  inlineConfig: InlineConfig;
  
  // Targeting
  /** User segments eligible for this promotion */
  targetSegments: UserSegment[];
  
  /** Additional targeting conditions */
  targetConditions: TargetConditions;
  
  // Usage Limits
  /** Maximum total redemptions across all users (null = unlimited) */
  maxRedemptions?: number | null;
  
  /** Current number of redemptions */
  currentRedemptions: number;
  
  /** Maximum redemptions per user */
  maxPerUser: number;
  
  /** Display priority (higher = shown first) */
  priority: number;
  
  // Metadata
  /** Additional data for analytics or custom logic */
  metadata: Record<string, any>;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Admin user who created this promotion */
  createdBy?: string;
}

// =====================================================
// Promotion Interaction Interface
// =====================================================

export interface PromotionInteraction {
  /** Unique interaction ID */
  id: string;
  
  /** Associated promotion ID */
  promotionId: string;
  
  /** User who interacted */
  userId: string;
  
  /** Type of interaction */
  action: InteractionAction;
  
  /** When interaction occurred */
  createdAt: string;
  
  /** Additional context about the interaction */
  metadata: Record<string, any>;
}

// =====================================================
// Database Row Types (for Supabase queries)
// =====================================================

export interface PromotionRow {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  stripe_coupon_id: string | null;
  stripe_price_id: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  display_methods: any; // JSONB
  modal_config: any; // JSONB
  banner_config: any; // JSONB
  inline_config: any; // JSONB
  target_segments: any; // JSONB
  target_conditions: any; // JSONB
  max_redemptions: number | null;
  current_redemptions: number;
  max_per_user: number;
  priority: number;
  metadata: any; // JSONB
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PromotionInteractionRow {
  id: string;
  promotion_id: string;
  user_id: string;
  action: string;
  created_at: string;
  metadata: any; // JSONB
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreatePromotionRequest {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  displayMethods: DisplayMethod[];
  targetSegments: UserSegment[];
  modalConfig?: ModalConfig;
  bannerConfig?: BannerConfig;
  inlineConfig?: InlineConfig;
  targetConditions?: TargetConditions;
  maxRedemptions?: number;
  maxPerUser?: number;
  priority?: number;
  metadata?: Record<string, any>;
  
  // Stripe options
  createStripeCoupon?: boolean;
  stripeCouponId?: string;
  stripePriceId?: string;
}

export interface UpdatePromotionRequest extends Partial<CreatePromotionRequest> {
  id: string;
  isActive?: boolean;
}

export interface TrackInteractionRequest {
  promotionId: string;
  action: InteractionAction;
  metadata?: Record<string, any>;
}

// =====================================================
// Analytics Types
// =====================================================

export interface PromotionAnalytics {
  promotionId: string;
  promotionName: string;
  
  /** Total number of views */
  views: number;
  
  /** Total number of dismissals */
  dismissals: number;
  
  /** Total number of clicks */
  clicks: number;
  
  /** Total number of redemptions */
  redemptions: number;
  
  /** Click-through rate (clicks / views) */
  clickThroughRate: number;
  
  /** Conversion rate (redemptions / clicks) */
  conversionRate: number;
  
  /** Breakdown by segment */
  segmentBreakdown?: Record<UserSegment, {
    views: number;
    clicks: number;
    redemptions: number;
  }>;
  
  /** Revenue impact (if trackable) */
  estimatedRevenue?: number;
}

// =====================================================
// User Eligibility Types
// =====================================================

export interface UserEligibility {
  /** User ID being checked */
  userId: string;
  
  /** Detected user segment */
  userSegment: UserSegment;
  
  /** Eligible promotions for this user */
  eligiblePromotions: Promotion[];
  
  /** Reasons why certain promotions were excluded */
  excludedPromotions?: Array<{
    promotionId: string;
    reason: string;
  }>;
}

// =====================================================
// Helper Types
// =====================================================

/** Options for querying promotions */
export interface GetPromotionsOptions {
  /** Filter by active status */
  activeOnly?: boolean;
  
  /** Filter by segment */
  segment?: UserSegment;
  
  /** Include expired promotions */
  includeExpired?: boolean;
  
  /** Limit results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Order by field */
  orderBy?: 'priority' | 'startDate' | 'endDate' | 'createdAt';
  
  /** Order direction */
  orderDirection?: 'asc' | 'desc';
}

/** Options for the promotion manager */
export interface PromotionManagerOptions {
  /** Frequency cap: don't show same modal more than once per X milliseconds */
  modalFrequencyCap?: number;
  
  /** Maximum promotions to show at once */
  maxConcurrentPromotions?: number;
  
  /** Minimum time between showing different promotions */
  promotionInterval?: number;
  
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

// =====================================================
// Stripe Integration Types
// =====================================================

export interface StripeCouponData {
  /** Coupon ID */
  id: string;
  
  /** Percentage off (1-100) */
  percentOff?: number;
  
  /** Fixed amount off in cents */
  amountOff?: number;
  
  /** Currency for amount_off */
  currency?: string;
  
  /** Duration: once, repeating, forever */
  duration: 'once' | 'repeating' | 'forever';
  
  /** Number of months if duration is repeating */
  durationInMonths?: number;
  
  /** Coupon name */
  name?: string;
  
  /** Redemption expiration timestamp */
  redeemBy?: number;
}

export interface StripePromotionCodeData {
  /** Promotion code string (e.g., "SUMMER30") */
  code: string;
  
  /** Associated coupon ID */
  couponId: string;
  
  /** Whether the code is active */
  active: boolean;
  
  /** Maximum redemptions */
  maxRedemptions?: number;
  
  /** Expiration timestamp */
  expiresAt?: number;
}

