
/**
 * UNIFIED FEATURE LIMITS SYSTEM
 * 
 * This system consolidates all feature limits into one place and integrates
 * with the feature flags system. It replaces:
 * - DefaultFeatureLimits.ts
 * - SimpleFeatureLimits.ts
 * - Simple usage tracking
 * 
 * Key benefits:
 * - Single source of truth for all limits
 * - Automatic sync with feature flags
 * - Consistent structure across the app
 * - Easy to maintain and update
 */

export interface UnifiedFeatureLimit {
  // Core identification
  featureId: string;
  featureName: string;
  description: string;
  
  // Limits by user type
  freeUserLimit: number | 'unlimited';
  premiumUserLimit: number | 'unlimited';
  
  // Limit configuration
  limitType: 'count' | 'duration' | 'storage' | 'boolean';
  period: 'monthly' | 'yearly' | 'lifetime' | 'per_use';
  
  // Session limits (for features like voice recording)
  sessionLimit?: {
    free: number | 'unlimited';
    premium: number | 'unlimited';
    type: 'duration' | 'count';
  };
  
  // Feature management
  isActive: boolean;
  requiresFeatureFlag: boolean;
  featureFlagKey?: string; // Links to feature flags system
  
  // Categorization
  category: 'ai' | 'audio' | 'storage' | 'collaboration' | 'analytics' | 'customization' | 'other';
  priority: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Unified feature limits configuration
export const UNIFIED_FEATURE_LIMITS: Record<string, UnifiedFeatureLimit> = {
  // AI Features
  ai_transcription: {
    featureId: 'ai_transcription',
    featureName: 'AI Transcription',
    description: 'Convert audio to text using AI',
    freeUserLimit: 10,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'ai_transcription',
    category: 'ai',
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  ai_summaries: {
    featureId: 'ai_summaries',
    featureName: 'AI Summaries',
    description: 'Generate AI-powered note summaries',
    freeUserLimit: 15,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'ai_summaries',
    category: 'ai',
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  ai_key_details: {
    featureId: 'ai_key_details',
    featureName: 'AI Key Details',
    description: 'Extract key details from notes using AI',
    freeUserLimit: 5,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'ai_key_details',
    category: 'ai',
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  ai_name_generating: {
    featureId: 'ai_name_generating',
    featureName: 'AI Name Generation',
    description: 'Generate AI-powered note titles',
    freeUserLimit: 10,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'ai_name_generating',
    category: 'ai',
    priority: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  ai_flashcards: {
    featureId: 'ai_flashcards',
    featureName: 'AI Flashcard Generation',
    description: 'Generate flashcards from note content using AI',
    freeUserLimit: 5,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'ai_flashcards',
    category: 'ai',
    priority: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Audio Features
  voice_recording: {
    featureId: 'voice_recording',
    featureName: 'Voice Recording',
    description: 'Record and transcribe voice notes',
    freeUserLimit: 60, // 60 minutes per month
    premiumUserLimit: 'unlimited',
    limitType: 'duration',
    period: 'monthly',
    sessionLimit: {
      free: 5, // 5 minutes per session
      premium: 'unlimited',
      type: 'duration'
    },
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'voice_recording',
    category: 'audio',
    priority: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Storage Features
  note_storage: {
    featureId: 'note_storage',
    featureName: 'Note Storage',
    description: 'Total storage space for notes and attachments',
    freeUserLimit: 100 * 1024 * 1024, // 100MB in bytes
    premiumUserLimit: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    limitType: 'storage',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: false, // Always available
    category: 'storage',
    priority: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  pdf_upload: {
    featureId: 'pdf_upload',
    featureName: 'PDF Upload',
    description: 'Upload and extract text from PDF documents',
    freeUserLimit: 'unlimited', // Unlimited for testing, will be limited in production
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'pdf_upload',
    category: 'storage',
    priority: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Collaboration Features
  note_sharing: {
    featureId: 'note_sharing',
    featureName: 'Note Sharing',
    description: 'Share notes with other users',
    freeUserLimit: 5,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'note_sharing',
    category: 'collaboration',
    priority: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  real_time_sync: {
    featureId: 'real_time_sync',
    featureName: 'Real-time Sync',
    description: 'Real-time synchronization across devices',
    freeUserLimit: 100, // 100 sync operations per month
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: false, // Always available
    category: 'collaboration',
    priority: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Analytics Features
  advanced_search: {
    featureId: 'advanced_search',
    featureName: 'Advanced Search',
    description: 'Advanced search and filtering capabilities',
    freeUserLimit: 15,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'advanced_search',
    category: 'analytics',
    priority: 11,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  note_export: {
    featureId: 'note_export',
    featureName: 'Note Export',
    description: 'Export notes to various formats',
    freeUserLimit: 5,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'note_export',
    category: 'analytics',
    priority: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Customization Features
  custom_themes: {
    featureId: 'custom_themes',
    featureName: 'Custom Themes',
    description: 'Create and use custom themes',
    freeUserLimit: 2,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'lifetime',
    isActive: true,
    requiresFeatureFlag: true,
    featureFlagKey: 'custom_themes',
    category: 'customization',
    priority: 13,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  priority_support: {
    featureId: 'priority_support',
    featureName: 'Priority Support',
    description: 'Priority customer support access',
    freeUserLimit: 1,
    premiumUserLimit: 'unlimited',
    limitType: 'count',
    period: 'monthly',
    isActive: true,
    requiresFeatureFlag: false, // Based on subscription, not feature flag
    category: 'other',
    priority: 14,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// Debug: Log the UNIFIED_FEATURE_LIMITS object
console.log('UNIFIED_FEATURE_LIMITS keys:', Object.keys(UNIFIED_FEATURE_LIMITS));
console.log('UNIFIED_FEATURE_LIMITS count:', Object.keys(UNIFIED_FEATURE_LIMITS).length);

// Helper functions for working with unified limits
export class UnifiedFeatureLimitManager {
  /**
   * Get a feature limit by ID
   */
  static getFeatureLimit(featureId: string): UnifiedFeatureLimit | null {
    return UNIFIED_FEATURE_LIMITS[featureId] || null;
  }
  
  /**
   * Get all feature limits
   */
  static getAllFeatureLimits(): UnifiedFeatureLimit[] {
    const features = Object.values(UNIFIED_FEATURE_LIMITS);
    console.log('UnifiedFeatureLimitManager: getAllFeatureLimits count=', features.length);
    console.log('UnifiedFeatureLimitManager: getAllFeatureLimits IDs=', features.map(f => f.featureId).join(', '));
    return features;
  }
  
  /**
   * Get limits by category
   */
  static getLimitsByCategory(category: UnifiedFeatureLimit['category']): UnifiedFeatureLimit[] {
    return Object.values(UNIFIED_FEATURE_LIMITS).filter(limit => limit.category === category);
  }
  
  /**
   * Get active feature limits only
   */
  static getActiveFeatureLimits(): UnifiedFeatureLimit[] {
    return Object.values(UNIFIED_FEATURE_LIMITS).filter(limit => limit.isActive);
  }
  
  /**
   * Check if a user can use a feature based on current usage
   */
  static canUseFeature(
    featureId: string,
    currentUsage: number,
    isPremium: boolean,
    featureFlags?: Record<string, { enabled: boolean }>
  ): { canUse: boolean; reason?: string; limit: number | 'unlimited' } {
    const limit = this.getFeatureLimit(featureId);
    
    if (!limit) {
      return { canUse: false, reason: 'Feature not found', limit: 0 };
    }
    
    // Check if feature is active
    if (!limit.isActive) {
      return { canUse: false, reason: 'Feature is disabled', limit: 0 };
    }
    
    // Check feature flag if required
    if (limit.requiresFeatureFlag && limit.featureFlagKey && featureFlags) {
      if (!featureFlags[limit.featureFlagKey]?.enabled) {
        return { canUse: false, reason: 'Feature flag is disabled', limit: 0 };
      }
    }
    
    const userLimit = isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
    
    if (userLimit === 'unlimited') {
      return { canUse: true, limit: 'unlimited' };
    }
    
    if (currentUsage >= userLimit) {
      return { 
        canUse: false, 
        reason: `Limit reached (${currentUsage}/${userLimit})`, 
        limit: userLimit 
      };
    }
    
    return { canUse: true, limit: userLimit };
  }
  
  /**
   * Get user's limit for a specific feature
   */
  static getUserLimit(featureId: string, isPremium: boolean): number | 'unlimited' {
    const limit = this.getFeatureLimit(featureId);
    if (!limit) return 0;
    
    return isPremium ? limit.premiumUserLimit : limit.freeUserLimit;
  }
  
  /**
   * Get session limit for a feature (if applicable)
   */
  static getSessionLimit(featureId: string, isPremium: boolean): { limit: number | 'unlimited'; type: string } | null {
    const limit = this.getFeatureLimit(featureId);
    if (!limit?.sessionLimit) return null;
    
    const userSessionLimit = isPremium ? limit.sessionLimit.premium : limit.sessionLimit.free;
    return {
      limit: userSessionLimit,
      type: limit.sessionLimit.type
    };
  }
  
  /**
   * Format limit value for display
   */
  static formatLimit(limit: number | 'unlimited', limitType: string): string {
    if (limit === 'unlimited') return 'Unlimited';
    
    switch (limitType) {
      case 'duration':
        return `${limit} minutes`;
      case 'storage':
        return this.formatBytes(limit);
      case 'count':
        return `${limit}`;
      case 'boolean':
        return limit > 0 ? 'Yes' : 'No';
      default:
        return `${limit}`;
    }
  }
  
  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export the manager instance for easy access
export const featureLimitManager = UnifiedFeatureLimitManager;

// Legacy compatibility exports (for gradual migration)
export const SIMPLE_FEATURE_LIMITS = Object.values(UNIFIED_FEATURE_LIMITS).map(limit => ({
  id: limit.featureId,
  name: limit.featureName,
  description: limit.description,
  freeLimit: limit.freeUserLimit === 'unlimited' ? 0 : limit.freeUserLimit,
  premiumLimit: limit.premiumUserLimit,
  category: limit.category
}));

// Legacy helper functions
export function getFeatureLimit(featureId: string) {
  return featureLimitManager.getFeatureLimit(featureId);
}

export function canUseFeature(
  featureId: string, 
  currentUsage: number, 
  isPremium: boolean
) {
  return featureLimitManager.canUseFeature(featureId, currentUsage, isPremium);
}
