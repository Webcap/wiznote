require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const START_NUMBER = 5;
const END_NUMBER = 14;
const EMAIL_DOMAIN = '@webcap.cc';

async function fixUserProfiles() {
  console.log('🔧 Fixing test user profiles...\n');
  
  const results = {
    created: [],
    existed: [],
    failed: []
  };

  // Get all auth users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  // Filter for test users
  for (let i = START_NUMBER; i <= END_NUMBER; i++) {
    const email = `test.${i}${EMAIL_DOMAIN}`;
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`⚠️  User not found in auth: ${email}`);
      continue;
    }

    console.log(`Processing: ${email} (${user.id})`);

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log(`   ℹ️  Profile already exists\n`);
        results.existed.push(email);
        continue;
      }

      // Create profile with minimal fields
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          premium: {
            isActive: false,
            type: null
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`   ❌ Error creating profile:`, profileError.message);
        results.failed.push({ email, error: profileError.message });
      } else {
        console.log(`   ✅ Profile created\n`);
        results.created.push(email);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      results.failed.push({ email, error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Profiles created: ${results.created.length}`);
  console.log(`ℹ️  Already existed: ${results.existed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.created.length > 0) {
    console.log('\n✅ PROFILES CREATED:');
    results.created.forEach(email => console.log(`   • ${email}`));
  }

  if (results.existed.length > 0) {
    console.log('\nℹ️  ALREADY EXISTED:');
    results.existed.forEach(email => console.log(`   • ${email}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED:');
    results.failed.forEach(({ email, error }) => console.log(`   • ${email}: ${error}`));
  }

  console.log('\n✨ Done!\n');
}

fixUserProfiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

