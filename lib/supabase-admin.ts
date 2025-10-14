/**
 * Supabase Admin Client Configuration
 * 
 * This module provides server-side admin access to Supabase with support for:
 * - NEW: sb_secret_... keys (recommended)
 * - LEGACY: JWT-based service_role keys (deprecated but still supported)
 * 
 * According to Supabase docs (https://supabase.com/docs/guides/api/api-keys):
 * - Secret keys provide better security and are easier to rotate
 * - Service role keys are tightly coupled to JWT secret and harder to manage
 * - Both bypass Row Level Security (RLS) - use with caution!
 * 
 * SECURITY WARNING:
 * - NEVER expose these keys in client-side code
 * - Only use in server-side scripts, Edge Functions, or secure backends
 * - These keys bypass ALL Row Level Security policies
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

/**
 * Get the admin key with priority: secret key > service_role key
 * Supports both new sb_secret_... format and legacy JWT-based service_role key
 */
function getAdminKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (secretKey && secretKey.startsWith('sb_secret_')) {
    console.log('✅ Using NEW Supabase Secret Key (sb_secret_...)');
    return secretKey;
  }
  
  if (serviceRoleKey) {
    console.log('⚠️  Using LEGACY Service Role Key (JWT-based)');
    console.log('💡 Consider migrating to sb_secret_... keys for better security and easier rotation');
    return serviceRoleKey;
  }
  
  throw new Error(
    'Missing Supabase admin key! Please set either:\n' +
    '  - SUPABASE_SECRET_KEY (recommended, sb_secret_...)\n' +
    '  - SUPABASE_SERVICE_ROLE_KEY (legacy, JWT-based)'
  );
}

/**
 * Admin Supabase client with elevated privileges
 * 
 * WARNING: This client bypasses Row Level Security!
 * Only use for:
 * - Admin operations
 * - Server-side scripts
 * - Trusted backend services
 * - Data migrations
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  getAdminKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'wiznote-admin-server',
      },
    },
  }
);

/**
 * Helper to check which key type is being used
 */
export function getAdminKeyInfo() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return {
    hasSecretKey: !!secretKey && secretKey.startsWith('sb_secret_'),
    hasServiceRoleKey: !!serviceRoleKey,
    usingNewFormat: !!secretKey && secretKey.startsWith('sb_secret_'),
    keyType: secretKey && secretKey.startsWith('sb_secret_') 
      ? 'secret' 
      : (serviceRoleKey ? 'service_role' : 'none'),
  };
}

/**
 * Validate that admin key is available
 * Throws error if neither key is set
 */
export function validateAdminKey() {
  try {
    getAdminKey();
    return true;
  } catch (error) {
    return false;
  }
}

export default supabaseAdmin;

