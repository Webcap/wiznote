import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNIFIED_FEATURE_LIMITS, UnifiedFeatureLimit } from '../constants/UnifiedFeatureLimits';
import { supabase } from '../lib/supabase';
import { FeatureLimit, FeatureLimitCheck, UserFeatureUsage } from '../types/FeatureLimits';

export interface UsageHistoryRecord {
  date: string;
  usageCount: number;
  featureId: string;
}

export class FeatureLimitService {
  private static instance: FeatureLimitService;
  private limits: Record<string, FeatureLimit> = {};
  private readonly CACHE_KEY = 'feature_limits_cache';
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): FeatureLimitService {
    if (!FeatureLimitService.instance) {
      FeatureLimitService.instance = new FeatureLimitService();
    }
    return FeatureLimitService.instance;
  }

  // Initialize with Supabase
  async initialize(): Promise<void> {
    try {
      // Try to load from cache first
      await this.loadFromCache();
      
      // Then load from Supabase
      await this.loadLimitsFromSupabase();
      
      // Ensure we have defaults if Supabase is empty
      if (Object.keys(this.limits).length === 0) {
        this.limits = this.convertUnifiedToLegacy(UNIFIED_FEATURE_LIMITS);
        await this.saveLimitsToSupabase();
      }
    } catch (error) {
      console.error('FeatureLimitService: Initialization error:', error);
      // Fallback to defaults
      this.limits = this.convertUnifiedToLegacy(UNIFIED_FEATURE_LIMITS);
    }
  }

  // Load from cache
  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const { limits, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_EXPIRY) {
          this.limits = limits;
          console.log('FeatureLimitService: Loaded limits from cache');
        } else {
          console.log('FeatureLimitService: Cache expired, will reload from Supabase');
        }
      }
    } catch (error) {
      console.warn('FeatureLimitService: Cache load error:', error);
    }
  }

  // Save to cache
  private async saveToCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify({
        limits: this.limits,
        timestamp: Date.now(),
      }));
      console.log('FeatureLimitService: Saved limits to cache');
    } catch (error) {
      console.warn('FeatureLimitService: Cache save error:', error);
    }
  }

  // Load limits from Supabase
  async loadLimitsFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('feature_limits')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.warn('FeatureLimitService: Error loading from Supabase, using defaults:', error);
        // Fallback to defaults instead of throwing
        this.limits = this.convertUnifiedToLegacy(UNIFIED_FEATURE_LIMITS);
        await this.saveToCache();
        return;
      }

      const loadedLimits: Record<string, FeatureLimit> = {};
      
      if (data) {
        data.forEach((limit: any) => {
          // Handle JSONB values for premium limits
          const parsePremiumLimit = (value: any): number | 'unlimited' => {
            if (value === null || value === undefined) return 'unlimited';
            if (typeof value === 'string') {
              if (value === 'unlimited') return 'unlimited';
              const parsed = parseInt(value);
              return isNaN(parsed) ? 'unlimited' : parsed;
            }
            if (typeof value === 'number') return value;
            return 'unlimited';
          };

          loadedLimits[limit.feature_id] = {
            featureId: limit.feature_id,
            featureName: limit.feature_name,
            description: limit.description,
            category: limit.category,
            priority: limit.priority,
            isActive: limit.is_active,
            freeUserLimit: limit.free_user_limit,
            freeUserLimitType: limit.free_user_limit_type,
            freeUserPeriod: limit.free_user_period,
            freeUserSessionLimit: limit.free_user_session_limit,
            premiumUserLimit: parsePremiumLimit(limit.premium_user_limit),
            premiumUserLimitType: limit.premium_user_limit_type,
            premiumUserPeriod: limit.premium_user_period,
            premiumUserSessionLimit: parsePremiumLimit(limit.premium_user_session_limit),
            createdAt: new Date(limit.created_at),
            updatedAt: new Date(limit.updated_at),
          };
        });
      }

      this.limits = loadedLimits;
      await this.saveToCache();
    } catch (error) {
      console.error('FeatureLimitService: Error loading from Supabase:', error);
      throw error;
    }
  }

  // Save limits to Supabase
  async saveLimitsToSupabase(): Promise<void> {
    try {
      console.log('FeatureLimitService: Saving limits to Supabase...');
      
      // Use individual update operations instead of upsert to avoid RLS issues
      for (const limit of Object.values(this.limits)) {
        // Format premium limits for JSONB storage
        const formatPremiumLimit = (value: number | 'unlimited'): string | number => {
          if (value === 'unlimited') return 'unlimited';
          return value;
        };

        const limitData = {
          id: limit.featureId,
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
          premium_user_limit: formatPremiumLimit(limit.premiumUserLimit),
          premium_user_limit_type: limit.premiumUserLimitType,
          premium_user_period: limit.premiumUserPeriod,
          premium_user_session_limit: limit.premiumUserSessionLimit ? formatPremiumLimit(limit.premiumUserSessionLimit) : null,
          updated_at: new Date().toISOString(),
        };

        // Try update first, if it fails, try insert
        const { error: updateError } = await supabase
          .from('feature_limits')
          .update(limitData)
          .eq('feature_id', limit.featureId);

        if (updateError) {
          // If update fails, try insert
          const { error: insertError } = await supabase
            .from('feature_limits')
            .insert(limitData);

          if (insertError) {
            console.error(`FeatureLimitService: Error saving limit ${limit.featureId}:`, insertError);
            throw insertError;
          }
        }
      }

      console.log(`FeatureLimitService: Saved ${Object.keys(this.limits).length} limits to Supabase`);
    } catch (error) {
      console.error('FeatureLimitService: Error saving to Supabase:', error);
      throw error;
    }
  }

  // Get all feature limits
  async getFeatureLimits(): Promise<FeatureLimit[]> {
    return Object.values(this.limits);
  }

  // Get a specific feature limit
  async getFeatureLimit(featureId: string): Promise<FeatureLimit | null> {
    return this.limits[featureId] || null;
  }

  // Get session limit for a feature
  async getSessionLimit(featureId: string, isPremium: boolean = false): Promise<number | 'unlimited' | null> {
    try {
      let limit = this.limits[featureId];
      
      // If limit not found in database, fallback to default limits
      if (!limit) {
        console.warn(`FeatureLimitService: Feature limit not found for ${featureId}, using default session limits`);
        const defaultLimit = this.findUnifiedLimit(featureId);
        if (defaultLimit) {
          limit = defaultLimit;
        } else {
          // If no default limit found, return reasonable defaults
          if (featureId === 'voice_recording') {
            return isPremium ? 'unlimited' : 10; // 10 minutes for free users
          }
          return null;
        }
      }
      
      return isPremium ? (limit.premiumUserSessionLimit ?? null) : (limit.freeUserSessionLimit ?? null);
    } catch (error) {
      console.error('FeatureLimitService: Error getting session limit:', error);
      // Fallback to reasonable defaults
      if (featureId === 'voice_recording') {
        return isPremium ? 'unlimited' : 10; // 10 minutes for free users
      }
      return null;
    }
  }

  // Save a feature limit
  async saveFeatureLimit(limit: FeatureLimit): Promise<void> {
    try {
      this.limits[limit.featureId] = {
        ...limit,
        updatedAt: new Date(),
      };

      await this.saveToCache();
      await this.saveLimitsToSupabase();

      // Force reload from database to ensure consistency
      await this.loadLimitsFromSupabase();

      console.log(`FeatureLimitService: Saved limit for ${limit.featureId}`);
    } catch (error) {
      console.error('FeatureLimitService: Error saving feature limit:', error);
      throw error;
    }
  }

  // Delete a feature limit
  async deleteFeatureLimit(featureId: string): Promise<void> {
    try {
      delete this.limits[featureId];
      await this.saveToCache();
      await this.saveLimitsToSupabase();

      // Force reload from database to ensure consistency
      await this.loadLimitsFromSupabase();

      console.log(`FeatureLimitService: Deleted limit for ${featureId}`);
    } catch (error) {
      console.error('FeatureLimitService: Error deleting feature limit:', error);
      throw error;
    }
  }

  // Clear cache and force reload from database
  async clearCacheAndReload(): Promise<void> {
    try {
      // Clear local cache
      this.limits = {};
      
      // Clear AsyncStorage cache
      await AsyncStorage.removeItem(this.CACHE_KEY);
      
      // Reload from database
      await this.loadLimitsFromSupabase();
    } catch (error) {
      console.error('FeatureLimitService: Error clearing cache and reloading:', error);
      throw error;
    }
  }

  // Get user feature usage
  async getUserFeatureUsage(userId: string, featureId: string, isPremium: boolean = false): Promise<UserFeatureUsage | null> {
    try {
      // Try to get the current session to ensure authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session) {
        console.warn(`FeatureLimitService: No active session for user ${userId}`, sessionError);
        return null;
      }

      console.log(`🔍 FeatureLimitService: Querying usage for user ${userId}, feature ${featureId}`);

      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .maybeSingle();

      if (error) {
        // Handle 406 errors specifically - this might be due to RLS policies or missing table
        // These are expected when usage records don't exist yet or RLS blocks access
        if (error.code === 'PGRST116' || error.message?.includes('406') || error.code === 'PGRST301') {
          // Silently handle expected errors (record doesn't exist or not accessible)
          // Only log in debug mode to reduce console noise
          if (__DEV__) {
            console.debug(`FeatureLimitService: Usage record not found for ${featureId} (this is expected for new users)`);
          }
        } else {
          // Log unexpected errors
          console.warn(`⚠️ FeatureLimitService: Error fetching usage for ${featureId}:`, error);
        }
        return null;
      }

      if (!data) {
        // Create new usage record
        const limit = this.limits[featureId];
        if (!limit) return null;

        const now = new Date();
        const periodStart = this.getPeriodStart(isPremium ? limit.premiumUserPeriod : limit.freeUserPeriod, now);
        const periodEnd = this.getPeriodEnd(isPremium ? limit.premiumUserPeriod : limit.freeUserPeriod, now);

        return {
          userId,
          featureId,
          currentPeriod: {
            start: periodStart,
            end: periodEnd,
            usage: 0,
            limit: isPremium ? limit.premiumUserLimit : limit.freeUserLimit,
            remaining: isPremium ? limit.premiumUserLimit : limit.freeUserLimit,
            period: isPremium ? limit.premiumUserPeriod : limit.freeUserPeriod,
            limitType: isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType,
          },
          lastReset: now,
          isPremium,
        };
      }

      const usageRecord = data; // maybeSingle returns a single object, not an array
      const limit = this.limits[featureId];
      if (!limit) return null;

      // Fetch user restrictions for AI features
      let multiplier = 1.0;
      if (limit.category === 'ai') {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_restricted, custom_ai_limit_multiplier')
            .eq('id', userId)
            .maybeSingle();
          
          if (profile) {
            if (profile.is_restricted) {
              multiplier = 0.5; // Default restriction is 50%
            }
            if (profile.custom_ai_limit_multiplier !== undefined && profile.custom_ai_limit_multiplier !== null) {
              multiplier = profile.custom_ai_limit_multiplier;
            }
          }
        } catch (profileError) {
          console.warn('FeatureLimitService: Error fetching user profile for restrictions:', profileError);
        }
      }

      // Calculate usage based on the feature's limit type
      let usage: number;
      const limitType = isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType;
      
      switch (limitType) {
        case 'count':
          usage = usageRecord.usage_count;
          break;
        case 'duration':
          usage = usageRecord.usage_duration;
          break;
        case 'storage':
          usage = usageRecord.usage_storage;
          break;
        default:
          usage = usageRecord.usage_count + usageRecord.usage_duration + usageRecord.usage_storage; // Fallback
      }
      
      let userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
      
      // Apply multiplier to the limit if applicable
      if (userLimit !== 'unlimited' && multiplier !== 1.0) {
        userLimit = Math.floor(userLimit * multiplier);
      }
      
      const remaining = userLimit === 'unlimited' ? 'unlimited' : Math.max(0, userLimit - usage);

      return {
        userId,
        featureId,
        currentPeriod: {
          start: new Date(usageRecord.current_period_start),
          end: new Date(usageRecord.current_period_end),
          usage,
          limit: userLimit,
          remaining,
          period: usageRecord.period_type,
          limitType: isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType,
        },
        lastReset: new Date(usageRecord.last_used_at || usageRecord.created_at),
        isPremium,
      };
    } catch (error) {
      console.error('FeatureLimitService: Error getting user feature usage:', error);
      return null;
    }
  }

  // Check if user can use a feature
  async canUseFeature(
    userId: string, 
    featureId: string, 
    requiredAmount: number = 1, 
    isPremium: boolean = false
  ): Promise<FeatureLimitCheck> {
    try {
      let limit = this.limits[featureId];
      
      // If limit not found in database, fallback to default limits
      if (!limit || !limit.isActive) {
        console.warn(`FeatureLimitService: Feature limit not found for ${featureId}, using default limits`);
        const defaultLimit = this.findUnifiedLimit(featureId);
        if (defaultLimit) {
          limit = defaultLimit;
        } else {
          // If no default limit found, block access for security
          return { 
            canUse: false, 
            reason: 'Feature limit not configured, access blocked for security',
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

      // Premium users get unlimited access
      if (isPremium && limit.premiumUserLimit === 'unlimited') {
        return { 
          canUse: true,
          currentUsage: 0,
          limit: 'unlimited',
          remaining: 'unlimited',
          period: limit.premiumUserPeriod,
          limitType: limit.premiumUserLimitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      let usage: UserFeatureUsage | null = null;
      try {
        usage = await this.getUserFeatureUsage(userId, featureId, isPremium);
      } catch (usageError) {
        console.warn('FeatureLimitService: Error getting usage, using fallback:', usageError);
        // Fallback: assume 0 usage if we can't get usage data
        usage = null;
      }

      if (!usage) {
        // If we can't get usage, be conservative and block access
        const userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
        return { 
          canUse: false, // Block access when usage tracking is unavailable
          reason: 'Usage tracking unavailable, access blocked for security',
          currentUsage: 0,
          limit: userLimit,
          remaining: userLimit,
          period: isPremium ? limit.premiumUserPeriod : limit.freeUserPeriod,
          limitType: isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      const userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
      
      if (userLimit === 'unlimited') {
        return { 
          canUse: true,
          currentUsage: usage.currentPeriod.usage,
          limit: 'unlimited',
          remaining: 'unlimited',
          period: usage.currentPeriod.period,
          limitType: usage.currentPeriod.limitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      const remaining = usage.currentPeriod.remaining;
      if (remaining === 'unlimited') {
        return { 
          canUse: true,
          currentUsage: usage.currentPeriod.usage,
          limit: usage.currentPeriod.limit,
          remaining: 'unlimited',
          period: usage.currentPeriod.period,
          limitType: usage.currentPeriod.limitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      if (remaining < requiredAmount) {
        return { 
          canUse: false, 
          reason: 'Limit reached', 
          currentUsage: usage.currentPeriod.usage,
          limit: usage.currentPeriod.limit,
          remaining,
          period: usage.currentPeriod.period,
          limitType: usage.currentPeriod.limitType,
          isPremium,
          featureName: limit.featureName,
        };
      }

      return { 
        canUse: true, 
        currentUsage: usage.currentPeriod.usage,
        limit: usage.currentPeriod.limit,
        remaining,
        period: usage.currentPeriod.period,
        limitType: usage.currentPeriod.limitType,
        isPremium,
        featureName: limit.featureName,
      };
    } catch (error) {
      console.error('FeatureLimitService: Error checking feature usage:', error);
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

  // Record feature usage
  async recordFeatureUsage(
    userId: string, 
    featureId: string, 
    amount: number = 1, 
    isPremium: boolean = false,
    usageType: 'count' | 'duration' | 'storage' = 'count'
  ): Promise<void> {
    try {
      const limit = this.limits[featureId];
      
      if (!limit) {
        console.warn(`FeatureLimitService: No limit found for feature ${featureId}`);
        return;
      }

      // Validate amount
      if (amount <= 0) {
        console.warn(`FeatureLimitService: Invalid amount ${amount} for feature ${featureId}`);
        return;
      }

      // Try atomic RPC first (fixes "stays at 1" race condition) - run database/increment-feature-usage.sql
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('increment_feature_usage', {
          p_user_id: userId,
          p_feature_id: featureId,
          p_amount: Math.floor(amount),
          p_usage_type: usageType,
        });

      if (!rpcError && rpcData) {
        const result = rpcData as { usage_count?: number; usage_duration?: number; usage_storage?: number };
        const actualNewCount = result.usage_count ?? 0;
        const actualNewDuration = result.usage_duration ?? 0;
        const actualNewStorage = result.usage_storage ?? 0;
        let actualNewUsage = actualNewCount;
        if (usageType === 'duration') actualNewUsage = actualNewDuration;
        else if (usageType === 'storage') actualNewUsage = actualNewStorage;

        console.log(`FeatureLimitService: Atomic RPC recorded usage for ${featureId}: ${actualNewUsage}`);
        this.dispatchUsageChanged(userId, featureId, amount, usageType, actualNewUsage, actualNewCount, actualNewDuration, actualNewStorage);
        return;
      }

      // Fallback: read-modify-write (can have race condition)
      const now = new Date();
      const period = isPremium ? limit.premiumUserPeriod : limit.freeUserPeriod;
      const periodStart = this.getPeriodStart(period, now);
      const periodEnd = this.getPeriodEnd(period, now);

      const { data: existingUsage } = await supabase
        .from('user_feature_usage')
        .select('usage_count, usage_duration, usage_storage, current_period_end')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .maybeSingle();

      const periodExpired = existingUsage?.current_period_end 
        ? new Date(existingUsage.current_period_end) < now
        : true;

      const currentCount = periodExpired ? 0 : (existingUsage?.usage_count || 0);
      const currentDuration = periodExpired ? 0 : (existingUsage?.usage_duration || 0);
      const currentStorage = periodExpired ? 0 : (existingUsage?.usage_storage || 0);

      let newCount = currentCount;
      let newDuration = currentDuration;
      let newStorage = currentStorage;

      switch (usageType) {
        case 'count': newCount = currentCount + amount; break;
        case 'duration': newDuration = currentDuration + amount; break;
        case 'storage': newStorage = currentStorage + amount; break;
      }

      const upsertData = {
        user_id: userId,
        feature_id: featureId,
        usage_count: newCount,
        usage_duration: newDuration,
        usage_storage: newStorage,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        period_type: period,
        last_used_at: now.toISOString(),
      };

      const { error, data } = await supabase
        .from('user_feature_usage')
        .upsert(upsertData, {
          onConflict: 'user_id,feature_id'
        })
        .select();

      if (error) {
        console.error(`FeatureLimitService: Error upserting usage for ${featureId}:`, {
          error,
          userId,
          featureId,
          amount,
          usageType,
          upsertData
        });
        // Don't dispatch event if database update failed
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn(`FeatureLimitService: Upsert succeeded but no data returned for ${featureId}`);
        // Still dispatch event with calculated values as fallback
      }

      // Get the actual updated usage from the database response
      const updatedRecord = data && data.length > 0 ? data[0] : null;
      const actualNewCount = updatedRecord?.usage_count ?? newCount;
      const actualNewDuration = updatedRecord?.usage_duration ?? newDuration;
      const actualNewStorage = updatedRecord?.usage_storage ?? newStorage;
      
      // Determine the actual usage value based on usageType
      let actualNewUsage = actualNewCount;
      if (usageType === 'duration') {
        actualNewUsage = actualNewDuration;
      } else if (usageType === 'storage') {
        actualNewUsage = actualNewStorage;
      }

      console.log(`FeatureLimitService: Successfully recorded usage for ${featureId}: ${amount} ${usageType} (new total: ${actualNewCount} count, ${actualNewDuration} duration, ${actualNewStorage} storage)`);
      this.dispatchUsageChanged(userId, featureId, amount, usageType, actualNewUsage, actualNewCount, actualNewDuration, actualNewStorage);
    } catch (error) {
      console.error('FeatureLimitService: Error recording usage:', {
        error,
        userId,
        featureId,
        amount,
        usageType,
        isPremium,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw to allow callers to handle the error
      throw error;
    }
  }

  // Get user feature usage summary
  async getUserFeatureUsageSummary(userId: string, isPremium: boolean = false): Promise<UserFeatureUsage[]> {
    try {
      // Try to get the current session to ensure authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn(`FeatureLimitService: No active session for user ${userId}`);
        return [];
      }

      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        // Handle 406 errors specifically - this might be due to RLS policies
        if (error.message?.includes('406')) {
          console.warn(`FeatureLimitService: Cannot access usage data for user ${userId} (likely RLS policy):`, error.message);
        } else {
          console.error(`FeatureLimitService: Error getting usage summary:`, error);
        }
        return [];
      }

      const usageSummary: UserFeatureUsage[] = [];

      for (const usage of data || []) {
        const limit = this.limits[usage.feature_id];
        if (!limit) continue;

        // Calculate usage based on the feature's limit type
        let totalUsage: number;
        const limitType = isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType;
        
        switch (limitType) {
          case 'count':
            totalUsage = usage.usage_count;
            break;
          case 'duration':
            totalUsage = usage.usage_duration;
            break;
          case 'storage':
            totalUsage = usage.usage_storage;
            break;
          default:
            totalUsage = usage.usage_count + usage.usage_duration + usage.usage_storage; // Fallback
        }
        
        const userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
        const remaining = userLimit === 'unlimited' ? 'unlimited' : Math.max(0, userLimit - totalUsage);

        usageSummary.push({
          userId,
          featureId: usage.feature_id,
          currentPeriod: {
            start: new Date(usage.current_period_start),
            end: new Date(usage.current_period_end),
            usage: totalUsage,
            limit: userLimit,
            remaining,
            period: usage.period_type,
            limitType: isPremium ? limit.premiumUserLimitType : limit.freeUserLimitType,
          },
          lastReset: new Date(usage.last_used_at || usage.created_at),
          isPremium,
        });
      }

      return usageSummary;
    } catch (error) {
      console.error('FeatureLimitService: Error getting usage summary:', error);
      return [];
    }
  }

  // Reset user feature usage
  async resetUserFeatureUsage(userId: string, featureId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_feature_usage')
        .delete()
        .eq('user_id', userId)
        .eq('feature_id', featureId);

      if (error) throw error;

      console.log(`FeatureLimitService: Reset usage for user ${userId}, feature ${featureId}`);
    } catch (error) {
      console.error('FeatureLimitService: Error resetting usage:', error);
      throw error;
    }
  }

  // Reset all user feature usage
  async resetAllUserFeatureUsage(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_feature_usage')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      console.log(`FeatureLimitService: Reset all usage for user ${userId}`);
    } catch (error) {
      console.error('FeatureLimitService: Error resetting all usage:', error);
      throw error;
    }
  }

  /**
   * Update user restriction status (Admin only)
   */
  async updateUserRestriction(
    userId: string, 
    isRestricted: boolean, 
    reason?: string,
    multiplier?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        is_restricted: isRestricted,
        restriction_reason: reason || null,
      };
      
      if (multiplier !== undefined) {
        updateData.custom_ai_limit_multiplier = multiplier;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      
      console.log(`FeatureLimitService: Updated restriction for user ${userId}: ${isRestricted}`);
    } catch (error) {
      console.error('FeatureLimitService: Error updating user restriction:', error);
      throw error;
    }
  }

  /**
   * Get user restriction details
   */
  async getUserRestrictions(userId: string): Promise<{
    isRestricted: boolean;
    reason: string | null;
    multiplier: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_restricted, restriction_reason, custom_ai_limit_multiplier')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      return {
        isRestricted: data?.is_restricted || false,
        reason: data?.restriction_reason || null,
        multiplier: data?.custom_ai_limit_multiplier || 1.0,
      };
    } catch (error) {
      console.error('FeatureLimitService: Error fetching user restrictions:', error);
      return { isRestricted: false, reason: null, multiplier: 1.0 };
    }
  }

  // Get feature usage stats
  async getFeatureUsageStats(featureId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    totalUsers: number;
    totalUsage: number;
    averageUsage: number;
    premiumUsers: number;
    freeUsers: number;
    topUsers: Array<{ userId: string; usage: number; displayName?: string; isPremium: boolean }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select(`
          *,
          user_profiles!inner(display_name, premium)
        `)
        .eq('feature_id', featureId);

      if (error) throw error;

      const userStats = new Map<string, { userId: string; usage: number; isPremium: boolean; displayName?: string; email?: string }>();

      data?.forEach(record => {
        const userId = record.user_id;
        const existing = userStats.get(userId) || { userId, usage: 0, isPremium: false };
        
        userStats.set(userId, {
          userId,
          usage: existing.usage + (record.usage_count || 0),
          isPremium: record.user_profiles?.premium?.isActive || false,
          displayName: record.user_profiles?.display_name,
        });
      });

      const users = Array.from(userStats.values());
      const totalUsers = users.length;
      const totalUsage = users.reduce((sum, user) => sum + user.usage, 0);
      const averageUsage = totalUsers > 0 ? totalUsage / totalUsers : 0;
      const premiumUsers = users.filter(user => user.isPremium).length;
      const freeUsers = totalUsers - premiumUsers;

      const topUsers = users
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10)
        .map(user => ({
          userId: user.userId,
          usage: user.usage,
          displayName: user.displayName,
          isPremium: user.isPremium,
        }));

      return {
        totalUsers,
        totalUsage,
        averageUsage,
        premiumUsers,
        freeUsers,
        topUsers,
      };
    } catch (error) {
      console.error('FeatureLimitService: Error getting usage stats:', error);
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

  /**
   * Get top AI users across all features (Admin only)
   */
  async getTopAIUsers(limit: number = 10): Promise<Array<{
    userId: string;
    totalUsage: number;
    displayName: string | null;
    email: string | null;
    isPremium: boolean;
  }>> {
    try {
      // Query usage for all AI features
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select(`
          user_id,
          usage_count,
          user_profiles!inner(display_name, email, premium)
        `)
        .ilike('feature_id', 'ai_%')
        .order('usage_count', { ascending: false });

      if (error) throw error;

      // Aggregate by user
      const userMap = new Map<string, any>();
      data?.forEach(record => {
        const userId = record.user_id;
        const profile = record.user_profiles as any; // Cast to bypass array-type lint error
        
        const existing = userMap.get(userId) || {
          userId,
          totalUsage: 0,
          displayName: profile?.display_name,
          email: profile?.email,
          isPremium: profile?.premium?.isActive || false,
        };
        
        userMap.set(userId, {
          ...existing,
          totalUsage: existing.totalUsage + (record.usage_count || 0),
        });
      });

      return Array.from(userMap.values())
        .sort((a, b) => b.totalUsage - a.totalUsage)
        .slice(0, limit);
    } catch (error) {
      console.error('FeatureLimitService: Error getting top AI users:', error);
      return [];
    }
  }

  /**
   * Get all restricted users (Admin only)
   */
  async getRestrictedUsers(): Promise<Array<{
    userId: string;
    displayName: string | null;
    email: string | null;
    reason: string | null;
    multiplier: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, display_name, email, restriction_reason, custom_ai_limit_multiplier')
        .eq('is_restricted', true);

      if (error) throw error;

      return data?.map(user => ({
        userId: user.id,
        displayName: user.display_name,
        email: user.email,
        reason: user.restriction_reason,
        multiplier: user.custom_ai_limit_multiplier || 1.0,
      })) || [];
    } catch (error) {
      console.error('FeatureLimitService: Error getting restricted users:', error);
      return [];
    }
  }

  /**
   * Get 30-day usage history for a user (Admin only)
   */
  async getUsageHistory(userId: string, days: number = 30): Promise<UsageHistoryRecord[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('user_feature_usage_daily')
        .select('usage_date, usage_count, feature_id')
        .eq('user_id', userId)
        .gte('usage_date', startDateStr)
        .order('usage_date', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        date: item.usage_date,
        usageCount: item.usage_count,
        featureId: item.feature_id,
      })) || [];
    } catch (error) {
      console.error('FeatureLimitService: Error getting usage history:', error);
      return [];
    }
  }

  // Get feature limits by category
  async getFeatureLimitsByCategory(category: FeatureLimit['category']): Promise<FeatureLimit[]> {
    return Object.values(this.limits).filter(limit => limit.category === category);
  }

  // Get premium features
  async getPremiumFeatures(): Promise<FeatureLimit[]> {
    return Object.values(this.limits).filter(limit => 
      limit.premiumUserLimit === 'unlimited' || limit.premiumUserLimit > limit.freeUserLimit
    );
  }

  // Helper methods
  private dispatchUsageChanged(
    userId: string,
    featureId: string,
    amount: number,
    usageType: string,
    actualNewUsage: number,
    actualNewCount: number,
    actualNewDuration: number,
    actualNewStorage: number
  ): void {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('featureUsageChanged', {
          detail: {
            userId,
            featureId,
            amount,
            usageType,
            newUsage: actualNewUsage,
            newCount: actualNewCount,
            newDuration: actualNewDuration,
            newStorage: actualNewStorage,
            timestamp: Date.now(),
          },
        }));
      }
    } catch (emitError) {
      console.warn('FeatureLimitService: Failed to dispatch featureUsageChanged event:', emitError);
    }
  }

  private getPeriodStart(period: 'daily' | 'weekly' | 'monthly', date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'daily':
        return start;
      case 'weekly':
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return start;
      case 'monthly':
        start.setDate(1);
        return start;
      default:
        return start;
    }
  }

  private getPeriodEnd(period: 'daily' | 'weekly' | 'monthly', date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    switch (period) {
      case 'daily':
        return end;
      case 'weekly':
        const day = end.getDay();
        const diff = end.getDate() - day + 7;
        end.setDate(diff);
        return end;
      case 'monthly':
        end.setMonth(end.getMonth() + 1, 0);
        return end;
      default:
        return end;
    }
  }

  private async getSessionId(): Promise<string> {
    const sessionId = await AsyncStorage.getItem('session_id');
    if (sessionId) return sessionId;

    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('session_id', newSessionId);
    return newSessionId;
  }

  // Helper methods for unified feature limits conversion
  private convertUnifiedToLegacy(unifiedLimits: Record<string, UnifiedFeatureLimit>): Record<string, FeatureLimit> {
    const legacyLimits: Record<string, FeatureLimit> = {};
    
    Object.values(unifiedLimits).forEach(unifiedLimit => {
      if (!unifiedLimit.isActive) return;
      
      legacyLimits[unifiedLimit.featureId] = {
        featureId: unifiedLimit.featureId,
        featureName: unifiedLimit.featureName,
        description: unifiedLimit.description,
        freeUserLimit: unifiedLimit.freeUserLimit === 'unlimited' ? 0 : unifiedLimit.freeUserLimit,
        freeUserPeriod: unifiedLimit.period === 'monthly' ? 'monthly' : 
                       unifiedLimit.period === 'yearly' ? 'monthly' : 
                       unifiedLimit.period === 'lifetime' ? 'monthly' : 
                       unifiedLimit.period === 'per_use' ? 'daily' : 'monthly',
        freeUserLimitType: unifiedLimit.limitType === 'count' ? 'count' : 
                          unifiedLimit.limitType === 'duration' ? 'duration' : 
                          unifiedLimit.limitType === 'storage' ? 'storage' : 'count',
        premiumUserLimit: unifiedLimit.premiumUserLimit,
        premiumUserPeriod: unifiedLimit.period === 'monthly' ? 'monthly' : 
                          unifiedLimit.period === 'yearly' ? 'monthly' : 
                          unifiedLimit.period === 'lifetime' ? 'monthly' : 
                          unifiedLimit.period === 'per_use' ? 'daily' : 'monthly',
        premiumUserLimitType: unifiedLimit.limitType === 'count' ? 'count' : 
                             unifiedLimit.limitType === 'duration' ? 'duration' : 
                             unifiedLimit.limitType === 'storage' ? 'storage' : 'count',
        freeUserSessionLimit: unifiedLimit.sessionLimit?.type === 'duration' ? 
                             (unifiedLimit.sessionLimit.free === 'unlimited' ? undefined : unifiedLimit.sessionLimit.free) : undefined,
        premiumUserSessionLimit: unifiedLimit.sessionLimit?.type === 'duration' ? 
                                unifiedLimit.sessionLimit.premium : undefined,
        isActive: unifiedLimit.isActive,
        category: unifiedLimit.category === 'other' ? 'customization' : unifiedLimit.category,
        priority: unifiedLimit.priority,
        createdAt: unifiedLimit.createdAt,
        updatedAt: unifiedLimit.updatedAt,
      };
    });
    
    return legacyLimits;
  }

  private findUnifiedLimit(featureId: string): FeatureLimit | undefined {
    const unifiedLimit = UNIFIED_FEATURE_LIMITS[featureId];
    if (!unifiedLimit || !unifiedLimit.isActive) return undefined;
    
    return {
      featureId: unifiedLimit.featureId,
      featureName: unifiedLimit.featureName,
      description: unifiedLimit.description,
      freeUserLimit: unifiedLimit.freeUserLimit === 'unlimited' ? 0 : unifiedLimit.freeUserLimit,
      freeUserPeriod: unifiedLimit.period === 'monthly' ? 'monthly' : 
                     unifiedLimit.period === 'yearly' ? 'monthly' : 
                     unifiedLimit.period === 'lifetime' ? 'monthly' : 
                     unifiedLimit.period === 'per_use' ? 'daily' : 'monthly',
      freeUserLimitType: unifiedLimit.limitType === 'count' ? 'count' : 
                        unifiedLimit.limitType === 'duration' ? 'duration' : 
                        unifiedLimit.limitType === 'storage' ? 'storage' : 'count',
      premiumUserLimit: unifiedLimit.premiumUserLimit,
      premiumUserPeriod: unifiedLimit.period === 'monthly' ? 'monthly' : 
                        unifiedLimit.period === 'yearly' ? 'monthly' : 
                        unifiedLimit.period === 'lifetime' ? 'monthly' : 
                        unifiedLimit.period === 'per_use' ? 'daily' : 'monthly',
      premiumUserLimitType: unifiedLimit.limitType === 'count' ? 'count' : 
                           unifiedLimit.limitType === 'duration' ? 'duration' : 
                           unifiedLimit.limitType === 'storage' ? 'storage' : 'count',
      freeUserSessionLimit: unifiedLimit.sessionLimit?.type === 'duration' ? 
                           (unifiedLimit.sessionLimit.free === 'unlimited' ? undefined : unifiedLimit.sessionLimit.free) : undefined,
      premiumUserSessionLimit: unifiedLimit.sessionLimit?.type === 'duration' ? 
                              unifiedLimit.sessionLimit.premium : undefined,
      isActive: unifiedLimit.isActive,
      category: unifiedLimit.category === 'other' ? 'customization' : unifiedLimit.category,
      priority: unifiedLimit.priority,
      createdAt: unifiedLimit.createdAt,
      updatedAt: unifiedLimit.updatedAt,
    };
  }

  // Clear cache and force refresh
  async invalidateCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log('FeatureLimitService: Cache invalidated');
      
      // Reload limits from Supabase
      await this.loadLimitsFromSupabase();
    } catch (error) {
      console.error('FeatureLimitService: Cache invalidation error:', error);
    }
  }

  // Subscribe to limit changes (for components that need to know when limits change)
  subscribeToLimitChanges(callback: () => void): () => void {
    if (typeof window === 'undefined') {
      return () => {}; // No-op for server-side
    }
    
    const handleChange = () => callback();
    window.addEventListener('featureLimitsChanged', handleChange);
    
    return () => {
      window.removeEventListener('featureLimitsChanged', handleChange);
    };
  }

  // Handle real-time updates from database
  async handleRealtimeUpdate(payload: any): Promise<void> {
    try {
      console.log('FeatureLimitService: Handling real-time update:', payload);
      
      // Invalidate cache and reload limits
      await this.invalidateCache();
      
      // Notify any listeners that limits have changed
      this.notifyLimitsChanged();
    } catch (error) {
      console.error('FeatureLimitService: Real-time update error:', error);
    }
  }

  // Notify that limits have changed
  private notifyLimitsChanged(): void {
    // This can be extended to notify components that limits have changed
    console.log('FeatureLimitService: Limits changed, notifying listeners...');
    
    // Dispatch a custom event that components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('featureLimitsChanged', {
        detail: { timestamp: Date.now() }
      }));
    }
  }

  // Force refresh limits from database
  async forceRefresh(): Promise<void> {
    try {
      console.log('FeatureLimitService: Force refreshing limits...');
      await this.invalidateCache();
      await this.loadLimitsFromSupabase();
      console.log('FeatureLimitService: Force refresh complete');
    } catch (error) {
      console.error('FeatureLimitService: Force refresh error:', error);
    }
  }
}

// Export singleton instance
export const featureLimitService = FeatureLimitService.getInstance(); 