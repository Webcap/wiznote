import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { useUnifiedFeatureLimits } from '../hooks/useUnifiedFeatureLimits';
import { ThemedText } from './ThemedText';

interface FeatureUsageInlineProps {
  featureId: string;
  compact?: boolean;
  onUpgradePress?: () => void;
}

export function FeatureUsageInline({
  featureId,
  compact = false,
  onUpgradePress
}: FeatureUsageInlineProps) {
  const { trackedFeatures, canUseFeature, getUserLimit, formatLimit } = useUnifiedFeatureLimits();
  const feature = trackedFeatures.find(f => f.featureId === featureId);
  
  // Debug logging
  console.log(`FeatureUsageInline: Looking for featureId=${featureId}`);
  console.log(`FeatureUsageInline: trackedFeatures count=${trackedFeatures.length}`);
  console.log(`FeatureUsageInline: trackedFeatures IDs=${trackedFeatures.map(f => f.featureId).join(', ')}`);
  console.log(`FeatureUsageInline: found feature=`, feature);
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  if (!feature) {
    console.log(`FeatureUsageInline: Feature ${featureId} not found in trackedFeatures`);
    return null;
  }

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

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor }]}>
        <View style={styles.compactContent}>
          <Ionicons 
            name={getUsageIcon(feature.usagePercentage, feature.isUnlimited) as any}
            size={16} 
            color={getUsageColor(feature.usagePercentage, feature.isUnlimited)} 
          />
          <ThemedText style={[styles.compactText, { color: mutedTextColor }]}>
            {feature.currentUsage}/{formatLimit(feature.userLimit, feature.limitType)}
          </ThemedText>
        </View>
        {feature.requiresUpgrade && onUpgradePress && (
          <TouchableOpacity 
            style={[styles.compactUpgradeButton, { backgroundColor: accentColor }]}
            onPress={onUpgradePress}
          >
            <ThemedText style={styles.compactUpgradeText}>Upgrade</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
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
      
      <View style={styles.usage}>
        <ThemedText style={[styles.usageText, { color: textColor }]}>
          {feature.currentUsage}/{formatLimit(feature.userLimit, feature.limitType)}
        </ThemedText>
        <ThemedText style={[styles.periodText, { color: mutedTextColor }]}>
          per {feature.period}
        </ThemedText>
      </View>
      
      {feature.requiresUpgrade && onUpgradePress && (
        <TouchableOpacity 
          style={[styles.upgradeButton, { backgroundColor: accentColor }]}
          onPress={onUpgradePress}
        >
          <ThemedText style={styles.upgradeButtonText}>Upgrade to Premium</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  compactUpgradeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
  compactUpgradeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  
  header: {
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
  
  usage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  usageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  periodText: {
    fontSize: 12,
  },
  
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
