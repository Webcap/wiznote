/**
 * Authentication Utilities
 * 
 * This file provides helper functions for authentication-related features.
 * The actual authentication is handled by BetterAuthService using Supabase directly.
 */

import { systemSettingsService } from '../services/SystemSettingsService';
import { rateLimitService, type RateLimitCheck } from '../services/RateLimitService';

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

// Export the helper functions for use in other modules
export { 
  shouldRequireEmailVerification, 
  isMfaEnabled,
  isRateLimitEnabled,
  checkAuthRateLimit,
  formatRateLimitError,
}; 