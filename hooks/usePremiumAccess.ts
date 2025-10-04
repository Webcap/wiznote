import { useCallback, useEffect, useState } from 'react';
import { premiumAccessService, type PremiumStatus } from '../services/PremiumAccessService';
import { useAuth } from './useAuth';

export function usePremiumAccess() {
  const { user } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPremiumAccess = useCallback(async () => {
    if (!user?.id) {
      setPremiumStatus({
        isActive: false,
        isCanceled: false,
        periodEnded: false,
        hasAccess: false,
        reason: 'No user logged in'
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const status = await premiumAccessService.checkPremiumAccess(user.id);
      setPremiumStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check premium access';
      setError(errorMessage);
      console.error('Error checking premium access:', err);
      
      // Fallback to sync check with user object
      const fallbackStatus = premiumAccessService.checkPremiumAccessSync(user);
      setPremiumStatus(fallbackStatus);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check premium access on mount and when user changes
  useEffect(() => {
    checkPremiumAccess();
  }, [checkPremiumAccess]);

  // Sync check using user object (for immediate checks without API call)
  const checkPremiumAccessSync = useCallback(() => {
    if (!user) {
      return {
        isActive: false,
        isCanceled: false,
        periodEnded: false,
        hasAccess: false,
        reason: 'No user logged in'
      };
    }
    
    return premiumAccessService.checkPremiumAccessSync(user);
  }, [user]);

  // Convenience getters
  const hasAccess = premiumStatus?.hasAccess || false;
  const isActive = premiumStatus?.isActive || false;
  const isCanceled = premiumStatus?.isCanceled || false;
  const periodEnded = premiumStatus?.periodEnded || false;
  const reason = premiumStatus?.reason;

  return {
    // Status
    premiumStatus,
    hasAccess,
    isActive,
    isCanceled,
    periodEnded,
    reason,
    loading,
    error,
    
    // Actions
    checkPremiumAccess,
    checkPremiumAccessSync,
  };
}
