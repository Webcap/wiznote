import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    featureLimitManager,
    UnifiedFeatureLimit
} from '../constants/UnifiedFeatureLimits';
import { supabase } from '../lib/supabase';
import { featureLimitService } from '../services/FeatureLimitService';
// Removed usageDataService import - now using featureLimitService directly
import { useAuth } from './useAuth';
import { useFeatureFlags } from './useFeatureFlags';

/**
 * UNIFIED FEATURE LIMITS HOOK
 * 
 * This hook replaces the old useTrackingFeatures and provides a single
 * interface for working with feature limits, usage tracking, and feature flags.
 * 
 * Key benefits:
 * - Single source of truth for all feature-related data
 * - Automatic integration with feature flags
 * - Consistent limit checking across the app
 * - Easy to use and maintain
 * - Dynamic limits from database (not static constants)
 */

export interface FeatureUsageData {
  featureId: string;
  featureName: string;
  description: string;
  category: UnifiedFeatureLimit['category'];
  currentUsage: number;
  userLimit: number | 'unlimited';
  limitType: string;
  period: string;
  isActive: boolean;
  canUse: boolean;
  reason?: string;
  usagePercentage: number;
  isUnlimited: boolean;
  requiresUpgrade: boolean;
  requiresFeatureFlag?: boolean;
  featureFlagKey?: string;
}

export interface UnifiedFeatureLimitsData {
  // All available features
  allFeatures: UnifiedFeatureLimit[];
  
  // Features available to current user
  availableFeatures: UnifiedFeatureLimit[];
  
  // Features with usage tracking
  trackedFeatures: FeatureUsageData[];
  
  // Features by category
  featuresByCategory: Record<string, UnifiedFeatureLimit[]>;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Helper functions
  canUseFeature: (featureId: string, currentUsage?: number) => { canUse: boolean; reason?: string; limit: number | 'unlimited' };
  getUserLimit: (featureId: string) => number | 'unlimited';
  getSessionLimit: (featureId: string) => { limit: number | 'unlimited'; type: string } | null;
  formatLimit: (limit: number | 'unlimited', limitType: string) => string;
  refreshLimits: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export function useUnifiedFeatureLimits(): UnifiedFeatureLimitsData {
  const { user, isAuthenticated } = useAuth();
  const { flags, loading: flagsLoading, error: flagsError } = useFeatureFlags();
  const [dynamicLimits, setDynamicLimits] = useState<Record<string, any>>({});
  const [usageData, setUsageData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get user's premium status
  const isPremium = useMemo(() => {
    return user?.premium?.isActive || false;
  }, [user?.premium?.isActive]);

  // Load limits function that can be used by other functions
  const loadLimits = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear cache and force reload if requested
      if (forceRefresh) {
        await featureLimitService.clearCacheAndReload();
      } else {
        // Initialize the feature limit service
        await featureLimitService.initialize();
      }
      
      // Load dynamic limits from database
      const limits = await featureLimitService.getFeatureLimits();
      setDynamicLimits(limits);
      
      // Load usage data for authenticated users using FeatureLimitService
      if (isAuthenticated && user?.id) {
        try {
          const featureIds = limits.map(limit => limit.featureId);
          console.log('🔍 DEBUG: Loading usage data for featureIds:', featureIds);
          
          // Initialize FeatureLimitService
          await featureLimitService.initialize();
          
          // Load usage data for each feature using FeatureLimitService
          const usageMap: Record<string, number> = {};
          for (const featureId of featureIds) {
            try {
              const usage = await featureLimitService.getUserFeatureUsage(user.id, featureId, isPremium);
              if (usage && usage.currentPeriod) {
                usageMap[featureId] = usage.currentPeriod.usage || 0;
              } else {
                usageMap[featureId] = 0;
              }
            } catch (err) {
              console.warn(`Failed to load usage for ${featureId}:`, err);
              usageMap[featureId] = 0;
            }
          }
          
          console.log('🔍 DEBUG: Usage data loaded:', usageMap);
          setUsageData(usageMap);
        } catch (err) {
          console.warn('Failed to load usage data:', err);
          setUsageData({});
        }
      }
    } catch (err) {
      console.error('Failed to load feature limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feature limits');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, isPremium]);
  
  // Initialize and load dynamic limits from database
  useEffect(() => {
    let mounted = true;
    
    loadLimits();
    
    // Set up a refresh interval to check for updates every 5 minutes (reduced from 30 seconds)
    const refreshInterval = setInterval(() => {
      if (mounted && isAuthenticated) {
        loadLimits();
      }
    }, 300000); // 5 minutes
    
    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, user?.id, isPremium, loadLimits]);
  
  // Add a manual refresh function
  const refreshLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reload limits from database
      const limits = await featureLimitService.getFeatureLimits();
      setDynamicLimits(limits);
      
      // Reload usage data using FeatureLimitService
      if (isAuthenticated && user?.id) {
        const featureIds = Array.isArray(limits) ? limits.map(l => l.featureId) : Object.keys(limits);
        
        // Initialize FeatureLimitService
        await featureLimitService.initialize();
        
        // Load usage data for each feature using FeatureLimitService
        const usageMap: Record<string, number> = {};
        for (const featureId of featureIds) {
          try {
            const usage = await featureLimitService.getUserFeatureUsage(user.id, featureId, isPremium);
            if (usage && usage.currentPeriod) {
              usageMap[featureId] = usage.currentPeriod.usage || 0;
            } else {
              usageMap[featureId] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load usage for ${featureId}:`, err);
            usageMap[featureId] = 0;
          }
        }
        
        setUsageData(usageMap);
      }
    } catch (err) {
      console.error('Failed to refresh feature limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh feature limits');
    } finally {
      setLoading(false);
    }
  };
  
  // Get all features with dynamic limits
  const allFeatures = useMemo(() => {
    const staticFeatures = featureLimitManager.getAllFeatureLimits();
    
    // Convert dynamicLimits array to object for easier lookup
    const dynamicLimitsMap: Record<string, any> = {};
    if (Array.isArray(dynamicLimits)) {
      dynamicLimits.forEach(limit => {
        dynamicLimitsMap[limit.featureId] = limit;
      });
    }
    
    const result = staticFeatures.map(feature => {
      // Check if we have dynamic limits for this feature
      const dynamicLimit = dynamicLimitsMap[feature.featureId];
      if (dynamicLimit) {
        return {
          ...feature,
          freeUserLimit: dynamicLimit.freeUserLimit,
          premiumUserLimit: dynamicLimit.premiumUserLimit,
          updatedAt: new Date(dynamicLimit.updatedAt || Date.now())
        };
      }
      return feature;
    });
    
    return result;
  }, [dynamicLimits, isAuthenticated]);
  
  // Get features available to current user
  const availableFeatures = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }
    
    const filtered = allFeatures.filter(feature => {
      // Check if feature is active
      if (!feature.isActive) {
        return false;
      }
      
      // Check feature flag if required
      if (feature.requiresFeatureFlag && feature.featureFlagKey) {
        const flagValue = flags[feature.featureFlagKey];
        const isEnabled = flagValue?.enabled === true;
        return isEnabled;
      }
      
      // Feature doesn't require feature flag, so it's available
      return true;
    });
    
    return filtered;
  }, [allFeatures, isAuthenticated, flags]);
  
  // Get features by category
  const featuresByCategory = useMemo(() => {
    const categorized: Record<string, UnifiedFeatureLimit[]> = {};
    
    availableFeatures.forEach(feature => {
      if (!categorized[feature.category]) {
        categorized[feature.category] = [];
      }
      categorized[feature.category].push(feature);
    });
    
    return categorized;
  }, [availableFeatures]);
  
  // Get tracked features with real usage data
  const trackedFeatures = useMemo(() => {
    if (!isAuthenticated) {
      console.log('useUnifiedFeatureLimits: Not authenticated, returning empty trackedFeatures');
      return [];
    }
    
    // Convert dynamicLimits array to object for easier lookup
    const dynamicLimitsMap: Record<string, any> = {};
    if (Array.isArray(dynamicLimits)) {
      dynamicLimits.forEach(limit => {
        dynamicLimitsMap[limit.featureId] = limit;
      });
    }
    
    return availableFeatures.map(feature => {
      // Get real usage data from the database
      const currentUsage = usageData[feature.featureId] || 0;
      
      // Get dynamic limit from database, fallback to static limit
      const dynamicLimit = dynamicLimitsMap[feature.featureId];
      const userLimit = isPremium 
        ? (dynamicLimit?.premiumLimit === 'unlimited' ? 999999 : (dynamicLimit?.premiumLimit || feature.premiumUserLimit))
        : (dynamicLimit?.freeUserLimit || feature.freeUserLimit);
      
      // Debug logging for AI summaries and voice recording
      if (feature.featureId === 'ai_summaries' || feature.featureId === 'voice_recording') {
        console.log(`🔍 DEBUG: ${feature.featureName} limit calculation:`);
        console.log('  - isPremium:', isPremium);
        console.log('  - dynamicLimit:', dynamicLimit);
        console.log('  - static freeUserLimit:', feature.freeUserLimit);
        console.log('  - static premiumUserLimit:', feature.premiumUserLimit);
        console.log('  - calculated userLimit:', userLimit);
        console.log('  - currentUsage:', currentUsage);
      }
      
      let canUse = true;
      let reason = 'Available';
      
      // Check if feature is active
      if (!feature.isActive) {
        canUse = false;
        reason = 'Feature is disabled';
      }
      
      // Check feature flag if required
      if (feature.requiresFeatureFlag && feature.featureFlagKey) {
        const flagValue = flags[feature.featureFlagKey];
        if (!flagValue?.enabled) {
          canUse = false;
          reason = 'Feature flag is disabled';
        }
      }
      
      // Check if user has reached the limit
      if (userLimit === 'unlimited') {
        canUse = true;
        reason = 'Unlimited usage';
      } else if (currentUsage >= userLimit) {
        canUse = false;
        reason = `Usage limit reached (${currentUsage}/${userLimit})`;
      }
      
      const canUseResult = { canUse, reason };
      
      const usagePercentage = userLimit === 'unlimited' ? 0 : 
        Math.round((currentUsage / userLimit) * 100);
      
      const result = {
        featureId: feature.featureId,
        featureName: feature.featureName,
        description: feature.description,
        category: feature.category,
        currentUsage,
        userLimit,
        limitType: feature.limitType,
        period: feature.period,
        isActive: feature.isActive,
        canUse: canUseResult.canUse,
        reason: canUseResult.reason,
        usagePercentage,
        isUnlimited: userLimit === 'unlimited',
        requiresUpgrade: !canUseResult.canUse && !isPremium,
        requiresFeatureFlag: feature.requiresFeatureFlag,
        featureFlagKey: feature.featureFlagKey,
      };
      
      return result;
    });
  }, [availableFeatures, isPremium, flags, isAuthenticated, usageData]);

  // Real-time subscriptions for feature limits and usage updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Track timeouts for cleanup
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    // Subscribe to feature limits changes
    const featureLimitsChannel = supabase
      .channel('feature-limits-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feature_limits' },
        async (payload) => {
          await loadLimits();
        }
      )
      .subscribe();

    // Subscribe to user feature usage changes
    const userUsageChannel = supabase
      .channel('user-feature-usage-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_feature_usage' },
        async (payload) => {
          if (user?.id) {
            // Refresh usage data for the current user using FeatureLimitService
            const limits = await featureLimitService.getFeatureLimits();
            const featureIds = Array.isArray(limits) ? limits.map(l => l.featureId) : Object.keys(limits);
            
            // Initialize FeatureLimitService
            await featureLimitService.initialize();
            
            // Load usage data for each feature using FeatureLimitService
            const newUsageData: Record<string, number> = {};
            for (const featureId of featureIds) {
              try {
                const usage = await featureLimitService.getUserFeatureUsage(user.id, featureId, isPremium);
                if (usage && usage.currentPeriod) {
                  newUsageData[featureId] = usage.currentPeriod.usage || 0;
                } else {
                  newUsageData[featureId] = 0;
                }
              } catch (err) {
                console.warn(`Failed to load usage for ${featureId}:`, err);
                newUsageData[featureId] = 0;
              }
            }
            
            setUsageData(newUsageData);
          }
        }
      )
      .subscribe();

    // Also listen for local usage change events to update UI immediately after actions
    const handleLocalUsageChange = async (evt: any) => {
      try {
        if (!user?.id) return;

        const detail = evt?.detail || {};
        if (detail.featureId) {
          // Use the newUsage value from the event if available (most accurate)
          // Otherwise fall back to optimistic update
          if (typeof detail.newUsage === 'number') {
            console.log(`useUnifiedFeatureLimits: Updating ${detail.featureId} usage to ${detail.newUsage} from event`);
            setUsageData(prev => ({
              ...prev,
              [detail.featureId]: detail.newUsage
            }));
          } else if (typeof detail.amount === 'number') {
            // Fallback to optimistic update if newUsage not available
            console.log(`useUnifiedFeatureLimits: Optimistically updating ${detail.featureId} usage by ${detail.amount}`);
            setUsageData(prev => ({
              ...prev,
              [detail.featureId]: Math.max(0, (prev?.[detail.featureId] || 0) + detail.amount)
            }));
          }
        }

        // Reconcile with server after a short delay to ensure consistency
        // This is a safety net in case the event data was incorrect
        const timeoutId = setTimeout(async () => {
          try {
            const limits = await featureLimitService.getFeatureLimits();
            const featureIds = Array.isArray(limits) ? limits.map(l => l.featureId) : Object.keys(limits);
            await featureLimitService.initialize();
            const newUsageData: Record<string, number> = {};
            for (const featureId of featureIds) {
              try {
                const usage = await featureLimitService.getUserFeatureUsage(user.id, featureId, isPremium);
                newUsageData[featureId] = usage?.currentPeriod?.usage || 0;
              } catch {
                newUsageData[featureId] = 0;
              }
            }
            console.log('useUnifiedFeatureLimits: Reconcile complete, updating usage data:', newUsageData);
            setUsageData(newUsageData);
          } catch (reconcileError) {
            console.warn('useUnifiedFeatureLimits: reconcile after featureUsageChanged failed:', reconcileError);
          }
        }, 1000); // Increased delay to 1 second to ensure database commit is complete
        timeoutIds.push(timeoutId);
      } catch (e) {
        console.warn('useUnifiedFeatureLimits: featureUsageChanged handler failed:', e);
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('featureUsageChanged', handleLocalUsageChange as any);
    }

    // Cleanup subscriptions and timeouts
    return () => {
      featureLimitsChannel.unsubscribe();
      userUsageChannel.unsubscribe();
      // Clear all pending timeouts
      timeoutIds.forEach(id => clearTimeout(id));
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('featureUsageChanged', handleLocalUsageChange as any);
      }
    };
  }, [isAuthenticated, user?.id, isPremium]);

  // Helper functions
  const canUseFeature = useMemo(() => {
    return (featureId: string, currentUsage: number = 0) => {
      // Find the feature in trackedFeatures which has the dynamic limits applied
      const feature = trackedFeatures.find(f => f.featureId === featureId);
      
      if (!feature) {
        return { canUse: false, reason: 'Feature not found', limit: 0 };
      }
      
      // Check if feature is active
      if (!feature.isActive) {
        return { canUse: false, reason: 'Feature is disabled', limit: 0 };
      }
      
      // Check feature flag if required
      if (feature.requiresFeatureFlag && feature.featureFlagKey) {
        const flagValue = flags[feature.featureFlagKey];
        if (!flagValue?.enabled) {
          return { canUse: false, reason: 'Feature flag is disabled', limit: 0 };
        }
      }
      
      const limit = feature.userLimit;
      
      // Check if user has reached the limit
      if (limit === 'unlimited') {
        return { canUse: true, reason: 'Unlimited usage', limit: 'unlimited' };
      }
      
      // Use the currentUsage parameter that was passed to the function
      if (currentUsage >= limit) {
        return { 
          canUse: false, 
          reason: `Usage limit reached (${currentUsage}/${limit})`, 
          limit: limit 
        };
      }
      
      return { 
        canUse: true, 
        reason: `Usage available (${currentUsage}/${limit})`, 
        limit: limit 
      };
    };
  }, [trackedFeatures, isPremium, flags]);
  
  const getUserLimit = useMemo(() => {
    return (featureId: string) => {
      // Try to get dynamic limit first, fallback to static
      let dynamicLimit = null;
      if (Array.isArray(dynamicLimits)) {
        dynamicLimit = dynamicLimits.find(limit => limit.featureId === featureId);
      } else if (dynamicLimits && typeof dynamicLimits === 'object') {
        dynamicLimit = dynamicLimits[featureId];
      }
      
      if (dynamicLimit) {
        return isPremium ? dynamicLimit.premiumUserLimit : dynamicLimit.freeUserLimit;
      }
      return featureLimitManager.getUserLimit(featureId, isPremium);
    };
  }, [isPremium, dynamicLimits]);
  
  const getSessionLimit = useMemo(() => {
    return (featureId: string) => {
      return featureLimitManager.getSessionLimit(featureId, isPremium);
    };
  }, [isPremium]);
  
  const formatLimit = useMemo(() => {
    return (limit: number | 'unlimited', limitType: string) => {
      return featureLimitManager.formatLimit(limit, limitType);
    };
  }, []);

  // Force refresh function for immediate updates
  const forceRefresh = useCallback(async () => {
    try {
      await loadLimits(true);
    } catch (error) {
      console.error('useUnifiedFeatureLimits: Force refresh error:', error);
    }
  }, [loadLimits]);
  
  return {
    allFeatures,
    availableFeatures,
    trackedFeatures,
    featuresByCategory,
    loading: loading || flagsLoading,
    error: error || flagsError,
    canUseFeature,
    getUserLimit,
    getSessionLimit,
    formatLimit,
    refreshLimits,
    forceRefresh,
  };
}

// Legacy compatibility hook (for gradual migration)
export function useTrackingFeatures() {
  const { trackedFeatures, loading, error } = useUnifiedFeatureLimits();
  
  return {
    trackingFeatures: trackedFeatures.map(feature => ({
      id: feature.featureId,
      name: feature.featureName,
      description: feature.description,
      freeLimit: feature.userLimit === 'unlimited' ? 0 : feature.userLimit,
      premiumLimit: feature.userLimit,
      category: feature.category
    })),
    allTrackingFeatures: trackedFeatures.map(feature => ({
      id: feature.featureId,
      name: feature.featureName,
      description: feature.description,
      freeLimit: feature.userLimit === 'unlimited' ? 0 : feature.userLimit,
      premiumLimit: feature.userLimit,
      category: feature.category
    })),
    loading,
  };
}
