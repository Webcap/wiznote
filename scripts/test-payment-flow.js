#!/usr/bin/env node

/**
 * Test Payment Flow
 * 
 * Simulates the exact payment flow to see where the mismatch occurs
 */

require('dotenv').config();

// Simulate mobile app environment detection
function isDevelopment() {
  if (process.env.APP_VARIANT === 'development') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return true; // Assume development for this script
}

function getWebhookBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  if (isDevelopment()) {
    const testUrl = process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL;
    if (testUrl) {
      return testUrl.replace(/\/$/, '');
    }
    console.warn('⚠️  EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL not set, using production Stripe Guardian');
  }
  
  return 'https://api.webcap.media/api';
}

const getApiPath = (path) => {
  const baseUrl = getWebhookBaseUrl();
  if (baseUrl.endsWith('/api')) {
    const cleanPath = path.replace(/^\/api/, '');
    return `${baseUrl}${cleanPath}`;
  }
  return `${baseUrl}${path}`;
};

async function testPaymentFlow() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              TEST PAYMENT FLOW                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const webhookBaseUrl = getWebhookBaseUrl();
  const createUrl = getApiPath('/api/stripe/create-paymentsheet');
  const confirmUrl = getApiPath('/api/stripe/confirm-paymentsheet');

  console.log('Configuration:');
  console.log(`   Environment: ${isDevelopment() ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   Webhook Base: ${webhookBaseUrl}`);
  console.log(`   Create URL: ${createUrl}`);
  console.log(`   Confirm URL: ${confirmUrl}`);
  console.log('');

  // Test 1: Check if create-paymentsheet endpoint is reachable
  console.log('🔍 Step 1: Testing create-paymentsheet endpoint...');
  
  const testPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    planId: '84a7907d-f673-4d98-bc08-3877fbd78c3f', // Monthly plan
    stripePriceId: 'price_1SKYJvJCl2ZCT6sSfpdEXiIw', // The new LIVE price ID
    platform: 'ios'
  };

  try {
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error: ${errorText.substring(0, 200)}`);
      return;
    }

    const data = await response.json();
    console.log(`   ✅ Success! Created SetupIntent: ${data.setupIntentId}`);
    console.log(`   Customer: ${data.customer}`);
    
    // Test 2: Check if confirm-paymentsheet endpoint can handle this SetupIntent
    console.log('\n🔍 Step 2: Testing confirm-paymentsheet endpoint...');
    
    const confirmPayload = {
      setupIntentId: data.setupIntentId,
      planId: testPayload.planId,
      userId: testPayload.userId,
      stripePriceId: testPayload.stripePriceId
    };

    // Note: This will fail because the SetupIntent isn't actually completed
    // But it will show us if the endpoint is reachable
    const confirmResponse = await fetch(confirmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmPayload),
    });

    console.log(`   Status: ${confirmResponse.status}`);
    const confirmData = await confirmResponse.text();
    console.log(`   Response: ${confirmData.substring(0, 200)}`);

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Payment flow test completed\n');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with fetch support');
  console.log('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

testPaymentFlow();

