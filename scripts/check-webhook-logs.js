#!/usr/bin/env node

/**
 * Check Stripe Webhook Logs
 * 
 * This script helps debug webhook issues by:
 * - Checking if webhooks are configured correctly
 * - Showing recent webhook events from Stripe
 * - Helping identify why premium isn't activating
 * 
 * Usage: node scripts/check-webhook-logs.js
 */

const Stripe = require('stripe');
require('dotenv').config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function checkWebhooks() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           STRIPE WEBHOOK DIAGNOSTICS                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get webhook endpoints
    console.log('🔍 Fetching webhook endpoints...');
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    console.log(`✅ Found ${endpoints.data.length} webhook endpoint(s)\n`);
    
    endpoints.data.forEach((endpoint, i) => {
      console.log(`Webhook ${i + 1}:`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
      console.log(`   Created: ${new Date(endpoint.created * 1000).toLocaleString()}`);
      console.log('');
    });
    
    // Get recent events
    console.log('📊 Recent Webhook Events (last 10):\n');
    const events = await stripe.events.list({ limit: 10 });
    
    events.data.forEach((event, i) => {
      const status = event.pending_webhooks === 0 ? '✅' : '⏳';
      console.log(`${status} Event ${i + 1}:`);
      console.log(`   Type: ${event.type}`);
      console.log(`   Created: ${new Date(event.created * 1000).toLocaleString()}`);
      console.log(`   Pending webhooks: ${event.pending_webhooks}`);
      
      if (event.type === 'customer.subscription.created' || 
          event.type === 'customer.subscription.updated' ||
          event.type === 'checkout.session.completed') {
        const sub = event.data.object;
        console.log(`   Customer: ${sub.customer}`);
        if (sub.subscription) console.log(`   Subscription: ${sub.subscription}`);
        if (sub.status) console.log(`   Status: ${sub.status}`);
      }
      console.log('');
    });
    
    // Check for failed webhooks
    console.log('🔍 Checking for recent failures...\n');
    
    const failures = events.data.filter(e => e.pending_webhooks > 0);
    
    if (failures.length > 0) {
      console.log(`⚠️  Found ${failures.length} events with pending webhooks:`);
      failures.forEach(event => {
        console.log(`   - ${event.type} (${new Date(event.created * 1000).toLocaleString()})`);
      });
      console.log('\n💡 Check Stripe Dashboard → Webhooks for detailed error logs');
    } else {
      console.log('✅ No recent webhook failures detected');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWebhooks();

