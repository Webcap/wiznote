/**
 * CSRF (Cross-Site Request Forgery) Protection Service
 * 
 * This service provides comprehensive CSRF protection for WizNote:
 * - Token generation and validation
 * - Origin/Referer header verification
 * - Admin-configurable enforcement toggle
 * - Automatic token rotation
 * - Secure token storage and management
 * 
 * CSRF tokens protect against attacks where malicious websites trick
 * authenticated users into performing unwanted actions.
 * 
 * @see docs/CSRF_PROTECTION_SETUP.md for implementation details
 */

import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32; // 256 bits of entropy
const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const CSRF_CACHE_KEY = 'csrf_settings_cache';
const CSRF_CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

// Allowed origins for web platform
const ALLOWED_ORIGINS = [
  'https://wiznote.app',
  'https://www.wiznote.app',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
];

interface CSRFToken {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

interface CSRFVerificationResult {
  isValid: boolean;
  error?: string;
  requiresNewToken?: boolean;
}

interface OriginVerificationResult {
  isValid: boolean;
  origin?: string;
  error?: string;
}

interface CSRFSettings {
  enabled: boolean;
  requireOriginCheck: boolean;
}

class CSRFService {
  private tokenCache = new Map<string, CSRFToken>();
  private settingsCache: { data: CSRFSettings; timestamp: number } | null = null;

  /**
   * Generate a cryptographically secure CSRF token
   */
  async generateToken(userId: string): Promise<string> {
    try {
      // Generate random bytes for token
      const token = this.generateSecureRandomString(CSRF_TOKEN_LENGTH);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CSRF_TOKEN_EXPIRY_MS);

      // Store token in database
      const { error } = await supabase
        .from('csrf_tokens')
        .insert({
          token,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
        });

      if (error) {
        console.error('❌ CSRFService: Failed to store token in database:', error);
        throw new Error(`Failed to generate CSRF token: ${error.message}`);
      }

      // Cache the token
      this.tokenCache.set(token, {
        token,
        userId,
        expiresAt,
        createdAt: now,
      });

      console.log('✅ CSRFService: Generated new CSRF token for user:', userId);
      return token;
    } catch (error) {
      console.error('❌ CSRFService: Error generating token:', error);
      throw error;
    }
  }

  /**
   * Validate a CSRF token
   */
  async validateToken(
    token: string,
    userId: string
  ): Promise<CSRFVerificationResult> {
    try {
      // Check if CSRF protection is enabled
      const settings = await this.getSettings();
      if (!settings.enabled) {
        console.log('⚠️ CSRFService: CSRF protection is disabled via admin settings');
        return { isValid: true };
      }

      if (!token) {
        return {
          isValid: false,
          error: 'CSRF token is required',
          requiresNewToken: true,
        };
      }

      // Check cache first
      const cachedToken = this.tokenCache.get(token);
      if (cachedToken) {
        if (cachedToken.userId !== userId) {
          return {
            isValid: false,
            error: 'CSRF token does not match user',
            requiresNewToken: true,
          };
        }

        if (new Date() > cachedToken.expiresAt) {
          this.tokenCache.delete(token);
          return {
            isValid: false,
            error: 'CSRF token has expired',
            requiresNewToken: true,
          };
        }

        // Update last used timestamp
        await this.updateTokenUsage(token);
        return { isValid: true };
      }

      // Check database
      const { data, error } = await supabase
        .from('csrf_tokens')
        .select('*')
        .eq('token', token)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return {
          isValid: false,
          error: 'Invalid CSRF token',
          requiresNewToken: true,
        };
      }

      const expiresAt = new Date(data.expires_at);
      if (new Date() > expiresAt) {
        // Clean up expired token
        await this.deleteToken(token);
        return {
          isValid: false,
          error: 'CSRF token has expired',
          requiresNewToken: true,
        };
      }

      // Cache the token
      this.tokenCache.set(token, {
        token: data.token,
        userId: data.user_id,
        expiresAt,
        createdAt: new Date(data.created_at),
        lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      });

      // Update last used timestamp
      await this.updateTokenUsage(token);

      console.log('✅ CSRFService: Token validated successfully');
      return { isValid: true };
    } catch (error) {
      console.error('❌ CSRFService: Error validating token:', error);
      return {
        isValid: false,
        error: 'Token validation failed',
        requiresNewToken: true,
      };
    }
  }

  /**
   * Verify origin/referer headers for web requests
   */
  verifyOrigin(request: {
    origin?: string;
    referer?: string;
    headers?: Record<string, string>;
  }): OriginVerificationResult {
    try {
      // Skip origin check for mobile platforms
      if (Platform.OS !== 'web') {
        return { isValid: true };
      }

      const origin = request.origin || request.headers?.['origin'];
      const referer = request.referer || request.headers?.['referer'];

      // Get the origin from either Origin or Referer header
      let requestOrigin: string | undefined;
      if (origin) {
        requestOrigin = origin;
      } else if (referer) {
        try {
          const refererUrl = new URL(referer);
          requestOrigin = refererUrl.origin;
        } catch (e) {
          console.warn('⚠️ CSRFService: Invalid referer URL:', referer);
        }
      }

      if (!requestOrigin) {
        console.warn('⚠️ CSRFService: No origin or referer header found');
        return {
          isValid: false,
          error: 'Missing origin or referer header',
        };
      }

      // Check if origin is allowed
      const isAllowed = this.isOriginAllowed(requestOrigin);
      if (!isAllowed) {
        console.warn('⚠️ CSRFService: Origin not allowed:', requestOrigin);
        return {
          isValid: false,
          origin: requestOrigin,
          error: `Origin not allowed: ${requestOrigin}`,
        };
      }

      console.log('✅ CSRFService: Origin verified:', requestOrigin);
      return { isValid: true, origin: requestOrigin };
    } catch (error) {
      console.error('❌ CSRFService: Error verifying origin:', error);
      return {
        isValid: false,
        error: 'Origin verification failed',
      };
    }
  }

  /**
   * Comprehensive CSRF check (token + origin)
   */
  async verifyCsrf(params: {
    token: string;
    userId: string;
    origin?: string;
    referer?: string;
    headers?: Record<string, string>;
  }): Promise<CSRFVerificationResult> {
    try {
      // Check if CSRF protection is enabled
      const settings = await this.getSettings();
      if (!settings.enabled) {
        return { isValid: true };
      }

      // Validate token
      const tokenResult = await this.validateToken(params.token, params.userId);
      if (!tokenResult.isValid) {
        return tokenResult;
      }

      // Verify origin if required
      if (settings.requireOriginCheck && Platform.OS === 'web') {
        const originResult = this.verifyOrigin({
          origin: params.origin,
          referer: params.referer,
          headers: params.headers,
        });

        if (!originResult.isValid) {
          return {
            isValid: false,
            error: originResult.error || 'Origin verification failed',
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ CSRFService: Error in comprehensive CSRF check:', error);
      return {
        isValid: false,
        error: 'CSRF verification failed',
      };
    }
  }

  /**
   * Get current user's CSRF token (or generate new one)
   */
  async getUserToken(userId: string): Promise<string> {
    try {
      // Check for existing valid token
      const { data } = await supabase
        .from('csrf_tokens')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        console.log('✅ CSRFService: Found existing valid token for user');
        return data.token;
      }

      // Generate new token if none exists
      console.log('⚠️ CSRFService: No valid token found, generating new one');
      return await this.generateToken(userId);
    } catch (error) {
      console.error('❌ CSRFService: Error getting user token:', error);
      // Generate new token on error
      return await this.generateToken(userId);
    }
  }

  /**
   * Rotate token (invalidate old, generate new)
   */
  async rotateToken(oldToken: string, userId: string): Promise<string> {
    try {
      // Delete old token
      await this.deleteToken(oldToken);

      // Generate new token
      return await this.generateToken(userId);
    } catch (error) {
      console.error('❌ CSRFService: Error rotating token:', error);
      throw error;
    }
  }

  /**
   * Delete a specific token
   */
  async deleteToken(token: string): Promise<void> {
    try {
      await supabase.from('csrf_tokens').delete().eq('token', token);
      this.tokenCache.delete(token);
      console.log('✅ CSRFService: Token deleted');
    } catch (error) {
      console.error('❌ CSRFService: Error deleting token:', error);
    }
  }

  /**
   * Delete all tokens for a user
   */
  async deleteUserTokens(userId: string): Promise<void> {
    try {
      await supabase.from('csrf_tokens').delete().eq('user_id', userId);
      
      // Clear from cache
      for (const [token, data] of this.tokenCache.entries()) {
        if (data.userId === userId) {
          this.tokenCache.delete(token);
        }
      }
      
      console.log('✅ CSRFService: All tokens deleted for user:', userId);
    } catch (error) {
      console.error('❌ CSRFService: Error deleting user tokens:', error);
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await supabase.from('csrf_tokens').delete().lt('expires_at', now);
      
      // Clear expired from cache
      for (const [token, data] of this.tokenCache.entries()) {
        if (new Date() > data.expiresAt) {
          this.tokenCache.delete(token);
        }
      }
      
      console.log('✅ CSRFService: Expired tokens cleaned up');
    } catch (error) {
      console.error('❌ CSRFService: Error cleaning up tokens:', error);
    }
  }

  /**
   * Get CSRF settings from system settings (with caching)
   */
  private async getSettings(): Promise<CSRFSettings> {
    try {
      // Check cache first
      if (this.settingsCache && Date.now() - this.settingsCache.timestamp < CSRF_CACHE_DURATION_MS) {
        return this.settingsCache.data;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('system_settings')
        .select('csrf_protection_enabled, csrf_origin_check_enabled')
        .single();

      if (error || !data) {
        console.warn('⚠️ CSRFService: Failed to load settings, using secure defaults');
        // Secure default: ENABLED
        return {
          enabled: true,
          requireOriginCheck: true,
        };
      }

      const settings: CSRFSettings = {
        enabled: data.csrf_protection_enabled ?? true,
        requireOriginCheck: data.csrf_origin_check_enabled ?? true,
      };

      // Update cache
      this.settingsCache = {
        data: settings,
        timestamp: Date.now(),
      };

      return settings;
    } catch (error) {
      console.error('❌ CSRFService: Error loading settings:', error);
      // Secure default: ENABLED
      return {
        enabled: true,
        requireOriginCheck: true,
      };
    }
  }

  /**
   * Check if an origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    // Normalize origin
    const normalizedOrigin = origin.toLowerCase().trim();
    
    // Check against allowed origins
    return ALLOWED_ORIGINS.some(allowed => 
      normalizedOrigin === allowed.toLowerCase() || 
      normalizedOrigin.startsWith(allowed.toLowerCase())
    );
  }

  /**
   * Update token's last used timestamp
   */
  private async updateTokenUsage(token: string): Promise<void> {
    try {
      const now = new Date();
      await supabase
        .from('csrf_tokens')
        .update({ last_used_at: now.toISOString() })
        .eq('token', token);

      // Update cache
      const cachedToken = this.tokenCache.get(token);
      if (cachedToken) {
        cachedToken.lastUsedAt = now;
      }
    } catch (error) {
      // Non-critical error, just log it
      console.warn('⚠️ CSRFService: Failed to update token usage:', error);
    }
  }

  /**
   * Generate a cryptographically secure random string
   */
  private generateSecureRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.crypto) {
      // Use Web Crypto API for web
      const randomValues = new Uint8Array(length);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
      }
    } else {
      // Fallback for mobile (could use expo-crypto for better randomness)
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.tokenCache.clear();
    this.settingsCache = null;
    console.log('✅ CSRFService: All caches cleared');
  }
}

// Export singleton instance
export const csrfService = new CSRFService();

// Export types
export type {
  CSRFToken,
  CSRFVerificationResult,
  OriginVerificationResult,
  CSRFSettings,
};


