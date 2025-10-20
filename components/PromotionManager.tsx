/**
 * PromotionManager Component
 * 
 * Central controller for displaying promotions across the app.
 * Manages priority, frequency capping, and display logic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { PromotionModal } from './PromotionModal';
import { PromotionBanner } from './PromotionBanner';
import type { Promotion, PromotionManagerOptions } from '../types/Promotion';
import { usePromotions } from '../hooks/usePromotions';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_OPTIONS: PromotionManagerOptions = {
  modalFrequencyCap: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxConcurrentPromotions: 1,
  promotionInterval: 5 * 60 * 1000, // 5 minutes between different promotions
  refreshInterval: 5 * 60 * 1000 // 5 minutes refresh
};

const STORAGE_KEY = 'promotion_manager_state';

interface PromotionManagerProps {
  /** Show modal promotions */
  enableModal?: boolean;
  /** Show banner promotions */
  enableBanner?: boolean;
  /** Custom options */
  options?: Partial<PromotionManagerOptions>;
  /** Trigger conditions - when to show promotions */
  triggers?: {
    onAppOpen?: boolean;
    onAction?: string;
    onNearLimit?: boolean;
  };
}

interface ManagerState {
  lastModalShown: Record<string, number>; // promotionId -> timestamp
  lastBannerShown: Record<string, number>;
  dismissedToday: Set<string>;
}

export function PromotionManager({
  enableModal = true,
  enableBanner = true,
  options = {},
  triggers = { onAppOpen: true }
}: PromotionManagerProps) {
  const { user } = useAuth();
  const { eligiblePromotions, loading, hasRecentlySeen } = usePromotions(user?.id, options);
  
  const [currentModal, setCurrentModal] = useState<Promotion | null>(null);
  const [currentBanner, setCurrentBanner] = useState<Promotion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [state, setState] = useState<ManagerState>({
    lastModalShown: {},
    lastBannerShown: {},
    dismissedToday: new Set()
  });

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Load state from storage
  useEffect(() => {
    loadState();
  }, []);

  // Save state to storage
  useEffect(() => {
    saveState();
  }, [state]);

  // Process eligible promotions
  useEffect(() => {
    if (!loading && eligiblePromotions.length > 0) {
      processPromotions();
    }
  }, [eligiblePromotions, loading]);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({
          lastModalShown: parsed.lastModalShown || {},
          lastBannerShown: parsed.lastBannerShown || {},
          dismissedToday: new Set(parsed.dismissedToday || [])
        });
      }
    } catch (error) {
      console.error('Error loading promotion manager state:', error);
    }
  };

  const saveState = async () => {
    try {
      const toSave = {
        lastModalShown: state.lastModalShown,
        lastBannerShown: state.lastBannerShown,
        dismissedToday: Array.from(state.dismissedToday)
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving promotion manager state:', error);
    }
  };

  const processPromotions = async () => {
    const now = Date.now();

    // Filter out promotions that shouldn't be shown
    const filtered = await Promise.all(
      eligiblePromotions.map(async (promo) => {
        // Check if dismissed today
        if (state.dismissedToday.has(promo.id)) {
          return null;
        }

        // Check if recently seen
        const recentlySeen = await hasRecentlySeen(promo.id);
        if (recentlySeen) {
          return null;
        }

        return promo;
      })
    );

    const validPromotions = filtered.filter((p): p is Promotion => p !== null);

    if (validPromotions.length === 0) return;

    // Sort by priority (highest first)
    const sorted = [...validPromotions].sort((a, b) => b.priority - a.priority);

    // Determine which promotion to show
    const topPromotion = sorted[0];

    // Show modal if enabled and promotion has modal display method
    if (
      enableModal &&
      topPromotion.displayMethods.includes('modal') &&
      !currentModal &&
      canShowModal(topPromotion, now)
    ) {
      showModalPromotion(topPromotion, now);
    }
    // Show banner if enabled and promotion has banner display method
    else if (
      enableBanner &&
      topPromotion.displayMethods.includes('banner') &&
      !currentBanner &&
      canShowBanner(topPromotion, now)
    ) {
      showBannerPromotion(topPromotion, now);
    }
  };

  const canShowModal = (promotion: Promotion, now: number): boolean => {
    const lastShown = state.lastModalShown[promotion.id];
    if (!lastShown) return true;

    const timeSince = now - lastShown;
    return timeSince >= mergedOptions.modalFrequencyCap!;
  };

  const canShowBanner = (promotion: Promotion, now: number): boolean => {
    const lastShown = state.lastBannerShown[promotion.id];
    if (!lastShown) return true;

    const timeSince = now - lastShown;
    return timeSince >= mergedOptions.promotionInterval!;
  };

  const showModalPromotion = (promotion: Promotion, now: number) => {
    setCurrentModal(promotion);
    setShowModal(true);
    setState(prev => ({
      ...prev,
      lastModalShown: {
        ...prev.lastModalShown,
        [promotion.id]: now
      }
    }));
  };

  const showBannerPromotion = (promotion: Promotion, now: number) => {
    setCurrentBanner(promotion);
    setShowBanner(true);
    setState(prev => ({
      ...prev,
      lastBannerShown: {
        ...prev.lastBannerShown,
        [promotion.id]: now
      }
    }));
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (currentModal) {
      setState(prev => ({
        ...prev,
        dismissedToday: new Set([...prev.dismissedToday, currentModal.id])
      }));
    }
    setTimeout(() => setCurrentModal(null), 300);
  };

  const handleBannerClose = () => {
    setShowBanner(false);
    if (currentBanner) {
      setState(prev => ({
        ...prev,
        dismissedToday: new Set([...prev.dismissedToday, currentBanner.id])
      }));
    }
    setTimeout(() => setCurrentBanner(null), 300);
  };

  // Clean up dismissed promotions at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = midnight.getTime() - now.getTime();

      return setTimeout(() => {
        setState(prev => ({
          ...prev,
          dismissedToday: new Set()
        }));
        checkMidnight(); // Schedule next check
      }, msUntilMidnight);
    };

    const timeout = checkMidnight();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View pointerEvents="box-none">
      {enableModal && (
        <PromotionModal
          promotion={currentModal}
          visible={showModal}
          onClose={handleModalClose}
        />
      )}

      {enableBanner && (
        <PromotionBanner
          promotion={currentBanner}
          visible={showBanner}
          onClose={handleBannerClose}
        />
      )}
    </View>
  );
}

export default PromotionManager;

