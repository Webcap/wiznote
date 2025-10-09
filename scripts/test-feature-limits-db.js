#!/usr/bin/env node

/**
 * Test script to check feature limits database connectivity and table structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeatureLimitsDatabase() {
  console.log('🔍 Testing Feature Limits Database Connection');
  console.log('');

  try {
    // 1. Test basic connection
    console.log('1. Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('feature_limits')
      .select('count', { count: 'exact' });
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    console.log('✅ Connection successful');
    console.log(`   Current records: ${testData?.length || 0}`);
    console.log('');

    // 2. Check table structure
    console.log('2. Checking table structure...');
    const { data: structureData, error: structureError } = await supabase
      .from('feature_limits')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Structure check failed:', structureError);
    } else {
      console.log('✅ Table structure accessible');
      if (structureData && structureData.length > 0) {
        console.log('   Sample record fields:', Object.keys(structureData[0]));
      } else {
        console.log('   Table is empty - no sample record to check structure');
      }
    }
    console.log('');

    // 3. Test insert operation
    console.log('3. Testing insert operation...');
    const testLimit = {
      id: 'test-feature-' + Date.now(),
      feature_id: 'test-feature-' + Date.now(),
      feature_name: 'Test Feature',
      description: 'Test feature for database connectivity',
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

    const { data: insertData, error: insertError } = await supabase
      .from('feature_limits')
      .insert(testLimit);

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert operation successful');
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('feature_limits')
        .delete()
        .eq('feature_id', testLimit.feature_id);
      
      if (deleteError) {
        console.log('⚠️  Warning: Could not clean up test record:', deleteError);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }
    console.log('');

    // 4. Check RLS policies
    console.log('4. Checking RLS policies...');
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'feature_limits' });
    
    if (policiesError) {
      console.log('⚠️  Could not check RLS policies (function may not exist)');
    } else {
      console.log('✅ RLS policies check:', policiesData);
    }
    console.log('');

    // 5. Test with service role key permissions
    console.log('5. Testing service role permissions...');
    const { data: adminData, error: adminError } = await supabase
      .from('feature_limits')
      .select('*')
      .limit(5);
    
    if (adminError) {
      console.error('❌ Service role permissions test failed:', adminError);
    } else {
      console.log('✅ Service role has proper permissions');
      console.log(`   Retrieved ${adminData?.length || 0} records`);
    }

  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
  }
}

// Run the test
testFeatureLimitsDatabase().then(() => {
  console.log('✅ Database test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Database test failed:', error);
  process.exit(1);
});

