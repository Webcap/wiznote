#!/usr/bin/env node

/**
 * Manually Activate Premium for User
 * 
 * Use this when:
 * - User purchased but premium didn't activate
 * - Webhooks failed to process
 * - Testing premium features
 * - Emergency premium activation
 * 
 * This script:
 * 1. Finds the user in database
 * 2. Fetches their subscription from Stripe
 * 3. Updates user_profiles.premium with correct data
 * 
 * Usage:
 *   node scripts/manually-activate-premium.js <email>
 *   node scripts/manually-activate-premium.js user@example.com
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

async function activatePremiumForUser(email) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        MANUALLY ACTIVATE PREMIUM FOR USER                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Find user in database
    console.log(`🔍 Looking up user: ${email}`);
    
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, stripe_customer_id, premium')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found in database');
      console.error('   Make sure the email is correct');
      return;
    }
    
    console.log('✅ User found:', user.display_name || user.email);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Customer ID: ${user.stripe_customer_id || 'None'}`);
    
    // Step 2: Check if they have a Stripe customer ID
    if (!user.stripe_customer_id) {
      console.log('\n⚠️  User has no Stripe customer ID');
      console.log('   Searching Stripe for customer by email...');
      
      const customers = await stripe.customers.search({
        query: `email:"${email}"`
      });
      
      if (customers.data.length === 0) {
        console.error('❌ No Stripe customer found for this email');
        console.error('   User may not have made a purchase yet');
        return;
      }
      
      const customer = customers.data[0];
      console.log(`✅ Found Stripe customer: ${customer.id}`);
      
      // Update user with customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
      
      user.stripe_customer_id = customer.id;
      console.log('   ✅ Updated user with customer ID');
    }
    
    // Step 3: Get subscriptions from Stripe
    console.log('\n🔍 Fetching subscriptions from Stripe...');
    
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      limit: 10
    });
    
    if (subscriptions.data.length === 0) {
      console.error('❌ No subscriptions found for this customer');
      console.error('   User may have made a one-time payment or subscription hasn\'t been created yet');
      return;
    }
    
    console.log(`✅ Found ${subscriptions.data.length} subscription(s)`);
    
    // Get the most recent active subscription
    const activeSub = subscriptions.data.find(s => ['active', 'trialing'].includes(s.status));
    const subscription = activeSub || subscriptions.data[0];
    
    // Helper to safely convert timestamp
    const toISOString = (timestamp) => {
      if (!timestamp) return new Date().toISOString();
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };
    
    console.log('\n📊 Subscription Details:');
    console.log(`   ID: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Price: ${subscription.items.data[0]?.price.id}`);
    console.log(`   Period End: ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleString() : 'N/A'}`);
    console.log(`   Period Start: ${subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toLocaleString() : 'N/A'}`);
    console.log(`   Cancel at Period End: ${subscription.cancel_at_period_end}`);
    console.log(`   Created: ${subscription.created ? new Date(subscription.created * 1000).toLocaleString() : 'N/A'}`);
    
    // Step 4: Update user_profiles.premium
    console.log('\n💾 Updating database...');
    
    const isActive = ['active', 'trialing'].includes(subscription.status);
    const planId = subscription.metadata?.planId || subscription.items.data[0]?.price.id;
    
    const premiumData = {
      isActive: isActive,
      planId: planId,
      type: planId, // For backwards compatibility
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: user.stripe_customer_id,
      status: subscription.status,
      currentPeriodEnd: toISOString(subscription.current_period_end),
      currentPeriodStart: toISOString(subscription.current_period_start),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      startedAt: toISOString(subscription.created),
      updatedAt: new Date().toISOString()
    };
    
    if (subscription.canceled_at) {
      premiumData.canceledAt = toISOString(subscription.canceled_at);
    }
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        premium: premiumData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating database:', updateError.message);
      return;
    }
    
    console.log('✅ Database updated successfully!');
    
    // Step 5: Verify the update
    console.log('\n🔍 Verifying update...');
    
    const { data: updatedUser } = await supabase
      .from('user_profiles')
      .select('premium')
      .eq('id', user.id)
      .single();
    
    console.log('\n📊 Current Premium Status:');
    console.log(`   isActive: ${updatedUser?.premium?.isActive}`);
    console.log(`   Plan ID: ${updatedUser?.premium?.planId}`);
    console.log(`   Subscription ID: ${updatedUser?.premium?.stripeSubscriptionId}`);
    console.log(`   Status: ${updatedUser?.premium?.status}`);
    console.log(`   Period End: ${updatedUser?.premium?.currentPeriodEnd}`);
    
    console.log('\n✅ Premium activated successfully!');
    console.log(`   User ${email} now has access to premium features`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.log(`
Usage:
  node scripts/manually-activate-premium.js <email>

Example:
  node scripts/manually-activate-premium.js user@example.com

This script will:
  1. Find the user in database
  2. Fetch their subscription from Stripe
  3. Update user_profiles.premium with correct data
  4. Verify the update

Use this when:
  - Webhooks failed to activate premium
  - User purchased but premium didn't activate
  - Testing premium activation
  `);
  process.exit(0);
}

activatePremiumForUser(email);

