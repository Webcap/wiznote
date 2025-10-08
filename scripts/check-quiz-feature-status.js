/**
 * Check AI Quiz Feature Status
 * This script checks the current status of ai_quiz feature flag in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuizFeatureStatus() {
  console.log('🔍 Checking ai_quiz feature flag status in database...\n');

  try {
    // Check if the feature flag exists in the database
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 'ai_quiz')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  ai_quiz feature flag NOT FOUND in database');
        console.log('\n💡 This means the feature flag needs to be created.');
        console.log('   Run: node scripts/sync-quiz-feature.js');
        return;
      }
      console.error('❌ Error checking feature flag:', error.message);
      process.exit(1);
    }

    console.log('✅ ai_quiz feature flag found in database!\n');
    console.log('📊 Current Status:');
    console.log('   - ID:', data.id);
    console.log('   - Name:', data.name);
    console.log('   - Enabled:', data.enabled ? '✅ true' : '❌ false');
    console.log('   - Premium Only:', data.premium_only ? '✅ true' : '❌ false');
    console.log('   - Tracking Enabled:', data.tracking_enabled ? '✅ true' : '❌ false');
    console.log('   - Target Environments:', data.target_environments);
    console.log('   - Created At:', data.created_at);
    console.log('   - Updated At:', data.updated_at);

    console.log('\n📝 Summary:');
    if (data.enabled) {
      console.log('   ✅ Feature is ENABLED in database');
    } else {
      console.log('   ❌ Feature is DISABLED in database');
      console.log('   💡 Run: node scripts/sync-quiz-feature.js to enable it');
    }

    if (data.premium_only) {
      console.log('   🔒 Premium only: YES (requires premium subscription)');
    } else {
      console.log('   🔓 Premium only: NO (available to all users)');
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. If feature is disabled, run sync script');
    console.log('   2. Clear app cache/storage or restart app');
    console.log('   3. Try accessing the feature again');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkQuizFeatureStatus();

