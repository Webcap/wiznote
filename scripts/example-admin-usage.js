/**
 * Example: Using Supabase Admin Client
 * 
 * This script demonstrates how to use the new supabase-admin client
 * which supports both new sb_secret_... keys and legacy service_role keys.
 * 
 * Usage:
 *   node scripts/example-admin-usage.js
 * 
 * Environment Variables Required:
 *   - EXPO_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SECRET_KEY (recommended) OR SUPABASE_SERVICE_ROLE_KEY (legacy)
 */

require('dotenv').config();

// Note: This imports the TypeScript file. For production use, either:
// 1. Compile TypeScript first: npx tsc
// 2. Use ts-node: npx ts-node scripts/example-admin-usage.js
// 3. Convert this script to TypeScript (.ts)

// For now, we'll import the module dynamically
const { createClient } = require('@supabase/supabase-js');

// Helper function to get admin key (same logic as supabase-admin.ts)
function getAdminKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (secretKey && secretKey.startsWith('sb_secret_')) {
    console.log('✅ Using NEW Supabase Secret Key (sb_secret_...)');
    return secretKey;
  }
  
  if (serviceRoleKey) {
    console.log('⚠️  Using LEGACY Service Role Key (JWT-based)');
    console.log('💡 Consider migrating to sb_secret_... keys for better security and easier rotation');
    return serviceRoleKey;
  }
  
  throw new Error(
    'Missing Supabase admin key! Please set either:\n' +
    '  - SUPABASE_SECRET_KEY (recommended, sb_secret_...)\n' +
    '  - SUPABASE_SERVICE_ROLE_KEY (legacy, JWT-based)'
  );
}

// Create admin client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAdmin = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  getAdminKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper functions
function getAdminKeyInfo() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return {
    hasSecretKey: !!secretKey && secretKey.startsWith('sb_secret_'),
    hasServiceRoleKey: !!serviceRoleKey,
    usingNewFormat: !!secretKey && secretKey.startsWith('sb_secret_'),
    keyType: secretKey && secretKey.startsWith('sb_secret_') 
      ? 'secret' 
      : (serviceRoleKey ? 'service_role' : 'none'),
  };
}

function validateAdminKey() {
  try {
    getAdminKey();
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Supabase Admin Client Example');
  console.log('='.repeat(60));
  
  // Check which key type is being used
  const keyInfo = getAdminKeyInfo();
  console.log('\n📊 Key Configuration:');
  console.log('  - Has Secret Key (sb_secret_...):', keyInfo.hasSecretKey ? '✅' : '❌');
  console.log('  - Has Service Role Key (JWT):', keyInfo.hasServiceRoleKey ? '✅' : '❌');
  console.log('  - Using New Format:', keyInfo.usingNewFormat ? '✅ YES' : '⚠️  NO (Legacy)');
  console.log('  - Key Type:', keyInfo.keyType);
  
  if (!validateAdminKey()) {
    console.error('\n❌ No valid admin key found!');
    console.error('Please set either:');
    console.error('  - SUPABASE_SECRET_KEY=sb_secret_... (recommended)');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY=eyJ... (legacy)');
    process.exit(1);
  }
  
  console.log('\n✅ Admin key validated successfully!\n');
  
  // Example 1: Query user profiles
  console.log('Example 1: Fetching user profiles...');
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, subscription_plan')
      .limit(5);
    
    if (error) throw error;
    console.log(`  Found ${profiles.length} profiles`);
    profiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.email} - Plan: ${profile.subscription_plan || 'free'}`);
    });
  } catch (error) {
    console.error('  Error:', error.message);
  }
  
  // Example 2: Count total users
  console.log('\nExample 2: Counting total users...');
  try {
    const { count, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log(`  Total users: ${count}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }
  
  // Example 3: Admin operation (bypasses RLS)
  console.log('\nExample 3: Admin query (bypasses RLS)...');
  try {
    const { data: notes, error } = await supabaseAdmin
      .from('notes')
      .select('id, title, user_id')
      .limit(5);
    
    if (error) throw error;
    console.log(`  Found ${notes.length} notes (admin access, RLS bypassed)`);
  } catch (error) {
    console.error('  Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Examples completed successfully!');
  console.log('='.repeat(60));
  
  if (!keyInfo.usingNewFormat) {
    console.log('\n💡 Migration Tip:');
    console.log('   Consider migrating to the new sb_secret_... keys for:');
    console.log('   - Easier key rotation without downtime');
    console.log('   - Better security (not tied to JWT secret)');
    console.log('   - Individual key revocation');
    console.log('   See: SUPABASE_API_KEY_MIGRATION.md');
  }
}

main().catch(console.error);

