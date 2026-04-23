import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UnifiedPaymentForm } from '../components/UnifiedPaymentForm';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { PromotionCard } from '../components/PromotionCard';
import { getProductId } from '../constants/InAppPurchaseConfig';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { usePromotions } from '../hooks/usePromotions';
import { useTranslation } from '../hooks/useTranslation';
import { planManagementService } from '../services/PlanManagementService';
import type { EnhancedPlan } from '../types/EnhancedPlans';
import type { Promotion } from '../types/Promotion';
import { useSystemSettings } from '../hooks/useSystemSettings';

export default function JoinPremiumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const { user } = useAuth();
  const searchParams = useLocalSearchParams();

  // Theme colors following design.json specifications
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const tintColor = useThemeColor({}, 'tint');

  const shutdownDateStr = settings?.sunsetShutdownDate.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) || 'May 23, 2026';

  const [plans, setPlans] = useState<EnhancedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Promotion support
  const { eligiblePromotions } = usePromotions(user?.id);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  
  // Get promo code from URL params
  useEffect(() => {
    console.log('Join Premium - Search params:', searchParams);
    console.log('Join Premium - Eligible promotions:', eligiblePromotions.length);
    
    const promotionId = searchParams.promotionId as string;
    const couponId = searchParams.couponId as string;
    
    if (promotionId && eligiblePromotions.length > 0) {
      console.log('Join Premium - Looking for promotion ID:', promotionId);
      const promo = eligiblePromotions.find(p => p.id === promotionId);
      if (promo) {
        console.log('Join Premium - Found and applied promotion:', promo.name);
        setAppliedPromotion(promo);
      } else {
        console.warn('Join Premium - Promotion not found in eligible promotions');
      }
    } else if (couponId) {
      console.log('Join Premium - Coupon ID provided:', couponId);
      // Try to find promotion by coupon ID
      const promo = eligiblePromotions.find(p => p.stripeCouponId === couponId);
      if (promo) {
        console.log('Join Premium - Found promotion by coupon ID:', promo.name);
        setAppliedPromotion(promo);
      }
    }
  }, [searchParams.promotionId, searchParams.couponId, eligiblePromotions]);

  // Helper function to format interval display
  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'monthly':
        return t('premium.month');
      case 'weekly':
        return t('premium.week');
      case 'yearly':
        return t('premium.year');
      case 'one-time':
        return t('premium.oneTime');
      default:
        return interval;
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (price: number, promotion: Promotion) => {
    if (promotion.discountType === 'percentage') {
      return price * (1 - promotion.discountValue / 100);
    } else {
      return Math.max(0, price - promotion.discountValue);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { plans: live } = await planManagementService.listPlans({
          filters: { isActive: true } as any,
          sortBy: 'price',
          sortOrder: 'asc',
          limit: 50,
          page: 1,
        } as any);
        if (!mounted) return;
        setPlans(live);
        if (live.length > 0) {
          setSelectedPlanId(live.find(p => p.isPopular)?.id || live[0].id);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : t('premium.failedToLoadPlans'));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId]);

  const handleSuccess = () => {
    if (Platform.OS === 'web') {
      router.replace('/');
    }
    // Mobile users will be navigated to the thank you page by PaymentSheet
    // No need for alert dialog anymore
  };

  const handleError = (message: string) => {
    Alert.alert(t('premium.paymentError'), message);
  };

  if (settings?.sunsetModeEnabled) {
    return (
      <WebLayout
        title="Premium Purchases Disabled"
        sidebar={<UserSidebar />}
      >
        <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor }}>
          <Ionicons name="star-outline" size={80} color={accentWarning} />
          <ThemedText style={{ fontSize: 28, fontWeight: 'bold', marginTop: 24, textAlign: 'center', color: textColor }}>
            Premium Purchases are Disabled
          </ThemedText>
          <ThemedText style={{ fontSize: 18, marginTop: 16, textAlign: 'center', maxWidth: 600, color: textSecondaryColor }}>
            WizNote is sunsetting on <ThemedText style={{ fontWeight: 'bold' }}>{shutdownDateStr}</ThemedText>. New premium subscriptions are no longer being accepted as we prepare to decommission the platform.
          </ThemedText>
          <ThemedText style={{ fontSize: 16, marginTop: 12, textAlign: 'center', color: textSecondaryColor }}>
            Existing premium users will maintain their benefits until the shutdown date.
          </ThemedText>
          <TouchableOpacity 
            style={{ marginTop: 40, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: accentPrimary }}
            onPress={() => router.replace('/(tabs)')}
          >
            <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Go to My Notes</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </WebLayout>
    );
  }

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor }]}>
        <LoadingSpinner size={50} />
        <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>
          {t('premium.loadingPremiumPlans')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.errorContainer, { backgroundColor }]}>
        <Ionicons name="alert-circle" size={64} color={accentDanger} />
        <ThemedText style={[styles.errorTitle, { color: textColor }]}>
          {t('premium.couldNotLoadPlans')}
        </ThemedText>
        <ThemedText style={[styles.errorMessage, { color: textSecondaryColor }]}>
          {error}
        </ThemedText>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: accentPrimary }]} 
          onPress={() => router.replace('/join-premium')}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <ThemedText style={[styles.retryButtonText, { color: '#FFFFFF' }]}>{t('premium.tryAgain')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const content = (
    <>
      {/* Premium Status */}
      {user?.premium?.isActive && (
        <ThemedView style={[styles.premiumStatusCard, { backgroundColor: backgroundSecondary }]}>
          <Ionicons name="checkmark-circle" size={24} color={accentSuccess} />
          <ThemedText style={[styles.premiumStatusText, { color: textColor }]}>
            {t('premium.alreadyHaveActiveSubscription')}
          </ThemedText>
        </ThemedView>
      )}

      {/* Applied Promotion Banner */}
      {appliedPromotion && (
        <ThemedView style={[styles.appliedPromoBanner, { backgroundColor: accentSuccess }]}>
          <View style={styles.promoBannerContent}>
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <View style={styles.promoBannerText}>
              <ThemedText style={[styles.promoBannerTitle, { color: '#FFFFFF' }]}>
                {t('premium.promotionApplied')}
              </ThemedText>
              <ThemedText style={[styles.promoBannerSubtitle, { color: '#FFFFFF' }]}>
                {appliedPromotion.discountType === 'percentage'
                  ? t('premium.savingPercentage', { percentage: appliedPromotion.discountValue })
                  : t('premium.savingAmount', { amount: appliedPromotion.discountValue })}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.removePromoButton}
              onPress={() => setAppliedPromotion(null)}
            >
              <ThemedText style={[styles.removePromoText, { color: '#FFFFFF' }]}>{t('premium.remove')}</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      )}

      {/* Promotions */}
      {!user?.premium?.isActive && !appliedPromotion && eligiblePromotions.length > 0 && (
        <ThemedView style={styles.promotionsSection}>
          {eligiblePromotions
            .filter(p => p.displayMethods.includes('inline'))
            .slice(0, 1)
            .map(promo => (
              <PromotionCard
                key={promo.id}
                promotion={promo}
                onPress={(p) => setAppliedPromotion(p)}
              />
            ))}
        </ThemedView>
      )}

      {/* Plans Section */}
      <ThemedView style={styles.plansSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          {t('premium.chooseYourPlan')}
        </ThemedText>
        <View style={styles.planGrid}>
          {plans.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                { 
                  backgroundColor: plan.id === selectedPlanId ? backgroundSecondary : backgroundTertiary,
                  borderColor: plan.id === selectedPlanId ? accentPrimary : 'transparent',
                  borderWidth: plan.id === selectedPlanId ? 2 : 0
                }
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
              activeOpacity={0.8}
            >
              <View style={styles.planHeader}>
                <ThemedText style={[styles.planName, { color: textColor }]}>
                  {plan.name}
                </ThemedText>
                {plan.isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: accentSuccess }]}>
                    <ThemedText style={[styles.popularBadgeText, { color: '#FFFFFF' }]}>{t('premium.popular')}</ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.priceContainer}>
                {appliedPromotion && (
                  <View style={styles.priceWithDiscount}>
                    <ThemedText style={[styles.originalPrice, { color: textMutedColor }]}>
                      ${plan.price}
                    </ThemedText>
                    <ThemedText style={[styles.price, { color: accentSuccess }]}>
                      ${calculateDiscountedPrice(plan.price, appliedPromotion).toFixed(2)}
                    </ThemedText>
                    <ThemedText style={[styles.interval, { color: textSecondaryColor }]}>
                      /{formatInterval(plan.interval)}
                    </ThemedText>
                  </View>
                )}
                {!appliedPromotion && (
                  <>
                    <ThemedText style={[styles.price, { color: textColor }]}>
                      ${plan.price}
                    </ThemedText>
                    <ThemedText style={[styles.interval, { color: textSecondaryColor }]}>
                      /{formatInterval(plan.interval)}
                    </ThemedText>
                  </>
                )}
              </View>
              
              <ThemedText style={[styles.planDescription, { color: textSecondaryColor }]} numberOfLines={3}>
                {plan.description}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      {/* Payment Form */}
      {selectedPlan && (
        <ThemedView style={[styles.paymentSection, { backgroundColor: backgroundSecondary }]}>
          <ThemedText style={[styles.paymentSectionTitle, { color: textColor }]}>
            {t('premium.completeYourSubscription')}
          </ThemedText>
          
          {/* Discount Summary */}
          {appliedPromotion && (
            <ThemedView style={[styles.discountSummary, { backgroundColor: backgroundTertiary }]}>
              <View style={styles.discountRow}>
                <ThemedText style={[styles.discountLabel, { color: textSecondaryColor }]}>
                  {t('premium.originalPrice')}
                </ThemedText>
                <ThemedText style={[styles.discountOriginal, { color: textMutedColor }]}>
                  ${selectedPlan.price}
                </ThemedText>
              </View>
              <View style={styles.discountRow}>
                <ThemedText style={[styles.discountLabel, { color: textSecondaryColor }]}>
                  {t('premium.discount', { name: appliedPromotion.name })}
                </ThemedText>
                <ThemedText style={[styles.discountAmount, { color: accentSuccess }]}>
                  {appliedPromotion.discountType === 'percentage'
                    ? `-${appliedPromotion.discountValue}%`
                    : `-$${appliedPromotion.discountValue}`}
                </ThemedText>
              </View>
              <View style={[styles.discountRow, styles.discountTotal]}>
                <ThemedText style={[styles.discountLabel, styles.totalLabel, { color: textColor }]}>
                  {t('premium.yourPrice')}
                </ThemedText>
                <ThemedText style={[styles.totalPrice, { color: accentSuccess }]}>
                  ${calculateDiscountedPrice(selectedPlan.price, appliedPromotion).toFixed(2)}/{formatInterval(selectedPlan.interval)}
                </ThemedText>
              </View>
            </ThemedView>
          )}
          
          <UnifiedPaymentForm
            planId={selectedPlan.id}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            couponId={appliedPromotion?.stripeCouponId}
            promotionId={appliedPromotion?.id}
            planInterval={selectedPlan.interval}
            stripePriceId={selectedPlan.stripePriceId}
            productId={Platform.OS === 'ios' || Platform.OS === 'android' ? getProductId(selectedPlan.id, Platform.OS as 'ios' | 'android') : undefined}
            hidePlanSummary={!!appliedPromotion}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </ThemedView>
      )}
    </>
  );

  // Web layout wrapper
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Join Premium"
        subtitle="Upgrade your Notez experience"
        sidebar={<UserSidebar activePage="home" />}
        header={
          <View style={styles.webHeader}>
            <TouchableOpacity style={[styles.webBackButton, { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={textColor} />
              <ThemedText style={[styles.webBackText, { color: textColor }]}>Back to Notes</ThemedText>
            </TouchableOpacity>
            <View style={styles.webHeaderContent}>
              <View style={[styles.webHeaderIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Ionicons name="star" size={32} color={accentPrimary} />
              </View>
              <ThemedText style={[styles.webHeaderTitle, { color: textColor }]}>Join Premium</ThemedText>
              <ThemedText style={[styles.webHeaderSubtitle, { color: textSecondaryColor }]}>
                Unlock advanced AI, higher limits, and priority support
              </ThemedText>
            </View>
          </View>
        }
        scrollable
      >
        {content}
      </WebLayout>
    );
  }

  // Native layout following design.json specifications
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}> 
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section for Mobile */}
        <ThemedView style={[styles.headerSection, { backgroundColor: backgroundSecondary }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <Ionicons name="star" size={32} color={accentPrimary} />
            </View>
            <ThemedText style={[styles.headerTitle, { color: textColor }]}>
              Join Premium
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
              Unlock advanced AI, higher limits, and priority support
            </ThemedText>
          </View>
        </ThemedView>

        {/* Back Navigation for Mobile */}
        <TouchableOpacity style={[styles.backButton, { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={textColor} />
          <ThemedText style={[styles.backButtonText, { color: textColor }]}>
            Back to Notes
          </ThemedText>
        </TouchableOpacity>

        {content}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  retryButtonText: { marginLeft: 8, color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  headerSection: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, textAlign: 'center' },
  premiumStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  premiumStatusText: { fontSize: 16, fontWeight: '600', marginLeft: 10 },
  plansSection: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  planCard: {
    flexBasis: '48%',
    borderRadius: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
  },
  popularBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  popularBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
  },
  interval: {
    fontSize: 16,
    marginLeft: 5,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  paymentSection: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  paymentSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  // Web header styles
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  webBackText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  webHeaderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  webHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  promotionsSection: {
    marginBottom: 16,
  },
  appliedPromoBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6
      },
      android: {
        elevation: 4
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
      }
    })
  },
  promoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  promoBannerText: {
    flex: 1
  },
  promoBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  promoBannerSubtitle: {
    fontSize: 14,
    opacity: 0.95
  },
  removePromoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  removePromoText: {
    fontSize: 13,
    fontWeight: '600'
  },
  priceWithDiscount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8
  },
  originalPrice: {
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid'
  },
  discountSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  discountTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
    marginTop: 8
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700'
  },
  discountOriginal: {
    fontSize: 14,
    textDecorationLine: 'line-through'
  },
  discountAmount: {
    fontSize: 16,
    fontWeight: '600'
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold'
  }
});


