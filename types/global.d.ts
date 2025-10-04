/**
 * Global type declarations for the React Native/Expo project
 */

/**
 * The __DEV__ global variable is automatically provided by Metro bundler
 * - true in development mode
 * - false in production mode
 * - Code wrapped in `if (__DEV__)` blocks is stripped from production builds
 */
declare var __DEV__: boolean;

/**
 * Global interface extensions for development features
 */
declare global {
  /**
   * Console interface extensions for React Native
   */
  interface Console {
    /**
     * Development-only logging should be wrapped with __DEV__ checks
     * @example
     * if (__DEV__) {
     *   console.log('Development log message');
     * }
     */
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
  }

  /**
   * Process environment interface for build-time variables
   */
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    APP_VARIANT?: 'development' | 'preview' | 'production';
    
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
  }

  /**
   * Development utilities namespace
   */
  namespace DevUtils {
    /**
     * Check if running in development mode
     */
    function isDevelopment(): boolean;
    
    /**
     * Conditionally execute code only in development
     * @param fn Function to execute in development mode only
     */
    function devOnly(fn: () => void): void;
    
    /**
     * Log message only in development mode
     * @param message Message to log
     * @param ...args Additional arguments
     */
    function devLog(message: string, ...args: any[]): void;
  }
}

/**
 * Utility type for development-only properties
 */
export type DevOnly<T> = __DEV__ extends true ? T : never;

/**
 * Utility type for production-only properties
 */
export type ProdOnly<T> = __DEV__ extends false ? T : never;

/**
 * Environment-aware configuration type
 */
export interface EnvironmentConfig {
  /** API base URL */
  apiUrl: string;
  /** Enable debug features */
  debugMode: boolean;
  /** App environment identifier */
  environment: 'development' | 'preview' | 'production';
  /** Enable verbose logging */
  enableLogging: boolean;

}

export { };
