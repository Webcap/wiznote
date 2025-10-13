/**
 * Script to delete the test user and verify deletion
 * 
 * Usage: node scripts/delete-test-user.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteTestUser() {
  console.log('🗑️  Deleting test user and verifying deletion...\n');

  const testEmail = 'test.16@webcap.cc';

  try {
    // Step 1: Find the user
    console.log('🔍 Finding user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === testEmail);
    if (!user) {
      console.log('ℹ️  User not found - may already be deleted');
      return;
    }

    const userId = user.id;
    console.log('✅ Found user:', userId);

    // Step 2: Check what data exists before deletion
    console.log('\n📊 Checking existing data...');
    
    const { data: notes } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', userId);
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    console.log(`   Notes: ${notes?.length || 0}`);
    console.log(`   Profile: ${profile ? 'exists' : 'not found'}`);

    // Step 3: Delete profile FIRST (to avoid FK constraint errors)
    console.log('\n🧹 Deleting profile first...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('⚠️  Could not delete profile:', profileError.message);
    } else {
      console.log('✅ Profile deleted');
    }

    // Step 4: Delete using admin API
    console.log('\n🗑️  Deleting auth user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('❌ Error deleting auth user:', deleteError.message);
      console.log('ℹ️  Attempting alternative deletion method...');
      
      // Try deleting with shouldSoftDelete option
      const { error: softDeleteError } = await supabase.auth.admin.deleteUser(userId, false);
      if (softDeleteError) {
        console.error('❌ Alternative deletion also failed:', softDeleteError.message);
      } else {
        console.log('✅ Auth user deleted via alternative method');
      }
    } else {
      console.log('✅ Auth user deleted');
    }

    // Step 5: Verify deletion
    console.log('\n✅ Verifying deletion...');
    
    const { data: { users: afterUsers } } = await supabase.auth.admin.listUsers();
    const stillExists = afterUsers.find(u => u.id === userId);
    
    const { data: notesAfter } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', userId);
    
    const { data: profileAfter } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION RESULTS:');
    console.log('='.repeat(60));
    console.log(`   Auth User: ${stillExists ? '❌ Still exists' : '✅ Deleted'}`);
    console.log(`   Profile: ${profileAfter ? '❌ Still exists' : '✅ Deleted'}`);
    console.log(`   Notes: ${notesAfter?.length || 0} ${notesAfter?.length ? '❌ Still exist' : '✅ Deleted'}`);
    console.log('='.repeat(60));

    if (!stillExists && !profileAfter && !notesAfter?.length) {
      console.log('\n✅ COMPLETE DELETION SUCCESSFUL! 🎉');
      console.log('   All user data has been completely removed.');
    } else {
      console.log('\n⚠️  PARTIAL DELETION');
      console.log('   Some data may still exist in the database.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error.message) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
deleteTestUser()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

