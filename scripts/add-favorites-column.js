#!/usr/bin/env node

/**
 * Add is_favorite column to notes table
 * 
 * This script adds a new column to the notes table for favorite note functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addFavoritesColumn() {
  console.log('🔄 Adding is_favorite column to notes table...');
  console.log('');

  try {
    // Add the is_favorite column to the notes table
    // Note: Supabase uses PostgreSQL, so we need to use raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE notes 
        ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
        
        CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_notes_user_favorite ON notes(user_id, is_favorite);
      `
    });

    if (error) {
      // If the RPC method doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, using direct SQL...');
      
      // Alternative approach: Try using Supabase's SQL editor functionality
      console.log('');
      console.log('📋 SQL Migration Script:');
      console.log('━'.repeat(80));
      console.log(`
-- Add is_favorite column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_notes_user_favorite ON notes(user_id, is_favorite);

-- Set existing notes to not favorite by default
UPDATE notes SET is_favorite = false WHERE is_favorite IS NULL;
      `);
      console.log('━'.repeat(80));
      console.log('');
      console.log('⚠️  Please run the SQL above in your Supabase SQL Editor:');
      console.log('   1. Go to your Supabase project dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and paste the SQL above');
      console.log('   4. Click "Run" to execute');
      console.log('');
      console.log('🔗 https://app.supabase.com/project/_/sql');
      console.log('');
      return;
    }

    console.log('✅ Successfully added is_favorite column to notes table');
    console.log('✅ Created indexes for better query performance');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Column: is_favorite (BOOLEAN, default: false)');
    console.log('   - Index 1: idx_notes_is_favorite (on is_favorite)');
    console.log('   - Index 2: idx_notes_user_favorite (on user_id, is_favorite)');
    console.log('');
    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('📋 Manual Migration Steps:');
    console.error('   1. Open your Supabase project dashboard');
    console.error('   2. Go to SQL Editor');
    console.error('   3. Run the following SQL:');
    console.error('');
    console.error('```sql');
    console.error('ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;');
    console.error('CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);');
    console.error('CREATE INDEX IF NOT EXISTS idx_notes_user_favorite ON notes(user_id, is_favorite);');
    console.error('UPDATE notes SET is_favorite = false WHERE is_favorite IS NULL;');
    console.error('```');
    console.error('');
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Add Favorites Column to Notes Table

Usage: node scripts/add-favorites-column.js [options]

Options:
  --help, -h          Show this help message

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

This script will:
  1. Add is_favorite column to the notes table (BOOLEAN, default false)
  2. Create performance indexes
  3. Update existing records to set is_favorite = false

Example:
  node scripts/add-favorites-column.js
    `);
    process.exit(0);
  }

  await addFavoritesColumn();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = addFavoritesColumn;

