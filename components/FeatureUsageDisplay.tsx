import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { UserFeatureUsage, formatLimit, formatUsage } from '../types/FeatureLimits';

interface FeatureUsageDisplayProps {
  featureId: string;
  showDetails?: boolean;
  onUpgradePress?: () => void;
  compact?: boolean;
}

export const FeatureUsageDisplay: React.FC<FeatureUsageDisplayProps> = ({
  featureId,
  showDetails = true,
  onUpgradePress,
  compact = false,
}) => {
  const { user } = useAuth();
  const { getUserFeatureUsage, isPremium, hasUnlimitedAccess } = useFeatureLimits();
  const [usage, setUsage] = useState<UserFeatureUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsage = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userUsage = await getUserFeatureUsage(featureId);
        setUsage(userUsage);
      } catch (error) {
        console.error('Error loading feature usage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsage();
  }, [featureId, user?.id, getUserFeatureUsage]);

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!usage) {
    return null;
  }

  const isUnlimited = usage.currentPeriod.limit === 'unlimited';
  const remaining = usage.currentPeriod.remaining;
  const isNearLimit = !isUnlimited && remaining !== 'unlimited' && remaining < (usage.currentPeriod.limit as number) * 0.2;
  const isAtLimit = !isUnlimited && remaining !== 'unlimited' && remaining <= 0;

  const getUsageColor = () => {
    if (isUnlimited || remaining === 'unlimited') return '#4CAF50';
    if (isAtLimit) return '#FF3B30';
    if (isNearLimit) return '#FFA726';
    return '#007AFF';
  };

  const getUsageIcon = () => {
    if (isUnlimited || remaining === 'unlimited') return 'infinite';
    if (isAtLimit) return 'close-circle';
    if (isNearLimit) return 'warning';
    return 'checkmark-circle';
  };

  const handleUpgradePress = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      Alert.alert(
        'Upgrade to Premium',
        'Get unlimited access to all features with our premium plan!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', onPress: () => {/* Navigate to premium page */} },
        ]
      );
    }
  };

  if (compact) {
    return (
      <View style={styles.containerCompact}>
        <View style={styles.compactRow}>
          <Ionicons 
            name={getUsageIcon()} 
            size={16} 
            color={getUsageColor()} 
          />
          <Text style={[styles.compactText, { color: getUsageColor() }]}>
            {isUnlimited || remaining === 'unlimited' 
              ? 'Unlimited' 
              : `${formatUsage(usage.currentPeriod.usage, usage.currentPeriod.limitType)} / ${formatLimit(usage.currentPeriod.limit, usage.currentPeriod.limitType)}`
            }
          </Text>
          {!isPremium && !isUnlimited && remaining !== 'unlimited' && (
            <TouchableOpacity onPress={handleUpgradePress} style={styles.upgradeButtonCompact}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons 
            name={getUsageIcon()} 
            size={20} 
            color={getUsageColor()} 
          />
          <Text style={styles.featureName}>{usage.featureName || featureId}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>
        
        {showDetails && (
          <View style={styles.usageInfo}>
            <Text style={styles.periodText}>
              {usage.currentPeriod.period.charAt(0).toUpperCase() + usage.currentPeriod.period.slice(1)} Usage
            </Text>
            <Text style={styles.usageText}>
              {formatUsage(usage.currentPeriod.usage, usage.currentPeriod.limitType)}
              {!isUnlimited && remaining !== 'unlimited' && (
                <Text style={styles.limitText}>
                  {' / '}{formatLimit(usage.currentPeriod.limit, usage.currentPeriod.limitType)}
                </Text>
              )}
            </Text>
          </View>
        )}
      </View>

      {!isUnlimited && remaining !== 'unlimited' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, (usage.currentPeriod.usage / (usage.currentPeriod.limit as number)) * 100)}%`,
                  backgroundColor: getUsageColor(),
                }
              ]} 
            />
          </View>
          <Text style={[styles.remainingText, { color: getUsageColor() }]}>
            {remaining > 0 ? `${formatLimit(remaining, usage.currentPeriod.limitType)} remaining` : 'Limit reached'}
          </Text>
        </View>
      )}

      {!isPremium && !isUnlimited && remaining !== 'unlimited' && (
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.upgradeText}>Upgrade to Premium for Unlimited Access</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      )}

      {isAtLimit && !isPremium && (
        <View style={styles.limitReachedContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.limitReachedText}>
            You've reached your {usage.currentPeriod.period} limit. Upgrade to continue using this feature.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerCompact: {
    backgroundColor: 'transparent',
    padding: 0,
    marginVertical: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 4,
  },
  usageInfo: {
    marginLeft: 28,
  },
  periodText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  usageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitText: {
    color: '#666666',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  upgradeText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  upgradeButtonCompact: {
    marginLeft: 8,
    padding: 4,
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  limitReachedText: {
    flex: 1,
    fontSize: 12,
    color: '#D32F2F',
    marginLeft: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
}); 