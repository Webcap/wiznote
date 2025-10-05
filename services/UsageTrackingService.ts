// UsageTrackingService has been updated to use Supabase instead of Firebase.
// This service now acts as a compatibility layer for existing code.

import { featureLimitService } from './FeatureLimitService';

// Simple event emitter for usage updates
class UsageEventEmitter {
  private listeners: Array<() => void> = [];

  subscribe(callback: () => void) {
    console.log('🔍 UsageEventEmitter: Adding listener, total listeners:', this.listeners.length + 1);
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
        console.log('🔍 UsageEventEmitter: Removed listener, total listeners:', this.listeners.length);
      }
    };
  }

  emit() {
    console.log('🔍 UsageEventEmitter: Emitting event to', this.listeners.length, 'listeners');
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('🔍 UsageEventEmitter: Error in listener callback:', error);
      }
    });
  }
}

export const usageEventEmitter = new UsageEventEmitter();

export interface UsageRecord {
  id: string;
  userId: string;
  featureId: string;
  duration: number; // in minutes for duration features, count for count features
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
}

export interface UserUsage {
  userId: string;
  featureId: string;
  currentPeriod: {
    start: Date;
    end: Date;
    totalUsage: number; // in minutes for duration features, count for count features
    usageRecords: UsageRecord[];
  };
  lastReset: Date;
}

export class UsageTrackingService {
  private static instance: UsageTrackingService;

  static getInstance(): UsageTrackingService {
    if (!UsageTrackingService.instance) {
      UsageTrackingService.instance = new UsageTrackingService();
    }
    return UsageTrackingService.instance;
  }

  // Initialize the service
  async initialize(): Promise<void> {
    await featureLimitService.initialize();
  }

  // Get current period start and end dates
  private getCurrentPeriod(period: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract + 7);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    return { start, end };
  }

  // Get user's current usage for a feature
  async getUserUsage(userId: string, featureId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly', isPremium: boolean = false): Promise<UserUsage> {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      // Get user's current usage from FeatureLimitService
      const usage = await featureLimitService.getUserFeatureUsage(userId, featureId, isPremium);
      
      if (!usage) {
        // Return empty usage if no record exists
        const { start, end } = this.getCurrentPeriod(period);
        return {
          userId,
          featureId,
          currentPeriod: {
            start,
            end,
            totalUsage: 0,
            usageRecords: []
          },
          lastReset: new Date()
        };
      }

      // Convert Supabase usage to legacy format
      const { start, end } = this.getCurrentPeriod(period);
              return {
          userId,
          featureId,
          currentPeriod: {
            start,
            end,
            totalUsage: usage.currentPeriod.usage || 0, // Ensure it's a valid number
            usageRecords: [] // We don't have individual records in the new system
          },
          lastReset: usage.lastReset || new Date()
        };
    } catch (error) {
      console.error('Error getting user usage:', error);
      throw error;
    }
  }

  // Record usage for a feature
  async recordUsage(userId: string, featureId: string, duration: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly', isPremium: boolean = false): Promise<void> {
    try {
      console.log(`🔍 UsageTrackingService: Recording usage - User: ${userId}, Feature: ${featureId}, Duration: ${duration}, Premium: ${isPremium}`);
      
      // Ensure service is initialized
      await this.initialize();
      
      // Determine usage type based on feature
      const usageType = featureId === 'voice_recording' ? 'duration' : 'count';
      
      await featureLimitService.recordFeatureUsage(
        userId,
        featureId,
        duration,
        isPremium,
        usageType
      );
      
      console.log(`🔍 UsageTrackingService: Usage recorded successfully, emitting event`);
      usageEventEmitter.emit(); // Emit event after successful recording
    } catch (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  }

  // Check if user can use a feature
  async canUseFeature(userId: string, featureId: string, requiredDuration: number = 0, period: 'daily' | 'weekly' | 'monthly' = 'monthly', isPremium: boolean = false): Promise<{
    canUse: boolean;
    reason?: string;
    currentUsage: number;
    limit: number;
    remaining: number;
  }> {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      const result = await featureLimitService.canUseFeature(userId, featureId, requiredDuration, isPremium);
      
      return {
        canUse: result.canUse,
        reason: result.reason,
        currentUsage: result.currentUsage,
        limit: typeof result.limit === 'number' ? result.limit : 0,
        remaining: typeof result.remaining === 'number' ? result.remaining : 0
      };
    } catch (error) {
      console.error('Error checking feature usage:', error);
      throw error;
    }
  }

  // Reset user usage for a feature
  async resetUserUsage(userId: string, featureId: string): Promise<void> {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      // Use the direct reset method from FeatureLimitService
      await featureLimitService.resetUserFeatureUsage(userId, featureId);
      
      console.log(`UsageTrackingService: Reset usage for user ${userId}, feature ${featureId}`);
    } catch (error) {
      console.error('Error resetting user usage:', error);
      throw error;
    }
  }

  // Reset voice recording usage
  async resetVoiceRecordingUsage(userId: string): Promise<void> {
    return this.resetUserUsage(userId, 'voice_recording');
  }

  // Reset all user usage
  async resetAllUserUsage(userId: string): Promise<void> {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      // Use the direct reset method from FeatureLimitService
      await featureLimitService.resetAllUserFeatureUsage(userId);
      
      console.log(`UsageTrackingService: Reset all usage for user ${userId}`);
    } catch (error) {
      console.error('Error resetting all user usage:', error);
      throw error;
    }
  }

  // Get usage data for a specific feature
  async getUsageData(userId: string, featureId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly', isPremium: boolean = false): Promise<{
    currentUsage: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    period: string;
  }> {
    try {
      console.log(`🔍 UsageTrackingService: Getting usage data - User: ${userId}, Feature: ${featureId}, Period: ${period}, Premium: ${isPremium}`);
      
      // Ensure service is initialized
      await this.initialize();
      
      const usage = await featureLimitService.getUserFeatureUsage(userId, featureId, isPremium);
      
      if (!usage) {
        console.log(`🔍 UsageTrackingService: No usage data found, returning defaults`);
        return {
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          period
        };
      }

      const limit = isPremium ? usage.currentPeriod.limit : usage.currentPeriod.limit;
      const currentUsage = usage.currentPeriod.usage || 0; // Ensure it's a valid number
      const remaining = limit === 'unlimited' ? 'unlimited' : Math.max(0, (limit || 0) - currentUsage);

      console.log(`🔍 UsageTrackingService: Usage data - Current: ${currentUsage}, Limit: ${limit}, Remaining: ${remaining}`);

      return {
        currentUsage,
        limit: limit || 0,
        remaining,
        period
      };
    } catch (error) {
      console.error('Error getting usage data:', error);
      throw error;
    }
  }

  // Get usage statistics
  async getUsageStats(featureId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    totalUsers: number;
    totalUsage: number;
    averageUsage: number;
    topUsers: Array<{ userId: string; usage: number; displayName?: string; email?: string }>;
  }> {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      const stats = await featureLimitService.getFeatureUsageStats(featureId, period);
      
      // Ensure we have valid numbers and arrays
      const totalUsers = stats?.totalUsers || 0;
      const totalUsage = stats?.totalUsage || 0;
      const averageUsage = stats?.averageUsage || 0;
      const topUsers = Array.isArray(stats?.topUsers) ? stats.topUsers.map(user => ({
        userId: user.userId || '',
        usage: user.usage || 0,
        displayName: user.displayName || ''
      })) : [];
      
      return {
        totalUsers,
        totalUsage,
        averageUsage,
        topUsers
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      // Return safe defaults instead of throwing
      return {
        totalUsers: 0,
        totalUsage: 0,
        averageUsage: 0,
        topUsers: []
      };
    }
  }
}

export const usageTrackingService = UsageTrackingService.getInstance(); 