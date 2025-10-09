#!/usr/bin/env node

/**
 * Check what's actually in the feature_limits table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFeatureLimitsData() {
  console.log('🔍 Checking Feature Limits Data');
  console.log('');

  try {
    // 1. Count all records
    console.log('1. Counting all records...');
    const { count, error: countError } = await supabase
      .from('feature_limits')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
    } else {
      console.log(`✅ Total records: ${count}`);
    }
    console.log('');

    // 2. Get all records
    console.log('2. Getting all records...');
    const { data: allData, error: allError } = await supabase
      .from('feature_limits')
      .select('*');
    
    if (allError) {
      console.error('❌ Get all error:', allError);
    } else {
      console.log(`✅ Retrieved ${allData?.length || 0} records`);
      if (allData && allData.length > 0) {
        console.log('   Records:');
        allData.forEach((record, index) => {
          console.log(`     ${index + 1}. ${record.feature_name || 'Unknown'} (${record.feature_id})`);
        });
      }
    }
    console.log('');

    // 3. Try to insert a test record and immediately retrieve it
    console.log('3. Testing insert and immediate retrieval...');
    const testId = 'test-feature-' + Date.now();
    const testRecord = {
      id: testId,
      feature_id: testId,
      feature_name: 'Test Feature',
      description: 'Test feature for debugging',
      category: 'test',
      priority: 1,
      is_active: true,
      free_user_limit: 5,
      free_user_limit_type: 'count',
      free_user_period: 'monthly',
      free_user_session_limit: 1,
      premium_user_limit: 'unlimited',
      premium_user_limit_type: 'count',
      premium_user_period: 'monthly',
      premium_user_session_limit: 'unlimited',
      updated_at: new Date().toISOString(),
    };

    // Insert
    const { data: insertData, error: insertError } = await supabase
      .from('feature_limits')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful');
      console.log('   Inserted record:', insertData);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retrieve
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('feature_limits')
      .select('*')
      .eq('feature_id', testId);

    if (retrieveError) {
      console.error('❌ Retrieve error:', retrieveError);
    } else {
      console.log(`✅ Retrieved ${retrieveData?.length || 0} records after insert`);
      if (retrieveData && retrieveData.length > 0) {
        console.log('   Retrieved record:', retrieveData[0]);
      }
    }

    // Clean up
    const { error: deleteError } = await supabase
      .from('feature_limits')
      .delete()
      .eq('feature_id', testId);

    if (deleteError) {
      console.log('⚠️  Could not clean up test record:', deleteError);
    } else {
      console.log('✅ Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the check
checkFeatureLimitsData().then(() => {
  console.log('✅ Data check completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Data check failed:', error);
  process.exit(1);
});

