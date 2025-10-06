import { useCallback, useEffect, useState } from 'react';
import { featureAnalyticsService } from '../services/FeatureAnalyticsService';
import { 
  FeatureAnalytics, 
  FeatureComparison, 
  FeatureHealthScore, 
  FeatureInsights,
  AnalyticsQuery,
  AnalyticsResponse 
} from '../types/FeatureAnalytics';

/**
 * FEATURE ANALYTICS HOOK
 * 
 * Provides easy access to feature analytics data in React components.
 * Includes caching, error handling, and real-time updates.
 */

export interface UseFeatureAnalyticsOptions {
  featureId?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseFeatureAnalyticsReturn {
  // Data
  analytics: FeatureAnalytics | null;
  comparison: FeatureComparison | null;
  healthScore: FeatureHealthScore | null;
  insights: FeatureInsights | null;
  
  // Loading states
  loading: boolean;
  loadingAnalytics: boolean;
  loadingComparison: boolean;
  loadingHealthScore: boolean;
  loadingInsights: boolean;
  
  // Error states
  error: string | null;
  analyticsError: string | null;
  comparisonError: string | null;
  healthScoreError: string | null;
  insightsError: string | null;
  
  // Actions
  refreshAnalytics: () => Promise<void>;
  compareFeatures: (featureA: string, featureB: string) => Promise<void>;
  getHealthScore: (featureId: string) => Promise<void>;
  getInsights: (featureId: string) => Promise<void>;
  executeQuery: (query: AnalyticsQuery) => Promise<AnalyticsResponse | null>;
  
  // Dashboard data
  dashboardData: {
    topFeatures: Array<{ featureId: string; name: string; score: number; trend: string }>;
    alerts: Array<{ featureId: string; type: string; message: string; severity: string }>;
    overallHealth: number;
    totalRevenue: number;
    activeFeatures: number;
  } | null;
  dashboardLoading: boolean;
  dashboardError: string | null;
  refreshDashboard: () => Promise<void>;
}

export function useFeatureAnalytics(options: UseFeatureAnalyticsOptions = {}): UseFeatureAnalyticsReturn {
  const {
    featureId,
    period = 'monthly',
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  // State management
  const [analytics, setAnalytics] = useState<FeatureAnalytics | null>(null);
  const [comparison, setComparison] = useState<FeatureComparison | null>(null);
  const [healthScore, setHealthScore] = useState<FeatureHealthScore | null>(null);
  const [insights, setInsights] = useState<FeatureInsights | null>(null);
  const [dashboardData, setDashboardData] = useState<UseFeatureAnalyticsReturn['dashboardData']>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingHealthScore, setLoadingHealthScore] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [healthScoreError, setHealthScoreError] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !featureId) return;

    const interval = setInterval(() => {
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, featureId, refreshInterval]);

  // Initial load effect
  useEffect(() => {
    if (featureId) {
      refreshAnalytics();
    }
  }, [featureId, period]);

  // Actions
  const refreshAnalytics = useCallback(async () => {
    if (!featureId) return;

    setLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      const data = await featureAnalyticsService.getFeatureAnalytics(featureId, period);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setAnalyticsError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [featureId, period]);

  const compareFeatures = useCallback(async (featureA: string, featureB: string) => {
    setLoadingComparison(true);
    setComparisonError(null);

    try {
      const data = await featureAnalyticsService.compareFeatures(featureA, featureB, period);
      setComparison(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare features';
      setComparisonError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingComparison(false);
    }
  }, [period]);

  const getHealthScore = useCallback(async (targetFeatureId: string) => {
    setLoadingHealthScore(true);
    setHealthScoreError(null);

    try {
      const data = await featureAnalyticsService.getFeatureHealthScore(targetFeatureId);
      setHealthScore(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get health score';
      setHealthScoreError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingHealthScore(false);
    }
  }, []);

  const getInsights = useCallback(async (targetFeatureId: string) => {
    setLoadingInsights(true);
    setInsightsError(null);

    try {
      const data = await featureAnalyticsService.getFeatureInsights(targetFeatureId);
      setInsights(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get insights';
      setInsightsError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const executeQuery = useCallback(async (query: AnalyticsQuery): Promise<AnalyticsResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await featureAnalyticsService.executeQuery(query);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute query';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const data = await featureAnalyticsService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setDashboardError(errorMessage);
      setError(errorMessage);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Computed loading state
  const isLoading = loadingAnalytics || loadingComparison || loadingHealthScore || loadingInsights || dashboardLoading;

  return {
    // Data
    analytics,
    comparison,
    healthScore,
    insights,
    
    // Loading states
    loading: isLoading,
    loadingAnalytics,
    loadingComparison,
    loadingHealthScore,
    loadingInsights,
    dashboardLoading,
    
    // Error states
    error,
    analyticsError,
    comparisonError,
    healthScoreError,
    insightsError,
    dashboardError,
    
    // Actions
    refreshAnalytics,
    compareFeatures,
    getHealthScore,
    getInsights,
    executeQuery,
    
    // Dashboard data
    dashboardData,
    refreshDashboard
  };
}

/**
 * Specialized hook for dashboard analytics
 */
export function useFeatureAnalyticsDashboard() {
  const {
    dashboardData,
    dashboardLoading,
    dashboardError,
    refreshDashboard
  } = useFeatureAnalytics({ autoRefresh: true, refreshInterval: 60000 }); // 1 minute refresh

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard
  };
}

/**
 * Specialized hook for feature comparison
 */
export function useFeatureComparison(featureA?: string, featureB?: string) {
  const {
    comparison,
    loadingComparison,
    comparisonError,
    compareFeatures
  } = useFeatureAnalytics();

  useEffect(() => {
    if (featureA && featureB) {
      compareFeatures(featureA, featureB);
    }
  }, [featureA, featureB, compareFeatures]);

  return {
    comparison,
    loading: loadingComparison,
    error: comparisonError,
    compare: compareFeatures
  };
}

/**
 * Specialized hook for feature health monitoring
 */
export function useFeatureHealth(featureId?: string) {
  const {
    healthScore,
    loadingHealthScore,
    healthScoreError,
    getHealthScore
  } = useFeatureAnalytics();

  useEffect(() => {
    if (featureId) {
      getHealthScore(featureId);
    }
  }, [featureId, getHealthScore]);

  return {
    healthScore,
    loading: loadingHealthScore,
    error: healthScoreError,
    refresh: getHealthScore
  };
}
