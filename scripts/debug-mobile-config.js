#!/usr/bin/env node

/**
 * Debug Mobile App Configuration
 * 
 * Simulates how the mobile app determines its API endpoints
 */

require('dotenv').config();

// Simulate mobile app environment detection
function isDevelopment() {
  // Check if APP_VARIANT is development
  if (process.env.APP_VARIANT === 'development') {
    return true;
  }
  
  // Check if NODE_ENV is development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In real mobile app, this would check Constants.appOwnership === 'expo' || __DEV__
  // For this script, we'll simulate it
  return true; // Assume development for this script
}

function getWebhookBaseUrl() {
  // Allow manual override via environment variable
  const envUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  // Development/Test: Use Render with Stripe TEST keys
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
}

const getApiPath = (path) => {
  const baseUrl = getWebhookBaseUrl();
  
  // If base URL already includes /api at the end (like Starlight Hyperlift)
  if (baseUrl.endsWith('/api')) {
    const cleanPath = path.replace(/^\/api/, '');
    return `${baseUrl}${cleanPath}`;
  }
  
  // Otherwise (like Render), keep the /api prefix in the path
  return `${baseUrl}${path}`;
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         MOBILE APP CONFIGURATION                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const isDev = isDevelopment();
const webhookBaseUrl = getWebhookBaseUrl();

console.log('Mobile App Environment Detection:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   APP_VARIANT: ${process.env.APP_VARIANT || 'not set'}`);
console.log(`   Detected as: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}\n`);

console.log('Mobile App Webhook Configuration:');
console.log(`   EXPO_PUBLIC_WEBHOOK_BASE_URL: ${process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'not set'}`);
console.log(`   EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL: ${process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL || 'not set'}`);
console.log(`   Final Webhook Base URL: ${webhookBaseUrl}\n`);

// Show what the mobile app would use
const ApiConfig = {
  WEBHOOK_BASE_URL: webhookBaseUrl,
  IS_DEVELOPMENT: isDev,
  STRIPE: {
    CREATE_PAYMENTSHEET: getApiPath('/api/stripe/create-paymentsheet'),
    CONFIRM_PAYMENTSHEET: getApiPath('/api/stripe/confirm-paymentsheet'),
    SYNC_PLAN: getApiPath('/api/stripe/sync-plan'),
  }
};

console.log('Mobile App API Endpoints:');
console.log(`   Create PaymentSheet: ${ApiConfig.STRIPE.CREATE_PAYMENTSHEET}`);
console.log(`   Confirm PaymentSheet: ${ApiConfig.STRIPE.CONFIRM_PAYMENTSHEET}`);
console.log(`   Sync Plan: ${ApiConfig.STRIPE.SYNC_PLAN}`);

// Check Stripe keys
const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log('\nMobile App Stripe Keys:');
if (publishableKey) {
  const isTest = publishableKey.startsWith('pk_test_');
  const isLive = publishableKey.startsWith('pk_live_');
  console.log(`   Publishable Key: ${publishableKey.substring(0, 20)}...`);
  console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🔴 LIVE MODE' : '❓ UNKNOWN'}`);
} else {
  console.log('   Publishable Key: ❌ NOT SET');
}

console.log('\n' + '═'.repeat(60));

// Check for mismatches
const frontendIsTest = publishableKey?.startsWith('pk_test_');
const backendIsStarlight = webhookBaseUrl.includes('api.webcap.media');
const backendIsRender = webhookBaseUrl.includes('stripe-guardian.onrender.com');

console.log('\nConfiguration Analysis:');
console.log(`   Frontend Stripe: ${frontendIsTest ? 'TEST' : 'LIVE'}`);
console.log(`   Backend: ${backendIsStarlight ? 'Starlight (LIVE)' : backendIsRender ? 'Render (TEST)' : 'Unknown'}`);

if (frontendIsTest && backendIsStarlight) {
  console.log('\n❌ MISMATCH DETECTED!');
  console.log('   Mobile app creates TEST SetupIntents but sends them to LIVE backend');
  console.log('   This causes "No such setupintent" errors');
} else if (frontendIsTest && backendIsRender) {
  console.log('\n✅ Configuration matches!');
  console.log('   Both frontend and backend are in TEST mode');
} else if (!frontendIsTest && backendIsStarlight) {
  console.log('\n✅ Configuration matches!');
  console.log('   Both frontend and backend are in LIVE mode');
} else {
  console.log('\n⚠️  Unknown configuration');
}

console.log('');




