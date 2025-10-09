import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { FeatureUsageData } from '../hooks/useUnifiedFeatureLimits';
import { LazyWrapper } from './LazyWrapper';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface UnifiedUsageDisplayProps {
  features: FeatureUsageData[];
  onFeaturePress?: (feature: FeatureUsageData) => void;
  showUpgradeButton?: boolean;
  onUpgradePress?: () => void;
}

export function UnifiedUsageDisplay({
  features,
  onFeaturePress,
  showUpgradeButton = true,
  onUpgradePress
}: UnifiedUsageDisplayProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'danger');

  const getUsageColor = (usagePercentage: number, isUnlimited: boolean) => {
    if (isUnlimited) return successColor;
    if (usagePercentage >= 90) return errorColor;
    if (usagePercentage >= 75) return warningColor;
    return successColor;
  };

  const getUsageIcon = (usagePercentage: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'checkmark-circle';
    if (usagePercentage >= 90) return 'close-circle';
    if (usagePercentage >= 75) return 'warning';
    return 'checkmark-circle';
  };

  const formatUsage = (currentUsage: number, userLimit: number | 'unlimited', limitType: string) => {
    if (userLimit === 'unlimited') return 'Unlimited';
    
    switch (limitType) {
      case 'duration':
        return `${currentUsage}/${userLimit} minutes`;
      case 'storage':
        return `${formatBytes(currentUsage)}/${formatBytes(userLimit)}`;
      case 'count':
        return `${currentUsage}/${userLimit}`;
      default:
        return `${currentUsage}/${userLimit}`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai': return 'sparkles';
      case 'audio': return 'mic';
      case 'storage': return 'folder';
      case 'collaboration': return 'people';
      case 'analytics': return 'analytics';
      case 'customization': return 'color-palette';
      default: return 'settings';
    }
  };

  const groupedFeatures = React.useMemo(() => {
    const grouped: Record<string, FeatureUsageData[]> = {};
    // Filter out features with 0 usage
    const featuresWithUsage = features.filter(feature => feature.currentUsage > 0);
    featuresWithUsage.forEach(feature => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    });
    return grouped;
  }, [features]);

  if (features.filter(f => f.currentUsage > 0).length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <Ionicons name="information-circle" size={48} color={mutedTextColor} />
        <ThemedText style={[styles.emptyText, { color: mutedTextColor }]}>
          No features used yet
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <LazyWrapper delay={100}>
      <ThemedView style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: cardBackground }]}>
          <Ionicons name="checkmark-circle" size={24} color={successColor} />
          <ThemedText style={[styles.summaryNumber, { color: textColor }]}>
            {features.filter(f => f.canUse).length}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: mutedTextColor }]}>
            Available
          </ThemedText>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: cardBackground }]}>
          <Ionicons name="warning" size={24} color={warningColor} />
          <ThemedText style={[styles.summaryNumber, { color: textColor }]}>
            {features.filter(f => !f.canUse && !f.isUnlimited).length}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: mutedTextColor }]}>
            Limited
          </ThemedText>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: cardBackground }]}>
          <Ionicons name="infinite" size={24} color={successColor} />
          <ThemedText style={[styles.summaryNumber, { color: textColor }]}>
            {features.filter(f => f.isUnlimited).length}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: mutedTextColor }]}>
            Unlimited
          </ThemedText>
        </View>
      </View>

      {/* Features by Category */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <View key={category} style={styles.categoryContainer}>
          <View style={styles.categoryHeader}>
            <Ionicons 
              name={getCategoryIcon(category) as any} 
              size={20} 
              color={accentColor} 
            />
            <ThemedText style={[styles.categoryTitle, { color: textColor }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </ThemedText>
          </View>
          
          {categoryFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.featureId}
              style={[
                styles.featureCard,
                { backgroundColor: cardBackground, borderColor }
              ]}
              onPress={() => onFeaturePress?.(feature)}
              disabled={!onFeaturePress}
            >
              <View style={styles.featureHeader}>
                <View style={styles.featureInfo}>
                  <ThemedText style={[styles.featureName, { color: textColor }]}>
                    {feature.featureName}
                  </ThemedText>
                  <ThemedText style={[styles.featureDescription, { color: mutedTextColor }]}>
                    {feature.description}
                  </ThemedText>
                </View>
                
                <View style={styles.featureStatus}>
                  <Ionicons 
                    name={getUsageIcon(feature.usagePercentage, feature.isUnlimited) as any}
                    size={20} 
                    color={getUsageColor(feature.usagePercentage, feature.isUnlimited)} 
                  />
                </View>
              </View>
              
              <View style={styles.featureUsage}>
                <View style={styles.usageInfo}>
                  <ThemedText style={[styles.usageText, { color: textColor }]}>
                    {formatUsage(feature.currentUsage, feature.userLimit, feature.limitType)}
                  </ThemedText>
                  <ThemedText style={[styles.periodText, { color: mutedTextColor }]}>
                    per {feature.period}
                  </ThemedText>
                </View>
                
                {!feature.isUnlimited && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            backgroundColor: getUsageColor(feature.usagePercentage, feature.isUnlimited),
                            width: `${Math.min(feature.usagePercentage, 100)}%`
                          }
                        ]} 
                      />
                    </View>
                    <ThemedText style={[styles.progressText, { color: mutedTextColor }]}>
                      {feature.usagePercentage}%
                    </ThemedText>
                  </View>
                )}
              </View>
              
              {feature.requiresUpgrade && (
                <View style={styles.upgradeBanner}>
                  <Ionicons name="star" size={16} color={accentColor} />
                  <ThemedText style={[styles.upgradeText, { color: accentColor }]}>
                    Upgrade to Premium for unlimited access
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
      
      {/* Upgrade Button */}
      {showUpgradeButton && onUpgradePress && (
        <TouchableOpacity 
          style={[styles.upgradeButton, { backgroundColor: accentColor }]}
          onPress={onUpgradePress}
        >
          <Ionicons name="star" size={20} color="#FFFFFF" />
          <ThemedText style={styles.upgradeButtonText}>
            Upgrade to Premium
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
    </LazyWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  categoryContainer: {
    marginBottom: 24,
  },
  
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  featureCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  
  featureInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  featureStatus: {
    marginTop: 2,
  },
  
  featureUsage: {
    marginBottom: 12,
  },
  
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  usageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  periodText: {
    fontSize: 12,
  },
  
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  progressText: {
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    gap: 6,
  },
  
  upgradeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
