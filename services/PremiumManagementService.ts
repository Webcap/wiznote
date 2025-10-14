import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';

/**
 * Premium Management Service
 * 
 * Handles premium access management including:
 * - Granting free premium
 * - Checking premium status
 * - Revoking premium
 * - Audit logging
 */

export interface PremiumStatus {
  isActive: boolean;
  planId?: string;
  planName?: string;
  status?: string;
  currentPeriodEnd?: string;
  currentPeriodStart?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
  isFree?: boolean;
  grantedBy?: string;
  grantedAt?: string;
  grantedReason?: string;
}

export interface GrantPremiumParams {
  userId: string;
  userEmail: string;
  duration: number | 'lifetime'; // Days or 'lifetime'
  planId?: string; // Optional specific plan
  reason: string;
  grantedBy: string; // Support agent/admin ID
}

export interface PremiumAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'granted' | 'revoked' | 'extended';
  duration?: string;
  planId?: string;
  reason: string;
  grantedBy: string;
  grantedByEmail: string;
  timestamp: Date;
}

class PremiumManagementService {
  private static instance: PremiumManagementService;

  private constructor() {}

  static getInstance(): PremiumManagementService {
    if (!PremiumManagementService.instance) {
      PremiumManagementService.instance = new PremiumManagementService();
    }
    return PremiumManagementService.instance;
  }

  /**
   * Grant free premium access to a user
   */
  async grantFreePremium(params: GrantPremiumParams): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('PremiumManagementService: Granting free premium:', params);

      // Calculate period end
      const now = new Date();
      let periodEnd: Date;

      if (params.duration === 'lifetime') {
        // 100 years = lifetime
        periodEnd = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
      } else {
        const days = parseInt(params.duration.toString());
        periodEnd = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
      }

      // Get plan details if planId provided, otherwise use default
      let plan = null;
      if (params.planId) {
        const { data } = await supabase
          .from('premium_plans')
          .select('*')
          .eq('id', params.planId)
          .single();
        plan = data;
      }

      // If no plan specified, get first active plan as default
      if (!plan) {
        const { data } = await supabase
          .from('premium_plans')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        plan = data;
      }

      const planId = plan?.id || 'free-premium';
      const planName = plan?.name || 'Free Premium';

      // Create premium data
      const premiumData: PremiumStatus = {
        isActive: true,
        planId: planId,
        planName: planName,
        status: 'active',
        currentPeriodEnd: periodEnd.toISOString(),
        currentPeriodStart: now.toISOString(),
        cancelAtPeriodEnd: false,
        isFree: true,
        grantedBy: params.grantedBy,
        grantedAt: now.toISOString(),
        grantedReason: params.reason,
      };

      // Update user profile using admin client
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          premium: premiumData,
          updated_at: now.toISOString(),
        })
        .eq('id', params.userId);

      if (updateError) {
        console.error('PremiumManagementService: Error updating user:', updateError);
        return { success: false, error: updateError.message };
      }

      // Log the action
      await this.logPremiumAction({
        userId: params.userId,
        userEmail: params.userEmail,
        action: 'granted',
        duration: params.duration === 'lifetime' ? 'lifetime' : `${params.duration} days`,
        planId: planId,
        reason: params.reason,
        grantedBy: params.grantedBy,
      });

      console.log('PremiumManagementService: Free premium granted successfully');
      return { success: true };

    } catch (error) {
      console.error('PremiumManagementService: Error granting premium:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Revoke premium access from a user
   */
  async revokePremium(
    userId: string,
    userEmail: string,
    reason: string,
    revokedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('PremiumManagementService: Revoking premium:', userId);

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          premium: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Log the action
      await this.logPremiumAction({
        userId,
        userEmail,
        action: 'revoked',
        reason,
        grantedBy: revokedBy,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get premium status for a user
   */
  async getPremiumStatus(userId: string): Promise<PremiumStatus | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('premium')
        .eq('id', userId)
        .single();

      if (error || !data || !data.premium) {
        return null;
      }

      return data.premium as PremiumStatus;
    } catch (error) {
      console.error('PremiumManagementService: Error getting premium status:', error);
      return null;
    }
  }

  /**
   * Log premium action for audit trail
   */
  private async logPremiumAction(log: Omit<PremiumAuditLog, 'id' | 'timestamp' | 'grantedByEmail'>): Promise<void> {
    try {
      // Get granted by user's email
      const { data: grantedByUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', log.grantedBy)
        .single();

      // For now, just log to console
      // TODO: Create premium_audit_logs table for proper tracking
      console.log('Premium Action Audit Log:', {
        ...log,
        grantedByEmail: grantedByUser?.email || 'unknown',
        timestamp: new Date().toISOString(),
      });

      // You can extend this to write to a dedicated audit table
    } catch (error) {
      console.error('Failed to log premium action:', error);
    }
  }

  /**
   * Get recent premium grants (for admin monitoring)
   */
  async getRecentGrants(limit: number = 20): Promise<PremiumAuditLog[]> {
    // TODO: Implement with dedicated audit table
    // For now, return empty array
    return [];
  }
}

// Export singleton instance
export const premiumManagementService = PremiumManagementService.getInstance();

