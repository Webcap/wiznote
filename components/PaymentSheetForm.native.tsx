import { Ionicons } from '@expo/vector-icons';
import {
  StripeProvider,
  usePaymentSheet
} from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface PaymentSheetFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  planInterval?: string;
  productId: string;
  stripePriceId?: string; // Add this missing prop
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentSheetFormContent({ 
  planId, 
  planName, 
  planPrice, 
  planInterval = 'month',
  productId,
  stripePriceId, // Add this parameter
  onSuccess, 
  onError 
}: PaymentSheetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentSheetReady, setIsPaymentSheetReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const paymentIntentIdRef = useRef<string | null>(null);
  const { user, validateCurrentUser, forceRefreshSession } = useAuth();
  const router = useRouter(); // Add router for navigation
  const isPremium = Boolean(user?.premium?.isActive);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const mutedTextColor = useThemeColor({}, 'textSecondary');

  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  // Debug: Track paymentIntentId changes
  useEffect(() => {
    console.log('PaymentIntentId state changed to:', paymentIntentId);
  }, [paymentIntentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('PaymentSheetForm unmounting, clearing state');
      setPaymentIntentId(null);
      paymentIntentIdRef.current = null;
      setIsPaymentSheetReady(false);
    };
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to subscribe to premium plans.');
      return;
    }

    // Validate user before proceeding
    try {
      let isValid = await validateCurrentUser();
      
      // If validation fails, try to force refresh the session (mobile recovery)
      if (!isValid) {
        console.log('PaymentSheet: User validation failed, attempting session refresh...');
        const refreshedUser = await forceRefreshSession();
        if (refreshedUser) {
          console.log('PaymentSheet: Session refreshed successfully');
          isValid = true;
        } else {
          Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
          return;
        }
      }
    } catch (error) {
      console.error('User validation error:', error);
      Alert.alert('Authentication Error', 'Please sign in again to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await createPaymentSheet();
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const createPaymentSheet = async () => {
    try {
      // Double-check user is still valid before making the request
      if (!user?.id) {
        throw new Error('User session expired. Please sign in again.');
      }

      const base = (
        process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL ||
        'http://127.0.0.1:3001'
      ).replace(/\/$/, '');
      
      console.log('Creating PaymentSheet for user:', user.id, 'plan:', planId, 'stripePriceId:', stripePriceId);
      
      // Create PaymentSheet configuration
      const response = await fetch(`${base}/stripe/create-paymentsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || '',
          planId,
          stripePriceId, // Add this to match web version
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create PaymentSheet');
      }

      const { paymentIntent, paymentIntentId: responsePaymentIntentId, ephemeralKey, customer, publishableKey } = await response.json();
      
      console.log('PaymentSheet response:', { 
        hasPaymentIntent: !!paymentIntent, 
        hasPaymentIntentId: !!responsePaymentIntentId,
        hasEphemeralKey: !!ephemeralKey,
        hasCustomer: !!customer 
      });
      
      // Validate all required fields
      if (!paymentIntent) {
        throw new Error('No payment intent received');
      }

      if (!responsePaymentIntentId) {
        throw new Error('No payment intent ID received');
      }

      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }

      if (!customer) {
        throw new Error('No customer ID received');
      }

      console.log('All required PaymentSheet data received successfully');

      // Use the payment intent ID directly from the response
      setPaymentIntentId(responsePaymentIntentId);
      paymentIntentIdRef.current = responsePaymentIntentId;
      console.log('Payment intent ID set:', responsePaymentIntentId);

      // Initialize PaymentSheet
      console.log('Initializing PaymentSheet with:', {
        merchantDisplayName: 'Wiznote',
        customerId: customer,
        hasEphemeralKey: !!ephemeralKey,
        hasPaymentIntent: !!paymentIntent,
        allowsDelayedPaymentMethods: false,
        returnURL: 'notez://payment-success',
      });

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Wiznote',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        returnURL: 'notez://payment-success',
      });

      if (error) {
        console.error('PaymentSheet init error:', error);
        throw new Error('Failed to initialize payment form');
      }

      console.log('PaymentSheet initialized successfully');
      
      setIsPaymentSheetReady(true);
      
      try {
        // Present PaymentSheet
        console.log('Presenting PaymentSheet...');
        
        const { error: presentError } = await presentPaymentSheet();
        
        if (presentError) {
          if (presentError.code === 'Canceled') {
            console.log('Payment cancelled by user');
            onError('Payment was cancelled');
          } else {
            console.error('PaymentSheet present error:', presentError);
            onError(`Payment failed: ${presentError.message}`);
          }
        } else {
          console.log('Payment completed successfully!');
          
          // Payment successful - now confirm and create subscription
          console.log('Payment intent ID before confirmation:', paymentIntentId);
          console.log('Payment intent ID ref before confirmation:', paymentIntentIdRef.current);
          
          // Use ref as fallback if state is lost
          const currentPaymentIntentId = paymentIntentId || paymentIntentIdRef.current;
          
          if (!currentPaymentIntentId) {
            console.error('Payment intent ID lost after successful payment');
            throw new Error('Payment intent ID lost after successful payment');
          }
          
          console.log('Proceeding with payment confirmation...');
          await confirmPaymentSheetPayment();
          console.log('Payment confirmation completed successfully');
          
          // Navigate to thank you page instead of showing alert
          router.replace('/payment-success-mobile');
          
          // Call onSuccess callback for any additional logic
          onSuccess();
        }
        
      } catch (presentError) {
        console.error('PaymentSheet presentation error:', presentError);
        // Reset state on error
        setPaymentIntentId(null);
        paymentIntentIdRef.current = null;
        setIsPaymentSheetReady(false);
        throw presentError;
      }
      
    } catch (error) {
      console.error('PaymentSheet creation error:', error);
      // Reset state on error
      setPaymentIntentId(null);
      paymentIntentIdRef.current = null;
      setIsPaymentSheetReady(false);
      throw error;
    }
  };

  const confirmPaymentSheetPayment = async () => {
    console.log('confirmPaymentSheetPayment called with paymentIntentId:', paymentIntentId);
    console.log('confirmPaymentSheetPayment ref value:', paymentIntentIdRef.current);
    
    // Check if user is still authenticated
    if (!user?.id) {
      throw new Error('User authentication lost during payment confirmation');
    }
    
    // Check if planId is still valid
    if (!planId) {
      throw new Error('Plan ID is missing during payment confirmation');
    }
    
    // Use ref as fallback if state is lost
    const currentPaymentIntentId = paymentIntentId || paymentIntentIdRef.current;
    
    if (!currentPaymentIntentId) {
      console.error('Payment intent ID is null or undefined in both state and ref');
      throw new Error('No payment intent ID available');
    }

    console.log('Confirming payment with ID:', currentPaymentIntentId);

    try {
      const base = (
        process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL ||
        'http://127.0.0.1:3001'
      ).replace(/\/$/, '');
      
      if (!base || base === 'http://127.0.0.1:3001') {
        console.warn('Using fallback webhook base URL:', base);
      }
      
      console.log('Sending confirmation to:', `${base}/stripe/confirm-paymentsheet`);
      
      // Confirm payment and create subscription
      const response = await fetch(`${base}/stripe/confirm-paymentsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: currentPaymentIntentId,
          planId,
          userId: user?.id,
        }),
      });

      console.log('Confirmation response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Confirmation error response:', errorData);
        throw new Error(errorData.error || `Failed to confirm payment: ${response.status} ${response.statusText}`);
      }

      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Invalid response format from confirmation endpoint');
      }

      const result = await response.json();
      console.log('Payment confirmed successfully:', result);
      
      // Verify the result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from confirmation endpoint');
      }
      
      // Verify the result
      if (!result.success) {
        throw new Error(result.error || 'Payment confirmation failed');
      }
      
      // Verify subscription was created
      if (!result.subscriptionId) {
        console.warn('No subscription ID in confirmation result:', result);
      }
      
      console.log('Payment confirmation completed with subscription ID:', result.subscriptionId);
      
      // Clear the payment intent ID after successful confirmation
      setPaymentIntentId(null);
      paymentIntentIdRef.current = null;
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="card" size={24} color={accentColor} />
        <ThemedText style={[styles.title, { color: textColor }]}>
          Native Payment
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
        <Ionicons name="shield-checkmark" size={16} color={accentColor} />
        <ThemedText style={[styles.statusText, { color: mutedTextColor }]}>
          Secure native payment via Stripe
        </ThemedText>
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
          Payment will be processed securely through Stripe PaymentSheet. No need to leave the app!
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export function PaymentSheetForm(props: PaymentSheetFormProps) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  
  if (!publishableKey) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>
          Stripe configuration missing. Please contact support.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <PaymentSheetFormContent {...props} />
    </StripeProvider>
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
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#FF6B6B',
  },
});
