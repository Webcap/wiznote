/**
 * ADVANCED FEATURE ANALYTICS SYSTEM
 * 
 * This system provides comprehensive analytics for feature flags including:
 * - Activation rates and user engagement
 * - User retention and churn analysis
 * - Conversion impact measurement
 * - A/B testing metrics
 * - Business impact tracking
 */

export interface FeatureAnalytics {
  // Core metrics
  featureId: string;
  featureName: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  
  // Activation metrics
  activationRate: number; // Percentage of users who used the feature
  totalActivations: number;
  uniqueUsers: number;
  averageActivationsPerUser: number;
  
  // User behavior metrics
  userRetention: {
    day1: number; // Users who used feature and returned next day
    day7: number; // Users who used feature and returned after 7 days
    day30: number; // Users who used feature and returned after 30 days
  };
  
  // Engagement metrics
  engagement: {
    averageSessionDuration: number; // Minutes spent using feature
    averageSessionsPerUser: number;
    featureAdoptionRate: number; // % of eligible users who tried feature
    featureStickiness: number; // % of users who used feature multiple times
  };
  
  // Conversion metrics
  conversionImpact: {
    signupRate: number; // % of feature users who signed up
    upgradeRate: number; // % of feature users who upgraded to premium
    churnRate: number; // % of feature users who churned
    revenueImpact: number; // Revenue attributed to this feature
  };
  
  // A/B testing metrics (if applicable)
  abTesting?: {
    variant: 'A' | 'B' | 'control';
    conversionRate: number;
    statisticalSignificance: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  };
  
  // Business impact
  businessImpact: {
    userSatisfaction: number; // 1-5 scale
    supportTicketReduction: number; // % reduction in related tickets
    featureRequestFulfillment: number; // % of requests this feature addresses
    competitiveAdvantage: number; // 1-5 scale
  };
  
  // Technical metrics
  technicalMetrics: {
    errorRate: number; // % of feature usage that resulted in errors
    performanceImpact: number; // % change in app performance
    resourceUsage: number; // CPU/memory usage increase
    apiCallIncrease: number; // % increase in API calls
  };
  
  // Cohort analysis
  cohorts: Array<{
    cohortName: string;
    userCount: number;
    activationRate: number;
    retentionRate: number;
    revenuePerUser: number;
  }>;
  
  // Geographic and demographic breakdown
  demographics: {
    regions: Record<string, {
      userCount: number;
      activationRate: number;
      conversionRate: number;
    }>;
    userTypes: {
      free: { userCount: number; activationRate: number; };
      premium: { userCount: number; activationRate: number; };
      admin: { userCount: number; activationRate: number; };
    };
  };
  
  // Time series data for trending
  timeSeries: Array<{
    date: Date;
    activations: number;
    uniqueUsers: number;
    conversionRate: number;
    revenue: number;
  }>;
}

export interface FeatureComparison {
  featureA: string;
  featureB: string;
  metrics: {
    activationRate: { a: number; b: number; difference: number; };
    userRetention: { a: number; b: number; difference: number; };
    conversionRate: { a: number; b: number; difference: number; };
    revenueImpact: { a: number; b: number; difference: number; };
  };
  statisticalSignificance: number;
  recommendation: 'feature_a' | 'feature_b' | 'inconclusive';
}

export interface FeatureHealthScore {
  featureId: string;
  overallScore: number; // 0-100
  metrics: {
    activation: number; // 0-100
    retention: number; // 0-100
    conversion: number; // 0-100
    satisfaction: number; // 0-100
    technical: number; // 0-100
  };
  trends: {
    activation: 'up' | 'down' | 'stable';
    retention: 'up' | 'down' | 'stable';
    conversion: 'up' | 'down' | 'stable';
    satisfaction: 'up' | 'down' | 'stable';
  };
  recommendations: string[];
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface FeatureInsights {
  featureId: string;
  insights: Array<{
    type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number; // 0-100
    actionable: boolean;
    recommendations?: string[];
  }>;
  predictions: {
    nextMonthActivations: number;
    nextMonthRevenue: number;
    churnRisk: 'low' | 'medium' | 'high';
    growthPotential: 'low' | 'medium' | 'high';
  };
}

export interface AnalyticsQuery {
  featureIds?: string[];
  startDate: Date;
  endDate: Date;
  period: 'daily' | 'weekly' | 'monthly';
  groupBy?: 'user_type' | 'region' | 'cohort' | 'variant';
  filters?: {
    userTypes?: ('free' | 'premium' | 'admin')[];
    regions?: string[];
    minActivations?: number;
    maxErrorRate?: number;
  };
  metrics?: string[];
}

export interface AnalyticsResponse {
  data: FeatureAnalytics[];
  summary: {
    totalFeatures: number;
    averageActivationRate: number;
    totalRevenue: number;
    topPerformingFeature: string;
    needsAttention: string[];
  };
  metadata: {
    queryTime: number; // ms
    dataFreshness: Date;
    cacheHit: boolean;
  };
}
