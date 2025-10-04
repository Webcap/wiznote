import { supabase } from '../lib/supabase';

export interface PremiumStatus {
  isActive: boolean;
  isCanceled: boolean;
  periodEnded: boolean;
  hasAccess: boolean;
  reason?: string;
}

export class PremiumAccessService {
  private static instance: PremiumAccessService;
  private supabase = supabase;

  private constructor() {}

  public static getInstance(): PremiumAccessService {
    if (!PremiumAccessService.instance) {
      PremiumAccessService.instance = new PremiumAccessService();
    }
    return PremiumAccessService.instance;
  }

  /**
   * Check if a user has premium access, considering canceled subscriptions and period end dates
   */
  async checkPremiumAccess(userId: string): Promise<PremiumStatus> {
    try {
      // Get user profile with premium info
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('premium')
        .eq('id', userId)
        .single();

      if (profileError || !profile.premium) {
        return {
          isActive: false,
          isCanceled: false,
          periodEnded: false,
          hasAccess: false,
          reason: 'No premium subscription found'
        };
      }

      const premium = profile.premium;
      const isActive = premium.isActive || false;
      const isCanceled = premium.status === 'canceled';
      const now = new Date();
      
      // Check if period has ended for canceled subscriptions
      let periodEnded = false;
      if (isCanceled && premium.currentPeriodEnd) {
        const periodEnd = new Date(premium.currentPeriodEnd);
        periodEnded = now > periodEnd;
      }

      // User has access if:
      // 1. Subscription is active and not canceled, OR
      // 2. Subscription is canceled but period hasn't ended yet
      const hasAccess = (isActive && !isCanceled) || (isCanceled && !periodEnded);

      let reason: string | undefined;
      if (!hasAccess) {
        if (!isActive) {
          reason = 'No active subscription';
        } else if (isCanceled && periodEnded) {
          reason = 'Canceled subscription period has ended';
        }
      }

      return {
        isActive,
        isCanceled,
        periodEnded,
        hasAccess,
        reason
      };
    } catch (error) {
      console.error('Error checking premium access:', error);
      return {
        isActive: false,
        isCanceled: false,
        periodEnded: false,
        hasAccess: false,
        reason: 'Error checking premium status'
      };
    }
  }

  /**
   * Check if a user has premium access (synchronous version for use with existing user object)
   */
  checkPremiumAccessSync(user: any): PremiumStatus {
    if (!user?.premium) {
      return {
        isActive: false,
        isCanceled: false,
        periodEnded: false,
        hasAccess: false,
        reason: 'No premium subscription found'
      };
    }

    const premium = user.premium;
    const isActive = premium.isActive || false;
    const isCanceled = premium.status === 'canceled';
    const now = new Date();
    
    // Check if period has ended for canceled subscriptions
    let periodEnded = false;
    if (isCanceled && premium.currentPeriodEnd) {
      const periodEnd = new Date(premium.currentPeriodEnd);
      periodEnded = now > periodEnd;
    }

    // User has access if:
    // 1. Subscription is active and not canceled, OR
    // 2. Subscription is canceled but period hasn't ended yet
    const hasAccess = (isActive && !isCanceled) || (isCanceled && !periodEnded);

    let reason: string | undefined;
    if (!hasAccess) {
      if (!isActive) {
        reason = 'No active subscription';
      } else if (isCanceled && periodEnded) {
        reason = 'Canceled subscription period has ended';
      }
    }

    return {
      isActive,
      isCanceled,
      periodEnded,
      hasAccess,
      reason
    };
  }
}

// Export singleton instance
export const premiumAccessService = PremiumAccessService.getInstance();
