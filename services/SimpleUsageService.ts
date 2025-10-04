import { supabase } from '../lib/supabase';

// Simple usage tracking service
export class SimpleUsageService {
  private static instance: SimpleUsageService;

  static getInstance(): SimpleUsageService {
    if (!SimpleUsageService.instance) {
      SimpleUsageService.instance = new SimpleUsageService();
    }
    return SimpleUsageService.instance;
  }

  // Record usage for a feature (amount is in minutes for duration-based features)
  async recordUsage(userId: string, featureId: string, amount: number = 1): Promise<void> {
    try {
      console.log(`📊 SimpleUsageService: Recording usage - User: ${userId}, Feature: ${featureId}, Amount: ${amount} minutes`);
      
      // Validate user ID
      if (!userId || userId === '') {
        console.warn('📊 SimpleUsageService: Invalid user ID provided for usage recording');
        return;
      }
      
      // First, try to get current usage
      const currentUsage = await this.getUsage(userId, featureId);
      const newUsage = currentUsage + amount;
      
      // Get current period dates (monthly period)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const { error } = await supabase
        .from('user_feature_usage')
        .upsert({
          user_id: userId,
          feature_id: featureId,
          usage_duration: featureId === 'voice_recording' ? newUsage : 0, // Track duration for voice recording
          usage_count: featureId !== 'voice_recording' ? newUsage : 0, // Track count for other features
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          period_type: 'monthly',
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,feature_id'
        });

      if (error) {
        console.error('📊 SimpleUsageService: Error recording usage:', error);
        throw error;
      }

      console.log(`📊 SimpleUsageService: Usage recorded successfully - Previous: ${currentUsage}, New: ${newUsage}`);
    } catch (error) {
      console.error('📊 SimpleUsageService: Error recording usage:', error);
      throw error;
    }
  }

  // Get current usage for a feature (returns minutes for voice recording, count for others)
  async getUsage(userId: string, featureId: string): Promise<number> {
    try {
      console.log(`📊 SimpleUsageService: Getting usage - User: ${userId}, Feature: ${featureId}`);
      
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('usage_count, usage_duration')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('📊 SimpleUsageService: Error getting usage:', error);
        
        // Handle specific error types
        if (error.code === '406' || error.message?.includes('Not Acceptable')) {
          console.warn('📊 SimpleUsageService: Database access issue (406), returning 0 usage');
          return 0;
        }
        
        // Handle RLS policy violations
        if (error.message?.includes('row-level security policy')) {
          console.warn('📊 SimpleUsageService: RLS policy violation - user may not be authenticated');
          return 0;
        }
        
        // Handle permission denied errors
        if (error.message?.includes('permission denied')) {
          console.warn('📊 SimpleUsageService: Permission denied - user may not be authenticated');
          return 0;
        }
        
        throw error;
      }

      // Return duration for voice recording, count for other features
      const usage = featureId === 'voice_recording' 
        ? (data?.usage_duration || 0)
        : (data?.usage_count || 0);
      
      console.log(`📊 SimpleUsageService: Current usage for ${featureId}: ${usage} ${featureId === 'voice_recording' ? 'minutes' : 'count'}`);
      return usage;
    } catch (error) {
      console.error('📊 SimpleUsageService: Error getting usage:', error);
      return 0;
    }
  }

  // Check if user can start a recording session (check session limits)
  async canStartRecordingSession(userId: string, sessionDurationMinutes: number = 5): Promise<{
    canStart: boolean;
    reason?: string;
    currentUsage: number;
    monthlyLimit: number;
    remainingMonthly: number;
    sessionLimit: number;
  }> {
    try {
      console.log(`📊 SimpleUsageService: Checking if user can start recording session - User: ${userId}, Session Duration: ${sessionDurationMinutes} minutes`);
      
      // Validate user ID
      if (!userId || userId === '') {
        console.warn('📊 SimpleUsageService: Invalid user ID provided for session check');
        return {
          canStart: false,
          reason: 'User not authenticated',
          currentUsage: 0,
          monthlyLimit: 10, // Updated to match configuration
          remainingMonthly: 10, // Updated to match configuration
          sessionLimit: 5, // Updated to match configuration
        };
      }
      
      let currentUsage = 0;
      try {
        currentUsage = await this.getUsage(userId, 'voice_recording');
      } catch (usageError) {
        console.warn('📊 SimpleUsageService: Error getting usage, using fallback (0):', usageError);
        currentUsage = 0; // Fallback to 0 usage if database access fails
      }
      
      // Get limits from FeatureLimitService to ensure consistency
      const { featureLimitService } = await import('./FeatureLimitService');
      await featureLimitService.initialize();
      
      const voiceRecordingLimit = await featureLimitService.getFeatureLimit('voice_recording');
      const monthlyLimit = voiceRecordingLimit?.freeUserLimit || 10; // Default to 10 minutes if not found
      const remainingMonthly = Math.max(0, monthlyLimit - currentUsage);
      const sessionLimit = voiceRecordingLimit?.freeUserSessionLimit || 5; // Get from feature limit config
      
      // Check if session duration exceeds session limit
      if (sessionDurationMinutes > sessionLimit) {
        return {
          canStart: false,
          reason: `Session duration (${sessionDurationMinutes} minutes) exceeds the limit of ${sessionLimit} minutes per recording session.`,
          currentUsage,
          monthlyLimit,
          remainingMonthly,
          sessionLimit,
        };
      }
      
      // Check if remaining monthly time is sufficient
      if (remainingMonthly < sessionDurationMinutes) {
        return {
          canStart: false,
          reason: `Insufficient monthly recording time. You have ${remainingMonthly} minutes remaining but need ${sessionDurationMinutes} minutes.`,
          currentUsage,
          monthlyLimit,
          remainingMonthly,
          sessionLimit,
        };
      }
      
      return {
        canStart: true,
        currentUsage,
        monthlyLimit,
        remainingMonthly,
        sessionLimit,
      };
    } catch (error) {
      console.error('📊 SimpleUsageService: Error checking recording session:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Error checking recording limits. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('relation "user_feature_usage" does not exist')) {
          errorMessage = 'Usage tracking system not initialized. Please contact support.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Database access denied. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network connection issue. Please check your internet connection.';
        }
      }
      
      return {
        canStart: false,
        reason: errorMessage,
        currentUsage: 0,
        monthlyLimit: 10, // Updated to match configuration
        remainingMonthly: 10, // Updated to match configuration
        sessionLimit: 5, // Updated to match configuration
      };
    }
  }

  // Get all usage for a user
  async getAllUsage(userId: string): Promise<Record<string, number>> {
    try {
      console.log(`📊 SimpleUsageService: Getting all usage for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('feature_id, usage_count, usage_duration')
        .eq('user_id', userId);

      if (error) {
        console.error('📊 SimpleUsageService: Error getting all usage:', error);
        throw error;
      }

      const usage: Record<string, number> = {};
      data?.forEach(record => {
        // Use duration for voice recording, count for others
        usage[record.feature_id] = record.feature_id === 'voice_recording' 
          ? (record.usage_duration || 0)
          : (record.usage_count || 0);
      });

      console.log(`📊 SimpleUsageService: All usage for user:`, usage);
      return usage;
    } catch (error) {
      console.error('📊 SimpleUsageService: Error getting all usage:', error);
      return {};
    }
  }

  // Reset usage for a feature
  async resetUsage(userId: string, featureId: string): Promise<void> {
    try {
      console.log(`📊 SimpleUsageService: Resetting usage - User: ${userId}, Feature: ${featureId}`);
      
      const resetData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Reset appropriate field based on feature type
      if (featureId === 'voice_recording') {
        resetData.usage_duration = 0;
      } else {
        resetData.usage_count = 0;
      }
      
      const { error } = await supabase
        .from('user_feature_usage')
        .update(resetData)
        .eq('user_id', userId)
        .eq('feature_id', featureId);

      if (error) {
        console.error('📊 SimpleUsageService: Error resetting usage:', error);
        throw error;
      }

      console.log(`📊 SimpleUsageService: Usage reset successfully`);
    } catch (error) {
      console.error('📊 SimpleUsageService: Error resetting usage:', error);
      throw error;
    }
  }

  // Reset all usage for a user
  async resetAllUsage(userId: string): Promise<void> {
    try {
      console.log(`📊 SimpleUsageService: Resetting all usage for user: ${userId}`);
      
      const { error } = await supabase
        .from('user_feature_usage')
        .update({
          usage_count: 0,
          usage_duration: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('📊 SimpleUsageService: Error resetting all usage:', error);
        throw error;
      }

      console.log(`📊 SimpleUsageService: All usage reset successfully`);
    } catch (error) {
      console.error('📊 SimpleUsageService: Error resetting all usage:', error);
      throw error;
    }
  }
}

export const simpleUsageService = SimpleUsageService.getInstance();
