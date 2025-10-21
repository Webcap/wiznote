#!/usr/bin/env node

/**
 * Check LIVE MODE Stripe Prices
 * 
 * This script checks what prices exist in your LIVE Stripe account
 * You'll need to temporarily set your LIVE Stripe key
 * 
 * Usage: 
 * 1. Set env var: $env:STRIPE_LIVE_KEY="sk_live_..."
 * 2. Run: node scripts/check-live-prices.js
 */

const Stripe = require('stripe');

// Use STRIPE_LIVE_KEY env var or prompt user
const liveKey = process.env.STRIPE_LIVE_KEY;

if (!liveKey) {
  console.log('\n❌ Error: STRIPE_LIVE_KEY not set\n');
  console.log('To check your LIVE mode prices:');
  console.log('');
  console.log('PowerShell:');
  console.log('  $env:STRIPE_LIVE_KEY="sk_live_YOUR_KEY_HERE"');
  console.log('  node scripts/check-live-prices.js');
  console.log('');
  console.log('Or find prices at: https://dashboard.stripe.com/prices');
  console.log('(Make sure toggle is set to "Live" mode)\n');
  process.exit(1);
}

if (!liveKey.startsWith('sk_live_')) {
  console.log('\n⚠️  Warning: Key does not start with sk_live_');
  console.log('Make sure you are using a LIVE mode key!\n');
}

const stripe = new Stripe(liveKey, {
  apiVersion: '2024-06-20',
});

async function checkLivePrices() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         STRIPE PRICES - LIVE MODE                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Fetch all active products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    console.log(`Found ${products.data.length} active products in LIVE mode\n`);

    if (products.data.length === 0) {
      console.log('⚠️  No active products found in your LIVE Stripe account.');
      console.log('   You may need to create products/prices in live mode.\n');
      return;
    }

    for (const product of products.data) {
      console.log(`📦 Product: ${product.name} (${product.id})`);
      
      // Fetch prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      if (prices.data.length === 0) {
        console.log('   ⚠️  No active prices\n');
        continue;
      }

      for (const price of prices.data) {
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'Free';
        const interval = price.recurring?.interval || 'one-time';
        console.log(`   💰 Price ID: ${price.id}`);
        console.log(`      Amount: ${amount}/${interval}`);
        console.log(`      Currency: ${price.currency.toUpperCase()}`);
        console.log('');
      }
    }

    console.log('═'.repeat(60));
    console.log('\n💡 To fix your issue:');
    console.log('   Update your database plan to use one of these LIVE price IDs');
    console.log('   OR create a matching $9.99/month price in LIVE mode\n');

  } catch (error) {
    console.error('\n❌ Error fetching Stripe prices:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Tip: Check your STRIPE_LIVE_KEY is correct\n');
    }
    
    process.exit(1);
  }
}

checkLivePrices();


