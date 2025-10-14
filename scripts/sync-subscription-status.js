#!/usr/bin/env node

/**
 * Sync Subscription Status from Stripe
 * 
 * This script fixes subscription status mismatches where:
 * - Stripe shows "active" but database shows isActive: false
 * - Or vice versa
 * 
 * It fetches the real status from Stripe and updates user_profiles.premium
 * 
 * Usage:
 *   node scripts/sync-subscription-status.js [stripe_subscription_id]
 *   node scripts/sync-subscription-status.js --all  # Sync all subscriptions
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

/**
 * Determine if subscription should be active
 */
function calculateIsActive(stripeStatus, cancelAtPeriodEnd, currentPeriodEnd) {
  const isActiveStatus = ['active', 'trialing'].includes(stripeStatus);
  const isWithinPeriod = new Date(currentPeriodEnd) > new Date();
  
  if (cancelAtPeriodEnd) {
    return isActiveStatus && isWithinPeriod;
  }
  
  return isActiveStatus;
}

/**
 * Sync a single subscription
 */
async function syncSubscription(subscriptionId) {
  console.log(`\n🔄 Syncing subscription: ${subscriptionId}`);
  
  try {
    // Get current database state from user_profiles.premium
    const { data: user, error: dbError } = await supabase
      .from('user_profiles')
      .select('id, email, premium, stripe_customer_id')
      .eq('premium->>stripeSubscriptionId', subscriptionId)
      .single();
    
    if (dbError || !user || !user.premium) {
      console.error('❌ Subscription not found in database');
      return { success: false, error: 'Not found in database' };
    }
    
    const dbSub = user.premium;
    
    console.log('\n📊 Current Database State:');
    console.log(`   User: ${user.email}`);
    console.log(`   Status: ${dbSub.status}`);
    console.log(`   isActive: ${dbSub.isActive}`);
    console.log(`   Cancel at period end: ${dbSub.cancelAtPeriodEnd}`);
    console.log(`   Current period end: ${dbSub.currentPeriodEnd}`);
    
    // Get real state from Stripe
    console.log('\n🔍 Fetching from Stripe...');
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('\n📊 Stripe State:');
    console.log(`   Status: ${stripeSub.status}`);
    console.log(`   Cancel at period end: ${stripeSub.cancel_at_period_end}`);
    console.log(`   Current period end: ${new Date(stripeSub.current_period_end * 1000).toISOString()}`);
    
    // Calculate what isActive should be
    const shouldBeActive = calculateIsActive(
      stripeSub.status,
      stripeSub.cancel_at_period_end,
      new Date(stripeSub.current_period_end * 1000)
    );
    
    console.log(`\n🧮 Calculated isActive: ${shouldBeActive}`);
    
    // Check if update needed
    const needsUpdate = 
      dbSub.status !== stripeSub.status ||
      dbSub.isActive !== shouldBeActive ||
      dbSub.cancelAtPeriodEnd !== stripeSub.cancel_at_period_end;
    
    if (!needsUpdate) {
      console.log('✅ Already in sync - no update needed');
      return { success: true, updated: false };
    }
    
    console.log('\n⚠️  Mismatch detected - updating database...');
    
    // Update the premium JSONB object
    const updatedPremium = {
      ...dbSub,
      status: stripeSub.status,
      isActive: shouldBeActive,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ premium: updatedPremium })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return { success: false, error: updateError.message };
    }
    
    console.log('✅ Database updated successfully!');
    console.log('\n📊 New State:');
    console.log(`   Status: ${stripeSub.status}`);
    console.log(`   isActive: ${shouldBeActive}`);
    console.log(`   Cancel at period end: ${stripeSub.cancel_at_period_end}`);
    
    return { success: true, updated: true };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all subscriptions
 */
async function syncAllSubscriptions() {
  console.log('\n🔄 Syncing ALL subscriptions...\n');
  
  try {
    // Get all users with premium subscriptions
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, premium, stripe_customer_id')
      .not('premium', 'is', null);
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return;
    }
    
    // Filter to only users with stripeSubscriptionId
    const usersWithSubs = users.filter(u => u.premium?.stripeSubscriptionId);
    
    console.log(`📊 Found ${usersWithSubs.length} users with subscriptions to check\n`);
    
    let stats = {
      total: usersWithSubs.length,
      updated: 0,
      alreadyInSync: 0,
      errors: 0,
    };
    
    for (let i = 0; i < usersWithSubs.length; i++) {
      const user = usersWithSubs[i];
      const subId = user.premium.stripeSubscriptionId;
      console.log(`\n[${i + 1}/${usersWithSubs.length}] Processing: ${user.email} (${subId})`);
      
      const result = await syncSubscription(subId);
      
      if (result.success) {
        if (result.updated) {
          stats.updated++;
        } else {
          stats.alreadyInSync++;
        }
      } else {
        stats.errors++;
      }
      
      // Small delay to avoid rate limits
      if (i < usersWithSubs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total subscriptions: ${stats.total}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Already in sync: ${stats.alreadyInSync}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

/**
 * Fix specific subscription by customer ID
 */
async function syncByCustomerId(customerId) {
  console.log(`\n🔍 Finding subscription for customer: ${customerId}`);
  
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('id, email, premium')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (error || !user || !user.premium?.stripeSubscriptionId) {
    console.error('❌ No subscription found for this customer');
    return;
  }
  
  await syncSubscription(user.premium.stripeSubscriptionId);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        SYNC SUBSCRIPTION STATUS FROM STRIPE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node scripts/sync-subscription-status.js [options] [id]

Options:
  --all              Sync all subscriptions
  --customer <id>    Sync by customer ID
  --help, -h         Show this help

Examples:
  # Sync specific subscription
  node scripts/sync-subscription-status.js sub_1SGA55J8pJSkCNufzOc3CDcA
  
  # Sync all subscriptions
  node scripts/sync-subscription-status.js --all
  
  # Sync by customer ID
  node scripts/sync-subscription-status.js --customer cus_TCYjEAaM6y8QeI

This script:
  - Fetches the real status from Stripe
  - Calculates the correct isActive value
  - Updates user_profiles.premium if there's a mismatch
    `);
    return;
  }
  
  if (args.includes('--all')) {
    await syncAllSubscriptions();
  } else if (args.includes('--customer')) {
    const customerIndex = args.indexOf('--customer');
    const customerId = args[customerIndex + 1];
    if (!customerId) {
      console.error('❌ Please provide a customer ID');
      return;
    }
    await syncByCustomerId(customerId);
  } else if (args[0]) {
    // Single subscription ID
    await syncSubscription(args[0]);
  } else {
    console.error('\n❌ Please provide a subscription ID or use --all');
    console.log('\nExamples:');
    console.log('  node scripts/sync-subscription-status.js sub_1SGA55J8pJSkCNufzOc3CDcA');
    console.log('  node scripts/sync-subscription-status.js --all');
    console.log('  node scripts/sync-subscription-status.js --help');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
