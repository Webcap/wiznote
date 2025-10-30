import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';
import { subscriptionManagementService, type SubscriptionDetails } from '../services/SubscriptionManagementService';

export default function SubscriptionManagementScreen() {
  const { t } = useTranslation();
  console.log('SubscriptionManagementScreen component rendering');
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  console.log('User from useAuth:', user);

  // Set navigation options to hide header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      header: () => null,
      headerStyle: { height: 0 },
      headerTitle: '',
      headerBackTitle: '',
      headerBackVisible: false,
      headerTransparent: true,
      headerShadowVisible: false,
    });
  }, [navigation]);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'danger');

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);

  useEffect(() => {
    console.log('useEffect triggered, user?.id:', user?.id);
    if (user?.id) {
      console.log('Calling loadSubscriptionData');
      loadSubscriptionData();
    } else {
      console.log('No user ID, not loading subscription data');
      // If no user ID, set loading to false and subscription to null
      setLoading(false);
      setSubscription(null);
    }
  }, [user?.id]);

  const loadSubscriptionData = async () => {
    console.log('loadSubscriptionData function called');
    try {
      console.log('Setting loading to true');
      setLoading(true);
      console.log('About to call subscriptionManagementService.getCurrentSubscription with user ID:', user!.id);
      
      // Call getCurrentSubscription first to see what it returns
      const sub = await subscriptionManagementService.getCurrentSubscription(user!.id);
      console.log('getCurrentSubscription result:', sub);
      
      // If no subscription, still load usage and history for display
      const [usageData, history] = await Promise.all([
        subscriptionManagementService.getSubscriptionUsage(user!.id),
        subscriptionManagementService.getBillingHistory(user!.id)
      ]);
      
      console.log('Promise.all completed successfully');
      console.log('Subscription data loaded:', {
        subscription: sub,
        usage: usageData,
        history: history
      });
      
      console.log('Subscription data loaded:', sub);
      console.log('Subscription status:', sub?.status);
      console.log('Subscription cancelAtPeriodEnd:', sub?.cancelAtPeriodEnd);
      setSubscription(sub);
      setUsage(usageData);
      setBillingHistory(history);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      console.error('Error details:', error);
      // Set subscription to null on error so we show the "No Active Subscription" message
      setSubscription(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    console.log('handleCancelSubscription called!');
    console.log('User ID:', user?.id);
    if (!user?.id) return;

    if (Platform.OS === 'web') {
      // Web confirmation dialog
      const confirmed = confirm(t('subscription.cancelSubscriptionMessage'));
      if (!confirmed) return;
      
      try {
        setActionLoading(true);
        console.log('Attempting to cancel subscription for user:', user.id);
        const result = await subscriptionManagementService.cancelSubscription(user.id);
        
        console.log('Cancel subscription result:', result);
        
        if (result.success) {
          alert(t('subscription.subscriptionCanceled') + ': ' + result.message);
          await loadSubscriptionData(); // Refresh data
        } else {
          console.error('Failed to cancel subscription:', result.error);
          
          // Show more specific error messages for Stripe issues
          let errorMessage = result.message;
          if (result.error === 'STRIPE_CANCELLATION_FAILED') {
            errorMessage = t('subscription.paymentSystemError');
          } else if (result.error === 'STRIPE_API_ERROR') {
            errorMessage = t('subscription.unableToReachPaymentSystem');
          }
          
          alert(t('common.error') + ': ' + errorMessage);
        }
      } catch (error) {
        console.error('Exception during subscription cancellation:', error);
        alert(t('common.error') + ': ' + t('subscription.failedToCancelSubscription'));
      } finally {
        setActionLoading(false);
      }
    } else {
      // Mobile confirmation dialog
      Alert.alert(
        t('subscription.cancelSubscriptionTitle'),
        t('subscription.cancelSubscriptionMessage'),
        [
          { text: t('subscription.keepSubscription'), style: 'cancel' },
          {
            text: t('subscription.cancelSubscription'),
            style: 'destructive',
            onPress: async () => {
              try {
                setActionLoading(true);
                console.log('Attempting to cancel subscription for user:', user.id);
                const result = await subscriptionManagementService.cancelSubscription(user.id);
                
                console.log('Cancel subscription result:', result);
                
                if (result.success) {
                  Alert.alert(t('subscription.subscriptionCanceled'), result.message);
                  await loadSubscriptionData(); // Refresh data
                } else {
                  console.error('Failed to cancel subscription:', result.error);
                  
                  // Show more specific error messages for Stripe issues
                  let errorMessage = result.message;
                  if (result.error === 'STRIPE_CANCELLATION_FAILED') {
                    errorMessage = t('subscription.paymentSystemError');
                  } else if (result.error === 'STRIPE_API_ERROR') {
                    errorMessage = t('subscription.unableToReachPaymentSystem');
                  }
                  
                  Alert.alert(t('common.error'), errorMessage);
                }
              } catch (error) {
                console.error('Exception during subscription cancellation:', error);
                Alert.alert(t('common.error'), t('subscription.failedToCancelSubscription'));
              } finally {
                setActionLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user?.id) return;

    try {
      setActionLoading(true);
      const result = await subscriptionManagementService.reactivateSubscription(user.id);
      
      if (result.success) {
        if (Platform.OS === 'web') {
          alert(t('subscription.subscriptionReactivated') + ': ' + result.message);
        } else {
          Alert.alert(t('subscription.subscriptionReactivated'), result.message);
        }
        await loadSubscriptionData(); // Refresh data
      } else {
        if (Platform.OS === 'web') {
          alert(t('common.error') + ': ' + result.message);
        } else {
          Alert.alert(t('common.error'), result.message);
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert(t('common.error') + ': ' + t('subscription.failedToReactivateSubscription'));
      } else {
        Alert.alert(t('common.error'), t('subscription.failedToReactivateSubscription'));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      alert(t('subscription.noUserIDAvailable'));
      return;
    }

    console.log('handleManageBilling called for user:', user.id);
    alert('Starting billing portal creation...');
    
    try {
      setActionLoading(true);
      console.log('Creating billing portal session...');
      const session = await subscriptionManagementService.createBillingPortalSession(user.id);
      console.log('Billing portal session result:', session);
      alert('Session result: ' + JSON.stringify(session));
      
      if (session && session.url) {
        if (Platform.OS === 'web') {
          console.log('Opening billing portal URL:', session.url);
          
          // Check if it's a relative URL (starts with /)
          let fullUrl = session.url;
          if (session.url.startsWith('/')) {
            // Construct full URL for relative paths
            fullUrl = window.location.origin + session.url;
          }
          
          alert('About to open URL: ' + fullUrl);
          const newWindow = window.open(fullUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            // Fallback if popup is blocked
            alert('Popup blocked, redirecting in same window');
            window.location.href = fullUrl;
          } else {
            alert('New window opened successfully');
          }
        } else {
          // For mobile, you might want to open in a WebView or redirect to web
          Alert.alert(
            t('subscription.manageBillingTitle'),
            t('subscription.manageBillingMessage'),
            [
              { text: t('noteDetail.cancel'), style: 'cancel' },
              { text: t('subscription.openWeb'), onPress: () => router.push('/web-home') }
            ]
          );
        }
      } else {
        console.log('No session or URL returned');
        alert('No session or URL returned: ' + JSON.stringify(session));
        if (Platform.OS === 'web') {
          alert(t('common.error') + ': ' + t('subscription.unableToCreateBillingPortalSession'));
        } else {
          Alert.alert(t('common.error'), t('subscription.unableToCreateBillingPortalSession'));
        }
      }
    } catch (error) {
      console.error('Error in handleManageBilling:', error);
      alert(t('common.error') + ': ' + (error as Error).message);
      if (Platform.OS === 'web') {
        alert(t('common.error') + ': ' + t('subscription.failedToOpenBillingPortal') + ' - ' + (error as Error).message);
      } else {
        Alert.alert(t('common.error'), t('subscription.failedToOpenBillingPortal') + ' - ' + (error as Error).message);
      }
    } finally {
      setActionLoading(false);
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
      case 'active': return t('subscription.active');
      case 'canceled': return t('subscription.canceled');
      case 'past_due': return t('subscription.pastDue');
      case 'trialing': return t('subscription.trial');
      default: return status;
    }
  };

  const formatDate = (date: Date | string | null | undefined, includeTime: boolean = false) => {
    if (!date) return t('subscription.na');
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return t('subscription.invalidDate');
      }
      
      // Use shorter format for mobile
      if (Platform.OS !== 'web') {
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
          ...(includeTime && {
            hour: 'numeric',
            minute: '2-digit'
          })
        });
      }
      
      // Web format with optional time
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(includeTime && {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return t('subscription.invalidDate');
    }
  };

  console.log('Component render - loading state:', loading);
  console.log('Component render - subscription state:', subscription);
  
  if (loading) {
    console.log('Rendering loading state');
    return (
      <ThemedView style={[styles.center, { backgroundColor }]}>
        <LoadingSpinner size={48} />
        <ThemedText style={{ marginTop: 12, color: mutedTextColor }}>{t('subscription.loadingSubscription')}</ThemedText>
      </ThemedView>
    );
  }

  const content = (
    <>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <ThemedText type="title" style={{ color: textColor }}>{t('subscription.managePremium')}</ThemedText>
          <ThemedText style={{ color: mutedTextColor, fontSize: 14, marginTop: 4 }}>
            {t('subscription.manageYourPremiumSubscription')}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.refreshButton, { backgroundColor: cardBackground }]}>
            <Ionicons name="refresh" size={20} color={accentColor} />
          </TouchableOpacity>
        </View>
      </View>

      {!subscription ? (
        <View style={styles.noSubscription}>
          <Ionicons name="card-outline" size={64} color={mutedTextColor} />
          <ThemedText type="title" style={{ marginTop: 16, color: textColor }}>{t('subscription.noActiveSubscription')}</ThemedText>
          <ThemedText style={{ marginTop: 8, color: mutedTextColor, textAlign: 'center' }}>
            {t('subscription.noActiveSubscriptionDescription')}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            onPress={() => router.push('/join-premium')}
          >
            <ThemedText style={styles.primaryButtonText}>{t('subscription.upgradeToPremium')}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Current Subscription Card */}
          <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="title" style={{ color: textColor }}>{t('subscription.currentPlan')}</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
                <ThemedText style={styles.statusText}>{getStatusText(subscription.status)}</ThemedText>
              </View>
            </View>
            
            <View style={styles.planInfo}>
              <ThemedText type="title" style={[styles.planName, { color: textColor }]}>
                {subscription.planName}
              </ThemedText>
              <View style={styles.priceRow}>
                <ThemedText style={[styles.price, { color: textColor }]}>
                  ${subscription.planPrice}
                </ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>
                  /{subscription.planInterval === 'weekly' ? t('premium.week') : 
                     subscription.planInterval === 'monthly' ? t('premium.month') : 
                     subscription.planInterval === 'yearly' ? t('premium.year') : subscription.planInterval}
                </ThemedText>
              </View>
            </View>

            <View style={styles.billingInfo}>
              <View style={styles.billingRow}>
                <ThemedText style={{ color: mutedTextColor }}>{t('subscription.billingPeriod')}</ThemedText>
                <ThemedText style={{ color: textColor, fontSize: 13 }}>
                  {formatDate(subscription.currentPeriodStart, true)}
                  {'\n'}{t('subscription.to')} {formatDate(subscription.currentPeriodEnd, true)}
                </ThemedText>
              </View>

              {subscription.nextBillingDate && !subscription.cancelAtPeriodEnd && (
                <View style={styles.billingRow}>
                  <ThemedText style={{ color: mutedTextColor }}>{t('subscription.nextBilling')}</ThemedText>
                  <ThemedText style={{ color: textColor }}>
                    {formatDate(subscription.nextBillingDate, true)}
                  </ThemedText>
                </View>
              )}
              {subscription.trialEnd && (
                <View style={styles.billingRow}>
                  <ThemedText style={{ color: mutedTextColor }}>{t('subscription.trialEnds')}</ThemedText>
                  <ThemedText style={{ color: textColor }}>
                    {formatDate(subscription.trialEnd)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, { borderColor }]}
                onPress={handleManageBilling}
                disabled={actionLoading}
              >
                <Ionicons name="card-outline" size={20} color={textColor} />
                <ThemedText style={{ marginLeft: 8, color: textColor }}>
                  {actionLoading ? t('subscription.loading') : t('subscription.manageBilling')}
                </ThemedText>
              </TouchableOpacity>

              {subscription.cancelAtPeriodEnd ? (
                // Show reactivate button if subscription is scheduled to cancel
                <TouchableOpacity 
                  style={[styles.actionButton, { borderColor: successColor }]}
                  onPress={handleReactivateSubscription}
                  disabled={actionLoading}
                >
                  <Ionicons name="refresh-outline" size={20} color={successColor} />
                  <ThemedText style={{ marginLeft: 8, color: successColor }}>
                    {actionLoading ? t('subscription.reactivating') : t('subscription.reactivateSubscription')}
                  </ThemedText>
                </TouchableOpacity>
              ) : subscription.status === 'active' ? (
                // Show cancel button if subscription is active and not scheduled to cancel
                <TouchableOpacity 
                  style={[styles.actionButton, { borderColor: errorColor }]}
                  onPress={() => {
                    console.log('Cancel button clicked!');
                    handleCancelSubscription();
                  }}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={20} color={errorColor} />
                  <ThemedText style={{ marginLeft: 8, color: errorColor }}>
                    {actionLoading ? t('subscription.canceling') : t('subscription.cancelSubscription')}
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>

            {subscription.cancelAtPeriodEnd && (
              <View style={[styles.cancelNotice, { backgroundColor: warningColor + '20' }]}>
                <Ionicons name="warning-outline" size={20} color={warningColor} />
                <ThemedText style={{ marginLeft: 8, color: warningColor, flex: 1 }}>
                  {t('subscription.subscriptionWillBeCanceled')}{' '}
                  <ThemedText style={{ fontWeight: '600', color: warningColor }}>
                    {formatDate(subscription.currentPeriodEnd, true)}
                  </ThemedText>
                  . {t('subscription.keepAccessUntil')}
                </ThemedText>
              </View>
            )}
          </View>


          {/* Billing History */}
          {billingHistory.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
              <ThemedText type="title" style={{ color: textColor, marginBottom: 16 }}>{t('subscription.billingHistory')}</ThemedText>
              {billingHistory.map((invoice) => (
                <View key={invoice.id} style={styles.billingRow}>
                  <View style={styles.billingInfo}>
                    <ThemedText style={{ color: textColor }}>{invoice.description}</ThemedText>
                    <ThemedText style={{ color: mutedTextColor, fontSize: 12 }}>
                      {formatDate(invoice.date)}
                    </ThemedText>
                  </View>
                  <View style={styles.billingAmount}>
                    <ThemedText style={{ color: textColor }}>
                      ${invoice.amount} {invoice.currency}
                    </ThemedText>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: invoice.status === 'paid' ? successColor : errorColor 
                    }]}>
                      <ThemedText style={styles.statusText}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </>
  );

  console.log('Platform.OS:', Platform.OS);
  
  // Web layout with custom header
  if (Platform.OS === 'web') {
    console.log('Rendering web layout');
    return (
      <ThemedView style={[styles.webContainer, { backgroundColor }]}>
        <View style={styles.webContent}>
          {/* Sidebar */}
          <View style={[styles.webSidebar, { backgroundColor: cardBackground }]}>
            <UserSidebar activePage="settings" />
          </View>
          
          {/* Main Content */}
          <View style={styles.webMainContent}>
            <ScrollView 
              style={styles.webScrollView}
              contentContainerStyle={styles.webScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          </View>
        </View>
      </ThemedView>
    );
  }

  // Native layout
  console.log('Rendering native layout');
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },
  
  // Custom Header Styles
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    marginBottom: 24,
    gap: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Web Layout Styles
  webContainer: {
    flex: 1,
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
  },
  webSidebar: {
    width: 280,
    position: 'absolute',
    height: '100%',
    left: 0,
    top: 0,
  },
  webMainContent: {
    flex: 1,
    marginLeft: 280,
    padding: 24,
    minHeight: '100%',
  },
  webScrollView: {
    flex: 1,
  },
  webScrollContent: {
    paddingBottom: 40,
  },
  noSubscription: { 
    alignItems: 'center', 
    padding: 32,
    marginBottom: 24
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planInfo: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  billingInfo: {
    marginBottom: 20,
    flex: 1,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  usageReset: {
    marginTop: 16,
    alignItems: 'center',
  },
  billingAmount: {
    alignItems: 'flex-end',
  },
});
