#!/usr/bin/env node

/**
 * Check Available Stripe Prices
 * 
 * Lists all active prices in your Stripe account to help identify valid price IDs
 * 
 * Usage: node scripts/check-stripe-prices.js
 */

require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function checkStripePrices() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              STRIPE PRICES (LIVE MODE)                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Fetch all active products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    console.log(`Found ${products.data.length} active products\n`);

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
        console.log(`      Active: ${price.active ? '✅' : '❌'}`);
        console.log('');
      }
    }

    console.log('═'.repeat(60));
    console.log('✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error fetching Stripe prices:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Tip: Check your STRIPE_SECRET_KEY in .env file');
      console.error('   Make sure you\'re using the correct key for your environment (test vs live mode)\n');
    }
    
    process.exit(1);
  }
}

checkStripePrices();


