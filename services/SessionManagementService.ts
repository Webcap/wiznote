/**
 * Session Management Service
 * 
 * Enhanced session tracking and management for WizNote
 * Tracks active sessions, enforces timeouts, implements remember me
 * 
 * @module SessionManagementService
 * @created October 2025
 */

import { supabase } from '../lib/supabase';
import { systemSettingsService } from './SystemSettingsService';
import { Platform } from 'react-native';

/**
 * User session information
 */
export interface UserSession {
  id: string;
  sessionId: string;
  userId: string;
  userEmail: string;
  deviceName?: string;
  deviceType?: string;
  platform?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  isRememberMe: boolean;
  terminatedAt?: Date;
  terminationReason?: string;
}

/**
 * Session statistics
 */
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  webSessions: number;
  mobileSessions: number;
  rememberMeSessions: number;
  uniqueUsers: number;
  avgSessionDurationMinutes: number;
}

/**
 * Session Management Service
 * Handles session tracking, timeouts, and remember me functionality
 */
class SessionManagementService {
  private static instance: SessionManagementService;
  private currentSessionId: string | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private readonly ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    console.log('[SessionManagementService] Service initialized');
    this.startActivityTracking();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService();
    }
    return SessionManagementService.instance;
  }

  /**
   * Start periodic activity tracking
   */
  private startActivityTracking(): void {
    // Clear any existing interval
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    // Update activity every 5 minutes for active sessions
    this.activityCheckInterval = setInterval(() => {
      this.updateCurrentSessionActivity();
    }, this.ACTIVITY_UPDATE_INTERVAL);
  }

  /**
   * Stop activity tracking (cleanup)
   */
  public stopActivityTracking(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): {
    deviceType: string;
    platform: string;
    browser?: string;
    os?: string;
    userAgent?: string;
  } {
    const deviceType = Platform.OS === 'web' ? 'web' : Platform.OS;
    const platform = Platform.OS;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return {
        deviceType: 'web',
        platform: 'web',
        browser: this.getBrowserName(navigator.userAgent),
        os: this.getOSName(navigator.userAgent),
        userAgent: navigator.userAgent,
      };
    }

    return {
      deviceType,
      platform,
      os: `${Platform.OS} ${Platform.Version}`,
    };
  }

  /**
   * Parse browser name from user agent
   */
  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Parse OS name from user agent
   */
  private getOSName(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Create or update session
   */
  public async createOrUpdateSession(
    userId: string,
    userEmail: string,
    sessionId: string,
    isRememberMe: boolean = false
  ): Promise<string | null> {
    try {
      const deviceInfo = this.getDeviceInfo();
      
      // Get session timeout from system settings
      const settings = await systemSettingsService.getSettings();
      const timeoutHours = settings.sessionTimeoutHours || 24;
      
      // Calculate expiry
      const expiresAt = new Date();
      if (isRememberMe) {
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for remember me
      } else {
        expiresAt.setHours(expiresAt.getHours() + timeoutHours);
      }

      console.log(`[SessionManagementService] Creating/updating session for ${userEmail}:`, {
        sessionId,
        deviceType: deviceInfo.deviceType,
        isRememberMe,
        expiresAt,
      });

      const { data, error } = await supabase.rpc('upsert_user_session', {
        p_user_id: userId,
        p_user_email: userEmail,
        p_session_id: sessionId,
        p_device_type: deviceInfo.deviceType,
        p_platform: deviceInfo.platform,
        p_browser: deviceInfo.browser || null,
        p_os: deviceInfo.os || null,
        p_user_agent: deviceInfo.userAgent || null,
        p_expires_at: expiresAt.toISOString(),
        p_is_remember_me: isRememberMe,
        p_metadata: {
          created_via: 'SessionManagementService',
          platform_version: Platform.Version,
        },
      });

      if (error) {
        console.error('[SessionManagementService] Error creating/updating session:', error);
        return null;
      }

      // Store current session ID for activity updates
      this.currentSessionId = sessionId;

      console.log(`[SessionManagementService] ✅ Session created/updated: ${data}`);
      return data as string;
    } catch (error) {
      console.error('[SessionManagementService] Error in createOrUpdateSession:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  public async updateSessionActivity(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_session_activity', {
        p_session_id: sessionId,
        p_user_id: userId,
      });

      if (error) {
        console.error('[SessionManagementService] Error updating session activity:', error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error('[SessionManagementService] Error in updateSessionActivity:', error);
      return false;
    }
  }

  /**
   * Update current session activity (called periodically)
   */
  private async updateCurrentSessionActivity(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await this.updateSessionActivity(this.currentSessionId, session.user.id);
      }
    } catch (error) {
      console.error('[SessionManagementService] Error updating current session activity:', error);
    }
  }

  /**
   * Terminate a session
   */
  public async terminateSession(
    sessionId: string,
    userId: string,
    reason: 'logout' | 'timeout' | 'password_changed' | 'admin_revoke' | 'force_logout' = 'logout'
  ): Promise<boolean> {
    try {
      console.log(`[SessionManagementService] Terminating session ${sessionId} (reason: ${reason})`);

      const { data, error } = await supabase.rpc('terminate_session', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_reason: reason,
      });

      if (error) {
        console.error('[SessionManagementService] Error terminating session:', error);
        return false;
      }

      // Clear current session if it matches
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }

      console.log('[SessionManagementService] ✅ Session terminated successfully');
      return data as boolean;
    } catch (error) {
      console.error('[SessionManagementService] Error in terminateSession:', error);
      return false;
    }
  }

  /**
   * Terminate all sessions for a user
   */
  public async terminateAllUserSessions(
    userId: string,
    reason: 'password_changed' | 'admin_revoke' | 'force_logout' = 'force_logout',
    adminId?: string
  ): Promise<number> {
    try {
      console.log(`[SessionManagementService] Terminating all sessions for user ${userId} (reason: ${reason})`);

      const { data, error } = await supabase.rpc('terminate_all_user_sessions', {
        p_user_id: userId,
        p_reason: reason,
        p_terminated_by_admin_id: adminId || null,
      });

      if (error) {
        console.error('[SessionManagementService] Error terminating all sessions:', error);
        return 0;
      }

      const count = data && data.length > 0 ? parseInt(data[0].terminated_count) || 0 : 0;
      console.log(`[SessionManagementService] ✅ Terminated ${count} session(s)`);
      
      // Clear current session if user matches
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === userId) {
        this.currentSessionId = null;
      }

      return count;
    } catch (error) {
      console.error('[SessionManagementService] Error in terminateAllUserSessions:', error);
      return 0;
    }
  }

  /**
   * Get active sessions for a user
   */
  public async getActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_sessions', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[SessionManagementService] Error getting active sessions:', error);
        return [];
      }

      return (data || []).map((session: any) => ({
        id: session.id,
        sessionId: session.session_id,
        userId,
        userEmail: '', // Not returned by function
        deviceName: session.device_name,
        deviceType: session.device_type,
        platform: session.platform,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        lastActivityAt: new Date(session.last_activity_at),
        createdAt: new Date(session.created_at),
        expiresAt: new Date(session.expires_at),
        isActive: true,
        isRememberMe: session.is_remember_me,
      }));
    } catch (error) {
      console.error('[SessionManagementService] Error in getActiveSessions:', error);
      return [];
    }
  }

  /**
   * Check if session is expired
   */
  public async isSessionExpired(sessionId: string, userId: string): Promise<boolean> {
    try {
      const sessions = await this.getActiveSessions(userId);
      const session = sessions.find(s => s.sessionId === sessionId);
      
      if (!session) {
        console.log('[SessionManagementService] Session not found or inactive');
        return true; // Consider not found as expired
      }

      const isExpired = session.expiresAt <= new Date();
      
      if (isExpired) {
        console.log('[SessionManagementService] Session expired:', {
          sessionId,
          expiresAt: session.expiresAt,
        });
        
        // Terminate the expired session
        await this.terminateSession(sessionId, userId, 'timeout');
      }

      return isExpired;
    } catch (error) {
      console.error('[SessionManagementService] Error checking session expiry:', error);
      return false; // Fail open - don't expire on error
    }
  }

  /**
   * Cleanup expired sessions
   */
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      console.log('[SessionManagementService] Running cleanup for expired sessions...');

      const { data, error } = await supabase.rpc('cleanup_expired_sessions');

      if (error) {
        console.error('[SessionManagementService] Error cleaning up expired sessions:', error);
        return 0;
      }

      const count = data && data.length > 0 ? parseInt(data[0].terminated_count) || 0 : 0;
      
      if (count > 0) {
        console.log(`[SessionManagementService] ✅ Cleaned up ${count} expired session(s)`);
      } else {
        console.log('[SessionManagementService] No expired sessions to cleanup');
      }

      return count;
    } catch (error) {
      console.error('[SessionManagementService] Error in cleanupExpiredSessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(timeWindowHours: number = 24): Promise<SessionStats> {
    try {
      const { data, error } = await supabase.rpc('get_session_stats', {
        p_time_window_hours: timeWindowHours,
      });

      if (error) {
        console.error('[SessionManagementService] Error getting session stats:', error);
        return {
          totalSessions: 0,
          activeSessions: 0,
          webSessions: 0,
          mobileSessions: 0,
          rememberMeSessions: 0,
          uniqueUsers: 0,
          avgSessionDurationMinutes: 0,
        };
      }

      const result = data && data.length > 0 ? data[0] : null;

      return {
        totalSessions: parseInt(result?.total_sessions) || 0,
        activeSessions: parseInt(result?.active_sessions) || 0,
        webSessions: parseInt(result?.web_sessions) || 0,
        mobileSessions: parseInt(result?.mobile_sessions) || 0,
        rememberMeSessions: parseInt(result?.remember_me_sessions) || 0,
        uniqueUsers: parseInt(result?.unique_users) || 0,
        avgSessionDurationMinutes: parseFloat(result?.avg_session_duration_minutes) || 0,
      };
    } catch (error) {
      console.error('[SessionManagementService] Error in getSessionStats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        webSessions: 0,
        mobileSessions: 0,
        rememberMeSessions: 0,
        uniqueUsers: 0,
        avgSessionDurationMinutes: 0,
      };
    }
  }

  /**
   * Clean up old session records
   */
  public async cleanupOldSessions(retentionDays: number = 90): Promise<number> {
    try {
      console.log(`[SessionManagementService] Cleaning up sessions older than ${retentionDays} days...`);

      const { data, error } = await supabase.rpc('cleanup_old_sessions', {
        p_retention_days: retentionDays,
      });

      if (error) {
        console.error('[SessionManagementService] Error cleaning up old sessions:', error);
        return 0;
      }

      const count = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
      console.log(`[SessionManagementService] ✅ Cleaned up ${count} old session(s)`);
      return count;
    } catch (error) {
      console.error('[SessionManagementService] Error in cleanupOldSessions:', error);
      return 0;
    }
  }

  /**
   * Format session info for display
   */
  public formatSessionInfo(session: UserSession): string {
    const deviceInfo = [
      session.browser,
      session.os,
      session.deviceType,
    ].filter(Boolean).join(' • ');

    const lastActivity = this.formatTimeAgo(session.lastActivityAt);

    return `${deviceInfo} • Last active: ${lastActivity}`;
  }

  /**
   * Format time ago (e.g., "5 minutes ago")
   */
  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  /**
   * Get session timeout in milliseconds
   */
  public async getSessionTimeoutMs(): Promise<number> {
    try {
      const settings = await systemSettingsService.getSettings();
      const timeoutHours = settings.sessionTimeoutHours || 24;
      return timeoutHours * 60 * 60 * 1000;
    } catch (error) {
      console.error('[SessionManagementService] Error getting session timeout:', error);
      return 24 * 60 * 60 * 1000; // Default: 24 hours
    }
  }

  /**
   * Cleanup on service destruction
   */
  public destroy(): void {
    this.stopActivityTracking();
    this.currentSessionId = null;
  }
}

// Export singleton instance
export const sessionManagementService = SessionManagementService.getInstance();

