import { Ionicons } from '@expo/vector-icons';
import {
  StripeProvider,
  usePaymentSheet
} from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ApiConfig } from '../constants/ApiConfig';
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
  hidePlanSummary?: boolean; // Hide plan summary when shown elsewhere
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
  hidePlanSummary = false,
  onSuccess, 
  onError 
}: PaymentSheetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentSheetReady, setIsPaymentSheetReady] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const intentIdRef = useRef<string | null>(null);
  const [intentType, setIntentType] = useState<'setup' | 'payment'>('setup');
  const { user, validateCurrentUser, forceRefreshSession } = useAuth();
  const router = useRouter(); // Add router for navigation
  const isPremium = Boolean(user?.premium?.isActive);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const mutedTextColor = useThemeColor({}, 'textSecondary');

  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  // Debug: Track intentId changes
  useEffect(() => {
    console.log(`${intentType}Id state changed to:`, intentId);
  }, [intentId, intentType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('PaymentSheetForm unmounting, clearing state');
      setIntentId(null);
      intentIdRef.current = null;
      setIsPaymentSheetReady(false);
    };
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to subscribe to premium plans.');
      return;
    }

    // Reset state on new attempt

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

      console.log('Creating PaymentSheet for user:', user.id, 'plan:', planId, 'stripePriceId:', stripePriceId);
      console.log('Using webhook base URL:', ApiConfig.WEBHOOK_BASE_URL, '(Environment:', ApiConfig.IS_DEVELOPMENT ? 'DEV' : 'PROD', ')');
      console.log('Full endpoint URL:', ApiConfig.STRIPE.CREATE_PAYMENTSHEET);
      
      // Create PaymentSheet configuration
      const requestBody = {
        userId: user.id,
        email: user.email || '',
        planId,
        stripePriceId, // Add this to match web version
        platform: Platform.OS,
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(ApiConfig.STRIPE.CREATE_PAYMENTSHEET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType?.includes('application/json')) {
          errorData = await response.json().catch(() => ({}));
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText.substring(0, 500));
          errorData = { error: 'Server returned non-JSON response', details: errorText.substring(0, 200) };
        }
        
        console.error('PaymentSheet creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: ApiConfig.STRIPE.CREATE_PAYMENTSHEET
        });
        
        // Handle specific error cases with user-friendly messages
        const errorMessage = errorData.error || errorData.details || 'Failed to create PaymentSheet';
        const errorDetails = errorData.details || '';
        
        // Check for missing Stripe customer error
        if (errorDetails.includes('No such customer') || errorMessage.includes('No such customer')) {
          throw new Error('Payment account setup required. Please contact support or try again in a moment.');
        }
        
        // Check for authentication/authorization errors
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please sign in again.');
        }
        
        // Check for server errors
        if (response.status >= 500) {
          throw new Error('Payment service temporarily unavailable. Please try again in a moment.');
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const { 
        setupIntent, 
        setupIntentId, 
        paymentIntent, 
        paymentIntentId: responsePaymentIntentId, 
        ephemeralKey, 
        customer, 
        publishableKey,
        planId: responsePlanId,
        stripePriceId: responseStripePriceId
      } = responseData;
      
      // Determine if we're using SetupIntent or PaymentIntent
      const isUsingSetup = !!setupIntent;
      const clientSecret = setupIntent || paymentIntent;
      const responseIntentId = setupIntentId || responsePaymentIntentId;
      
      console.log('PaymentSheet response:', { 
        isUsingSetupIntent: isUsingSetup,
        hasClientSecret: !!clientSecret, 
        hasIntentId: !!responseIntentId,
        hasEphemeralKey: !!ephemeralKey,
        hasCustomer: !!customer 
      });
      
      // Validate all required fields
      if (!clientSecret) {
        throw new Error('No payment/setup intent received');
      }

      if (!responseIntentId) {
        throw new Error('No intent ID received');
      }

      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }

      if (!customer) {
        throw new Error('No customer ID received');
      }

      console.log('All required PaymentSheet data received successfully');

      // Store the intent ID and type
      setIntentId(responseIntentId);
      intentIdRef.current = responseIntentId;
      setIntentType(isUsingSetup ? 'setup' : 'payment');
      console.log(`${isUsingSetup ? 'Setup' : 'Payment'} intent ID set:`, responseIntentId);

      // Initialize PaymentSheet with appropriate intent
      console.log('Initializing PaymentSheet with:', {
        merchantDisplayName: 'Wiznote',
        customerId: customer,
        hasEphemeralKey: !!ephemeralKey,
        intentType: isUsingSetup ? 'setup' : 'payment',
        allowsDelayedPaymentMethods: false,
        returnURL: 'notez://payment-success',
      });

      const initConfig = {
        merchantDisplayName: 'Wiznote',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        allowsDelayedPaymentMethods: false,
        returnURL: 'notez://payment-success',
      };

      // Add the appropriate intent secret
      if (isUsingSetup) {
        initConfig.setupIntentClientSecret = clientSecret;
      } else {
        initConfig.paymentIntentClientSecret = clientSecret;
      }

      const { error } = await initPaymentSheet(initConfig);

      if (error) {
        console.error('PaymentSheet init error:', error);
        throw new Error('Failed to initialize payment form');
      }

      console.log('PaymentSheet initialized successfully');
      
      setIsPaymentSheetReady(true);
      
      try {
        // Present PaymentSheet immediately to avoid expiration
        // Note: Setup intents expire quickly, so we present immediately after initialization
        console.log('Presenting PaymentSheet immediately after initialization...');
        
        // Small delay to ensure initialization is complete (but minimal to avoid expiration)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { error: presentError } = await presentPaymentSheet();
        
        if (presentError) {
          if (presentError.code === 'Canceled') {
            console.log('Payment cancelled by user');
            onError('Payment was cancelled');
          } else {
            console.error('PaymentSheet present error:', presentError);
            
            // Handle specific Stripe errors with user-friendly messages
            const errorMessage = presentError.message || '';
            const errorCode = presentError.stripeErrorCode || '';
            
            // Check for expired or missing setup/payment intent
            if (
              errorMessage.includes('No such setupintent') ||
              errorMessage.includes('No such paymentintent') ||
              errorMessage.includes('No such setup intent') ||
              errorMessage.includes('No such payment intent') ||
              errorCode === 'resource_missing'
            ) {
              // Intent expired or missing - this is likely a backend issue
              // The stripe-guardian service may be creating intents with too short expiration
              console.error('Setup intent expired or missing:', {
                errorMessage,
                errorCode,
                intentId: intentId || intentIdRef.current,
                intentType,
                timestamp: new Date().toISOString(),
                note: 'This may indicate the backend is creating intents with too short expiration time'
              });
              
              setIntentId(null);
              intentIdRef.current = null;
              setIsPaymentSheetReady(false);
              
              // Provide helpful error message
              onError('Payment session expired too quickly. This may be a backend configuration issue. Please try again or contact support.');
              return;
            }
            
            // Check for authentication errors
            if (errorCode === 'authentication_required' || errorMessage.includes('authentication')) {
              onError('Payment authentication required. Please try again.');
              return;
            }
            
            // Generic error message
            onError(`Payment failed: ${errorMessage || 'Unknown error occurred'}`);
          }
        } else {
          console.log('Payment completed successfully!');
          
          // Payment successful - now confirm and create subscription
          console.log(`${intentType} intent ID before confirmation:`, intentId);
          console.log(`${intentType} intent ID ref before confirmation:`, intentIdRef.current);
          
          // Use ref as fallback if state is lost
          const currentIntentId = intentId || intentIdRef.current;
          
          if (!currentIntentId) {
            console.error(`${intentType} intent ID lost after successful payment`);
            throw new Error(`${intentType} intent ID lost after successful payment`);
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
        setIntentId(null);
        intentIdRef.current = null;
        setIsPaymentSheetReady(false);
        throw presentError;
      }
      
    } catch (error) {
      console.error('PaymentSheet creation error:', error);
      // Reset state on error
      setIntentId(null);
      intentIdRef.current = null;
      setIsPaymentSheetReady(false);
      throw error;
    }
  };

  const confirmPaymentSheetPayment = async () => {
    console.log(`confirmPaymentSheetPayment called with ${intentType}IntentId:`, intentId);
    console.log('confirmPaymentSheetPayment ref value:', intentIdRef.current);
    
    // Check if user is still authenticated
    if (!user?.id) {
      throw new Error('User authentication lost during payment confirmation');
    }
    
    // Check if planId is still valid
    if (!planId) {
      throw new Error('Plan ID is missing during payment confirmation');
    }
    
    // Use ref as fallback if state is lost
    const currentIntentId = intentId || intentIdRef.current;
    
    if (!currentIntentId) {
      console.error(`${intentType} intent ID is null or undefined in both state and ref`);
      throw new Error(`No ${intentType} intent ID available`);
    }

    console.log(`Confirming payment with ${intentType} intent ID:`, currentIntentId);

    try {
      console.log('Sending confirmation to:', ApiConfig.STRIPE.CONFIRM_PAYMENTSHEET);
      
      // Confirm payment and create subscription
      // Send both setupIntentId and paymentIntentId for backward compatibility
      const requestBody = {
        planId,
        userId: user?.id,
        stripePriceId: stripePriceId,
      };
      
      if (intentType === 'setup') {
        requestBody.setupIntentId = currentIntentId;
      } else {
        requestBody.paymentIntentId = currentIntentId;
      }
      
      const response = await fetch(ApiConfig.STRIPE.CONFIRM_PAYMENTSHEET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
      
      // Clear the intent ID after successful confirmation
      setIntentId(null);
      intentIdRef.current = null;
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackground }]}>
      {!hidePlanSummary && (
        <>
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
