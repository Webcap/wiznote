#!/usr/bin/env node

/**
 * Payment Endpoint Diagnostic Script
 * 
 * Tests the create-paymentsheet endpoint to diagnose connection issues
 * Run with: node scripts/test-payment-endpoint.js
 */

const https = require('https');
const http = require('http');

// Configuration - Update these if needed
const TEST_ENDPOINT = process.env.EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL || 'https://stripe-guardian.onrender.com';
const FULL_URL = `${TEST_ENDPOINT}/api/stripe/create-paymentsheet`;

console.log('💳 Payment Endpoint Diagnostic\n');
console.log('━'.repeat(70));
console.log(`Testing endpoint: ${FULL_URL}`);
console.log('━'.repeat(70));

// Test data
const testPayload = {
  userId: 'test-user-id',
  email: 'test@example.com',
  planId: 'test-plan',
  stripePriceId: 'price_test123',
  platform: 'test',
};

// Make request
const url = new URL(FULL_URL);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

const requestData = JSON.stringify(testPayload);

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'User-Agent': 'PaymentEndpointTest/1.0',
  },
};

console.log('\n📤 Sending test request...');
console.log('Request details:');
console.log(`   Method: POST`);
console.log(`   Host: ${url.hostname}`);
console.log(`   Path: ${url.pathname}`);
console.log('');

const req = httpModule.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`\n📥 Response received:`);
    console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log('');

    // Check response status
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(responseData);
        console.log('✅ SUCCESS! Endpoint is responding\n');
        console.log('Response structure:');
        console.log(`   - Has setupIntent: ${!!result.setupIntent}`);
        console.log(`   - Has setupIntentId: ${!!result.setupIntentId}`);
        console.log(`   - Has ephemeralKey: ${!!result.ephemeralKey}`);
        console.log(`   - Has customer: ${!!result.customer}`);
        console.log(`   - Has publishableKey: ${!!result.publishableKey}`);
        console.log('');
        console.log('Full response:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n' + '━'.repeat(70));
        console.log('🎉 Payment endpoint is working correctly!');
        console.log('━'.repeat(70));
        console.log('\nThe error might be:');
        console.log('1. Network connectivity on mobile device');
        console.log('2. CORS issues (should be handled by server)');
        console.log('3. Invalid data being sent from app');
        console.log('4. Stripe initialization issue on server\n');
      } catch (error) {
        console.log('❌ ERROR: Invalid JSON response');
        console.log('Response:', responseData.substring(0, 500));
      }
    } else if (res.statusCode === 400) {
      console.log('❌ ERROR: Bad Request (400)\n');
      try {
        const error = JSON.parse(responseData);
        console.log('Error details:');
        console.log(JSON.stringify(error, null, 2));
      } catch {
        console.log('Error response:', responseData);
      }
      console.log('\nPossible causes:');
      console.log('1. Missing required fields (userId, email, planId, stripePriceId)');
      console.log('2. Invalid data format');
      console.log('3. stripePriceId not provided\n');
    } else if (res.statusCode === 404) {
      console.log('❌ ERROR: Endpoint not found (404)\n');
      console.log('The create-paymentsheet endpoint does not exist.\n');
      console.log('Troubleshooting:');
      console.log('1. Check Render deployment is active');
      console.log('2. Verify endpoint path: /api/stripe/create-paymentsheet');
      console.log('3. Check Render logs for errors');
      console.log(`4. Verify base URL: ${TEST_ENDPOINT}\n`);
    } else if (res.statusCode === 500) {
      console.log('❌ ERROR: Server error (500)\n');
      try {
        const error = JSON.parse(responseData);
        console.log('Error details:');
        console.log(JSON.stringify(error, null, 2));
      } catch {
        console.log('Error response:', responseData);
      }
      console.log('\nPossible causes:');
      console.log('1. Stripe API key not configured in Render');
      console.log('2. Supabase credentials missing');
      console.log('3. Database connection error');
      console.log('4. Stripe API error');
      console.log('\nCheck Render environment variables:');
      console.log('- STRIPE_SECRET_KEY (test or live)');
      console.log('- STRIPE_PUBLISHABLE_KEY');
      console.log('- WIZNOTE_SUPABASE_URL');
      console.log('- WIZNOTE_SUPABASE_SERVICE_KEY\n');
    } else if (res.statusCode === 503 || res.statusCode === 502) {
      console.log(`❌ ERROR: Service unavailable (${res.statusCode})\n`);
      console.log('The Render service is not responding.\n');
      console.log('Possible causes:');
      console.log('1. Render service is sleeping (free tier)');
      console.log('2. Service is starting up (wait 30-60 seconds)');
      console.log('3. Deployment failed');
      console.log('4. Service crashed');
      console.log('\nTry:');
      console.log('1. Wait 1 minute and try again');
      console.log('2. Visit the Render dashboard to wake it up');
      console.log('3. Check Render logs for errors\n');
    } else {
      console.log(`❌ ERROR: Unexpected status code ${res.statusCode}\n`);
      console.log('Response:', responseData.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.log('❌ ERROR: Request failed\n');
  console.log('Error:', error.message);
  console.log('\nPossible causes:');
  console.log('1. Network connectivity issues');
  console.log('2. DNS resolution failed');
  console.log(`3. Server is unreachable: ${TEST_ENDPOINT}`);
  console.log('4. Firewall blocking the request');
  console.log('5. Render service is down\n');
  console.log('Next steps:');
  console.log('1. Check your internet connection');
  console.log('2. Try pinging: ' + url.hostname);
  console.log('3. Check Render status page');
  console.log('4. Verify EXPO_PUBLIC_STRIPE_GUARDIAN_TEST_URL is correct\n');
});

req.write(requestData);
req.end();

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏱️  Request timed out after 30 seconds');
  console.log('The endpoint is not responding.\n');
  console.log('This usually means:');
  console.log('1. Render service is sleeping (free tier) - wait and retry');
  console.log('2. Slow cold start - wait up to 60 seconds');
  console.log('3. Network issues\n');
  process.exit(1);
}, 30000);

