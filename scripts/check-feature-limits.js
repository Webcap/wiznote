#!/usr/bin/env node

/**
 * Script to check the current feature limits configuration in the database
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

async function checkFeatureLimits() {
  try {
    console.log('🔍 Checking feature limits configuration...');
    
    // Check feature_limits table
    const { data: featureLimits, error: limitsError } = await supabase
      .from('feature_limits')
      .select('*')
      .eq('feature_id', 'ai_key_details');

    if (limitsError) {
      console.error('❌ Error fetching feature limits:', limitsError);
      return;
    }

    console.log(`📊 Found ${featureLimits?.length || 0} feature limit records for ai_key_details:`);
    
    if (featureLimits && featureLimits.length > 0) {
      featureLimits.forEach(limit => {
        console.log(`  - ID: ${limit.id}`);
        console.log(`  - Feature ID: ${limit.feature_id}`);
        console.log(`  - Feature Name: ${limit.feature_name}`);
        console.log(`  - Free User Limit: ${limit.free_user_limit}`);
        console.log(`  - Premium User Limit: ${limit.premium_user_limit}`);
        console.log(`  - Is Active: ${limit.is_active}`);
        console.log(`  - Created: ${limit.created_at}`);
        console.log(`  - Updated: ${limit.updated_at}`);
        console.log('  ---');
      });
    } else {
      console.log('⚠️  No feature limits found for ai_key_details in database');
    }

    // Check user_feature_usage table
    console.log('\n🔍 Checking user feature usage...');
    const { data: usageData, error: usageError } = await supabase
      .from('user_feature_usage')
      .select('*')
      .eq('feature_id', 'ai_key_details');

    if (usageError) {
      console.error('❌ Error fetching usage data:', usageError);
      return;
    }

    console.log(`📊 Found ${usageData?.length || 0} usage records for ai_key_details:`);
    
    if (usageData && usageData.length > 0) {
      usageData.forEach(usage => {
        console.log(`  - User ID: ${usage.user_id}`);
        console.log(`  - Feature ID: ${usage.feature_id}`);
        console.log(`  - Usage Count: ${usage.usage_count}`);
        console.log(`  - Usage Duration: ${usage.usage_duration}`);
        console.log(`  - Period Start: ${usage.current_period_start}`);
        console.log(`  - Period End: ${usage.current_period_end}`);
        console.log(`  - Last Used: ${usage.last_used_at}`);
        console.log('  ---');
      });
    } else {
      console.log('⚠️  No usage records found for ai_key_details');
    }

    // Check if there are any other usage tracking tables
    console.log('\n🔍 Checking for other usage tracking tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%usage%');

    if (tablesError) {
      console.warn('⚠️  Could not check for other usage tables:', tablesError);
    } else {
      console.log('📊 Usage-related tables found:');
      tables?.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
checkFeatureLimits();
