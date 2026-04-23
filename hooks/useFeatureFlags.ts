import { useState, useEffect, useCallback } from 'react';
import { featureFlagService } from '../services/FeatureFlagService';
import { FeatureFlag, FeatureFlagKey } from '../types/FeatureFlags';
import { User } from '../types/User';

/**
 * Hook to use feature flags in components.
 * It will re-render when flags are updated in the FeatureFlagService.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>(featureFlagService.getAllFlags());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagsVersion, setFlagsVersion] = useState(0);

  useEffect(() => {
    const listener = () => {
      setFlags(featureFlagService.getAllFlags());
      setFlagsVersion(v => v + 1);
    };

    featureFlagService.addListener(listener);
    return () => featureFlagService.removeListener(listener);
  }, []);

  const isFeatureEnabled = useCallback((flagKey: FeatureFlagKey, user?: User) => {
    // We use flagsVersion as a dependency to ensure the function is "fresh" 
    // although featureFlagService.isFeatureEnabled is actually using the latest internal state
    return featureFlagService.isFeatureEnabled(flagKey, user);
  }, [flagsVersion]);

  return { 
    flags,
    isFeatureEnabled, 
    flagsVersion,
    loading,
    error
  };
}