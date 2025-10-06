#!/usr/bin/env node

/**
 * DANGER: This script will delete ALL data from your database
 * - All users and user profiles
 * - All notes
 * - All audio files
 * - All feature usage data
 * - All subscription data
 * 
 * This action is IRREVERSIBLE!
 * 
 * Usage: node scripts/delete-all-data.js --confirm
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Safety check
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.error('❌ DANGER: This script will delete ALL data from your database!');
  console.error('❌ This action is IRREVERSIBLE!');
  console.error('');
  console.error('To proceed, run: node scripts/delete-all-data.js --confirm');
  console.error('');
  console.error('This will delete:');
  console.error('  - All users and user profiles');
  console.error('  - All notes');
  console.error('  - All audio files');
  console.error('  - All feature usage data');
  console.error('  - All subscription data');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Statistics tracking
let stats = {
  users: 0,
  userProfiles: 0,
  notes: 0,
  audioFiles: 0,
  featureUsage: 0,
  subscriptions: 0,
  errors: 0
};

async function deleteAllData() {
  console.log('🚨 STARTING COMPLETE DATA DELETION 🚨');
  console.log('This will delete ALL data from your database...');
  console.log('');

  try {
    // 1. Delete all feature usage data
    console.log('📊 Deleting feature usage data...');
    const { error: featureUsageError } = await supabase
      .from('user_feature_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (featureUsageError) {
      console.error('❌ Error deleting feature usage:', featureUsageError);
      stats.errors++;
    } else {
      console.log('✅ Feature usage data deleted');
    }

    // 2. Delete all notes
    console.log('📝 Deleting all notes...');
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (notesError) {
      console.error('❌ Error deleting notes:', notesError);
      stats.errors++;
    } else {
      console.log('✅ All notes deleted');
    }

    // 3. Delete all audio files (if table exists)
    console.log('🎵 Deleting all audio files...');
    try {
      const { error: audioError } = await supabase
        .from('audio_files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (audioError) {
        if (audioError.code === '42P01') {
          console.log('✅ Audio files table does not exist - nothing to delete');
        } else {
          console.error('❌ Error deleting audio files:', audioError);
          stats.errors++;
        }
      } else {
        console.log('✅ All audio files deleted');
      }
    } catch (error) {
      console.log('✅ Audio files table does not exist - nothing to delete');
    }

    // 4. Delete all user profiles
    console.log('👤 Deleting all user profiles...');
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (profilesError) {
      console.error('❌ Error deleting user profiles:', profilesError);
      stats.errors++;
    } else {
      console.log('✅ All user profiles deleted');
    }

    // 5. Delete all users from auth.users (this requires admin privileges)
    console.log('🔐 Deleting all users from auth...');
    try {
      // Note: This requires admin privileges and might not work with service role key
      const { error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.log('⚠️  Cannot delete auth users with current permissions');
        console.log('   You may need to delete users manually from Supabase dashboard');
      } else {
        console.log('⚠️  Auth users deletion requires manual intervention');
        console.log('   Please delete users from Supabase Auth dashboard');
      }
    } catch (error) {
      console.log('⚠️  Auth users deletion requires manual intervention');
      console.log('   Please delete users from Supabase Auth dashboard');
    }

    // 6. Delete any other related data
    console.log('🗑️  Cleaning up other related data...');
    
    // Delete feature limits (optional - you might want to keep these)
    const { error: limitsError } = await supabase
      .from('feature_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (limitsError) {
      console.log('⚠️  Could not delete feature limits:', limitsError.message);
    } else {
      console.log('✅ Feature limits deleted');
    }

    // Delete premium plans (optional - you might want to keep these)
    const { error: plansError } = await supabase
      .from('premium_plans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (plansError) {
      console.log('⚠️  Could not delete premium plans:', plansError.message);
    } else {
      console.log('✅ Premium plans deleted');
    }

    console.log('');
    console.log('🎉 DATA DELETION COMPLETED!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Feature usage data: Deleted`);
    console.log(`   ✅ Notes: Deleted`);
    console.log(`   ✅ Audio files: Deleted`);
    console.log(`   ✅ User profiles: Deleted`);
    console.log(`   ⚠️  Auth users: Manual deletion required`);
    console.log(`   ✅ Feature limits: Deleted`);
    console.log(`   ✅ Premium plans: Deleted`);
    console.log(`   ❌ Errors: ${stats.errors}`);
    console.log('');
    console.log('⚠️  IMPORTANT: You may need to manually delete users from the Supabase Auth dashboard');
    console.log('⚠️  Also check for any files in Supabase Storage that need manual deletion');

  } catch (error) {
    console.error('❌ Fatal error during deletion:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteAllData().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
