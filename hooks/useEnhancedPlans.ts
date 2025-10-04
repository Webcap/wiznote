// Enhanced Plans Management Hook
// Phase 2: Core Services - React Integration

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { enhancedPlanService } from '../services/EnhancedPlanService';
import {
    CreatePlanData,
    EnhancedPlan,
    PlanSyncStatus,
    UpdatePlanData
} from '../types/EnhancedPlans';

export const useEnhancedPlans = () => {
  const [plans, setPlans] = useState<EnhancedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSnackbar } = useSnackbar();

  // Load all plans
  const loadPlans = useCallback(async (filters?: any) => {
    console.log('useEnhancedPlans: Loading plans...');
    setLoading(true);
    setError(null);
    
    try {
      const plansData = await enhancedPlanService.getPlans(filters);
      console.log('useEnhancedPlans: Loaded plans:', plansData.length, 'plans');
      setPlans(plansData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plans';
      console.error('useEnhancedPlans: Error loading plans:', err);
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Load data on mount
  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Create new plan
  const createPlan = useCallback(async (planData: CreatePlanData, createdBy: string) => {
    try {
      setError(null);
      const newPlan = await enhancedPlanService.createPlan(planData, createdBy);
      
      // Add to local state
      setPlans(prev => [...prev, newPlan]);
      
      if (Platform.OS === 'web') {
        showSnackbar('Plan created successfully', 'success', 3000);
      }
      
      return newPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create plan';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [showSnackbar]);

  // Update existing plan
  const updatePlan = useCallback(async (planId: string, updates: UpdatePlanData) => {
    try {
      setError(null);
      const updatedPlan = await enhancedPlanService.updatePlan(planId, updates);
      
      // Update local state
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? updatedPlan : plan
      ));
      
      if (Platform.OS === 'web') {
        showSnackbar('Plan updated successfully', 'success', 3000);
      }
      
      return updatedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update plan';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [showSnackbar]);

  // Delete plan
  const deletePlan = useCallback(async (planId: string) => {
    try {
      setError(null);
      await enhancedPlanService.deletePlan(planId);
      
      // Remove from local state
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      
      if (Platform.OS === 'web') {
        showSnackbar('Plan deleted successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete plan';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [showSnackbar]);

  // Get plan by ID
  const getPlan = useCallback(async (planId: string) => {
    try {
      return await enhancedPlanService.getPlan(planId);
    } catch (err) {
      console.error('useEnhancedPlans: Error getting plan:', err);
      return null;
    }
  }, []);

  // Get plan sync status
  const getPlanSyncStatus = useCallback(async (planId: string): Promise<PlanSyncStatus | null> => {
    try {
      return await enhancedPlanService.getPlanSyncStatus(planId);
    } catch (err) {
      console.error('useEnhancedPlans: Error getting sync status:', err);
      return null;
    }
  }, []);

  // Get active plans only
  const getActivePlans = useCallback(() => {
    return plans.filter(plan => plan.isActive);
  }, [plans]);

  // Get popular plans
  const getPopularPlans = useCallback(() => {
    return plans.filter(plan => plan.isPopular);
  }, [plans]);

  // Get plans by type
  const getPlansByType = useCallback((planType: string) => {
    return plans.filter(plan => plan.planType === planType);
  }, [plans]);

  // Get plans by price range
  const getPlansByPriceRange = useCallback((minPrice: number, maxPrice: number) => {
    return plans.filter(plan => plan.price >= minPrice && plan.price <= maxPrice);
  }, [plans]);

  // Refresh plans
  const refreshPlans = useCallback(() => {
    loadPlans();
  }, [loadPlans]);

  return {
    // State
    plans,
    loading,
    error,
    
    // Actions
    createPlan,
    updatePlan,
    deletePlan,
    getPlan,
    getPlanSyncStatus,
    loadPlans,
    refreshPlans,
    
    // Computed
    getActivePlans,
    getPopularPlans,
    getPlansByType,
    getPlansByPriceRange,
  };
};
