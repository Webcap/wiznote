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

export interface SubscriptionUpdateResult {
  success: boolean;
  message: string;
  subscription?: SubscriptionDetails;
  error?: string;
}

export class SubscriptionManagementService {
  private static instance: SubscriptionManagementService;
  private supabase = supabase;

  private constructor() {}

  public static getInstance(): SubscriptionManagementService {
    if (!SubscriptionManagementService.instance) {
      SubscriptionManagementService.instance = new SubscriptionManagementService();
    }
    return SubscriptionManagementService.instance;
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

      // Get plan details
      const { data: plan, error: planError } = await this.supabase
        .from('premium_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching plan details:', planError);
        return null;
      }

      if (!plan) {
        console.log('No plan found for planId:', planId);
        return null;
      }

      const currentPeriodEnd = profile.premium.currentPeriodEnd ? new Date(profile.premium.currentPeriodEnd) : new Date();
      const now = new Date();
      const isCanceled = profile.premium.status === 'canceled';
      
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
        currentPeriodStart: profile.premium.currentPeriodStart ? new Date(profile.premium.currentPeriodStart) : new Date(),
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: isCanceled,
        canceledAt: profile.premium.renewedAt ? new Date(profile.premium.renewedAt) : undefined,
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        planInterval: plan.interval,
        stripeCustomerId: profile.stripe_customer_id,
        stripeSubscriptionId: profile.premium.stripeSubscriptionId || profile.premium.stripe_customer_id,
        trialStart: profile.premium.trialStart ? new Date(profile.premium.trialStart) : undefined,
        trialEnd: profile.premium.trialEnd ? new Date(profile.premium.trialEnd) : undefined,
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

       console.log('Canceling subscription for user:', userId);
       console.log('Subscription data:', subscription);

       // For now, just update the local database to mark as canceled
       // TODO: Integrate with Stripe when the webhook server is properly configured
       try {
         const now = new Date();
         const isPeriodEnded = now > subscription.currentPeriodEnd;
         
         const { error: updateError } = await this.supabase
           .from('user_profiles')
           .update({
             premium: {
               isActive: !isPeriodEnded, // Set to false if period has ended, true if still active
               planId: subscription.planId,
               type: subscription.planName,
               status: 'canceled',
               currentPeriodStart: subscription.currentPeriodStart.toISOString(),
               currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
               trialStart: subscription.trialStart?.toISOString(),
               trialEnd: subscription.trialEnd?.toISOString(),
               renewedAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             },
             updated_at: new Date().toISOString()
           })
           .eq('id', userId);

         if (updateError) {
           console.error('Failed to update subscription status:', updateError);
           return {
             success: false,
             message: 'Failed to update subscription status. Please try again.',
             error: updateError.message
           };
         }

         console.log('Subscription successfully marked as canceled in database');
         
         return {
           success: true,
           message: 'Subscription has been canceled. You will not be charged for the next billing period.',
           subscription: {
             ...subscription,
             status: 'canceled',
             cancelAtPeriodEnd: true,
             canceledAt: new Date()
           }
         };
       } catch (dbError) {
         console.error('Database update error:', dbError);
         return {
           success: false,
           message: 'Failed to update subscription status. Please try again.',
           error: dbError instanceof Error ? dbError.message : 'Database error'
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

      if (subscription.status !== 'canceled') {
        return {
          success: false,
          message: 'Subscription is not canceled',
          error: 'NOT_CANCELED'
        };
      }

      console.log('Reactivating subscription for user:', userId);
      console.log('Subscription data:', subscription);

      // For now, just update the local database to mark as active
      // TODO: Integrate with Stripe when the webhook server is properly configured
      try {
        const { error: updateError } = await this.supabase
          .from('user_profiles')
          .update({
            premium: {
              isActive: true,
              planId: subscription.planId,
              type: subscription.planName,
              status: 'active',
              currentPeriodStart: subscription.currentPeriodStart.toISOString(),
              currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
              trialStart: subscription.trialStart?.toISOString(),
              trialEnd: subscription.trialEnd?.toISOString(),
              renewedAt: undefined,
              updatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update subscription status:', updateError);
          return {
            success: false,
            message: 'Failed to update subscription status. Please try again.',
            error: updateError.message
          };
        }

        console.log('Subscription successfully reactivated in database');

      return {
        success: true,
        message: 'Subscription has been reactivated successfully',
        subscription: {
          ...subscription,
          status: 'active',
          cancelAtPeriodEnd: false,
          canceledAt: undefined
        }
      };
      } catch (dbError) {
        console.error('Database update error:', dbError);
        return {
          success: false,
          message: 'Failed to update subscription status. Please try again.',
          error: dbError instanceof Error ? dbError.message : 'Database error'
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
   * Get billing history
   */
  async getBillingHistory(userId: string): Promise<any[]> {
    try {
      // This would fetch billing history from Stripe
      // For now, return placeholder data
      return [
        {
          id: 'inv_1',
          amount: 4.99,
          currency: 'USD',
          status: 'paid',
          date: new Date().toISOString(), // Return as ISO string to match database format
          description: 'Premium Weekly Subscription'
        }
      ];
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const subscriptionManagementService = SubscriptionManagementService.getInstance();
