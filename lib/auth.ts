/**
 * Authentication Utilities
 * 
 * This file provides helper functions for authentication-related features.
 * The actual authentication is handled by BetterAuthService using Supabase directly.
 */

import { systemSettingsService } from '../services/SystemSettingsService';
import { rateLimitService, type RateLimitCheck } from '../services/RateLimitService';
import { csrfService } from '../services/CSRFService';
import { securityLoggingService, type SecurityEventType } from '../services/SecurityLoggingService';

// Helper function to get email verification requirement from system settings
// Use this in signup flows to check if verification is required
async function shouldRequireEmailVerification(): Promise<boolean> {
  try {
    return await systemSettingsService.isEmailVerificationRequired();
  } catch (error) {
    console.error('Error checking email verification requirement:', error);
    // Default to secure setting (require verification) if settings can't be loaded
    return true;
  }
}

// Helper function to check if MFA is enabled
async function isMfaEnabled(): Promise<boolean> {
  try {
    return await systemSettingsService.isMfaEnabled();
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}

// Helper function to check if rate limiting is enabled
async function isRateLimitEnabled(): Promise<boolean> {
  try {
    return await systemSettingsService.isRateLimitEnabled();
  } catch (error) {
    console.error('Error checking rate limiting status:', error);
    return true; // Secure default
  }
}

// Helper function to check if CSRF protection is enabled
async function isCsrfEnabled(): Promise<boolean> {
  try {
    return await systemSettingsService.isCsrfEnabled();
  } catch (error) {
    console.error('Error checking CSRF protection status:', error);
    return true; // Secure default
  }
}

// Helper function to check rate limit for authentication
async function checkAuthRateLimit(
  email: string,
  attemptType: 'auth_signin' | 'auth_signup'
): Promise<RateLimitCheck> {
  try {
    return await rateLimitService.checkAndRecordAuthAttempt(email, attemptType);
  } catch (error) {
    console.error('Error checking auth rate limit:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      isLimited: false,
      attemptCount: 0,
      maxAttempts: 5,
      windowMinutes: 15,
      windowStart: new Date(),
      windowEnd: new Date(),
    };
  }
}

// Helper function to format rate limit error
function formatRateLimitError(rateLimitCheck: RateLimitCheck): string {
  return rateLimitService.formatRateLimitError(rateLimitCheck);
}

// Helper function to verify CSRF token
async function verifyCsrfToken(
  token: string | undefined,
  userId: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    if (!token) {
      return { isValid: false, error: 'CSRF token is required' };
    }
    const result = await csrfService.validateToken(token, userId);
    return { isValid: result.isValid, error: result.error };
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return { isValid: false, error: 'CSRF verification failed' };
  }
}

// Helper function to generate CSRF token for user
async function generateCsrfToken(userId: string): Promise<string> {
  try {
    return await csrfService.generateToken(userId);
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    throw error;
  }
}

// Helper function to get or generate CSRF token
async function getOrGenerateCsrfToken(userId: string): Promise<string> {
  try {
    return await csrfService.getUserToken(userId);
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw error;
  }
}

// Helper function to clear user's CSRF tokens (on logout)
async function clearUserCsrfTokens(userId: string): Promise<void> {
  try {
    await csrfService.deleteUserTokens(userId);
  } catch (error) {
    console.error('Error clearing CSRF tokens:', error);
  }
}

// =====================================================
// SECURITY LOGGING HELPERS
// =====================================================

/**
 * Log authentication event
 */
async function logAuthEvent(
  eventType: Extract<SecurityEventType, `auth.${string}`>,
  userId: string | undefined,
  userEmail: string,
  success: boolean,
  errorMessage?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    await securityLoggingService.logAuthEvent(
      eventType,
      userId,
      userEmail,
      success,
      errorMessage,
      additionalData
    );
  } catch (error) {
    console.error('Error logging auth event:', error);
  }
}

/**
 * Log admin action
 */
async function logAdminAction(
  action: Extract<SecurityEventType, `admin.${string}`>,
  adminUserId: string,
  adminEmail: string,
  targetUserId?: string,
  targetUserEmail?: string,
  actionDetails?: Record<string, any>
): Promise<void> {
  try {
    await securityLoggingService.logAdminAction(
      action,
      adminUserId,
      adminEmail,
      targetUserId,
      targetUserEmail,
      actionDetails
    );
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

/**
 * Log data access event
 */
async function logDataAccess(
  eventType: Extract<SecurityEventType, `data.${string}`>,
  userId: string,
  resourceId: string,
  resourceType: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    await securityLoggingService.logDataAccess(
      eventType,
      userId,
      resourceId,
      resourceType,
      additionalData
    );
  } catch (error) {
    console.error('Error logging data access:', error);
  }
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(
  activityType: Extract<SecurityEventType, `security.suspicious.${string}`>,
  userId: string | undefined,
  userEmail: string | undefined,
  details: Record<string, any>
): Promise<void> {
  try {
    await securityLoggingService.logSuspiciousActivity(
      activityType,
      userId,
      userEmail,
      details
    );
  } catch (error) {
    console.error('Error logging suspicious activity:', error);
  }
}

/**
 * Log API error
 */
async function logApiError(
  errorType: Extract<SecurityEventType, `api.error.${string}`>,
  userId: string | undefined,
  errorMessage: string,
  requestDetails?: Record<string, any>
): Promise<void> {
  try {
    await securityLoggingService.logApiError(
      errorType,
      userId,
      errorMessage,
      requestDetails
    );
  } catch (error) {
    console.error('Error logging API error:', error);
  }
}

/**
 * Log rate limit event
 */
async function logRateLimitEvent(
  exceeded: boolean,
  userId: string | undefined,
  userEmail: string | undefined,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<void> {
  try {
    await securityLoggingService.logRateLimitEvent(
      exceeded,
      userId,
      userEmail,
      identifier,
      limit,
      windowMs
    );
  } catch (error) {
    console.error('Error logging rate limit event:', error);
  }
}

/**
 * Log system settings change
 */
async function logSystemSettingsChange(
  adminUserId: string,
  adminEmail: string,
  settingKey: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  try {
    await securityLoggingService.logSystemSettingsChange(
      adminUserId,
      adminEmail,
      settingKey,
      oldValue,
      newValue
    );
  } catch (error) {
    console.error('Error logging system settings change:', error);
  }
}

/**
 * Get recent failed login attempts
 */
async function getRecentFailedLogins(
  userEmail: string,
  timeWindowMinutes: number = 15
): Promise<{
  attemptCount: number;
  lastAttempt: Date | null;
  ipAddresses: string[];
}> {
  try {
    return await securityLoggingService.getRecentFailedLogins(userEmail, timeWindowMinutes);
  } catch (error) {
    console.error('Error getting recent failed logins:', error);
    return { attemptCount: 0, lastAttempt: null, ipAddresses: [] };
  }
}

/**
 * Detect suspicious activity
 */
async function detectSuspiciousActivity(
  userId: string,
  timeWindowHours: number = 24
): Promise<Array<{
  pattern: string;
  eventCount: number;
  severity: string;
  details: Record<string, any>;
}>> {
  try {
    return await securityLoggingService.detectSuspiciousActivity(userId, timeWindowHours);
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return [];
  }
}

// Export the helper functions for use in other modules
export { 
  shouldRequireEmailVerification, 
  isMfaEnabled,
  isRateLimitEnabled,
  isCsrfEnabled,
  checkAuthRateLimit,
  formatRateLimitError,
  verifyCsrfToken,
  generateCsrfToken,
  getOrGenerateCsrfToken,
  clearUserCsrfTokens,
  // Security logging helpers
  logAuthEvent,
  logAdminAction,
  logDataAccess,
  logSuspiciousActivity,
  logApiError,
  logRateLimitEvent,
  logSystemSettingsChange,
  getRecentFailedLogins,
  detectSuspiciousActivity,
}; 