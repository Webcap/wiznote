import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { featureCacheService } from '../services/FeatureCacheService';
import { featureLimitService } from '../services/FeatureLimitService';
import { realTimeFeatureService } from '../services/RealTimeFeatureService';
import { usageEventEmitter } from '../services/UsageTrackingService';
import { FeatureLimit, FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';
import { useAuth } from './useAuth';
import { usePremiumAccess } from './usePremiumAccess';

export const useFeatureLimits = () => {
  const { user } = useAuth();
  const { hasAccess: isPremium } = usePremiumAccess();
  const { showSnackbar } = useSnackbar();
  
  const [limits, setLimits] = useState<FeatureLimit[]>([]);
  const [userUsage, setUserUsage] = useState<UserFeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialized = useRef(false);
  const realTimeSubscription = useRef<(() => void) | null>(null);

  // Initialize feature limits
  const initialize = useCallback(async () => {
    if (isInitialized.current) return;

    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      const cachedLimits = await featureCacheService.get<FeatureLimit[]>('feature_limits');
      if (cachedLimits) {
        setLimits(cachedLimits);
        setLastUpdated(new Date());
        console.log('useFeatureLimits: Loaded limits from cache');
      }

      // Initialize service and load from Supabase
      await featureLimitService.initialize();
      const allLimits = await featureLimitService.getFeatureLimits();
      
      // Cache the limits
      await featureCacheService.set('feature_limits', allLimits, 5 * 60 * 1000); // 5 minutes
      
      setLimits(allLimits);
      setLastUpdated(new Date());
      isInitialized.current = true;

      console.log('useFeatureLimits: Initialized with limits:', allLimits.length);

      // Set up real-time subscription
      await setupRealTimeSubscription();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize feature limits';
      setError(errorMessage);
      console.error('useFeatureLimits: Initialization error:', err);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Set up real-time subscription
  const setupRealTimeSubscription = useCallback(async () => {
    try {
      await realTimeFeatureService.subscribeToFeatureChanges(() => {
        console.log('useFeatureLimits: Real-time update received');
        refreshLimits();
      });

      realTimeSubscription.current = () => {
        console.log('useFeatureLimits: Real-time subscription active');
      };
    } catch (error) {
      console.warn('useFeatureLimits: Failed to set up real-time subscription:', error);
    }
  }, []);

  // Refresh limits from service
  const refreshLimits = useCallback(async () => {
    try {
      const allLimits = await featureLimitService.getFeatureLimits();
      await featureCacheService.set('feature_limits', allLimits, 5 * 60 * 1000);
      setLimits(allLimits);
      setLastUpdated(new Date());
      console.log('useFeatureLimits: Limits refreshed');
    } catch (error) {
      console.error('useFeatureLimits: Error refreshing limits:', error);
    }
  }, []);

  // Force refresh for immediate updates (useful for admin dashboard)
  const forceRefresh = useCallback(async () => {
    try {
      console.log('useFeatureLimits: Force refreshing limits...');
      
      // Clear cache and force reload
      await featureCacheService.remove('feature_limits');
      
      // Reload limits from service
      await refreshLimits();
      
      console.log('useFeatureLimits: Force refresh complete');
    } catch (error) {
      console.error('useFeatureLimits: Error force refreshing limits:', error);
    }
  }, [refreshLimits]);

  // Load user feature usage
  const loadUserFeatureUsage = useCallback(async () => {
    if (!user?.id) return;

    try {
      const usage = await featureLimitService.getUserFeatureUsageSummary(user.id, isPremium);
      setUserUsage(usage);
    } catch (error) {
      console.error('useFeatureLimits: Error loading user usage:', error);
    }
  }, [user?.id, isPremium]);

  // Check if user can use a feature
  const canUseFeature = useCallback(async (
    featureId: string, 
    requiredAmount: number = 1
  ): Promise<FeatureLimitCheck> => {
    if (!user?.id) {
      return {
        canUse: false,
        reason: 'User not authenticated',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        period: 'monthly',
        limitType: 'count',
        isPremium: false,
        featureName: featureId,
      };
    }

    try {
      return await featureLimitService.canUseFeature(user.id, featureId, requiredAmount, isPremium);
    } catch (err) {
      console.error('useFeatureLimits: Error checking feature usage:', err);
      // Block usage on error to prevent overages
      return {
        canUse: false,
        reason: 'Usage tracking unavailable, access blocked for security',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        period: 'monthly',
        limitType: 'count',
        isPremium: isPremium,
        featureName: featureId,
      };
    }
  }, [user?.id, isPremium]);

  // Record feature usage
  const recordFeatureUsage = useCallback(async (
    featureId: string, 
    amount: number = 1, 
    usageType: 'count' | 'duration' | 'storage' = 'count'
  ) => {
    if (!user?.id) {
      console.warn('useFeatureLimits: Cannot record usage - user not authenticated');
      return;
    }

    try {
      await featureLimitService.recordFeatureUsage(
        user.id, 
        featureId, 
        amount, 
        isPremium,
        usageType
      );
      
      // Refresh user usage after recording
      await loadUserFeatureUsage();
      
      // Emit event to notify other components
      usageEventEmitter.emit();
      
      console.log(`useFeatureLimits: Recorded usage for ${featureId}: ${amount} ${usageType}`);
    } catch (err) {
      console.error('useFeatureLimits: Error recording usage:', err);
      // Don't throw error to prevent blocking user experience
    }
  }, [user?.id, user?.premium?.isActive, loadUserFeatureUsage]);

  // Get feature limit
  const getFeatureLimit = useCallback(async (featureId: string): Promise<FeatureLimit | null> => {
    try {
      return await featureLimitService.getFeatureLimit(featureId);
    } catch (err) {
      console.error('useFeatureLimits: Error getting feature limit:', err);
      return null;
    }
  }, []);

  // Get user feature usage
  const getUserFeatureUsage = useCallback(async (featureId: string): Promise<UserFeatureUsage | null> => {
    if (!user?.id) return null;

    try {
      return await featureLimitService.getUserFeatureUsage(user.id, featureId, isPremium);
    } catch (err) {
      console.error('useFeatureLimits: Error getting user feature usage:', err);
      return null;
    }
  }, [user?.id, isPremium]);

  // Get session limit for a feature
  const getSessionLimit = useCallback(async (featureId: string): Promise<number | 'unlimited' | null> => {
    try {
      return await featureLimitService.getSessionLimit(featureId, isPremium);
    } catch (err) {
      console.error('useFeatureLimits: Error getting session limit:', err);
      // Fallback to default session limits
      if (featureId === 'voice_recording') {
        return isPremium ? 'unlimited' : 5; // 5 minutes for free users
      }
      return null;
    }
  }, [isPremium]);

  // Get feature limits by category
  const getFeatureLimitsByCategory = useCallback(async (category: FeatureLimit['category']): Promise<FeatureLimit[]> => {
    try {
      return await featureLimitService.getFeatureLimitsByCategory(category);
    } catch (err) {
      console.error('useFeatureLimits: Error getting limits by category:', err);
      return [];
    }
  }, []);

  // Get premium features
  const getPremiumFeatures = useCallback(async (): Promise<FeatureLimit[]> => {
    try {
      return await featureLimitService.getPremiumFeatures();
    } catch (err) {
      console.error('useFeatureLimits: Error getting premium features:', err);
      return [];
    }
  }, []);

  // Get feature usage stats
  const getFeatureUsageStats = useCallback(async (
    featureId: string, 
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ) => {
    try {
      return await featureLimitService.getFeatureUsageStats(featureId, period);
    } catch (err) {
      console.error('useFeatureLimits: Error getting usage stats:', err);
      return {
        totalUsers: 0,
        totalUsage: 0,
        averageUsage: 0,
        premiumUsers: 0,
        freeUsers: 0,
        topUsers: [],
      };
    }
  }, []);

  // Save feature limit
  const saveFeatureLimit = useCallback(async (limit: FeatureLimit) => {
    try {
      setError(null);
      await featureLimitService.saveFeatureLimit(limit);
      await refreshLimits();
      
      if (Platform.OS === 'web') {
        showSnackbar('Feature limit saved successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save feature limit';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshLimits, showSnackbar]);

  // Delete feature limit
  const deleteFeatureLimit = useCallback(async (featureId: string) => {
    try {
      setError(null);
      await featureLimitService.deleteFeatureLimit(featureId);
      await refreshLimits();
      
      if (Platform.OS === 'web') {
        showSnackbar('Feature limit deleted successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete feature limit';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshLimits, showSnackbar]);

  // Initialize default limits
  const initializeDefaults = useCallback(async () => {
    try {
      setError(null);
      await featureLimitService.initializeDefaultLimits();
      await refreshLimits();
      
      if (Platform.OS === 'web') {
        showSnackbar('Feature limits initialized successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize defaults';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshLimits, showSnackbar]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await featureCacheService.invalidate('feature_limits');
      await featureLimitService.clearCacheAndReload();
      await refreshLimits();
      
      if (Platform.OS === 'web') {
        showSnackbar('Cache cleared successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    }
  }, [refreshLimits, showSnackbar]);

  // Check if user is premium (using the premium access service)
  const isPremiumUser = useCallback((): boolean => {
    return isPremium;
  }, [isPremium]);

  // Check if user has unlimited access to a specific feature
  const hasUnlimitedAccess = useCallback((featureId: string): boolean => {
    if (!user?.id) return false;
    
    const featureLimit = limits.find(limit => limit.featureId === featureId);
    if (!featureLimit) return false;
    
    const userLimit = isPremium ? featureLimit.premiumUserLimit : featureLimit.freeUserLimit;
    return userLimit === 'unlimited';
  }, [user?.id, isPremium, limits]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (realTimeSubscription.current) {
        realTimeFeatureService.unsubscribeFromChannel('feature-changes');
      }
    };
  }, [initialize]);

  // Load user usage when user changes
  useEffect(() => {
    if (isInitialized.current && user?.id) {
      loadUserFeatureUsage();
    }
  }, [user?.id, user?.premium?.isActive, loadUserFeatureUsage]);

  return {
    // State
    featureLimits: limits, // Alias for backward compatibility
    limits,
    userUsage,
    loading,
    error,
    lastUpdated,
    isInitialized: isInitialized.current,

    // Core functions
    canUseFeature,
    recordFeatureUsage,
    getFeatureLimit,
    getUserFeatureUsage,
    getSessionLimit,

    // Query functions
    getFeatureLimitsByCategory,
    getPremiumFeatures,
    getFeatureUsageStats,

    // Management functions
    saveFeatureLimit,
    deleteFeatureLimit,
    initializeDefaults,

    // Utility functions
    refreshLimits,
    loadUserFeatureUsage,
    clearCache,
    initialize,
    forceRefresh,

    // Premium status functions
    isPremium,
    hasUnlimitedAccess,
  };
}; 