// Enhanced Plans Management System Types
// Phase 1: Foundation - TypeScript Interfaces

export interface EnhancedPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  
  // Stripe Integration
  stripeProductId?: string;
  stripePriceId?: string;
  
  // Feature Integration
  featureFlags: Record<string, boolean>;
  featureLimits: Record<string, FeatureLimitConfig>;
  
  // Plan Configuration
  planType: 'subscription' | 'one-time' | 'usage-based';
  isActive: boolean;
  trialDays: number;
  maxUsers: number;
  maxStorage: number; // in GB
  
  // Marketing
  isPopular: boolean;
  originalPrice?: number;
  metadata: Record<string, any>;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Computed fields (from view)
  featureCount?: number;
  versionCount?: number;
}

export interface FeatureLimitConfig {
  limit: number | 'unlimited';
  period: 'daily' | 'weekly' | 'monthly';
  type: 'count' | 'duration' | 'storage';
}

export interface PlanFeatureMapping {
  id: string;
  planId: string;
  featureId: string;
  isEnabled: boolean;
  limitValue?: number;
  limitType?: 'count' | 'duration' | 'storage';
  limitPeriod?: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanVersion {
  id: string;
  planId: string;
  versionNumber: number;
  changes: PlanChanges;
  createdBy: string;
  createdAt: Date;
}

export interface PlanChanges {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
  timestamp: Date;
}

export interface CreatePlanData {
  name: string;
  description: string;
  price: number;
  currency?: string;
  interval?: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  planType?: 'subscription' | 'one-time' | 'usage-based';
  trialDays?: number;
  maxUsers?: number;
  maxStorage?: number;
  isPopular?: boolean;
  originalPrice?: number;
  featureFlags?: Record<string, boolean>;
  featureLimits?: Record<string, FeatureLimitConfig>;
  metadata?: Record<string, any>;
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  planType?: 'subscription' | 'one-time' | 'usage-based';
  isActive?: boolean;
  trialDays?: number;
  maxUsers?: number;
  maxStorage?: number;
  isPopular?: boolean;
  originalPrice?: number;
  featureFlags?: Record<string, boolean>;
  featureLimits?: Record<string, FeatureLimitConfig>;
  metadata?: Record<string, any>;
}

export interface PlanValidationResult {
  isValid: boolean;
  errors: PlanValidationError[];
  warnings: PlanValidationWarning[];
}

export interface PlanValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PlanValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface StripeSyncResult {
  success: boolean;
  productId?: string;
  priceId?: string;
  error?: string;
  syncTimestamp: Date;
}

export interface PlanSyncStatus {
  planId: string;
  stripeSync: StripeSyncResult;
  featureSync: FeatureSyncResult;
  lastSync: Date;
  isInSync: boolean;
}

export interface FeatureSyncResult {
  success: boolean;
  featuresUpdated: number;
  featuresAdded: number;
  featuresRemoved: number;
  error?: string;
  syncTimestamp: Date;
}

// Plan comparison and analysis types
export interface PlanComparison {
  plan1: EnhancedPlan;
  plan2: EnhancedPlan;
  differences: PlanDifference[];
  similarities: string[];
}

export interface PlanDifference {
  field: string;
  plan1Value: any;
  plan2Value: any;
  differenceType: 'value' | 'structure' | 'feature';
}

// Plan analytics and reporting types
export interface PlanAnalytics {
  planId: string;
  totalSubscribers: number;
  activeSubscribers: number;
  churnRate: number;
  averageRevenue: number;
  featureUsage: Record<string, number>;
  lastUpdated: Date;
}

export interface PlanMetrics {
  totalPlans: number;
  activePlans: number;
  plansWithStripe: number;
  plansWithFeatures: number;
  averagePrice: number;
  mostPopularPlan?: string;
  lastCreatedPlan?: Date;
}

// Plan import/export types
export interface PlanExportData {
  version: string;
  exportDate: Date;
  plans: EnhancedPlan[];
  featureMappings: PlanFeatureMapping[];
  versions: PlanVersion[];
}

export interface PlanImportResult {
  success: boolean;
  importedPlans: number;
  skippedPlans: number;
  errors: string[];
  warnings: string[];
}

// Plan templates for quick creation
export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<CreatePlanData>;
  category: 'basic' | 'premium' | 'enterprise' | 'custom';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Plan pricing tiers
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  features: string[];
  limits: Record<string, FeatureLimitConfig>;
  isPopular: boolean;
  discount?: number; // percentage discount
  originalPrice?: number;
}

// Plan feature bundles
export interface FeatureBundle {
  id: string;
  name: string;
  description: string;
  features: string[];
  category: 'ai' | 'collaboration' | 'storage' | 'analytics' | 'custom';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Plan lifecycle states
export type PlanStatus = 
  | 'draft'
  | 'active'
  | 'paused'
  | 'deprecated'
  | 'archived';

export interface PlanLifecycle {
  planId: string;
  status: PlanStatus;
  statusChangedAt: Date;
  statusChangedBy: string;
  reason?: string;
  nextReviewDate?: Date;
}

// Plan approval workflow
export interface PlanApproval {
  id: string;
  planId: string;
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: PlanChanges[];
}

// Plan notification types
export interface PlanNotification {
  id: string;
  planId: string;
  type: 'created' | 'updated' | 'deleted' | 'sync_failed' | 'approval_required';
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  createdAt: Date;
  readAt?: Date;
  readBy?: string;
}

// Utility types for plan operations
export type PlanSortField = 
  | 'name'
  | 'price'
  | 'createdAt'
  | 'updatedAt'
  | 'featureCount'
  | 'subscriberCount';

export type PlanSortOrder = 'asc' | 'desc';

export interface PlanFilters {
  status?: PlanStatus[];
  planType?: ('subscription' | 'one-time' | 'usage-based')[];
  priceRange?: { min: number; max: number };
  hasStripe?: boolean;
  hasFeatures?: boolean;
  isPopular?: boolean;
  isActive?: boolean;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PlanSearchOptions {
  query?: string;
  filters?: PlanFilters;
  sortBy?: PlanSortField;
  sortOrder?: PlanSortOrder;
  page?: number;
  limit?: number;
}

export interface PlanSearchResult {
  plans: EnhancedPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
