#!/usr/bin/env node

/**
 * Test Sync Plan Endpoint
 * 
 * Tests if the sync-plan endpoint is reachable and working
 * 
 * Usage: node scripts/test-sync-endpoint.js <plan_id>
 * Example: node scripts/test-sync-endpoint.js 84a7907d-f673-4d98-bc08-3877fbd78c3f
 */

const https = require('https');
const http = require('http');

const planId = process.argv[2];

if (!planId) {
  console.log('\n❌ Usage: node scripts/test-sync-endpoint.js <plan_id>\n');
  console.log('Example:');
  console.log('  node scripts/test-sync-endpoint.js 84a7907d-f673-4d98-bc08-3877fbd78c3f\n');
  process.exit(1);
}

// Test endpoints (add yours based on your setup)
const endpoints = [
  'https://api.webcap.media/api/stripe/sync-plan', // Starlight production
  // Add your test/staging URL if you have one
];

async function testEndpoint(url, planId) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${url}\n`);
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify({ planId });
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000, // 30 seconds
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        
        try {
          const json = JSON.parse(data);
          console.log(`   Response:`, JSON.stringify(json, null, 2));
          
          if (res.statusCode === 200 && json.success) {
            console.log('\n   ✅ SUCCESS!');
            console.log(`   Product ID: ${json.plan?.stripe_product_id || 'N/A'}`);
            console.log(`   Price ID: ${json.plan?.stripe_price_id || 'N/A'}`);
          } else {
            console.log(`\n   ❌ FAILED: ${json.error || json.message || 'Unknown error'}`);
            if (json.details) {
              console.log(`   Details: ${json.details}`);
            }
          }
        } catch (e) {
          console.log(`   Raw Response:`, data.substring(0, 500));
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request Error: ${error.message}`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log(`   ⏱️  Request Timeout (30s)`);
      req.destroy();
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           TEST SYNC-PLAN ENDPOINT                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nPlan ID: ${planId}\n`);
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint, planId);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Test completed\n');
}

runTests();


