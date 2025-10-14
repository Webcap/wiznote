/**
 * Authentication Utilities
 * 
 * This file provides helper functions for authentication-related features.
 * The actual authentication is handled by BetterAuthService using Supabase directly.
 */

import { systemSettingsService } from '../services/SystemSettingsService';

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

// Export the helper functions for use in other modules
export { shouldRequireEmailVerification, isMfaEnabled }; 