# Scripts Documentation

This directory contains utility scripts for managing and maintaining the WizNote application.

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
- **Use service role keys** only for server-side operations
- **Limit API key permissions** to only what's necessary
- **Monitor script execution** and review changes before applying
- **Use dry-run mode** to preview changes in production environments
