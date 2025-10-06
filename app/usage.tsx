import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProgressiveLoader, StaggeredLoader, ProgressiveCard } from '../components/ProgressiveLoader';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { useUnifiedFeatureLimits } from '../hooks/useUnifiedFeatureLimits';
import { usageEventEmitter, usageTrackingService } from '../services/UsageTrackingService';

// Import web components
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

interface FeatureUsage {
  featureId: string;
  featureName: string;
  currentUsage: number;
  limit: number; // -1 means unlimited
  remaining: number; // -1 means unlimited
  period: 'daily' | 'weekly' | 'monthly';
  icon: string;
  color: string;
}

const FEATURES: Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  period: 'daily' | 'weekly' | 'monthly';
}> = [
  {
    id: 'voice_recording',
    name: 'Voice Recording',
    icon: 'mic',
    color: '#6A5ACD',
    period: 'monthly'
  },
  {
    id: 'ai_transcription',
    name: 'AI Transcription',
    icon: 'text',
    color: '#3CB371',
    period: 'monthly'
  },
  {
    id: 'ai_name_generating',
    name: 'AI Name Generation',
    icon: 'sparkles',
    color: '#FF8C00',
    period: 'monthly'
  },
  {
    id: 'ai_summaries',
    name: 'AI Summaries',
    icon: 'document-text',
    color: '#9932CC',
    period: 'monthly'
  },
  {
    id: 'ai_key_details',
    name: 'AI Key Details',
    icon: 'key',
    color: '#DC143C',
    period: 'monthly'
  }
];

export default function UsageScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { trackedFeatures, loading: trackingLoading, refreshLimits } = useUnifiedFeatureLimits();
  const [usageData, setUsageData] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [refreshing, setRefreshing] = useState(false);
  const [showProgressiveContent, setShowProgressiveContent] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');

  // Hide the navigation header
  useEffect(() => {
    if (Platform.OS !== 'web') {
      navigation.setOptions({ headerShown: false });
    }
  }, [navigation]);

  // Show progressive content after loading completes
  useEffect(() => {
    if (!loading && !trackingLoading && usageData.length > 0) {
      // Add a small delay to show progressive loading
      const timer = setTimeout(() => {
        setShowProgressiveContent(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowProgressiveContent(false);
    }
  }, [loading, trackingLoading, usageData.length]);

  useEffect(() => {
    loadUsageData();
  }, [user?.id, selectedPeriod, trackedFeatures, trackingLoading]);

  // Refresh usage data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('UsageScreen: Screen focused, refreshing usage data...');
      loadUsageData();
    });

    return unsubscribe;
  }, [navigation, user?.id, selectedPeriod, trackedFeatures, trackingLoading]);

  // Listen for usage events to refresh data
  useEffect(() => {
    const unsubscribe = usageEventEmitter.subscribe(() => {
      console.log('UsageScreen: Usage event received, refreshing usage data...');
      loadUsageData();
    });

    return unsubscribe;
  }, [user?.id, selectedPeriod, trackedFeatures, trackingLoading]);

  const loadUsageData = async () => {
    if (!user?.id || trackingLoading) {
      console.log('🔍 UsageScreen: No authenticated user or tracking features loading, setting empty usage data');
      setUsageData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Add a small delay to show skeleton loading for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      const isPremium = user?.premium?.isActive || false;
      
      console.log('🔍 UsageScreen: Loading usage data for user:', user.id, 'Premium:', isPremium);
      console.log('🔍 UsageScreen: Tracking features:', trackedFeatures);
      
      // Create feature configs for tracking-enabled features
      const trackingFeatureConfigs = trackedFeatures.map(feature => {
        const featureConfig = FEATURES.find(f => f.id === feature.featureId);
        if (featureConfig) {
          return featureConfig;
        }
        // Fallback for features not in FEATURES array
        return {
          id: feature.featureId,
          name: feature.featureName,
          icon: 'help-circle',
          color: '#9BA1A6',
          period: 'monthly' as const
        };
      });
      
      const usagePromises = trackingFeatureConfigs.map(async (feature) => {
        try {
          const usageData = await usageTrackingService.getUsageData(
            user.id,
            feature.id,
            selectedPeriod,
            isPremium
          );

          console.log(`🔍 UsageScreen: ${feature.id} - Current: ${usageData.currentUsage}, Limit: ${usageData.limit}, Remaining: ${usageData.remaining}`);

          return {
            featureId: feature.id,
            featureName: feature.name,
            currentUsage: usageData.currentUsage,
            limit: usageData.limit === 'unlimited' ? -1 : usageData.limit, // Use -1 for unlimited
            remaining: usageData.remaining === 'unlimited' ? -1 : usageData.remaining, // Use -1 for unlimited
            period: selectedPeriod,
            icon: feature.icon,
            color: feature.color
          };
        } catch (error) {
          console.error(`Error loading usage for ${feature.id}:`, error);
          return {
            featureId: feature.id,
            featureName: feature.name,
            currentUsage: 0,
            limit: 0,
            remaining: 0,
            period: selectedPeriod,
            icon: feature.icon,
            color: feature.color
          };
        }
      });

      const results = await Promise.all(usagePromises);
      console.log('🔍 UsageScreen: Final usage data:', results);
      setUsageData(results);
    } catch (error) {
      console.error('Error loading usage data:', error);
      // Set empty data on error
      setUsageData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // First refresh the feature limits to get any updates from the dashboard
    await refreshLimits();
    // Then load the usage data with the updated limits
    await loadUsageData();
    setRefreshing(false);
  }, [user?.id, selectedPeriod, trackedFeatures, trackingLoading, refreshLimits]);

  const formatUsage = (usage: number, featureId: string) => {
    if (usage === -1) {
      return 'Unlimited';
    }
    
    // For count-based features, show as count
    const isCountBased = ['ai_transcription', 'ai_name_generating', 'ai_summaries', 'ai_key_details'].includes(featureId);
    if (isCountBased) {
      return `${usage} uses`;
    }
    
    // For time-based features, usage is stored in minutes
    const hours = Math.floor(usage / 60);
    const minutes = usage % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatLimit = (limit: number, featureId: string) => {
    if (limit === -1) {
      return 'Unlimited';
    }
    
    const isCountBased = ['ai_transcription', 'ai_name_generating', 'ai_summaries', 'ai_key_details'].includes(featureId);
    if (isCountBased) {
      return `${limit} uses`;
    }
    
    // For time-based features, limits are in minutes
    const hours = Math.floor(limit / 60);
    const minutes = limit % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === 0) return 0;
    if (limit === -1) return 0; // Unlimited means 0% usage
    return Math.min((current / limit) * 100, 100);
  };

  const getPeriodDisplayName = (period: string) => {
    switch (period) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      default: return period;
    }
  };

  const getNextResetTime = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let resetDate: Date;

    switch (period) {
      case 'daily':
        // Reset at midnight tomorrow
        resetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        // Reset at midnight next Monday
        const dayOfWeek = now.getDay();
        const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Next Monday
        resetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd);
        break;
      case 'monthly':
        // Reset at midnight on 1st of next month
        resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    return resetDate;
  };

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 7) {
      // Show actual date for periods longer than a week
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} from now`;
    } else {
      return 'Less than 1 hour from now';
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Usage Statistics"
        subtitle="Track your feature usage and limits"
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
                <ThemedText type="title">Usage Statistics</ThemedText>
                <ThemedText style={[styles.webHeaderSubtitle, { color: mutedTextColor }]}>
                  Monitor your feature usage and limits
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Period Selector */}
          <View style={styles.webPeriodSelector}>
            <ThemedText style={styles.webPeriodLabel}>Time Period</ThemedText>
            <View style={styles.webPeriodButtons}>
              {(['daily', 'weekly', 'monthly'] as const).map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.webPeriodButton,
                    { 
                      backgroundColor: selectedPeriod === period ? accentColor : cardBackground,
                      borderColor: selectedPeriod === period ? accentColor : borderColor
                    }
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <ThemedText style={[
                    styles.webPeriodButtonText,
                    { color: selectedPeriod === period ? '#FFFFFF' : textColor }
                  ]}>
                    {getPeriodDisplayName(period)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading || trackingLoading ? (
            <View style={styles.webLoadingContainer}>
              <LoadingSpinner size={48} />
              <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>
                Loading usage data...
              </ThemedText>
            </View>
          ) : !user?.id ? (
            <View style={styles.webLoadingContainer}>
              <View style={styles.webEmptyIcon}>
                <Ionicons name="person-circle-outline" size={64} color={mutedTextColor} />
              </View>
              <ThemedText style={[styles.webEmptyTitle, { color: textColor }]}>
                Authentication Required
              </ThemedText>
              <ThemedText style={[styles.webEmptyText, { color: mutedTextColor }]}>
                Please log in to view your usage statistics
              </ThemedText>
              <TouchableOpacity 
                style={[styles.webLoginButton, { backgroundColor: accentColor }]}
                onPress={() => router.push('/(auth)/login')}
              >
                <ThemedText style={styles.webLoginButtonText}>Sign In</ThemedText>
              </TouchableOpacity>
            </View>
          ) : !showProgressiveContent ? (
            <View style={styles.webLoadingContainer}>
              <LoadingSpinner size={48} />
              <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>
                Preparing your data...
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Progressive Usage Summary */}
              <StaggeredLoader
                staggerDelay={200}
                direction="slideUp"
                duration={800}
                style={styles.webUsageSummary}
              >
                <ProgressiveLoader direction="scaleIn" delay={0} duration={600}>
                  <View style={styles.webSummaryCard}>
                    <Ionicons name="analytics" size={24} color={accentColor} />
                    <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                      {usageData.filter(f => f.currentUsage > 0).length}
                    </ThemedText>
                    <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                      Features Used
                    </ThemedText>
                  </View>
                </ProgressiveLoader>
                <ProgressiveLoader direction="scaleIn" delay={100} duration={600}>
                  <View style={styles.webSummaryCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#3CB371" />
                    <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                      {usageData.filter(f => f.currentUsage > 0 && (f.remaining > 0 || f.remaining === -1)).length}
                    </ThemedText>
                    <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                      Available
                    </ThemedText>
                  </View>
                </ProgressiveLoader>
                <ProgressiveLoader direction="scaleIn" delay={200} duration={600}>
                  <View style={styles.webSummaryCard}>
                    <Ionicons name="warning" size={24} color="#FF8C00" />
                    <ThemedText style={[styles.webSummaryTitle, { color: textColor }]}>
                      {usageData.filter(f => {
                        const percentage = getUsagePercentage(f.currentUsage, f.limit);
                        return f.currentUsage > 0 && percentage > 80 && percentage < 100;
                      }).length}
                    </ThemedText>
                    <ThemedText style={[styles.webSummaryLabel, { color: mutedTextColor }]}>
                      Near Limit
                    </ThemedText>
                  </View>
                </ProgressiveLoader>
              </StaggeredLoader>

              {/* Usage Grid */}
              {usageData.filter(feature => feature.currentUsage > 0).length === 0 ? (
                <View style={styles.webLoadingContainer}>
                  <Ionicons name="analytics-outline" size={64} color="#666666" />
                  <ThemedText type="subtitle" style={styles.webEmptyTitle}>
                    No features used yet
                  </ThemedText>
                  <ThemedText style={[styles.webEmptyTitle, { color: mutedTextColor }]}>
                    Start using features to see your usage statistics here
                  </ThemedText>
                </View>
              ) : (
                <StaggeredLoader
                  staggerDelay={120}
                  direction="slideUp"
                  duration={700}
                  style={styles.webUsageGrid}
                >
                  {usageData.filter(feature => feature.currentUsage > 0).map((feature, index) => (
                    <ProgressiveLoader
                      key={feature.featureId}
                      direction="fadeIn"
                      delay={index * 100}
                      duration={600}
                    >
                      <View style={[styles.webUsageCard, { backgroundColor: cardBackground }]}>
                    <View style={styles.webFeatureHeader}>
                      <View style={[styles.webFeatureIcon, { backgroundColor: feature.color }]}>
                        <Ionicons name={feature.icon as any} size={24} color="#FFFFFF" />
                      </View>
                      <View style={styles.webFeatureInfo}>
                        <ThemedText style={[styles.webFeatureName, { color: textColor }]}>
                          {feature.featureName}
                        </ThemedText>
                        <ThemedText style={[styles.webFeaturePeriod, { color: mutedTextColor }]}>
                          {getPeriodDisplayName(feature.period)}
                        </ThemedText>
                      </View>
                      <View style={styles.webFeatureStatus}>
                        {feature.remaining === -1 ? (
                          <View style={[styles.webStatusBadge, { backgroundColor: '#3CB371' }]}>
                            <ThemedText style={styles.webStatusText}>Unlimited</ThemedText>
                          </View>
                        ) : getUsagePercentage(feature.currentUsage, feature.limit) >= 100 ? (
                          <View style={[styles.webStatusBadge, { backgroundColor: '#FF6B6B' }]}>
                            <ThemedText style={styles.webStatusText}>Limit Reached</ThemedText>
                          </View>
                        ) : getUsagePercentage(feature.currentUsage, feature.limit) > 80 ? (
                          <View style={[styles.webStatusBadge, { backgroundColor: '#FF8C00' }]}>
                            <ThemedText style={styles.webStatusText}>Near Limit</ThemedText>
                          </View>
                        ) : (
                          <View style={[styles.webStatusBadge, { backgroundColor: '#3CB371' }]}>
                            <ThemedText style={styles.webStatusText}>Available</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.webUsageStats}>
                      <View style={styles.webUsageRow}>
                        <ThemedText style={[styles.webUsageLabel, { color: mutedTextColor }]}>Used</ThemedText>
                        <ThemedText style={[styles.webUsageValue, { color: textColor }]}>
                          {formatUsage(feature.currentUsage, feature.featureId)}
                        </ThemedText>
                      </View>
                      <View style={styles.webUsageRow}>
                        <ThemedText style={[styles.webUsageLabel, { color: mutedTextColor }]}>Limit</ThemedText>
                        <ThemedText style={[styles.webUsageValue, { color: textColor }]}>
                          {formatLimit(feature.limit, feature.featureId)}
                        </ThemedText>
                      </View>
                      <View style={styles.webUsageRow}>
                        <ThemedText style={[styles.webUsageLabel, { color: mutedTextColor }]}>Remaining</ThemedText>
                        <ThemedText style={[styles.webUsageValue, { color: accentColor, fontWeight: 'bold' }]}>
                          {formatUsage(feature.remaining, feature.featureId)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.webProgressContainer}>
                      <View style={styles.webProgressHeader}>
                        <ThemedText style={[styles.webProgressLabel, { color: mutedTextColor }]}>
                          Usage Progress
                        </ThemedText>
                        <ThemedText style={[styles.webProgressText, { color: mutedTextColor }]}>
                          {Math.round(getUsagePercentage(feature.currentUsage, feature.limit))}%
                        </ThemedText>
                      </View>
                      <View style={[styles.webProgressBar, { backgroundColor: borderColor }]}>
                        <View 
                          style={[
                            styles.webProgressFill, 
                            { 
                              backgroundColor: feature.color,
                              width: `${getUsagePercentage(feature.currentUsage, feature.limit)}%`
                            }
                          ]} 
                        />
                      </View>
                    </View>

                    {/* Reset Info */}
                    <View style={styles.webResetInfo}>
                      <Ionicons name="time-outline" size={14} color={mutedTextColor} />
                      <ThemedText style={[styles.webResetText, { color: mutedTextColor }]}>
                        Resets {formatResetTime(getNextResetTime(feature.period))}
                      </ThemedText>
                    </View>
                      </View>
                    </ProgressiveLoader>
                  ))}
                </StaggeredLoader>
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
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Usage Statistics</ThemedText>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <ThemedText style={styles.periodLabel}>Time Period:</ThemedText>
        <View style={styles.periodButtons}>
          {(['daily', 'weekly', 'monthly'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                { backgroundColor: selectedPeriod === period ? accentColor : cardBackground }
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <ThemedText style={[
                styles.periodButtonText,
                { color: selectedPeriod === period ? '#FFFFFF' : textColor }
              ]}>
                {getPeriodDisplayName(period)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={40} />
          <ThemedText style={[styles.loadingText, { color: mutedTextColor }]}>
            Loading usage data...
          </ThemedText>
        </View>
      ) : !user?.id ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="person-circle-outline" size={64} color={mutedTextColor} />
          <ThemedText style={[styles.loadingText, { color: mutedTextColor, marginTop: 16 }]}>
            Please log in to view your usage statistics
          </ThemedText>
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: accentColor, marginTop: 20 }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText style={styles.loginButtonText}>Log In</ThemedText>
          </TouchableOpacity>
        </View>
      ) : !showProgressiveContent ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={40} />
          <ThemedText style={[styles.loadingText, { color: mutedTextColor }]}>
            Preparing your data...
          </ThemedText>
        </View>
      ) : (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {usageData.filter(feature => feature.currentUsage > 0).length === 0 ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="analytics-outline" size={64} color="#A0A0A0" />
              <ThemedText style={styles.loadingText}>No features used yet</ThemedText>
              <ThemedText style={styles.loadingText}>
                Start using features to see your usage statistics here
              </ThemedText>
            </View>
          ) : (
            <StaggeredLoader
              staggerDelay={100}
              direction="slideUp"
              duration={600}
            >
              {usageData.filter(feature => feature.currentUsage > 0).map((feature, index) => (
                <ProgressiveLoader
                  key={feature.featureId}
                  direction="fadeIn"
                  delay={index * 80}
                  duration={500}
                >
                  <View style={[styles.usageCard, { backgroundColor: cardBackground }]}>
              <View style={styles.featureHeader}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <Ionicons name={feature.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureInfo}>
                  <ThemedText style={[styles.featureName, { color: textColor }]}>
                    {feature.featureName}
                  </ThemedText>
                  <ThemedText style={[styles.featurePeriod, { color: mutedTextColor }]}>
                    {getPeriodDisplayName(feature.period)}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.usageStats}>
                <View style={styles.usageRow}>
                  <ThemedText style={[styles.usageLabel, { color: mutedTextColor }]}>Used:</ThemedText>
                  <ThemedText style={[styles.usageValue, { color: textColor }]}>
                    {formatUsage(feature.currentUsage, feature.featureId)}
                  </ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <ThemedText style={[styles.usageLabel, { color: mutedTextColor }]}>Limit:</ThemedText>
                  <ThemedText style={[styles.usageValue, { color: textColor }]}>
                    {formatLimit(feature.limit, feature.featureId)}
                  </ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <ThemedText style={[styles.usageLabel, { color: mutedTextColor }]}>Remaining:</ThemedText>
                  <ThemedText style={[styles.usageValue, { color: accentColor, fontWeight: 'bold' }]}>
                    {formatUsage(feature.remaining, feature.featureId)}
                  </ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <ThemedText style={[styles.usageLabel, { color: mutedTextColor }]}>Next Reset:</ThemedText>
                  <ThemedText style={[styles.usageValue, { color: mutedTextColor, fontSize: 12 }]}>
                    {formatResetTime(getNextResetTime(feature.period))}
                  </ThemedText>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: mutedTextColor }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: feature.color,
                        width: `${getUsagePercentage(feature.currentUsage, feature.limit)}%`
                      }
                    ]} 
                  />
                </View>
                <ThemedText style={[styles.progressText, { color: mutedTextColor }]}>
                  {Math.round(getUsagePercentage(feature.currentUsage, feature.limit))}%
                </ThemedText>
              </View>
            </View>
                  </ProgressiveLoader>
                ))}
              </StaggeredLoader>
            )}

          {/* Upgrade Section */}
          <View style={[styles.upgradeSection, { backgroundColor: cardBackground }]}>
            <Ionicons name="star" size={32} color={accentColor} />
            <ThemedText style={[styles.upgradeTitle, { color: textColor }]}>
              Upgrade to Premium
            </ThemedText>
            <ThemedText style={[styles.upgradeText, { color: mutedTextColor }]}>
              Get unlimited access to all features and remove usage limits
            </ThemedText>
            <TouchableOpacity 
              style={[styles.upgradeButton, { backgroundColor: accentColor }]}
              onPress={() => router.push('join-premium')}
            >
              <ThemedText style={styles.upgradeButtonText}>Upgrade Now</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    marginLeft: 'auto', // Push to the right
  },
  periodSelector: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  usageCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featurePeriod: {
    fontSize: 14,
  },
  usageStats: {
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  usageLabel: {
    fontSize: 14,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  upgradeSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  webPeriodSelector: {
    marginBottom: 32,
  },
  webPeriodLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  webPeriodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  webPeriodButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  webPeriodButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 24,
    lineHeight: 24,
  },
  webLoginButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  webLoginButtonText: {
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 32,
  },
  webUsageCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  webFeatureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  webFeatureInfo: {
    flex: 1,
  },
  webFeatureName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  webFeaturePeriod: {
    fontSize: 14,
    fontWeight: '500',
  },
  webFeatureStatus: {
    marginLeft: 'auto',
  },
  webStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  webStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  webUsageStats: {
    marginBottom: 20,
  },
  webUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  webUsageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  webUsageValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  webProgressContainer: {
    marginBottom: 16,
  },
  webProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  webProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  webProgressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  webProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  webProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  webResetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webResetText: {
    fontSize: 12,
    fontWeight: '500',
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
  // Skeleton loading styles
  skeletonLine: {
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
}); 