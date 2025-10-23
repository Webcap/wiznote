/**
 * Promotion Service
 * 
 * Core business logic for the premium promotion system including:
 * - CRUD operations for promotions
 * - User eligibility and segmentation
 * - Interaction tracking
 * - Redemption validation
 * - Stripe integration coordination
 */

import { supabase } from '../lib/supabase';
import type {
  Promotion,
  PromotionRow,
  PromotionInteraction,
  PromotionInteractionRow,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  UserSegment,
  UserEligibility,
  PromotionAnalytics,
  GetPromotionsOptions,
  InteractionAction,
  TrackInteractionRequest
} from '../types/Promotion';

// =====================================================
// Helper Functions
// =====================================================

/**
 * Convert database row to Promotion object
 */
function rowToPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    discountType: row.discount_type as any,
    discountValue: row.discount_value,
    stripeCouponId: row.stripe_coupon_id || undefined,
    stripePriceId: row.stripe_price_id || undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    displayMethods: row.display_methods || [],
    modalConfig: row.modal_config || {},
    bannerConfig: row.banner_config || {},
    inlineConfig: row.inline_config || {},
    targetSegments: row.target_segments || ['all'],
    targetConditions: row.target_conditions || {},
    maxRedemptions: row.max_redemptions,
    currentRedemptions: row.current_redemptions,
    maxPerUser: row.max_per_user,
    priority: row.priority,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || undefined
  };
}

/**
 * Convert database row to PromotionInteraction object
 */
function rowToInteraction(row: PromotionInteractionRow): PromotionInteraction {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    userId: row.user_id,
    action: row.action as InteractionAction,
    createdAt: row.created_at,
    metadata: row.metadata || {}
  };
}

// =====================================================
// Main Service Class
// =====================================================

export class PromotionService {
  
  // =====================================================
  // CRUD Operations
  // =====================================================
  
  /**
   * Create a new promotion
   */
  static async createPromotion(data: CreatePromotionRequest, userId: string): Promise<Promotion | null> {
    try {
      const { data: promotion, error } = await supabase
        .from('promotions')
        .insert({
          name: data.name,
          description: data.description,
          discount_type: data.discountType,
          discount_value: data.discountValue,
          stripe_coupon_id: data.stripeCouponId || null,
          stripe_price_id: data.stripePriceId || null,
          start_date: data.startDate,
          end_date: data.endDate,
          is_active: true,
          display_methods: data.displayMethods,
          modal_config: data.modalConfig || {},
          banner_config: data.bannerConfig || {},
          inline_config: data.inlineConfig || {},
          target_segments: data.targetSegments,
          target_conditions: data.targetConditions || {},
          max_redemptions: data.maxRedemptions || null,
          current_redemptions: 0,
          max_per_user: data.maxPerUser || 1,
          priority: data.priority || 0,
          metadata: data.metadata || {},
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating promotion:', error);
        return null;
      }

      return rowToPromotion(promotion);
    } catch (error) {
      console.error('Exception creating promotion:', error);
      return null;
    }
  }

  /**
   * Update an existing promotion
   */
  static async updatePromotion(id: string, data: UpdatePromotionRequest): Promise<Promotion | null> {
    try {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.discountType !== undefined) updateData.discount_type = data.discountType;
      if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
      if (data.stripeCouponId !== undefined) updateData.stripe_coupon_id = data.stripeCouponId;
      if (data.stripePriceId !== undefined) updateData.stripe_price_id = data.stripePriceId;
      if (data.startDate !== undefined) updateData.start_date = data.startDate;
      if (data.endDate !== undefined) updateData.end_date = data.endDate;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.displayMethods !== undefined) updateData.display_methods = data.displayMethods;
      if (data.modalConfig !== undefined) updateData.modal_config = data.modalConfig;
      if (data.bannerConfig !== undefined) updateData.banner_config = data.bannerConfig;
      if (data.inlineConfig !== undefined) updateData.inline_config = data.inlineConfig;
      if (data.targetSegments !== undefined) updateData.target_segments = data.targetSegments;
      if (data.targetConditions !== undefined) updateData.target_conditions = data.targetConditions;
      if (data.maxRedemptions !== undefined) updateData.max_redemptions = data.maxRedemptions;
      if (data.maxPerUser !== undefined) updateData.max_per_user = data.maxPerUser;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const { data: promotion, error } = await supabase
        .from('promotions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating promotion:', error);
        return null;
      }

      return rowToPromotion(promotion);
    } catch (error) {
      console.error('Exception updating promotion:', error);
      return null;
    }
  }

  /**
   * Get promotion by ID
   */
  static async getPromotion(id: string): Promise<Promotion | null> {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching promotion:', error);
        return null;
      }

      return rowToPromotion(data);
    } catch (error) {
      console.error('Exception fetching promotion:', error);
      return null;
    }
  }

  /**
   * Get all promotions with optional filters
   */
  static async getPromotions(options: GetPromotionsOptions = {}): Promise<Promotion[]> {
    try {
      let query = supabase.from('promotions').select('*');

      // Apply filters
      if (options.activeOnly) {
        query = query.eq('is_active', true);
      }

      if (!options.includeExpired) {
        const now = new Date().toISOString();
        query = query.gte('end_date', now);
      }

      if (options.segment) {
        query = query.contains('target_segments', [options.segment]);
      }

      // Apply ordering
      const orderBy = options.orderBy || 'priority';
      const orderDirection = options.orderDirection || 'desc';
      
      if (orderBy === 'priority') {
        query = query.order('priority', { ascending: orderDirection === 'asc' });
      } else if (orderBy === 'startDate') {
        query = query.order('start_date', { ascending: orderDirection === 'asc' });
      } else if (orderBy === 'endDate') {
        query = query.order('end_date', { ascending: orderDirection === 'asc' });
      } else if (orderBy === 'createdAt') {
        query = query.order('created_at', { ascending: orderDirection === 'asc' });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching promotions:', error);
        return [];
      }

      return data.map(rowToPromotion);
    } catch (error) {
      console.error('Exception fetching promotions:', error);
      return [];
    }
  }

  /**
   * Delete a promotion
   */
  static async deletePromotion(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting promotion:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting promotion:', error);
      return false;
    }
  }

  // =====================================================
  // User Segmentation
  // =====================================================

  /**
   * Determine which segment a user belongs to
   */
  static async getUserSegment(userId: string): Promise<UserSegment> {
    try {
      // Get user profile - using correct columns that exist in the database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('created_at, premium, updated_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for segmentation:', profileError);
        return 'all';
      }

      if (!profile) {
        return 'free_users';
      }

      const now = new Date();
      const createdAt = new Date(profile.created_at);
      const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Check if new user (< 7 days)
      if (accountAgeDays < 7) {
        return 'new_users';
      }

      // Check premium status from the premium JSONB field
      const premium = profile.premium as any;

      // Check if churned (had premium, now cancelled)
      if (premium && premium.status) {
        if (premium.status === 'cancelled' || premium.status === 'canceled' || premium.status === 'expired') {
          return 'churned';
        }
      }

      // Check if inactive (no activity in 30 days based on updated_at)
      if (profile.updated_at) {
        const lastActivity = new Date(profile.updated_at);
        const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity >= 30) {
          return 'inactive';
        }
      }

      // Check if near limit
      const isNearLimit = await this.isUserNearLimit(userId);
      if (isNearLimit) {
        return 'near_limit';
      }

      // Check if user has active premium
      if (premium && premium.isActive) {
        return 'premium_users';
      }

      // Default to free users
      return 'free_users';
    } catch (error) {
      console.error('Exception determining user segment:', error);
      return 'all';
    }
  }

  /**
   * Check if user is near their feature limits (>80% usage)
   */
  private static async isUserNearLimit(userId: string): Promise<boolean> {
    try {
      const { data: usage, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !usage) {
        console.log('[PromotionService] No usage data found for user, skipping limit check');
        return false;
      }

      // Check each feature limit
      const features = ['notes', 'audio_transcriptions', 'ai_generations', 'flashcard_sets'];
      
      for (const feature of features) {
        const used = usage[`${feature}_used`] || 0;
        const limit = usage[`${feature}_limit`] || Infinity;
        
        if (limit !== -1 && limit !== null) { // -1 or null means unlimited
          const usagePercent = (used / limit) * 100;
          if (usagePercent >= 80) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Exception checking user limits:', error);
      return false;
    }
  }

  // =====================================================
  // Eligibility & Targeting
  // =====================================================

  /**
   * Get promotions eligible for a specific user
   */
  static async getEligiblePromotions(userId: string): Promise<Promotion[]> {
    try {
      // Get user's segment
      const userSegment = await this.getUserSegment(userId);

      // ⚠️ IMPORTANT: Don't show promotions to active premium users
      // They already have premium, no need to see upgrade offers
      if (userSegment === 'premium_users') {
        console.log('User is premium, skipping promotions');
        return [];
      }

      // Get active promotions
      const now = new Date().toISOString();
      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('priority', { ascending: false });

      if (error || !promotions) {
        console.error('Error fetching eligible promotions:', error);
        return [];
      }

      // Filter by segment and additional conditions
      const eligible: Promotion[] = [];

      for (const row of promotions) {
        const promo = rowToPromotion(row);

        // Check segment targeting
        const targetsAll = promo.targetSegments.includes('all');
        const targetsUserSegment = promo.targetSegments.includes(userSegment);

        if (!targetsAll && !targetsUserSegment) {
          continue;
        }

        // Check if max redemptions reached
        if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
          continue;
        }

        // Check if user has already redeemed max times
        const userRedemptions = await this.getUserRedemptionCount(promo.id, userId);
        if (userRedemptions >= promo.maxPerUser) {
          continue;
        }

        // Check target conditions
        const meetsConditions = await this.meetsTargetConditions(userId, promo.targetConditions);
        if (!meetsConditions) {
          continue;
        }

        eligible.push(promo);
      }

      return eligible;
    } catch (error) {
      console.error('Exception getting eligible promotions:', error);
      return [];
    }
  }

  /**
   * Check if user meets target conditions
   */
  private static async meetsTargetConditions(
    userId: string,
    conditions: any
  ): Promise<boolean> {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        return true; // No conditions means always eligible
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (!profile) return false;

      const now = new Date();
      const createdAt = new Date(profile.created_at);
      const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Check account age conditions
      if (conditions.minAccountAgeDays !== undefined && accountAgeDays < conditions.minAccountAgeDays) {
        return false;
      }
      if (conditions.maxAccountAgeDays !== undefined && accountAgeDays > conditions.maxAccountAgeDays) {
        return false;
      }

      // Check usage conditions
      if (conditions.minUsagePercent !== undefined) {
        const { data: usage, error } = await supabase
          .from('user_feature_usage')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && usage) {
          const usagePercent = this.calculateOverallUsagePercent(usage);
          if (usagePercent < conditions.minUsagePercent) {
            return false;
          }
        }
      }

      // Check note count
      if (conditions.minNoteCount !== undefined) {
        const { count } = await supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (!count || count < conditions.minNoteCount) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Exception checking target conditions:', error);
      return false;
    }
  }

  /**
   * Calculate overall usage percentage
   */
  private static calculateOverallUsagePercent(usage: any): number {
    const features = ['notes', 'audio_transcriptions', 'ai_generations', 'flashcard_sets'];
    let totalPercent = 0;
    let featureCount = 0;

    for (const feature of features) {
      const used = usage[`${feature}_used`] || 0;
      const limit = usage[`${feature}_limit`];

      if (limit && limit !== -1 && limit !== null) {
        totalPercent += (used / limit) * 100;
        featureCount++;
      }
    }

    return featureCount > 0 ? totalPercent / featureCount : 0;
  }

  // =====================================================
  // Interaction Tracking
  // =====================================================

  /**
   * Track a user interaction with a promotion
   */
  static async trackInteraction(
    promotionId: string,
    userId: string,
    action: InteractionAction,
    metadata: Record<string, any> = {}
  ): Promise<PromotionInteraction | null> {
    try {
      // For redemptions, increment the counter
      if (action === 'redeemed') {
        await supabase.rpc('increment', {
          row_id: promotionId,
          table_name: 'promotions',
          column_name: 'current_redemptions'
        }).catch(() => {
          // Fallback if RPC doesn't exist
          supabase
            .from('promotions')
            .select('current_redemptions')
            .eq('id', promotionId)
            .single()
            .then(({ data }) => {
              if (data) {
                supabase
                  .from('promotions')
                  .update({ current_redemptions: data.current_redemptions + 1 })
                  .eq('id', promotionId);
              }
            });
        });
      }

      const { data: interaction, error } = await supabase
        .from('promotion_interactions')
        .insert({
          promotion_id: promotionId,
          user_id: userId,
          action,
          metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Error tracking interaction:', error);
        return null;
      }

      return rowToInteraction(interaction);
    } catch (error) {
      console.error('Exception tracking interaction:', error);
      return null;
    }
  }

  /**
   * Get user's redemption count for a promotion
   */
  static async getUserRedemptionCount(promotionId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('promotion_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('promotion_id', promotionId)
        .eq('user_id', userId)
        .eq('action', 'redeemed');

      if (error) {
        console.error('Error getting redemption count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Exception getting redemption count:', error);
      return 0;
    }
  }

  /**
   * Get all interactions for a promotion
   */
  static async getPromotionInteractions(promotionId: string): Promise<PromotionInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('promotion_interactions')
        .select('*')
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Error fetching interactions:', error);
        return [];
      }

      return data.map(rowToInteraction);
    } catch (error) {
      console.error('Exception fetching interactions:', error);
      return [];
    }
  }

  /**
   * Get user's interactions with a specific promotion
   */
  static async getUserPromotionInteractions(
    promotionId: string,
    userId: string
  ): Promise<PromotionInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('promotion_interactions')
        .select('*')
        .eq('promotion_id', promotionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(rowToInteraction);
    } catch (error) {
      console.error('Exception fetching user interactions:', error);
      return [];
    }
  }

  // =====================================================
  // Analytics
  // =====================================================

  /**
   * Get analytics for a promotion
   */
  static async getPromotionAnalytics(promotionId: string): Promise<PromotionAnalytics | null> {
    try {
      const { data: promotion } = await supabase
        .from('promotions')
        .select('name')
        .eq('id', promotionId)
        .single();

      if (!promotion) return null;

      // Get interaction counts
      const { data: interactions } = await supabase
        .from('promotion_interactions')
        .select('action')
        .eq('promotion_id', promotionId);

      if (!interactions) {
        return {
          promotionId,
          promotionName: promotion.name,
          views: 0,
          dismissals: 0,
          clicks: 0,
          redemptions: 0,
          clickThroughRate: 0,
          conversionRate: 0
        };
      }

      const views = interactions.filter(i => i.action === 'viewed').length;
      const dismissals = interactions.filter(i => i.action === 'dismissed').length;
      const clicks = interactions.filter(i => i.action === 'clicked').length;
      const redemptions = interactions.filter(i => i.action === 'redeemed').length;

      const clickThroughRate = views > 0 ? (clicks / views) * 100 : 0;
      const conversionRate = clicks > 0 ? (redemptions / clicks) * 100 : 0;

      return {
        promotionId,
        promotionName: promotion.name,
        views,
        dismissals,
        clicks,
        redemptions,
        clickThroughRate,
        conversionRate
      };
    } catch (error) {
      console.error('Exception getting promotion analytics:', error);
      return null;
    }
  }

  /**
   * Check if user has recently seen a promotion (for frequency capping)
   */
  static async hasRecentlySeenPromotion(
    promotionId: string,
    userId: string,
    hoursAgo: number = 24
  ): Promise<boolean> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

      const { data, error } = await supabase
        .from('promotion_interactions')
        .select('id')
        .eq('promotion_id', promotionId)
        .eq('user_id', userId)
        .eq('action', 'viewed')
        .gte('created_at', cutoffTime.toISOString())
        .limit(1);

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Exception checking recent views:', error);
      return false;
    }
  }
}

export default PromotionService;

