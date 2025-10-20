/**
 * API Configuration
 * Handles environment-specific API endpoints for development vs production
 */

import Constants from 'expo-constants';

/**
 * Determine if this is a development build
 */
const isDevelopment = () => {
  // Check if APP_VARIANT is development
  if (process.env.APP_VARIANT === 'development') {
    return true;
  }
  
  // Check if NODE_ENV is development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Check if running in Expo Go or development mode
  if (Constants.appOwnership === 'expo' || __DEV__) {
    return true;
  }
  
  return false;
};

/**
 * Get the appropriate Webhook Base URL based on environment
 */
export const getWebhookBaseUrl = (): string => {
  // Allow manual override via environment variable
  const envUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  // Development/Test: Use Render with Stripe TEST keys
  // Set EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL in your .env.development
  if (isDevelopment()) {
    const testUrl = process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL;
    if (testUrl) {
      return testUrl.replace(/\/$/, '');
    }
    // Fallback to production if test URL not configured
    console.warn('⚠️  EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL not set, using production Stripe Guardian');
  }
  
  // Production: Use Starlight Hyperlift with Stripe LIVE keys
  return 'https://api.webcap.media/api';
};

/**
 * Build full API endpoint URL by appending path to base URL
 * Handles different URL formats for different environments
 */
const getApiPath = (path: string): string => {
  const baseUrl = getWebhookBaseUrl();
  
  // If base URL already includes /api at the end (like Starlight Hyperlift)
  // Remove /api from the path to avoid duplication
  if (baseUrl.endsWith('/api')) {
    const cleanPath = path.replace(/^\/api/, '');
    return `${baseUrl}${cleanPath}`;
  }
  
  // Otherwise (like Render), keep the /api prefix in the path
  return `${baseUrl}${path}`;
};

/**
 * API Endpoints Configuration
 */
export const ApiConfig = {
  /**
   * Stripe Guardian Webhook Base URL
   * - Development/Test: Set via EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL (Render with TEST keys)
   * - Production: https://api.webcap.media/api (Starlight Hyperlift with LIVE keys)
   */
  WEBHOOK_BASE_URL: getWebhookBaseUrl(),
  
  /**
   * Check if running in development mode
   */
  IS_DEVELOPMENT: isDevelopment(),
  
  /**
   * Stripe Endpoints
   */
  STRIPE: {
    CREATE_PAYMENTSHEET: getApiPath('/api/stripe/create-paymentsheet'),
    CONFIRM_PAYMENTSHEET: getApiPath('/api/stripe/confirm-paymentsheet'),
    CREATE_CHECKOUT: getApiPath('/api/stripe/create-checkout'),
    VERIFY_SESSION: getApiPath('/api/stripe/verify-session'),
    CANCEL_SUBSCRIPTION: getApiPath('/api/stripe/cancel-subscription'),
    REACTIVATE_SUBSCRIPTION: getApiPath('/api/stripe/reactivate-subscription'),
    GET_BILLING_HISTORY: getApiPath('/api/stripe/get-billing-history'),
    SYNC_PLAN: getApiPath('/api/stripe/sync-plan'),
    CREATE_COUPON: getApiPath('/api/stripe/create-coupon'),
  },
  
  /**
   * Health Check Endpoints
   */
  HEALTH: {
    READY: getApiPath('/api/ready'),
    HEALTH: getApiPath('/api/health'),
    SYNC_STATUS: getApiPath('/api/sync-status'),
  },
};

/**
 * Log the current API configuration (useful for debugging)
 */
export const logApiConfig = () => {
  const stripeMode = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') 
    ? '🧪 TEST MODE' 
    : process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_')
    ? '🔴 LIVE MODE'
    : '❓ NOT SET';
  
  console.log('🔧 API Configuration:');
  console.log(`   Environment: ${isDevelopment() ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   Webhook Base URL: ${ApiConfig.WEBHOOK_BASE_URL}`);
  console.log(`   Stripe Mode: ${stripeMode}`);
  console.log(`   APP_VARIANT: ${process.env.APP_VARIANT || 'not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   __DEV__: ${__DEV__}`);
};

