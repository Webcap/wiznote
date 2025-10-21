#!/usr/bin/env node

/**
 * Debug Stripe Keys Configuration
 * 
 * Checks which Stripe keys are configured and whether they're test or live mode
 * 
 * Usage: node scripts/debug-stripe-keys.js
 */

require('dotenv').config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              STRIPE KEYS CONFIGURATION                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check wiznote-new (frontend) keys
console.log('📱 WIZNOTE-NEW (Frontend) Stripe Keys:\n');

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (secretKey) {
  const isTest = secretKey.startsWith('sk_test_');
  const isLive = secretKey.startsWith('sk_live_');
  console.log(`   Secret Key: ${secretKey.substring(0, 20)}...`);
  console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🟢 LIVE MODE' : '❓ UNKNOWN'}`);
} else {
  console.log('   Secret Key: ❌ NOT CONFIGURED');
}

if (publishableKey) {
  const isTest = publishableKey.startsWith('pk_test_');
  const isLive = publishableKey.startsWith('pk_live_');
  console.log(`   Publishable Key: ${publishableKey.substring(0, 20)}...`);
  console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🟢 LIVE MODE' : '❓ UNKNOWN'}`);
} else {
  console.log('   Publishable Key: ❌ NOT CONFIGURED');
}

console.log('\n' + '═'.repeat(60));
console.log('\n💡 The price ID needs to be from the same mode as your keys');
console.log('   If your keys are in TEST mode, use test price IDs (price_test_...)');
console.log('   If your keys are in LIVE mode, use live price IDs (price_1...)\n');

// Check if stripe-guardian directory exists and read its keys
const fs = require('fs');
const path = require('path');

const stripeGuardianPath = path.join(__dirname, '..', '..', 'stripe-guardian');
if (fs.existsSync(stripeGuardianPath)) {
  console.log('🛡️  STRIPE-GUARDIAN (Backend) Configuration:\n');
  
  try {
    // Try to load stripe-guardian .env
    const stripeGuardianEnvPath = path.join(stripeGuardianPath, '.env');
    if (fs.existsSync(stripeGuardianEnvPath)) {
      const dotenv = require('dotenv');
      const guardianConfig = dotenv.parse(fs.readFileSync(stripeGuardianEnvPath));
      
      const guardianSecretKey = guardianConfig.STRIPE_SECRET_KEY;
      if (guardianSecretKey) {
        const isTest = guardianSecretKey.startsWith('sk_test_');
        const isLive = guardianSecretKey.startsWith('sk_live_');
        console.log(`   Secret Key: ${guardianSecretKey.substring(0, 20)}...`);
        console.log(`   Mode: ${isTest ? '🧪 TEST MODE' : isLive ? '🟢 LIVE MODE' : '❓ UNKNOWN'}`);
        
        // Check if keys match
        if (secretKey && guardianSecretKey) {
          if (secretKey === guardianSecretKey) {
            console.log('\n   ✅ Keys match between frontend and backend');
          } else {
            console.log('\n   ⚠️  WARNING: Keys DO NOT match between frontend and backend!');
            console.log('   This could cause issues with price lookups.');
          }
        }
      } else {
        console.log('   Secret Key: ❌ NOT CONFIGURED');
      }
    } else {
      console.log('   .env file not found in stripe-guardian');
    }
  } catch (error) {
    console.log('   Error reading stripe-guardian config:', error.message);
  }
}

console.log('');


