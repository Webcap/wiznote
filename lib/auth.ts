/**
 * Authentication Utilities
 * 
 * This file provides helper functions for authentication-related features.
 * The actual authentication is handled by BetterAuthService using Supabase directly.
 */

import { systemSettingsService } from '../services/SystemSettingsService';
import { rateLimitService, type RateLimitCheck } from '../services/RateLimitService';
import { csrfService } from '../services/CSRFService';

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
}; 