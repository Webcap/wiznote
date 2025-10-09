/**
 * Setup AI Quiz Feature Flags
 * This script ensures everything is properly configured
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupQuizFeatureFlags() {
  console.log('🚀 Setting up AI Quiz Feature Flags\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Check if feature exists
    console.log('📊 Step 1: Checking if ai_quiz exists in database...');
    const { data: existing, error: checkError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 'ai_quiz')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking:', checkError.message);
      process.exit(1);
    }

    // Step 2: Upsert the feature flag
    console.log('📝 Step 2: Upserting ai_quiz feature flag...');
    const { data: upserted, error: upsertError } = await supabase
      .from('feature_flags')
      .upsert({
        id: 'ai_quiz',
        name: 'AI Quiz Generation',
        description: 'Enable AI-powered quiz generation based on notes content, audio, summaries, and key details',
        enabled: true,
        premium_only: false,
        tracking_enabled: true,
        target_environments: ['development', 'staging', 'production'],
        target_roles: ['admin', 'user'],
        target_users: [],
        rollout_percentage: null,
        updated_at: new Date().toISOString(),
        created_by: 'setup-script',
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('❌ Error upserting:', upsertError.message);
      process.exit(1);
    }

    console.log('   ✅ Feature flag configured in database\n');

    // Step 3: Verify configuration
    console.log('📊 Step 3: Verifying configuration...');
    const { data: verified, error: verifyError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 'ai_quiz')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
      process.exit(1);
    }

    console.log('   ✅ Configuration verified\n');

    // Display current configuration
    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ AI Quiz Feature Flag Setup Complete!\n');
    console.log('📊 Current Configuration:');
    console.log(`   ID: ${verified.id}`);
    console.log(`   Name: ${verified.name}`);
    console.log(`   Enabled: ${verified.enabled ? '✅ true' : '❌ false'}`);
    console.log(`   Premium Only: ${verified.premium_only ? '🔒 true' : '🔓 false'}`);
    console.log(`   Tracking: ${verified.tracking_enabled ? '✅ true' : '❌ false'}`);
    console.log(`   Environments: ${JSON.stringify(verified.target_environments)}`);
    console.log(`   Roles: ${JSON.stringify(verified.target_roles)}`);
    console.log(`   Updated: ${new Date(verified.updated_at).toLocaleString()}\n`);

    console.log('═══════════════════════════════════════════════════\n');
    console.log('📱 Next Steps:\n');
    console.log('   1. Clear app cache:');
    console.log('      • Web: Run in console:');
    console.log('        localStorage.clear(); window.location.reload();');
    console.log('      • Mobile: Settings > Admin Debug Tools > Clear Cache\n');
    console.log('   2. Restart your app\n');
    console.log('   3. Go to any note\n');
    console.log('   4. Click the Quiz button - it should work! ✅\n');

    console.log('💡 To disable the feature:');
    console.log('   Update in database: enabled = false\n');

    console.log('💡 To make it premium-only:');
    console.log('   Update in database: premium_only = true\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupQuizFeatureFlags();


