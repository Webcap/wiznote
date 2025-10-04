import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface MobilePaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  productId: string; // iOS/Android product ID for in-app purchase
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function MobilePaymentForm({ 
  planId, 
  planName, 
  planPrice, 
  productId,
  onSuccess, 
  onError 
}: MobilePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const isPremium = Boolean(user?.premium?.isActive);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const mutedTextColor = useThemeColor({}, 'muted');

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to subscribe to premium plans.');
      return;
    }

    setIsLoading(true);
    try {
      // Create Stripe checkout session for mobile users
      await createMobileCheckoutSession();
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createMobileCheckoutSession = async () => {
    try {
      const base = (
        process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL ||
        'http://127.0.0.1:3001'
      ).replace(/\/$/, '');
      
      // Create a mobile-optimized checkout session
      const response = await fetch(`${base}/stripe/create-mobile-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email || '',
          planId,
          productId,
          platform: Platform.OS,
          returnUrl: 'notez://payment-success', // Deep link back to app
          cancelUrl: 'notez://payment-cancelled',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Open the checkout URL in the device's browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        onSuccess();
      } else {
        // Fallback: show instructions to open manually
        Alert.alert(
          'Checkout Ready',
          'Please copy this link and open it in your browser to complete your subscription:\n\n' + url,
          [
            { text: 'Copy Link', onPress: () => copyToClipboard(url) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Checkout creation error:', error);
      throw error;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // For React Native, you might want to use a clipboard library
      // For now, we'll just show the text
      Alert.alert('Link Copied', 'Please paste this link in your browser:\n\n' + text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="phone-portrait" size={24} color={accentColor} />
        <ThemedText style={[styles.title, { color: textColor }]}>
          Mobile Subscription
        </ThemedText>
      </View>
      
      <View style={styles.planSummary}>
        <ThemedText style={[styles.planName, { color: textColor }]}>
          {planName}
        </ThemedText>
        <ThemedText style={[styles.planPrice, { color: textColor }]}>
          ${planPrice}/month
        </ThemedText>
      </View>
      
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

      <View style={styles.statusContainer}>
        <Ionicons name="information-circle" size={16} color={mutedTextColor} />
        <ThemedText style={[styles.statusText, { color: mutedTextColor }]}>
          Secure payment via Stripe checkout
        </ThemedText>
      </View>
      
      <TouchableOpacity
        style={[styles.subscribeButton, { backgroundColor: accentColor }]}
        onPress={handleSubscribe}
        disabled={isLoading || isPremium}
      >
        {isLoading ? (
          <LoadingSpinner size="small" color="#FFFFFF" />
        ) : isPremium ? (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <ThemedText style={styles.subscribeButtonText}>
              You're Premium
            </ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="card" size={20} color="#FFFFFF" />
            <ThemedText style={styles.subscribeButtonText}>
              Subscribe Securely
            </ThemedText>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: mutedTextColor }]}>
          Payment will be processed securely through Stripe. You'll be redirected to complete your subscription.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  planSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
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
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
