// Enhanced Plans Management System Service
// Phase 2: Core Services - Complete Integration

import { supabase } from '../lib/supabase';
import {
    CreatePlanData,
    EnhancedPlan,
    FeatureSyncResult,
    PlanSyncStatus,
    PlanValidationError,
    PlanValidationResult,
    PlanValidationWarning,
    UpdatePlanData
} from '../types/EnhancedPlans';
import { stripeService } from './StripeService.native';

export class EnhancedPlanService {
  private static instance: EnhancedPlanService;

  private constructor() {}

  public static getInstance(): EnhancedPlanService {
    if (!EnhancedPlanService.instance) {
      EnhancedPlanService.instance = new EnhancedPlanService();
    }
    return EnhancedPlanService.instance;
  }

  // Create new plan with full integration
  async createPlan(planData: CreatePlanData, createdBy: string): Promise<EnhancedPlan> {
    try {
      console.log('EnhancedPlanService: Creating new plan:', planData.name);

      // 1. Validate plan data
      const validation = this.validatePlanData(planData);
      if (!validation.isValid) {
        throw new Error(`Plan validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. Create plan in database
      const plan: Omit<EnhancedPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        ...planData,
        currency: planData.currency || 'USD',
        interval: planData.interval || 'monthly',
        planType: planData.planType || 'subscription',
        trialDays: planData.trialDays || 0,
        maxUsers: planData.maxUsers || 1,
        maxStorage: planData.maxStorage || 1,
        isPopular: planData.isPopular || false,
        featureFlags: planData.featureFlags || {},
        featureLimits: planData.featureLimits || {},
        metadata: planData.metadata || {},
        isActive: true,
        createdBy,
      };

      const { data, error } = await supabase
        .from('premium_plans')
        .insert({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          plan_type: plan.planType,
          trial_days: plan.trialDays,
          max_users: plan.maxUsers,
          max_storage: plan.maxStorage,
          is_popular: plan.isPopular,
          feature_flags: plan.featureFlags,
          limits: plan.featureLimits,
          metadata: plan.metadata,
          is_active: plan.isActive,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const createdPlan = this.transformDatabasePlan(data);

      // 3. Sync with Stripe
      try {
        const stripeResult = await stripeService.syncProduct(createdPlan);
        
        // Update plan with Stripe IDs
        await this.updatePlan(createdPlan.id, {
          stripeProductId: stripeResult.productId,
          stripePriceId: stripeResult.priceId,
        });

        createdPlan.stripeProductId = stripeResult.productId;
        createdPlan.stripePriceId = stripeResult.priceId;
      } catch (stripeError) {
        console.error('EnhancedPlanService: Stripe sync failed:', stripeError);
        // Don't fail the entire operation, but log the issue
      }

      // 4. Apply feature configurations
      await this.applyFeatureConfigurations(createdPlan.id, plan.featureFlags, plan.featureLimits);

      console.log('EnhancedPlanService: Plan created successfully:', createdPlan.id);
      return createdPlan;
    } catch (error) {
      console.error('EnhancedPlanService: Error creating plan:', error);
      throw error;
    }
  }

  // Update existing plan
  async updatePlan(planId: string, updates: UpdatePlanData): Promise<EnhancedPlan> {
    try {
      console.log('EnhancedPlanService: Updating plan:', planId);

      // 1. Get current plan
      const currentPlan = await this.getPlan(planId);
      if (!currentPlan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // 2. Validate updates
      const validation = this.validatePlanUpdates(currentPlan, updates);
      if (!validation.isValid) {
        throw new Error(`Update validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 3. Check if pricing changed (requires new Stripe price)
      const pricingChanged = updates.price !== undefined && updates.price !== currentPlan.price;

      // 4. Update database
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.interval !== undefined) updateData.interval = updates.interval;
      if (updates.planType !== undefined) updateData.plan_type = updates.planType;
      if (updates.trialDays !== undefined) updateData.trial_days = updates.trialDays;
      if (updates.maxUsers !== undefined) updateData.max_users = updates.maxUsers;
      if (updates.maxStorage !== undefined) updateData.max_storage = updates.maxStorage;
      if (updates.isPopular !== undefined) updateData.is_popular = updates.isPopular;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.featureFlags !== undefined) {
        updateData.feature_flags = updates.featureFlags;
      }
      if (updates.featureLimits !== undefined) {
        updateData.limits = updates.featureLimits;
      }
      if ((updates as any).stripeProductId !== undefined) {
        updateData.stripe_product_id = (updates as any).stripeProductId;
      }
      if ((updates as any).stripePriceId !== undefined) {
        updateData.stripe_price_id = (updates as any).stripePriceId;
      }

      const { data, error } = await supabase
        .from('premium_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      const updatedPlan = this.transformDatabasePlan(data);

      // 5. Sync with Stripe if pricing changed (create product/price if needed)
      if (pricingChanged) {
        try {
          const stripeResult = await stripeService.syncProduct(updatedPlan);
          
          // Update with new Stripe IDs
          await supabase
            .from('premium_plans')
            .update({
              stripe_product_id: stripeResult.productId,
              stripe_price_id: stripeResult.priceId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', planId);

          updatedPlan.stripeProductId = stripeResult.productId;
          updatedPlan.stripePriceId = stripeResult.priceId;
        } catch (stripeError) {
          console.error('EnhancedPlanService: Stripe sync failed during update:', stripeError);
        }
      }

      // 6. Apply feature configuration changes
      if (updates.featureFlags !== undefined || updates.featureLimits !== undefined) {
        await this.applyFeatureConfigurations(
          planId, 
          updates.featureFlags || currentPlan.featureFlags,
          updates.featureLimits || currentPlan.featureLimits
        );
      }

      // 7. Create version record for audit
      await this.createPlanVersion(planId, currentPlan, updatedPlan, updates);

      console.log('EnhancedPlanService: Plan updated successfully:', planId);
      return updatedPlan;
    } catch (error) {
      console.error('EnhancedPlanService: Error updating plan:', error);
      throw error;
    }
  }

  // Delete plan with cleanup
  async deletePlan(planId: string): Promise<void> {
    try {
      console.log('EnhancedPlanService: Deleting plan:', planId);

      // 1. Get plan details
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // 2. Delete from Stripe
      if (plan.stripeProductId) {
        try {
          await stripeService.deleteProduct(plan);
        } catch (stripeError) {
          console.error('EnhancedPlanService: Stripe deletion failed:', stripeError);
          // Continue with database deletion
        }
      }

      // 3. Remove feature configurations
      await this.removeFeatureConfigurations(planId);

      // 4. Delete from database
      const { error } = await supabase
        .from('premium_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      console.log('EnhancedPlanService: Plan deleted successfully:', planId);
    } catch (error) {
      console.error('EnhancedPlanService: Error deleting plan:', error);
      throw error;
    }
  }

  // Get plan by ID
  async getPlan(planId: string): Promise<EnhancedPlan | null> {
    try {
      const { data, error } = await supabase
        .from('premium_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.transformDatabasePlan(data);
    } catch (error) {
      console.error('EnhancedPlanService: Error getting plan:', error);
      return null;
    }
  }

  // Get all plans with filters
  async getPlans(filters?: any): Promise<EnhancedPlan[]> {
    try {
      let query = supabase
        .from('premium_plans')
        .select('*')
        .order('price', { ascending: true });

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.transformDatabasePlan);
    } catch (error) {
      console.error('EnhancedPlanService: Error getting plans:', error);
      return [];
    }
  }

  // Get plan sync status
  async getPlanSyncStatus(planId: string): Promise<PlanSyncStatus | null> {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) return null;

      // Get Stripe sync status
      const stripeSync = await stripeService.getSyncStatus(plan);

      // Get feature sync status
      const featureSync = await this.getFeatureSyncStatus(planId);

      // Persist a simple sync status hint back to Supabase for UI convenience
      try {
        await supabase
          .from('premium_plans')
          .update({
            sync_status: stripeSync.success && featureSync.success ? 'synced' : 'pending',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', planId);
      } catch {}

      return {
        planId,
        stripeSync,
        featureSync,
        lastSync: new Date(),
        isInSync: stripeSync.success && featureSync.success,
      };
    } catch (error) {
      console.error('EnhancedPlanService: Error getting sync status:', error);
      return null;
    }
  }

  // Validate plan data
  private validatePlanData(planData: CreatePlanData): PlanValidationResult {
    const errors: PlanValidationError[] = [];
    const warnings: PlanValidationWarning[] = [];

    // Required fields
    if (!planData.name?.trim()) {
      errors.push({
        field: 'name',
        message: 'Plan name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (planData.price === undefined || planData.price < 0) {
      errors.push({
        field: 'price',
        message: 'Valid price is required',
        code: 'INVALID_PRICE',
      });
    }

    // Business logic validation
    if (planData.trialDays && planData.trialDays > 90) {
      warnings.push({
        field: 'trialDays',
        message: 'Trial period longer than 90 days may impact revenue',
        code: 'LONG_TRIAL',
      });
    }

    if (planData.maxStorage && planData.maxStorage > 1000) {
      warnings.push({
        field: 'maxStorage',
        message: 'Storage limit over 1TB may impact costs',
        code: 'HIGH_STORAGE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate plan updates
  private validatePlanUpdates(currentPlan: EnhancedPlan, updates: UpdatePlanData): PlanValidationResult {
    const errors: PlanValidationError[] = [];
    const warnings: PlanValidationWarning[] = [];

    // Check for invalid state transitions
    if (updates.isActive === false && currentPlan.isActive) {
      // Check if plan has active subscribers
      // This would require additional database queries in a real implementation
      warnings.push({
        field: 'isActive',
        message: 'Deactivating plan may affect existing subscribers',
        code: 'ACTIVE_SUBSCRIBERS',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Apply feature configurations
  private async applyFeatureConfigurations(
    planId: string, 
    featureFlags: Record<string, boolean>, 
    featureLimits: Record<string, any>
  ): Promise<void> {
    try {
      console.log('EnhancedPlanService: Applying feature configurations for plan:', planId);

      // Import the feature integration service
      const { planFeatureIntegrationService } = await import('./PlanFeatureIntegrationService');
      
      // Apply feature configurations through the integration service
      await planFeatureIntegrationService.applyFeatureConfigurations(planId, featureFlags, featureLimits);
    } catch (error) {
      console.error('EnhancedPlanService: Error applying feature configurations:', error);
      throw error;
    }
  }

  // Remove feature configurations
  private async removeFeatureConfigurations(planId: string): Promise<void> {
    try {
      console.log('EnhancedPlanService: Removing feature configurations for plan:', planId);
      
      // Import the feature integration service
      const { planFeatureIntegrationService } = await import('./PlanFeatureIntegrationService');
      
      // Remove feature configurations through the integration service
      await planFeatureIntegrationService.removeFeatureConfigurations(planId);
    } catch (error) {
      console.error('EnhancedPlanService: Error removing feature configurations:', error);
      throw error;
    }
  }

  // Get feature sync status
  private async getFeatureSyncStatus(planId: string): Promise<FeatureSyncResult> {
    try {
      // TODO: Implement actual feature sync status checking
      return {
        success: true,
        featuresUpdated: 0,
        featuresAdded: 0,
        featuresRemoved: 0,
        syncTimestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        featuresUpdated: 0,
        featuresAdded: 0,
        featuresRemoved: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncTimestamp: new Date(),
      };
    }
  }

  // Create plan version for audit
  private async createPlanVersion(
    planId: string, 
    oldPlan: EnhancedPlan, 
    newPlan: EnhancedPlan, 
    changes: UpdatePlanData
  ): Promise<void> {
    try {
      const planChanges = this.detectPlanChanges(oldPlan, newPlan, changes);
      
      if (planChanges.length > 0) {
        await supabase
          .from('plan_versions')
          .insert({
            plan_id: planId,
            version_number: Date.now(), // Simple versioning for now
            changes: planChanges,
            created_by: oldPlan.createdBy,
            created_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('EnhancedPlanService: Error creating plan version:', error);
      // Don't fail the main operation
    }
  }

  // Detect changes between plan versions
  private detectPlanChanges(
    oldPlan: EnhancedPlan, 
    newPlan: EnhancedPlan, 
    changes: UpdatePlanData
  ): any[] {
    const detectedChanges: any[] = [];

    Object.keys(changes).forEach(key => {
      const oldValue = (oldPlan as any)[key];
      const newValue = (changes as any)[key];
      
      if (oldValue !== newValue) {
        detectedChanges.push({
          field: key,
          oldValue,
          newValue,
          changeType: 'modified',
          timestamp: new Date(),
        });
      }
    });

    return detectedChanges;
  }

  // Transform database plan to interface
  private transformDatabasePlan(data: any): EnhancedPlan {
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      // Ensure numeric price for reliable computations in UI
      price: data.price !== undefined && data.price !== null ? Number(data.price) : 0,
      currency: data.currency,
      interval: data.interval,
      stripeProductId: data.stripe_product_id,
      stripePriceId: data.stripe_price_id,
      featureFlags: data.feature_flags || {},
      featureLimits: data.limits || {},
      planType: data.plan_type || 'subscription',
      isActive: data.is_active,
      trialDays: data.trial_days || 0,
      maxUsers: data.max_users || 1,
      maxStorage: data.max_storage || 1,
      isPopular: data.is_popular || false,
      originalPrice: data.original_price !== undefined && data.original_price !== null
        ? Number(data.original_price)
        : undefined,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }
}

// Export singleton instance
export const enhancedPlanService = EnhancedPlanService.getInstance();
