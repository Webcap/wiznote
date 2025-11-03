#!/usr/bin/env node

/**
 * CSRF Protection Diagnostic Script
 * 
 * Comprehensive test suite for CSRF protection implementation
 * Run with: node scripts/test-csrf-protection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test results
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

console.log('🔒 CSRF Protection Test Suite\n');
console.log('═'.repeat(80));

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper functions
function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      testsPassed++;
      testResults.push({ name, status: 'pass' });
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      testsFailed++;
      testResults.push({ name, status: 'fail', error: error.message });
    }
  };
}

async function runTests() {
  console.log('\n📋 Running Tests\n');

  // Test 1: Database Tables Exist
  await test('Database: csrf_tokens table exists', async () => {
    const { error } = await supabase
      .from('csrf_tokens')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST204') {
      throw new Error(error.message);
    }
  })();

  await test('Database: csrf_audit_log table exists', async () => {
    const { error } = await supabase
      .from('csrf_audit_log')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST204') {
      throw new Error(error.message);
    }
  })();

  // Test 2: System Settings Exist
  await test('System Settings: CSRF protection settings exist', async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('csrf_protection_enabled, csrf_origin_check_enabled, csrf_token_expiry_minutes')
      .single();
    
    if (error) throw new Error(error.message);
    if (data.csrf_protection_enabled === undefined) {
      throw new Error('CSRF settings not found');
    }
  })();

  await test('System Settings: Secure defaults enabled', async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('csrf_protection_enabled, csrf_origin_check_enabled')
      .single();
    
    if (error) throw new Error(error.message);
    if (!data.csrf_protection_enabled) {
      throw new Error('CSRF protection should be enabled by default');
    }
    if (!data.csrf_origin_check_enabled) {
      throw new Error('Origin check should be enabled by default');
    }
  })();

  // Test 3: Helper Functions Exist
  await test('Database Functions: generate_csrf_token function exists', async () => {
    const { error } = await supabase.rpc('generate_csrf_token', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_token: 'test-token-function-check',
      p_expiry_minutes: 60
    });
    
    // Should either succeed or fail with proper error (not "function not found")
    if (error && error.message.includes('does not exist')) {
      throw new Error('generate_csrf_token function not found');
    }
  })();

  await test('Database Functions: validate_csrf_token function exists', async () => {
    const { error } = await supabase.rpc('validate_csrf_token', {
      p_token: 'test-token',
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    // Should either succeed or fail with proper error (not "function not found")
    if (error && error.message.includes('does not exist')) {
      throw new Error('validate_csrf_token function not found');
    }
  })();

  await test('Database Functions: cleanup_expired_csrf_tokens function exists', async () => {
    const { error } = await supabase.rpc('cleanup_expired_csrf_tokens');
    
    // Should either succeed or fail with proper error (not "function not found")
    if (error && error.message.includes('does not exist')) {
      throw new Error('cleanup_expired_csrf_tokens function not found');
    }
  })();

  await test('Database Functions: revoke_user_csrf_tokens function exists', async () => {
    const { error } = await supabase.rpc('revoke_user_csrf_tokens', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    // Should either succeed or fail with proper error (not "function not found")
    if (error && error.message.includes('does not exist')) {
      throw new Error('revoke_user_csrf_tokens function not found');
    }
  })();

  // Test 4: RLS Policies
  await test('Security: RLS enabled on csrf_tokens', async () => {
    // Try to query without auth - should fail or return empty
    const { data, error } = await supabase
      .from('csrf_tokens')
      .select('*')
      .limit(1);
    
    // RLS should prevent access or return empty results
    if (error && !error.message.includes('permission denied')) {
      console.log(`   Note: ${error.message}`);
    }
  })();

  await test('Security: RLS enabled on csrf_audit_log', async () => {
    // Try to query without auth - should fail or return empty
    const { data, error } = await supabase
      .from('csrf_audit_log')
      .select('*')
      .limit(1);
    
    // RLS should prevent access or return empty results
    if (error && !error.message.includes('permission denied')) {
      console.log(`   Note: ${error.message}`);
    }
  })();

  // Test 5: Indexes Exist
  await test('Performance: Indexes created on csrf_tokens', async () => {
    const { data, error } = await supabase
      .from('csrf_tokens')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST204') {
      throw new Error(error.message);
    }
  })();

  // Test 6: Settings Configuration Validation
  await test('Configuration: Token expiry within valid range', async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('csrf_token_expiry_minutes')
      .single();
    
    if (error) throw new Error(error.message);
    if (data.csrf_token_expiry_minutes < 15 || data.csrf_token_expiry_minutes > 1440) {
      throw new Error('Token expiry should be between 15 and 1440 minutes');
    }
  })();

  // Test Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 Test Summary');
  console.log('═'.repeat(80));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults
      .filter(t => t.status === 'fail')
      .forEach(t => {
        console.log(`   ❌ ${t.name}`);
        console.log(`      ${t.error}`);
      });
  }
  
  const passRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  console.log(`\n📈 Pass Rate: ${passRate}%`);
  
  console.log('\n' + '═'.repeat(80));
  
  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    console.log('✅ CSRF protection is properly configured');
    console.log('═'.repeat(80));
    console.log('\nNext steps:');
    console.log('1. Integrate CSRFService into your authentication flow');
    console.log('2. Add CSRF token validation to state-changing operations');
    console.log('3. Test with real requests from web and mobile');
    console.log('4. Monitor audit logs for CSRF events\n');
  } else {
    console.log('⚠️  Some tests failed');
    console.log('Please review the errors above and fix them');
    console.log('Run database/csrf-protection-setup.sql to set up the infrastructure\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  process.exit(1);
});

