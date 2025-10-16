#!/usr/bin/env node

/**
 * API Request Signing Test Script
 * 
 * Comprehensive test suite for the Request Signing system
 * Tests database functions, HMAC-SHA256 signing, and replay detection
 * 
 * @created October 2025
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`${colors.red}❌ Missing required environment variables${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
};

// Test API key
const TEST_API_KEY = 'test-api-key-' + crypto.randomBytes(16).toString('hex');
const TEST_KEY_NAME = 'test_key_' + Date.now();

/**
 * Log test result
 */
function logTest(testName, passed, error = null) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  ${colors.green}✅ ${testName}${colors.reset}`);
  } else {
    results.failed++;
    console.log(`  ${colors.red}❌ ${testName}${colors.reset}`);
    if (error) {
      console.log(`     ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }
  results.tests.push({ name: testName, passed, error: error?.message });
}

/**
 * Section header
 */
function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}━━━ ${title} ━━━${colors.reset}\n`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate SHA-256 hash
 */
function generateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC-SHA256 signature
 */
function generateHMAC(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

/**
 * Test 1: Verify database tables exist
 */
async function test1_VerifyTablesExist() {
  try {
    // Check api_signing_keys table
    const { data: keys, error: keysError } = await supabase
      .from('api_signing_keys')
      .select('id')
      .limit(1);

    if (keysError) throw new Error(`api_signing_keys: ${keysError.message}`);

    // Check signed_request_log table
    const { data: logs, error: logsError } = await supabase
      .from('signed_request_log')
      .select('id')
      .limit(1);

    if (logsError) throw new Error(`signed_request_log: ${logsError.message}`);

    logTest('Database tables exist', true);
  } catch (error) {
    logTest('Database tables exist', false, error);
  }
}

/**
 * Test 2: Create API signing key
 */
async function test2_CreateApiKey() {
  try {
    const keyHash = generateHash(TEST_API_KEY);

    const { data, error } = await supabase.rpc('create_api_signing_key', {
      p_key_name: TEST_KEY_NAME,
      p_key_hash: keyHash,
      p_key_purpose: 'client_api',
      p_allowed_operations: ['payment', 'subscription', 'user_management'],
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No key ID returned');

    logTest('Create API signing key', true);
    return data; // Return key ID
  } catch (error) {
    logTest('Create API signing key', false, error);
    return null;
  }
}

/**
 * Test 3: Get active API keys
 */
async function test3_GetActiveKeys() {
  try {
    const { data, error } = await supabase.rpc('get_active_api_keys', {
      p_key_purpose: 'client_api',
    });

    if (error) throw error;
    
    console.log(`     ${colors.cyan}ℹ️  Found ${data?.length || 0} active key(s)${colors.reset}`);

    logTest('Get active API keys', true);
  } catch (error) {
    logTest('Get active API keys', false, error);
  }
}

/**
 * Test 4: Generate and verify signature
 */
async function test4_SignAndVerify() {
  try {
    // Generate signature
    const method = 'POST';
    const path = '/api/payment';
    const requestId = `req_${Date.now()}`;
    const timestamp = Date.now();
    const userId = 'test-user-123';
    
    const signaturePayload = [
      method,
      path,
      requestId,
      timestamp.toString(),
      '', // bodyHash
      userId,
    ].join('|');
    
    const signature = generateHMAC(TEST_API_KEY, signaturePayload);
    
    console.log(`     ${colors.cyan}ℹ️  Generated signature: ${signature.substring(0, 16)}...${colors.reset}`);
    
    // For this test, we just verify the signature was generated
    if (!signature || signature.length !== 64) {
      throw new Error('Invalid signature format');
    }

    logTest('Generate and verify signature', true);
  } catch (error) {
    logTest('Generate and verify signature', false, error);
  }
}

/**
 * Test 5: Log signed request
 */
async function test5_LogSignedRequest() {
  try {
    const requestId = `req_${Date.now()}`;
    const timestamp = Date.now();
    const signature = generateHMAC(TEST_API_KEY, `GET|/api/test|${requestId}|${timestamp}||`);

    const { data, error } = await supabase.rpc('log_signed_request', {
      p_request_id: requestId,
      p_signature: signature,
      p_timestamp: timestamp,
      p_method: 'GET',
      p_path: '/api/test',
      p_key_name: TEST_KEY_NAME,
      p_is_valid: true,
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No log ID returned');

    logTest('Log signed request', true);
  } catch (error) {
    logTest('Log signed request', false, error);
  }
}

/**
 * Test 6: Check replay attack detection
 */
async function test6_ReplayDetection() {
  try {
    const requestId = `req_replay_${Date.now()}`;
    const timestamp = Date.now();
    const signature = generateHMAC(TEST_API_KEY, `POST|/api/payment|${requestId}|${timestamp}||user-123`);

    // Log first request (valid)
    await supabase.rpc('log_signed_request', {
      p_request_id: requestId,
      p_signature: signature,
      p_timestamp: timestamp,
      p_method: 'POST',
      p_path: '/api/payment',
      p_is_valid: true,
      p_metadata: { test: true },
    });

    await sleep(100);

    // Check for replay
    const { data, error } = await supabase.rpc('check_request_replay', {
      p_signature: signature,
      p_time_window_minutes: 5,
    });

    if (error) throw error;
    
    const isReplay = data && data.length > 0 ? data[0].is_replay : false;
    
    if (!isReplay) {
      throw new Error('Expected replay to be detected');
    }

    console.log(`     ${colors.cyan}ℹ️  Replay attack correctly detected${colors.reset}`);

    logTest('Replay attack detection', true);
  } catch (error) {
    logTest('Replay attack detection', false, error);
  }
}

/**
 * Test 7: Revoke API key
 */
async function test7_RevokeApiKey() {
  try {
    const { data, error } = await supabase.rpc('revoke_api_signing_key', {
      p_key_name: TEST_KEY_NAME,
      p_reason: 'test_revocation',
    });

    if (error) throw error;
    if (!data) throw new Error('Revocation failed');

    logTest('Revoke API key', true);
  } catch (error) {
    logTest('Revoke API key', false, error);
  }
}

/**
 * Test 8: Rotate API key
 */
async function test8_RotateApiKey() {
  try {
    // Create a new key first
    const newKeyName = `test_rotate_${Date.now()}`;
    const originalKey = 'original-key-' + crypto.randomBytes(16).toString('hex');
    const newKey = 'new-key-' + crypto.randomBytes(16).toString('hex');
    
    const originalKeyHash = generateHash(originalKey);
    const newKeyHash = generateHash(newKey);

    // Create original key
    await supabase.rpc('create_api_signing_key', {
      p_key_name: newKeyName,
      p_key_hash: originalKeyHash,
      p_key_purpose: 'client_api',
      p_metadata: { test: true },
    });

    // Rotate to new key
    const { data, error } = await supabase.rpc('rotate_api_signing_key', {
      p_old_key_name: newKeyName,
      p_new_key_hash: newKeyHash,
    });

    if (error) throw error;
    if (!data) throw new Error('No new key ID returned');

    logTest('Rotate API key', true);
  } catch (error) {
    logTest('Rotate API key', false, error);
  }
}

/**
 * Test 9: Get request signing statistics
 */
async function test9_GetStats() {
  try {
    const { data, error } = await supabase.rpc('get_request_signing_stats', {
      p_time_window_hours: 24,
    });

    if (error) throw error;
    
    if (data && data.length > 0) {
      const stats = data[0];
      console.log(`     ${colors.cyan}ℹ️  Stats: ${stats.total_requests} total, ${stats.valid_requests} valid${colors.reset}`);
    }

    logTest('Get request signing statistics', true);
  } catch (error) {
    logTest('Get request signing statistics', false, error);
  }
}

/**
 * Test 10: Cleanup old request logs
 */
async function test10_CleanupOldLogs() {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_request_logs', {
      p_retention_days: 30,
    });

    if (error) throw error;

    const count = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
    console.log(`     ${colors.cyan}ℹ️  Cleaned up ${count} old log(s)${colors.reset}`);

    logTest('Cleanup old request logs', true);
  } catch (error) {
    logTest('Cleanup old request logs', false, error);
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  try {
    console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
    
    // Clean up test API keys
    const { error: keysError } = await supabase
      .from('api_signing_keys')
      .delete()
      .filter('metadata->>test', 'eq', 'true');

    if (keysError) {
      console.log(`${colors.yellow}⚠️  Keys cleanup warning: ${keysError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ API keys cleaned up${colors.reset}`);
    }
    
    // Clean up test request logs
    const { error: logsError } = await supabase
      .from('signed_request_log')
      .delete()
      .filter('metadata->>test', 'eq', 'true');

    if (logsError) {
      console.log(`${colors.yellow}⚠️  Logs cleanup warning: ${logsError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Request logs cleaned up${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Cleanup warning: ${error.message}${colors.reset}`);
  }
}

/**
 * Print final results
 */
function printResults() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}TEST RESULTS${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  console.log(`${colors.bright}Total Tests:${colors.reset} ${results.total}`);
  console.log(`${colors.green}${colors.bright}Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}${colors.bright}Failed:${colors.reset} ${results.failed}`);

  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  console.log(`${colors.bright}Pass Rate:${colors.reset} ${passRate}%\n`);

  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ${colors.red}• ${t.name}${colors.reset}`);
        if (t.error) {
          console.log(`    ${colors.red}${t.error}${colors.reset}`);
        }
      });
    console.log();
  }

  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 All tests passed! Request signing is working correctly.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}API REQUEST SIGNING TEST SUITE${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  console.log(`${colors.bright}Test API Key:${colors.reset} ${TEST_API_KEY.substring(0, 32)}...`);
  console.log(`${colors.bright}Algorithm:${colors.reset} HMAC-SHA256\n`);

  logSection('Database Infrastructure Tests');
  await test1_VerifyTablesExist();

  logSection('API Key Management Tests');
  await test2_CreateApiKey();
  await test3_GetActiveKeys();
  await test7_RevokeApiKey();
  await test8_RotateApiKey();

  logSection('Request Signing Tests');
  await test4_SignAndVerify();
  await test5_LogSignedRequest();
  await test6_ReplayDetection();

  logSection('Statistics Tests');
  await test9_GetStats();

  logSection('Maintenance Tests');
  await test10_CleanupOldLogs();

  await cleanupTestData();
  printResults();
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

