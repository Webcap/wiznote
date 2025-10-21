#!/usr/bin/env node

/**
 * Mobile IP Detection Diagnostic Script
 * 
 * Tests the Netlify function endpoint for mobile IP capture
 * Run with: node scripts/test-mobile-ip-detection.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wiznote.app';
const ENDPOINT = `${API_URL}/.netlify/functions/auth-log`;

console.log('🔍 Mobile IP Detection Diagnostic\n');
console.log('━'.repeat(60));
console.log(`Testing endpoint: ${ENDPOINT}`);
console.log('━'.repeat(60));

// Test data
const testEvent = {
  eventType: 'auth.login.success',
  userId: 'test-user-id',
  userEmail: 'test@example.com',
  success: true,
  eventData: {
    platform: 'test',
    test_mode: true,
  },
  severity: 'info',
};

// Make request
const url = new URL(ENDPOINT);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

const requestData = JSON.stringify(testEvent);

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'X-Forwarded-For': '203.0.113.1', // Test IP address
    'User-Agent': 'MobileIPDetectionTest/1.0',
  },
};

console.log('\n📤 Sending test request...\n');

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

    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(responseData);
        console.log('✅ SUCCESS! Function is working correctly\n');
        console.log('Response:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');
        
        if (result.capturedIp) {
          console.log(`✅ IP Address Captured: ${result.capturedIp}`);
        } else {
          console.log('⚠️  Warning: No IP address in response');
        }
        
        if (result.eventId) {
          console.log(`✅ Event logged with ID: ${result.eventId}`);
        }
        
        console.log('\n' + '━'.repeat(60));
        console.log('🎉 Mobile IP detection is working!');
        console.log('━'.repeat(60));
        console.log('\nNext steps:');
        console.log('1. Test from your mobile app');
        console.log('2. Check the Security Dashboard for IP addresses');
        console.log('3. Verify events show up with captured IPs\n');
      } catch (error) {
        console.log('❌ ERROR: Invalid JSON response');
        console.log('Response:', responseData.substring(0, 500));
      }
    } else if (res.statusCode === 404) {
      console.log('❌ ERROR: Function not found (404)\n');
      console.log('The Netlify function is not deployed or the URL is wrong.\n');
      console.log('Troubleshooting steps:');
      console.log('1. Check that netlify/functions/auth-log.js exists');
      console.log('2. Deploy your site to Netlify');
      console.log('3. Verify EXPO_PUBLIC_API_URL is correct');
      console.log(`   Current: ${API_URL}`);
      console.log('4. Check Netlify dashboard → Functions\n');
      
      if (responseData.includes('<!DOCTYPE html>')) {
        console.log('Response is HTML (Netlify 404 page), not the function.');
      }
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
      console.log('1. Missing Netlify environment variables:');
      console.log('   - EXPO_PUBLIC_SUPABASE_URL');
      console.log('   - SUPABASE_SERVICE_ROLE_KEY');
      console.log('2. Database function error');
      console.log('3. Check Netlify function logs for details\n');
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
  console.log('2. Wrong API URL');
  console.log(`   Current: ${API_URL}`);
  console.log('3. DNS resolution failed');
  console.log('4. Firewall blocking the request\n');
});

req.write(requestData);
req.end();

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏱️  Request timed out after 30 seconds');
  console.log('The endpoint is not responding.\n');
  process.exit(1);
}, 30000);

