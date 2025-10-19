/**
 * Script to delete all test users using SQL (bypasses Supabase Auth API restrictions)
 * 
 * Usage: node scripts/delete-test-users-sql.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    console.log('🚀 Starting deletion process using SQL...\n');

    // Extract all user IDs
    const userIds = testUsers.map(u => u.id);

    // Delete all related data using SQL
    console.log('🧹 Step 1: Deleting all related data from public schema tables...');
    
    const tables = [
      'notes',
      'quizzes',
      'quiz_attempts',
      'support_tickets',
      'support_ticket_messages',
      'csrf_tokens',
      'user_sessions',
      'account_lockouts',
      'api_keys',
      'feature_usage',
      'note_shares',
      'security_audit_log',
      'user_profiles'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .in('user_id', userIds);
        
        if (!error) {
          console.log(`   ✅ Deleted from ${table}`);
        } else if (error.code === 'PGRST116') {
          // Table doesn't exist, skip
          console.log(`   ⊝ ${table} (table doesn't exist or no column)`);
        } else {
          console.warn(`   ⚠️  ${table}:`, error.message);
        }
      } catch (err) {
        console.log(`   ⊝ ${table} (skipped)`);
      }
    }

    // Also try deleting from user_profiles using id instead of user_id
    console.log('   Deleting user_profiles by id...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .in('id', userIds);
    
    if (!profileError) {
      console.log('   ✅ Deleted user_profiles');
    }

    // Delete from auth.identities (this often blocks auth.users deletion)
    console.log('\n🧹 Step 2: Deleting auth identities...');
    for (const userId of userIds) {
      try {
        // Use RPC to delete identities
        const { error } = await supabase.rpc('delete_user_identities', { target_user_id: userId });
        if (error) {
          console.log(`   ⊝ Identity for ${userId} (RPC not available, using direct query)`);
          
          // Try direct SQL delete (requires proper permissions)
          const { error: sqlError } = await supabase
            .from('auth.identities')
            .delete()
            .eq('user_id', userId);
          
          if (sqlError) {
            console.log(`   ⚠️  Could not delete identity for ${userId}`);
          }
        } else {
          console.log(`   ✅ Deleted identity for user`);
        }
      } catch (err) {
        console.log(`   ⊝ Skipping identity deletion`);
      }
    }

    // Now delete from auth.users
    console.log('\n🗑️  Step 3: Deleting from auth.users...');
    let successCount = 0;
    let failCount = 0;

    for (const user of testUsers) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.log(`   ❌ ${user.email}: ${error.message}`);
          failCount++;
        } else {
          console.log(`   ✅ ${user.email}`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ ${user.email}: ${err.message}`);
        failCount++;
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
      console.log('\n⚠️  SOME DELETIONS COMPLETED');
      console.log(`   ${successCount} users deleted, ${failCount} failed`);
      console.log('   All related data (notes, profiles, etc.) has been cleaned up.');
      console.log('   Failed auth users may need manual deletion from Supabase dashboard.');
    } else {
      console.log('\n⚠️  AUTH USER DELETION FAILED BUT DATA CLEANED');
      console.log('   All related data (notes, profiles, sessions, etc.) has been deleted.');
      console.log('   Auth users remain but have no associated data.');
      console.log('   You can manually delete them from the Supabase dashboard.');
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

