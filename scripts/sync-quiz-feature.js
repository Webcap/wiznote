/**
 * Sync Quiz Feature Flag to Database
 * This script enables the ai_quiz feature flag in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncQuizFeature() {
  console.log('🔄 Syncing ai_quiz feature flag to database...\n');

  try {
    // Update or insert the ai_quiz feature flag
    const { data, error } = await supabase
      .from('feature_flags')
      .upsert({
        id: 'ai_quiz',
        name: 'AI Quiz Generation',
        description: 'Enable AI-powered quiz generation based on notes content, audio, summaries, and key details',
        enabled: true,
        premium_only: false, // Set to false for testing, true for production
        tracking_enabled: true,
        target_environments: ['development', 'staging', 'production'],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('❌ Error syncing feature flag:', error.message);
      process.exit(1);
    }

    console.log('✅ ai_quiz feature flag synced successfully!');
    console.log('\n📊 Feature Flag Status:');
    console.log('   - ID: ai_quiz');
    console.log('   - Enabled: ✅ true');
    console.log('   - Premium Only: ❌ false (testing mode)');
    console.log('   - Tracking: ✅ true');
    console.log('\n💡 Tip: Set premium_only to true in production');
    console.log('\n🔄 Please restart your app or clear cache to see changes');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncQuizFeature();


