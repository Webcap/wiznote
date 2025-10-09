/**
 * Debug Feature Flag Loading
 * This script helps debug why feature flags might not be loading correctly
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

async function debugFeatureFlagLoading() {
  console.log('🔍 Debugging Feature Flag Loading\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Check all feature flags
    console.log('📊 Loading ALL feature flags from database...\n');
    const { data: allFlags, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('id');

    if (error) {
      console.error('❌ Error loading flags:', error.message);
      process.exit(1);
    }

    if (!allFlags || allFlags.length === 0) {
      console.log('⚠️  NO FEATURE FLAGS FOUND IN DATABASE!');
      console.log('   This is the problem - database is empty\n');
      console.log('💡 Solution: Run node scripts/sync-quiz-feature.js\n');
      return;
    }

    console.log(`✅ Found ${allFlags.length} feature flags in database:\n`);

    // Display all flags
    allFlags.forEach(flag => {
      const enabledIcon = flag.enabled ? '✅' : '❌';
      const premiumIcon = flag.premium_only ? '🔒' : '🔓';
      
      console.log(`${enabledIcon} ${flag.id}`);
      console.log(`   Name: ${flag.name}`);
      console.log(`   Enabled: ${flag.enabled}`);
      console.log(`   Premium: ${flag.premium_only ? 'Yes' : 'No'} ${premiumIcon}`);
      console.log(`   Updated: ${new Date(flag.updated_at).toLocaleString()}`);
      console.log('');
    });

    // Focus on ai_quiz
    const aiQuiz = allFlags.find(f => f.id === 'ai_quiz');
    
    if (!aiQuiz) {
      console.log('❌ AI QUIZ FLAG NOT FOUND IN DATABASE!');
      console.log('💡 Solution: Run node scripts/sync-quiz-feature.js\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎯 AI Quiz Flag Details:\n');
    console.log(JSON.stringify(aiQuiz, null, 2));
    console.log('\n═══════════════════════════════════════════════════\n');

    // Check what the service would return
    console.log('🧪 Testing Feature Flag Logic:\n');
    
    const testUser = {
      id: 'test-user-123',
      premium: { isActive: false }
    };

    const testPremiumUser = {
      id: 'test-user-456',
      premium: { isActive: true }
    };

    console.log('Test 1: Regular user (no premium)');
    console.log(`   enabled: ${aiQuiz.enabled}`);
    console.log(`   premium_only: ${aiQuiz.premium_only}`);
    console.log(`   user.premium.isActive: ${testUser.premium.isActive}`);
    
    if (aiQuiz.enabled) {
      if (aiQuiz.premium_only && !testUser.premium.isActive) {
        console.log('   Result: ❌ BLOCKED (needs premium)');
      } else {
        console.log('   Result: ✅ ALLOWED');
      }
    } else {
      console.log('   Result: ❌ BLOCKED (disabled)');
    }

    console.log('\nTest 2: Premium user');
    console.log(`   enabled: ${aiQuiz.enabled}`);
    console.log(`   premium_only: ${aiQuiz.premium_only}`);
    console.log(`   user.premium.isActive: ${testPremiumUser.premium.isActive}`);
    
    if (aiQuiz.enabled) {
      if (aiQuiz.premium_only && !testPremiumUser.premium.isActive) {
        console.log('   Result: ❌ BLOCKED (needs premium)');
      } else {
        console.log('   Result: ✅ ALLOWED');
      }
    } else {
      console.log('   Result: ❌ BLOCKED (disabled)');
    }

    console.log('\n═══════════════════════════════════════════════════\n');
    
    // Provide guidance
    if (!aiQuiz.enabled) {
      console.log('⚠️  PROBLEM FOUND: ai_quiz is DISABLED in database');
      console.log('💡 Solution: Run node scripts/sync-quiz-feature.js\n');
    } else if (aiQuiz.premium_only) {
      console.log('⚠️  POTENTIAL ISSUE: ai_quiz requires premium subscription');
      console.log('💡 Solutions:');
      console.log('   1. Make sure user has premium subscription, OR');
      console.log('   2. Set premium_only to false for testing:');
      console.log('      Run: node scripts/sync-quiz-feature.js\n');
    } else {
      console.log('✅ ai_quiz configuration looks CORRECT!');
      console.log('\n🔍 If feature still not working, check:');
      console.log('   1. Clear app cache (Settings > Clear Feature Cache)');
      console.log('   2. Check browser/app console logs');
      console.log('   3. Verify user is authenticated');
      console.log('   4. Check if feature flag service initialized');
      console.log('   5. Look for: "🔍 NoteDetailScreen: Feature flag status"');
      console.log('   6. Hard refresh (Web) or restart app (Mobile)\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the debug
debugFeatureFlagLoading();


