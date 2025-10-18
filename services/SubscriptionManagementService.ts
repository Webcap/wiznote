import { ApiConfig } from '../constants/ApiConfig';
import { supabase } from '../lib/supabase';
import type { EnhancedPlan } from '../types/EnhancedPlans';

export interface SubscriptionDetails {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  planId: string;
  planName: string;
  planPrice: number;
  planInterval: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialStart?: Date;
  trialEnd?: Date;
  nextBillingDate?: Date;
  amountDue?: number;
  currency: string;
}

export interface BillingPortalSession {
  url: string;
  expiresAt: Date;
}

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  date: string;
  periodStart?: string;
  periodEnd?: string;
  description: string;
  invoiceUrl?: string;
  invoicePdf?: string;
  amountDue: number;
  amountRemaining: number;
  paid: boolean;
  attempted: boolean;
}

export interface SubscriptionUpdateResult {
  success: boolean;
  message: string;
  subscription?: SubscriptionDetails;
  error?: string;
}

export class SubscriptionManagementService {
  private static instance: SubscriptionManagementService;
  private supabase = supabase;
  private stripeGuardianUrl: string;

  private constructor() {
    // Get the Stripe Guardian API URL - automatically selects dev or prod based on environment
    this.stripeGuardianUrl = ApiConfig.WEBHOOK_BASE_URL;
    console.log('SubscriptionManagementService: Using Stripe Guardian URL:', this.stripeGuardianUrl, '(Environment:', ApiConfig.IS_DEVELOPMENT ? 'DEV' : 'PROD', ')');
  }

  public static getInstance(): SubscriptionManagementService {
    if (!SubscriptionManagementService.instance) {
      SubscriptionManagementService.instance = new SubscriptionManagementService();
    }
    return SubscriptionManagementService.instance;
  }

  /**
   * Safely parse a date string, handling "N/A" and invalid dates
   */
  private parseDateSafely(dateValue: any, defaultDate?: Date): Date {
    if (!dateValue || dateValue === 'N/A' || dateValue === 'null' || dateValue === 'undefined') {
      return defaultDate || new Date();
    }
    
    const parsed = new Date(dateValue);
    if (isNaN(parsed.getTime())) {
      return defaultDate || new Date();
    }
    
    return parsed;
  }

  /**
   * Get current user's subscription details
   */
  async getCurrentSubscription(userId: string): Promise<SubscriptionDetails | null> {
    try {
      // Get user profile with premium info
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('premium, stripe_customer_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return null;
      }

      if (!profile) {
        console.log('No user profile found for user:', userId);
        return null;
      }

      console.log('User profile premium data:', profile.premium);

      if (!profile.premium?.isActive) {
        console.log('User does not have active premium subscription');
        return null; // No active subscription
      }

      // Check if planId exists (or if type contains the planId)
      const planId = profile.premium.planId || profile.premium.type;
      if (!planId) {
        console.warn('User has active premium but no planId or type:', profile.premium);
        return null; // Cannot fetch plan details without planId
      }

      console.log('Using planId:', planId);

      // Get plan details - try both id and stripe_price_id
      // This handles cases where planId might be either the internal ID or Stripe price ID
      let plan = null;
      let planError = null;

      // First try to find by id
      const { data: planById, error: errorById } = await this.supabase
        .from('premium_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (planById && !errorById) {
        plan = planById;
      } else {
        // If not found by id, try to find by stripe_price_id
        const { data: planByStripeId, error: errorByStripeId } = await this.supabase
          .from('premium_plans')
          .select('*')
          .eq('stripe_price_id', planId)
          .maybeSingle();

        if (planByStripeId && !errorByStripeId) {
          plan = planByStripeId;
        } else {
          planError = errorByStripeId || errorById;
        }
      }

      if (planError && !plan) {
        console.error('Error fetching plan details:', planError);
        return null;
      }

      if (!plan) {
        console.log('No plan found for planId:', planId);
        return null;
      }

      // Calculate default billing dates based on the plan interval
      const now = new Date();
      let defaultPeriodStart = now;
      let defaultPeriodEnd = new Date(now);
      
      // Set default period based on interval
      switch (plan.interval) {
        case 'weekly':
          defaultPeriodEnd.setDate(defaultPeriodEnd.getDate() + 7);
          break;
        case 'monthly':
          defaultPeriodEnd.setMonth(defaultPeriodEnd.getMonth() + 1);
          break;
        case 'yearly':
          defaultPeriodEnd.setFullYear(defaultPeriodEnd.getFullYear() + 1);
          break;
        default:
          defaultPeriodEnd.setMonth(defaultPeriodEnd.getMonth() + 1);
      }

      const currentPeriodStart = this.parseDateSafely(profile.premium.currentPeriodStart, defaultPeriodStart);
      const currentPeriodEnd = this.parseDateSafely(profile.premium.currentPeriodEnd, defaultPeriodEnd);
      const cancelAtPeriodEnd = profile.premium.cancelAtPeriodEnd || false;
      const isCanceled = profile.premium.status === 'canceled' || cancelAtPeriodEnd;
      
      // For canceled subscriptions, check if the period has ended
      const isPeriodEnded = isCanceled && now > currentPeriodEnd;
      
      // If subscription is canceled and period has ended, it should not be considered active
      if (isPeriodEnded) {
        console.log('Canceled subscription period has ended, user no longer has premium access');
        return null;
      }

      return {
        id: planId,
        status: profile.premium.status || 'active',
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd, // Use the actual field from database
        canceledAt: profile.premium.canceledAt ? this.parseDateSafely(profile.premium.canceledAt) : undefined,
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        planInterval: plan.interval,
        stripeCustomerId: profile.stripe_customer_id,
        stripeSubscriptionId: profile.premium.stripeSubscriptionId || profile.premium.subscriptionId,
        trialStart: profile.premium.trialStart ? this.parseDateSafely(profile.premium.trialStart) : undefined,
        trialEnd: profile.premium.trialEnd ? this.parseDateSafely(profile.premium.trialEnd) : undefined,
        nextBillingDate: currentPeriodEnd,
        currency: plan.currency || 'USD',
      };
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

    /**
   * Cancel subscription at period end
   */
   async cancelSubscription(userId: string): Promise<SubscriptionUpdateResult> {
     try {
       const subscription = await this.getCurrentSubscription(userId);
       if (!subscription) {
         return {
           success: false,
           message: 'No active subscription found',
           error: 'NO_SUBSCRIPTION'
         };
       }

       if (!subscription.stripeSubscriptionId) {
         return {
           success: false,
           message: 'No Stripe subscription ID found',
           error: 'NO_STRIPE_SUBSCRIPTION_ID'
         };
       }

       console.log('Canceling subscription for user:', userId);
       console.log('Subscription ID:', subscription.stripeSubscriptionId);

       // Call Stripe Guardian API to cancel the subscription in Stripe
       try {
         const response = await fetch(`${this.stripeGuardianUrl}/stripe/cancel-subscription`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             userId,
             subscriptionId: subscription.stripeSubscriptionId
           })
         });

         const data = await response.json();

         if (!response.ok || !data.success) {
           console.error('Failed to cancel subscription in Stripe:', data);
           return {
             success: false,
             message: data.message || 'Failed to cancel subscription. Please try again.',
             error: data.error || 'STRIPE_API_ERROR'
           };
         }

         console.log('Subscription successfully canceled in Stripe');
         
         // Refresh subscription data to get updated info
         const updatedSubscription = await this.getCurrentSubscription(userId);
         
         return {
           success: true,
           message: data.message || 'Subscription will be canceled at the end of the current billing period. You will not be charged again.',
           subscription: updatedSubscription || {
             ...subscription,
             status: 'canceled',
             cancelAtPeriodEnd: true,
             canceledAt: new Date()
           }
         };
       } catch (apiError) {
         console.error('API call error:', apiError);
         return {
           success: false,
           message: 'Failed to connect to payment service. Please try again.',
           error: apiError instanceof Error ? apiError.message : 'API_CONNECTION_ERROR'
         };
       }
     } catch (error) {
       console.error('Error canceling subscription:', error);
       return {
         success: false,
         message: 'An error occurred while canceling the subscription',
         error: error instanceof Error ? error.message : 'Unknown error'
       };
     }
   }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<SubscriptionUpdateResult> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'No subscription found',
          error: 'NO_SUBSCRIPTION'
        };
      }

      if (!subscription.cancelAtPeriodEnd) {
        return {
          success: false,
          message: 'Subscription is not scheduled for cancellation',
          error: 'NOT_CANCELED'
        };
      }

      if (!subscription.stripeSubscriptionId) {
        return {
          success: false,
          message: 'No Stripe subscription ID found',
          error: 'NO_STRIPE_SUBSCRIPTION_ID'
        };
      }

      console.log('Reactivating subscription for user:', userId);
      console.log('Subscription ID:', subscription.stripeSubscriptionId);

      // Call Stripe Guardian API to reactivate the subscription in Stripe
      try {
        const response = await fetch(`${this.stripeGuardianUrl}/stripe/reactivate-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            subscriptionId: subscription.stripeSubscriptionId
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Failed to reactivate subscription in Stripe:', data);
          return {
            success: false,
            message: data.message || 'Failed to reactivate subscription. Please try again.',
            error: data.error || 'STRIPE_API_ERROR'
          };
        }

        console.log('Subscription successfully reactivated in Stripe');
        
        // Refresh subscription data to get updated info
        const updatedSubscription = await this.getCurrentSubscription(userId);

        return {
          success: true,
          message: data.message || 'Subscription has been reactivated successfully. You will continue to be billed.',
          subscription: updatedSubscription || {
            ...subscription,
            status: 'active',
            cancelAtPeriodEnd: false,
            canceledAt: undefined
          }
        };
      } catch (apiError) {
        console.error('API call error:', apiError);
        return {
          success: false,
          message: 'Failed to connect to payment service. Please try again.',
          error: apiError instanceof Error ? apiError.message : 'API_CONNECTION_ERROR'
        };
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return {
        success: false,
        message: 'An error occurred while reactivating the subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available plans for upgrade/downgrade
   */
  async getAvailablePlans(): Promise<EnhancedPlan[]> {
    try {
      const { data: plans, error } = await this.supabase
        .from('premium_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch plans: ${error.message}`);
      }

      return plans || [];
    } catch (error) {
      console.error('Error fetching available plans:', error);
      return [];
    }
  }

  /**
   * Create Stripe billing portal session
   */
  async createBillingPortalSession(userId: string): Promise<BillingPortalSession | null> {
    try {
      // This would typically call your backend to create a Stripe billing portal session
      // For now, we'll return a placeholder
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription?.stripeCustomerId) {
        return null;
      }

      // In a real implementation, you'd call your backend API
      // const response = await fetch('/api/create-billing-portal-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ customerId: subscription.stripeCustomerId })
      // });
      // const session = await response.json();

      // Return the billing portal route
      return {
        url: `/billing-portal?customer=${subscription.stripeCustomerId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      return null;
    }
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(userId: string): Promise<any> {
    try {
      // This would fetch usage data from your usage tracking system
      // For now, return placeholder data
      return {
        features: {
          voice_recording: { used: 0, limit: 'unlimited' },
          ai_transcription: { used: 0, limit: 'unlimited' },
          note_storage: { used: 0, limit: 'unlimited' }
        },
        period: 'current',
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now, as ISO string
      };
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      return null;
    }
  }

  /**
   * Get billing history from Stripe
   */
  async getBillingHistory(userId: string, limit: number = 10): Promise<BillingHistoryItem[]> {
    try {
      console.log('Fetching billing history for user:', userId);
      
      // Call Stripe Guardian API to get billing history
      const response = await fetch(`${this.stripeGuardianUrl}/stripe/get-billing-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          limit
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to fetch billing history:', data);
        return [];
      }

      console.log(`Successfully fetched ${data.billingHistory?.length || 0} billing records`);
      return data.billingHistory || [];
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const subscriptionManagementService = SubscriptionManagementService.getInstance();
