export interface FeatureLimit {
  featureId: string;
  featureName: string;
  description: string;
  freeUserLimit: number;
  freeUserPeriod: 'daily' | 'weekly' | 'monthly';
  freeUserLimitType: 'count' | 'duration' | 'storage'; // count = number of uses, duration = time in minutes, storage = size in bytes
  premiumUserLimit: number | 'unlimited'; // unlimited for premium users
  premiumUserPeriod: 'daily' | 'weekly' | 'monthly';
  premiumUserLimitType: 'count' | 'duration' | 'storage';
  // Session limits for features that need per-session restrictions
  freeUserSessionLimit?: number; // Maximum duration per session in minutes (for duration features)
  premiumUserSessionLimit?: number | 'unlimited'; // Maximum duration per session in minutes (for duration features)
  isActive: boolean;
  category: 'ai' | 'audio' | 'storage' | 'collaboration' | 'analytics' | 'customization';
  priority: number; // Higher number = higher priority for premium features
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanFeatureLimits {
  planId: string;
  planName: string;
  features: {
    [featureId: string]: {
      limit: number | 'unlimited';
      period: 'daily' | 'weekly' | 'monthly';
      limitType: 'count' | 'duration' | 'storage';
    };
  };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserFeatureUsage {
  userId: string;
  featureId: string;
  currentPeriod: {
    start: Date;
    end: Date;
    usage: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    period: 'daily' | 'weekly' | 'monthly';
    limitType: 'count' | 'duration' | 'storage';
  };
  lastReset: Date;
  isPremium: boolean;
}

export interface FeatureLimitCheck {
  canUse: boolean;
  reason?: string;
  currentUsage: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  period: 'daily' | 'weekly' | 'monthly';
  limitType: 'count' | 'duration' | 'storage';
  isPremium: boolean;
  featureName: string;
}

// Default feature limits configuration - Moved to UnifiedFeatureLimits.ts
// This constant has been deprecated in favor of the unified system

// Helper functions for working with feature limits
export const formatLimit = (limit: number | 'unlimited', limitType: 'count' | 'duration' | 'storage'): string => {
  if (limit === 'unlimited') return 'Unlimited';
  
  switch (limitType) {
    case 'count':
      return `${limit} uses`;
    case 'duration':
      const minutes = limit;
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    case 'storage':
      const mb = Math.round(limit / (1024 * 1024));
      const gb = Math.round(limit / (1024 * 1024 * 1024));
      if (gb > 0) {
        return `${gb}GB`;
      }
      return `${mb}MB`;
    default:
      return limit.toString();
  }
};

export const formatUsage = (usage: number, limitType: 'count' | 'duration' | 'storage'): string => {
  switch (limitType) {
    case 'count':
      return `${usage} uses`;
    case 'duration':
      const minutes = usage;
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    case 'storage':
      const mb = Math.round(usage / (1024 * 1024));
      const gb = Math.round(usage / (1024 * 1024 * 1024));
      if (gb > 0) {
        return `${gb}GB`;
      }
      return `${mb}MB`;
    default:
      return usage.toString();
  }
};
