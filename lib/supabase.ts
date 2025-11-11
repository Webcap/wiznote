import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeClient } from '@supabase/realtime-js';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// Support both new publishable key format (EXPO_PUBLIC_SUPABASE_KEY) and legacy anon key
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const KNOWN_SUPABASE_HOST_MAP: Record<string, string> = {
  'auth.wiznote.app': 'kmzubtegijexwguadyfw.supabase.co',
};

const mergeHeaders = (
  base: HeadersInit | undefined,
  defaults: Record<string, string>
): HeadersInit => {
  const result: Record<string, string> = { ...defaults };

  if (!base) {
    return result;
  }

  if (typeof Headers !== 'undefined' && base instanceof Headers) {
    base.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(base)) {
    for (const [key, value] of base) {
      result[key] = value;
    }
    return result;
  }

  return { ...result, ...(base as Record<string, string>) };
};

const parseHost = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.host;
  } catch (error) {
    console.warn('Supabase configuration: unable to parse host from value', value, error);
    return null;
  }
};

const supabasePrimaryHost = parseHost(supabaseUrl);
const supabaseDirectHost =
  parseHost(process.env.EXPO_PUBLIC_SUPABASE_DIRECT_URL) ||
  parseHost(process.env.EXPO_PUBLIC_SUPABASE_DIRECT_HOST) ||
  (supabasePrimaryHost && supabasePrimaryHost.endsWith('.supabase.co') ? supabasePrimaryHost : null) ||
  (supabasePrimaryHost ? KNOWN_SUPABASE_HOST_MAP[supabasePrimaryHost] ?? null : null);

const realtimeFallbackUrl = supabaseDirectHost
  ? `wss://${supabaseDirectHost}/realtime/v1`
  : null;

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

const realtimeParams = {
  eventsPerSecond: Platform.OS === 'web' ? 10 : 5,
};

const createPlatformFetch = () => {
  if (Platform.OS === 'web') {
    return (input: RequestInfo | URL, init: RequestInit = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const headers = mergeHeaders(init.headers, {
        Accept: 'application/json',
      });

      const finalInit: RequestInit = {
        ...init,
        signal: controller.signal,
        headers,
      };

      const isRequestInstance = typeof Request !== 'undefined' && input instanceof Request;
      const finalInput = isRequestInstance ? new Request(input, finalInit) : input;
      const finalInitForFetch = isRequestInstance ? undefined : finalInit;

      return fetch(finalInput as RequestInfo, finalInitForFetch).finally(() => {
        clearTimeout(timeoutId);
      });
    };
  }

  return (input: RequestInfo | URL, init: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const headers = mergeHeaders(init.headers, {
      'User-Agent': `WizNote-Mobile-${Platform.OS}`,
      Accept: 'application/json',
    });

    const finalInit: RequestInit = {
      ...init,
      signal: controller.signal,
      headers,
    };

    const isRequestInstance = typeof Request !== 'undefined' && input instanceof Request;
    const finalInput = isRequestInstance ? new Request(input, finalInit) : input;
    const finalInitForFetch = isRequestInstance ? undefined : finalInit;

    return fetch(finalInput as RequestInfo, finalInitForFetch).finally(() => {
      clearTimeout(timeoutId);
    });
  };
};

const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: Platform.OS === 'web' ? 'pkce' : 'implicit',
    storage: getStorage(),
    storageKey: 'supabase.auth.token',
    debug: false,
    ...(Platform.OS === 'web' && {}),
  },
  global: {
    headers: {
      'X-Client-Info': `notez-react-app-${Platform.OS}`,
      'Accept': 'application/json',
    },
    fetch: createPlatformFetch(),
  },
  realtime: {
    params: {
      ...realtimeParams,
    },
  },
} as const;

// Create Supabase client with cross-platform configuration
export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key',
  supabaseOptions
);

const normalizeRealtimeUrl = (value: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    const hasScheme = /^(https?|wss?):\/\//i.test(value);
    const rawUrl = hasScheme ? value : `https://${value}`;
    const url = new URL(rawUrl);

    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/realtime/v1';
    } else if (!/\/realtime(\/|$)/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/realtime/v1`;
    }

    if (url.protocol.startsWith('http')) {
      url.protocol = url.protocol.replace('http', 'ws');
    }

    return url.href;
  } catch (error) {
    console.warn('Supabase realtime override: invalid URL provided', value, error);
    return null;
  }
};

const configureRealtimeOverride = () => {
  const overrideUrl =
    process.env.EXPO_PUBLIC_SUPABASE_REALTIME_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_REALTIME_WEBSOCKET_URL ||
    realtimeFallbackUrl;

  const normalizedUrl = overrideUrl ? normalizeRealtimeUrl(overrideUrl) : null;

  if (!normalizedUrl) {
    return;
  }

  try {
    const defaultRealtime = supabase.realtime;
    defaultRealtime.disconnect();

    const realtimeClient = new RealtimeClient(normalizedUrl, {
      params: {
        apikey: supabaseAnonKey,
        ...realtimeParams,
      },
      accessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? supabaseAnonKey;
      },
    });

    supabase.realtime = realtimeClient as typeof supabase.realtime;
    realtimeClient.connect();

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        realtimeClient.setAuth(data.session.access_token);
      }
    });

    if (enableSupabaseLogs) {
      console.log('Supabase realtime override enabled:', normalizedUrl);
    }
  } catch (error) {
    console.warn('Supabase realtime override failed:', error);
  }
};

configureRealtimeOverride();

// Database connection for Drizzle
export const db = supabase;

// Export types for better TypeScript support
export type SupabaseClient = typeof supabase; 