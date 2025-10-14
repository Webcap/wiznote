/**
 * Database Setup Script: Rate Limiting
 * 
 * This script runs the rate-limiting-setup.sql file to create:
 * - rate_limit_attempts table
 * - check_rate_limit() function
 * - record_rate_limit_attempt() function
 * - cleanup_rate_limit_attempts() function
 * 
 * Usage: node scripts/setup-rate-limiting-db.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY):', !!supabaseSecretKey);
  console.error('\n💡 Tip: Add these to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function setupDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     RATE LIMITING DATABASE SETUP                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../database/rate-limiting-setup.sql');
    console.log('📖 Reading SQL file:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded\n');

    // Split into individual statements (basic split on semicolons)
    // Note: This is a simple approach. For complex SQL, consider using a proper SQL parser
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      // Log progress for major operations
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE.*?(\w+)/);
        console.log(`🔨 Creating table: ${match ? match[1] : 'unknown'}...`);
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE.*?FUNCTION\s+(\w+)/);
        console.log(`⚙️  Creating function: ${match ? match[1] : 'unknown'}...`);
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY\s+"([^"]+)"/);
        console.log(`🔐 Creating policy: ${match ? match[1] : 'unknown'}...`);
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX.*?(\w+)/);
        console.log(`📇 Creating index: ${match ? match[1] : 'unknown'}...`);
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if rpc doesn't work
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseSecretKey,
              'Authorization': `Bearer ${supabaseSecretKey}`,
            },
            body: JSON.stringify({ sql: statement }),
          });

          if (!response.ok) {
            // If that doesn't work, we need to use Supabase SQL Editor
            console.log('   ⚠️  Skipping (requires manual execution)');
            continue;
          }
        }
        
        successCount++;
      } catch (err) {
        console.error(`   ❌ Error:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SETUP SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`❌ Errors: ${errorCount} statements`);
    
    console.log('\n⚠️  NOTE: Some operations may require manual execution in Supabase SQL Editor');
    console.log('\n📝 Manual Setup Instructions:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Create a new query');
    console.log('   3. Copy contents from: database/rate-limiting-setup.sql');
    console.log('   4. Click "Run" to execute');
    console.log('   5. Verify tables/functions were created');

    console.log('\n✨ After manual setup, run the test again:');
    console.log('   node scripts/test-rate-limiting.js\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n📝 Please run the SQL file manually:');
    console.error('   1. Open: database/rate-limiting-setup.sql');
    console.error('   2. Go to: Supabase Dashboard → SQL Editor');
    console.error('   3. Paste and run the SQL content');
    process.exit(1);
  }
}

// Run the setup
setupDatabase();

