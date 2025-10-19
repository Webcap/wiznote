#!/usr/bin/env node

/**
 * Check Test User Usage
 * 
 * Displays the current usage status for the test user
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

// All feature limits
const FEATURE_LIMITS = {
  'ai_transcription': { name: 'AI Transcription', freeLimit: 10, limitType: 'count' },
  'ai_summaries': { name: 'AI Summaries', freeLimit: 15, limitType: 'count' },
  'ai_key_details': { name: 'AI Key Details', freeLimit: 5, limitType: 'count' },
  'ai_name_generating': { name: 'AI Name Generation', freeLimit: 10, limitType: 'count' },
  'ai_flashcards': { name: 'AI Flashcard Generation', freeLimit: 5, limitType: 'count' },
  'voice_recording': { name: 'Voice Recording', freeLimit: 60, limitType: 'duration' },
  'note_storage': { name: 'Note Storage', freeLimit: 100 * 1024 * 1024, limitType: 'storage' },
  // 'note_sharing' removed - it's a free core feature with no limits
  'real_time_sync': { name: 'Real-time Sync', freeLimit: 100, limitType: 'count' },
  'advanced_search': { name: 'Advanced Search', freeLimit: 15, limitType: 'count' },
  'note_export': { name: 'Note Export', freeLimit: 5, limitType: 'count' },
  'custom_themes': { name: 'Custom Themes', freeLimit: 2, limitType: 'count' },
  'priority_support': { name: 'Priority Support', freeLimit: 1, limitType: 'count' }
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatValue(value, limitType) {
  if (limitType === 'storage') {
    return formatBytes(value);
  } else if (limitType === 'duration') {
    return `${value} minutes`;
  } else {
    return `${value}`;
  }
}

async function checkTestUserUsage(email) {
  try {
    console.log('🔍 Checking test user usage...');
    console.log(`📧 Email: ${email}`);
    console.log('');

    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('');
      console.log('💡 Create the test user first:');
      console.log(`   node scripts/create-test-user-full-usage.js --email ${email}`);
      process.exit(1);
    }

    console.log(`👤 User ID: ${user.id}`);
    console.log('');

    // Get usage records
    const { data: usageRecords, error } = await supabase
      .from('user_feature_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('feature_id');

    if (error) {
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }

    if (!usageRecords || usageRecords.length === 0) {
      console.log('⚠️  No usage records found for this user');
      console.log('');
      console.log('💡 This user has not used any features yet, or usage has been reset.');
      return;
    }

    console.log('📊 Feature Usage Status:');
    console.log('━'.repeat(80));

    let atLimitCount = 0;
    let emptyCount = 0;
    let partialCount = 0;

    for (const record of usageRecords) {
      const config = FEATURE_LIMITS[record.feature_id];
      if (!config) continue;

      let currentUsage = 0;
      if (config.limitType === 'duration') {
        currentUsage = record.usage_duration || 0;
      } else if (config.limitType === 'storage') {
        currentUsage = record.usage_storage || 0;
      } else {
        currentUsage = record.usage_count || 0;
      }

      const limit = config.freeLimit;
      const percentage = Math.round((currentUsage / limit) * 100);
      
      let status = '';
      if (currentUsage === 0) {
        status = '✅ Empty';
        emptyCount++;
      } else if (currentUsage >= limit) {
        status = '🔴 At Limit';
        atLimitCount++;
      } else {
        status = '🟡 Partial';
        partialCount++;
      }

      const usageDisplay = formatValue(currentUsage, config.limitType);
      const limitDisplay = formatValue(limit, config.limitType);

      console.log(`${status} ${config.name.padEnd(30)} ${usageDisplay.padStart(15)} / ${limitDisplay.padEnd(15)} (${percentage}%)`);
    }

    console.log('━'.repeat(80));
    console.log('');
    console.log('📈 Summary:');
    console.log(`   🔴 At Limit:  ${atLimitCount} features`);
    console.log(`   🟡 Partial:   ${partialCount} features`);
    console.log(`   ✅ Empty:     ${emptyCount} features`);
    console.log(`   📊 Total:     ${usageRecords.length} features`);

    if (atLimitCount === Object.keys(FEATURE_LIMITS).length) {
      console.log('');
      console.log('🎯 All features are at 100% usage - perfect for testing monthly reset!');
    } else if (emptyCount === Object.keys(FEATURE_LIMITS).length) {
      console.log('');
      console.log('✨ All features have been reset - usage is at 0%');
    }

  } catch (error) {
    console.error('❌ Failed to check user usage:', error.message);
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Check Test User Usage

Usage: node scripts/check-test-user-usage.js [options]

Options:
  --email EMAIL       Email of test user to check (default: test@webcap.cc)
  --help, -h          Show this help message

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Example:
  node scripts/check-test-user-usage.js
  node scripts/check-test-user-usage.js --email test@example.com
    `);
    process.exit(0);
  }

  // Parse arguments
  let email = 'test@webcap.cc';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    }
  }

  await checkTestUserUsage(email);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = checkTestUserUsage;

