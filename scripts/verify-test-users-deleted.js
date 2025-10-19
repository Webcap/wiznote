/**
 * Script to verify if test users are deleted
 * 
 * Usage: node scripts/verify-test-users-deleted.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDeletion() {
  console.log('🔍 Checking for test users matching pattern: test.*@webcap.cc\n');

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    // Filter test users matching the pattern
    const testUsers = users.filter(u => {
      const email = u.email || '';
      return email.match(/^test\.\d+@webcap\.cc$/);
    });

    console.log(`${'='.repeat(80)}`);
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(80));
    
    if (testUsers.length === 0) {
      console.log('✅ NO TEST USERS FOUND! All test users have been successfully deleted! 🎉');
    } else {
      console.log(`⚠️  Found ${testUsers.length} remaining test user(s):`);
      testUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.id})`);
      });
      
      console.log('\n📋 To delete these manually:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Users');
      console.log('   2. Search for each email and click delete');
      
      console.log('\n📋 Or run this SQL in Supabase SQL Editor:');
      console.log('   ```sql');
      console.log('   DELETE FROM auth.identities WHERE user_id IN (');
      console.log('     SELECT id FROM auth.users WHERE email ~ \'^test\\.\\d+@webcap\\.cc$\'');
      console.log('   );');
      console.log('   DELETE FROM auth.users WHERE email ~ \'^test\\.\\d+@webcap\\.cc$\';');
      console.log('   ```');
    }
    
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDeletion()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

