#!/usr/bin/env node

/**
 * Create Free Stripe Subscription
 * 
 * This creates a real Stripe subscription at $0.00 for a user.
 * The subscription appears in Stripe Dashboard and can be managed normally.
 * 
 * Usage:
 *   node scripts/create-free-stripe-subscription.js <email> <plan_id>
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

async function createFreeSubscription(email, planId) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        CREATE FREE STRIPE SUBSCRIPTION                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Find user
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, stripe_customer_id')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ User: ${user.display_name || user.email}`);
    
    // Ensure customer exists
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      console.log('   Creating Stripe customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.display_name || user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      
      console.log(`   ✅ Customer created: ${customerId}`);
    } else {
      console.log(`   Customer ID: ${customerId}`);
    }
    
    // Get plan
    const { data: plan } = await supabase
      .from('premium_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (!plan || !plan.stripe_price_id) {
      console.error('❌ Plan not found or not synced to Stripe');
      return;
    }
    
    console.log(`\n📦 Plan: ${plan.name} ($${plan.price}/${plan.interval})`);
    
    // Create subscription with 100% coupon
    console.log('\n💳 Creating free subscription in Stripe...');
    
    // First create a 100% off coupon
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'forever',
      name: `Free Premium - ${email}`,
      metadata: {
        granted_to: email,
        granted_at: new Date().toISOString(),
        reason: 'admin_grant'
      }
    });
    
    console.log(`   ✅ Created coupon: ${coupon.id}`);
    
    // Create subscription with coupon
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripe_price_id }],
      coupon: coupon.id,
      metadata: {
        planId: plan.id,
        free_access: 'true',
        granted_by: 'admin'
      }
    });
    
    console.log(`   ✅ Subscription created: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    
    // Update database
    console.log('\n💾 Updating database...');
    
    const premiumData = {
      isActive: true,
      planId: plan.id,
      type: plan.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFree: true,
      couponId: coupon.id,
    };
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        premium: premiumData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Database update failed:', updateError.message);
      return;
    }
    
    console.log('✅ Database updated!');
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 FREE PREMIUM GRANTED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`User: ${email}`);
    console.log(`Subscription: ${subscription.id}`);
    console.log(`Coupon: ${coupon.id} (100% off)`);
    console.log(`Billing: $0.00 forever`);
    console.log(`\n✅ User can now access all premium features!`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Main
const email = process.argv[2];
const duration = process.argv[3] || '365';

if (!email) {
  console.log(`
Grant Free Premium Access (with Stripe Subscription)

Usage:
  node scripts/create-free-stripe-subscription.js <email> <plan_id>

Examples:
  node scripts/create-free-stripe-subscription.js user@example.com plan-uuid

This creates:
  ✅ Real Stripe subscription (manageable in Stripe)
  ✅ 100% off coupon (forever)
  ✅ $0.00 recurring charges
  ✅ Shows in billing history
  ✅ Auto-renews

First, list available plans:
  node scripts/list-plans.js
  `);
  process.exit(0);
}

grantFreePremium(email, duration);

