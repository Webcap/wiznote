#!/usr/bin/env node

/**
 * Script to reset AI Key Details usage for users who are over the limit
 * This addresses the issue where users have exceeded the 5-use limit
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetKeyDetailsUsage() {
  try {
    console.log('🔍 Checking users with AI Key Details usage over limit...');
    
    // Get all users with ai_key_details usage
    const { data: usageData, error: usageError } = await supabase
      .from('user_feature_usage')
      .select('user_id, usage_count, usage_duration')
      .eq('feature_id', 'ai_key_details');

    if (usageError) {
      console.error('❌ Error fetching usage data:', usageError);
      return;
    }

    console.log(`📊 Found ${usageData?.length || 0} users with AI Key Details usage records`);

    // Find users over the limit (5 uses)
    const overLimitUsers = usageData?.filter(user => 
      (user.usage_count || 0) > 5
    ) || [];

    console.log(`🚨 Found ${overLimitUsers.length} users over the 5-use limit:`);
    
    overLimitUsers.forEach(user => {
      console.log(`  - User ${user.user_id}: ${user.usage_count || 0} uses`);
    });

    if (overLimitUsers.length === 0) {
      console.log('✅ No users found over the limit');
      return;
    }

    // Reset usage for over-limit users
    console.log('\n🔄 Resetting usage for over-limit users...');
    
    for (const user of overLimitUsers) {
      const { error: resetError } = await supabase
        .from('user_feature_usage')
        .update({
          usage_count: 0,
          usage_duration: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)
        .eq('feature_id', 'ai_key_details');

      if (resetError) {
        console.error(`❌ Error resetting usage for user ${user.user_id}:`, resetError);
      } else {
        console.log(`✅ Reset usage for user ${user.user_id} (was ${user.usage_count} uses)`);
      }
    }

    console.log('\n✅ Usage reset complete!');
    
    // Verify the reset
    console.log('\n🔍 Verifying reset...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_feature_usage')
      .select('user_id, usage_count')
      .eq('feature_id', 'ai_key_details');

    if (verifyError) {
      console.error('❌ Error verifying reset:', verifyError);
      return;
    }

    const stillOverLimit = verifyData?.filter(user => (user.usage_count || 0) > 5) || [];
    
    if (stillOverLimit.length === 0) {
      console.log('✅ All users are now within the 5-use limit');
    } else {
      console.log(`⚠️  ${stillOverLimit.length} users still over limit after reset`);
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
resetKeyDetailsUsage();
