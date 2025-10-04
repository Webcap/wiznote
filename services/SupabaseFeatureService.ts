import { supabase } from '../lib/supabase';
import { FeatureLimit, FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';

// Cross-platform UUID generation
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface FeatureUsageStats {
  totalUsers: number;
  totalUsage: number;
  averageUsage: number;
  premiumUsers: number;
  freeUsers: number;
  topUsers: Array<{
    userId: string;
    usage: number;
    displayName?: string;
    email?: string;
    isPremium: boolean;
  }>;
}



export class SupabaseFeatureService {
  private static instance: SupabaseFeatureService;
  private realtimeSubscriptions: Map<string, any> = new Map();
  private lastUpdateTimestamp: number = 0;

  private constructor() {}

  static getInstance(): SupabaseFeatureService {
    if (!SupabaseFeatureService.instance) {
      SupabaseFeatureService.instance = new SupabaseFeatureService();
    }
    return SupabaseFeatureService.instance;
  }

  // ===== FEATURE LIMITS MANAGEMENT =====

  async getFeatureLimits(): Promise<FeatureLimit[]> {
    try {
      const { data, error } = await supabase
        .from('feature_limits')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformFeatureLimit);
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting feature limits:', error);
      throw error;
    }
  }

  async getFeatureLimit(featureId: string): Promise<FeatureLimit | null> {
    try {
      const { data, error } = await supabase
        .from('feature_limits')
        .select('*')
        .eq('feature_id', featureId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformFeatureLimit(data);
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting feature limit:', error);
      throw error;
    }
  }

  async saveFeatureLimit(limit: FeatureLimit): Promise<void> {
    try {
      const limitData = {
        feature_id: limit.featureId,
        feature_name: limit.featureName,
        description: limit.description,
        category: limit.category,
        priority: limit.priority,
        is_active: limit.isActive,
        free_user_limit: limit.freeUserLimit,
        free_user_limit_type: limit.freeUserLimitType,
        free_user_period: limit.freeUserPeriod,
        free_user_session_limit: limit.freeUserSessionLimit,
        premium_user_limit: limit.premiumUserLimit.toString(),
        premium_user_limit_type: limit.premiumUserLimitType,
        premium_user_period: limit.premiumUserPeriod,
        premium_user_session_limit: limit.premiumUserSessionLimit?.toString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('feature_limits')
        .upsert(limitData, { onConflict: 'feature_id' });

      if (error) throw error;

      // Update timestamp to invalidate any cached data
      this.lastUpdateTimestamp = Date.now();
      
      // Also trigger FeatureLimitService refresh for immediate updates
      try {
        const { featureLimitService } = await import('./FeatureLimitService');
        if (featureLimitService.forceRefresh) {
          await featureLimitService.forceRefresh();
          console.log('SupabaseFeatureService: Triggered FeatureLimitService refresh');
        }
      } catch (error) {
        console.warn('SupabaseFeatureService: Could not trigger FeatureLimitService refresh:', error);
      }
      
      console.log(`SupabaseFeatureService: Feature limit ${limit.featureId} saved successfully`);
    } catch (error) {
      console.error('SupabaseFeatureService: Error saving feature limit:', error);
      throw error;
    }
  }

  async deleteFeatureLimit(featureId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('feature_limits')
        .delete()
        .eq('feature_id', featureId);

      if (error) throw error;
    } catch (error) {
      console.error('SupabaseFeatureService: Error deleting feature limit:', error);
      throw error;
    }
  }

  async getFeatureLimitsByCategory(category: FeatureLimit['category']): Promise<FeatureLimit[]> {
    try {
      const { data, error } = await supabase
        .from('feature_limits')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformFeatureLimit);
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting limits by category:', error);
      throw error;
    }
  }

  async getPremiumFeatures(): Promise<FeatureLimit[]> {
    try {
      const { data, error } = await supabase
        .from('feature_limits')
        .select('*')
        .eq('is_active', true)
        .or('premium_user_limit.eq.unlimited,premium_user_limit.gt.0')
        .order('priority', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformFeatureLimit);
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting premium features:', error);
      throw error;
    }
  }

  // ===== USER FEATURE USAGE =====

  async getUserFeatureUsage(userId: string, featureId: string, isPremium: boolean = false): Promise<UserFeatureUsage | null> {
    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create new usage record
        const limit = await this.getFeatureLimit(featureId);
        if (!limit) return null;

        return this.createNewUsageRecord(userId, featureId, limit, isPremium);
      }

      return this.transformUserFeatureUsage(data, isPremium);
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting user feature usage:', error);
      // Return null instead of throwing to prevent crashes
      return null;
    }
  }

  async getUserFeatureUsageSummary(userId: string, isPremium: boolean = false): Promise<UserFeatureUsage[]> {
    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map(usage => this.transformUserFeatureUsage(usage, isPremium));
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting user usage summary:', error);
      throw error;
    }
  }

  async recordFeatureUsage(
    userId: string,
    featureId: string,
    amount: number = 1,
    isPremium: boolean = false,
    usageType: 'count' | 'duration' | 'storage' = 'count',
    sessionId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      // Update current usage (this will create record if it doesn't exist)
      await this.updateCurrentUsage(userId, featureId, amount, usageType, isPremium);
    } catch (error) {
      console.error('SupabaseFeatureService: Error recording feature usage:', error);
      // Don't throw error to prevent breaking user experience
      console.warn('SupabaseFeatureService: Usage tracking failed, but continuing...');
    }
  }

  async canUseFeature(
    userId: string,
    featureId: string,
    requiredAmount: number = 1,
    isPremium: boolean = false
  ): Promise<FeatureLimitCheck> {
    try {
      const limit = await this.getFeatureLimit(featureId);
      if (!limit || !limit.isActive) {
        return {
          canUse: false,
          reason: 'Feature not available',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          period: 'monthly',
          limitType: 'count',
          isPremium,
          featureName: featureId,
        };
      }

      // Premium users get unlimited access
      if (isPremium && limit.premiumUserLimit === 'unlimited') {
        return {
          canUse: true,
          reason: 'Premium unlimited access',
          currentUsage: 0,
          limit: 'unlimited',
          remaining: 'unlimited',
          period: limit.premiumUserPeriod,
          limitType: limit.premiumUserLimitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      const usage = await this.getUserFeatureUsage(userId, featureId, isPremium);
      if (!usage) {
        return {
          canUse: false,
          reason: 'Unable to get usage information',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          period: 'monthly',
          limitType: 'count',
          isPremium,
          featureName: featureId,
        };
      }

      const userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
      const limitType = isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType;
      
      if (userLimit === 'unlimited') {
        return {
          canUse: true,
          reason: 'Unlimited access',
          currentUsage: usage.currentPeriod.usage,
          limit: 'unlimited',
          remaining: 'unlimited',
          period: usage.currentPeriod.period,
          limitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      // Calculate remaining uses
      const remaining = Math.max(0, userLimit - usage.currentPeriod.usage);
      
      if (remaining < requiredAmount) {
        return {
          canUse: false,
          reason: 'Limit reached',
          currentUsage: usage.currentPeriod.usage,
          limit: userLimit,
          remaining,
          period: usage.currentPeriod.period,
          limitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      return {
        canUse: true,
        reason: 'Usage allowed',
        currentUsage: usage.currentPeriod.usage,
        limit: userLimit,
        remaining,
        period: usage.currentPeriod.period,
        limitType: usage.currentPeriod.limitType,
        isPremium,
        featureName: limit.featureName,
      };
    } catch (error) {
      console.error('SupabaseFeatureService: Error checking feature usage:', error);
      return {
        canUse: false,
        reason: 'Error checking usage',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        period: 'monthly',
        limitType: 'count',
        isPremium,
        featureName: featureId,
      };
    }
  }

  // ===== ANALYTICS & STATISTICS =====

  async getFeatureUsageStats(
    featureId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<FeatureUsageStats> {
    try {
      // Get all users with their actual usage for this feature
      const { data: userUsage, error: userUsageError } = await supabase
        .from('user_feature_usage')
        .select('user_id, usage_count')
        .eq('feature_id', featureId);

      if (userUsageError) throw userUsageError;

      const totalUsers = userUsage?.length || 0;

      // Calculate total usage from actual user data
      const totalUsage = userUsage?.reduce((sum, record) => {
        return sum + (record.usage_count || 0);
      }, 0) || 0;

      // Calculate average usage
      const averageUsage = totalUsers > 0 ? totalUsage / totalUsers : 0;

      // Get premium vs free users (simplified - would need user profile data)
      const premiumUsers = Math.floor(totalUsers * 0.2); // Estimate 20% premium
      const freeUsers = totalUsers - premiumUsers;

      // Get top users with actual usage data
      const topUsers = userUsage
        ?.map(record => {
          return {
            userId: record.user_id,
            usage: record.usage_count || 0,
            displayName: `User ${record.user_id.slice(0, 8)}`,
            email: `user${record.user_id.slice(0, 8)}@example.com`,
            isPremium: Math.random() > 0.8, // Simplified premium detection
          };
        })
        .sort((a, b) => b.usage - a.usage) // Sort by usage descending
        .slice(0, 5) || [];

      return {
        totalUsers,
        totalUsage,
        averageUsage,
        premiumUsers,
        freeUsers,
        topUsers,
      };
    } catch (error) {
      console.error('SupabaseFeatureService: Error getting usage stats:', error);
      // Return safe defaults instead of throwing
      return {
        totalUsers: 0,
        totalUsage: 0,
        averageUsage: 0,
        premiumUsers: 0,
        freeUsers: 0,
        topUsers: [],
      };
    }
  }



  // ===== REAL-TIME SUBSCRIPTIONS =====

  subscribeToFeatureLimits(callback: (payload: any) => void): () => void {
    const subscription = supabase
      .channel('feature-limits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_limits',
        },
        callback
      )
      .subscribe();

    this.realtimeSubscriptions.set('feature-limits', subscription);

    return () => {
      subscription.unsubscribe();
      this.realtimeSubscriptions.delete('feature-limits');
    };
  }

  subscribeToUserUsage(userId: string, callback: (payload: any) => void): () => void {
    const subscription = supabase
      .channel(`user-usage-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_feature_usage',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.realtimeSubscriptions.set(`user-usage-${userId}`, subscription);

    return () => {
      subscription.unsubscribe();
      this.realtimeSubscriptions.delete(`user-usage-${userId}`);
    };
  }

  // ===== UTILITY METHODS =====

  private transformFeatureLimit(data: any): FeatureLimit {
    return {
      featureId: data.feature_id,
      featureName: data.feature_name,
      description: data.description,
      freeUserLimit: data.free_user_limit,
      freeUserPeriod: data.free_user_period,
      freeUserLimitType: data.free_user_limit_type,
      premiumUserLimit: data.premium_user_limit === 'unlimited' ? 'unlimited' : parseInt(data.premium_user_limit),
      premiumUserPeriod: data.premium_user_period,
      premiumUserLimitType: data.premium_user_limit_type,
      freeUserSessionLimit: data.free_user_session_limit,
      premiumUserSessionLimit: data.premium_user_session_limit === 'unlimited' ? 'unlimited' : data.premium_user_session_limit,
      isActive: data.is_active,
      category: data.category,
      priority: data.priority,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private transformUserFeatureUsage(data: any, isPremium: boolean): UserFeatureUsage {
    const usage = data.usage_count || 0;
    
    return {
      userId: data.user_id,
      featureId: data.feature_id,
      currentPeriod: {
        start: new Date(data.created_at),
        end: new Date(new Date(data.created_at).setMonth(new Date(data.created_at).getMonth() + 1)),
        usage,
        limit: 0, // Will be set by caller
        remaining: 0, // Will be set by caller
        period: 'monthly',
        limitType: 'count', // Will be set by caller
      },
      lastReset: new Date(data.last_used_at || data.created_at),
      isPremium,
    };
  }

  private async createNewUsageRecord(
    userId: string,
    featureId: string,
    limit: FeatureLimit,
    isPremium: boolean
  ): Promise<UserFeatureUsage> {
    const now = new Date();

    const usageData = {
      id: generateUUID(),
      user_id: userId,
      feature_id: featureId,
      usage_count: 0,
      last_used_at: now.toISOString(),
    };

    const { error } = await supabase
      .from('user_feature_usage')
      .insert(usageData);

    if (error) throw error;

    return {
      userId,
      featureId,
      currentPeriod: {
        start: now,
        end: new Date(now.setMonth(now.getMonth() + 1)),
        usage: 0,
        limit: isPremium ? limit.premiumUserLimit : limit.freeUserLimit,
        remaining: isPremium ? limit.premiumUserLimit : limit.freeUserLimit,
        period: 'monthly',
        limitType: 'count',
      },
      lastReset: now,
      isPremium,
    };
  }

  private async updateCurrentUsage(
    userId: string,
    featureId: string,
    amount: number,
    usageType: 'count' | 'duration' | 'storage',
    isPremium: boolean
  ): Promise<void> {
    try {
      // First, get the current usage to calculate the new value
      const { data: currentUsage, error: fetchError } = await supabase
        .from('user_feature_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching current usage:', fetchError);
        // Don't throw error, just log and continue
        console.warn('SupabaseFeatureService: Could not fetch current usage, skipping update');
        return;
      }

      // If no record exists, try to create one first
      if (fetchError && fetchError.code === 'PGRST116') {
        console.log(`No usage record found for user ${userId}, feature ${featureId}. Creating new record...`);
        
        // Get feature limit to create proper usage record
        const limit = await this.getFeatureLimit(featureId);
        if (!limit) {
          console.warn(`No feature limit found for ${featureId}, skipping usage tracking`);
          return;
        }

        // Create new usage record
        const { error: createError } = await supabase
          .from('user_feature_usage')
          .insert({
            id: generateUUID(),
            user_id: userId,
            feature_id: featureId,
            usage_count: amount,
            last_used_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating usage record:', createError);
          console.warn('SupabaseFeatureService: Could not create usage record, skipping usage tracking');
          return;
        }

        console.log(`Created new usage record for user ${userId}, feature ${featureId} with usage_count = ${amount}`);
        return;
      }

      const currentValue = currentUsage?.usage_count || 0;
      const newValue = currentValue + amount;

      // Update with the new calculated value
      const { error: updateError } = await supabase
        .from('user_feature_usage')
        .update({
          usage_count: newValue,
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('feature_id', featureId);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        console.warn('SupabaseFeatureService: Could not update usage, skipping usage tracking');
        return;
      }

      console.log(`Updated usage_count for user ${userId}, feature ${featureId}: ${currentValue} + ${amount} = ${newValue}`);
    } catch (error) {
      console.error('Error in updateCurrentUsage:', error);
      console.warn('SupabaseFeatureService: Usage tracking failed, but continuing...');
    }
  }

  private getPeriodStart(period: 'daily' | 'weekly' | 'monthly', date: Date): Date {
    const start = new Date(date);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private getPeriodEnd(period: 'daily' | 'weekly' | 'monthly', date: Date): Date {
    const end = new Date(date);
    
    switch (period) {
      case 'daily':
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const day = end.getDay();
        const diff = end.getDate() - day + (day === 0 ? 0 : 7);
        end.setDate(diff);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    
    return end;
  }

  // ===== CACHE MANAGEMENT =====

  // Get the last update timestamp for cache invalidation
  getLastUpdateTimestamp(): number {
    return this.lastUpdateTimestamp;
  }

  // Force refresh by updating timestamp
  forceRefresh(): void {
    this.lastUpdateTimestamp = Date.now();
    console.log('SupabaseFeatureService: Cache invalidated, next request will fetch fresh data');
  }

  // ===== CLEANUP =====

  cleanup(): void {
    this.realtimeSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.realtimeSubscriptions.clear();
  }
}

// Export singleton instance
export const supabaseFeatureService = SupabaseFeatureService.getInstance();
