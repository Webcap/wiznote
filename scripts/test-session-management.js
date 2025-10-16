#!/usr/bin/env node

/**
 * Session Management Test Script
 * 
 * Comprehensive test suite for the Session Management system
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

// Track test users for cleanup
const testUsers = [];

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
  const email = `test-session-${timestamp}@example.com`;
  const password = `TestPassword123!${timestamp}`;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Session User',
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

/**
 * Test 1: Verify database table exists
 */
async function test1_VerifyTableExists() {
  try {
    const { data, error} = await supabase
      .from('user_sessions')
      .select('id')
      .limit(1);

    if (error) throw error;
    logTest('Database table exists', true);
  } catch (error) {
    logTest('Database table exists', false, error);
  }
}

/**
 * Test 2: Create a session
 */
async function test2_CreateSession() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    const { data, error } = await supabase.rpc('upsert_user_session', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_session_id: `session-${Date.now()}`,
      p_device_type: 'web',
      p_platform: 'web',
      p_browser: 'Chrome',
      p_os: 'Windows',
      p_is_remember_me: false,
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No session ID returned');

    logTest('Create a session', true);
    return { userId: testUser.id, userEmail: testUser.email, sessionDbId: data };
  } catch (error) {
    logTest('Create a session', false, error);
    return null;
  }
}

/**
 * Test 3: Update session activity
 */
async function test3_UpdateSessionActivity() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);
    const sessionId = `session-${Date.now()}`;

    // Create session first
    await supabase.rpc('upsert_user_session', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_session_id: sessionId,
      p_device_type: 'web',
      p_metadata: { test: true },
    });

    // Wait a moment
    await sleep(100);

    // Update activity
    const { data, error } = await supabase.rpc('update_session_activity', {
      p_session_id: sessionId,
      p_user_id: testUser.id,
    });

    if (error) throw error;
    if (!data) throw new Error('Activity update failed');

    logTest('Update session activity', true);
  } catch (error) {
    logTest('Update session activity', false, error);
  }
}

/**
 * Test 4: Terminate a session
 */
async function test4_TerminateSession() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);
    const sessionId = `session-${Date.now()}`;

    // Create session
    await supabase.rpc('upsert_user_session', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_session_id: sessionId,
      p_device_type: 'web',
      p_metadata: { test: true },
    });

    // Terminate it
    const { data, error } = await supabase.rpc('terminate_session', {
      p_session_id: sessionId,
      p_user_id: testUser.id,
      p_reason: 'logout',
    });

    if (error) throw error;
    if (!data) throw new Error('Session termination failed');

    logTest('Terminate a session', true);
  } catch (error) {
    logTest('Terminate a session', false, error);
  }
}

/**
 * Test 5: Terminate all user sessions
 */
async function test5_TerminateAllSessions() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // Create multiple sessions
    for (let i = 0; i < 3; i++) {
      await supabase.rpc('upsert_user_session', {
        p_user_id: testUser.id,
        p_user_email: testUser.email,
        p_session_id: `session-${Date.now()}-${i}`,
        p_device_type: 'web',
        p_metadata: { test: true },
      });
      await sleep(50);
    }

    // Terminate all
    const { data, error } = await supabase.rpc('terminate_all_user_sessions', {
      p_user_id: testUser.id,
      p_reason: 'password_changed',
    });

    if (error) throw error;
    
    const count = data && data.length > 0 ? parseInt(data[0].terminated_count) || 0 : 0;
    if (count !== 3) {
      throw new Error(`Expected 3 sessions terminated, got ${count}`);
    }

    logTest('Terminate all user sessions', true);
  } catch (error) {
    logTest('Terminate all user sessions', false, error);
  }
}

/**
 * Test 6: Get active sessions
 */
async function test6_GetActiveSessions() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    // Create sessions
    for (let i = 0; i < 2; i++) {
      await supabase.rpc('upsert_user_session', {
        p_user_id: testUser.id,
        p_user_email: testUser.email,
        p_session_id: `session-${Date.now()}-${i}`,
        p_device_type: i === 0 ? 'web' : 'android',
        p_metadata: { test: true },
      });
      await sleep(50);
    }

    // Get active sessions
    const { data, error } = await supabase.rpc('get_active_sessions', {
      p_user_id: testUser.id,
    });

    if (error) throw error;
    if (!data || data.length !== 2) {
      throw new Error(`Expected 2 active sessions, got ${data?.length || 0}`);
    }

    logTest('Get active sessions', true);
  } catch (error) {
    logTest('Get active sessions', false, error);
  }
}

/**
 * Test 7: Remember me session
 */
async function test7_RememberMeSession() {
  try {
    const testUser = await createTestUser();
    testUsers.push(testUser.id);

    const { data, error } = await supabase.rpc('upsert_user_session', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_session_id: `session-${Date.now()}`,
      p_device_type: 'web',
      p_is_remember_me: true,
      p_metadata: { test: true },
    });

    if (error) throw error;
    if (!data) throw new Error('No session ID returned');

    logTest('Remember me session', true);
  } catch (error) {
    logTest('Remember me session', false, error);
  }
}

/**
 * Test 8: Cleanup expired sessions
 */
async function test8_CleanupExpiredSessions() {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_sessions');

    if (error) throw error;

    const count = data && data.length > 0 ? parseInt(data[0].terminated_count) || 0 : 0;
    console.log(`     ${colors.cyan}ℹ️  Cleaned up ${count} expired session(s)${colors.reset}`);

    logTest('Cleanup expired sessions', true);
  } catch (error) {
    logTest('Cleanup expired sessions', false, error);
  }
}

/**
 * Test 9: Get session statistics
 */
async function test9_GetSessionStats() {
  try {
    const { data, error } = await supabase.rpc('get_session_stats', {
      p_time_window_hours: 24,
    });

    if (error) throw error;
    
    if (data && data.length > 0) {
      const stats = data[0];
      console.log(`     ${colors.cyan}ℹ️  Stats: ${stats.total_sessions} total, ${stats.active_sessions} active${colors.reset}`);
    }

    logTest('Get session statistics', true);
  } catch (error) {
    logTest('Get session statistics', false, error);
  }
}

/**
 * Test 10: Cleanup old sessions
 */
async function test10_CleanupOldSessions() {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_sessions', {
      p_retention_days: 90,
    });

    if (error) throw error;

    const count = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
    console.log(`     ${colors.cyan}ℹ️  Cleaned up ${count} old session(s)${colors.reset}`);

    logTest('Cleanup old sessions', true);
  } catch (error) {
    logTest('Cleanup old sessions', false, error);
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  try {
    console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
    
    // Clean up session records
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .filter('metadata->>test', 'eq', 'true');

    if (error) {
      console.log(`${colors.yellow}⚠️  Session cleanup warning: ${error.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Session records cleaned up${colors.reset}`);
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
    console.log(`${colors.green}${colors.bright}🎉 All tests passed! Session management is working correctly.${colors.reset}\n`);
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
  console.log(`${colors.bright}${colors.blue}SESSION MANAGEMENT TEST SUITE${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  logSection('Database Infrastructure Tests');
  await test1_VerifyTableExists();

  logSection('Session Operations Tests');
  await test2_CreateSession();
  await test3_UpdateSessionActivity();
  await test4_TerminateSession();
  await test5_TerminateAllSessions();

  logSection('Query Function Tests');
  await test6_GetActiveSessions();
  await test9_GetSessionStats();

  logSection('Advanced Features Tests');
  await test7_RememberMeSession();

  logSection('Maintenance Tests');
  await test8_CleanupExpiredSessions();
  await test10_CleanupOldSessions();

  await cleanupTestData();
  printResults();
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}${colors.bright}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

