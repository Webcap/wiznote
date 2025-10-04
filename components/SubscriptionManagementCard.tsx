import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { subscriptionManagementService, type SubscriptionDetails } from '../services/SubscriptionManagementService';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SubscriptionManagementCardProps {
  compact?: boolean;
  showActions?: boolean;
  onSubscriptionChange?: (subscription: SubscriptionDetails | null) => void;
}

export function SubscriptionManagementCard({ 
  compact = false, 
  showActions = true,
  onSubscriptionChange 
}: SubscriptionManagementCardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'accentSuccess');
  const warningColor = useThemeColor({}, 'accentWarning');
  const errorColor = useThemeColor({}, 'accentError');

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    }
  }, [user?.id]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const sub = await subscriptionManagementService.getCurrentSubscription(user!.id);
      setSubscription(sub);
      onSubscriptionChange?.(sub);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    console.log('Navigating to subscription management...');
    
    // Try the same approach as UserSidebar (without leading slash)
    try {
      console.log('Attempting navigation to subscription-management...');
      router.push('subscription-management');
    } catch (error) {
      console.error('Navigation failed:', error);
      
      // Fallback: try with leading slash
      try {
        router.push('/subscription-management');
      } catch (error2) {
        console.error('Fallback navigation also failed:', error2);
        
        // Last resort: use window.location for web
        if (Platform.OS === 'web') {
          window.location.href = '/subscription-management';
        }
      }
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;

    if (Platform.OS === 'web') {
      // Web confirmation dialog
      const confirmed = confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.');
      if (!confirmed) return;
      
      try {
        const result = await subscriptionManagementService.cancelSubscription(user.id);
        
        if (result.success) {
          alert('Subscription Canceled: ' + result.message);
          await loadSubscription(); // Refresh data
        } else {
          alert('Error: ' + result.message);
        }
      } catch (error) {
        alert('Error: Failed to cancel subscription');
      }
    } else {
      // Mobile confirmation dialog
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.',
        [
          { text: 'Keep Subscription', style: 'cancel' },
          {
            text: 'Cancel Subscription',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await subscriptionManagementService.cancelSubscription(user.id);
                
                if (result.success) {
                  Alert.alert('Subscription Canceled', result.message);
                  await loadSubscription(); // Refresh data
                } else {
                  Alert.alert('Error', result.message);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to cancel subscription');
              }
            }
          }
        ]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return successColor;
      case 'canceled': return errorColor;
      case 'past_due': return warningColor;
      case 'trialing': return accentColor;
      default: return mutedTextColor;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'canceled': return 'Canceled';
      case 'past_due': return 'Past Due';
      case 'trialing': return 'Trial';
      default: return status;
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="reload" size={20} color={mutedTextColor} />
          <ThemedText style={{ marginLeft: 8, color: mutedTextColor }}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!subscription) {
    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.noSubscription}>
          <Ionicons name="card-outline" size={24} color={mutedTextColor} />
          <View style={styles.noSubscriptionText}>
            <ThemedText style={{ color: textColor, fontWeight: '600' }}>No Active Subscription</ThemedText>
            <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>
              Upgrade to unlock premium features
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: accentColor }]}
            onPress={() => router.push('/join-premium')}
          >
            <ThemedText style={styles.upgradeButtonText}>Upgrade</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (compact) {
    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.compactHeader}>
          <View style={styles.compactInfo}>
            <ThemedText style={{ color: textColor, fontWeight: '600' }}>
              {subscription.planName}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>
              ${subscription.planPrice}/{subscription.planInterval === 'weekly' ? 'week' : 
                 subscription.planInterval === 'monthly' ? 'month' : 
                 subscription.planInterval === 'yearly' ? 'year' : subscription.planInterval}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
            <ThemedText style={styles.statusText}>{getStatusText(subscription.status)}</ThemedText>
          </View>
        </View>
        
        {subscription.cancelAtPeriodEnd && (
          <View style={[styles.cancelNotice, { backgroundColor: warningColor + '20' }]}>
            <Ionicons name="warning-outline" size={16} color={warningColor} />
            <ThemedText style={{ marginLeft: 6, color: warningColor, fontSize: 12, flex: 1 }}>
              Cancels on {formatDate(subscription.currentPeriodEnd)}
            </ThemedText>
          </View>
        )}

        {showActions && (
          <View style={styles.compactActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor }]}
              onPress={handleManageSubscription}
            >
              <ThemedText style={{ color: textColor, fontSize: 12 }}>Manage</ThemedText>
            </TouchableOpacity>
            
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <TouchableOpacity 
                style={[styles.actionButton, { borderColor: errorColor }]}
                onPress={handleCancelSubscription}
              >
                <ThemedText style={{ color: errorColor, fontSize: 12 }}>Cancel</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <ThemedText type="title" style={{ color: textColor }}>
            {subscription.planName}
          </ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={[styles.price, { color: textColor }]}>
              ${subscription.planPrice}
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              /{subscription.planInterval === 'weekly' ? 'week' : 
                 subscription.planInterval === 'monthly' ? 'month' : 
                 subscription.planInterval === 'yearly' ? 'year' : subscription.planInterval}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
          <ThemedText style={styles.statusText}>{getStatusText(subscription.status)}</ThemedText>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <ThemedText style={{ color: mutedTextColor }}>Billing Period:</ThemedText>
          <ThemedText style={{ color: textColor }}>
            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
          </ThemedText>
        </View>
        {subscription.nextBillingDate && (
          <View style={styles.detailRow}>
            <ThemedText style={{ color: mutedTextColor }}>Next Billing:</ThemedText>
            <ThemedText style={{ color: textColor }}>
              {formatDate(subscription.nextBillingDate)}
            </ThemedText>
          </View>
        )}
      </View>

      {subscription.cancelAtPeriodEnd && (
        <View style={[styles.cancelNotice, { backgroundColor: warningColor + '20' }]}>
          <Ionicons name="warning-outline" size={20} color={warningColor} />
          <ThemedText style={{ marginLeft: 8, color: warningColor, flex: 1 }}>
            Your subscription will be canceled at the end of the current billing period on{' '}
            {formatDate(subscription.currentPeriodEnd)}.
          </ThemedText>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor }]}
            onPress={handleManageSubscription}
          >
            <Ionicons name="settings-outline" size={20} color={textColor} />
            <ThemedText style={{ marginLeft: 8, color: textColor }}>Manage Subscription</ThemedText>
          </TouchableOpacity>

          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor: errorColor }]}
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle-outline" size={20} color={errorColor} />
              <ThemedText style={{ marginLeft: 8, color: errorColor }}>Cancel Subscription</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noSubscription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noSubscriptionText: {
    flex: 1,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactInfo: {
    flex: 1,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
});
