#!/usr/bin/env node

/**
 * Migrate All Users to New Stripe Account
 * 
 * This script migrates users from old Stripe (test) to new Stripe (live).
 * It will:
 * 1. Clear all existing stripe_customer_id values
 * 2. Create new Stripe customers for ALL users
 * 3. Update database with new customer IDs
 * 
 * Use this when:
 * - Switching from test to live Stripe
 * - Moving to a new Stripe account
 * - Starting fresh with Stripe
 * 
 * Usage:
 *   node scripts/migrate-users-to-new-stripe.js --dry-run  # Preview
 *   node scripts/migrate-users-to-new-stripe.js            # Execute
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SECRET_KEY:', SUPABASE_SECRET_KEY ? '✓' : '✗');
  console.error('   STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '✓' : '✗');
  console.error('\n💡 Make sure you have switched to your NEW Stripe keys!');
  process.exit(1);
}

// Check if using live or test keys
const isLiveMode = STRIPE_SECRET_KEY.startsWith('sk_live_');
const keyMode = isLiveMode ? '🔴 LIVE' : '🟡 TEST';

console.log(`\n⚠️  Stripe Mode: ${keyMode}`);
if (isLiveMode) {
  console.log('   Using LIVE Stripe keys - real customers will be created!');
} else {
  console.log('   Using TEST Stripe keys - safe for development');
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

class StripeMigrationService {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.stats = {
      totalUsers: 0,
      oldCustomerIds: 0,
      customersCleared: 0,
      customersCreated: 0,
      databaseUpdated: 0,
      errors: 0,
    };
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    console.log('\n📊 Fetching all users from database...');

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, stripe_customer_id, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    this.stats.totalUsers = users.length;
    this.stats.oldCustomerIds = users.filter(u => u.stripe_customer_id).length;

    console.log(`✅ Found ${this.stats.totalUsers} total users`);
    console.log(`   ${this.stats.oldCustomerIds} with old Stripe customer IDs`);
    console.log(`   ${this.stats.totalUsers - this.stats.oldCustomerIds} without customer IDs`);

    return users;
  }

  /**
   * Clear all existing Stripe customer IDs from database
   */
  async clearOldCustomerIds() {
    console.log('\n🧹 Clearing old Stripe customer IDs...');

    if (this.dryRun) {
      console.log('   [DRY RUN] Would clear stripe_customer_id for all users');
      this.stats.customersCleared = this.stats.oldCustomerIds;
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: null })
      .not('stripe_customer_id', 'is', null);

    if (error) {
      throw new Error(`Failed to clear customer IDs: ${error.message}`);
    }

    this.stats.customersCleared = this.stats.oldCustomerIds;
    console.log(`✅ Cleared ${this.stats.customersCleared} old customer IDs`);
  }

  /**
   * Create a Stripe customer for a user
   */
  async createStripeCustomer(user) {
    const customerData = {
      email: user.email,
      name: user.display_name || user.email?.split('@')[0] || 'WizNote User',
      metadata: {
        user_id: user.id,
        source: 'wiznote-live-migration',
        migrated_at: new Date().toISOString(),
        original_signup: user.created_at,
      },
    };

    if (this.dryRun) {
      return { id: `cus_DRYRUN_${user.id.substring(0, 8)}` };
    }

    const customer = await stripe.customers.create(customerData);
    return customer;
  }

  /**
   * Update user profile with new Stripe customer ID
   */
  async updateUserProfile(userId, customerId) {
    if (this.dryRun) {
      return { success: true };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Process a single user
   */
  async processUser(user, index, total) {
    const progress = `[${index + 1}/${total}]`;
    
    try {
      console.log(`\n${progress} Processing: ${user.email}`);

      // Create new Stripe customer
      if (this.dryRun) {
        console.log('   [DRY RUN] Would create Stripe customer');
      } else {
        console.log('   🔨 Creating Stripe customer...');
      }
      
      const customer = await this.createStripeCustomer(user);
      
      if (!this.dryRun) {
        console.log(`   ✅ Created: ${customer.id}`);
      } else {
        console.log(`   [DRY RUN] Would get ID: ${customer.id}`);
      }

      // Update database
      if (this.dryRun) {
        console.log(`   [DRY RUN] Would update database`);
      } else {
        console.log('   💾 Updating database...');
        await this.updateUserProfile(user.id, customer.id);
        console.log('   ✅ Database updated');
      }

      this.stats.customersCreated++;
      this.stats.databaseUpdated++;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.stats.errors++;
    }
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     MIGRATE ALL USERS TO NEW STRIPE ACCOUNT              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual changes will be made');
    }

    try {
      // Get all users
      const users = await this.getAllUsers();

      if (this.stats.totalUsers === 0) {
        console.log('\n⚠️  No users found in database!');
        return;
      }

      // Show what will happen
      console.log('\n📋 Migration Plan:');
      console.log(`   1. Clear ${this.stats.oldCustomerIds} old customer IDs`);
      console.log(`   2. Create ${this.stats.totalUsers} new Stripe customers`);
      console.log(`   3. Update ${this.stats.totalUsers} database records`);

      // Confirm before proceeding in live mode
      if (isLiveMode && !this.dryRun) {
        console.log('\n⚠️  ⚠️  WARNING: LIVE MODE ⚠️  ⚠️');
        console.log(`   This will create ${this.stats.totalUsers} REAL Stripe customers!`);
        console.log(`   Old customer IDs will be replaced with new ones.`);
        console.log('\n   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else if (!this.dryRun) {
        console.log('\n⚠️  Proceeding in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 1: Clear old customer IDs
      await this.clearOldCustomerIds();

      // Step 2: Create new customers for all users
      console.log(`\n🚀 Creating Stripe customers for ${this.stats.totalUsers} users...`);

      for (let i = 0; i < users.length; i++) {
        await this.processUser(users[i], i, users.length);
        
        // Delay to avoid rate limits (100ms between requests)
        if (!this.dryRun && i < users.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Print execution summary
   */
  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total users: ${this.stats.totalUsers}`);
    console.log(`Old customer IDs cleared: ${this.stats.customersCleared}`);
    console.log(`New Stripe customers created: ${this.stats.customersCreated}`);
    console.log(`Database records updated: ${this.stats.databaseUpdated}`);
    console.log(`Errors: ${this.stats.errors}`);

    if (this.dryRun) {
      console.log('\n🔍 This was a DRY RUN - no actual changes were made');
      console.log('\n💡 To execute for real, run without --dry-run flag:');
      console.log('   node scripts/migrate-users-to-new-stripe.js');
    } else {
      console.log('\n✅ Migration complete!');
      
      if (this.stats.errors > 0) {
        console.log(`\n⚠️  ${this.stats.errors} users failed - review errors above`);
      }

      console.log('\n📋 Next steps:');
      console.log('   1. Verify customers in Stripe Dashboard');
      console.log('   2. Check user_profiles.stripe_customer_id in database');
      console.log('   3. Update Stripe Guardian with same live keys');
      console.log('   4. Configure live webhooks in Stripe Dashboard');
      console.log('   5. Test subscription creation with a user');
    }

    console.log('');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Migrate All Users to New Stripe Account

This script clears old Stripe customer IDs and creates new ones in your
new Stripe account (typically when switching from test to live).

Usage:
  node scripts/migrate-users-to-new-stripe.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Preview changes without making actual changes

Examples:
  # Preview the migration
  node scripts/migrate-users-to-new-stripe.js --dry-run

  # Execute the migration
  node scripts/migrate-users-to-new-stripe.js

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET_KEY
  STRIPE_SECRET_KEY  (your NEW Stripe account - usually sk_live_...)

Important Notes:
  ⚠️  This will REPLACE all existing stripe_customer_id values!
  ⚠️  Make sure you're using the correct NEW Stripe keys
  ⚠️  Always run --dry-run first to preview
  ⚠️  This cannot be easily undone - backup your database first!
  
After Migration:
  - Update Stripe Guardian with same keys
  - Configure webhooks in new Stripe account
  - Test subscription flow
    `);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  
  const migrator = new StripeMigrationService(dryRun);
  await migrator.run();
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

