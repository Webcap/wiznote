/**
 * usePromotions Hook
 * 
 * React hook for managing promotions in components.
 * Provides convenient access to eligible promotions, interaction tracking,
 * and redemption logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import type {
  Promotion,
  PromotionInteraction,
  InteractionAction
} from '../types/Promotion';
import { PromotionService } from '../services/PromotionService';
import { supabase } from '../lib/supabase';

interface UsePromotionsOptions {
  /** Auto-refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
  /** Enable realtime subscriptions */
  enableRealtime?: boolean;
  /** Frequency cap for showing modals (hours) */
  modalFrequencyHours?: number;
}

interface UsePromotionsReturn {
  /** All active promotions for the user */
  activePromotions: Promotion[];
  /** Promotions eligible based on user segment */
  eligiblePromotions: Promotion[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh promotions manually */
  refresh: () => Promise<void>;
  /** Track an interaction */
  trackInteraction: (promotionId: string, action: InteractionAction, metadata?: Record<string, any>) => Promise<void>;
  /** Apply a promotion (navigate to join-premium with promo) */
  applyPromotion: (promotion: Promotion) => void;
  /** Dismiss a promotion */
  dismissPromotion: (promotionId: string) => Promise<void>;
  /** Redeem a promotion */
  redeemPromotion: (promotionId: string) => Promise<boolean>;
  /** Check if user has recently seen a promotion */
  hasRecentlySeen: (promotionId: string) => Promise<boolean>;
  /** Get user's interactions with a promotion */
  getInteractions: (promotionId: string) => Promise<PromotionInteraction[]>;
}

/**
 * Hook for managing promotions in React components
 */
export function usePromotions(
  userId: string | undefined,
  options: UsePromotionsOptions = {}
): UsePromotionsReturn {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    enableRealtime = true,
    modalFrequencyHours = 24
  } = options;

  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [eligiblePromotions, setEligiblePromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch promotions
   */
  const fetchPromotions = useCallback(async () => {
    if (!userId) {
      console.log('usePromotions: No user ID, skipping fetch');
      setActivePromotions([]);
      setEligiblePromotions([]);
      setLoading(false);
      return;
    }

    try {
      console.log('usePromotions: Fetching promotions for user:', userId);
      setError(null);

      // Fetch eligible promotions for user
      const eligible = await PromotionService.getEligiblePromotions(userId);
      console.log('usePromotions: Found', eligible.length, 'eligible promotions');
      setEligiblePromotions(eligible);

      // Also get all active promotions (for admin or general display)
      const active = await PromotionService.getPromotions({
        activeOnly: true,
        includeExpired: false
      });
      console.log('usePromotions: Found', active.length, 'active promotions');
      setActivePromotions(active);

    } catch (err) {
      console.error('usePromotions: Error fetching promotions:', err);
      setError('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchPromotions();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchPromotions]);

  /**
   * Realtime subscription
   */
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('promotions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotions'
        },
        () => {
          // Refresh when promotions change
          fetchPromotions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, fetchPromotions]);

  /**
   * Track interaction with a promotion
   */
  const trackInteraction = useCallback(async (
    promotionId: string,
    action: InteractionAction,
    metadata: Record<string, any> = {}
  ) => {
    if (!userId) return;

    try {
      await PromotionService.trackInteraction(promotionId, userId, action, metadata);
      
      // If it's a redemption, refresh to update counts
      if (action === 'redeemed') {
        fetchPromotions();
      }
    } catch (err) {
      console.error('Error tracking interaction:', err);
    }
  }, [userId, fetchPromotions]);

  /**
   * Apply a promotion (navigate to join-premium)
   */
  const applyPromotion = useCallback((promotion: Promotion) => {
    if (!userId) {
      console.warn('Cannot apply promotion: user not logged in');
      return;
    }

    console.log('Applying promotion:', promotion.name, promotion.id);

    // Track the click
    trackInteraction(promotion.id, 'clicked', {
      source: 'apply_button',
      timestamp: new Date().toISOString()
    });

    try {
      // Navigate to join-premium with promo code
      const params: any = { promotionId: promotion.id };
      
      if (promotion.stripeCouponId) {
        params.couponId = promotion.stripeCouponId;
      }
      if (promotion.stripePriceId) {
        params.priceId = promotion.stripePriceId;
      }

      console.log('Navigating to join-premium with params:', params);
      router.push({
        pathname: '/join-premium',
        params
      });
    } catch (error) {
      console.error('Error navigating to join-premium:', error);
    }
  }, [userId, trackInteraction]);

  /**
   * Dismiss a promotion
   */
  const dismissPromotion = useCallback(async (promotionId: string) => {
    if (!userId) return;

    await trackInteraction(promotionId, 'dismissed', {
      dismissed_at: new Date().toISOString()
    });

    // Remove from eligible promotions
    setEligiblePromotions(prev => prev.filter(p => p.id !== promotionId));
  }, [userId, trackInteraction]);

  /**
   * Redeem a promotion
   */
  const redeemPromotion = useCallback(async (promotionId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Check if user has already redeemed
      const redemptionCount = await PromotionService.getUserRedemptionCount(promotionId, userId);
      const promotion = eligiblePromotions.find(p => p.id === promotionId);

      if (!promotion) return false;

      if (redemptionCount >= promotion.maxPerUser) {
        console.warn('User has already redeemed this promotion');
        return false;
      }

      // Track redemption
      await trackInteraction(promotionId, 'redeemed', {
        redeemed_at: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error('Error redeeming promotion:', err);
      return false;
    }
  }, [userId, eligiblePromotions, trackInteraction]);

  /**
   * Check if user has recently seen a promotion
   */
  const hasRecentlySeen = useCallback(async (promotionId: string): Promise<boolean> => {
    if (!userId) return false;
    return PromotionService.hasRecentlySeenPromotion(promotionId, userId, modalFrequencyHours);
  }, [userId, modalFrequencyHours]);

  /**
   * Get user's interactions with a promotion
   */
  const getInteractions = useCallback(async (promotionId: string): Promise<PromotionInteraction[]> => {
    if (!userId) return [];
    return PromotionService.getUserPromotionInteractions(promotionId, userId);
  }, [userId]);

  return {
    activePromotions,
    eligiblePromotions,
    loading,
    error,
    refresh: fetchPromotions,
    trackInteraction,
    applyPromotion,
    dismissPromotion,
    redeemPromotion,
    hasRecentlySeen,
    getInteractions
  };
}

export default usePromotions;

