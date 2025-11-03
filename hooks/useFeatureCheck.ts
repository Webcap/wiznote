import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseFeatureService } from '../services/SupabaseFeatureService';
import { FeatureLimitCheck } from '../types/FeatureLimits';
import { useAuth } from './useAuth';

interface FeatureCheckCache {
  [key: string]: {
    result: FeatureLimitCheck;
    timestamp: number;
    ttl: number;
  };
}

export const useFeatureCheck = () => {
  const { user } = useAuth();
  const [cache, setCache] = useState<FeatureCheckCache>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const cacheTimeout = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up expired cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    setCache(prevCache => {
      const newCache = { ...prevCache };
      Object.keys(newCache).forEach(key => {
        if (now - newCache[key].timestamp > newCache[key].ttl) {
          delete newCache[key];
        }
      });
      return newCache;
    });
  }, []);

  // Set up cache cleanup interval
  useEffect(() => {
    cacheTimeout.current = setInterval(cleanupCache, 60000); // Clean up every minute
    return () => {
      if (cacheTimeout.current) {
        clearInterval(cacheTimeout.current);
      }
    };
  }, [cleanupCache]);

  // Check if user can use a feature with caching
  const canUseFeature = useCallback(async (
    featureId: string,
    requiredAmount: number = 1,
    options: {
      bypassCache?: boolean;
      cacheTTL?: number; // Time to live in milliseconds
    } = {}
  ): Promise<FeatureLimitCheck> => {
    const { bypassCache = false, cacheTTL = 30000 } = options; // Default 30 second cache
    const cacheKey = `${featureId}_${requiredAmount}_${user?.id}_${user?.premium?.isActive}`;

    // Check cache first
    if (!bypassCache && cache[cacheKey]) {
      const cached = cache[cacheKey];
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.result;
      }
    }

    // Set loading state
    setLoading(prev => ({ ...prev, [cacheKey]: true }));

    try {
      if (!user?.id) {
        const result: FeatureLimitCheck = {
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

        // Cache the result
        setCache(prev => ({
          ...prev,
          [cacheKey]: {
            result,
            timestamp: Date.now(),
            ttl: cacheTTL,
          },
        }));

        return result;
      }

      const result = await supabaseFeatureService.canUseFeature(
        user.id,
        featureId,
        requiredAmount,
        user.premium?.isActive || false
      );

      // Cache the result
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          result,
          timestamp: Date.now(),
          ttl: cacheTTL,
        },
      }));

      return result;
    } catch (error) {
      console.error('useFeatureCheck: Error checking feature usage:', error);
      
      // Return optimistic result on error
      const fallbackResult: FeatureLimitCheck = {
        canUse: true,
        reason: 'Usage tracking unavailable',
        currentUsage: 0,
        limit: 'unlimited',
        remaining: 'unlimited',
        period: 'monthly',
        limitType: 'count',
        isPremium: user?.premium?.isActive || false,
        featureName: featureId,
      };

      // Cache the fallback result
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          result: fallbackResult,
          timestamp: Date.now(),
          ttl: cacheTTL,
        },
      }));

      return fallbackResult;
    } finally {
      setLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [user?.id, user?.premium?.isActive, cache]);

  // Record feature usage and invalidate cache
  const recordFeatureUsage = useCallback(async (
    featureId: string,
    amount: number = 1,
    usageType: 'count' | 'duration' | 'storage' = 'count',
    sessionId?: string,
    context?: Record<string, any>
  ) => {
    if (!user?.id) {
      console.warn('useFeatureCheck: Cannot record usage - user not authenticated');
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

      // Invalidate cache for this feature
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(featureId)) {
            delete newCache[key];
          }
        });
        return newCache;
      });

      console.log(`useFeatureCheck: Recorded usage for ${featureId}: ${amount} ${usageType}`);
    } catch (error) {
      console.error('useFeatureCheck: Error recording usage:', error);
      // Don't throw error to prevent blocking user experience
    }
  }, [user?.id, user?.premium?.isActive]);

  // Clear cache for a specific feature
  const clearFeatureCache = useCallback((featureId?: string) => {
    if (featureId) {
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(featureId)) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  // Get cached result for a feature
  const getCachedResult = useCallback((featureId: string, requiredAmount: number = 1): FeatureLimitCheck | null => {
    const cacheKey = `${featureId}_${requiredAmount}_${user?.id}_${user?.premium?.isActive}`;
    const cached = cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    
    return null;
  }, [cache, user?.id, user?.premium?.isActive]);

  // Check if a feature is currently loading
  const isLoading = useCallback((featureId: string, requiredAmount: number = 1): boolean => {
    const cacheKey = `${featureId}_${requiredAmount}_${user?.id}_${user?.premium?.isActive}`;
    return loading[cacheKey] || false;
  }, [loading, user?.id, user?.premium?.isActive]);

  return {
    canUseFeature,
    recordFeatureUsage,
    clearFeatureCache,
    getCachedResult,
    isLoading,
    cache,
  };
};
