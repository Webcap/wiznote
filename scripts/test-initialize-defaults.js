#!/usr/bin/env node

/**
 * Test the initializeDefaults functionality directly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import the service
const { featureLimitService } = require('../services/FeatureLimitService');
const { UNIFIED_FEATURE_LIMITS } = require('../constants/UnifiedFeatureLimits');

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInitializeDefaults() {
  console.log('🔍 Testing Initialize Defaults Functionality');
  console.log('');

  try {
    // 1. Check current state
    console.log('1. Checking current database state...');
    const { count, error: countError } = await supabase
      .from('feature_limits')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
    } else {
      console.log(`✅ Current records in database: ${count}`);
    }
    console.log('');

    // 2. Check UNIFIED_FEATURE_LIMITS
    console.log('2. Checking UNIFIED_FEATURE_LIMITS...');
    console.log(`✅ UNIFIED_FEATURE_LIMITS has ${Object.keys(UNIFIED_FEATURE_LIMITS).length} features`);
    console.log('   Features:', Object.keys(UNIFIED_FEATURE_LIMITS));
    console.log('');

    // 3. Test the conversion function
    console.log('3. Testing conversion function...');
    const convertedLimits = featureLimitService.convertUnifiedToLegacy(UNIFIED_FEATURE_LIMITS);
    console.log(`✅ Converted ${Object.keys(convertedLimits).length} limits`);
    console.log('   Converted features:', Object.keys(convertedLimits));
    console.log('');

    // 4. Test the initializeDefaults function
    console.log('4. Testing initializeDefaults function...');
    try {
      await featureLimitService.initializeDefaultLimits();
      console.log('✅ initializeDefaultLimits completed successfully');
    } catch (error) {
      console.error('❌ initializeDefaultLimits failed:', error);
      console.error('   Error details:', error.message);
    }
    console.log('');

    // 5. Check database state after initialization
    console.log('5. Checking database state after initialization...');
    const { count: afterCount, error: afterCountError } = await supabase
      .from('feature_limits')
      .select('*', { count: 'exact', head: true });
    
    if (afterCountError) {
      console.error('❌ After count error:', afterCountError);
    } else {
      console.log(`✅ Records in database after initialization: ${afterCount}`);
    }

    // 6. Get the actual records
    const { data: records, error: recordsError } = await supabase
      .from('feature_limits')
      .select('*');
    
    if (recordsError) {
      console.error('❌ Get records error:', recordsError);
    } else {
      console.log(`✅ Retrieved ${records?.length || 0} records`);
      if (records && records.length > 0) {
        console.log('   Records:');
        records.forEach((record, index) => {
          console.log(`     ${index + 1}. ${record.feature_name} (${record.feature_id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the test
testInitializeDefaults().then(() => {
  console.log('✅ Initialize defaults test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Initialize defaults test failed:', error);
  process.exit(1);
});

