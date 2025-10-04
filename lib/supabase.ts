import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Optional environment variable to control Supabase logging
const enableSupabaseLogs = process.env.EXPO_PUBLIC_SUPABASE_LOGS === 'true';
const enableAuthStateLogs = process.env.EXPO_PUBLIC_AUTH_LOGS === 'true';

// For testing environment, provide mock values
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Only log configuration details in development and if explicitly enabled
if (process.env.NODE_ENV === 'development' && enableSupabaseLogs) {
  console.log('Supabase Configuration Debug:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isTestEnvironment:', isTestEnvironment);
  console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

if (!isTestEnvironment) {
  // Validate environment variables only in non-test environments
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:');
    console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
    console.error('Please create a .env file with your Supabase credentials');
    throw new Error('Supabase environment variables are required');
  }
}

// Cross-platform storage configuration
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Web platform - use localStorage
    if (typeof window !== 'undefined') {
      try {
        // Test if localStorage is available and working
        const testKey = '__supabase_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        return window.localStorage;
      } catch (error) {
        console.warn('localStorage not available, using memory storage');
        return undefined;
      }
    }
    return undefined;
  } else {
    // Mobile platform - use AsyncStorage
    return AsyncStorage;
  }
};

// Create Supabase client with cross-platform configuration
export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: Platform.OS === 'web' ? 'pkce' : 'implicit',
      // Cross-platform storage configuration
      storage: getStorage(),
      storageKey: 'supabase.auth.token',
      // Disable debug mode to suppress GoTrueClient console logs
      debug: false,
      // Optimize session handling
      onAuthStateChange: (event, session) => {
        // Only log auth state changes in development, and suppress GoTrueClient logs
        if (process.env.NODE_ENV === 'development' && enableAuthStateLogs) {
          console.log('Supabase auth state change:', event, session?.user?.id);
        }
      },
    },
    // Optimize global configuration
    global: {
      headers: {
        'X-Client-Info': `notez-react-app-${Platform.OS}`,
      },
    },
    // Optimize realtime configuration
    realtime: {
      params: {
        eventsPerSecond: Platform.OS === 'web' ? 10 : 5, // Lower rate for mobile
      },
    },
    // Platform-specific optimizations
    ...(Platform.OS === 'web' && {
      // Web-specific optimizations
      fetch: (url, options = {}) => {
        // Add timeout for web requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    }),
  }
);

// Database connection for Drizzle
export const db = supabase;

// Export types for better TypeScript support
export type SupabaseClient = typeof supabase; 