import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ApiConfig } from '../constants/ApiConfig';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
// Use server-side API for Stripe operations to avoid exposing secrets
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface PaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  planInterval?: string;
  stripePriceId?: string;
  couponId?: string;
  promotionId?: string;
  hidePlanSummary?: boolean;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ 
  planId, 
  planName, 
  planPrice, 
  planInterval = 'month',
  stripePriceId,
  couponId,
  promotionId,
  hidePlanSummary = false,
  onSuccess, 
  onError 
}: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const isPremium = Boolean(user?.premium?.isActive);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const mutedTextColor = useThemeColor({}, 'textMuted');

  const handleSubscribe = async () => {
    console.log('Subscribe button clicked!');
    console.log('User:', user);
    console.log('Plan ID:', planId);
    console.log('Stripe Price ID:', stripePriceId);
    
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to subscribe to premium plans.');
      return;
    }

    setIsLoading(true);
    try {
      // Determine the Stripe price ID from props
      const priceId = stripePriceId;
      console.log('Using price ID:', priceId);
      
      if (!priceId) {
        throw new Error('Selected plan is not ready for checkout (missing Stripe price).');
      }
      
      // Create checkout session via server API
      const isWeb = Platform.OS === 'web';
      const origin = isWeb ? (window.location?.origin || '') : '';
      
      // Construct URLs - ensure they're never empty
      let successUrl, cancelUrl;
      
      if (isWeb && origin) {
        // Web platform with valid origin
        successUrl = `${origin}/payment-success?plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${origin}/payment-cancelled?plan=${encodeURIComponent(planId)}`;
      } else {
        // Mobile platform or no origin - use a configurable fallback
        const fallbackBase = process.env.EXPO_PUBLIC_APP_URL || 'https://wiznote.app';
        successUrl = `${fallbackBase}/payment-success?plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = `${fallbackBase}/payment-cancelled?plan=${encodeURIComponent(planId)}`;
      }

      console.log('Using webhook base URL:', ApiConfig.WEBHOOK_BASE_URL, '(Environment:', ApiConfig.IS_DEVELOPMENT ? 'DEV' : 'PROD', ')');
      const endpoint = ApiConfig.STRIPE.CREATE_CHECKOUT;
      
      console.log('Webhook base URL:', ApiConfig.WEBHOOK_BASE_URL);
      console.log('Endpoint:', endpoint);
      console.log('Request payload:', {
        userId: user.id,
        email: user.email || '',
        planId,
        priceId,
        successUrl,
        cancelUrl,
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || '',
          planId,
          priceId,
          successUrl,
          cancelUrl,
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const payload = await response.json().catch(() => ({} as any));
      console.log('Response payload:', payload);
      
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Failed to create checkout session');
      }
      const checkoutUrl = payload.url as string;
      
      console.log('Checkout URL:', checkoutUrl);
      
      // Redirect to Stripe checkout
      if (Platform.OS === 'web') {
        window.location.href = checkoutUrl;
      } else {
        // For mobile, you might want to use a WebView or deep link
        Alert.alert('Mobile Checkout', 'Please complete your subscription on the web version.');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackground }]}>
      {!hidePlanSummary && (
        <>
          <View style={styles.header}>
            <Ionicons name="card" size={24} color={accentColor} />
            <ThemedText style={[styles.title, { color: textColor }]}>
              Complete Your Subscription
            </ThemedText>
          </View>
          
          <View style={styles.planSummary}>
            <ThemedText style={[styles.planName, { color: textColor }]}>
              {planName}
            </ThemedText>
            <ThemedText style={[styles.planPrice, { color: textColor }]}>
              ${planPrice}/{planInterval === 'monthly' ? 'month' : planInterval === 'yearly' ? 'year' : planInterval === 'weekly' ? 'week' : planInterval}
            </ThemedText>
          </View>
        </>
      )}
      
      <View style={styles.features}>
        <ThemedText style={[styles.featuresTitle, { color: textColor }]}>
          What's included:
        </ThemedText>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={16} color={accentColor} />
          <ThemedText style={[styles.featureText, { color: mutedTextColor }]}>
            Unlimited notes and storage
          </ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={16} color={accentColor} />
          <ThemedText style={[styles.featureText, { color: mutedTextColor }]}>
            Advanced AI features
          </ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={16} color={accentColor} />
          <ThemedText style={[styles.featureText, { color: mutedTextColor }]}>
            Priority support
          </ThemedText>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.subscribeButton, { backgroundColor: accentColor }]}
        onPress={handleSubscribe}
        disabled={isLoading || isPremium}
      >
        {isLoading ? (
          <LoadingSpinner size={20} color="#FFFFFF" />
        ) : isPremium ? (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <ThemedText style={styles.subscribeButtonText}>
              You’re Premium
            </ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="card" size={20} color="#FFFFFF" />
            <ThemedText style={styles.subscribeButtonText}>
              Subscribe Now
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
      
      <ThemedText style={[styles.securityNote, { color: mutedTextColor }]}>
        🔒 Secure payment powered by Stripe
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  planSummary: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6A5ACD',
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityNote: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});
