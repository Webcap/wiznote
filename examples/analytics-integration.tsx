/**
 * FEATURE ANALYTICS INTEGRATION EXAMPLES
 * 
 * This file demonstrates how to integrate the Advanced Feature Analytics System
 * with your existing feature flag implementation.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { useFeatureAnalytics } from '../hooks/useFeatureAnalytics';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useUnifiedFeatureLimits } from '../hooks/useUnifiedFeatureLimits';
import { featureAnalyticsService } from '../services/FeatureAnalyticsService';

/**
 * Example 1: Feature Performance Card
 * Shows real-time analytics for a specific feature
 */
export function FeaturePerformanceCard({ featureId }: { featureId: string }) {
  const { analytics, loading, error, refreshAnalytics } = useFeatureAnalytics({
    featureId,
    period: 'monthly',
    autoRefresh: true,
    refreshInterval: 60000 // 1 minute
  });

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');

  if (loading) {
    return (
      <ThemedView style={styles.card}>
        <ThemedText>Loading analytics...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.card}>
        <ThemedText style={{ color: warningColor }}>Error: {error}</ThemedText>
        <TouchableOpacity onPress={refreshAnalytics}>
          <ThemedText>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor }]}>
      <View style={styles.cardHeader}>
        <ThemedText style={[styles.cardTitle, { color: textColor }]}>
          {analytics?.featureName || featureId}
        </ThemedText>
        <TouchableOpacity onPress={refreshAnalytics}>
          <Ionicons name="refresh" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metric}>
          <ThemedText style={[styles.metricValue, { color: successColor }]}>
            {analytics?.activationRate.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>Activation</ThemedText>
        </View>
        
        <View style={styles.metric}>
          <ThemedText style={[styles.metricValue, { color: textColor }]}>
            {analytics?.uniqueUsers}
          </ThemedText>
          <ThemedText style={styles.metricLabel}>Users</ThemedText>
        </View>
        
        <View style={styles.metric}>
          <ThemedText style={[styles.metricValue, { color: successColor }]}>
            {analytics?.conversionImpact.upgradeRate.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.metricLabel}>Upgrades</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

/**
 * Example 2: Feature Comparison Widget
 * Compares two features side-by-side
 */
export function FeatureComparisonWidget({ 
  featureA, 
  featureB 
}: { 
  featureA: string; 
  featureB: string; 
}) {
  const { comparison, loading, error, compareFeatures } = useFeatureAnalytics();

  useEffect(() => {
    compareFeatures(featureA, featureB);
  }, [featureA, featureB, compareFeatures]);

  const textColor = useThemeColor({}, 'text');
  const successColor = useThemeColor({}, 'success');
  const dangerColor = useThemeColor({}, 'danger');

  if (loading) return <ThemedText>Comparing features...</ThemedText>;
  if (error) return <ThemedText style={{ color: dangerColor }}>Error: {error}</ThemedText>;
  if (!comparison) return null;

  const getWinnerColor = (winner: string) => {
    return winner === 'feature_a' ? successColor : 
           winner === 'feature_b' ? successColor : textColor;
  };

  return (
    <ThemedView style={styles.comparisonCard}>
      <ThemedText style={[styles.comparisonTitle, { color: textColor }]}>
        Feature Comparison
      </ThemedText>
      
      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonItem}>
          <ThemedText style={styles.comparisonLabel}>Activation Rate</ThemedText>
          <ThemedText style={styles.comparisonValue}>
            A: {comparison.metrics.activationRate.a.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.comparisonValue}>
            B: {comparison.metrics.activationRate.b.toFixed(1)}%
          </ThemedText>
        </View>
        
        <View style={styles.comparisonItem}>
          <ThemedText style={styles.comparisonLabel}>Winner</ThemedText>
          <ThemedText style={[
            styles.winnerText, 
            { color: getWinnerColor(comparison.recommendation) }
          ]}>
            {comparison.recommendation === 'feature_a' ? 'Feature A' :
             comparison.recommendation === 'feature_b' ? 'Feature B' : 'Inconclusive'}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

/**
 * Example 3: Feature Health Monitor
 * Shows health score and alerts for a feature
 */
export function FeatureHealthMonitor({ featureId }: { featureId: string }) {
  const { healthScore, loading, error, refresh } = useFeatureAnalytics();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    refresh(featureId);
  }, [featureId, refresh]);

  const textColor = useThemeColor({}, 'text');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const dangerColor = useThemeColor({}, 'danger');

  if (loading) return <ThemedText>Loading health data...</ThemedText>;
  if (error) return <ThemedText style={{ color: dangerColor }}>Error: {error}</ThemedText>;
  if (!healthScore) return null;

  const getHealthColor = (score: number) => {
    if (score >= 80) return successColor;
    if (score >= 60) return warningColor;
    return dangerColor;
  };

  return (
    <ThemedView style={styles.healthCard}>
      <View style={styles.healthHeader}>
        <ThemedText style={[styles.healthTitle, { color: textColor }]}>
          Health Score
        </ThemedText>
        <ThemedText style={[
          styles.healthScore, 
          { color: getHealthColor(healthScore.overallScore) }
        ]}>
          {healthScore.overallScore}%
        </ThemedText>
      </View>

      <View style={styles.healthMetrics}>
        <View style={styles.healthMetric}>
          <ThemedText style={styles.healthMetricLabel}>Activation</ThemedText>
          <ThemedText style={[
            styles.healthMetricValue,
            { color: getHealthColor(healthScore.metrics.activation) }
          ]}>
            {healthScore.metrics.activation}%
          </ThemedText>
        </View>
        
        <View style={styles.healthMetric}>
          <ThemedText style={styles.healthMetricLabel}>Retention</ThemedText>
          <ThemedText style={[
            styles.healthMetricValue,
            { color: getHealthColor(healthScore.metrics.retention) }
          ]}>
            {healthScore.metrics.retention}%
          </ThemedText>
        </View>
      </View>

      {healthScore.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <ThemedText style={[styles.alertsTitle, { color: warningColor }]}>
            Alerts ({healthScore.alerts.length})
          </ThemedText>
          {healthScore.alerts.map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <Ionicons 
                name={alert.type === 'error' ? 'alert-circle' : 'warning'} 
                size={16} 
                color={alert.type === 'error' ? dangerColor : warningColor} 
              />
              <ThemedText style={[styles.alertMessage, { color: textColor }]}>
                {alert.message}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

/**
 * Example 4: Analytics Integration with Feature Flags
 * Shows how to use analytics with existing feature flag checks
 */
export function SmartFeatureButton({ 
  featureId, 
  onPress 
}: { 
  featureId: string; 
  onPress: () => void; 
}) {
  const { isFeatureEnabled } = useFeatureFlags();
  const { canUseFeature } = useUnifiedFeatureLimits();
  const { analytics, loadingAnalytics } = useFeatureAnalytics({ featureId });

  const isEnabled = isFeatureEnabled(featureId as any);
  const usageCheck = canUseFeature(featureId);
  const isLoading = loadingAnalytics;

  const handlePress = () => {
    // Track feature usage for analytics
    if (isEnabled && usageCheck.canUse) {
      onPress();
      
      // Record usage in analytics
      featureAnalyticsService.recordFeatureUsage(featureId);
    } else {
      Alert.alert(
        'Feature Unavailable',
        usageCheck.reason || 'This feature is not available'
      );
    }
  };

  const backgroundColor = useThemeColor({}, 'background');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const textColor = useThemeColor({}, 'text');

  return (
    <TouchableOpacity
      style={[
        styles.featureButton,
        { 
          backgroundColor: isEnabled && usageCheck.canUse ? accentPrimary : backgroundColor,
          opacity: isLoading ? 0.5 : 1
        }
      ]}
      onPress={handlePress}
      disabled={!isEnabled || !usageCheck.canUse || isLoading}
    >
      <ThemedText style={[
        styles.featureButtonText,
        { color: isEnabled && usageCheck.canUse ? '#FFFFFF' : textColor }
      ]}>
        {isLoading ? 'Loading...' : 
         !isEnabled ? 'Feature Disabled' :
         !usageCheck.canUse ? 'Limit Reached' :
         'Use Feature'}
      </ThemedText>
      
      {analytics && (
        <ThemedText style={styles.usageInfo}>
          {analytics.uniqueUsers} users, {analytics.activationRate.toFixed(1)}% adoption
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

/**
 * Example 5: Analytics Dashboard Integration
 * Shows how to integrate analytics into existing admin pages
 */
export function AnalyticsIntegrationExample() {
  const [selectedFeature, setSelectedFeature] = useState<string>('ai_transcription');
  const { flags } = useFeatureFlags();
  
  const availableFeatures = Object.keys(flags).filter(key => flags[key].enabled);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Feature Analytics Integration</ThemedText>
      
      {/* Feature Selection */}
      <View style={styles.featureSelector}>
        {availableFeatures.map(featureId => (
          <TouchableOpacity
            key={featureId}
            style={[
              styles.featureChip,
              selectedFeature === featureId && styles.selectedChip
            ]}
            onPress={() => setSelectedFeature(featureId)}
          >
            <ThemedText>{featureId}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Analytics Components */}
      <FeaturePerformanceCard featureId={selectedFeature} />
      <FeatureHealthMonitor featureId={selectedFeature} />
      <SmartFeatureButton 
        featureId={selectedFeature} 
        onPress={() => console.log('Feature used!')} 
      />
      
      {/* Feature Comparison */}
      {availableFeatures.length >= 2 && (
        <FeatureComparisonWidget 
          featureA={availableFeatures[0]} 
          featureB={availableFeatures[1]} 
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  comparisonCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 14,
    marginBottom: 2,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  healthScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthMetric: {
    alignItems: 'center',
  },
  healthMetricLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  healthMetricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  alertMessage: {
    fontSize: 12,
    flex: 1,
  },
  featureButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  usageInfo: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  featureSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedChip: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
});

export default AnalyticsIntegrationExample;
