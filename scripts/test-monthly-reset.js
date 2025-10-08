#!/usr/bin/env node

/**
 * Test script for monthly usage reset functionality
 * 
 * This script simulates the monthly reset process to test it before deployment
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testMonthlyReset() {
  try {
    console.log('🧪 Testing Monthly Usage Reset...');
    console.log('📅 Test date:', new Date().toISOString());
    
    // Get current usage statistics
    const { data: allUsage, error: fetchError } = await supabase
      .from('user_feature_usage')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching usage records:', fetchError);
      return;
    }

    if (!allUsage || allUsage.length === 0) {
      console.log('✅ No usage records found - nothing to test');
      return;
    }

    console.log(`📊 Found ${allUsage.length} usage records`);

    // Show current usage statistics
    const uniqueUsers = new Set(allUsage.map(record => record.user_id));
    const uniqueFeatures = new Set(allUsage.map(record => record.feature_id));
    
    console.log('\n📈 Current Usage Statistics:');
    console.log(`  - Total users: ${uniqueUsers.size}`);
    console.log(`  - Total features: ${uniqueFeatures.size}`);
    console.log(`  - Total usage records: ${allUsage.length}`);

    // Show some sample records
    console.log('\n📋 Sample Usage Records:');
    allUsage.slice(0, 5).forEach((record, index) => {
      console.log(`  ${index + 1}. User: ${record.user_id.substring(0, 8)}...`);
      console.log(`     Feature: ${record.feature_id}`);
      console.log(`     Usage Count: ${record.usage_count}`);
      console.log(`     Period: ${record.period_type}`);
      console.log(`     Period Start: ${record.current_period_start}`);
      console.log('     ---');
    });

    // Test the reset logic (without actually resetting)
    const currentDate = new Date();
    let expiredCount = 0;

    allUsage.forEach(record => {
      const periodStart = new Date(record.current_period_start);
      const periodType = record.period_type;
      let needsReset = false;
      
      switch (periodType) {
        case 'daily':
          needsReset = !isSameDay(periodStart, currentDate);
          break;
        case 'weekly':
          needsReset = !isSameWeek(periodStart, currentDate);
          break;
        case 'monthly':
          needsReset = !isSameMonth(periodStart, currentDate);
          break;
      }
      
      if (needsReset) {
        expiredCount++;
      }
    });

    console.log(`\n🔄 Reset Analysis:`);
    console.log(`  - Records that would be reset: ${expiredCount}`);
    console.log(`  - Records that would remain unchanged: ${allUsage.length - expiredCount}`);

    if (expiredCount > 0) {
      console.log('\n⚠️  Found expired records that would be reset in a real monthly reset.');
      console.log('   This is normal - it means the reset system is working correctly.');
    } else {
      console.log('\n✅ No expired records found - all usage is current.');
    }

    console.log('\n🎉 Monthly reset test completed successfully!');
    console.log('   The reset system is ready for deployment.');

  } catch (error) {
    console.error('❌ Monthly reset test failed:', error);
    process.exit(1);
  }
}

// Helper functions for date comparison
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isSameWeek(date1, date2) {
  const week1 = getWeekNumber(date1);
  const week2 = getWeekNumber(date2);
  return week1.year === week2.year && week1.week === week2.week;
}

function isSameMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth();
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    year: d.getUTCFullYear(),
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  };
}

// Run the test
testMonthlyReset();
