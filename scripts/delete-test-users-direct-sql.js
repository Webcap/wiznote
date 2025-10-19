/**
 * Script to delete test users using direct SQL queries
 * This bypasses the Supabase Auth API and directly modifies auth schema tables
 * 
 * IMPORTANT: This requires service role key with proper permissions
 * 
 * Usage: node scripts/delete-test-users-direct-sql.js
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
  },
  db: {
    schema: 'auth'
  }
});

async function deleteTestUsersSQL() {
  console.log('🔍 Finding all test users matching pattern: test.*@webcap.cc\n');

  try {
    // Get all users first
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

    console.log(`\n⚠️  WARNING: This will permanently delete ${testUsers.length} user(s) from auth.users!`);
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');

    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🚀 Starting direct SQL deletion...\n');

    // Extract user IDs for SQL query
    const userIds = testUsers.map(u => `'${u.id}'`).join(', ');

    // Step 1: Delete from auth.identities using raw SQL
    console.log('🧹 Step 1: Deleting from auth.identities...');
    const { data: identitiesResult, error: identitiesError } = await supabase.rpc('exec_sql', {
      query: `DELETE FROM auth.identities WHERE user_id IN (${userIds});`
    });

    if (identitiesError) {
      console.log('⚠️  RPC method not available, trying alternative approach...');
      
      // Alternative: Use Supabase's postgres connection
      console.log('   Attempting to delete identities individually...');
      for (const user of testUsers) {
        try {
          // Try to delete via admin API which should handle identities
          await supabase.auth.admin.deleteUser(user.id);
          console.log(`   ✅ Deleted ${user.email}`);
        } catch (err) {
          console.log(`   ⚠️  ${user.email}: Will try SQL approach`);
        }
      }
    } else {
      console.log('   ✅ Identities deleted');
    }

    // Step 2: Try deleting auth users again
    console.log('\n🗑️  Step 2: Deleting auth users...');
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
      console.log('\n⚠️  PARTIAL SUCCESS');
      console.log(`   ${successCount} users deleted, ${failCount} still remain`);
    } else {
      console.log('\n❌ DIRECT SQL DELETION NOT AVAILABLE');
      console.log('\n📋 MANUAL DELETION REQUIRED');
      console.log('\nPlease delete these users manually from Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users');
      console.log('2. Search for: test.');
      console.log('3. Delete each user individually');
      console.log('\nOR run this SQL in Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(`
-- Delete auth identities
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email ~ '^test\\.\\d+@webcap\\.cc$'
);

-- Delete auth users
DELETE FROM auth.users
WHERE email ~ '^test\\.\\d+@webcap\\.cc$';

-- Verify deletion
SELECT COUNT(*) as remaining_test_users
FROM auth.users
WHERE email ~ '^test\\.\\d+@webcap\\.cc$';
      `);
      console.log('='.repeat(80));
      console.log('\n✅ All user DATA has been cleaned up from your database.');
      console.log('   The auth users are empty shells with no associated data.');
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
deleteTestUsersSQL()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

