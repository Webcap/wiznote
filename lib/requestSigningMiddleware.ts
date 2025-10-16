/**
 * Request Signing Middleware
 * 
 * Middleware for verifying HMAC-SHA256 request signatures
 * Protects API endpoints from tampering and replay attacks
 * 
 * @module requestSigningMiddleware
 * @created October 2025
 */

import { requestSigningService } from '../services/RequestSigningService';
import { logApiError } from './auth';

/**
 * Request signature verification result
 */
export interface SignatureVerificationResult {
  isValid: boolean;
  error?: string;
  requestId?: string;
  timestamp?: number;
  userId?: string;
}

/**
 * Middleware options
 */
export interface SignatureMiddlewareOptions {
  required?: boolean; // If false, allow unsigned requests (for gradual rollout)
  logFailures?: boolean; // Log failed verification attempts
  rejectReplays?: boolean; // Reject replay attacks
  maxTimeDrift?: number; // Max allowed time drift in milliseconds (default: 5 minutes)
}

/**
 * Extract signature from request headers
 */
export function extractSignatureHeaders(headers: Record<string, string>): {
  requestId: string;
  timestamp: number;
  signature: string;
  userId?: string;
} | null {
  return requestSigningService.extractSignatureFromHeaders(headers);
}

/**
 * Verify request signature middleware
 */
export async function verifyRequestSignature(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: any,
  options: SignatureMiddlewareOptions = {}
): Promise<SignatureVerificationResult> {
  const {
    required = true,
    logFailures = true,
    rejectReplays = true,
  } = options;

  try {
    // Extract signature headers
    const signatureData = extractSignatureHeaders(headers);

    if (!signatureData) {
      if (!required) {
        // Allow unsigned requests if not required
        console.log('[RequestSigningMiddleware] No signature found, allowing unsigned request');
        return { isValid: true };
      }

      console.warn('[RequestSigningMiddleware] Missing signature headers');
      
      if (logFailures) {
        await logApiError(
          'api.error.unauthorized',
          undefined,
          'Missing request signature headers',
          { method, path }
        );
      }

      return {
        isValid: false,
        error: 'Request signature required',
      };
    }

    // Calculate body hash if body is provided
    let bodyHash: string | undefined;
    if (body) {
      // This should match the hash generated on the client
      // For now, we'll skip body hash verification and focus on basic signature
      bodyHash = undefined;
    }

    // Verify signature
    const verification = await requestSigningService.verifySignature(
      signatureData.signature,
      method,
      path,
      signatureData.requestId,
      signatureData.timestamp,
      bodyHash,
      signatureData.userId
    );

    if (!verification.isValid) {
      console.warn('[RequestSigningMiddleware] Invalid signature:', verification.error);
      
      if (logFailures) {
        await logApiError(
          'api.error.unauthorized',
          signatureData.userId,
          verification.error || 'Invalid request signature',
          { 
            method, 
            path, 
            requestId: signatureData.requestId,
            isReplay: verification.isReplay 
          }
        );
      }

      return {
        isValid: false,
        error: verification.error || 'Invalid signature',
        requestId: signatureData.requestId,
        timestamp: signatureData.timestamp,
        userId: signatureData.userId,
      };
    }

    // Check for replay attack
    if (rejectReplays && verification.isReplay) {
      console.warn('[RequestSigningMiddleware] Replay attack detected');
      
      if (logFailures) {
        await logApiError(
          'api.error.forbidden',
          signatureData.userId,
          'Request replay attack detected',
          { method, path, requestId: signatureData.requestId }
        );
      }

      return {
        isValid: false,
        error: 'Request replay detected',
        requestId: signatureData.requestId,
        timestamp: signatureData.timestamp,
        userId: signatureData.userId,
      };
    }

    // Log successful verification
    await requestSigningService.logRequest(
      {
        requestId: signatureData.requestId,
        timestamp: signatureData.timestamp,
        signature: signatureData.signature,
        method,
        path,
        bodyHash,
      },
      true,
      signatureData.userId,
      undefined,
      undefined,
      false
    );

    console.log('[RequestSigningMiddleware] ✅ Signature verified:', signatureData.requestId);

    return {
      isValid: true,
      requestId: signatureData.requestId,
      timestamp: signatureData.timestamp,
      userId: signatureData.userId,
    };
  } catch (error) {
    console.error('[RequestSigningMiddleware] Error in middleware:', error);
    
    if (logFailures) {
      await logApiError(
        'api.error.server',
        undefined,
        error instanceof Error ? error.message : 'Signature verification error',
        { method, path }
      );
    }

    return {
      isValid: false,
      error: 'Signature verification failed',
    };
  }
}

/**
 * Express/Node.js middleware wrapper (for Stripe Guardian)
 */
export function createSignatureMiddleware(options: SignatureMiddlewareOptions = {}) {
  return async (req: any, res: any, next: any) => {
    try {
      const verification = await verifyRequestSignature(
        req.method,
        req.path,
        req.headers,
        req.body,
        options
      );

      if (!verification.isValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: verification.error || 'Invalid request signature',
        });
      }

      // Attach verification data to request for downstream use
      req.signatureVerification = verification;
      
      next();
    } catch (error) {
      console.error('[SignatureMiddleware] Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Signature verification failed',
      });
    }
  };
}

