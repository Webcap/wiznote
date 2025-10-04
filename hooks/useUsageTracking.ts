import { useEffect, useState } from 'react';
import { usageEventEmitter, usageTrackingService, UserUsage } from '../services/UsageTrackingService';
import { useAuth } from './useAuth';

export function useUsageTracking(featureId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsage = async () => {
      if (!user?.id) {
        setUsage(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const isPremium = user?.premium?.isActive || false;
        const userUsage = await usageTrackingService.getUserUsage(user.id, featureId, period, isPremium);
        setUsage(userUsage);
      } catch (err) {
        console.error('useUsageTracking: Error loading usage:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load usage';
        setError(errorMessage);
        // Don't throw the error, just set it in state so the component can handle it gracefully
      } finally {
        setIsLoading(false);
      }
    };

    loadUsage();
  }, [user?.id, user?.premium?.isActive, featureId, period]);

  const recordUsage = async (duration: number) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const isPremium = user?.premium?.isActive || false;
      await usageTrackingService.recordUsage(user.id, featureId, duration, period, isPremium);
      // Reload usage after recording
      const updatedUsage = await usageTrackingService.getUserUsage(user.id, featureId, period, isPremium);
      setUsage(updatedUsage);
      // Emit event to notify other components
      usageEventEmitter.emit();
    } catch (err) {
      console.error('useUsageTracking: Error recording usage:', err);
      throw err;
    }
  };

  const checkCanUse = async (requiredDuration: number = 0) => {
    if (!user?.id) {
      return { canUse: false, reason: 'User not authenticated' };
    }

    try {
      const isPremium = user?.premium?.isActive || false;
      return await usageTrackingService.canUseFeature(user.id, featureId, requiredDuration, period, isPremium);
    } catch (err) {
      console.error('useUsageTracking: Error checking usage:', err);
      // Return a conservative default - don't allow usage if we can't verify limits
      return { 
        canUse: false, 
        reason: 'Usage tracking unavailable', 
        currentUsage: 0,
        limit: 0,
        remaining: 0
      };
    }
  };

  return {
    usage,
    isLoading,
    error,
    recordUsage,
    checkCanUse,
    currentUsage: usage?.currentPeriod.totalUsage || 0,
    currentUsageMinutes: Math.round((usage?.currentPeriod.totalUsage || 0) / 60),
  };
} 