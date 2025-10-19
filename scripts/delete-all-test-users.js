/**
 * Script to delete all test users matching test.*@webcap.cc pattern
 * 
 * Usage: node scripts/delete-all-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Try both possible key names
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  console.error('\nCurrent values:');
  console.error('  EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
  console.error('  SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteUser(user) {
  const userId = user.id;
  const email = user.email;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🗑️  Deleting user: ${email}`);
  console.log(`   User ID: ${userId}`);
  console.log('='.repeat(80));

  try {
    // Check what data exists before deletion
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

    // Delete all related data before deleting the auth user
    console.log('\n🧹 Deleting related data...');
    
    // Delete notes
    console.log('   Deleting notes...');
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId);
    if (!notesError) console.log(`   ✅ ${notes?.length || 0} notes deleted`);

    // Delete quizzes
    console.log('   Deleting quizzes...');
    const { error: quizzesError } = await supabase
      .from('quizzes')
      .delete()
      .eq('user_id', userId);
    if (!quizzesError) console.log('   ✅ Quizzes deleted');

    // Delete quiz attempts
    console.log('   Deleting quiz attempts...');
    const { error: attemptsError } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId);
    if (!attemptsError) console.log('   ✅ Quiz attempts deleted');

    // Delete support tickets
    console.log('   Deleting support tickets...');
    const { error: ticketsError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('user_id', userId);
    if (!ticketsError) console.log('   ✅ Support tickets deleted');

    // Delete CSRF tokens
    console.log('   Deleting CSRF tokens...');
    const { error: csrfError } = await supabase
      .from('csrf_tokens')
      .delete()
      .eq('user_id', userId);
    if (!csrfError) console.log('   ✅ CSRF tokens deleted');

    // Delete sessions
    console.log('   Deleting sessions...');
    const { error: sessionsError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
    if (!sessionsError) console.log('   ✅ Sessions deleted');

    // Delete account lockouts
    console.log('   Deleting account lockouts...');
    const { error: lockoutsError } = await supabase
      .from('account_lockouts')
      .delete()
      .eq('user_id', userId);
    if (!lockoutsError) console.log('   ✅ Account lockouts deleted');

    // Delete API keys
    console.log('   Deleting API keys...');
    const { error: keysError } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', userId);
    if (!keysError) console.log('   ✅ API keys deleted');

    // Delete profile LAST
    console.log('   Deleting profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('   ⚠️  Could not delete profile:', profileError.message);
    } else {
      console.log('   ✅ Profile deleted');
    }

    // Delete using admin API
    console.log('\n🗑️  Deleting auth user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('❌ Error deleting auth user:', deleteError.message);
      console.log('ℹ️  Attempting alternative deletion method...');
      
      // Try deleting with shouldSoftDelete option
      const { error: softDeleteError } = await supabase.auth.admin.deleteUser(userId, false);
      if (softDeleteError) {
        console.error('❌ Alternative deletion also failed:', softDeleteError.message);
        return false;
      } else {
        console.log('✅ Auth user deleted via alternative method');
      }
    } else {
      console.log('✅ Auth user deleted');
    }

    // Verify deletion
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

    console.log('\nVERIFICATION:');
    console.log(`   Auth User: ${stillExists ? '❌ Still exists' : '✅ Deleted'}`);
    console.log(`   Profile: ${profileAfter ? '❌ Still exists' : '✅ Deleted'}`);
    console.log(`   Notes: ${notesAfter?.length || 0} ${notesAfter?.length ? '❌ Still exist' : '✅ Deleted'}`);

    if (!stillExists && !profileAfter && !notesAfter?.length) {
      console.log(`\n✅ ${email} - DELETION SUCCESSFUL! 🎉`);
      return true;
    } else {
      console.log(`\n⚠️  ${email} - PARTIAL DELETION`);
      return false;
    }

  } catch (error) {
    console.error(`\n❌ Error deleting ${email}:`, error.message);
    return false;
  }
}

async function deleteAllTestUsers() {
  console.log('🔍 Finding all test users matching pattern: test.*@webcap.cc\n');

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    // Filter test users matching the pattern
    const testUsers = users.filter(u => {
      const email = u.email || '';
      return email.match(/^test\.\d+@webcap\.cc$/);
    });

    if (testUsers.length === 0) {
      console.log('ℹ️  No test users found matching the pattern.');
      return;
    }

    console.log(`\n📋 Found ${testUsers.length} test user(s) to delete:`);
    testUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email} (${u.id})`);
    });

    console.log(`\n⚠️  WARNING: This will permanently delete ${testUsers.length} user(s)!`);
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');

    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🚀 Starting deletion process...\n');

    // Delete each user
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      console.log(`\nProgress: ${i + 1}/${testUsers.length}`);
      
      const success = await deleteUser(user);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay between deletions
      if (i < testUsers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Total users found: ${testUsers.length}`);
    console.log(`   Successfully deleted: ${successCount} ✅`);
    console.log(`   Failed deletions: ${failCount} ❌`);
    console.log('='.repeat(80));

    if (successCount === testUsers.length) {
      console.log('\n✅ ALL TEST USERS DELETED SUCCESSFULLY! 🎉');
    } else if (successCount > 0) {
      console.log('\n⚠️  SOME DELETIONS FAILED');
      console.log('   Check the output above for details.');
    } else {
      console.log('\n❌ ALL DELETIONS FAILED');
      console.log('   Check the output above for details.');
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
deleteAllTestUsers()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

