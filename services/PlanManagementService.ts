import { supabase } from '../lib/supabase';
import type {
    CreatePlanData,
    EnhancedPlan,
    FeatureSyncResult,
    PlanChanges,
    PlanSearchOptions,
    PlanSearchResult,
    PlanValidationResult,
    UpdatePlanData
} from '../types/EnhancedPlans';

export class PlanManagementService {
  private static instance: PlanManagementService;
  private supabase = supabase;

  private constructor() {}

  public static getInstance(): PlanManagementService {
    if (!PlanManagementService.instance) {
      PlanManagementService.instance = new PlanManagementService();
    }
    return PlanManagementService.instance;
  }

  /**
   * Create a new plan with full validation
   */
  async createPlan(data: CreatePlanData): Promise<EnhancedPlan> {
    try {
      // Validate plan data
      const validation = await this.validatePlan(data);
      if (!validation.isValid) {
        throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicate plan name
      const nameExists = await this.checkPlanNameExists(data.name);
      if (nameExists) {
        throw new Error(`Plan with name "${data.name}" already exists`);
      }

      // Prepare plan data
      const planData = {
        name: data.name,
        description: data.description || '',
        price: data.price,
        currency: data.currency || 'USD',
        interval: data.interval || 'monthly',
        plan_type: data.planType || 'subscription',
        trial_days: data.trialDays || 0,
        max_users: data.maxUsers || 1,
        max_storage: data.maxStorage || 1,
        is_popular: data.isPopular || false,
        feature_flags: data.featureFlags || {},
        limits: data.featureLimits || {},
        metadata: data.metadata || {},
        is_active: data.isActive !== false // Default to true
      };

      // Insert plan
      const { data: plan, error } = await this.supabase
        .from('premium_plans')
        .insert(planData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create plan: ${error.message}`);
      }

      // Create feature mappings if provided
      if (data.featureMappings && data.featureMappings.length > 0) {
        await this.createFeatureMappings(plan.id, data.featureMappings);
      }

      // Create initial version
      await this.createInitialVersion(plan.id, 'Plan created');

      // Return enhanced plan
      return await this.getPlan(plan.id);
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  /**
   * Update an existing plan
   */
  async updatePlan(id: string, data: UpdatePlanData): Promise<EnhancedPlan> {
    try {
      // Get current plan
      const currentPlan = await this.getPlan(id);
      if (!currentPlan) {
        throw new Error(`Plan with ID ${id} not found`);
      }

      // Validate update data
      const validation = await this.validatePlan(data);
      if (!validation.isValid) {
        throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicate plan name (excluding current plan)
      if (data.name && data.name !== currentPlan.name) {
        const nameExists = await this.checkPlanNameExists(data.name, id);
        if (nameExists) {
          throw new Error(`Plan with name "${data.name}" already exists`);
        }
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update provided fields
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.interval !== undefined) updateData.interval = data.interval;
      if (data.planType !== undefined) updateData.plan_type = data.planType;
      if (data.trialDays !== undefined) updateData.trial_days = data.trialDays;
      if (data.maxUsers !== undefined) updateData.max_users = data.maxUsers;
      if (data.maxStorage !== undefined) updateData.max_storage = data.maxStorage;
      if (data.isPopular !== undefined) updateData.is_popular = data.isPopular;
      if (data.featureFlags !== undefined) updateData.feature_flags = data.featureFlags;
              if (data.featureLimits !== undefined) updateData.limits = data.featureLimits;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      // Update plan
      const { data: updatedPlan, error } = await this.supabase
        .from('premium_plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update plan: ${error.message}`);
      }

      // Update feature mappings if provided
      if (data.featureMappings !== undefined) {
        await this.updateFeatureMappings(id, data.featureMappings);
      }

      // Create version record
      const changes = this.detectChanges(currentPlan, updatedPlan);
      if (Object.keys(changes).length > 0) {
        await this.createVersion(id, changes);
      }

      // Return enhanced plan
      return await this.getPlan(id);
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  /**
   * Delete a plan (soft delete by archiving)
   */
  async deletePlan(id: string): Promise<boolean> {
    try {
      // Check if plan exists
      const plan = await this.getPlan(id);
      if (!plan) {
        throw new Error(`Plan with ID ${id} not found`);
      }

      // Archive the plan instead of hard delete
      const { error } = await this.supabase
        .from('premium_plans')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete plan: ${error.message}`);
      }

      // Create version record
      await this.createVersion(id, { action: 'deleted', timestamp: new Date().toISOString() });

      return true;
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  }

  /**
   * Get a single plan by ID
   */
  async getPlan(id: string): Promise<EnhancedPlan | null> {
    try {
      // Use the source of truth table; views may be missing in some envs
      const { data, error } = await this.supabase
        .from('premium_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Plan not found
        }
        throw new Error(`Failed to get plan: ${error.message}`);
      }

      return this.transformEnhancedPlanRow(data);
    } catch (error) {
      console.error('Error getting plan:', error);
      throw error;
    }
  }

  /**
   * List plans with filtering and pagination
   */
  async listPlans(options: PlanSearchOptions = {}): Promise<PlanSearchResult> {
    try {
      const {
        filters = {},
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = options;

      let query = this.supabase
        .from('premium_plans')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.planType) {
        query = query.eq('plan_type', filters.planType);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.currency) {
        query = query.eq('currency', filters.currency);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.isPopular !== undefined) {
        query = query.eq('is_popular', filters.isPopular);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: plans, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list plans: ${error.message}`);
      }

      return {
        plans: (plans || []).map((p: any) => this.transformEnhancedPlanRow(p)),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: (page * limit) < (count || 0),
        hasPrevious: page > 1
      };
    } catch (error) {
      console.error('Error listing plans:', error);
      throw error;
    }
  }

  /**
   * Archive a plan
   */
  async archivePlan(id: string): Promise<EnhancedPlan> {
    return this.updatePlan(id, { isActive: false });
  }

  /**
   * Restore an archived plan
   */
  async restorePlan(id: string): Promise<EnhancedPlan> {
    return this.updatePlan(id, { isActive: true });
  }

  /**
   * Duplicate a plan
   */
  async duplicatePlan(id: string, newName?: string): Promise<EnhancedPlan> {
    try {
      const originalPlan = await this.getPlan(id);
      if (!originalPlan) {
        throw new Error(`Plan with ID ${id} not found`);
      }

      const duplicateName = newName || `${originalPlan.name} (Copy)`;
      
      // Create new plan with duplicated data
      const createData: CreatePlanData = {
        name: duplicateName,
        description: originalPlan.description,
        price: originalPlan.price,
        currency: originalPlan.currency,
        interval: originalPlan.interval,
        planType: originalPlan.planType,
        trialDays: originalPlan.trialDays,
        maxUsers: originalPlan.maxUsers,
        maxStorage: originalPlan.maxStorage,
        isPopular: false, // Don't duplicate popularity
        featureFlags: originalPlan.featureFlags,
        featureLimits: originalPlan.featureLimits,
        metadata: {
          ...originalPlan.metadata,
          duplicated_from: id,
          duplicated_at: new Date().toISOString()
        },
        isActive: false, // Start as inactive
        // createdBy handled at service layer if needed
      };

      const newPlan = await this.createPlan(createData);

      // Duplicate feature mappings
      const featureMappings = await this.getFeatureMappings(id);
      if (featureMappings.length > 0) {
        await this.createFeatureMappings(newPlan.id, featureMappings);
      }

      return newPlan;
    } catch (error) {
      console.error('Error duplicating plan:', error);
      throw error;
    }
  }

  /**
   * Validate plan data
   */
  async validatePlan(data: CreatePlanData | UpdatePlanData): Promise<PlanValidationResult> {
    const errors: string[] = [];

    // Validate name
    if ('name' in data && data.name) {
      if (data.name.length < 3) {
        errors.push('Plan name must be at least 3 characters long');
      }
      if (data.name.length > 100) {
        errors.push('Plan name must be less than 100 characters');
      }
    }

    // Validate price
    if ('price' in data && data.price !== undefined) {
      if (data.price < 0) {
        errors.push('Price must be non-negative');
      }
      if (data.price > 999999.99) {
        errors.push('Price must be less than 1,000,000');
      }
    }

    // Validate trial days
    if ('trialDays' in data && data.trialDays !== undefined) {
      if (data.trialDays < 0) {
        errors.push('Trial days must be non-negative');
      }
      if (data.trialDays > 365) {
        errors.push('Trial days cannot exceed 365 days');
      }
    }

    // Validate user limits
    if ('maxUsers' in data && data.maxUsers !== undefined) {
      if (data.maxUsers < 1) {
        errors.push('Maximum users must be at least 1');
      }
      if (data.maxUsers > 10000) {
        errors.push('Maximum users cannot exceed 10,000');
      }
    }

    // Validate storage limits
    if ('maxStorage' in data && data.maxStorage !== undefined) {
      if (data.maxStorage < 1) {
        errors.push('Maximum storage must be at least 1');
      }
      if (data.maxStorage > 1000000) {
        errors.push('Maximum storage cannot exceed 1,000,000');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sync plan features with the feature management system
   */
  async syncPlanFeatures(planId: string): Promise<FeatureSyncResult> {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error(`Plan with ID ${planId} not found`);
      }

      // Get current feature mappings
      const currentMappings = await this.getFeatureMappings(planId);
      
      // Update feature flags based on mappings
      const featureFlags: Record<string, boolean> = {};
      const featureLimits: Record<string, any> = {};

      for (const mapping of currentMappings) {
        featureFlags[mapping.feature_id] = mapping.is_enabled;
        if (mapping.limit_value !== null) {
          featureLimits[mapping.feature_id] = {
            value: mapping.limit_value,
            type: mapping.limit_type,
            period: mapping.limit_period
          };
        }
      }

      // Update plan with synced features
      await this.updatePlan(planId, {
        featureFlags,
        featureLimits
      });

      return {
        success: true,
        syncedFeatures: currentMappings.length,
        featureFlags,
        featureLimits
      };
    } catch (error) {
      console.error('Error syncing plan features:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private helper methods

  private async checkPlanNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .from('premium_plans')
      .select('id')
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to check plan name: ${error.message}`);
    }

    return data.length > 0;
  }

  private async createFeatureMappings(planId: string, mappings: any[]): Promise<void> {
    const mappingData = mappings.map(mapping => ({
      plan_id: planId,
      feature_id: mapping.feature_id,
      is_enabled: mapping.is_enabled ?? true,
      limit_value: mapping.limit_value,
      limit_type: mapping.limit_type,
      limit_period: mapping.limit_period
    }));

    const { error } = await this.supabase
      .from('plan_feature_mappings')
      .insert(mappingData);

    if (error) {
      throw new Error(`Failed to create feature mappings: ${error.message}`);
    }
  }

  private async updateFeatureMappings(planId: string, mappings: any[]): Promise<void> {
    // Delete existing mappings
    await this.supabase
      .from('plan_feature_mappings')
      .delete()
      .eq('plan_id', planId);

    // Create new mappings
    if (mappings.length > 0) {
      await this.createFeatureMappings(planId, mappings);
    }
  }

  private async getFeatureMappings(planId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('plan_feature_mappings')
      .select('*')
      .eq('plan_id', planId);

    if (error) {
      throw new Error(`Failed to get feature mappings: ${error.message}`);
    }

    return data || [];
  }

  private async createInitialVersion(planId: string, description: string): Promise<void> {
    const { error } = await this.supabase
      .from('plan_versions')
      .insert({
        plan_id: planId,
        version_number: 1,
        changes: { action: 'created', description },
        created_by: null // Will be set by trigger
      });

    if (error) {
      console.error('Failed to create initial version:', error);
    }
  }

  private async createVersion(planId: string, changes: PlanChanges): Promise<void> {
    const { error } = await this.supabase
      .from('plan_versions')
      .insert({
        plan_id: planId,
        changes,
        created_by: null // Will be set by trigger
      });

    if (error) {
      console.error('Failed to create version:', error);
    }
  }

  private detectChanges(oldPlan: any, newPlan: any): PlanChanges {
    const changes: PlanChanges = {};
    
    const fields = ['name', 'description', 'price', 'currency', 'interval', 'plan_type', 
                   'trial_days', 'max_users', 'max_storage', 'is_popular', 'feature_flags', 
                   'limits', 'is_active'];

    for (const field of fields) {
      if (oldPlan[field] !== newPlan[field]) {
        changes[field] = {
          from: oldPlan[field],
          to: newPlan[field]
        };
      }
    }

    return changes;
  }

  private transformEnhancedPlanRow(row: any): EnhancedPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      price: row.price !== undefined && row.price !== null ? Number(row.price) : 0,
      currency: row.currency,
      interval: row.interval,
      stripeProductId: row.stripe_product_id,
      stripePriceId: row.stripe_price_id,
      featureFlags: row.feature_flags || {},
      featureLimits: row.limits || {},
      planType: row.plan_type || 'subscription',
      isActive: row.is_active !== false,
      trialDays: row.trial_days || 0,
      maxUsers: row.max_users || 1,
      maxStorage: row.max_storage || 1,
      isPopular: row.is_popular || false,
      originalPrice: row.original_price !== undefined && row.original_price !== null
        ? Number(row.original_price)
        : undefined,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      featureCount: row.feature_count,
      versionCount: row.version_count,
    };
  }
}

// Export singleton instance
export const planManagementService = PlanManagementService.getInstance();
