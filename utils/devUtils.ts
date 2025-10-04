import React from 'react';

/**
 * Development utilities for the React Native/Expo project
 * 
 * This module provides helper functions for development-only operations.
 * All functions in this module respect the __DEV__ global variable and
 * will be stripped from production builds when used with proper bundling.
 */

/**
 * Check if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * Check if the application is running in production mode
 * @returns true if in production mode, false otherwise
 */
export function isProduction(): boolean {
  return !__DEV__;
}

/**
 * Conditionally execute a function only in development mode
 * This function will be completely stripped from production builds
 * 
 * @param fn Function to execute only in development
 * @example
 * devOnly(() => {
 *   console.log('This only runs in development');
 *   setupDevTools();
 * });
 */
export function devOnly(fn: () => void): void {
  if (__DEV__) {
    fn();
  }
}

/**
 * Conditionally execute a function only in production mode
 * 
 * @param fn Function to execute only in production
 * @example
 * prodOnly(() => {
 *   initAnalytics();
 *   setupCrashReporting();
 * });
 */
export function prodOnly(fn: () => void): void {
  if (!__DEV__) {
    fn();
  }
}

/**
 * Log a message only in development mode
 * Wrapper around console.log that respects __DEV__
 * 
 * @param message Message to log
 * @param args Additional arguments to log
 * @example
 * devLog('User authenticated:', user);
 * devLog('API response:', response.data);
 */
export function devLog(message: string, ...args: any[]): void {
  if (__DEV__) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

/**
 * Log a warning only in development mode
 * 
 * @param message Warning message to log
 * @param args Additional arguments to log
 */
export function devWarn(message: string, ...args: any[]): void {
  if (__DEV__) {
    console.warn(`[DEV WARNING] ${message}`, ...args);
  }
}

/**
 * Log an error in both development and production modes
 * Errors should always be logged for debugging purposes
 * 
 * @param message Error message to log
 * @param args Additional arguments to log
 */
export function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

/**
 * Assert a condition only in development mode
 * Throws an error if the condition is false in development
 * Does nothing in production builds
 * 
 * @param condition Condition to assert
 * @param message Error message if assertion fails
 * @example
 * devAssert(user !== null, 'User should be authenticated');
 * devAssert(config.apiKey, 'API key must be configured');
 */
export function devAssert(condition: boolean, message: string): void {
  if (__DEV__ && !condition) {
    throw new Error(`[DEV ASSERTION FAILED] ${message}`);
  }
}

/**
 * Performance timer for development debugging
 * Measures execution time of a function only in development
 * 
 * @param label Label for the timer
 * @param fn Function to time
 * @returns Result of the function execution
 * @example
 * const result = devTime('API Call', () => {
 *   return fetch('/api/data');
 * });
 */
export function devTime<T>(label: string, fn: () => T): T {
  if (__DEV__) {
    console.time(`[DEV TIMER] ${label}`);
    const result = fn();
    console.timeEnd(`[DEV TIMER] ${label}`);
    return result;
  }
  return fn();
}

/**
 * Async performance timer for development debugging
 * 
 * @param label Label for the timer
 * @param fn Async function to time
 * @returns Promise result of the function execution
 */
export async function devTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (__DEV__) {
    console.time(`[DEV TIMER] ${label}`);
    const result = await fn();
    console.timeEnd(`[DEV TIMER] ${label}`);
    return result;
  }
  return await fn();
}

/**
 * Create a development-only debug object with helper methods
 * Returns null in production builds
 * 
 * @param namespace Namespace for the debug object
 * @returns Debug object with helper methods or null in production
 * @example
 * const debug = createDebugger('AuthService');
 * debug?.log('User signed in', user);
 * debug?.warn('Token expires soon');
 */
export function createDebugger(namespace: string) {
  if (!__DEV__) {
    return null;
  }

  return {
    log: (message: string, ...args: any[]) => {
      console.log(`[${namespace}] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${namespace}] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${namespace}] ${message}`, ...args);
    },
    time: (label: string) => {
      console.time(`[${namespace}] ${label}`);
    },
    timeEnd: (label: string) => {
      console.timeEnd(`[${namespace}] ${label}`);
    },
    assert: (condition: boolean, message: string) => {
      if (!condition) {
        console.error(`[${namespace}] ASSERTION FAILED: ${message}`);
      }
    }
  };
}

/**
 * Environment configuration helpers
 */
export const env = {
  /**
   * Check if running in development mode
   */
  isDev: __DEV__,
  
  /**
   * Check if running in production mode
   */
  isProd: !__DEV__,
  
  /**
   * Get current environment string
   */
  get current(): 'development' | 'production' {
    return __DEV__ ? 'development' : 'production';
  }
};

/**
 * Development-only React component wrapper
 * Only renders children in development mode
 * 
 * @example
 * <DevOnly>
 *   <DebugPanel />
 * </DevOnly>
 */
export const DevOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!__DEV__) {
    return null;
  }
  return children as React.ReactElement;
};

/**
 * Production-only React component wrapper
 * Only renders children in production mode
 */
export const ProdOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (__DEV__) {
    return null;
  }
  return children as React.ReactElement;
};