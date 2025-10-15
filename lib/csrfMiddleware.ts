/**
 * CSRF Protection Middleware
 * 
 * Provides middleware functions for CSRF protection in various contexts:
 * - Authentication operations
 * - State-changing operations (create, update, delete)
 * - Admin operations
 * - API endpoints
 */

import { csrfService, CSRFVerificationResult } from '../services/CSRFService';
import { formatCsrfError } from '../utils/csrfHelpers';
import { Platform } from 'react-native';

/**
 * Result of CSRF check with user-friendly error
 */
export interface CSRFCheckResult {
  allowed: boolean;
  error?: string;
  requiresNewToken?: boolean;
}

/**
 * Middleware: Check CSRF token before operation
 */
export async function checkCsrfProtection(
  token: string | undefined,
  userId: string,
  origin?: string,
  referer?: string,
  headers?: Record<string, string>
): Promise<CSRFCheckResult> {
  try {
    if (!token) {
      return {
        allowed: false,
        error: 'CSRF token is required for this operation',
        requiresNewToken: true,
      };
    }

    const result = await csrfService.verifyCsrf({
      token,
      userId,
      origin,
      referer,
      headers,
    });

    if (!result.isValid) {
      return {
        allowed: false,
        error: formatCsrfError(result.error),
        requiresNewToken: result.requiresNewToken,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('❌ CSRF middleware error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
      requiresNewToken: true,
    };
  }
}

/**
 * Middleware: Verify origin for web requests
 */
export function checkOriginProtection(
  origin: string | undefined,
  referer: string | undefined
): CSRFCheckResult {
  try {
    // Skip for mobile platforms
    if (Platform.OS !== 'web') {
      return { allowed: true };
    }

    const result = csrfService.verifyOrigin({ origin, referer });

    if (!result.isValid) {
      return {
        allowed: false,
        error: result.error || 'Origin verification failed',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('❌ Origin check error:', error);
    return {
      allowed: false,
      error: 'Origin verification failed',
    };
  }
}

/**
 * Middleware: Combined CSRF protection (token + origin)
 */
export async function enforCsrfProtection(params: {
  token: string | undefined;
  userId: string;
  origin?: string;
  referer?: string;
  headers?: Record<string, string>;
  operationType?: string; // For logging
}): Promise<CSRFCheckResult> {
  try {
    const { token, userId, origin, referer, headers, operationType } = params;

    // Log the operation type for debugging
    if (operationType) {
      console.log(`🔒 CSRF check for operation: ${operationType}`);
    }

    // Check CSRF token
    const csrfCheck = await checkCsrfProtection(token, userId, origin, referer, headers);
    
    if (!csrfCheck.allowed) {
      console.warn(`⚠️ CSRF check failed for user ${userId}: ${csrfCheck.error}`);
      return csrfCheck;
    }

    console.log(`✅ CSRF check passed for user ${userId}`);
    return { allowed: true };
  } catch (error) {
    console.error('❌ CSRF enforcement error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Wrapper: Protect an async operation with CSRF
 */
export async function withCsrfProtection<T>(
  operation: () => Promise<T>,
  csrfParams: {
    token: string | undefined;
    userId: string;
    origin?: string;
    referer?: string;
    headers?: Record<string, string>;
    operationType?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // Check CSRF first
    const csrfCheck = await enforCsrfProtection(csrfParams);
    
    if (!csrfCheck.allowed) {
      return {
        success: false,
        error: csrfCheck.error || 'CSRF verification failed',
      };
    }

    // Execute the operation
    const data = await operation();
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('❌ Protected operation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed',
    };
  }
}

/**
 * Middleware: CSRF protection for authentication operations
 */
export async function csrfProtectAuth(
  token: string | undefined,
  email: string,
  operation: 'signin' | 'signup' | 'password-reset' | 'password-change'
): Promise<CSRFCheckResult> {
  try {
    console.log(`🔒 CSRF protection for auth operation: ${operation}`);

    // For signup, we don't have a userId yet, so we skip token validation
    // but we still check origin
    if (operation === 'signup') {
      if (Platform.OS === 'web') {
        const originCheck = checkOriginProtection(
          typeof window !== 'undefined' ? window.location.origin : undefined,
          typeof window !== 'undefined' ? window.location.href : undefined
        );
        return originCheck;
      }
      return { allowed: true };
    }

    // For other operations, we need the token
    if (!token) {
      return {
        allowed: false,
        error: 'CSRF token is required',
        requiresNewToken: true,
      };
    }

    // Origin check for web
    if (Platform.OS === 'web') {
      const originCheck = checkOriginProtection(
        typeof window !== 'undefined' ? window.location.origin : undefined,
        typeof window !== 'undefined' ? window.location.href : undefined
      );
      
      if (!originCheck.allowed) {
        return originCheck;
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('❌ Auth CSRF protection error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Middleware: CSRF protection for note operations
 */
export async function csrfProtectNote(
  token: string | undefined,
  userId: string,
  operation: 'create' | 'update' | 'delete' | 'share'
): Promise<CSRFCheckResult> {
  try {
    return await enforCsrfProtection({
      token,
      userId,
      origin: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : undefined,
      referer: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.href 
        : undefined,
      operationType: `note-${operation}`,
    });
  } catch (error) {
    console.error('❌ Note CSRF protection error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Middleware: CSRF protection for payment operations
 */
export async function csrfProtectPayment(
  token: string | undefined,
  userId: string,
  operation: 'create-checkout' | 'cancel-subscription' | 'update-payment'
): Promise<CSRFCheckResult> {
  try {
    return await enforCsrfProtection({
      token,
      userId,
      origin: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : undefined,
      referer: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.href 
        : undefined,
      operationType: `payment-${operation}`,
    });
  } catch (error) {
    console.error('❌ Payment CSRF protection error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Middleware: CSRF protection for admin operations
 */
export async function csrfProtectAdmin(
  token: string | undefined,
  userId: string,
  operation: string
): Promise<CSRFCheckResult> {
  try {
    return await enforCsrfProtection({
      token,
      userId,
      origin: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : undefined,
      referer: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.href 
        : undefined,
      operationType: `admin-${operation}`,
    });
  } catch (error) {
    console.error('❌ Admin CSRF protection error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Middleware: CSRF protection for support operations
 */
export async function csrfProtectSupport(
  token: string | undefined,
  userId: string,
  operation: 'create-ticket' | 'update-ticket' | 'close-ticket'
): Promise<CSRFCheckResult> {
  try {
    return await enforCsrfProtection({
      token,
      userId,
      origin: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.origin 
        : undefined,
      referer: Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.location.href 
        : undefined,
      operationType: `support-${operation}`,
    });
  } catch (error) {
    console.error('❌ Support CSRF protection error:', error);
    return {
      allowed: false,
      error: 'CSRF verification failed',
    };
  }
}

/**
 * Helper: Extract CSRF token from request headers
 */
export function extractCsrfToken(headers: Record<string, string>): string | undefined {
  return headers['X-CSRF-Token'] || 
         headers['x-csrf-token'] || 
         headers['X-Csrf-Token'];
}

/**
 * Helper: Create CSRF error response
 */
export function createCsrfErrorResponse(error: string, requiresNewToken = false) {
  return {
    success: false,
    error,
    csrfError: true,
    requiresNewToken,
  };
}

/**
 * Helper: Check if error is CSRF-related
 */
export function isCsrfError(error: string): boolean {
  const csrfKeywords = ['csrf', 'token', 'origin', 'cross-site'];
  return csrfKeywords.some(keyword => 
    error.toLowerCase().includes(keyword)
  );
}


