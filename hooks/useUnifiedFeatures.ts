import { useCallback, useEffect, useState } from 'react';
import { unifiedFeatureService } from '../services/UnifiedFeatureService';
import { FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';
import { useAuth } from './useAuth';

export function useUnifiedFeatures() {
  const { user } = useAuth();
  const [userUsage, setUserUsage] = useState<UserFeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPremium = user?.premium?.isActive || false;

  // Load user usage data
  const loadUserUsage = useCallback(async () => {
    if (!user?.id) {
      setUserUsage([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const usage = await unifiedFeatureService.getUserFeatureUsage(user.id, isPremium);
      setUserUsage(usage);
    } catch (err) {
      console.error('Error loading user usage:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
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
        featureName: featureId
      };
    }

    try {
      return await unifiedFeatureService.canUseFeature(user.id, featureId, requiredAmount, isPremium);
    } catch (err) {
      console.error('Error checking feature usage:', err);
      return {
        canUse: false,
        reason: 'Error checking usage',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        period: 'monthly',
        limitType: 'count',
        isPremium,
        featureName: featureId
      };
    }
  }, [user?.id, isPremium]);

  // Record feature usage
  const recordFeatureUsage = useCallback(async (
    featureId: string, 
    amount: number = 1
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await unifiedFeatureService.recordUsage(user.id, featureId, amount);
      // Reload usage data after recording
      await loadUserUsage();
    } catch (err) {
      console.error('Error recording feature usage:', err);
      throw err;
    }
  }, [user?.id, loadUserUsage]);

  // Get current usage for a specific feature
  const getCurrentUsage = useCallback(async (featureId: string): Promise<number> => {
    if (!user?.id) return 0;

    try {
      return await unifiedFeatureService.getCurrentUsage(user.id, featureId);
    } catch (err) {
      console.error('Error getting current usage:', err);
      return 0;
    }
  }, [user?.id]);

  // Reset usage for a feature
  const resetFeatureUsage = useCallback(async (featureId: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await unifiedFeatureService.resetUsage(user.id, featureId);
      // Reload usage data after reset
      await loadUserUsage();
    } catch (err) {
      console.error('Error resetting feature usage:', err);
      throw err;
    }
  }, [user?.id, loadUserUsage]);

  // Reset all usage
  const resetAllUsage = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await unifiedFeatureService.resetAllUsage(user.id);
      // Reload usage data after reset
      await loadUserUsage();
    } catch (err) {
      console.error('Error resetting all usage:', err);
      throw err;
    }
  }, [user?.id, loadUserUsage]);

  // Get feature limit info
  const getFeatureLimit = useCallback((featureId: string) => {
    return unifiedFeatureService.getFeatureLimit(featureId);
  }, []);

  // Get all feature limits
  const getAllFeatureLimits = useCallback(() => {
    return unifiedFeatureService.getAllFeatureLimits();
  }, []);

  // Load usage data on mount and when user changes
  useEffect(() => {
    loadUserUsage();
  }, [loadUserUsage]);

  return {
    // State
    userUsage,
    loading,
    error,
    isPremium,
    
    // Actions
    canUseFeature,
    recordFeatureUsage,
    getCurrentUsage,
    resetFeatureUsage,
    resetAllUsage,
    getFeatureLimit,
    getAllFeatureLimits,
    
    // Utilities
    refresh: loadUserUsage
  };
}

// Hook for getting usage for a specific feature
export function useFeatureUsage(featureId: string) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canUse, setCanUse] = useState<FeatureLimitCheck | null>(null);

  const isPremium = user?.premium?.isActive || false;

  const loadUsage = useCallback(async () => {
    if (!user?.id) {
      setUsage(0);
      setCanUse(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get current usage
      const currentUsage = await unifiedFeatureService.getCurrentUsage(user.id, featureId);
      setUsage(currentUsage);
      
      // Check if user can use the feature
      const canUseResult = await unifiedFeatureService.canUseFeature(user.id, featureId, 1, isPremium);
      setCanUse(canUseResult);
    } catch (err) {
      console.error('Error loading feature usage:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, featureId, isPremium]);

  const recordUsage = useCallback(async (amount: number = 1) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await unifiedFeatureService.recordUsage(user.id, featureId, amount);
      // Reload usage after recording
      await loadUsage();
    } catch (err) {
      console.error('Error recording usage:', err);
      throw err;
    }
  }, [user?.id, featureId, loadUsage]);

  // Load usage on mount and when dependencies change
  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return {
    usage,
    loading,
    error,
    canUse,
    recordUsage,
    refresh: loadUsage
  };
}
