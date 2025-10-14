#!/usr/bin/env node

/**
 * Create Stripe Customers for Existing Users
 * 
 * This script creates Stripe customers for all users who don't have one yet.
 * Use this when:
 * - Switching from test to live Stripe keys
 * - Migrating existing users to Stripe
 * - Setting up Stripe for the first time
 * 
 * Features:
 * - Finds users without stripe_customer_id
 * - Creates Stripe customers with user email and metadata
 * - Updates database with new customer IDs
 * - Dry-run mode to preview changes
 * - Progress tracking and error handling
 * 
 * Usage:
 *   node scripts/create-stripe-customers-for-users.js --dry-run  # Preview
 *   node scripts/create-stripe-customers-for-users.js            # Execute
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
  console.error('\n💡 Make sure you have switched to LIVE Stripe keys if going to production!');
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

class StripeCustomerCreator {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.stats = {
      totalUsers: 0,
      usersWithoutCustomerId: 0,
      customersCreated: 0,
      customersUpdated: 0,
      errors: 0,
      skipped: 0,
    };
  }

  /**
   * Get all users who don't have a Stripe customer ID
   */
  async getUsersWithoutStripeCustomer() {
    console.log('\n📊 Fetching users without Stripe customer ID...');

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, stripe_customer_id, created_at')
      .or('stripe_customer_id.is.null,stripe_customer_id.eq.');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    console.log(`✅ Found ${users.length} users without Stripe customer ID`);
    return users;
  }

  /**
   * Get all users (for statistics)
   */
  async getAllUsers() {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, stripe_customer_id', { count: 'exact' });

    if (error) {
      throw new Error(`Failed to fetch total users: ${error.message}`);
    }

    return users;
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
        source: 'wiznote-migration',
        created_via: 'create-stripe-customers-script',
        original_signup: user.created_at,
      },
    };

    if (this.dryRun) {
      console.log('   [DRY RUN] Would create Stripe customer:', {
        email: customerData.email,
        name: customerData.name,
      });
      return { id: `cus_DRYRUN_${user.id.substring(0, 8)}` };
    }

    const customer = await stripe.customers.create(customerData);
    return customer;
  }

  /**
   * Update user profile with Stripe customer ID
   */
  async updateUserProfile(userId, customerId) {
    if (this.dryRun) {
      console.log(`   [DRY RUN] Would update user ${userId} with customer ID: ${customerId}`);
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
      console.log(`\n${progress} Processing user: ${user.email}`);
      console.log(`   User ID: ${user.id}`);

      // Check if user already has a customer ID (shouldn't happen, but be safe)
      if (user.stripe_customer_id) {
        console.log(`   ⚠️  User already has customer ID: ${user.stripe_customer_id}`);
        this.stats.skipped++;
        return;
      }

      // Create Stripe customer
      console.log('   🔨 Creating Stripe customer...');
      const customer = await this.createStripeCustomer(user);
      console.log(`   ✅ Stripe customer created: ${customer.id}`);

      // Update database
      console.log('   💾 Updating database...');
      await this.updateUserProfile(user.id, customer.id);
      console.log('   ✅ Database updated');

      this.stats.customersCreated++;
      this.stats.customersUpdated++;

    } catch (error) {
      console.error(`   ❌ Error processing user ${user.email}:`, error.message);
      this.stats.errors++;
    }
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     CREATE STRIPE CUSTOMERS FOR EXISTING USERS            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual changes will be made');
    }

    try {
      // Get statistics
      const allUsers = await this.getAllUsers();
      const usersWithoutCustomer = await getUsersWithoutStripeCustomer();

      this.stats.totalUsers = allUsers.length;
      this.stats.usersWithoutCustomerId = usersWithoutCustomer.length;

      const usersWithCustomer = allUsers.filter(u => u.stripe_customer_id).length;

      console.log('\n📊 Current Status:');
      console.log(`   Total users: ${this.stats.totalUsers}`);
      console.log(`   Users with Stripe customer: ${usersWithCustomer}`);
      console.log(`   Users without Stripe customer: ${this.stats.usersWithoutCustomerId}`);

      if (this.stats.usersWithoutCustomerId === 0) {
        console.log('\n✅ All users already have Stripe customers! Nothing to do.');
        return;
      }

      // Confirm before proceeding in live mode
      if (isLiveMode && !this.dryRun) {
        console.log('\n⚠️  WARNING: You are using LIVE Stripe keys!');
        console.log(`   This will create ${this.stats.usersWithoutCustomerId} real Stripe customers.`);
        console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Process each user
      console.log(`\n🚀 Processing ${this.stats.usersWithoutCustomerId} users...`);

      for (let i = 0; i < usersWithoutCustomer.length; i++) {
        await this.processUser(usersWithoutCustomer[i], i, usersWithoutCustomer.length);
        
        // Small delay to avoid rate limits
        if (!this.dryRun && i < usersWithoutCustomer.length - 1) {
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
    console.log('📊 EXECUTION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total users in database: ${this.stats.totalUsers}`);
    console.log(`Users without customer ID: ${this.stats.usersWithoutCustomerId}`);
    console.log(`Stripe customers created: ${this.stats.customersCreated}`);
    console.log(`Database records updated: ${this.stats.customersUpdated}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Skipped: ${this.stats.skipped}`);

    if (this.dryRun) {
      console.log('\n🔍 This was a DRY RUN - no actual changes were made');
      console.log('\n💡 To execute for real, run without --dry-run flag:');
      console.log('   node scripts/create-stripe-customers-for-users.js');
    } else {
      console.log('\n✅ Migration complete!');
      
      if (this.stats.errors > 0) {
        console.log('\n⚠️  Some users failed - review errors above');
      }
    }

    console.log('\n📋 Next steps:');
    console.log('   1. Verify customers in Stripe Dashboard');
    console.log('   2. Check user_profiles table for stripe_customer_id');
    console.log('   3. Test subscription creation with a user');
    console.log('');
  }
}

// Get users without Stripe customer (helper for main run function)
async function getUsersWithoutStripeCustomer() {
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, stripe_customer_id, created_at')
    .or('stripe_customer_id.is.null,stripe_customer_id.eq.');

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return users;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Create Stripe Customers for Existing Users

Usage:
  node scripts/create-stripe-customers-for-users.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Preview changes without creating actual customers
  --verbose      Show detailed output

Examples:
  # Preview what would happen
  node scripts/create-stripe-customers-for-users.js --dry-run

  # Execute the migration
  node scripts/create-stripe-customers-for-users.js

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
  STRIPE_SECRET_KEY  (use sk_live_... for production!)

Important Notes:
  - Make sure you're using the correct Stripe keys (test vs live)
  - This script is idempotent - safe to run multiple times
  - Users who already have stripe_customer_id will be skipped
  - Always run --dry-run first to preview changes
    `);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  
  const creator = new StripeCustomerCreator(dryRun);
  await creator.run();
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

