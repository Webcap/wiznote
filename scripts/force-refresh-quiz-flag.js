/**
 * Force Refresh Quiz Feature Flag
 * This script forces a refresh by updating the timestamp
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceRefresh() {
  console.log('🔄 Force Refreshing AI Quiz Feature Flag\n');

  try {
    // Update the timestamp to force cache invalidation
    const { error } = await supabase
      .from('feature_flags')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'ai_quiz');

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Updated timestamp to force cache refresh');
    console.log('📱 NOW DO THIS:');
    console.log('   1. Clear browser cache/localStorage OR use Clear Cache button');
    console.log('   2. Hard refresh: Ctrl+Shift+R (Web) or restart app (Mobile)');
    console.log('   3. Try accessing the quiz feature\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceRefresh();

