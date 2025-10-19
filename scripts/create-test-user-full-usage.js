#!/usr/bin/env node

/**
 * Create Test User with 100% Feature Usage
 * 
 * Creates a test user with all features at 100% usage for testing monthly reset
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// All feature limits (matching UnifiedFeatureLimits.ts)
const FEATURE_LIMITS = {
  'ai_transcription': { 
    name: 'AI Transcription', 
    freeLimit: 10, 
    limitType: 'count' 
  },
  'ai_summaries': { 
    name: 'AI Summaries', 
    freeLimit: 15, 
    limitType: 'count' 
  },
  'ai_key_details': { 
    name: 'AI Key Details', 
    freeLimit: 5, 
    limitType: 'count' 
  },
  'ai_name_generating': { 
    name: 'AI Name Generation', 
    freeLimit: 10, 
    limitType: 'count' 
  },
  'ai_flashcards': { 
    name: 'AI Flashcard Generation', 
    freeLimit: 5, 
    limitType: 'count' 
  },
  'voice_recording': { 
    name: 'Voice Recording', 
    freeLimit: 60, 
    limitType: 'duration' 
  },
  'note_storage': { 
    name: 'Note Storage', 
    freeLimit: 100 * 1024 * 1024, // 100MB
    limitType: 'storage' 
  },
  // 'note_sharing' removed - it's a free core feature with no limits
  'real_time_sync': { 
    name: 'Real-time Sync', 
    freeLimit: 100, 
    limitType: 'count' 
  },
  'advanced_search': { 
    name: 'Advanced Search', 
    freeLimit: 15, 
    limitType: 'count' 
  },
  'note_export': { 
    name: 'Note Export', 
    freeLimit: 5, 
    limitType: 'count' 
  },
  'custom_themes': { 
    name: 'Custom Themes', 
    freeLimit: 2, 
    limitType: 'count' 
  },
  'priority_support': { 
    name: 'Priority Support', 
    freeLimit: 1, 
    limitType: 'count' 
  }
};

class TestUserCreator {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.userId = null;
  }

  async run() {
    try {
      console.log('🚀 Creating test user with 100% feature usage...');
      console.log(`📧 Email: ${this.email}`);
      console.log('');

      // Step 1: Create or get user
      await this.createOrGetUser();

      // Step 2: Create or update user profile
      await this.createUserProfile();

      // Step 3: Set all features to 100% usage
      await this.setFeatureUsageTo100Percent();

      // Step 4: Verify the setup
      await this.verifySetup();

      console.log('');
      console.log('✅ Test user created successfully!');
      console.log('');
      console.log('📝 Test user credentials:');
      console.log(`   Email: ${this.email}`);
      console.log(`   Password: ${this.password}`);
      console.log(`   User ID: ${this.userId}`);
      console.log('');
      console.log('🎯 All features are now at 100% usage');
      console.log('   You can use this account to test the monthly reset cron job');

    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
      process.exit(1);
    }
  }

  async createOrGetUser() {
    console.log('👤 Step 1: Creating/getting user account...');

    // Try to get existing user first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === this.email);

    if (existingUser) {
      console.log(`   ℹ️  User already exists with ID: ${existingUser.id}`);
      this.userId = existingUser.id;
      
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        this.userId,
        { password: this.password }
      );
      
      if (updateError) {
        console.error('   ⚠️  Could not update password:', updateError.message);
      } else {
        console.log('   ✅ Password updated');
      }
    } else {
      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email: this.email,
        password: this.password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
          display_name: 'Test User'
        }
      });

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      this.userId = data.user.id;
      console.log(`   ✅ User created with ID: ${this.userId}`);
    }
  }

  async createUserProfile() {
    console.log('');
    console.log('📋 Step 2: Creating/updating user profile...');

    const profileData = {
      id: this.userId,
      premium: {
        isActive: false,
        planName: 'Free',
        planId: null
      },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id'
      });

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    console.log('   ✅ User profile created/updated');
  }

  async setFeatureUsageTo100Percent() {
    console.log('');
    console.log('⚡ Step 3: Setting all features to 100% usage...');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let successCount = 0;
    let errorCount = 0;

    for (const [featureId, config] of Object.entries(FEATURE_LIMITS)) {
      try {
        const usageData = {
          user_id: this.userId,
          feature_id: featureId,
          usage_count: 0,
          usage_duration: 0,
          usage_storage: 0,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          period_type: 'monthly',
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        // Set usage to 100% based on limit type
        if (config.limitType === 'duration') {
          usageData.usage_duration = config.freeLimit;
        } else if (config.limitType === 'storage') {
          usageData.usage_storage = config.freeLimit;
        } else {
          usageData.usage_count = config.freeLimit;
        }

        const { error } = await supabase
          .from('user_feature_usage')
          .upsert(usageData, {
            onConflict: 'user_id,feature_id'
          });

        if (error) {
          console.error(`   ❌ ${config.name}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ ${config.name}: ${config.freeLimit} ${config.limitType} (100%)`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ ${config.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('');
    console.log(`   📊 Summary: ${successCount} succeeded, ${errorCount} failed`);

    if (errorCount > 0) {
      console.warn('   ⚠️  Some features failed to set. Check errors above.');
    }
  }

  async verifySetup() {
    console.log('');
    console.log('🔍 Step 4: Verifying setup...');

    // Get all usage records for this user
    const { data: usageRecords, error } = await supabase
      .from('user_feature_usage')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      console.warn('   ⚠️  Could not verify setup:', error.message);
      return;
    }

    console.log(`   ✅ Found ${usageRecords.length} usage records`);

    // Check if all features are at 100%
    let at100Percent = 0;
    for (const record of usageRecords) {
      const config = FEATURE_LIMITS[record.feature_id];
      if (!config) continue;

      let currentUsage = 0;
      if (config.limitType === 'duration') {
        currentUsage = record.usage_duration;
      } else if (config.limitType === 'storage') {
        currentUsage = record.usage_storage;
      } else {
        currentUsage = record.usage_count;
      }

      if (currentUsage === config.freeLimit) {
        at100Percent++;
      }
    }

    console.log(`   ✅ ${at100Percent}/${Object.keys(FEATURE_LIMITS).length} features at 100% usage`);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Create Test User with 100% Feature Usage

Usage: node scripts/create-test-user-full-usage.js [options]

Options:
  --email EMAIL       Email for test user (default: test@webcap.cc)
  --password PASS     Password for test user (default: TestPassword123!)
  --help, -h          Show this help message

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Example:
  node scripts/create-test-user-full-usage.js
  node scripts/create-test-user-full-usage.js --email test@example.com --password MyPass123
    `);
    process.exit(0);
  }

  // Parse arguments
  let email = 'test@webcap.cc';
  let password = 'TestPassword123!';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    }
  }

  const creator = new TestUserCreator(email, password);
  await creator.run();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = TestUserCreator;

