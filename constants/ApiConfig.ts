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
  
  // Development: Use Render development instance
  if (isDevelopment()) {
    return 'https://stripe-guardian.onrender.com/api';
  }
  
  // Production: Use Starlight Hyperlift production instance
  return 'https://api.webcap.media/api';
};

/**
 * Build full API endpoint URL by appending path to base URL
 */
const getApiPath = (path: string): string => {
  return `${getWebhookBaseUrl()}${path}`;
};

/**
 * API Endpoints Configuration
 */
export const ApiConfig = {
  /**
   * Stripe Guardian Webhook Base URL
   * - Development: https://stripe-guardian.onrender.com/api
   * - Production: https://api.webcap.media/api
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
    CREATE_PAYMENTSHEET: getApiPath('/stripe/create-paymentsheet'),
    CONFIRM_PAYMENTSHEET: getApiPath('/stripe/confirm-paymentsheet'),
    CREATE_CHECKOUT: getApiPath('/stripe/create-checkout'),
    VERIFY_SESSION: getApiPath('/stripe/verify-session'),
    CANCEL_SUBSCRIPTION: getApiPath('/stripe/cancel-subscription'),
    REACTIVATE_SUBSCRIPTION: getApiPath('/stripe/reactivate-subscription'),
    GET_BILLING_HISTORY: getApiPath('/stripe/get-billing-history'),
    SYNC_PLAN: getApiPath('/stripe/sync-plan'),
  },
  
  /**
   * Health Check Endpoints
   */
  HEALTH: {
    READY: getApiPath('/ready'),
    HEALTH: getApiPath('/health'),
    SYNC_STATUS: getApiPath('/sync-status'),
  },
};

/**
 * Log the current API configuration (useful for debugging)
 */
export const logApiConfig = () => {
  console.log('🔧 API Configuration:');
  console.log(`   Environment: ${isDevelopment() ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   Webhook Base URL: ${ApiConfig.WEBHOOK_BASE_URL}`);
  console.log(`   APP_VARIANT: ${process.env.APP_VARIANT || 'not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   __DEV__: ${__DEV__}`);
};

