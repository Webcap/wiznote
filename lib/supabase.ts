import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// Support both new publishable key format (EXPO_PUBLIC_SUPABASE_KEY) and legacy anon key
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Debug: Log which key is being used (only show prefix for security)
console.log('🔑 Supabase Key Type:', 
  process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'NEW Publishable Key (sb_publishable_...)' : 'LEGACY Anon Key (eyJ...)'
);
console.log('🔑 Key prefix:', supabaseAnonKey?.substring(0, 20) + '...');

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
  console.log('EXPO_PUBLIC_SUPABASE_KEY:', process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Present (New Format)' : 'Missing');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Present (Legacy)' : 'Missing');
  console.log('Using key format:', process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Publishable (New)' : 'Anon (Legacy)');
}

if (!isTestEnvironment) {
  // Validate environment variables only in non-test environments
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:');
    console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.error('EXPO_PUBLIC_SUPABASE_KEY:', process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Present' : 'Missing');
    console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
    console.error('Please create a .env file with your Supabase credentials');
    console.error('Use EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxx (new format required if legacy keys are disabled)');
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
      // CSRF Protection: Configure secure cookie settings for web
      ...(Platform.OS === 'web' && {
        // Note: Supabase handles cookie configuration on the server side
        // These settings should be configured in your Supabase dashboard:
        // - Go to Authentication > Settings
        // - Enable "Use Secure Cookies" (HTTPS only)
        // - SameSite attribute is automatically set to "Lax" by Supabase
        // For stricter CSRF protection, you can use custom cookie handling
        // via the auth.onAuthStateChange callback
      }),
    },
    // Optimize global configuration
    global: {
      headers: {
        'X-Client-Info': `notez-react-app-${Platform.OS}`,
        'Accept': 'application/json',
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
      fetch: (url: string, options: RequestInit = {}) => {
        // Add timeout for web requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            ...options.headers,
          },
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    }),
    ...(Platform.OS !== 'web' && {
      // Mobile-specific optimizations (Android/iOS)
      fetch: (url: string, options: RequestInit = {}) => {
        // Add timeout for mobile requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for mobile
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
          // Add mobile-specific headers
          headers: {
            ...options.headers,
            'User-Agent': `WizNote-Mobile-${Platform.OS}`,
            'Accept': 'application/json',
          },
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