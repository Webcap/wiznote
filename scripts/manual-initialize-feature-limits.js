#!/usr/bin/env node

/**
 * Manually initialize feature limits in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Default feature limits (based on UnifiedFeatureLimits.ts)
const DEFAULT_FEATURE_LIMITS = [
  {
    id: 'ai_summaries',
    feature_id: 'ai_summaries',
    feature_name: 'AI Summaries',
    description: 'Generate AI-powered summaries of your notes',
    category: 'ai',
    priority: 1,
    is_active: true,
    free_user_limit: 10,
    free_user_limit_type: 'count',
    free_user_period: 'monthly',
    free_user_session_limit: 3,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'count',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ai_key_details',
    feature_id: 'ai_key_details',
    feature_name: 'AI Key Details',
    description: 'Extract key details and insights from your notes',
    category: 'ai',
    priority: 2,
    is_active: true,
    free_user_limit: 5,
    free_user_limit_type: 'count',
    free_user_period: 'monthly',
    free_user_session_limit: 2,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'count',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ai_transcription',
    feature_id: 'ai_transcription',
    feature_name: 'AI Transcription',
    description: 'Convert audio recordings to text using AI',
    category: 'ai',
    priority: 3,
    is_active: true,
    free_user_limit: 30,
    free_user_limit_type: 'minutes',
    free_user_period: 'monthly',
    free_user_session_limit: 10,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'minutes',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'voice_recording',
    feature_id: 'voice_recording',
    feature_name: 'Voice Recording',
    description: 'Record voice notes and audio content',
    category: 'audio',
    priority: 4,
    is_active: true,
    free_user_limit: 60,
    free_user_limit_type: 'minutes',
    free_user_period: 'monthly',
    free_user_session_limit: 5,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'minutes',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ai_name_generating',
    feature_id: 'ai_name_generating',
    feature_name: 'AI Name Generation',
    description: 'Generate smart names for your notes and audio files',
    category: 'ai',
    priority: 5,
    is_active: true,
    free_user_limit: 20,
    free_user_limit_type: 'count',
    free_user_period: 'monthly',
    free_user_session_limit: 5,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'count',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ai_flashcards',
    feature_id: 'ai_flashcards',
    feature_name: 'AI Flashcards',
    description: 'Generate flashcards from your notes for studying',
    category: 'ai',
    priority: 6,
    is_active: true,
    free_user_limit: 5,
    free_user_limit_type: 'count',
    free_user_period: 'monthly',
    free_user_session_limit: 2,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'count',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ai_quizzes',
    feature_id: 'ai_quizzes',
    feature_name: 'AI Quizzes',
    description: 'Generate quizzes from your notes for testing knowledge',
    category: 'ai',
    priority: 7,
    is_active: true,
    free_user_limit: 5,
    free_user_limit_type: 'count',
    free_user_period: 'monthly',
    free_user_session_limit: 2,
    premium_user_limit: 'unlimited',
    premium_user_limit_type: 'count',
    premium_user_period: 'monthly',
    premium_user_session_limit: 'unlimited',
    updated_at: new Date().toISOString(),
  }
];

async function manualInitializeFeatureLimits() {
  console.log('🔧 Manually Initializing Feature Limits');
  console.log('');

  try {
    // 1. Check current state
    console.log('1. Checking current database state...');
    const { count, error: countError } = await supabase
      .from('feature_limits')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
      return;
    }
    console.log(`✅ Current records in database: ${count}`);
    console.log('');

    // 2. Clear existing records (if any)
    if (count > 0) {
      console.log('2. Clearing existing records...');
      const { error: deleteError } = await supabase
        .from('feature_limits')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        return;
      }
      console.log('✅ Existing records cleared');
    } else {
      console.log('2. No existing records to clear');
    }
    console.log('');

    // 3. Insert default feature limits
    console.log('3. Inserting default feature limits...');
    const { data: insertData, error: insertError } = await supabase
      .from('feature_limits')
      .insert(DEFAULT_FEATURE_LIMITS)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return;
    }
    console.log(`✅ Successfully inserted ${insertData?.length || 0} feature limits`);
    console.log('');

    // 4. Verify insertion
    console.log('4. Verifying insertion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('feature_limits')
      .select('*')
      .order('priority');

    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
    } else {
      console.log(`✅ Verified ${verifyData?.length || 0} records in database`);
      console.log('   Feature limits:');
      verifyData?.forEach((limit, index) => {
        console.log(`     ${index + 1}. ${limit.feature_name} (${limit.feature_id}) - Free: ${limit.free_user_limit} ${limit.free_user_limit_type}/${limit.free_user_period}`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the initialization
manualInitializeFeatureLimits().then(() => {
  console.log('✅ Manual initialization completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Manual initialization failed:', error);
  process.exit(1);
});

