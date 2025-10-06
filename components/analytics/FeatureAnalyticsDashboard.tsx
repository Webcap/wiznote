import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { LoadingSpinner } from '../LoadingSpinner';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useFeatureAnalyticsDashboard, useFeatureAnalytics } from '../../hooks/useFeatureAnalytics';
import { FeatureAnalytics, FeatureHealthScore, FeatureInsights } from '../../types/FeatureAnalytics';

interface FeatureAnalyticsDashboardProps {
  selectedFeatureId?: string;
  onFeatureSelect?: (featureId: string) => void;
}

export function FeatureAnalyticsDashboard({ 
  selectedFeatureId, 
  onFeatureSelect 
}: FeatureAnalyticsDashboardProps) {
  const { data: dashboardData, loading, error, refresh } = useFeatureAnalyticsDashboard();
  const { 
    analytics, 
    healthScore, 
    insights, 
    loadingAnalytics, 
    loadingHealthScore, 
    loadingInsights,
    refreshAnalytics,
    getHealthScore,
    getInsights
  } = useFeatureAnalytics({ featureId: selectedFeatureId });

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const dangerColor = useThemeColor({}, 'danger');

  const [activeTab, setActiveTab] = useState<'overview' | 'feature' | 'comparison'>('overview');

  // Load feature-specific data when a feature is selected
  useEffect(() => {
    if (selectedFeatureId) {
      refreshAnalytics();
      getHealthScore(selectedFeatureId);
      getInsights(selectedFeatureId);
    }
  }, [selectedFeatureId, refreshAnalytics, getHealthScore, getInsights]);

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Overall Health Score */}
      <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="pulse" size={24} color={accentPrimary} />
          <ThemedText style={[styles.cardTitle, { color: textColor }]}>
            Overall Health
          </ThemedText>
        </View>
        <View style={styles.healthScoreContainer}>
          <ThemedText style={[styles.healthScore, { color: successColor }]}>
            {dashboardData?.overallHealth || 0}%
          </ThemedText>
          <ThemedText style={[styles.healthScoreLabel, { color: textSecondaryColor }]}>
            System Health
          </ThemedText>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={24} color={accentPrimary} />
          <ThemedText style={[styles.cardTitle, { color: textColor }]}>
            Key Metrics
          </ThemedText>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <ThemedText style={[styles.metricValue, { color: accentPrimary }]}>
              {dashboardData?.activeFeatures || 0}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondaryColor }]}>
              Active Features
            </ThemedText>
          </View>
          <View style={styles.metricItem}>
            <ThemedText style={[styles.metricValue, { color: successColor }]}>
              ${dashboardData?.totalRevenue || 0}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondaryColor }]}>
              Total Revenue
            </ThemedText>
          </View>
          <View style={styles.metricItem}>
            <ThemedText style={[styles.metricValue, { color: warningColor }]}>
              {dashboardData?.alerts?.length || 0}
            </ThemedText>
            <ThemedText style={[styles.metricLabel, { color: textSecondaryColor }]}>
              Active Alerts
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Top Performing Features */}
      <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="trophy" size={24} color={accentPrimary} />
          <ThemedText style={[styles.cardTitle, { color: textColor }]}>
            Top Features
          </ThemedText>
        </View>
        {dashboardData?.topFeatures?.map((feature, index) => (
          <TouchableOpacity
            key={feature.featureId}
            style={[
              styles.featureItem,
              selectedFeatureId === feature.featureId && { backgroundColor: accentPrimary + '20' }
            ]}
            onPress={() => onFeatureSelect?.(feature.featureId)}
          >
            <View style={styles.featureInfo}>
              <ThemedText style={[styles.featureName, { color: textColor }]}>
                {feature.name}
              </ThemedText>
              <ThemedText style={[styles.featureScore, { color: textSecondaryColor }]}>
                Score: {feature.score}%
              </ThemedText>
            </View>
            <View style={styles.featureTrend}>
              <Ionicons 
                name={feature.trend === 'up' ? 'trending-up' : feature.trend === 'down' ? 'trending-down' : 'remove'} 
                size={20} 
                color={feature.trend === 'up' ? successColor : feature.trend === 'down' ? dangerColor : textSecondaryColor} 
              />
            </View>
          </TouchableOpacity>
        )) || (
          <ThemedText style={[styles.emptyState, { color: textSecondaryColor }]}>
            No feature data available
          </ThemedText>
        )}
      </View>

      {/* Active Alerts */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={24} color={warningColor} />
            <ThemedText style={[styles.cardTitle, { color: textColor }]}>
              Active Alerts
            </ThemedText>
          </View>
          {dashboardData.alerts.map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <Ionicons 
                name={alert.type === 'error' ? 'alert-circle' : 'warning'} 
                size={16} 
                color={alert.type === 'error' ? dangerColor : warningColor} 
              />
              <View style={styles.alertContent}>
                <ThemedText style={[styles.alertMessage, { color: textColor }]}>
                  {alert.message}
                </ThemedText>
                <ThemedText style={[styles.alertFeature, { color: textSecondaryColor }]}>
                  {alert.featureId}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderFeatureTab = () => {
    if (!selectedFeatureId) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={textSecondaryColor} />
          <ThemedText style={[styles.emptyStateTitle, { color: textColor }]}>
            Select a Feature
          </ThemedText>
          <ThemedText style={[styles.emptyStateSubtitle, { color: textSecondaryColor }]}>
            Choose a feature from the overview to view detailed analytics
          </ThemedText>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        {analytics && (
          <>
            {/* Feature Health Score */}
            {healthScore && (
              <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="heart" size={24} color={accentPrimary} />
                  <ThemedText style={[styles.cardTitle, { color: textColor }]}>
                    Health Score
                  </ThemedText>
                </View>
                <View style={styles.healthScoreContainer}>
                  <ThemedText style={[
                    styles.healthScore, 
                    { color: healthScore.overallScore > 80 ? successColor : healthScore.overallScore > 60 ? warningColor : dangerColor }
                  ]}>
                    {healthScore.overallScore}%
                  </ThemedText>
                  <View style={styles.healthMetrics}>
                    <View style={styles.healthMetric}>
                      <ThemedText style={[styles.healthMetricLabel, { color: textSecondaryColor }]}>
                        Activation
                      </ThemedText>
                      <ThemedText style={[styles.healthMetricValue, { color: textColor }]}>
                        {healthScore.metrics.activation}%
                      </ThemedText>
                    </View>
                    <View style={styles.healthMetric}>
                      <ThemedText style={[styles.healthMetricLabel, { color: textSecondaryColor }]}>
                        Retention
                      </ThemedText>
                      <ThemedText style={[styles.healthMetricValue, { color: textColor }]}>
                        {healthScore.metrics.retention}%
                      </ThemedText>
                    </View>
                    <View style={styles.healthMetric}>
                      <ThemedText style={[styles.healthMetricLabel, { color: textSecondaryColor }]}>
                        Conversion
                      </ThemedText>
                      <ThemedText style={[styles.healthMetricValue, { color: textColor }]}>
                        {healthScore.metrics.conversion}%
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Feature Analytics */}
            <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="bar-chart" size={24} color={accentPrimary} />
                <ThemedText style={[styles.cardTitle, { color: textColor }]}>
                  Analytics
                </ThemedText>
              </View>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <ThemedText style={[styles.analyticsValue, { color: accentPrimary }]}>
                    {analytics.activationRate.toFixed(1)}%
                  </ThemedText>
                  <ThemedText style={[styles.analyticsLabel, { color: textSecondaryColor }]}>
                    Activation Rate
                  </ThemedText>
                </View>
                <View style={styles.analyticsItem}>
                  <ThemedText style={[styles.analyticsValue, { color: successColor }]}>
                    {analytics.uniqueUsers}
                  </ThemedText>
                  <ThemedText style={[styles.analyticsLabel, { color: textSecondaryColor }]}>
                    Unique Users
                  </ThemedText>
                </View>
                <View style={styles.analyticsItem}>
                  <ThemedText style={[styles.analyticsValue, { color: warningColor }]}>
                    {analytics.conversionImpact.upgradeRate.toFixed(1)}%
                  </ThemedText>
                  <ThemedText style={[styles.analyticsLabel, { color: textSecondaryColor }]}>
                    Upgrade Rate
                  </ThemedText>
                </View>
                <View style={styles.analyticsItem}>
                  <ThemedText style={[styles.analyticsValue, { color: textColor }]}>
                    {analytics.totalActivations}
                  </ThemedText>
                  <ThemedText style={[styles.analyticsLabel, { color: textSecondaryColor }]}>
                    Total Activations
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Insights */}
            {insights && insights.insights.length > 0 && (
              <View style={[styles.card, { backgroundColor: backgroundSecondary, borderColor }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="bulb" size={24} color={accentPrimary} />
                  <ThemedText style={[styles.cardTitle, { color: textColor }]}>
                    AI Insights
                  </ThemedText>
                </View>
                {insights.insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Ionicons 
                      name={insight.type === 'opportunity' ? 'trending-up' : insight.type === 'risk' ? 'warning' : 'information-circle'} 
                      size={20} 
                      color={insight.type === 'opportunity' ? successColor : insight.type === 'risk' ? dangerColor : accentPrimary} 
                    />
                    <View style={styles.insightContent}>
                      <ThemedText style={[styles.insightTitle, { color: textColor }]}>
                        {insight.title}
                      </ThemedText>
                      <ThemedText style={[styles.insightDescription, { color: textSecondaryColor }]}>
                        {insight.description}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={50} />
        <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>
          Loading analytics...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color={dangerColor} />
        <ThemedText style={[styles.errorText, { color: textColor }]}>
          {error}
        </ThemedText>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accentPrimary }]} onPress={refresh}>
          <ThemedText style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
            Try Again
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Feature Analytics
        </ThemedText>
        <TouchableOpacity onPress={refresh}>
          <Ionicons name="refresh" size={24} color={accentPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabSelector, { backgroundColor: backgroundSecondary, borderColor }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'overview' && { backgroundColor: accentPrimary }
          ]}
          onPress={() => setActiveTab('overview')}
        >
          <ThemedText style={[
            styles.tabButtonText,
            { color: activeTab === 'overview' ? '#FFFFFF' : textSecondaryColor }
          ]}>
            Overview
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'feature' && { backgroundColor: accentPrimary }
          ]}
          onPress={() => setActiveTab('feature')}
        >
          <ThemedText style={[
            styles.tabButtonText,
            { color: activeTab === 'feature' ? '#FFFFFF' : textSecondaryColor }
          ]}>
            Feature Details
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'feature' && renderFeatureTab()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  healthScoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  healthScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  healthScoreLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureScore: {
    fontSize: 14,
    marginTop: 2,
  },
  featureTrend: {
    marginLeft: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertFeature: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  healthMetric: {
    alignItems: 'center',
  },
  healthMetricLabel: {
    fontSize: 12,
  },
  healthMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  analyticsLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
