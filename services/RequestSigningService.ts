/**
 * Request Signing Service
 * 
 * HMAC-SHA256 request signing for API security
 * Prevents API tampering and replay attacks
 * 
 * @module RequestSigningService
 * @created October 2025
 */

import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Signed request data
 */
export interface SignedRequest {
  requestId: string;
  timestamp: number;
  signature: string;
  method: string;
  path: string;
  bodyHash?: string;
}

/**
 * Signature verification result
 */
export interface SignatureVerification {
  isValid: boolean;
  error?: string;
  isReplay?: boolean;
  timestamp?: number;
  timeDrift?: number;
}

/**
 * API key information
 */
export interface ApiKeyInfo {
  id: string;
  keyName: string;
  keyVersion: number;
  keyPurpose: string;
  allowedOperations: string[];
  lastUsedAt: Date | null;
  usageCount: number;
}

/**
 * Request Signing Service
 * Handles HMAC-SHA256 signing and verification
 */
class RequestSigningService {
  private static instance: RequestSigningService;
  private readonly MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SIGNATURE_ALGORITHM = 'HMAC-SHA256';
  private apiKey: string | null = null;
  private keyName: string = 'default_client_key';

  private constructor() {
    console.log('[RequestSigningService] Service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RequestSigningService {
    if (!RequestSigningService.instance) {
      RequestSigningService.instance = new RequestSigningService();
    }
    return RequestSigningService.instance;
  }

  /**
   * Set API signing key
   */
  public setApiKey(key: string, keyName?: string): void {
    this.apiKey = key;
    if (keyName) {
      this.keyName = keyName;
    }
    console.log(`[RequestSigningService] API key set: ${keyName || this.keyName}`);
  }

  /**
   * Generate SHA-256 hash
   */
  private async generateHash(data: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // Web implementation using SubtleCrypto
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // React Native using expo-crypto
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          data
        );
      }
    } catch (error) {
      console.error('[RequestSigningService] Error generating hash:', error);
      throw error;
    }
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  private async generateHMAC(key: string, message: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // Web implementation using SubtleCrypto
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const signatureArray = Array.from(new Uint8Array(signature));
        return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // React Native - use a combination of hash and key
        // Note: For production, consider using a native crypto library
        const combined = `${key}:${message}`;
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          combined
        );
      }
    } catch (error) {
      console.error('[RequestSigningService] Error generating HMAC:', error);
      throw error;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Sign a request
   */
  public async signRequest(
    method: string,
    path: string,
    body?: any,
    userId?: string
  ): Promise<SignedRequest> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not set. Call setApiKey() first.');
      }

      // Generate request ID
      const requestId = this.generateRequestId();
      
      // Get current timestamp
      const timestamp = Date.now();
      
      // Hash body if provided
      let bodyHash: string | undefined;
      if (body) {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        bodyHash = await this.generateHash(bodyString);
      }
      
      // Build signature payload
      const signaturePayload = [
        method.toUpperCase(),
        path,
        requestId,
        timestamp.toString(),
        bodyHash || '',
        userId || '',
      ].join('|');
      
      // Generate signature
      const signature = await this.generateHMAC(this.apiKey, signaturePayload);
      
      console.log('[RequestSigningService] Request signed:', {
        requestId,
        method,
        path,
        hasBody: !!body,
        timestamp,
      });
      
      return {
        requestId,
        timestamp,
        signature,
        method: method.toUpperCase(),
        path,
        bodyHash,
      };
    } catch (error) {
      console.error('[RequestSigningService] Error signing request:', error);
      throw error;
    }
  }

  /**
   * Verify a request signature
   */
  public async verifySignature(
    signature: string,
    method: string,
    path: string,
    requestId: string,
    timestamp: number,
    bodyHash?: string,
    userId?: string
  ): Promise<SignatureVerification> {
    try {
      if (!this.apiKey) {
        return {
          isValid: false,
          error: 'API key not configured on server',
        };
      }

      // Check timestamp is within acceptable drift
      const now = Date.now();
      const timeDrift = Math.abs(now - timestamp);
      
      if (timeDrift > this.MAX_TIMESTAMP_DRIFT_MS) {
        const driftMinutes = Math.floor(timeDrift / 60000);
        return {
          isValid: false,
          error: `Timestamp too old or in future (drift: ${driftMinutes} minutes)`,
          timeDrift,
        };
      }

      // Rebuild signature payload (must match client exactly)
      const signaturePayload = [
        method.toUpperCase(),
        path,
        requestId,
        timestamp.toString(),
        bodyHash || '',
        userId || '',
      ].join('|');
      
      // Generate expected signature
      const expectedSignature = await this.generateHMAC(this.apiKey, signaturePayload);
      
      // Compare signatures (constant-time comparison for security)
      const isValid = this.constantTimeCompare(signature, expectedSignature);
      
      if (!isValid) {
        console.warn('[RequestSigningService] Invalid signature:', {
          requestId,
          method,
          path,
          timeDrift,
        });
        
        return {
          isValid: false,
          error: 'Invalid signature',
          timestamp,
          timeDrift,
        };
      }

      // Check for replay attack
      const { data: replayCheck } = await supabase.rpc('check_request_replay', {
        p_signature: signature,
        p_time_window_minutes: 5,
      });

      const isReplay = replayCheck && replayCheck.length > 0 ? replayCheck[0].is_replay : false;

      if (isReplay) {
        console.warn('[RequestSigningService] Replay attack detected:', {
          requestId,
          signature,
        });
        
        return {
          isValid: false,
          error: 'Request replay detected',
          isReplay: true,
          timestamp,
        };
      }

      console.log('[RequestSigningService] ✅ Signature verified:', requestId);
      
      return {
        isValid: true,
        timestamp,
        timeDrift,
      };
    } catch (error) {
      console.error('[RequestSigningService] Error verifying signature:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Constant-time string comparison (prevents timing attacks)
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Log signed request
   */
  public async logRequest(
    signedRequest: SignedRequest,
    isValid: boolean,
    userId?: string,
    userEmail?: string,
    validationError?: string,
    isReplay: boolean = false
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_signed_request', {
        p_request_id: signedRequest.requestId,
        p_signature: signedRequest.signature,
        p_timestamp: signedRequest.timestamp,
        p_method: signedRequest.method,
        p_path: signedRequest.path,
        p_body_hash: signedRequest.bodyHash || null,
        p_user_id: userId || null,
        p_user_email: userEmail || null,
        p_api_key_id: null, // Could be enhanced to track which key was used
        p_key_name: this.keyName,
        p_is_valid: isValid,
        p_validation_error: validationError || null,
        p_is_replay: isReplay,
        p_metadata: {
          platform: Platform.OS,
          timestamp_drift_ms: Date.now() - signedRequest.timestamp,
        },
      });

      if (error) {
        console.error('[RequestSigningService] Error logging request:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('[RequestSigningService] Error in logRequest:', error);
      return null;
    }
  }

  /**
   * Create signed headers for HTTP request
   */
  public createSignedHeaders(signedRequest: SignedRequest, userId?: string): Record<string, string> {
    return {
      'X-Request-ID': signedRequest.requestId,
      'X-Timestamp': signedRequest.timestamp.toString(),
      'X-Signature': signedRequest.signature,
      'X-User-ID': userId || '',
      'X-Signature-Algorithm': this.SIGNATURE_ALGORITHM,
    };
  }

  /**
   * Extract signature from request headers
   */
  public extractSignatureFromHeaders(headers: Record<string, string>): {
    requestId: string;
    timestamp: number;
    signature: string;
    userId?: string;
  } | null {
    const requestId = headers['X-Request-ID'] || headers['x-request-id'];
    const timestamp = headers['X-Timestamp'] || headers['x-timestamp'];
    const signature = headers['X-Signature'] || headers['x-signature'];
    const userId = headers['X-User-ID'] || headers['x-user-id'];

    if (!requestId || !timestamp || !signature) {
      return null;
    }

    return {
      requestId,
      timestamp: parseInt(timestamp),
      signature,
      userId: userId || undefined,
    };
  }

  /**
   * Get API key statistics
   */
  public async getApiKeyStats(): Promise<ApiKeyInfo[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_api_keys');

      if (error) {
        console.error('[RequestSigningService] Error getting API keys:', error);
        return [];
      }

      return (data || []).map((key: any) => ({
        id: key.id,
        keyName: key.key_name,
        keyVersion: key.key_version,
        keyPurpose: key.key_purpose,
        allowedOperations: key.allowed_operations || [],
        lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : null,
        usageCount: parseInt(key.usage_count) || 0,
      }));
    } catch (error) {
      console.error('[RequestSigningService] Error getting API key stats:', error);
      return [];
    }
  }

  /**
   * Get request signing statistics
   */
  public async getRequestStats(timeWindowHours: number = 24): Promise<{
    totalRequests: number;
    validRequests: number;
    invalidRequests: number;
    replayAttempts: number;
    uniqueUsers: number;
    uniqueKeys: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_request_signing_stats', {
        p_time_window_hours: timeWindowHours,
      });

      if (error) {
        console.error('[RequestSigningService] Error getting request stats:', error);
        return {
          totalRequests: 0,
          validRequests: 0,
          invalidRequests: 0,
          replayAttempts: 0,
          uniqueUsers: 0,
          uniqueKeys: 0,
        };
      }

      const result = data && data.length > 0 ? data[0] : null;

      return {
        totalRequests: parseInt(result?.total_requests) || 0,
        validRequests: parseInt(result?.valid_requests) || 0,
        invalidRequests: parseInt(result?.invalid_requests) || 0,
        replayAttempts: parseInt(result?.replay_attempts) || 0,
        uniqueUsers: parseInt(result?.unique_users) || 0,
        uniqueKeys: parseInt(result?.unique_keys) || 0,
      };
    } catch (error) {
      console.error('[RequestSigningService] Error getting request stats:', error);
      return {
        totalRequests: 0,
        validRequests: 0,
        invalidRequests: 0,
        replayAttempts: 0,
        uniqueUsers: 0,
        uniqueKeys: 0,
      };
    }
  }
}

// Export singleton instance
export const requestSigningService = RequestSigningService.getInstance();

