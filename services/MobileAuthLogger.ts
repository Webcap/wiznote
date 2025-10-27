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
import { supabase } from '../lib/supabase';

class MobileAuthLogger {
  private static instance: MobileAuthLogger;
  private authLogEndpoint: string;

  private constructor() {
    // Use environment variable or default to production URL
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://wiznote.app';
    this.authLogEndpoint = `${baseUrl}/.netlify/functions/auth-log`;
    
    console.log('[MobileAuthLogger] Initialized with endpoint:', this.authLogEndpoint);
    console.log('[MobileAuthLogger] Platform:', Platform.OS);
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
      // Silently skip for web - this is expected
      return { success: false };
    }

    const requestPayload = {
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
    };

    console.log('[MobileAuthLogger] Logging event:', {
      eventType,
      endpoint: this.authLogEndpoint,
      userEmail: options.userEmail,
    });

    try {
      // Get current user's access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('[MobileAuthLogger] No active session:', sessionError?.message);
        return { success: false };
      }

      console.log('[MobileAuthLogger] Using authenticated session');

      const response = await fetch(this.authLogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('[MobileAuthLogger] Response status:', response.status);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorText = await response.text();
        
        console.error('[MobileAuthLogger] ❌ Failed to log event:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          endpoint: this.authLogEndpoint,
          errorPreview: errorText.substring(0, 200),
        });

        // If we got an HTML response (404 page), the function doesn't exist
        if (contentType?.includes('text/html')) {
          console.error('[MobileAuthLogger] ⚠️ Received HTML response - Netlify function not found!');
          console.error('[MobileAuthLogger] Check:');
          console.error('  1. EXPO_PUBLIC_API_URL is set correctly');
          console.error('  2. Netlify function is deployed');
          console.error('  3. Function path: /.netlify/functions/auth-log');
        }

        return { success: false };
      }

      const result = await response.json();
      console.log('[MobileAuthLogger] ✅ Event logged successfully:', {
        eventType,
        capturedIp: result.capturedIp,
        eventId: result.eventId,
      });

      return {
        success: true,
        capturedIp: result.capturedIp,
      };
    } catch (error) {
      // Silently handle network errors - these are expected if the function isn't deployed or network is unavailable
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only log if it's not a network error (those are expected in dev/staging)
      if (!errorMessage.includes('Network request failed') && !errorMessage.includes('Failed to fetch')) {
        console.error('[MobileAuthLogger] ❌ Error logging event:', {
          error: errorMessage,
          endpoint: this.authLogEndpoint,
          eventType,
        });
      }
      
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

