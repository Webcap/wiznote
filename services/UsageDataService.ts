import { supabase } from '../lib/supabase';

// Service for accessing usage data
export class UsageDataService {
  private static instance: UsageDataService;

  private constructor() {
    // Use the regular Supabase client
  }

  static getInstance(): UsageDataService {
    if (!UsageDataService.instance) {
      UsageDataService.instance = new UsageDataService();
    }
    return UsageDataService.instance;
  }

  // Get usage data for a specific user and feature
  async getUserFeatureUsage(userId: string, featureId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn(`UsageDataService: Error getting usage for ${featureId}:`, error);
        return 0;
      }

      return data?.usage_count || 0;
    } catch (err) {
      console.warn(`UsageDataService: Exception getting usage for ${featureId}:`, err);
      return 0;
    }
  }

  // Get usage data for multiple features
  async getUserUsageData(userId: string, featureIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('feature_id, usage_count')
        .eq('user_id', userId)
        .in('feature_id', featureIds);

      if (error) {
        console.warn('UsageDataService: Error getting usage data:', error);
        return {};
      }

      const usageMap: Record<string, number> = {};
      if (data) {
        data.forEach((item: any) => {
          usageMap[item.feature_id] = item.usage_count || 0;
        });
      }

      // Ensure all requested features have a value
      featureIds.forEach(featureId => {
        if (!(featureId in usageMap)) {
          usageMap[featureId] = 0;
        }
      });

      return usageMap;
    } catch (err) {
      console.warn('UsageDataService: Exception getting usage data:', err);
      return {};
    }
  }
}

export const usageDataService = UsageDataService.getInstance();
