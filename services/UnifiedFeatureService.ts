import { supabase } from '../lib/supabase';
import { FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';

// Centralized feature limit configuration
const UNIFIED_FEATURE_LIMITS = {
  'ai_summaries': {
    name: 'AI Summaries',
    description: 'Generate AI-powered note summaries',
    freeLimit: 15,
    premiumLimit: 'unlimited',
    category: 'ai',
    priority: 3,
    limitType: 'count'
  },
  'ai_key_details': {
    name: 'AI Key Details',
    description: 'Extract key details from notes using AI',
    freeLimit: 15,
    premiumLimit: 'unlimited',
    category: 'ai',
    priority: 4,
    limitType: 'count'
  },
  'ai_name_generating': {
    name: 'AI Name Generation',
    description: 'Generate AI-powered note titles',
    freeLimit: 10,
    premiumLimit: 'unlimited',
    category: 'ai',
    priority: 5,
    limitType: 'count'
  },
  'ai_transcription': {
    name: 'AI Transcription',
    description: 'Convert audio to text using AI',
    freeLimit: 10,
    premiumLimit: 'unlimited',
    category: 'ai',
    priority: 2,
    limitType: 'count'
  },
  'voice_recording': {
    name: 'Voice Recording',
    description: 'Record audio notes with voice-to-text transcription',
    freeLimit: 60,
    premiumLimit: 'unlimited',
    category: 'audio',
    priority: 1,
    limitType: 'duration',
    sessionLimit: 10
  },
  'note_storage': {
    name: 'Note Storage',
    description: 'Total storage space for notes and attachments',
    freeLimit: 100 * 1024 * 1024, // 100MB
    premiumLimit: 10 * 1024 * 1024 * 1024, // 10GB
    category: 'storage',
    priority: 6,
    limitType: 'storage'
  },
  'note_sharing': {
    name: 'Note Sharing',
    description: 'Share notes with other users',
    freeLimit: 5,
    premiumLimit: 'unlimited',
    category: 'collaboration',
    priority: 7,
    limitType: 'count'
  },
  'advanced_search': {
    name: 'Advanced Search',
    description: 'Advanced search and filtering capabilities',
    freeLimit: 15,
    premiumLimit: 'unlimited',
    category: 'analytics',
    priority: 8,
    limitType: 'count'
  },
  'note_export': {
    name: 'Note Export',
    description: 'Export notes in various formats',
    freeLimit: 5,
    premiumLimit: 'unlimited',
    category: 'analytics',
    priority: 9,
    limitType: 'count'
  },
  'real_time_sync': {
    name: 'Real-time Sync',
    description: 'Real-time synchronization across devices',
    freeLimit: 100,
    premiumLimit: 'unlimited',
    category: 'collaboration',
    priority: 10,
    limitType: 'count'
  },
  'custom_themes': {
    name: 'Custom Themes',
    description: 'Create and use custom themes',
    freeLimit: 2,
    premiumLimit: 'unlimited',
    category: 'customization',
    priority: 11,
    limitType: 'count'
  },
  'priority_support': {
    name: 'Priority Support',
    description: 'Priority customer support access',
    freeLimit: 1,
    premiumLimit: 'unlimited',
    category: 'other',
    priority: 12,
    limitType: 'count'
  }
} as const;

export class UnifiedFeatureService {
  private static instance: UnifiedFeatureService;

  static getInstance(): UnifiedFeatureService {
    if (!UnifiedFeatureService.instance) {
      UnifiedFeatureService.instance = new UnifiedFeatureService();
    }
    return UnifiedFeatureService.instance;
  }

  // Get all feature limits
  getAllFeatureLimits(): Record<string, typeof UNIFIED_FEATURE_LIMITS[keyof typeof UNIFIED_FEATURE_LIMITS]> {
    return UNIFIED_FEATURE_LIMITS;
  }

  // Get a specific feature limit
  getFeatureLimit(featureId: string): typeof UNIFIED_FEATURE_LIMITS[keyof typeof UNIFIED_FEATURE_LIMITS] | null {
    return UNIFIED_FEATURE_LIMITS[featureId as keyof typeof UNIFIED_FEATURE_LIMITS] || null;
  }

  // Check if user can use a feature
  async canUseFeature(
    userId: string, 
    featureId: string, 
    requiredAmount: number = 1,
    isPremium: boolean = false
  ): Promise<FeatureLimitCheck> {
    const featureLimit = this.getFeatureLimit(featureId);
    
    if (!featureLimit) {
      return {
        canUse: false,
        reason: 'Feature not found',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        period: 'monthly',
        limitType: 'count',
        isPremium,
        featureName: featureId
      };
    }

    // Get current usage
    const currentUsage = await this.getCurrentUsage(userId, featureId);
    const userLimit = isPremium ? featureLimit.premiumLimit : featureLimit.freeLimit;

    if (userLimit === 'unlimited') {
      return {
        canUse: true,
        currentUsage,
        limit: 'unlimited',
        remaining: 'unlimited',
        period: 'monthly',
        limitType: featureLimit.limitType,
        isPremium,
        featureName: featureLimit.name
      };
    }

    const remaining = Math.max(0, userLimit - currentUsage);
    const canUse = remaining >= requiredAmount;

    return {
      canUse,
      reason: canUse ? undefined : `Limit reached (${currentUsage}/${userLimit})`,
      currentUsage,
      limit: userLimit,
      remaining,
      period: 'monthly',
      limitType: featureLimit.limitType,
      isPremium,
      featureName: featureLimit.name
    };
  }

  // Record feature usage
  async recordUsage(
    userId: string, 
    featureId: string, 
    amount: number = 1
  ): Promise<void> {
    const featureLimit = this.getFeatureLimit(featureId);
    
    if (!featureLimit) {
      throw new Error(`Feature ${featureId} not found`);
    }

    // Get current usage
    const currentUsage = await this.getCurrentUsage(userId, featureId);
    const newUsage = currentUsage + amount;

    // Get current period dates (monthly)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const { error } = await supabase
      .from('user_feature_usage')
      .upsert({
        user_id: userId,
        feature_id: featureId,
        usage_duration: featureLimit.limitType === 'duration' ? newUsage : 0,
        usage_count: featureLimit.limitType === 'count' ? newUsage : 0,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        period_type: 'monthly',
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,feature_id'
      });

    if (error) {
      console.error('Error recording usage:', error);
      throw error;
    }

    console.log(`Recorded usage for ${featureId}: ${amount} ${featureLimit.limitType}`);
  }

  // Get current usage for a feature
  async getCurrentUsage(userId: string, featureId: string): Promise<number> {
    const featureLimit = this.getFeatureLimit(featureId);
    
    if (!featureLimit) {
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('usage_count, usage_duration')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting usage:', error);
        return 0;
      }

      // Return appropriate usage field based on limit type
      if (featureLimit.limitType === 'duration') {
        return data?.usage_duration || 0;
      } else {
        return data?.usage_count || 0;
      }
    } catch (error) {
      console.error('Error getting usage:', error);
      return 0;
    }
  }

  // Get user feature usage summary
  async getUserFeatureUsage(userId: string, isPremium: boolean = false): Promise<UserFeatureUsage[]> {
    const usagePromises = Object.entries(UNIFIED_FEATURE_LIMITS).map(async ([featureId, config]) => {
      const currentUsage = await this.getCurrentUsage(userId, featureId);
      const limit = isPremium ? config.premiumLimit : config.freeLimit;
      const remaining = limit === 'unlimited' ? 'unlimited' : Math.max(0, limit - currentUsage);

      // Get current period dates
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      return {
        userId,
        featureId,
        currentPeriod: {
          start: periodStart,
          end: periodEnd,
          usage: currentUsage,
          limit,
          remaining,
          period: 'monthly' as const,
          limitType: config.limitType
        },
        lastReset: periodStart,
        isPremium
      };
    });

    return Promise.all(usagePromises);
  }

  // Reset usage for a feature
  async resetUsage(userId: string, featureId: string): Promise<void> {
    const featureLimit = this.getFeatureLimit(featureId);
    
    if (!featureLimit) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const resetData: any = {
      updated_at: new Date().toISOString()
    };

    // Reset appropriate field based on limit type
    if (featureLimit.limitType === 'duration') {
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
      console.error('Error resetting usage:', error);
      throw error;
    }
  }

  // Reset all usage for a user
  async resetAllUsage(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_feature_usage')
      .update({
        usage_count: 0,
        usage_duration: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting all usage:', error);
      throw error;
    }
  }

  // Sync database with unified limits
  async syncDatabase(): Promise<void> {
    console.log('🔄 Syncing database with unified feature limits...');
    
    for (const [featureId, config] of Object.entries(UNIFIED_FEATURE_LIMITS)) {
      try {
        // Try to update first
        const { error: updateError } = await supabase
          .from('feature_limits')
          .update({
            feature_name: config.name,
            description: config.description,
            free_user_limit: config.freeLimit,
            free_user_period: 'monthly',
            free_user_limit_type: config.limitType,
            premium_user_limit: config.premiumLimit,
            premium_user_period: 'monthly',
            premium_user_limit_type: config.limitType,
            is_active: true,
            category: config.category,
            priority: config.priority,
            updated_at: new Date().toISOString()
          })
          .eq('feature_id', featureId);

        if (updateError && updateError.code === 'PGRST116') {
          // Record doesn't exist, insert it
          const { error: insertError } = await supabase
            .from('feature_limits')
            .insert({
              feature_id: featureId,
              feature_name: config.name,
              description: config.description,
              free_user_limit: config.freeLimit,
              free_user_period: 'monthly',
              free_user_limit_type: config.limitType,
              premium_user_limit: config.premiumLimit,
              premium_user_period: 'monthly',
              premium_user_limit_type: config.limitType,
              is_active: true,
              category: config.category,
              priority: config.priority,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`❌ Error inserting ${featureId}:`, insertError);
          } else {
            console.log(`✅ Created ${featureId}: ${config.freeLimit} ${config.limitType}`);
          }
        } else if (updateError) {
          console.error(`❌ Error updating ${featureId}:`, updateError);
        } else {
          console.log(`✅ Updated ${featureId}: ${config.freeLimit} ${config.limitType}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing ${featureId}:`, error);
      }
    }
    
    console.log('🎉 Database sync completed!');
  }
}

export const unifiedFeatureService = UnifiedFeatureService.getInstance();
