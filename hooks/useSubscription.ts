import { useEffect, useState } from 'react';
import { subscriptionManagementService, type SubscriptionDetails } from '../services/SubscriptionManagementService';
import { useAuth } from './useAuth';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const sub = await subscriptionManagementService.getCurrentSubscription(user!.id);
      setSubscription(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      console.error('Error loading subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!user?.id) return { success: false, message: 'User not authenticated' };

    try {
      const result = await subscriptionManagementService.cancelSubscription(user.id);
      if (result.success) {
        await loadSubscription(); // Refresh data
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const reactivateSubscription = async () => {
    if (!user?.id) return { success: false, message: 'User not authenticated' };

    try {
      const result = await subscriptionManagementService.reactivateSubscription(user.id);
      if (result.success) {
        await loadSubscription(); // Refresh data
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const createBillingPortalSession = async () => {
    if (!user?.id) return null;

    try {
      return await subscriptionManagementService.createBillingPortalSession(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create billing portal session');
      return null;
    }
  };

  const getUsage = async () => {
    if (!user?.id) return null;

    try {
      return await subscriptionManagementService.getSubscriptionUsage(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
      return null;
    }
  };

  const getBillingHistory = async () => {
    if (!user?.id) return [];

    try {
      return await subscriptionManagementService.getBillingHistory(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing history');
      return [];
    }
  };

  const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCanceled = subscription?.status === 'canceled';
  const isPastDue = subscription?.status === 'past_due';
  const isTrialing = subscription?.status === 'trialing';

  return {
    // Data
    subscription,
    loading,
    error,
    
    // Computed values
    isPremium,
    isCanceled,
    isPastDue,
    isTrialing,
    
    // Actions
    loadSubscription,
    cancelSubscription,
    reactivateSubscription,
    createBillingPortalSession,
    getUsage,
    getBillingHistory,
    
    // Utility
    refresh: loadSubscription,
  };
}
