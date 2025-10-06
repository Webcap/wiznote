#!/usr/bin/env node

/**
 * Preview script to show what data would be deleted
 * This script only READS data and shows you what would be deleted
 * 
 * Usage: node scripts/preview-delete-all-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function previewDataToDelete() {
  console.log('🔍 PREVIEWING DATA THAT WOULD BE DELETED');
  console.log('This script only READS data - no deletion will occur');
  console.log('');

  try {
    // 1. Count feature usage data
    console.log('📊 Feature Usage Data:');
    const { data: featureUsage, error: featureUsageError } = await supabase
      .from('user_feature_usage')
      .select('id', { count: 'exact' });
    
    if (featureUsageError) {
      console.error('❌ Error counting feature usage:', featureUsageError);
    } else {
      console.log(`   Records: ${featureUsage?.length || 0}`);
    }

    // 2. Count notes
    console.log('📝 Notes:');
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id', 'title', 'created_at', { count: 'exact' });
    
    if (notesError) {
      console.error('❌ Error counting notes:', notesError);
    } else {
      console.log(`   Records: ${notes?.length || 0}`);
      if (notes && notes.length > 0) {
        console.log('   Sample notes:');
        notes.slice(0, 5).forEach(note => {
          const title = note.title || 'Untitled';
          const date = note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date';
          console.log(`     - ${title} (${date})`);
        });
        if (notes.length > 5) {
          console.log(`     ... and ${notes.length - 5} more`);
        }
      }
    }

    // 3. Count audio files (if table exists)
    console.log('🎵 Audio Files:');
    try {
      const { data: audioFiles, error: audioError } = await supabase
        .from('audio_files')
        .select('id', 'filename', 'created_at', { count: 'exact' });
      
      if (audioError) {
        if (audioError.code === '42P01') {
          console.log('   Table does not exist - no audio files to delete');
        } else {
          console.error('❌ Error counting audio files:', audioError);
        }
      } else {
        console.log(`   Records: ${audioFiles?.length || 0}`);
        if (audioFiles && audioFiles.length > 0) {
          console.log('   Sample files:');
          audioFiles.slice(0, 5).forEach(file => {
            const filename = file.filename || 'Unknown';
            const date = file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Unknown date';
            console.log(`     - ${filename} (${date})`);
          });
          if (audioFiles.length > 5) {
            console.log(`     ... and ${audioFiles.length - 5} more`);
          }
        }
      }
    } catch (error) {
      console.log('   Table does not exist - no audio files to delete');
    }

    // 4. Count user profiles
    console.log('👤 User Profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id', 'email', 'created_at', { count: 'exact' });
    
    if (profilesError) {
      console.error('❌ Error counting user profiles:', profilesError);
    } else {
      console.log(`   Records: ${profiles?.length || 0}`);
      if (profiles && profiles.length > 0) {
        console.log('   Sample profiles:');
        profiles.slice(0, 5).forEach(profile => {
          const email = profile.email || 'No email';
          const date = profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown date';
          console.log(`     - ${email} (${date})`);
        });
        if (profiles.length > 5) {
          console.log(`     ... and ${profiles.length - 5} more`);
        }
      }
    }

    // 5. Count feature limits
    console.log('⚙️  Feature Limits:');
    const { data: limits, error: limitsError } = await supabase
      .from('feature_limits')
      .select('id', 'feature_name', { count: 'exact' });
    
    if (limitsError) {
      console.error('❌ Error counting feature limits:', limitsError);
    } else {
      console.log(`   Records: ${limits?.length || 0}`);
      if (limits && limits.length > 0) {
        console.log('   Features:');
        limits.forEach(limit => {
          const featureName = limit.feature_name || 'Unknown feature';
          console.log(`     - ${featureName}`);
        });
      }
    }

    // 6. Count premium plans
    console.log('💎 Premium Plans:');
    const { data: plans, error: plansError } = await supabase
      .from('premium_plans')
      .select('id', 'name', 'price', { count: 'exact' });
    
    if (plansError) {
      console.error('❌ Error counting premium plans:', plansError);
    } else {
      console.log(`   Records: ${plans?.length || 0}`);
      if (plans && plans.length > 0) {
        console.log('   Plans:');
        plans.forEach(plan => {
          const name = plan.name || 'Unknown plan';
          const price = plan.price || 'Unknown price';
          console.log(`     - ${name} ($${price})`);
        });
      }
    }

    console.log('');
    console.log('⚠️  WARNING: This is what would be deleted if you run the deletion script!');
    console.log('⚠️  To actually delete this data, run: node scripts/delete-all-data.js --confirm');
    console.log('⚠️  This action is IRREVERSIBLE!');

  } catch (error) {
    console.error('❌ Fatal error during preview:', error);
    process.exit(1);
  }
}

// Run the preview
previewDataToDelete().then(() => {
  console.log('✅ Preview completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Preview failed:', error);
  process.exit(1);
});
