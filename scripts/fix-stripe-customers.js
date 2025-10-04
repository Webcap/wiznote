#!/usr/bin/env node

/**
 * Stripe Customer Subscription Sync Script
 * 
 * This script fixes Stripe customers' subscriptions and ensures they're synced with the database.
 * It handles:
 * - Finding customers with subscription mismatches
 * - Syncing subscription status from Stripe to database
 * - Fixing subscription data inconsistencies
 * - Updating user profiles with correct subscription information
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '✓' : '✗');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

class StripeCustomerSyncService {
  constructor() {
    this.stats = {
      processed: 0,
      fixed: 0,
      errors: 0,
      skipped: 0
    };
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    try {
      // Handle both Unix timestamps (seconds) and milliseconds
      const date = new Date(timestamp * 1000);
      return date.toISOString();
    } catch (error) {
      return 'Invalid timestamp';
    }
  }

  async run() {
    console.log('🚀 Starting Stripe Customer Subscription Sync...\n');
    
    try {
      // Get all users with Stripe customer IDs
      const users = await this.getUsersWithStripeCustomers();
      console.log(`📊 Found ${users.length} users with Stripe customer IDs\n`);

      for (const user of users) {
        await this.processUser(user);
      }

      this.printSummary();
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }

  async getUsersWithStripeCustomers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, stripe_customer_id, premium')
      .not('stripe_customer_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }

  async processUser(user) {
    this.stats.processed++;
    console.log(`\n👤 Processing user: ${user.display_name || user.id} (${user.id})`);
    console.log(`   Stripe Customer ID: ${user.stripe_customer_id}`);
    console.log(`   Current DB Premium: ${JSON.stringify(user.premium) || 'none'}`);

    try {
      // Get customer from Stripe
      const stripeCustomer = await stripe.customers.retrieve(user.stripe_customer_id);
      
      if (stripeCustomer.deleted) {
        console.log('   ⚠️  Stripe customer is deleted, skipping...');
        this.stats.skipped++;
        return;
      }

      // Get active subscriptions from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'all',
        limit: 10
      });

      if (subscriptions.data.length === 0) {
        await this.handleNoSubscriptions(user);
        return;
      }

      // Find the most relevant subscription
      const activeSubscription = subscriptions.data.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      ) || subscriptions.data[0]; // Fallback to most recent

      await this.syncSubscription(user, activeSubscription, subscriptions.data);

    } catch (error) {
      console.log(`   ❌ Error processing user: ${error.message}`);
      this.stats.errors++;
    }
  }

  async handleNoSubscriptions(user) {
    console.log('   📝 No active subscriptions found in Stripe');
    
    // Check if user has active premium status that should be canceled
    const hasActivePremium = user.premium && user.premium.isActive;
    
    if (hasActivePremium) {
      console.log('   🔧 Updating database to reflect canceled premium status...');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          premium: {
            ...user.premium,
            isActive: false
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.log(`   ❌ Failed to update user: ${error.message}`);
        this.stats.errors++;
      } else {
        console.log('   ✅ Updated user premium status to inactive');
        this.stats.fixed++;
      }
    } else {
      console.log('   ✅ Database already reflects no active premium subscription');
      this.stats.skipped++;
    }
  }

  async syncSubscription(user, subscription, allSubscriptions) {
    console.log(`   📋 Stripe Subscription: ${subscription.id}`);
    console.log(`   📋 Status: ${subscription.status}`);
    console.log(`   📋 Current Period: ${this.formatTimestamp(subscription.current_period_start)} - ${this.formatTimestamp(subscription.current_period_end)}`);

    // Get subscription details
    const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
    const product = await stripe.products.retrieve(price.product);

    console.log(`   📋 Plan: ${product.name} (${price.nickname || price.id})`);
    console.log(`   📋 Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);

    // Determine what needs to be updated
    const needsUpdate = this.needsDatabaseUpdate(user, subscription, product, price);
    
    if (!needsUpdate) {
      console.log('   ✅ Database is already in sync');
      this.stats.skipped++;
      return;
    }

    // Update database
    await this.updateUserSubscription(user, subscription, product, price, allSubscriptions);
  }

  needsDatabaseUpdate(user, subscription, product, price) {
    const dbPremium = user.premium;
    const stripeStatus = subscription.status;
    
    // Check if premium status should be active based on Stripe subscription
    const shouldBeActive = stripeStatus === 'active' || stripeStatus === 'trialing';
    const isCurrentlyActive = dbPremium && dbPremium.isActive;

    return shouldBeActive !== isCurrentlyActive;
  }

  mapStripeStatus(stripeStatus) {
    const statusMap = {
      'active': 'active',
      'trialing': 'trialing',
      'past_due': 'past_due',
      'canceled': 'canceled',
      'unpaid': 'unpaid',
      'incomplete': 'incomplete',
      'incomplete_expired': 'canceled',
      'paused': 'paused'
    };

    return statusMap[stripeStatus] || 'unknown';
  }

  async updateUserSubscription(user, subscription, product, price, allSubscriptions) {
    const shouldBeActive = subscription.status === 'active' || subscription.status === 'trialing';
    
    console.log('   🔧 Updating database...');
    console.log(`   📝 Premium Active: ${user.premium?.isActive || false} → ${shouldBeActive}`);
    console.log(`   📝 Plan: ${product.name} (${price.id})`);

    const updateData = {
      premium: {
        ...user.premium,
        isActive: shouldBeActive,
        subscriptionId: subscription.id,
        planId: price.id,
        planName: product.name,
        currentPeriodStart: this.formatTimestamp(subscription.current_period_start),
        currentPeriodEnd: this.formatTimestamp(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      },
      updated_at: new Date().toISOString()
    };

    // Add cancellation info if applicable
    if (subscription.canceled_at) {
      updateData.premium.canceledAt = this.formatTimestamp(subscription.canceled_at);
    }

    // Add trial info if applicable
    if (subscription.trial_start) {
      updateData.premium.trialStart = this.formatTimestamp(subscription.trial_start);
      updateData.premium.trialEnd = this.formatTimestamp(subscription.trial_end);
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.log(`   ❌ Failed to update user: ${error.message}`);
      this.stats.errors++;
    } else {
      console.log('   ✅ Successfully updated user subscription');
      this.stats.fixed++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`👥 Total users processed: ${this.stats.processed}`);
    console.log(`✅ Users fixed/updated: ${this.stats.fixed}`);
    console.log(`⏭️  Users skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors encountered: ${this.stats.errors}`);
    console.log('='.repeat(50));

    if (this.stats.errors > 0) {
      console.log('\n⚠️  Some errors occurred. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All customers synced successfully!');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Stripe Customer Subscription Sync Script

Usage: node scripts/fix-stripe-customers.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be updated without making changes
  --verbose      Show detailed output for each customer

Examples:
  node scripts/fix-stripe-customers.js
  node scripts/fix-stripe-customers.js --dry-run
  node scripts/fix-stripe-customers.js --verbose

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
    `);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const syncService = new StripeCustomerSyncService();
  await syncService.run();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = StripeCustomerSyncService;
