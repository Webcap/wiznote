require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key (has admin privileges)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables!');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user configuration
const PASSWORD = 'test123456'; // Easy password for all test accounts
const START_NUMBER = 5;
const END_NUMBER = 14;
const EMAIL_DOMAIN = '@webcap.cc';

async function createTestUsers() {
  console.log('🚀 Starting test user creation...\n');
  
  const results = {
    created: [],
    failed: [],
    alreadyExists: []
  };

  for (let i = START_NUMBER; i <= END_NUMBER; i++) {
    const email = `test.${i}${EMAIL_DOMAIN}`;
    
    try {
      console.log(`Creating user: ${email}...`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: `Test User ${i}`,
          display_name: `Test${i}`
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User already exists: ${email}`);
          results.alreadyExists.push(email);
          continue;
        }
        throw authError;
      }

      console.log(`   ✅ Auth user created: ${authData.user.id}`);

      // Create user profile (without email since it's not in the schema)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: `Test User ${i}`,
          display_name: `Test${i}`,
          premium: {
            isActive: false,
            type: null
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        // If profile already exists, just log it
        if (profileError.code === '23505') {
          console.log(`   ℹ️  Profile already exists for: ${email}`);
        } else {
          console.error(`   ❌ Error creating profile:`, profileError.message);
          results.failed.push({ email, error: profileError.message });
          continue;
        }
      } else {
        console.log(`   ✅ User profile created`);
      }

      results.created.push(email);
      console.log(`   ✨ Successfully created: ${email}\n`);

    } catch (error) {
      console.error(`   ❌ Failed to create ${email}:`, error.message);
      results.failed.push({ email, error: error.message });
      console.log('');
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully created: ${results.created.length} users`);
  console.log(`⚠️  Already existed: ${results.alreadyExists.length} users`);
  console.log(`❌ Failed: ${results.failed.length} users`);
  console.log('='.repeat(60));

  if (results.created.length > 0) {
    console.log('\n📋 CREATED USERS:');
    results.created.forEach(email => {
      console.log(`   • ${email}`);
    });
  }

  if (results.alreadyExists.length > 0) {
    console.log('\n⚠️  ALREADY EXISTED:');
    results.alreadyExists.forEach(email => {
      console.log(`   • ${email}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED:');
    results.failed.forEach(({ email, error }) => {
      console.log(`   • ${email}: ${error}`);
    });
  }

  console.log('\n📝 LOGIN CREDENTIALS:');
  console.log(`   Email: test.5 through test.14${EMAIL_DOMAIN}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log('\n✨ Done!\n');
}

// Run the script
createTestUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

