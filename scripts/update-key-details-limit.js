#!/usr/bin/env node

/**
 * Script to update the AI Key Details limit from 15 to 5 in the database
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

async function updateKeyDetailsLimit() {
  try {
    console.log('🔍 Updating AI Key Details limit from 15 to 5...');
    
    // Update the feature limit in the database
    const { data, error } = await supabase
      .from('feature_limits')
      .update({
        free_user_limit: 5,
        updated_at: new Date().toISOString()
      })
      .eq('feature_id', 'ai_key_details')
      .select();

    if (error) {
      console.error('❌ Error updating feature limit:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully updated AI Key Details limit:');
      console.log(`  - Feature ID: ${data[0].feature_id}`);
      console.log(`  - Feature Name: ${data[0].feature_name}`);
      console.log(`  - Old Free User Limit: 15`);
      console.log(`  - New Free User Limit: ${data[0].free_user_limit}`);
      console.log(`  - Premium User Limit: ${data[0].premium_user_limit}`);
      console.log(`  - Updated At: ${data[0].updated_at}`);
    } else {
      console.log('⚠️  No records were updated');
    }

    // Verify the update
    console.log('\n🔍 Verifying the update...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('feature_limits')
      .select('*')
      .eq('feature_id', 'ai_key_details');

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    if (verifyData && verifyData.length > 0) {
      const limit = verifyData[0];
      console.log('✅ Verification successful:');
      console.log(`  - Free User Limit: ${limit.free_user_limit}`);
      console.log(`  - Premium User Limit: ${limit.premium_user_limit}`);
      console.log(`  - Is Active: ${limit.is_active}`);
      
      if (limit.free_user_limit === 5) {
        console.log('🎉 AI Key Details limit successfully updated to 5!');
      } else {
        console.log('⚠️  Limit was not updated correctly');
      }
    } else {
      console.log('❌ Could not verify the update');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
updateKeyDetailsLimit();
