import { supabase } from '../lib/supabase';
import { systemSettingsService } from './SystemSettingsService';

/**
 * Rate Limit Service
 * 
 * Enforces rate limiting for authentication and API requests based on system settings.
 * Rate limiting can be enabled/disabled dynamically via admin settings.
 */

export interface RateLimitAttempt {
  id: string;
  identifier: string;
  attemptType: 'auth_signin' | 'auth_signup' | 'api_request';
  endpoint?: string;
  attemptedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitCheck {
  allowed: boolean;
  isLimited: boolean;
  attemptCount: number;
  maxAttempts: number;
  windowMinutes: number;
  windowStart: Date;
  windowEnd: Date;
  retryAfterSeconds?: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  maxAttempts: number;
  windowMinutes: number;
}

class RateLimitService {
  private static instance: RateLimitService;

  private constructor() {}

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if a rate limit has been exceeded for authentication attempts
   * @param identifier - Email address for auth attempts
   * @param attemptType - Type of attempt (auth_signin, auth_signup)
   * @returns RateLimitCheck with allowance status
   */
  async checkAuthRateLimit(
    identifier: string,
    attemptType: 'auth_signin' | 'auth_signup'
  ): Promise<RateLimitCheck> {
    try {
      // Get rate limit configuration from system settings
      const config = await systemSettingsService.getAuthRateLimitConfig();

      // If rate limiting is disabled, allow the request
      if (!config.enabled) {
        return {
          allowed: true,
          isLimited: false,
          attemptCount: 0,
          maxAttempts: config.attempts,
          windowMinutes: config.windowMinutes,
          windowStart: new Date(),
          windowEnd: new Date(),
        };
      }

      // Check rate limit using database function
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_attempt_type: attemptType,
        p_max_attempts: config.attempts,
        p_window_minutes: config.windowMinutes,
      });

      if (error) {
        console.error('RateLimitService: Error checking rate limit:', error);
        // On error, allow the request (fail open for availability)
        return {
          allowed: true,
          isLimited: false,
          attemptCount: 0,
          maxAttempts: config.attempts,
          windowMinutes: config.windowMinutes,
          windowStart: new Date(),
          windowEnd: new Date(),
        };
      }

      const result = data?.[0] || data;
      const isLimited = result.is_limited || false;
      const attemptCount = result.attempt_count || 0;

      // Calculate retry after seconds
      let retryAfterSeconds: number | undefined;
      if (isLimited) {
        const windowStart = new Date(result.window_start);
        const windowEnd = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);
        retryAfterSeconds = Math.ceil((windowEnd.getTime() - Date.now()) / 1000);
      }

      return {
        allowed: !isLimited,
        isLimited,
        attemptCount,
        maxAttempts: config.attempts,
        windowMinutes: config.windowMinutes,
        windowStart: new Date(result.window_start),
        windowEnd: new Date(result.window_end),
        retryAfterSeconds,
      };
    } catch (error) {
      console.error('RateLimitService: Unexpected error in checkAuthRateLimit:', error);
      // Fail open on unexpected errors
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

  /**
   * Record a rate limit attempt
   * @param params - Attempt details
   * @returns Attempt ID
   */
  async recordAttempt(params: {
    identifier: string;
    attemptType: 'auth_signin' | 'auth_signup' | 'api_request';
    endpoint?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    try {
      // Only record if rate limiting is enabled
      const config = await systemSettingsService.getAuthRateLimitConfig();
      if (!config.enabled) {
        return null; // Don't record if rate limiting is disabled
      }

      const { data, error } = await supabase.rpc('record_rate_limit_attempt', {
        p_identifier: params.identifier,
        p_attempt_type: params.attemptType,
        p_endpoint: params.endpoint || null,
        p_ip_address: params.ipAddress || null,
        p_user_agent: params.userAgent || null,
        p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      });

      if (error) {
        console.error('RateLimitService: Error recording attempt:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('RateLimitService: Unexpected error in recordAttempt:', error);
      return null;
    }
  }

  /**
   * Check and record an authentication attempt
   * This is the main method to use before allowing auth operations
   * @param identifier - Email address
   * @param attemptType - Type of auth attempt
   * @param metadata - Additional context
   * @returns RateLimitCheck
   */
  async checkAndRecordAuthAttempt(
    identifier: string,
    attemptType: 'auth_signin' | 'auth_signup',
    metadata?: Record<string, any>
  ): Promise<RateLimitCheck> {
    // Check if rate limit is exceeded
    const rateLimitCheck = await this.checkAuthRateLimit(identifier, attemptType);

    // Record the attempt (even if rate limited, for tracking)
    await this.recordAttempt({
      identifier,
      attemptType,
      metadata: {
        ...metadata,
        rateLimited: rateLimitCheck.isLimited,
      },
    });

    return rateLimitCheck;
  }

  /**
   * Get rate limit attempts for a specific identifier (admin only)
   * @param identifier - Email or IP to check
   * @param limit - Max number of records to return
   * @returns List of attempts
   */
  async getAttempts(
    identifier: string,
    limit: number = 100
  ): Promise<RateLimitAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_attempts')
        .select('*')
        .eq('identifier', identifier)
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('RateLimitService: Error fetching attempts:', error);
        return [];
      }

      return (data || []).map(attempt => ({
        id: attempt.id,
        identifier: attempt.identifier,
        attemptType: attempt.attempt_type,
        endpoint: attempt.endpoint,
        attemptedAt: new Date(attempt.attempted_at),
        ipAddress: attempt.ip_address,
        userAgent: attempt.user_agent,
        metadata: attempt.metadata,
      }));
    } catch (error) {
      console.error('RateLimitService: Error in getAttempts:', error);
      return [];
    }
  }

  /**
   * Get recent failed authentication attempts (admin dashboard)
   * @param limit - Max number of records
   * @returns Recent attempts
   */
  async getRecentAuthAttempts(limit: number = 50): Promise<RateLimitAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_attempts')
        .select('*')
        .in('attempt_type', ['auth_signin', 'auth_signup'])
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('RateLimitService: Error fetching recent attempts:', error);
        return [];
      }

      return (data || []).map(attempt => ({
        id: attempt.id,
        identifier: attempt.identifier,
        attemptType: attempt.attempt_type,
        endpoint: attempt.endpoint,
        attemptedAt: new Date(attempt.attempted_at),
        ipAddress: attempt.ip_address,
        userAgent: attempt.user_agent,
        metadata: attempt.metadata,
      }));
    } catch (error) {
      console.error('RateLimitService: Error in getRecentAuthAttempts:', error);
      return [];
    }
  }

  /**
   * Cleanup old rate limit attempts (maintenance)
   * @param daysToKeep - Number of days to keep
   * @returns Number of deleted records
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_rate_limit_attempts', {
        p_days_to_keep: daysToKeep,
      });

      if (error) {
        console.error('RateLimitService: Error cleaning up attempts:', error);
        return 0;
      }

      const deletedCount = data as number;
      console.log(`RateLimitService: Cleaned up ${deletedCount} old attempts`);
      return deletedCount;
    } catch (error) {
      console.error('RateLimitService: Error in cleanupOldAttempts:', error);
      return 0;
    }
  }

  /**
   * Helper: Format rate limit error message for users
   * @param rateLimitCheck - Rate limit check result
   * @returns User-friendly error message
   */
  formatRateLimitError(rateLimitCheck: RateLimitCheck): string {
    const { attemptCount, maxAttempts, retryAfterSeconds } = rateLimitCheck;
    
    const retryMessage = retryAfterSeconds
      ? ` Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
      : ' Please try again later.';

    return `Too many attempts. You've made ${attemptCount} attempts (limit: ${maxAttempts}).${retryMessage}`;
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();

