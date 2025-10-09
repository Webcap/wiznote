/**
 * Test Feature Flag Toggle
 * This script tests toggling the ai_quiz feature flag on/off
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

async function testFeatureFlagToggle() {
  console.log('🧪 Testing AI Quiz Feature Flag Toggle\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Get current state
    console.log('📊 Step 1: Getting current state...');
    const { data: currentState, error: getError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', 'ai_quiz')
      .single();

    if (getError) {
      console.error('❌ Error getting current state:', getError.message);
      process.exit(1);
    }

    console.log(`   Current enabled: ${currentState.enabled ? '✅ true' : '❌ false'}`);
    console.log(`   Current premium_only: ${currentState.premium_only ? '✅ true' : '❌ false'}\n`);

    // Step 2: Toggle to disabled
    console.log('🔄 Step 2: Toggling to DISABLED...');
    const { error: disableError } = await supabase
      .from('feature_flags')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'ai_quiz');

    if (disableError) {
      console.error('❌ Error disabling:', disableError.message);
      process.exit(1);
    }
    console.log('   ✅ Successfully disabled\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Verify disabled
    console.log('📊 Step 3: Verifying disabled state...');
    const { data: disabledState, error: verifyDisableError } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('id', 'ai_quiz')
      .single();

    if (verifyDisableError) {
      console.error('❌ Error verifying:', verifyDisableError.message);
      process.exit(1);
    }

    if (!disabledState.enabled) {
      console.log('   ✅ Verified: Feature is disabled\n');
    } else {
      console.error('   ❌ Error: Feature is still enabled!\n');
      process.exit(1);
    }

    // Step 4: Toggle back to enabled
    console.log('🔄 Step 4: Toggling back to ENABLED...');
    const { error: enableError } = await supabase
      .from('feature_flags')
      .update({
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'ai_quiz');

    if (enableError) {
      console.error('❌ Error enabling:', enableError.message);
      process.exit(1);
    }
    console.log('   ✅ Successfully enabled\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 5: Verify enabled
    console.log('📊 Step 5: Verifying enabled state...');
    const { data: enabledState, error: verifyEnableError } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('id', 'ai_quiz')
      .single();

    if (verifyEnableError) {
      console.error('❌ Error verifying:', verifyEnableError.message);
      process.exit(1);
    }

    if (enabledState.enabled) {
      console.log('   ✅ Verified: Feature is enabled\n');
    } else {
      console.error('   ❌ Error: Feature is still disabled!\n');
      process.exit(1);
    }

    // Step 6: Test premium toggle
    console.log('🔄 Step 6: Testing premium_only toggle...');
    const { error: premiumError } = await supabase
      .from('feature_flags')
      .update({
        premium_only: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'ai_quiz');

    if (premiumError) {
      console.error('❌ Error setting premium:', premiumError.message);
      process.exit(1);
    }
    console.log('   ✅ Set premium_only to true\n');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 7: Toggle premium back to false (for testing)
    console.log('🔄 Step 7: Restoring premium_only to false...');
    const { error: unpremiumError } = await supabase
      .from('feature_flags')
      .update({
        premium_only: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'ai_quiz');

    if (unpremiumError) {
      console.error('❌ Error unsetting premium:', unpremiumError.message);
      process.exit(1);
    }
    console.log('   ✅ Restored premium_only to false\n');

    // Final state
    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📊 Final State:');
    console.log('   - Enabled: ✅ true');
    console.log('   - Premium Only: ❌ false\n');
    console.log('💡 Feature flag toggling works correctly!');
    console.log('🔄 Cache will auto-expire in 5 minutes, or use Clear Cache button\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the test
testFeatureFlagToggle();


