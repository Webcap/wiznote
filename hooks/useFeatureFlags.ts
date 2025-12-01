import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { featureCacheService } from '../services/FeatureCacheService';
import { featureFlagService } from '../services/FeatureFlagService';
import { realTimeFeatureService } from '../services/RealTimeFeatureService';
import { FeatureFlag, FeatureFlagKey } from '../types/FeatureFlags';
import { useAuth } from './useAuth';

// Optional environment variable to control feature flag warnings
const enableFeatureFlagWarnings = process.env.EXPO_PUBLIC_FEATURE_FLAG_WARNINGS === 'true';

export const useFeatureFlags = () => {
  const { user, isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialized = useRef(false);
  const realTimeSubscription = useRef<(() => void) | null>(null);

  // Initialize feature flags
  const initialize = useCallback(async () => {
    if (isInitialized.current) return;

    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      const cachedFlags = await featureCacheService.get<Record<string, FeatureFlag>>('feature_flags');
      if (cachedFlags) {
        setFlags(cachedFlags);
        setLastUpdated(new Date());
        console.log('useFeatureFlags: Loaded flags from cache');
      }

      // Initialize service and load from Supabase (only if authenticated)
      await featureFlagService.initialize(isAuthenticated);
      const allFlags = featureFlagService.getAllFlags();
      
      // Cache the flags
      await featureCacheService.set('feature_flags', allFlags, 5 * 60 * 1000); // 5 minutes
      
      setFlags(allFlags);
      setLastUpdated(new Date());
      isInitialized.current = true;

      console.log('useFeatureFlags: Initialized with flags:', Object.keys(allFlags));

      // Set up real-time subscription
      await setupRealTimeSubscription();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize feature flags';
      setError(errorMessage);
      console.error('useFeatureFlags: Initialization error:', err);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Set up real-time subscription
  const setupRealTimeSubscription = useCallback(async () => {
    try {
      await realTimeFeatureService.subscribeToFeatureChanges(() => {
        console.log('useFeatureFlags: Real-time update received');
        refreshFlags();
      });

      realTimeSubscription.current = () => {
        console.log('useFeatureFlags: Real-time subscription active');
      };
    } catch (error) {
      console.warn('useFeatureFlags: Failed to set up real-time subscription:', error);
    }
  }, []);

  // Refresh flags from service
  const refreshFlags = useCallback(async () => {
    try {
      const allFlags = featureFlagService.getAllFlags();
      await featureCacheService.set('feature_flags', allFlags, 5 * 60 * 1000);
      setFlags(allFlags);
      setLastUpdated(new Date());
      console.log('useFeatureFlags: Flags refreshed');
    } catch (error) {
      console.error('useFeatureFlags: Error refreshing flags:', error);
    }
  }, []);

  // Force reload from Supabase
  const forceReload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await featureFlagService.forceReloadFromSupabase();
      await refreshFlags();

      if (Platform.OS === 'web') {
        showSnackbar('Feature flags reloaded successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload feature flags';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshFlags, showSnackbar]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback((flagKey: FeatureFlagKey): boolean => {
    if (!isInitialized.current) {
      // Only show warning if explicitly enabled via environment variable
      if (enableFeatureFlagWarnings) {
        console.warn('useFeatureFlags: Service not initialized, checking default behavior');
      }
      // For critical features, check defaults during initialization
      const criticalFlags = ['voice_recording', 'pdf_upload', 'ai_quiz', 'ai_flashcards'];
      if (criticalFlags.includes(flagKey)) {
        const { DEFAULT_FEATURE_FLAGS } = require('../constants/DefaultFeatureFlags');
        return DEFAULT_FEATURE_FLAGS[flagKey]?.enabled || false;
      }
      return false;
    }

    return featureFlagService.isFeatureEnabled(flagKey, user || undefined);
  }, [user, flags]);

  // Get all enabled features
  const getEnabledFeatures = useCallback((): FeatureFlagKey[] => {
    if (!isInitialized.current) return [];
    return featureFlagService.getEnabledFeatures(user || undefined);
  }, [user]);

  // Check if feature is available
  const isFeatureAvailable = useCallback((flagKey: FeatureFlagKey): boolean => {
    if (!isInitialized.current) return false;
    return featureFlagService.isFeatureAvailable(flagKey, user || undefined);
  }, [user]);

  // Update a feature flag
  const updateFlag = useCallback(async (flagKey: FeatureFlagKey, updates: Partial<FeatureFlag>) => {
    try {
      setError(null);
      await featureFlagService.updateFlag(flagKey, updates);
      await refreshFlags();

      if (Platform.OS === 'web') {
        showSnackbar('Feature flag updated successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feature flag';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshFlags, showSnackbar]);

  // Update multiple feature flags
  const updateFeatureFlags = useCallback(async (featureFlags: Partial<Record<FeatureFlagKey, FeatureFlag>>) => {
    try {
      setError(null);
      await featureFlagService.updateFeatureFlags(featureFlags);
      await refreshFlags();

      if (Platform.OS === 'web') {
        showSnackbar('Feature flags updated successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feature flags';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshFlags, showSnackbar]);


  // Reset feature to defaults
  const resetFeatureToDefaults = useCallback(async (flagKey: FeatureFlagKey) => {
    try {
      setError(null);
      await featureFlagService.resetFeatureToDefaults(flagKey);
      await refreshFlags();

      if (Platform.OS === 'web') {
        showSnackbar('Feature reset to defaults', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset feature';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshFlags, showSnackbar]);

  // Reset all features to defaults
  const resetAllFeaturesToDefaults = useCallback(async () => {
    try {
      setError(null);
      await featureFlagService.resetAllFeaturesToDefaults();
      await refreshFlags();

      if (Platform.OS === 'web') {
        showSnackbar('All features reset to defaults', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset all features';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      throw err;
    }
  }, [refreshFlags, showSnackbar]);

  // Get flags summary
  const getFlagsSummary = useCallback(() => {
    return featureFlagService.getFlagsSummary();
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await featureCacheService.invalidate('feature_flags');
      await featureFlagService.clearLocalCache();
      
      if (Platform.OS === 'web') {
        showSnackbar('Cache cleared successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
    }
  }, [showSnackbar]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      if (realTimeSubscription.current) {
        realTimeFeatureService.unsubscribeFromChannel('feature-changes');
      }
    };
  }, [initialize]);

  // Re-initialize when user changes
  useEffect(() => {
    if (isInitialized.current) {
      refreshFlags();
    }
  }, [user?.id, refreshFlags]);

  return {
    // State
    flags,
    loading,
    error,
    lastUpdated,
    isInitialized: isInitialized.current,

    // Core functions
    isFeatureEnabled,
    getEnabledFeatures,
    isFeatureAvailable,

    // Tracking functions
    getTrackingEnabledFeatures: () => featureFlagService.getTrackingEnabledFeatures(),
    getEnabledTrackingFeatures: () => featureFlagService.getEnabledTrackingFeatures(user || undefined),

    // Management functions
    updateFlag,
    updateFeatureFlags,
    resetFeatureToDefaults,
    resetAllFeaturesToDefaults,
    getFlagsSummary,

    // Utility functions
    refreshFlags,
    forceReload,
    clearCache,
    initialize,
  };
}; 