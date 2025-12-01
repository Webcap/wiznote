/**
 * Crash Reporting Service
 * 
 * Provides centralized error reporting and crash tracking.
 * Integrated with Sentry for production error tracking.
 */

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class CrashReportingService {
  private isInitialized: boolean = false;
  private userId: string | null = null;
  private userEmail: string | null = null;

  /**
   * Initialize the crash reporting service
   * @param options Configuration options
   */
  async initialize(options?: {
    dsn?: string; // Sentry DSN or other service configuration
    environment?: string;
    enableInDev?: boolean;
  }): Promise<void> {
    if (this.isInitialized) {
      console.warn('CrashReportingService: Already initialized');
      return;
    }

    try {
      const dsn = options?.dsn || process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://8c6e71f76b1347d2cda884b802de1863@o4510461120806912.ingest.us.sentry.io/4510461123690496';
      const environment = options?.environment || (__DEV__ ? 'development' : 'production');
      const enableInDev = options?.enableInDev ?? false;

      if (!dsn) {
        console.warn('CrashReportingService: No DSN provided. Crash reporting will be disabled.');
        return;
      }

      if (__DEV__ && !enableInDev) {
        console.log('CrashReportingService: Disabled in development mode.');
        return;
      }

      // Initialize Sentry
      Sentry.init({
        dsn,
        environment,
        enableInExpoDevelopment: enableInDev,
        debug: __DEV__, // Enable debug mode in development
        // Configure Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1,
        integrations: [
          Sentry.mobileReplayIntegration(),
          Sentry.feedbackIntegration(),
        ],
        // Adds more context data to events (IP address, cookies, user, etc.)
        sendDefaultPii: true,
        // Enable Logs
        enableLogs: true,
      });

      this.isInitialized = true;
      console.log('CrashReportingService: Initialized successfully', {
        platform: Platform.OS,
        environment,
      });
    } catch (error) {
      console.error('CrashReportingService: Failed to initialize', error);
    }
  }

  /**
   * Set the current user for error context
   */
  setUser(userId: string | null, userEmail: string | null = null): void {
    this.userId = userId;
    this.userEmail = userEmail;
    
    if (!this.isInitialized) {
      console.warn('CrashReportingService: Not initialized. Cannot set user.');
      return;
    }

    if (userId) {
      Sentry.setUser({
        id: userId,
        email: userEmail || undefined,
      });
      console.log('CrashReportingService: User set', {
        userId: userId.substring(0, 8) + '...',
        hasEmail: !!userEmail,
      });
    } else {
      Sentry.setUser(null);
      console.log('CrashReportingService: User cleared');
    }
  }

  /**
   * Capture an exception/error
   */
  captureException(
    error: Error,
    context?: ErrorContext
  ): void {
    if (!this.isInitialized) {
      console.warn('CrashReportingService: Not initialized, error not captured');
      return;
    }

    // Set additional context if provided
    if (context) {
      if (context.screen) {
        Sentry.setTag('screen', context.screen);
      }
      if (context.action) {
        Sentry.setTag('action', context.action);
      }
      if (context.metadata) {
        Sentry.setContext('error_metadata', context.metadata);
      }
    }

    // Capture exception with Sentry
    Sentry.captureException(error, {
      extra: {
        platform: Platform.OS,
        userId: context?.userId || this.userId,
        userEmail: context?.userEmail || this.userEmail,
        screen: context?.screen,
        action: context?.action,
        ...(context?.metadata || {}),
      },
    });

    // Log to console in development
    if (__DEV__) {
      console.error('CrashReportingService: Exception captured', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        platform: Platform.OS,
        context,
      });
    }
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): void {
    if (!this.isInitialized) {
      console.warn('CrashReportingService: Not initialized. Logging message locally:', message, context);
      return;
    }

    // Set additional context if provided
    if (context) {
      if (context.screen) {
        Sentry.setTag('screen', context.screen);
      }
      if (context.action) {
        Sentry.setTag('action', context.action);
      }
      if (context.metadata) {
        Sentry.setContext('message_metadata', context.metadata);
      }
    }

    // Capture message with Sentry
    Sentry.captureMessage(message, {
      level: level as Sentry.SeverityLevel,
      extra: {
        platform: Platform.OS,
        userId: context?.userId || this.userId,
        userEmail: context?.userEmail || this.userEmail,
        screen: context?.screen,
        action: context?.action,
        ...(context?.metadata || {}),
      },
    });

    if (__DEV__) {
      console.log(`CrashReportingService: Message captured [${level}]`, message, context);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category?: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    if (!this.isInitialized) {
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category: category || 'default',
      level: level as Sentry.SeverityLevel,
      data,
      timestamp: Date.now() / 1000,
    });

    if (__DEV__) {
      console.log('CrashReportingService: Breadcrumb added', {
        message,
        category,
        level,
        data,
      });
    }
  }

  /**
   * Set additional context
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('CrashReportingService: Not initialized. Cannot set context.');
      return;
    }

    Sentry.setContext(name, context);

    if (__DEV__) {
      console.log('CrashReportingService: Context set', { name, context });
    }
  }

  /**
   * Set tags for error filtering
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) {
      console.warn('CrashReportingService: Not initialized. Cannot set tag.');
      return;
    }

    Sentry.setTag(key, value);

    if (__DEV__) {
      console.log('CrashReportingService: Tag set', { key, value });
    }
  }

  /**
   * Clear user data (on logout)
   */
  clearUser(): void {
    this.setUser(null, null);
  }
}

// Export singleton instance
export const crashReportingService = new CrashReportingService();

