import { supabase } from '../lib/supabase';
import { enhancedPlanService } from './EnhancedPlanService';

type DbPlanVersion = {
  id: string;
  plan_id: string;
  version_number: number;
  changes: any; // could be object map or array depending on source
  created_by: string | null;
  created_at: string;
};

const FIELD_MAP: Record<string, keyof UpdatePlanShape> = {
  name: 'name',
  description: 'description',
  price: 'price',
  currency: 'currency',
  interval: 'interval',
  plan_type: 'planType',
  trial_days: 'trialDays',
  max_users: 'maxUsers',
  max_storage: 'maxStorage',
  is_popular: 'isPopular',
  is_active: 'isActive',
  feature_flags: 'featureFlags',
  featureLimits: 'featureLimits',
  limits: 'featureLimits',
  metadata: 'metadata',
};

type UpdatePlanShape = {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  planType?: 'subscription' | 'one-time' | 'usage-based';
  trialDays?: number;
  maxUsers?: number;
  maxStorage?: number;
  isPopular?: boolean;
  isActive?: boolean;
  featureFlags?: Record<string, boolean>;
  featureLimits?: Record<string, any>;
  metadata?: Record<string, any>;
};

export class PlanVersionService {
  async listVersions(planId: string, limit = 50): Promise<DbPlanVersion[]> {
    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Roll back the plan by applying the "from" values in the selected version
  async rollbackToVersion(planId: string, versionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('id', versionId)
      .single();
    if (error || !data) throw error || new Error('Version not found');
    const version = data as DbPlanVersion;

    const updates: UpdatePlanShape = {};

    // Handle two possible shapes of changes
    // 1) Object map: { field: { from: X, to: Y }, ... }
    if (version.changes && !Array.isArray(version.changes) && typeof version.changes === 'object') {
      for (const [dbField, diff] of Object.entries(version.changes)) {
        const appField = FIELD_MAP[dbField];
        if (!appField) continue;
        const fromVal = (diff as any)?.from;
        if (fromVal !== undefined) {
          (updates as any)[appField] = normalizeFieldValue(appField, fromVal);
        }
      }
    }

    // 2) Array of changes: [{ field, oldValue, newValue }]
    if (Array.isArray(version.changes)) {
      for (const entry of version.changes) {
        const dbField = entry.field as string;
        const appField = FIELD_MAP[dbField] || FIELD_MAP[toSnake(dbField)] || (entry.field as keyof UpdatePlanShape);
        if (!appField) continue;
        const fromVal = entry.oldValue;
        if (fromVal !== undefined) {
          (updates as any)[appField] = normalizeFieldValue(appField, fromVal);
        }
      }
    }

    // Apply update via service (will create a new version automatically)
    await enhancedPlanService.updatePlan(planId, updates as any);
  }
}

function toSnake(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function normalizeFieldValue(field: keyof UpdatePlanShape, val: any): any {
  if (field === 'price' && val != null) return Number(val);
  if ((field === 'maxUsers' || field === 'maxStorage' || field === 'trialDays') && val != null) return Number(val);
  if (field === 'isPopular' || field === 'isActive') return Boolean(val);
  return val;
}

export const planVersionService = new PlanVersionService();


