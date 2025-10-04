import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UnifiedUsageDisplay } from '../components/UnifiedUsageDisplay';
import { useThemeColor } from '../hooks/useThemeColor';
import { useUnifiedFeatureLimits } from '../hooks/useUnifiedFeatureLimits';

// Import web components
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

export default function SimpleUsageScreen() {
  const { trackedFeatures, loading, refreshLimits } = useUnifiedFeatureLimits();
  const router = useRouter();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');

  const onRefresh = React.useCallback(async () => {
    // Use the new refresh function to reload limits and usage data
    await refreshLimits();
  }, [refreshLimits]);

  const handleBack = () => {
    router.back();
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Simple Usage"
        subtitle="Quick overview of your feature usage"
        sidebar={
          <UserSidebar
            activePage="settings"
          />
        }
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <TouchableOpacity onPress={handleBack} style={styles.webBackButton}>
                <Ionicons name="arrow-back" size={20} color={textColor} />
                <ThemedText style={styles.webBackText}>Back</ThemedText>
              </TouchableOpacity>
              <View style={styles.webHeaderInfo}>
                <ThemedText type="title">Simple Usage</ThemedText>
                <ThemedText style={[styles.webHeaderSubtitle, { color: mutedTextColor }]}>
                  Quick overview of your feature usage and limits
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.webRefreshButton}>
              <Ionicons name="refresh" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        }
      >
        <ScrollView 
          style={styles.webContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.webLoadingContainer}>
              <LoadingSpinner size={48} />
              <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>
                Loading usage data...
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Usage Summary */}
              <View style={styles.webUsageSummary}>
                <View style={styles.webSummaryCard}>
                  <Ionicons name="analytics" size={24} color={accentColor} />
                  <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                    {trackedFeatures.length}
                  </ThemedText>
                  <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                    Features Tracked
                  </ThemedText>
                </View>
                <View style={styles.webSummaryCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#3CB371" />
                  <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                    {trackedFeatures.filter(f => f.canUse).length}
                  </ThemedText>
                  <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                    Available
                  </ThemedText>
                </View>
                <View style={styles.webSummaryCard}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                    {trackedFeatures.filter(f => f.isUnlimited).length}
                  </ThemedText>
                  <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                    Unlimited
                  </ThemedText>
                </View>
              </View>

              {/* Usage Grid */}
              <View style={styles.webUsageGrid}>
                <UnifiedUsageDisplay 
                  features={trackedFeatures}
                  onFeaturePress={(feature) => console.log('Feature pressed:', feature)}
                  onUpgradePress={() => router.push('join-premium')}
                />
              </View>

              {trackedFeatures.length === 0 && (
                <View style={styles.webEmptyContainer}>
                  <View style={styles.webEmptyIcon}>
                    <Ionicons name="analytics-outline" size={64} color={mutedTextColor} />
                  </View>
                  <ThemedText style={[styles.webEmptyTitle, { color: textColor }]}>
                    No Tracking Features
                  </ThemedText>
                  <ThemedText style={[styles.webEmptyText, { color: mutedTextColor }]}>
                    No features are currently configured for usage tracking
                  </ThemedText>
                </View>
              )}

              {/* Upgrade Section */}
              <View style={[styles.webUpgradeSection, { backgroundColor: cardBackground }]}>
                <View style={styles.webUpgradeContent}>
                  <View style={styles.webUpgradeIcon}>
                    <Ionicons name="star" size={32} color={accentColor} />
                  </View>
                  <View style={styles.webUpgradeText}>
                    <ThemedText style={[styles.webUpgradeTitle, { color: textColor }]}>
                      Upgrade to Premium
                    </ThemedText>
                    <ThemedText style={[styles.webUpgradeDescription, { color: mutedTextColor }]}>
                      Get unlimited access to all features and remove usage limits. Enjoy premium features without restrictions.
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    style={[styles.webUpgradeButton, { backgroundColor: accentColor }]}
                    onPress={() => router.push('join-premium')}
                  >
                    <ThemedText style={styles.webUpgradeButtonText}>Upgrade Now</ThemedText>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </WebLayout>
    );
  }

  // Mobile layout (existing code)
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingSpinner size={40} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading usage data...</Text>
      </ThemedView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Feature Usage</Text>
        <Text style={[styles.subtitle, { color: mutedTextColor }]}>
          Track your monthly feature usage
        </Text>
      </View>

      <View style={styles.content}>
        <UnifiedUsageDisplay 
          features={trackedFeatures}
          onFeaturePress={(feature) => console.log('Feature pressed:', feature)}
          onUpgradePress={() => router.push('join-premium')}
        />
      </View>

      {trackedFeatures.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: mutedTextColor }]}>
            No tracking features available
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  webBackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderInfo: {
    flex: 1,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  webRefreshButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webLoadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  webErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webErrorIcon: {
    marginBottom: 16,
  },
  webErrorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webErrorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  webRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webUsageSummary: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  webSummaryCard: {
    flex: 1,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.2)',
  },
  webSummaryTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  webSummaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  webUsageGrid: {
    marginBottom: 32,
  },
  webEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webEmptyIcon: {
    marginBottom: 16,
  },
  webEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webEmptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  webUpgradeSection: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webUpgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  webUpgradeIcon: {
    flexShrink: 0,
  },
  webUpgradeText: {
    flex: 1,
  },
  webUpgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webUpgradeDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  webUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexShrink: 0,
  },
  webUpgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
