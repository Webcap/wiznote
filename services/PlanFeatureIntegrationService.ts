// Plan Feature Integration Service
// Phase 2: Core Services - Feature System Integration

import { supabase } from '../lib/supabase';
import {
    FeatureLimitConfig
} from '../types/EnhancedPlans';
import { enhancedPlanService } from './EnhancedPlanService';

export class PlanFeatureIntegrationService {
  private static instance: PlanFeatureIntegrationService;

  private constructor() {}

  public static getInstance(): PlanFeatureIntegrationService {
    if (!PlanFeatureIntegrationService.instance) {
      PlanFeatureIntegrationService.instance = new PlanFeatureIntegrationService();
    }
    return PlanFeatureIntegrationService.instance;
  }

  // Apply feature configurations to a plan
  async applyFeatureConfigurations(
    planId: string, 
    featureFlags: Record<string, boolean>, 
    featureLimits: Record<string, FeatureLimitConfig>
  ): Promise<void> {
    try {
      console.log('PlanFeatureIntegrationService: Applying feature configurations for plan:', planId);

      // 1. Update feature flags
      await this.updateFeatureFlags(planId, featureFlags);

      // 2. Update feature limits
      await this.updateFeatureLimits(planId, featureLimits);

      // 3. Create feature mappings for audit
      await this.createFeatureMappings(planId, featureFlags, featureLimits);

      console.log('PlanFeatureIntegrationService: Feature configurations applied successfully');
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error applying feature configurations:', error);
      throw error;
    }
  }

  // Remove feature configurations from a plan
  async removeFeatureConfigurations(planId: string): Promise<void> {
    try {
      console.log('PlanFeatureIntegrationService: Removing feature configurations for plan:', planId);

      // 1. Remove feature mappings
      await this.removeFeatureMappings(planId);

      // 2. Reset feature flags to defaults
      await this.resetFeatureFlags(planId);

      // 3. Reset feature limits to defaults
      await this.resetFeatureLimits(planId);

      console.log('PlanFeatureIntegrationService: Feature configurations removed successfully');
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error removing feature configurations:', error);
      throw error;
    }
  }

  // Get feature configuration for a plan
  async getFeatureConfiguration(planId: string): Promise<{
    featureFlags: Record<string, boolean>;
    featureLimits: Record<string, FeatureLimitConfig>;
  }> {
    try {
      const [featureFlags, featureLimits] = await Promise.all([
        this.getPlanFeatureFlags(planId),
        this.getPlanFeatureLimits(planId),
      ]);

      return {
        featureFlags,
        featureLimits,
      };
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error getting feature configuration:', error);
      return {
        featureFlags: {},
        featureLimits: {},
      };
    }
  }

  // Update feature flags for a plan
  private async updateFeatureFlags(planId: string, featureFlags: Record<string, boolean>): Promise<void> {
    try {
      console.log('PlanFeatureIntegrationService: Updating feature flags for plan:', planId);

      // Get the plan to check if it's premium
      const plan = await enhancedPlanService.getPlan(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Update feature flags in the feature_flags table
      for (const [featureId, isEnabled] of Object.entries(featureFlags)) {
        await this.updateFeatureFlag(featureId, planId, isEnabled, plan.planType);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error updating feature flags:', error);
      throw error;
    }
  }

  // Update feature limits for a plan
  private async updateFeatureLimits(planId: string, featureLimits: Record<string, FeatureLimitConfig>): Promise<void> {
    try {
      console.log('PlanFeatureIntegrationService: Updating feature limits for plan:', planId);

      // Persist feature limits into plan_feature_mappings (not feature_limits table)
      for (const [featureId, limitConfig] of Object.entries(featureLimits)) {
        await this.upsertPlanLimitMapping(planId, featureId, limitConfig);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error updating feature limits:', error);
      throw error;
    }
  }

  // Update individual feature flag
  private async updateFeatureFlag(
    featureId: string, 
    planId: string, 
    isEnabled: boolean, 
    planType: string
  ): Promise<void> {
    try {
      // Check if feature flag exists
      const { data: existingFlag, error: fetchError } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('id', featureId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingFlag) {
        // Create new feature flag
        await supabase
          .from('feature_flags')
          .insert({
            id: featureId,
            name: featureId,
            description: `Feature flag for ${featureId}`,
            enabled: isEnabled,
            premium_only: planType !== 'free',
            tracking_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } else {
        // Update existing feature flag
        await supabase
          .from('feature_flags')
          .update({
            enabled: isEnabled,
            premium_only: planType !== 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', featureId);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error updating feature flag:', error);
      throw error;
    }
  }

  // Upsert per-plan limit mapping into plan_feature_mappings
  private async upsertPlanLimitMapping(
    planId: string,
    featureId: string,
    limitConfig: FeatureLimitConfig
  ): Promise<void> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('plan_feature_mappings')
        .select('id')
        .eq('plan_id', planId)
        .eq('feature_id', featureId)
        .single();

      const limitValue = limitConfig.limit === 'unlimited' ? -1 : limitConfig.limit;

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existing) {
        await supabase
          .from('plan_feature_mappings')
          .insert({
            plan_id: planId,
            feature_id: featureId,
            is_enabled: true,
            limit_value: limitValue,
            limit_type: limitConfig.type,
            limit_period: limitConfig.period,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } else {
        await supabase
          .from('plan_feature_mappings')
          .update({
            is_enabled: true,
            limit_value: limitValue,
            limit_type: limitConfig.type,
            limit_period: limitConfig.period,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error upserting plan limit mapping:', error);
      throw error;
    }
  }

  // Create feature mappings for audit
  private async createFeatureMappings(
    planId: string, 
    featureFlags: Record<string, boolean>, 
    featureLimits: Record<string, FeatureLimitConfig>
  ): Promise<void> {
    try {
      // Create mappings for feature flags
      for (const [featureId, isEnabled] of Object.entries(featureFlags)) {
        await this.createFeatureMapping(planId, featureId, isEnabled, 'flag');
      }

      // Create mappings for feature limits
      for (const [featureId, limitConfig] of Object.entries(featureLimits)) {
        await this.createFeatureMapping(planId, featureId, true, 'limit', limitConfig);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error creating feature mappings:', error);
      // Don't fail the main operation
    }
  }

  // Create individual feature mapping
  private async createFeatureMapping(
    planId: string,
    featureId: string,
    isEnabled: boolean,
    mappingType: 'flag' | 'limit',
    limitConfig?: FeatureLimitConfig
  ): Promise<void> {
    try {
      const mappingData: any = {
        plan_id: planId,
        feature_id: featureId,
        is_enabled: isEnabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (mappingType === 'limit' && limitConfig) {
        mappingData.limit_value = limitConfig.limit === 'unlimited' ? -1 : limitConfig.limit;
        mappingData.limit_type = limitConfig.type;
        mappingData.limit_period = limitConfig.period;
      }

      await supabase
        .from('plan_feature_mappings')
        .insert(mappingData);
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error creating feature mapping:', error);
      // Don't fail the main operation
    }
  }

  // Remove feature mappings
  private async removeFeatureMappings(planId: string): Promise<void> {
    try {
      await supabase
        .from('plan_feature_mappings')
        .delete()
        .eq('plan_id', planId);
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error removing feature mappings:', error);
      throw error;
    }
  }

  // Reset feature flags to defaults
  private async resetFeatureFlags(planId: string): Promise<void> {
    try {
      // Get all feature flags that were set by this plan
      const { data: mappings, error } = await supabase
        .from('plan_feature_mappings')
        .select('feature_id')
        .eq('plan_id', planId);

      if (error) throw error;

      // Reset each feature flag to default (disabled)
      for (const mapping of mappings || []) {
        await supabase
          .from('feature_flags')
          .update({
            enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mapping.feature_id);
      }
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error resetting feature flags:', error);
      throw error;
    }
  }

  // Reset feature limits to defaults (no-op as limits are stored in plan_feature_mappings and removed earlier)
  private async resetFeatureLimits(_planId: string): Promise<void> {
    return;
  }

  // Get plan feature flags
  private async getPlanFeatureFlags(planId: string): Promise<Record<string, boolean>> {
    try {
      const { data: mappings, error } = await supabase
        .from('plan_feature_mappings')
        .select('feature_id, is_enabled')
        .eq('plan_id', planId)
        // Only rows without limit_type should be considered pure flag mappings; use IS NULL correctly
        .is('limit_type', null);

      if (error) throw error;

      const featureFlags: Record<string, boolean> = {};
      for (const mapping of mappings || []) {
        featureFlags[mapping.feature_id] = mapping.is_enabled;
      }

      return featureFlags;
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error getting plan feature flags:', error);
      return {};
    }
  }

  // Get plan feature limits
  private async getPlanFeatureLimits(planId: string): Promise<Record<string, FeatureLimitConfig>> {
    try {
      const { data: mappings, error } = await supabase
        .from('plan_feature_mappings')
        .select('feature_id, limit_value, limit_type, limit_period')
        .eq('plan_id', planId)
        // Only rows with non-null limit_type are limit mappings
        .not('limit_type', 'is', null);

      if (error) throw error;

      const featureLimits: Record<string, FeatureLimitConfig> = {};
      for (const mapping of mappings || []) {
        featureLimits[mapping.feature_id] = {
          limit: mapping.limit_value === -1 ? 'unlimited' : mapping.limit_value,
          type: mapping.limit_type as 'count' | 'duration' | 'storage',
          period: mapping.limit_period as 'daily' | 'weekly' | 'monthly',
        };
      }

      return featureLimits;
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error getting plan feature limits:', error);
      return {};
    }
  }

  // Get all plans that use a specific feature
  async getPlansUsingFeature(featureId: string): Promise<string[]> {
    try {
      const { data: mappings, error } = await supabase
        .from('plan_feature_mappings')
        .select('plan_id')
        .eq('feature_id', featureId)
        .eq('is_enabled', true);

      if (error) throw error;

      return (mappings || []).map(m => m.plan_id);
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error getting plans using feature:', error);
      return [];
    }
  }

  // Check if a plan has access to a feature
  async hasFeatureAccess(planId: string, featureId: string): Promise<boolean> {
    try {
      const { data: mapping, error } = await supabase
        .from('plan_feature_mappings')
        .select('is_enabled')
        .eq('plan_id', planId)
        .eq('feature_id', featureId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
      }

      return mapping?.is_enabled || false;
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error checking feature access:', error);
      return false;
    }
  }

  // Get feature usage limits for a plan
  async getFeatureLimits(planId: string, featureId: string): Promise<FeatureLimitConfig | null> {
    try {
      const { data: mapping, error } = await supabase
        .from('plan_feature_mappings')
        .select('limit_value, limit_type, limit_period')
        .eq('plan_id', planId)
        .eq('feature_id', featureId)
        .not('limit_type', 'is', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        limit: mapping.limit_value === -1 ? 'unlimited' : mapping.limit_value,
        type: mapping.limit_type as 'count' | 'duration' | 'storage',
        period: mapping.limit_period as 'daily' | 'weekly' | 'monthly',
      };
    } catch (error) {
      console.error('PlanFeatureIntegrationService: Error getting feature limits:', error);
      return null;
    }
  }
}

// Export singleton instance
export const planFeatureIntegrationService = PlanFeatureIntegrationService.getInstance();
