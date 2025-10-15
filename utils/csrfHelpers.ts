/**
 * CSRF Protection Helper Utilities
 * 
 * This module provides helper functions for CSRF protection:
 * - Token storage and retrieval (web/mobile)
 * - Request header utilities
 * - Error handling and formatting
 * - Integration helpers for components
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { csrfService } from '../services/CSRFService';

// Storage keys
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'csrf_token_expiry';

/**
 * Store CSRF token in platform-appropriate storage
 */
export async function storeCsrfToken(token: string, expiryDate: Date): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web: Store in localStorage
      localStorage.setItem(CSRF_TOKEN_KEY, token);
      localStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    } else {
      // Mobile: Store in AsyncStorage
      await AsyncStorage.setItem(CSRF_TOKEN_KEY, token);
      await AsyncStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, expiryDate.toISOString());
    }
  } catch (error) {
    console.error('❌ Failed to store CSRF token:', error);
  }
}

/**
 * Retrieve CSRF token from storage
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    let token: string | null = null;
    let expiryStr: string | null = null;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web: Get from localStorage
      token = localStorage.getItem(CSRF_TOKEN_KEY);
      expiryStr = localStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
    } else {
      // Mobile: Get from AsyncStorage
      token = await AsyncStorage.getItem(CSRF_TOKEN_KEY);
      expiryStr = await AsyncStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
    }

    // Check if token exists and is not expired
    if (!token || !expiryStr) {
      return null;
    }

    const expiryDate = new Date(expiryStr);
    if (new Date() > expiryDate) {
      // Token expired, clear it
      await clearCsrfToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve CSRF token:', error);
    return null;
  }
}

/**
 * Clear CSRF token from storage
 */
export async function clearCsrfToken(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web: Clear from localStorage
      localStorage.removeItem(CSRF_TOKEN_KEY);
      localStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
    } else {
      // Mobile: Clear from AsyncStorage
      await AsyncStorage.removeItem(CSRF_TOKEN_KEY);
      await AsyncStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
    }
  } catch (error) {
    console.error('❌ Failed to clear CSRF token:', error);
  }
}

/**
 * Get or generate CSRF token for current user
 */
export async function getOrGenerateCsrfToken(userId: string): Promise<string> {
  try {
    // Try to get from storage first
    let token = await getCsrfToken();
    
    if (token) {
      return token;
    }

    // Generate new token
    token = await csrfService.getUserToken(userId);
    
    // Store it
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await storeCsrfToken(token, expiryDate);
    
    return token;
  } catch (error) {
    console.error('❌ Failed to get or generate CSRF token:', error);
    throw error;
  }
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(
  headers: Record<string, string>,
  token: string
): Record<string, string> {
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Get origin header for current platform
 */
export function getOriginHeader(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Mobile apps don't have origin
  return undefined;
}

/**
 * Get referer header for current platform
 */
export function getRefererHeader(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }
  // Mobile apps don't have referer
  return undefined;
}

/**
 * Create headers object with CSRF protection
 */
export async function createProtectedHeaders(
  userId: string,
  additionalHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getOrGenerateCsrfToken(userId);
  
  const headers: Record<string, string> = {
    ...additionalHeaders,
    'X-CSRF-Token': token,
  };

  // Add origin and referer for web
  if (Platform.OS === 'web') {
    const origin = getOriginHeader();
    const referer = getRefererHeader();
    
    if (origin) {
      headers['Origin'] = origin;
    }
    if (referer) {
      headers['Referer'] = referer;
    }
  }

  return headers;
}

/**
 * Verify CSRF for a request
 */
export async function verifyCsrfForRequest(
  token: string,
  userId: string,
  headers?: Record<string, string>
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const result = await csrfService.verifyCsrf({
      token,
      userId,
      origin: headers?.['Origin'] || headers?.['origin'],
      referer: headers?.['Referer'] || headers?.['referer'],
      headers,
    });

    return {
      isValid: result.isValid,
      error: result.error,
    };
  } catch (error) {
    console.error('❌ CSRF verification failed:', error);
    return {
      isValid: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Handle CSRF error - clear token and request new one
 */
export async function handleCsrfError(userId: string): Promise<string> {
  try {
    // Clear old token
    await clearCsrfToken();
    
    // Generate new token
    const newToken = await csrfService.generateToken(userId);
    
    // Store it
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    await storeCsrfToken(newToken, expiryDate);
    
    return newToken;
  } catch (error) {
    console.error('❌ Failed to handle CSRF error:', error);
    throw error;
  }
}

/**
 * CSRF error messages
 */
export const CSRF_ERRORS = {
  TOKEN_MISSING: 'CSRF token is missing. Please refresh the page.',
  TOKEN_INVALID: 'Invalid CSRF token. Please refresh the page.',
  TOKEN_EXPIRED: 'CSRF token has expired. Please refresh the page.',
  ORIGIN_INVALID: 'Request origin verification failed.',
  VERIFICATION_FAILED: 'CSRF verification failed. Please try again.',
};

/**
 * Format CSRF error for user display
 */
export function formatCsrfError(error: string | undefined): string {
  if (!error) {
    return CSRF_ERRORS.VERIFICATION_FAILED;
  }

  if (error.toLowerCase().includes('missing')) {
    return CSRF_ERRORS.TOKEN_MISSING;
  }
  if (error.toLowerCase().includes('invalid')) {
    return CSRF_ERRORS.TOKEN_INVALID;
  }
  if (error.toLowerCase().includes('expired')) {
    return CSRF_ERRORS.TOKEN_EXPIRED;
  }
  if (error.toLowerCase().includes('origin')) {
    return CSRF_ERRORS.ORIGIN_INVALID;
  }

  return CSRF_ERRORS.VERIFICATION_FAILED;
}

/**
 * Check if CSRF protection is enabled
 */
export async function isCsrfEnabled(): Promise<boolean> {
  try {
    // This would query the system settings
    // For now, return true (secure default)
    return true;
  } catch (error) {
    console.error('❌ Failed to check CSRF status:', error);
    // Secure default: enabled
    return true;
  }
}

/**
 * Rotate CSRF token (call on sensitive operations)
 */
export async function rotateCsrfToken(userId: string): Promise<string> {
  try {
    const oldToken = await getCsrfToken();
    
    if (!oldToken) {
      // No token to rotate, generate new one
      return await getOrGenerateCsrfToken(userId);
    }

    // Rotate in service
    const newToken = await csrfService.rotateToken(oldToken, userId);
    
    // Store new token
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    await storeCsrfToken(newToken, expiryDate);
    
    return newToken;
  } catch (error) {
    console.error('❌ Failed to rotate CSRF token:', error);
    throw error;
  }
}

/**
 * Clear CSRF token on logout
 */
export async function clearCsrfOnLogout(userId: string): Promise<void> {
  try {
    // Clear from storage
    await clearCsrfToken();
    
    // Revoke from database
    await csrfService.deleteUserTokens(userId);
    
    console.log('✅ CSRF tokens cleared on logout');
  } catch (error) {
    console.error('❌ Failed to clear CSRF tokens on logout:', error);
  }
}

/**
 * Hook-style function for React components (returns token and refresh function)
 */
export function createCsrfTokenManager(userId: string) {
  let currentToken: string | null = null;

  return {
    getToken: async (): Promise<string> => {
      if (currentToken) {
        return currentToken;
      }
      currentToken = await getOrGenerateCsrfToken(userId);
      return currentToken;
    },
    
    refreshToken: async (): Promise<string> => {
      currentToken = await rotateCsrfToken(userId);
      return currentToken;
    },
    
    clearToken: async (): Promise<void> => {
      currentToken = null;
      await clearCsrfToken();
    },
  };
}


