/**
 * Mobile Auth Logger Service
 * 
 * Logs authentication events from mobile apps with server-side IP capture.
 * This service routes logs through a Netlify Function to capture real IP addresses.
 * 
 * @module MobileAuthLogger
 * @created October 2025
 */

import { Platform } from 'react-native';
import { SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';

class MobileAuthLogger {
  private static instance: MobileAuthLogger;
  private authLogEndpoint: string;

  private constructor() {
    // Use environment variable or default to production URL
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://your-site.netlify.app';
    this.authLogEndpoint = `${baseUrl}/.netlify/functions/auth-log`;
  }

  public static getInstance(): MobileAuthLogger {
    if (!MobileAuthLogger.instance) {
      MobileAuthLogger.instance = new MobileAuthLogger();
    }
    return MobileAuthLogger.instance;
  }

  /**
   * Log authentication event with server-side IP capture
   * Only used for mobile platforms (iOS/Android)
   */
  public async logAuthEvent(
    eventType: SecurityEventType,
    options: {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      success: boolean;
      errorMessage?: string;
      eventData?: Record<string, any>;
      severity?: SecurityEventSeverity;
    }
  ): Promise<{ success: boolean; capturedIp?: string }> {
    // Only use this for mobile platforms
    if (Platform.OS === 'web') {
      console.warn('[MobileAuthLogger] This service is for mobile only. Use SecurityLoggingService for web.');
      return { success: false };
    }

    try {
      const response = await fetch(this.authLogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          userId: options.userId,
          userEmail: options.userEmail,
          userRole: options.userRole,
          success: options.success,
          errorMessage: options.errorMessage,
          eventData: {
            ...options.eventData,
            platform: Platform.OS,
            platform_version: Platform.Version,
          },
          severity: options.severity || (options.success ? 'info' : 'warning'),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MobileAuthLogger] Failed to log event:', errorText);
        return { success: false };
      }

      const result = await response.json();
      console.log('[MobileAuthLogger] Event logged successfully:', {
        eventType,
        capturedIp: result.capturedIp,
      });

      return {
        success: true,
        capturedIp: result.capturedIp,
      };
    } catch (error) {
      console.error('[MobileAuthLogger] Error logging event:', error);
      return { success: false };
    }
  }

  /**
   * Helper: Log login success
   */
  public async logLoginSuccess(userId: string, userEmail: string, additionalData?: Record<string, any>) {
    return this.logAuthEvent('auth.login.success', {
      userId,
      userEmail,
      success: true,
      eventData: additionalData,
      severity: 'info',
    });
  }

  /**
   * Helper: Log login failure
   */
  public async logLoginFailure(userEmail: string, errorMessage: string, additionalData?: Record<string, any>) {
    return this.logAuthEvent('auth.login.failure', {
      userEmail,
      success: false,
      errorMessage,
      eventData: additionalData,
      severity: 'warning',
    });
  }

  /**
   * Helper: Log logout
   */
  public async logLogout(userId: string, userEmail: string) {
    return this.logAuthEvent('auth.logout', {
      userId,
      userEmail,
      success: true,
      severity: 'info',
    });
  }

  /**
   * Helper: Log signup success
   */
  public async logSignupSuccess(userId: string, userEmail: string) {
    return this.logAuthEvent('auth.signup.success', {
      userId,
      userEmail,
      success: true,
      severity: 'info',
    });
  }

  /**
   * Helper: Log signup failure
   */
  public async logSignupFailure(userEmail: string, errorMessage: string) {
    return this.logAuthEvent('auth.signup.failure', {
      userEmail,
      success: false,
      errorMessage,
      severity: 'warning',
    });
  }

  /**
   * Helper: Log password reset request
   */
  public async logPasswordResetRequest(userEmail: string) {
    return this.logAuthEvent('auth.password_reset.request', {
      userEmail,
      success: true,
      severity: 'info',
    });
  }
}

// Export singleton instance
export const mobileAuthLogger = MobileAuthLogger.getInstance();

