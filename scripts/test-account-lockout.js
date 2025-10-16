#!/usr/bin/env node

/**
 * Account Lockout Test Script
 * 
 * Comprehensive test suite for the Account Lockout system
 * Tests database functions, service methods, and integration
 * 
 * @created October 2025
 */

const { createClient } = require('@supabase/supabase-js');
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
// Support both new secret key format and legacy service role key
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error(`${colors.red}❌ Missing required environment variable:${colors.reset}`);
  console.error('  - EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error(`${colors.red}❌ Missing required Supabase admin key:${colors.reset}`);
  console.error('  Set ONE of the following in your .env file:');
  console.error('  - SUPABASE_SECRET_KEY (recommended)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (legacy)');
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
 * Create a real test user in Supabase
 */
async function createTestUser() {
  const timestamp = Date.now();
  const email = `test-lockout-${timestamp}@example.com`;
  const password = `TestPassword123!${timestamp}`;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Lockout User',
        test_user: true,
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user created');

    return {
      id: data.user.id,
      email: email,
      password: password,
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Delete test user
 */
async function deleteTestUser(userId) {
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn('Error deleting test user:', error.message);
  }
}

// Track test users for cleanup
const testUsers = [];

/**
 * Test 1: Verify database table exists
 */
async function test1_VerifyTableExists() {
  try {
    const { data, error } = await supabase
      .from('account_lockouts')
      .select('id')
      .limit(1);

    if (error) throw error;
    logTest('Database table exists', true);
  } catch (error) {
    logTest('Database table exists', false, error);
  }
}

/**
 * Test 2: Lock an account
 */
async function test2_LockAccount() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    const { data, error } = await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 30,
      p_failed_attempts: 5,
      p_lock_reason: 'too_many_failed_attempts',
      p_locked_by: 'system',
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No lockout ID returned');

    logTest('Lock an account', true);
    return { userId: testUser.id, userEmail: testUser.email, lockoutId: data };
  } catch (error) {
    logTest('Lock an account', false, error);
    return null;
  }
}

/**
 * Test 3: Check if account is locked
 */
async function test3_CheckAccountLocked() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // First lock the account
    await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 30,
      p_failed_attempts: 5,
      p_metadata: { test: true },
    });

    // Then check if it's locked
    const { data, error } = await supabase.rpc('is_account_locked', {
      p_user_email: testUser.email,
    });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No lockout status returned');

    const status = data[0];
    if (!status.is_locked) {
      throw new Error('Account should be locked but is not');
    }

    logTest('Check if account is locked', true);
  } catch (error) {
    logTest('Check if account is locked', false, error);
  }
}

/**
 * Test 4: Unlock an account
 */
async function test4_UnlockAccount() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // First lock the account
    await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 30,
      p_failed_attempts: 5,
      p_metadata: { test: true },
    });

    // Then unlock it
    const { data, error } = await supabase.rpc('unlock_account', {
      p_user_email: testUser.email,
      p_unlock_method: 'admin',
    });

    if (error) throw error;
    if (!data) throw new Error('Unlock operation failed');

    // Verify it's unlocked
    const { data: checkData } = await supabase.rpc('is_account_locked', {
      p_user_email: testUser.email,
    });

    const status = checkData && checkData.length > 0 ? checkData[0] : null;
    if (status && status.is_locked) {
      throw new Error('Account should be unlocked but is still locked');
    }

    logTest('Unlock an account', true);
  } catch (error) {
    logTest('Unlock an account', false, error);
  }
}

/**
 * Test 5: Auto-unlock expired lockouts
 */
async function test5_AutoUnlockExpired() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // Lock account with 0 minute duration (immediately expired)
    await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 0,
      p_failed_attempts: 5,
      p_metadata: { test: true },
    });

    // Wait a moment
    await sleep(100);

    // Run auto-unlock
    const { data, error } = await supabase.rpc('auto_unlock_expired_lockouts');

    if (error) throw error;

    const unlocked = data && data.length > 0 ? parseInt(data[0].unlocked_count) || 0 : 0;
    console.log(`     ${colors.cyan}ℹ️  Auto-unlocked ${unlocked} account(s)${colors.reset}`);

    logTest('Auto-unlock expired lockouts', true);
  } catch (error) {
    logTest('Auto-unlock expired lockouts', false, error);
  }
}

/**
 * Test 6: Get lockout history
 */
async function test6_GetLockoutHistory() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // Lock and unlock account multiple times
    for (let i = 0; i < 2; i++) {
      await supabase.rpc('lock_account', {
        p_user_id: testUser.id,
        p_user_email: testUser.email,
        p_duration_minutes: 30,
        p_failed_attempts: 5,
        p_metadata: { test: true },
      });

      await supabase.rpc('unlock_account', {
        p_user_email: testUser.email,
        p_unlock_method: 'admin',
      });

      await sleep(100);
    }

    // Get history
    const { data, error } = await supabase.rpc('get_lockout_history', {
      p_user_email: testUser.email,
      p_limit: 10,
    });

    if (error) throw error;
    if (!data || data.length < 2) {
      throw new Error(`Expected at least 2 history entries, got ${data?.length || 0}`);
    }

    logTest('Get lockout history', true);
  } catch (error) {
    logTest('Get lockout history', false, error);
  }
}

/**
 * Test 7: Get lockout statistics
 */
async function test7_GetLockoutStats() {
  try {
    const { data, error } = await supabase.rpc('get_lockout_stats', {
      p_time_window_hours: 24,
    });

    if (error) throw error;
    
    // Stats might be empty or have data from tests
    if (data && data.length > 0) {
      const stats = data[0];
      console.log(`     ${colors.cyan}ℹ️  Stats: ${stats.total_lockouts} total, ${stats.active_lockouts} active${colors.reset}`);
    }

    logTest('Get lockout statistics', true);
  } catch (error) {
    logTest('Get lockout statistics', false, error);
  }
}

/**
 * Test 8: Test lockout with IP addresses
 */
async function test8_LockoutWithIPAddresses() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);
    const ipAddresses = ['192.168.1.1', '192.168.1.2', '10.0.0.1'];

    const { data, error } = await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 30,
      p_failed_attempts: 5,
      p_ip_addresses: ipAddresses,
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No lockout ID returned');

    logTest('Lockout with IP addresses', true);
  } catch (error) {
    logTest('Lockout with IP addresses', false, error);
  }
}

/**
 * Test 9: Test lockout with admin user
 */
async function test9_AdminLockout() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);
    const adminUser = await createTestUser();
    testUsers.push(adminUser.id);

    const { data, error } = await supabase.rpc('lock_account', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_duration_minutes: 30,
      p_failed_attempts: 5,
      p_locked_by: 'admin',
      p_locked_by_admin_id: adminUser.id,
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No lockout ID returned');

    logTest('Admin-initiated lockout', true);
  } catch (error) {
    logTest('Admin-initiated lockout', false, error);
  }
}

/**
 * Test 10: Cleanup old lockouts
 */
async function test10_CleanupOldLockouts() {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_lockouts', {
      p_retention_days: 90,
    });

    if (error) throw error;

    const deleted = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
    console.log(`     ${colors.cyan}ℹ️  Cleaned up ${deleted} old lockout(s)${colors.reset}`);

    logTest('Cleanup old lockouts', true);
  } catch (error) {
    logTest('Cleanup old lockouts', false, error);
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  try {
    console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
    
    // Clean up lockout records
    const { error } = await supabase
      .from('account_lockouts')
      .delete()
      .filter('metadata->>test', 'eq', 'true');

    if (error) {
      console.log(`${colors.yellow}⚠️  Lockout cleanup warning: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Lockout records cleaned up${colors.reset}`);
    }
    
    // Clean up test users
    if (testUsers.length > 0) {
      console.log(`${colors.yellow}🧹 Cleaning up ${testUsers.length} test user(s)...${colors.reset}`);
      
      for (const userId of testUsers) {
        await deleteTestUser(userId);
      }
      
      console.log(`${colors.green}✅ Test users cleaned up${colors.reset}`);
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
    console.log(`${colors.green}${colors.bright}🎉 All tests passed! Account lockout is working correctly.${colors.reset}\n`);
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
  console.log(`${colors.bright}${colors.blue}ACCOUNT LOCKOUT TEST SUITE${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  logSection('Database Infrastructure Tests');
  await test1_VerifyTableExists();

  logSection('Lockout Operations Tests');
  await test2_LockAccount();
  await test3_CheckAccountLocked();
  await test4_UnlockAccount();
  await test5_AutoUnlockExpired();

  logSection('Query Function Tests');
  await test6_GetLockoutHistory();
  await test7_GetLockoutStats();

  logSection('Advanced Features Tests');
  await test8_LockoutWithIPAddresses();
  await test9_AdminLockout();

  logSection('Maintenance Tests');
  await test10_CleanupOldLockouts();

  await cleanupTestData();
  printResults();
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

