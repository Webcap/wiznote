#!/usr/bin/env node

/**
 * Check API Configuration
 * 
 * Shows which endpoints your app is using
 */

require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              API CONFIGURATION                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check environment variables
const isDev = process.env.NODE_ENV === 'development' || 
              process.env.APP_VARIANT === 'development' ||
              __DEV__;

console.log('Environment Detection:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   APP_VARIANT: ${process.env.APP_VARIANT || 'not set'}`);
console.log(`   __DEV__: ${typeof __DEV__ !== 'undefined' ? __DEV__ : 'not set'}`);
console.log(`   Detected as: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}\n`);

// Check webhook URL
const webhookBaseUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 
  (isDev ? process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL : 'https://api.webcap.media/api');

console.log('Webhook Configuration:');
console.log(`   EXPO_PUBLIC_WEBHOOK_BASE_URL: ${process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL || 'not set'}`);
console.log(`   EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL: ${process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL || 'not set'}`);
console.log(`   Final Webhook Base URL: ${webhookBaseUrl}\n`);

// Check Stripe keys
const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const secretKey = process.env.STRIPE_SECRET_KEY;

console.log('Stripe Keys:');
if (publishableKey) {
  const isTest = publishableKey.startsWith('pk_test_');
  const isLive = publishableKey.startsWith('pk_live_');
  console.log(`   Publishable Key: ${publishableKey.substring(0, 20)}...`);
  console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🔴 LIVE MODE' : '❓ UNKNOWN'}`);
} else {
  console.log('   Publishable Key: ❌ NOT SET');
}

if (secretKey) {
  const isTest = secretKey.startsWith('sk_test_');
  const isLive = secretKey.startsWith('sk_live_');
  console.log(`   Secret Key: ${secretKey.substring(0, 20)}...`);
  console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🔴 LIVE MODE' : '❓ UNKNOWN'}`);
} else {
  console.log('   Secret Key: ❌ NOT SET');
}

console.log('');

// Show endpoint URLs
console.log('API Endpoints:');
console.log(`   Create PaymentSheet: ${webhookBaseUrl}/api/stripe/create-paymentsheet`);
console.log(`   Confirm PaymentSheet: ${webhookBaseUrl}/api/stripe/confirm-paymentsheet`);
console.log(`   Sync Plan: ${webhookBaseUrl}/api/stripe/sync-plan`);

console.log('\n' + '═'.repeat(60));

// Check for mismatches
const frontendIsTest = publishableKey?.startsWith('pk_test_');
const backendIsLive = webhookBaseUrl.includes('api.webcap.media');

if (frontendIsTest && backendIsLive) {
  console.log('\n⚠️  WARNING: MISMATCH DETECTED!');
  console.log('   Frontend: TEST mode Stripe keys');
  console.log('   Backend: LIVE mode (api.webcap.media)');
  console.log('\n💡 This will cause SetupIntent/PaymentIntent errors!');
  console.log('   Solution: Either:');
  console.log('   1. Use LIVE keys in frontend, OR');
  console.log('   2. Use TEST backend for development');
} else {
  console.log('\n✅ Configuration looks correct!');
}

console.log('');




