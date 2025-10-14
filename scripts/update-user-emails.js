// Script to update user_profiles with emails from auth.users
// This is a one-time migration script

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kmzubtegijexwguadyfw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttenVidGVnaWpleHdndWFkeWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI5NjY3NSwiZXhwIjoyMDUyODcyNjc1fQ.XiG5kHZ5cL8qHdQ2oGvP8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0'
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
