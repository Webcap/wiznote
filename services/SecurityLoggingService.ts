/**
 * Security Logging Service
 * 
 * Comprehensive security event logging system for WizNote
 * Tracks authentication, admin actions, data access, and suspicious activities
 * 
 * @module SecurityLoggingService
 * @created October 2025
 */

import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

/**
 * Security event types
 */
export type SecurityEventType =
  // Authentication events
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.signup.success'
  | 'auth.signup.failure'
  | 'auth.password_reset.request'
  | 'auth.password_reset.success'
  | 'auth.password_reset.failure'
  | 'auth.email_verification.success'
  | 'auth.email_verification.failure'
  | 'auth.mfa.enabled'
  | 'auth.mfa.disabled'
  | 'auth.mfa.success'
  | 'auth.mfa.failure'
  | 'auth.session.expired'
  | 'auth.session.revoked'
  // Account security events
  | 'account.lockout'
  | 'account.unlock'
  | 'account.deleted'
  | 'account.suspended'
  | 'account.reactivated'
  // Admin & privilege events
  | 'admin.role.granted'
  | 'admin.role.revoked'
  | 'admin.action.user_management'
  | 'admin.action.system_settings'
  | 'admin.action.premium_grant'
  | 'admin.action.support_ticket'
  | 'admin.privilege.escalation'
  // Data access events
  | 'data.note.created'
  | 'data.note.updated'
  | 'data.note.deleted'
  | 'data.note.shared'
  | 'data.note.accessed'
  | 'data.export.requested'
  | 'data.export.completed'
  // API & security events
  | 'api.rate_limit.exceeded'
  | 'api.rate_limit.warning'
  | 'api.error.unauthorized'
  | 'api.error.forbidden'
  | 'api.error.server'
  | 'csrf.validation.success'
  | 'csrf.validation.failure'
  | 'csrf.token.generated'
  | 'csrf.token.expired'
  // Suspicious activity
  | 'security.suspicious.multiple_failed_logins'
  | 'security.suspicious.unusual_location'
  | 'security.suspicious.unusual_time'
  | 'security.suspicious.sql_injection_attempt'
  | 'security.suspicious.xss_attempt'
  | 'security.suspicious.path_traversal_attempt'
  // System events
  | 'system.settings.updated'
  | 'system.backup.created'
  | 'system.maintenance.started'
  | 'system.maintenance.completed';

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Security event log entry
 */
export interface SecurityEventLog {
  id?: string;
  created_at?: Date;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  target_user_id?: string;
  target_user_email?: string;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  event_data?: Record<string, any>;
  error_message?: string;
  location_country?: string;
  location_city?: string;
  success?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Context information for security events
 */
export interface SecurityEventContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  platform?: string;
  appVersion?: string;
}

/**
 * Security Logging Service
 * Provides comprehensive security event logging
 */
class SecurityLoggingService {
  private static instance: SecurityLoggingService;
  private enabled: boolean = true;
  private logQueue: SecurityEventLog[] = [];
  private isProcessingQueue: boolean = false;

  private constructor() {
    if (__DEV__) {
      console.log('[SecurityLoggingService] Service initialized');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SecurityLoggingService {
    if (!SecurityLoggingService.instance) {
      SecurityLoggingService.instance = new SecurityLoggingService();
    }
    return SecurityLoggingService.instance;
  }

  /**
   * Enable or disable security logging
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[SecurityLoggingService] Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current IP address from request (web only)
   */
  private async getIpAddress(): Promise<string | undefined> {
    if (Platform.OS !== 'web') return undefined;

    try {
      // Try multiple IP detection services with timeout
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipapi.co/json/',
      ];

      for (const service of ipServices) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

          const response = await fetch(service, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            // Different services use different field names
            const ip = data.ip || data.ipAddress || data.query;
            if (ip) {
              console.log(`[SecurityLoggingService] IP address detected: ${ip}`);
              return ip;
            }
          }
        } catch (serviceError) {
          // Try next service
          continue;
        }
      }

      console.warn('[SecurityLoggingService] All IP detection services failed');
      return undefined;
    } catch (error) {
      console.warn('[SecurityLoggingService] Failed to get IP address:', error);
      return undefined;
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string | undefined {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return `${Platform.OS}/${Platform.Version}`;
  }

  /**
   * Get request context (web only)
   */
  private getRequestContext(): { path?: string; method?: string } {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        path: window.location.pathname,
        method: 'GET', // Default, would be overridden by actual request method
      };
    }
    return {};
  }

  /**
   * Log a security event
   */
  public async logEvent(
    eventType: SecurityEventType,
    options: {
      severity?: SecurityEventSeverity;
      success?: boolean;
      context?: SecurityEventContext;
      eventData?: Record<string, any>;
      errorMessage?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string | null> {
    if (!this.enabled) {
      console.log('[SecurityLoggingService] Logging disabled, skipping event:', eventType);
      return null;
    }

    try {
      const {
        severity = 'info',
        success = true,
        context = {},
        eventData = {},
        errorMessage,
        metadata = {},
      } = options;

      // Get request context
      const requestContext = this.getRequestContext();
      const userAgent = this.getUserAgent();

      // Try to get IP address BEFORE building log entry (if not provided)
      let ipAddress = context.ipAddress;
      if (!ipAddress && Platform.OS === 'web') {
        try {
          ipAddress = await this.getIpAddress();
        } catch (error) {
          console.warn('[SecurityLoggingService] Failed to fetch IP address, continuing without it');
        }
      }

      // Build event log entry
      const logEntry: SecurityEventLog = {
        event_type: eventType,
        severity,
        success,
        user_id: context.userId,
        user_email: context.userEmail,
        user_role: context.userRole,
        target_user_id: context.targetUserId,
        target_user_email: context.targetUserEmail,
        ip_address: ipAddress,
        user_agent: context.userAgent || userAgent,
        request_path: context.requestPath || requestContext.path,
        request_method: context.requestMethod || requestContext.method,
        event_data: {
          ...eventData,
          platform: context.platform || Platform.OS,
          app_version: context.appVersion,
        },
        error_message: errorMessage,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      // Log using database function
      const { data, error } = await supabase.rpc('log_security_event', {
        p_event_type: logEntry.event_type,
        p_severity: logEntry.severity,
        p_user_id: logEntry.user_id || null,
        p_user_email: logEntry.user_email || null,
        p_user_role: logEntry.user_role || null,
        p_target_user_id: logEntry.target_user_id || null,
        p_target_user_email: logEntry.target_user_email || null,
        p_ip_address: logEntry.ip_address || null,
        p_user_agent: logEntry.user_agent || null,
        p_request_path: logEntry.request_path || null,
        p_request_method: logEntry.request_method || null,
        p_event_data: logEntry.event_data || {},
        p_error_message: logEntry.error_message || null,
        p_success: logEntry.success,
        p_metadata: logEntry.metadata || {},
      });

      if (error) {
        console.error('[SecurityLoggingService] Failed to log security event:', error);
        // Queue for retry
        this.queueEvent(logEntry);
        return null;
      }

      console.log(`[SecurityLoggingService] ✅ Logged event: ${eventType} (severity: ${severity})`);
      return data as string;
    } catch (error) {
      console.error('[SecurityLoggingService] Error logging security event:', error);
      return null;
    }
  }

  /**
   * Queue event for retry if logging fails
   */
  private queueEvent(event: SecurityEventLog): void {
    this.logQueue.push(event);
    console.log(`[SecurityLoggingService] Event queued for retry. Queue size: ${this.logQueue.length}`);

    // Process queue asynchronously
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.logQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.logQueue.length > 0) {
      const event = this.logQueue.shift();
      if (!event) continue;

      try {
        await this.logEvent(event.event_type, {
          severity: event.severity,
          success: event.success,
          context: {
            userId: event.user_id,
            userEmail: event.user_email,
            userRole: event.user_role,
            targetUserId: event.target_user_id,
            targetUserEmail: event.target_user_email,
            ipAddress: event.ip_address,
            userAgent: event.user_agent,
            requestPath: event.request_path,
            requestMethod: event.request_method,
          },
          eventData: event.event_data,
          errorMessage: event.error_message,
          metadata: event.metadata,
        });

        // Wait a bit between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[SecurityLoggingService] Failed to process queued event:', error);
        // Don't re-queue to avoid infinite loops
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Log authentication event
   */
  public async logAuthEvent(
    eventType: Extract<SecurityEventType, `auth.${string}`>,
    userId: string | undefined,
    userEmail: string,
    success: boolean,
    errorMessage?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const severity: SecurityEventSeverity = success ? 'info' : 'warning';

    await this.logEvent(eventType, {
      severity,
      success,
      context: {
        userId,
        userEmail,
      },
      eventData: additionalData,
      errorMessage,
    });
  }

  /**
   * Log admin action
   */
  public async logAdminAction(
    action: Extract<SecurityEventType, `admin.${string}`>,
    adminUserId: string,
    adminEmail: string,
    targetUserId?: string,
    targetUserEmail?: string,
    actionDetails?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(action, {
      severity: 'warning', // Admin actions are always logged as warning for visibility
      success: true,
      context: {
        userId: adminUserId,
        userEmail: adminEmail,
        userRole: 'admin',
        targetUserId,
        targetUserEmail,
      },
      eventData: actionDetails,
    });
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    eventType: Extract<SecurityEventType, `data.${string}`>,
    userId: string,
    resourceId: string,
    resourceType: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(eventType, {
      severity: 'info',
      success: true,
      context: {
        userId,
      },
      eventData: {
        resource_id: resourceId,
        resource_type: resourceType,
        ...additionalData,
      },
    });
  }

  /**
   * Log suspicious activity
   */
  public async logSuspiciousActivity(
    activityType: Extract<SecurityEventType, `security.suspicious.${string}`>,
    userId: string | undefined,
    userEmail: string | undefined,
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent(activityType, {
      severity: 'critical',
      success: false,
      context: {
        userId,
        userEmail,
      },
      eventData: details,
      errorMessage: 'Suspicious activity detected',
    });
  }

  /**
   * Log API error
   */
  public async logApiError(
    errorType: Extract<SecurityEventType, `api.error.${string}`>,
    userId: string | undefined,
    errorMessage: string,
    requestDetails?: Record<string, any>
  ): Promise<void> {
    await this.logEvent(errorType, {
      severity: 'error',
      success: false,
      context: {
        userId,
      },
      eventData: requestDetails,
      errorMessage,
    });
  }

  /**
   * Log rate limit event
   */
  public async logRateLimitEvent(
    exceeded: boolean,
    userId: string | undefined,
    userEmail: string | undefined,
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<void> {
    const eventType = exceeded ? 'api.rate_limit.exceeded' : 'api.rate_limit.warning';
    const severity: SecurityEventSeverity = exceeded ? 'warning' : 'info';

    await this.logEvent(eventType, {
      severity,
      success: !exceeded,
      context: {
        userId,
        userEmail,
      },
      eventData: {
        identifier,
        limit,
        window_ms: windowMs,
      },
    });
  }

  /**
   * Log system settings change
   */
  public async logSystemSettingsChange(
    adminUserId: string,
    adminEmail: string,
    settingKey: string,
    oldValue: any,
    newValue: any
  ): Promise<void> {
    await this.logEvent('system.settings.updated', {
      severity: 'warning',
      success: true,
      context: {
        userId: adminUserId,
        userEmail: adminEmail,
        userRole: 'admin',
      },
      eventData: {
        setting_key: settingKey,
        old_value: oldValue,
        new_value: newValue,
      },
    });
  }

  /**
   * Get recent failed login attempts for a user
   */
  public async getRecentFailedLogins(
    userEmail: string,
    timeWindowMinutes: number = 15
  ): Promise<{
    attemptCount: number;
    lastAttempt: Date | null;
    ipAddresses: string[];
  }> {
    try {
      const { data, error } = await supabase.rpc('get_recent_failed_logins', {
        p_user_email: userEmail,
        p_time_window_minutes: timeWindowMinutes,
      });

      if (error) {
        console.error('[SecurityLoggingService] Failed to get recent failed logins:', error);
        return { attemptCount: 0, lastAttempt: null, ipAddresses: [] };
      }

      if (!data || data.length === 0) {
        return { attemptCount: 0, lastAttempt: null, ipAddresses: [] };
      }

      const result = data[0];
      return {
        attemptCount: parseInt(result.attempt_count) || 0,
        lastAttempt: result.last_attempt ? new Date(result.last_attempt) : null,
        ipAddresses: result.ip_addresses || [],
      };
    } catch (error) {
      console.error('[SecurityLoggingService] Error getting recent failed logins:', error);
      return { attemptCount: 0, lastAttempt: null, ipAddresses: [] };
    }
  }

  /**
   * Detect suspicious activity for a user
   */
  public async detectSuspiciousActivity(
    userId: string,
    timeWindowHours: number = 24
  ): Promise<Array<{
    pattern: string;
    eventCount: number;
    severity: SecurityEventSeverity;
    details: Record<string, any>;
  }>> {
    try {
      const { data, error } = await supabase.rpc('detect_suspicious_activity', {
        p_user_id: userId,
        p_time_window_hours: timeWindowHours,
      });

      if (error) {
        console.error('[SecurityLoggingService] Failed to detect suspicious activity:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        pattern: item.suspicious_pattern,
        eventCount: parseInt(item.event_count) || 0,
        severity: item.severity as SecurityEventSeverity,
        details: item.details || {},
      }));
    } catch (error) {
      console.error('[SecurityLoggingService] Error detecting suspicious activity:', error);
      return [];
    }
  }

  /**
   * Get security event summary (admin only)
   */
  public async getSecurityEventSummary(
    timeWindowHours: number = 24
  ): Promise<Array<{
    eventType: SecurityEventType;
    eventCount: number;
    successCount: number;
    failureCount: number;
    uniqueUsers: number;
    severityBreakdown: Record<SecurityEventSeverity, number>;
  }>> {
    try {
      const { data, error } = await supabase.rpc('get_security_event_summary', {
        p_time_window_hours: timeWindowHours,
      });

      if (error) {
        console.error('[SecurityLoggingService] Failed to get security event summary:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        eventType: item.event_type as SecurityEventType,
        eventCount: parseInt(item.event_count) || 0,
        successCount: parseInt(item.success_count) || 0,
        failureCount: parseInt(item.failure_count) || 0,
        uniqueUsers: parseInt(item.unique_users) || 0,
        severityBreakdown: item.severity_breakdown || {},
      }));
    } catch (error) {
      console.error('[SecurityLoggingService] Error getting security event summary:', error);
      return [];
    }
  }

  /**
   * Clean up old security logs
   */
  public async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_security_logs', {
        p_retention_days: retentionDays,
      });

      if (error) {
        console.error('[SecurityLoggingService] Failed to cleanup old logs:', error);
        return 0;
      }

      const deletedCount = data && data.length > 0 ? parseInt(data[0].deleted_count) || 0 : 0;
      console.log(`[SecurityLoggingService] ✅ Cleaned up ${deletedCount} old security logs`);
      return deletedCount;
    } catch (error) {
      console.error('[SecurityLoggingService] Error cleaning up old logs:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const securityLoggingService = SecurityLoggingService.getInstance();

