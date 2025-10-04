import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { supabaseFeatureService } from '../services/SupabaseFeatureService';
import { FeatureLimit, FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';
import { useAuth } from './useAuth';

export const useSupabaseFeatureLimits = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [featureLimits, setFeatureLimits] = useState<FeatureLimit[]>([]);
  const [userUsage, setUserUsage] = useState<UserFeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialized = useRef(false);
  const realtimeSubscriptions = useRef<(() => void)[]>([]);

  // Initialize feature limits
  const initialize = useCallback(async () => {
    if (isInitialized.current) return;

    try {
      setLoading(true);
      setError(null);

      // Load feature limits
      const limits = await supabaseFeatureService.getFeatureLimits();
      setFeatureLimits(limits);
      setLastUpdated(new Date());
      isInitialized.current = true;

      console.log('useSupabaseFeatureLimits: Initialized with limits:', limits.length);

      // Set up real-time subscriptions
      setupRealtimeSubscriptions();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize feature limits';
      setError(errorMessage);
      console.error('useSupabaseFeatureLimits: Initialization error:', err);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    // Subscribe to feature limits changes
    const limitsSubscription = supabaseFeatureService.subscribeToFeatureLimits((payload) => {
      console.log('useSupabaseFeatureLimits: Feature limits changed:', payload);
      refreshFeatureLimits();
    });

    // Subscribe to user usage changes if user is authenticated
    if (user?.id) {
      const usageSubscription = supabaseFeatureService.subscribeToUserUsage(user.id, (payload) => {
        console.log('useSupabaseFeatureLimits: User usage changed:', payload);
        refreshUserUsage();
      });

      realtimeSubscriptions.current.push(usageSubscription);
    }

    realtimeSubscriptions.current.push(limitsSubscription);
  }, [user?.id]);

  // Refresh feature limits
  const refreshFeatureLimits = useCallback(async () => {
    try {
      const limits = await supabaseFeatureService.getFeatureLimits();
      setFeatureLimits(limits);
      setLastUpdated(new Date());
      console.log('useSupabaseFeatureLimits: Feature limits refreshed');
    } catch (error) {
      console.error('useSupabaseFeatureLimits: Error refreshing limits:', error);
    }
  }, []);

  // Refresh user usage
  const refreshUserUsage = useCallback(async () => {
    if (!user?.id) return;

    try {
      const usage = await supabaseFeatureService.getUserFeatureUsageSummary(
        user.id, 
        user.premium?.isActive || false
      );
      setUserUsage(usage);
      console.log('useSupabaseFeatureLimits: User usage refreshed');
    } catch (error) {
      console.error('useSupabaseFeatureLimits: Error refreshing user usage:', error);
    }
  }, [user?.id, user?.premium?.isActive]);

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
      return await supabaseFeatureService.canUseFeature(
        user.id, 
        featureId, 
        requiredAmount, 
        user.premium?.isActive || false
      );
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error checking feature usage:', err);
      // Allow usage on error to prevent blocking users
      return {
        canUse: true,
        reason: 'Usage tracking unavailable',
        currentUsage: 0,
        limit: 'unlimited',
        remaining: 'unlimited',
        period: 'monthly',
        limitType: 'count',
        isPremium: user.premium?.isActive || false,
        featureName: featureId,
      };
    }
  }, [user?.id, user?.premium?.isActive]);

  // Record feature usage
  const recordFeatureUsage = useCallback(async (
    featureId: string, 
    amount: number = 1, 
    usageType: 'count' | 'duration' | 'storage' = 'count',
    sessionId?: string,
    context?: Record<string, any>
  ) => {
    if (!user?.id) {
      console.warn('useSupabaseFeatureLimits: Cannot record usage - user not authenticated');
      return;
    }

    try {
      await supabaseFeatureService.recordFeatureUsage(
        user.id, 
        featureId, 
        amount, 
        user.premium?.isActive || false,
        usageType,
        sessionId,
        context
      );
      
      // Refresh user usage after recording
      await refreshUserUsage();
      
      console.log(`useSupabaseFeatureLimits: Recorded usage for ${featureId}: ${amount} ${usageType}`);
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error recording usage:', err);
      // Don't throw error to prevent blocking user experience
    }
  }, [user?.id, user?.premium?.isActive, refreshUserUsage]);

  // Get feature limit
  const getFeatureLimit = useCallback(async (featureId: string): Promise<FeatureLimit | null> => {
    try {
      return await supabaseFeatureService.getFeatureLimit(featureId);
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error getting feature limit:', err);
      return null;
    }
  }, []);

  // Get user feature usage
  const getUserFeatureUsage = useCallback(async (featureId: string): Promise<UserFeatureUsage | null> => {
    if (!user?.id) return null;

    try {
      return await supabaseFeatureService.getUserFeatureUsage(
        user.id, 
        featureId, 
        user.premium?.isActive || false
      );
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error getting user feature usage:', err);
      return null;
    }
  }, [user?.id, user?.premium?.isActive]);

  // Get feature limits by category
  const getFeatureLimitsByCategory = useCallback(async (category: FeatureLimit['category']): Promise<FeatureLimit[]> => {
    try {
      return await supabaseFeatureService.getFeatureLimitsByCategory(category);
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error getting limits by category:', err);
      return [];
    }
  }, []);

  // Get premium features
  const getPremiumFeatures = useCallback(async (): Promise<FeatureLimit[]> => {
    try {
      return await supabaseFeatureService.getPremiumFeatures();
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error getting premium features:', err);
      return [];
    }
  }, []);

  // Get feature usage stats
  const getFeatureUsageStats = useCallback(async (
    featureId: string, 
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ) => {
    try {
      return await supabaseFeatureService.getFeatureUsageStats(featureId, period);
    } catch (err) {
      console.error('useSupabaseFeatureLimits: Error getting usage stats:', err);
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



  // Save feature limit (admin only)
  const saveFeatureLimit = useCallback(async (limit: FeatureLimit) => {
    try {
      setError(null);
      await supabaseFeatureService.saveFeatureLimit(limit);
      await refreshFeatureLimits();
      
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
  }, [refreshFeatureLimits, showSnackbar]);

  // Delete feature limit (admin only)
  const deleteFeatureLimit = useCallback(async (featureId: string) => {
    try {
      setError(null);
      await supabaseFeatureService.deleteFeatureLimit(featureId);
      await refreshFeatureLimits();
      
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
  }, [refreshFeatureLimits, showSnackbar]);

  // Initialize default limits (admin only)
  const initializeDefaults = useCallback(async () => {
    try {
      setError(null);
      
      // Get default limits from constants
      const { UNIFIED_FEATURE_LIMITS } = await import('../constants/UnifiedFeatureLimits');
      
      // Save each default limit
      for (const [featureId, limit] of Object.entries(UNIFIED_FEATURE_LIMITS)) {
        await supabaseFeatureService.saveFeatureLimit(limit);
      }
      
      await refreshFeatureLimits();
      
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
  }, [refreshFeatureLimits, showSnackbar]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      realtimeSubscriptions.current.forEach(unsubscribe => unsubscribe());
      realtimeSubscriptions.current = [];
      supabaseFeatureService.cleanup();
    };
  }, [initialize]);

  // Load user usage when user changes
  useEffect(() => {
    if (isInitialized.current && user?.id) {
      refreshUserUsage();
    }
  }, [user?.id, user?.premium?.isActive, refreshUserUsage]);

  // Re-setup subscriptions when user changes
  useEffect(() => {
    if (isInitialized.current) {
      // Clean up existing subscriptions
      realtimeSubscriptions.current.forEach(unsubscribe => unsubscribe());
      realtimeSubscriptions.current = [];
      
      // Set up new subscriptions
      setupRealtimeSubscriptions();
    }
  }, [user?.id, setupRealtimeSubscriptions]);

  return {
    // State
    featureLimits,
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

    // Query functions
    getFeatureLimitsByCategory,
    getPremiumFeatures,
    getFeatureUsageStats,

    // Management functions (admin only)
    saveFeatureLimit,
    deleteFeatureLimit,
    initializeDefaults,

    // Utility functions
    refreshFeatureLimits,
    refreshUserUsage,
    initialize,
  };
};
