/**
 * Account Lockout Service
 * 
 * Prevents brute force attacks by locking accounts after too many failed login attempts
 * Integrates with system settings for configurable thresholds and durations
 * 
 * @module AccountLockoutService
 * @created October 2025
 */

import { supabase } from '../lib/supabase';
import { systemSettingsService } from './SystemSettingsService';

/**
 * Lockout status information
 */
export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  lockReason: string | null;
  failedAttempts: number;
  remainingMinutes?: number;
}

/**
 * Lockout history entry
 */
export interface LockoutHistoryEntry {
  id: string;
  lockedAt: Date;
  lockedUntil: Date;
  unlockedAt: Date | null;
  isLocked: boolean;
  lockReason: string;
  failedAttempts: number;
  unlockMethod: string | null;
}

/**
 * Lockout statistics
 */
export interface LockoutStats {
  totalLockouts: number;
  activeLockouts: number;
  autoUnlocked: number;
  adminUnlocked: number;
  uniqueUsers: number;
}

/**
 * Account Lockout Service
 * Manages account lockouts for security
 */
class AccountLockoutService {
  private static instance: AccountLockoutService;
  private enabled: boolean = true;
  private cache: Map<string, { status: LockoutStatus; timestamp: number }> = new Map();
  private cacheDuration: number = 60 * 1000; // 1 minute

  private constructor() {
    console.log('[AccountLockoutService] Service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AccountLockoutService {
    if (!AccountLockoutService.instance) {
      AccountLockoutService.instance = new AccountLockoutService();
    }
    return AccountLockoutService.instance;
  }

  /**
   * Enable or disable account lockout
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[AccountLockoutService] Lockout ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear cache
   */
  public clearCache(userEmail?: string): void {
    if (userEmail) {
      this.cache.delete(userEmail.toLowerCase());
      console.log(`[AccountLockoutService] Cache cleared for ${userEmail}`);
    } else {
      this.cache.clear();
      console.log('[AccountLockoutService] All cache cleared');
    }
  }

  /**
   * Check if account is locked
   */
  public async isAccountLocked(userEmail: string): Promise<LockoutStatus> {
    try {
      const email = userEmail.toLowerCase();

      // Check if lockout is enabled via system settings
      const lockoutEnabled = await systemSettingsService.isAccountLockoutEnabled();
      if (!lockoutEnabled || !this.enabled) {
        console.log('[AccountLockoutService] Lockout disabled, returning unlocked status');
        return {
          isLocked: false,
          lockedUntil: null,
          lockReason: null,
          failedAttempts: 0,
        };
      }

      // Check cache first
      const cached = this.cache.get(email);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log(`[AccountLockoutService] Cache hit for ${email}`);
        return cached.status;
      }

      // Query database
      const { data, error } = await supabase.rpc('is_account_locked', {
        p_user_email: email,
      });

      if (error) {
        console.error('[AccountLockoutService] Error checking lockout status:', error);
        // Fail open - don't lock account if we can't check status
        return {
          isLocked: false,
          lockedUntil: null,
          lockReason: null,
          failedAttempts: 0,
        };
      }

      // Parse result
      const result = data && data.length > 0 ? data[0] : null;
      
      const status: LockoutStatus = {
        isLocked: result?.is_locked || false,
        lockedUntil: result?.locked_until ? new Date(result.locked_until) : null,
        lockReason: result?.lock_reason || null,
        failedAttempts: result?.failed_attempts || 0,
      };

      // Calculate remaining minutes if locked
      if (status.isLocked && status.lockedUntil) {
        const remainingMs = status.lockedUntil.getTime() - Date.now();
        status.remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      }

      // Cache the result
      this.cache.set(email, { status, timestamp: Date.now() });

      console.log(`[AccountLockoutService] Account ${email} lockout status:`, status.isLocked ? 'LOCKED' : 'unlocked');
      return status;
    } catch (error) {
      console.error('[AccountLockoutService] Error checking account lock:', error);
      // Fail open - don't lock account on error
      return {
        isLocked: false,
        lockedUntil: null,
        lockReason: null,
        failedAttempts: 0,
      };
    }
  }

  /**
   * Lock an account
   */
  public async lockAccount(
    userId: string,
    userEmail: string,
    options: {
      failedAttempts?: number;
      lockReason?: string;
      durationMinutes?: number;
      lockedBy?: 'system' | 'admin' | 'security_rule';
      lockedByAdminId?: string;
      ipAddresses?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string | null> {
    try {
      const email = userEmail.toLowerCase();

      // Get lockout configuration from system settings
      const settings = await systemSettingsService.getSettings();
      const durationMinutes = options.durationMinutes || settings.accountLockoutDurationMinutes || 30;
      const maxAttempts = settings.accountLockoutAttempts || 5;

      console.log(`[AccountLockoutService] Locking account ${email}:`, {
        failedAttempts: options.failedAttempts || maxAttempts,
        duration: durationMinutes,
        reason: options.lockReason || 'too_many_failed_attempts',
      });

      const { data, error } = await supabase.rpc('lock_account', {
        p_user_id: userId,
        p_user_email: email,
        p_duration_minutes: durationMinutes,
        p_failed_attempts: options.failedAttempts || maxAttempts,
        p_lock_reason: options.lockReason || 'too_many_failed_attempts',
        p_locked_by: options.lockedBy || 'system',
        p_locked_by_admin_id: options.lockedByAdminId || null,
        p_ip_addresses: options.ipAddresses || null,
        p_metadata: options.metadata || {},
      });

      if (error) {
        console.error('[AccountLockoutService] Error locking account:', error);
        return null;
      }

      // Clear cache for this user
      this.clearCache(email);

      console.log(`[AccountLockoutService] ✅ Account ${email} locked successfully. Lockout ID: ${data}`);
      return data as string;
    } catch (error) {
      console.error('[AccountLockoutService] Error locking account:', error);
      return null;
    }
  }

  /**
   * Unlock an account
   */
  public async unlockAccount(
    userEmail: string,
    options: {
      unlockMethod?: 'admin' | 'email' | 'auto';
      unlockedByAdminId?: string;
    } = {}
  ): Promise<boolean> {
    try {
      const email = userEmail.toLowerCase();

      console.log(`[AccountLockoutService] Unlocking account ${email} via ${options.unlockMethod || 'admin'}`);

      const { data, error } = await supabase.rpc('unlock_account', {
        p_user_email: email,
        p_unlock_method: options.unlockMethod || 'admin',
        p_unlocked_by_admin_id: options.unlockedByAdminId || null,
      });

      if (error) {
        console.error('[AccountLockoutService] Error unlocking account:', error);
        return false;
      }

      // Clear cache for this user
      this.clearCache(email);

      const success = data as boolean;
      console.log(`[AccountLockoutService] ${success ? '✅ Account unlocked' : '⚠️ No active lockout found'} for ${email}`);
      return success;
    } catch (error) {
      console.error('[AccountLockoutService] Error unlocking account:', error);
      return false;
    }
  }

  /**
   * Auto-unlock expired lockouts
   */
  public async autoUnlockExpired(): Promise<number> {
    try {
      console.log('[AccountLockoutService] Running auto-unlock for expired lockouts...');

      const { data, error } = await supabase.rpc('auto_unlock_expired_lockouts');

      if (error) {
        console.error('[AccountLockoutService] Error auto-unlocking:', error);
        return 0;
      }

      const count = data && data.length > 0 ? parseInt(data[0].unlocked_count) || 0 : 0;
      
      if (count > 0) {
        console.log(`[AccountLockoutService] ✅ Auto-unlocked ${count} expired lockout(s)`);
        // Clear all cache since we don't know which users were unlocked
        this.clearCache();
      } else {
        console.log('[AccountLockoutService] No expired lockouts to unlock');
      }

      return count;
    } catch (error) {
      console.error('[AccountLockoutService] Error in auto-unlock:', error);
      return 0;
    }
  }

  /**
   * Get lockout history for a user
   */
  public async getLockoutHistory(
    userEmail: string,
    limit: number = 10
  ): Promise<LockoutHistoryEntry[]> {
    try {
      const email = userEmail.toLowerCase();

      const { data, error } = await supabase.rpc('get_lockout_history', {
        p_user_email: email,
        p_limit: limit,
      });

      if (error) {
        console.error('[AccountLockoutService] Error getting lockout history:', error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        lockedAt: new Date(entry.locked_at),
        lockedUntil: new Date(entry.locked_until),
        unlockedAt: entry.unlocked_at ? new Date(entry.unlocked_at) : null,
        isLocked: entry.is_locked,
        lockReason: entry.lock_reason,
        failedAttempts: entry.failed_attempts,
        unlockMethod: entry.unlock_method,
      }));
    } catch (error) {
      console.error('[AccountLockoutService] Error getting lockout history:', error);
      return [];
    }
  }

  /**
   * Get lockout statistics
   */
  public async getLockoutStats(timeWindowHours: number = 24): Promise<LockoutStats> {
    try {
      const { data, error } = await supabase.rpc('get_lockout_stats', {
        p_time_window_hours: timeWindowHours,
      });

      if (error) {
        console.error('[AccountLockoutService] Error getting lockout stats:', error);
        return {
          totalLockouts: 0,
          activeLockouts: 0,
          autoUnlocked: 0,
          adminUnlocked: 0,
          uniqueUsers: 0,
        };
      }

      const result = data && data.length > 0 ? data[0] : null;

      return {
        totalLockouts: parseInt(result?.total_lockouts) || 0,
        activeLockouts: parseInt(result?.active_lockouts) || 0,
        autoUnlocked: parseInt(result?.auto_unlocked) || 0,
        adminUnlocked: parseInt(result?.admin_unlocked) || 0,
        uniqueUsers: parseInt(result?.unique_users) || 0,
      };
    } catch (error) {
      console.error('[AccountLockoutService] Error getting lockout stats:', error);
      return {
        totalLockouts: 0,
        activeLockouts: 0,
        autoUnlocked: 0,
        adminUnlocked: 0,
        uniqueUsers: 0,
      };
    }
  }

  /**
   * Clean up old lockout records
   */
  public async cleanupOldLockouts(retentionDays: number = 90): Promise<number> {
    try {
      console.log(`[AccountLockoutService] Cleaning up lockouts older than ${retentionDays} days...`);

      const { data, error } = await supabase.rpc('cleanup_old_lockouts', {
        p_retention_days: retentionDays,
      });

      if (error) {
        console.error('[AccountLockoutService] Error cleaning up old lockouts:', error);
        return 0;
      }

      const count = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
      console.log(`[AccountLockoutService] ✅ Cleaned up ${count} old lockout record(s)`);
      return count;
    } catch (error) {
      console.error('[AccountLockoutService] Error cleaning up old lockouts:', error);
      return 0;
    }
  }

  /**
   * Format lockout error message for users
   */
  public formatLockoutMessage(status: LockoutStatus): string {
    if (!status.isLocked) {
      return '';
    }

    const minutes = status.remainingMinutes || 0;
    const timeStr = minutes === 1 ? '1 minute' : `${minutes} minutes`;

    return `Account temporarily locked due to multiple failed login attempts. Please try again in ${timeStr}, or contact support for assistance.`;
  }

  /**
   * Should account be locked? (Check failed attempts)
   * This integrates with security logging to count recent failures
   */
  public async shouldLockAccount(userEmail: string): Promise<boolean> {
    try {
      // Check if lockout is enabled
      const lockoutEnabled = await systemSettingsService.isAccountLockoutEnabled();
      if (!lockoutEnabled || !this.enabled) {
        return false;
      }

      // Get lockout configuration
      const settings = await systemSettingsService.getSettings();
      const maxAttempts = settings.accountLockoutAttempts || 5;
      const timeWindowMinutes = 15; // Look back 15 minutes

      // Import security logging to check failed attempts
      const { getRecentFailedLogins } = await import('../lib/auth');
      const failedLogins = await getRecentFailedLogins(userEmail, timeWindowMinutes);

      console.log(`[AccountLockoutService] Failed login check for ${userEmail}:`, {
        attemptCount: failedLogins.attemptCount,
        maxAttempts,
        shouldLock: failedLogins.attemptCount >= maxAttempts,
      });

      return failedLogins.attemptCount >= maxAttempts;
    } catch (error) {
      console.error('[AccountLockoutService] Error checking if should lock:', error);
      return false;
    }
  }
}

// Export singleton instance
export const accountLockoutService = AccountLockoutService.getInstance();

