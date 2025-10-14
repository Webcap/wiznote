# Scripts Documentation

This directory contains utility scripts for managing and maintaining the WizNote application.

## Quick Reference

| Script | Category | Purpose | Key Use |
|--------|----------|---------|---------|
| `grant-free-premium.js` | 🎁 Premium | Give free premium (no Stripe) | Staff/beta accounts |
| `manually-activate-premium.js` | ⚡ Premium | Fix failed webhook activation | Emergency fix |
| `import-stripe-plans.js` | 💳 Stripe | Import plans from Stripe | After creating products |
| `sync-subscription-status.js` | 🔄 Stripe | Fix status mismatches | isActive is wrong |
| `list-plans.js` | 📋 Info | List all plans | Get plan IDs |
| `migrate-users-to-new-stripe.js` | 🔄 Migration | Switch Stripe accounts | Test → Live |
| `create-stripe-customers-for-users.js` | 👥 Migration | Create customers for users | Initial Stripe setup |
| `check-webhook-logs.js` | 📊 Debug | Check webhook status | Webhooks not working |
| `test-rate-limiting.js` | 🔒 Security | Test rate limiting | After setup |
| `fix-stripe-customers.js` | 🔧 Maintenance | Sync customer data | Regular maintenance |

## Available Scripts

### 🚨 delete-all-data.js

**Description**: **DANGER** - Completely deletes ALL data from your database. This includes all users, notes, audio files, and related data. This action is IRREVERSIBLE!

**What it deletes**:
- All users and user profiles
- All notes
- All audio files  
- All feature usage data
- All subscription data
- All feature limits and premium plans

**Usage**:
```bash
# Preview what would be deleted (SAFE - only reads data)
node scripts/preview-delete-all-data.js

# Actually delete all data (DANGEROUS - requires confirmation)
node scripts/delete-all-data.js --confirm
```

**Safety Features**:
- Requires `--confirm` flag to prevent accidental execution
- Shows detailed preview of what will be deleted
- Provides clear warnings about irreversible nature
- Includes error handling and progress reporting

**⚠️ WARNING**: This script will completely wipe your database. Make sure you have backups if needed!

### 🔍 preview-delete-all-data.js

**Description**: Safe preview script that shows what data would be deleted without actually deleting anything.

**What it shows**:
- Count of all records in each table
- Sample data from each table
- Summary of what would be deleted

**Usage**:
```bash
node scripts/preview-delete-all-data.js
```

### 🔧 fix-stripe-customers.js

**Description**: Synchronizes Stripe customer subscriptions with the database to ensure data consistency between Stripe and your local user profiles.

**What it does**:
- Fetches all users with Stripe customer IDs from the database
- Retrieves current subscription data from Stripe for each customer
- Compares subscription status between Stripe and database
- Updates user premium status and subscription details in the database
- Handles edge cases like canceled subscriptions, trials, and deleted customers

**Usage**:
```bash
# Run the sync script (makes actual changes)
npm run fix-stripe-customers

# Or run directly
node scripts/fix-stripe-customers.js

# Dry run (see what would be changed without making changes)
node scripts/fix-stripe-customers.js --dry-run

# Verbose output (detailed logging for each customer)
node scripts/fix-stripe-customers.js --verbose

# Show help
node scripts/fix-stripe-customers.js --help
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `STRIPE_SECRET_KEY` - Your Stripe secret key

**What gets updated**:
- `user_profiles.premium.isActive` - Whether the user has active premium access
- `user_profiles.premium.subscriptionId` - Stripe subscription ID
- `user_profiles.premium.planId` - Stripe price ID
- `user_profiles.premium.planName` - Plan name from Stripe
- `user_profiles.premium.currentPeriodStart/End` - Subscription period dates
- `user_profiles.premium.cancelAtPeriodEnd` - Whether subscription will cancel at period end
- `user_profiles.premium.canceledAt` - Cancellation timestamp (if applicable)
- `user_profiles.premium.trialStart/End` - Trial period dates (if applicable)

**Example Output**:
```
🚀 Starting Stripe Customer Subscription Sync...

📊 Found 5 users with Stripe customer IDs

👤 Processing user: John Doe (12345-67890-abcdef)
   Stripe Customer ID: cus_ABC123
   Current DB Premium: {"isActive":false}
   📋 Stripe Subscription: sub_XYZ789
   📋 Status: active
   📋 Current Period: 2024-01-01T00:00:00.000Z - 2024-02-01T00:00:00.000Z
   📋 Plan: Pro Monthly ($9.99)
   🔧 Updating database...
   📝 Premium Active: false → true
   📝 Plan: Pro Monthly (price_123)
   ✅ Successfully updated user subscription

==================================================
📊 SYNC SUMMARY
==================================================
👥 Total users processed: 5
✅ Users fixed/updated: 3
⏭️  Users skipped: 1
❌ Errors encountered: 1
==================================================

🎉 All customers synced successfully!
```

**Common Use Cases**:
- After Stripe webhook failures
- When subscription data gets out of sync
- During maintenance or data migration
- After manual Stripe operations
- To verify subscription status accuracy

### 🧪 create-test-user-full-usage.js

**Description**: Creates a test user with all features at 100% usage for testing monthly reset functionality and feature limits.

**What it does**:
- Creates or updates a test user account in Supabase Auth
- Creates a user profile for the test user
- Sets all feature usage to 100% of the free tier limit
- Verifies that all features are properly configured

**Usage**:
```bash
# Create test user with default credentials (test@webcap.cc / TestPassword123!)
node scripts/create-test-user-full-usage.js

# Create test user with custom credentials
node scripts/create-test-user-full-usage.js --email user@example.com --password MyPassword123

# Show help
node scripts/create-test-user-full-usage.js --help
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

**What gets created**:
- User account in Supabase Auth with confirmed email
- User profile with free tier settings
- Feature usage records for all 13 features at 100% of their limits:
  - AI Transcription: 10/10 uses
  - AI Summaries: 15/15 uses
  - AI Key Details: 5/5 uses
  - AI Name Generation: 10/10 uses
  - AI Flashcard Generation: 5/5 uses
  - Voice Recording: 60/60 minutes
  - Note Storage: 100MB/100MB
  - Note Sharing: 5/5 shares
  - Real-time Sync: 100/100 operations
  - Advanced Search: 15/15 searches
  - Note Export: 5/5 exports
  - Custom Themes: 2/2 themes
  - Priority Support: 1/1 tickets

**Example Output**:
```
🚀 Creating test user with 100% feature usage...
📧 Email: test@webcap.cc

👤 Step 1: Creating/getting user account...
   ✅ User created with ID: 6ff9afd7-7b8f-467a-a6c6-8722e98a088a

📋 Step 2: Creating/updating user profile...
   ✅ User profile created/updated

⚡ Step 3: Setting all features to 100% usage...
   ✅ AI Transcription: 10 count (100%)
   ✅ AI Summaries: 15 count (100%)
   ... (all 13 features)
   📊 Summary: 13 succeeded, 0 failed

🔍 Step 4: Verifying setup...
   ✅ Found 13 usage records
   ✅ 13/13 features at 100% usage

✅ Test user created successfully!
```

**Common Use Cases**:
- Testing monthly usage reset cron jobs
- Testing feature limit enforcement
- Verifying upgrade prompts for users at limits
- QA testing of limit-reached scenarios
- Demonstrating limit behavior to stakeholders

### 🧪 test-monthly-reset.js

**Description**: Tests the monthly usage reset functionality without making any changes to the database.

**What it does**:
- Fetches all user feature usage records
- Analyzes which records would be reset based on their period type
- Shows statistics about current usage
- Provides a dry-run report of what would happen during a real reset

**Usage**:
```bash
# Test the monthly reset logic (read-only)
node scripts/test-monthly-reset.js
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (recommended for full access)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Alternative to service role key (may have limited access)

**Common Use Cases**:
- Before deploying monthly reset cron job
- After creating test users with full usage
- Verifying usage data is being tracked correctly
- Troubleshooting reset functionality

### 🔍 check-test-user-usage.js

**Description**: Displays the current usage status for a test user, showing which features are at their limits.

**What it does**:
- Looks up the test user by email
- Fetches all feature usage records for that user
- Displays a formatted table showing usage vs. limits
- Categorizes features by status (At Limit, Partial, Empty)
- Provides a summary of overall usage

**Usage**:
```bash
# Check default test user (test@webcap.cc)
node scripts/check-test-user-usage.js

# Check specific user
node scripts/check-test-user-usage.js --email user@example.com

# Show help
node scripts/check-test-user-usage.js --help
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

**Example Output**:
```
🔍 Checking test user usage...
📧 Email: test@webcap.cc

👤 User ID: 6ff9afd7-7b8f-467a-a6c6-8722e98a088a

📊 Feature Usage Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 At Limit AI Transcription                            10 / 10              (100%)
🔴 At Limit AI Summaries                                15 / 15              (100%)
🔴 At Limit AI Key Details                               5 / 5               (100%)
... (all features)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Summary:
   🔴 At Limit:  13 features
   🟡 Partial:   0 features
   ✅ Empty:     0 features
   📊 Total:     13 features

🎯 All features are at 100% usage - perfect for testing monthly reset!
```

**Common Use Cases**:
- Verify test user setup before running reset tests
- Check if usage was successfully reset after cron job
- Monitor feature usage during QA testing
- Debug feature limit tracking issues
- Validate that limits are being enforced correctly

---

## Security & Rate Limiting Scripts

### 🔒 test-rate-limiting.js

**Description**: Comprehensive test suite for the rate limiting system. Verifies that rate limiting enforcement can be toggled on/off via admin settings and that limits are properly enforced.

**What it tests**:
- Rate limit enforcement when enabled
- Bypass functionality when disabled
- Attempt tracking in database
- Cleanup functions
- Dynamic setting changes

**Usage**:
```bash
node scripts/test-rate-limiting.js
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)

**Example Output**:
```
╔════════════════════════════════════════════════════════════╗
║      WIZNOTE RATE LIMITING SYSTEM - TEST SUITE            ║
╚════════════════════════════════════════════════════════════╝

📊 Current settings:
   Rate Limiting: ENABLED
   Auth Attempts: 5
   Auth Window: 15 minutes

🧪 TEST 1: Rate Limit Enforcement (Enabled)
   Attempt 1/7: 🟢 ALLOWED ✅ PASS
   Attempt 5/7: 🟢 ALLOWED ✅ PASS
   Attempt 6/7: 🔴 BLOCKED ✅ PASS
   
✅ All tests completed successfully!
```

**Common Use Cases**:
- After implementing rate limiting
- Testing admin toggle functionality
- Verifying rate limits work after deployment
- Debugging authentication issues

### 🗄️ setup-rate-limiting-db.js

**Description**: Sets up the database schema for rate limiting (table, functions, policies).

**What it creates**:
- `rate_limit_attempts` table
- Database functions for checking and recording attempts
- RLS policies for admin-only access

**Usage**:
```bash
node scripts/setup-rate-limiting-db.js
```

**Note**: Usually you'll run the SQL file manually in Supabase SQL Editor instead.

---

## Stripe & Subscription Management Scripts

### 💳 import-stripe-plans.js

**Description**: Fetches all products and prices from your Stripe account and imports them into the `premium_plans` table.

**What it does**:
- Fetches active products from Stripe
- Creates corresponding plans in database
- Updates existing plans if they changed
- Links plans by `stripe_price_id`

**Usage**:
```bash
node scripts/import-stripe-plans.js
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `STRIPE_SECRET_KEY`

**Example Output**:
```
🔄 Starting Stripe plan import...

📦 Fetching products from Stripe...
✅ Found 3 active products

📦 Processing product: WizNote Premium (prod_ABC123)
   💰 Processing price: price_1SF... ($9.99/month)
   ✅ Created new plan: cddf6c0b-3ec4...

============================================================
📊 Import Summary:
✅ Imported: 3 new plans
🔄 Updated: 0 existing plans
============================================================
```

**Common Use Cases**:
- After creating new products in Stripe
- When switching from test to live keys
- Initial setup of premium plans
- Syncing plan changes from Stripe

### 👥 create-stripe-customers-for-users.js

**Description**: Creates Stripe customers for all users who don't have one yet. Useful when first setting up Stripe or switching accounts.

**What it does**:
- Finds users without `stripe_customer_id`
- Creates Stripe customers with user email/metadata
- Updates database with new customer IDs
- Skips users who already have customers (idempotent)

**Usage**:
```bash
# Preview first (recommended)
node scripts/create-stripe-customers-for-users.js --dry-run

# Execute
node scripts/create-stripe-customers-for-users.js
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `STRIPE_SECRET_KEY`

**Example Output**:
```
╔════════════════════════════════════════════════════════════╗
║     CREATE STRIPE CUSTOMERS FOR EXISTING USERS            ║
╚════════════════════════════════════════════════════════════╝

⚠️  Stripe Mode: 🔴 LIVE

📊 Current Status:
   Total users: 150
   Users without Stripe customer: 50

🚀 Processing 50 users...

[1/50] Processing user: user1@example.com
   ✅ Stripe customer created: cus_ABC123
   ✅ Database updated

═══════════════════════════════════════════════════════════
📊 EXECUTION SUMMARY
Stripe customers created: 50
Errors: 0
✅ Migration complete!
```

**Common Use Cases**:
- Initial Stripe setup
- Adding Stripe to existing app
- After user import

### 🔄 migrate-users-to-new-stripe.js

**Description**: Migrates ALL users from old Stripe account to new one. Clears old customer IDs and creates new ones.

**What it does**:
- Clears ALL existing `stripe_customer_id` values
- Creates NEW Stripe customers for ALL users
- Updates database with new IDs

**Usage**:
```bash
# Preview first (REQUIRED!)
node scripts/migrate-users-to-new-stripe.js --dry-run

# Execute (10-second warning for live mode)
node scripts/migrate-users-to-new-stripe.js
```

**⚠️ WARNING**: This is irreversible! Old customer IDs will be lost.

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `STRIPE_SECRET_KEY` (your NEW Stripe account)

**Common Use Cases**:
- Switching from test to live Stripe
- Moving to new Stripe account
- Starting fresh with Stripe

### 🔄 sync-subscription-status.js

**Description**: Syncs subscription status from Stripe to fix mismatches where database shows inactive but Stripe shows active (or vice versa).

**What it does**:
- Fetches real status from Stripe
- Calculates correct `isActive` value
- Updates `user_profiles.premium` if mismatch detected

**Usage**:
```bash
# Sync specific subscription
node scripts/sync-subscription-status.js sub_1SGA55J8pJSkCNufzOc3CDcA

# Sync by customer ID
node scripts/sync-subscription-status.js --customer cus_TCYjEAaM6y8QeI

# Sync ALL subscriptions
node scripts/sync-subscription-status.js --all
```

**Example Output**:
```
🔄 Syncing subscription: sub_1SGA55...

📊 Current Database State:
   Status: active
   isActive: false          ← WRONG!

📊 Stripe State:
   Status: active

🧮 Calculated isActive: true

⚠️  Mismatch detected - updating database...
✅ Database updated successfully!

📊 New State:
   isActive: true          ← FIXED!
```

**Common Use Cases**:
- After webhook failures
- User reports premium not working
- Subscription status mismatches
- After manual Stripe changes

### ⚡ manually-activate-premium.js

**Description**: Manually activates premium for a user by fetching their Stripe subscription and updating the database. Emergency fix for webhook failures.

**What it does**:
- Finds user by email
- Fetches subscription from Stripe
- Updates `user_profiles.premium` with correct data
- Verifies activation

**Usage**:
```bash
node scripts/manually-activate-premium.js user@example.com
```

**Example Output**:
```
🔍 Looking up user: user@example.com
✅ User found: John Doe

🔍 Fetching subscriptions from Stripe...
✅ Found 1 subscription(s)

📊 Subscription Details:
   ID: sub_1SIDEN...
   Status: active
   Period End: Oct 14, 2025

💾 Updating database...
✅ Database updated successfully!

✅ Premium activated successfully!
```

**Common Use Cases**:
- Webhooks failed after purchase
- User paid but premium not active
- Emergency activation
- Testing

### 🎁 grant-free-premium.js

**Description**: Grants free premium access without Stripe. Perfect for staff, beta testers, or promotional accounts.

**What it does**:
- Activates premium in database
- No Stripe subscription created
- No charges ever
- Custom duration or lifetime

**Usage**:
```bash
# 1 year free
node scripts/grant-free-premium.js user@example.com 365

# 30 days free
node scripts/grant-free-premium.js user@example.com 30

# Lifetime access
node scripts/grant-free-premium.js user@example.com lifetime
```

**Example Output**:
```
╔════════════════════════════════════════════════════════════╗
║           GRANT FREE PREMIUM ACCESS                       ║
╚════════════════════════════════════════════════════════════╝

🎁 Granting LIFETIME premium access
   Valid until: Jan 01, 2125

✅ Premium access granted successfully!
```

**Common Use Cases**:
- Staff/team accounts
- Beta testers
- Influencer/promotional accounts
- Customer compensation
- Lifetime deals

### 💰 create-free-stripe-subscription.js

**Description**: Creates a real Stripe subscription at $0.00 using a 100% coupon. Appears in Stripe Dashboard and auto-renews.

**What it does**:
- Creates Stripe customer if needed
- Creates 100% off coupon
- Creates subscription with coupon
- Updates database

**Usage**:
```bash
# First, list available plans
node scripts/list-plans.js

# Then create free subscription
node scripts/create-free-stripe-subscription.js user@example.com <plan-id>
```

**Common Use Cases**:
- Free accounts you want to track in Stripe
- Auto-renewing free access
- Appears in user's billing history

### 📋 list-plans.js

**Description**: Lists all premium plans from the database with their details and Stripe sync status.

**Usage**:
```bash
node scripts/list-plans.js
```

**Example Output**:
```
╔════════════════════════════════════════════════════════════╗
║              AVAILABLE PREMIUM PLANS                      ║
╚════════════════════════════════════════════════════════════╝

Plan 1: WizNote Pro
   ID: cddf6c0b-3ec4-4a68-b137-dfe58ce17c1a
   Price: $9.99/monthly
   Status: ✅ Active
   Stripe Synced: ✅ price_1SFNXSJ8pJSkCNufdNODhET9

Total Plans: 3
```

**Common Use Cases**:
- Before granting free premium
- Checking plan IDs for scripts
- Verifying Stripe sync status

### 📊 check-webhook-logs.js

**Description**: Checks Stripe webhook configuration and recent webhook events to help debug why premium isn't activating after purchase.

**What it shows**:
- Configured webhook endpoints
- Recent webhook events
- Failed webhooks
- Pending webhooks

**Usage**:
```bash
node scripts/check-webhook-logs.js
```

**Environment Variables Required**:
- `STRIPE_SECRET_KEY`

**Example Output**:
```
╔════════════════════════════════════════════════════════════╗
║           STRIPE WEBHOOK DIAGNOSTICS                     ║
╚════════════════════════════════════════════════════════════╝

🔍 Fetching webhook endpoints...
✅ Found 1 webhook endpoint(s)

Webhook 1:
   URL: https://api.webcap.media/api/stripe/webhook
   Status: enabled
   Events: checkout.session.completed, customer.subscription.updated...

📊 Recent Webhook Events (last 10):

✅ Event 1:
   Type: customer.subscription.created
   Created: 10/14/2025, 10:30:00 AM
   Pending webhooks: 0

⚠️  Found 2 events with pending webhooks
💡 Check Stripe Dashboard → Webhooks for detailed error logs
```

**Common Use Cases**:
- Debugging webhook failures
- Premium not activating after purchase
- Verifying webhook configuration
- Checking for failed events

### 📧 test-email-verification-settings.js

**Description**: Tests the email verification system settings to ensure they properly control signup flow and override Supabase dashboard settings.

**Usage**:
```bash
node scripts/test-email-verification-settings.js
```

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)

**Common Use Cases**:
- After implementing email verification
- Testing system settings changes
- Verifying email verification works

---

## Running Scripts

### Prerequisites

1. **Environment Setup**: Ensure you have a `.env` file in the project root with all required environment variables
2. **Dependencies**: Make sure all npm dependencies are installed (`npm install`)
3. **Database Access**: Ensure your Supabase credentials are valid and have appropriate permissions
4. **Stripe Access**: Verify your Stripe API keys are valid and have the necessary permissions

### General Script Execution

All scripts can be run in several ways:

```bash
# Using npm scripts (recommended)
npm run <script-name>

# Direct execution
node scripts/<script-name>

# With additional options
node scripts/<script-name> --option1 --option2
```

### Common Options

Most scripts support these common options:

- `--help`, `-h` - Show help information
- `--dry-run` - Preview changes without making them (when supported)
- `--verbose` - Show detailed output (when supported)

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Create the script file** with a descriptive name ending in `.js`
2. **Add proper error handling** and logging
3. **Include command-line help** with `--help` option
4. **Update this documentation** with the new script's information
5. **Add npm script** to `package.json` if appropriate
6. **Test thoroughly** before committing

### Script Template

```javascript
#!/usr/bin/env node

/**
 * Script Name
 * 
 * Description of what this script does
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class ScriptService {
  constructor() {
    // Initialize stats, options, etc.
  }

  async run() {
    try {
      // Main script logic here
      console.log('🚀 Starting script...');
      
      // Your code here
      
      console.log('✅ Script completed successfully!');
    } catch (error) {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Script Name

Usage: node scripts/script-name.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be updated without making changes

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
    `);
    process.exit(0);
  }

  const scriptService = new ScriptService();
  await scriptService.run();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = ScriptService;
```

---

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables
   ```
   - Check your `.env` file exists and has all required variables
   - Verify variable names match exactly (case-sensitive)

2. **Database Connection Errors**
   ```
   ❌ Failed to fetch users: [error message]
   ```
   - Verify Supabase URL and service role key are correct
   - Check if your Supabase project is accessible
   - Ensure the service role key has appropriate permissions

3. **Stripe API Errors**
   ```
   ❌ Error processing user: [stripe error]
   ```
   - Verify Stripe secret key is correct and active
   - Check if you have the necessary Stripe permissions
   - Ensure you're using the correct environment (test vs live)

4. **Permission Errors**
   ```
   ❌ Failed to update user: [permission error]
   ```
   - Verify the service role key has write permissions
   - Check Row Level Security (RLS) policies
   - Ensure the user table structure matches expectations

### Getting Help

If you encounter issues:

1. **Check the logs** - Scripts provide detailed error messages
2. **Run with `--verbose`** - Get more detailed output
3. **Use `--dry-run`** - Test without making changes
4. **Verify environment** - Double-check all required variables
5. **Check permissions** - Ensure API keys have necessary access

---

## Security Notes

- **Never commit** `.env` files or API keys to version control
- **Use secret keys** (new `sb_secret_...` format) or service role keys only for server-side operations
- **Limit API key permissions** to only what's necessary
- **Monitor script execution** and review changes before applying
- **Use dry-run mode** to preview changes in production environments

### API Key Formats

**Supabase** (New format recommended):
- `SUPABASE_SECRET_KEY=sb_secret_...` - NEW format, better security
- `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...` - LEGACY format (may be disabled)
- Scripts support both formats automatically

**Stripe**:
- Test: `STRIPE_SECRET_KEY=sk_test_...`
- Live: `STRIPE_SECRET_KEY=sk_live_...`

Always verify which environment (test/live) you're using before running scripts!
