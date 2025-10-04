import { DEFAULT_FEATURE_FLAGS } from '../constants/DefaultFeatureFlags';
import { FeatureFlag } from '../types/FeatureFlags';

// Interface matching the admin dashboard's FeatureConfig
export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'premium' | 'ai' | 'collaboration' | 'analytics';
  enabled: boolean;
  premiumOnly: boolean;
  rolloutPercentage?: number;
  targetEnvironments?: ('development' | 'staging' | 'production')[];
  targetUsers?: string[];
  targetRoles?: string[];
  plans?: string[];
  plansUsingFeature?: string[];
}

// Category mapping for feature flags
const getCategoryForFlag = (flagId: string): 'core' | 'premium' | 'ai' | 'collaboration' | 'analytics' => {
  const aiFeatures = ['ai_transcription', 'ai_name_generating', 'ai_summaries', 'ai_key_details'];
  const premiumFeatures = ['advanced_search', 'note_sharing', 'team_management', 'analytics_dashboard', 'custom_integrations', 'api_access'];
  const collaborationFeatures = ['note_sharing', 'team_management'];
  const analyticsFeatures = ['analytics_dashboard'];
  
  if (aiFeatures.includes(flagId)) return 'ai';
  if (premiumFeatures.includes(flagId)) return 'premium';
  if (collaborationFeatures.includes(flagId)) return 'collaboration';
  if (analyticsFeatures.includes(flagId)) return 'analytics';
  return 'core'; // Default to core for everything else
};

// Default plans for different feature types
const getDefaultPlans = (flagId: string): string[] => {
  const enterpriseOnly = ['custom_integrations', 'api_access'];
  const proAndEnterprise = ['note_sharing', 'team_management', 'analytics_dashboard'];
  
  if (enterpriseOnly.includes(flagId)) return ['enterprise'];
  if (proAndEnterprise.includes(flagId)) return ['pro', 'enterprise'];
  return ['basic', 'pro', 'enterprise']; // Default to all plans
};

/**
 * Converts DefaultFeatureFlags to FeatureConfig format for admin dashboard
 * This eliminates the need for hardcoded defaultFeatures array
 */
export function convertFeatureFlagsToConfig(flags: Record<string, FeatureFlag>): FeatureConfig[] {
  return Object.entries(flags).map(([flagId, flag]) => ({
    id: flagId,
    name: flag.name,
    description: flag.description,
    category: getCategoryForFlag(flagId),
    enabled: flag.enabled,
    premiumOnly: flag.premiumOnly || false,
    rolloutPercentage: flag.rolloutPercentage,
    targetEnvironments: flag.targetEnvironments,
    targetUsers: flag.targetUsers,

    targetRoles: flag.targetRoles,
    plans: getDefaultPlans(flagId),
    plansUsingFeature: [] // Will be populated by the admin dashboard
  }));
}

/**
 * Gets the default feature configurations from DefaultFeatureFlags
 * This replaces the hardcoded defaultFeatures array
 */
export function getDefaultFeatureConfigs(): FeatureConfig[] {
  return convertFeatureFlagsToConfig(DEFAULT_FEATURE_FLAGS);
}

/**
 * Merges feature flags with default configurations
 * This ensures the admin dashboard always has the latest flags
 */
export function mergeFeatureFlagsWithDefaults(
  flags: Record<string, FeatureFlag>,
  defaultConfigs: FeatureConfig[]
): FeatureConfig[] {
  const flagConfigs = convertFeatureFlagsToConfig(flags);
  
  // Create a map of existing configs by ID
  const configMap = new Map(defaultConfigs.map(config => [config.id, config]));
  
  // Update with flag values, keeping existing configs as fallback
  flagConfigs.forEach(flagConfig => {
    const existingConfig = configMap.get(flagConfig.id);
    if (existingConfig) {
      // Merge flag values with existing config
      configMap.set(flagConfig.id, {
        ...existingConfig,
        enabled: flagConfig.enabled,
        premiumOnly: flagConfig.premiumOnly,
        rolloutPercentage: flagConfig.rolloutPercentage,
        targetEnvironments: flagConfig.targetEnvironments,
        targetUsers: flagConfig.targetUsers,

        targetRoles: flagConfig.targetRoles,
      });
    } else {
      // Add new flag config
      configMap.set(flagConfig.id, flagConfig);
    }
  });
  
  return Array.from(configMap.values());
} 