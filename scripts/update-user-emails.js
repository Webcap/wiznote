// Script to update user_profiles with emails from auth.users
// This is a one-time migration script

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key for admin access
// IMPORTANT: Never commit your service role key to git!
// Set these as environment variables before running this script
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing required environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Example: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/update-user-emails.js');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateUserEmails() {
  try {
    console.log('🔄 Starting email update process...');
    
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      return;
    }

    console.log(`📊 Found ${profiles.length} user profiles`);

    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`📊 Found ${authUsers.users.length} auth users`);

    // Create a map of user_id to email
    const authUsersMap = new Map();
    authUsers.users.forEach(user => {
      authUsersMap.set(user.id, user.email);
    });

    // Update profiles that are missing emails
    let updatedCount = 0;
    let skippedCount = 0;

    for (const profile of profiles) {
      const authEmail = authUsersMap.get(profile.id);
      
      if (authEmail && (!profile.email || profile.email === '')) {
        console.log(`🔄 Updating profile ${profile.id} with email: ${authEmail}`);
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ email: authEmail })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Error updating profile ${profile.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Updated profile ${profile.id}`);
        }
      } else {
        skippedCount++;
        console.log(`⏭️  Skipping profile ${profile.id} (email already exists or no auth email)`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`✅ Updated: ${updatedCount} profiles`);
    console.log(`⏭️  Skipped: ${skippedCount} profiles`);
    console.log(`📊 Total: ${profiles.length} profiles`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
updateUserEmails();
