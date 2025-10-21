#!/usr/bin/env node

/**
 * Verify Specific Stripe Price
 * 
 * Checks if a specific price ID exists in the configured Stripe account
 * 
 * Usage: node scripts/verify-stripe-price.js price_1SKY2EJOYGB6eofbLZzNjKOR
 */

require('dotenv').config();
const Stripe = require('stripe');

const priceId = process.argv[2] || 'price_1SKY2EJOYGB6eofbLZzNjKOR';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function verifyPrice() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              VERIFY STRIPE PRICE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Checking Price ID: ${priceId}`);
  
  // Determine mode from secret key
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const mode = secretKey?.startsWith('sk_test_') ? 'TEST MODE' : 
               secretKey?.startsWith('sk_live_') ? 'LIVE MODE' : 'UNKNOWN';
  console.log(`Using Stripe Key: ${secretKey?.substring(0, 20)}... (${mode})\n`);

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product']
    });

    console.log('✅ PRICE FOUND!\n');
    console.log('Price Details:');
    console.log(`   ID: ${price.id}`);
    console.log(`   Amount: $${(price.unit_amount / 100).toFixed(2)}`);
    console.log(`   Currency: ${price.currency.toUpperCase()}`);
    console.log(`   Interval: ${price.recurring?.interval || 'one-time'}`);
    console.log(`   Active: ${price.active ? '✅' : '❌'}`);
    console.log(`   Product: ${price.product.name} (${price.product.id})`);
    console.log('');
    
  } catch (error) {
    console.log('❌ PRICE NOT FOUND!\n');
    console.log('Error:', error.message);
    console.log('Type:', error.type);
    console.log('Code:', error.code);
    console.log('\n💡 This price ID does not exist in your', mode, 'Stripe account');
    
    if (priceId.startsWith('price_1') && mode === 'TEST MODE') {
      console.log('\n⚠️  Warning: You are in TEST MODE but using a live price ID format.');
      console.log('   Live price IDs (price_1...) only work with live mode keys.');
      console.log('   Test price IDs usually look like: price_test_...');
    } else if (priceId.startsWith('price_test_') && mode === 'LIVE MODE') {
      console.log('\n⚠️  Warning: You are in LIVE MODE but using a test price ID format.');
      console.log('   Test price IDs (price_test_...) only work with test mode keys.');
      console.log('   Live price IDs usually look like: price_1...');
    }
    
    console.log('\n📝 To fix this:');
    console.log('   1. Create the price in the correct Stripe mode, OR');
    console.log('   2. Update your database plan to use a valid price ID from this mode');
    console.log('');
  }
}

verifyPrice();


