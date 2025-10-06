import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { FeatureAnalyticsDashboard } from '../../components/analytics/FeatureAnalyticsDashboard';
import { useFeatureAnalytics } from '../../hooks/useFeatureAnalytics';
import { featureFlagService } from '../../services/FeatureFlagService';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';

export default function AnalyticsScreen() {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');

  // Get available features for selection
  const availableFeatures = Object.entries(featureFlagService.getAllFlags())
    .filter(([_, flag]) => flag.enabled)
    .map(([key, flag]) => ({ id: key, name: flag.name }));

  const handleFeatureSelect = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const handleExportAnalytics = async () => {
    Alert.alert(
      'Export Analytics',
      'This would export detailed analytics data to CSV/JSON format. Feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleGenerateReport = async () => {
    Alert.alert(
      'Generate Report',
      'This would generate a comprehensive analytics report. Feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Feature Analytics"
        subtitle="Advanced analytics and insights for feature flags"
        sidebar={<AdminSidebar activePage="analytics" />}
        header={
          <View style={styles.webHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="analytics" size={28} color={accentPrimary} />
              <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                Feature Analytics
              </ThemedText>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: backgroundSecondary, borderColor }]}
                onPress={handleExportAnalytics}
              >
                <Ionicons name="download" size={20} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: backgroundSecondary, borderColor }]}
                onPress={handleGenerateReport}
              >
                <Ionicons name="document-text" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {/* Feature Selection */}
          <View style={[styles.featureSelector, { backgroundColor: backgroundSecondary, borderColor }]}>
            <ThemedText style={[styles.selectorTitle, { color: textColor }]}>
              Available Features:
            </ThemedText>
            <View style={styles.featureList}>
              {availableFeatures.map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={[
                    styles.featureChip,
                    selectedFeatureId === feature.id && { backgroundColor: accentPrimary }
                  ]}
                  onPress={() => handleFeatureSelect(feature.id)}
                >
                  <ThemedText style={[
                    styles.featureChipText,
                    { color: selectedFeatureId === feature.id ? '#FFFFFF' : textColor }
                  ]}>
                    {feature.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Analytics Dashboard */}
          <View style={styles.dashboardContainer}>
            <FeatureAnalyticsDashboard
              selectedFeatureId={selectedFeatureId}
              onFeatureSelect={handleFeatureSelect}
            />
          </View>

          {/* Quick Stats */}
          <View style={[styles.quickStats, { backgroundColor: backgroundSecondary, borderColor }]}>
            <View style={styles.statItem}>
              <Ionicons name="flag" size={24} color={accentPrimary} />
              <ThemedText style={[styles.statValue, { color: textColor }]}>
                {availableFeatures.length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
                Active Features
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={24} color={accentPrimary} />
              <ThemedText style={[styles.statValue, { color: textColor }]}>
                {selectedFeatureId ? '1' : '0'}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
                Selected
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="analytics" size={24} color={accentPrimary} />
              <ThemedText style={[styles.statValue, { color: textColor }]}>
                Real-time
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
                Updates
              </ThemedText>
            </View>
          </View>
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={28} color={accentPrimary} />
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Feature Analytics
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: backgroundSecondary, borderColor }]}
            onPress={handleExportAnalytics}
          >
            <Ionicons name="download" size={20} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: backgroundSecondary, borderColor }]}
            onPress={handleGenerateReport}
          >
            <Ionicons name="document-text" size={20} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feature Selection */}
      <View style={[styles.featureSelector, { backgroundColor: backgroundSecondary, borderColor }]}>
        <ThemedText style={[styles.selectorTitle, { color: textColor }]}>
          Available Features:
        </ThemedText>
        <View style={styles.featureList}>
          {availableFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureChip,
                selectedFeatureId === feature.id && { backgroundColor: accentPrimary }
              ]}
              onPress={() => handleFeatureSelect(feature.id)}
            >
              <ThemedText style={[
                styles.featureChipText,
                { color: selectedFeatureId === feature.id ? '#FFFFFF' : textColor }
              ]}>
                {feature.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Analytics Dashboard */}
      <View style={styles.dashboardContainer}>
        <FeatureAnalyticsDashboard
          selectedFeatureId={selectedFeatureId}
          onFeatureSelect={handleFeatureSelect}
        />
      </View>

      {/* Quick Stats */}
      <View style={[styles.quickStats, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.statItem}>
          <Ionicons name="flag" size={24} color={accentPrimary} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            {availableFeatures.length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
            Active Features
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="eye" size={24} color={accentPrimary} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            {selectedFeatureId ? '1' : '0'}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
            Selected
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="analytics" size={24} color={accentPrimary} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            Real-time
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondaryColor }]}>
            Updates
          </ThemedText>
        </View>
      </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featureSelector: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
  },
  featureChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dashboardContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
