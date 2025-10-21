/**
 * Netlify Function: Auth Event Logger with Server-Side IP Capture
 * 
 * This function allows mobile apps to log authentication events
 * with accurate IP address capture from server-side request headers.
 * 
 * Usage from mobile app:
 * await fetch(`${API_URL}/auth-log`, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     eventType: 'auth.login.success',
 *     userId: user.id,
 *     userEmail: user.email,
 *     success: true,
 *     platform: 'ios' | 'android',
 *   })
 * });
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Extract IP address from request headers
    const ip = 
      event.headers['x-forwarded-for']?.split(',')[0].trim() ||
      event.headers['x-real-ip'] ||
      event.headers['client-ip'] ||
      context.clientContext?.ip ||
      'unknown';

    // Extract user agent
    const userAgent = event.headers['user-agent'] || 'unknown';

    // Get auth token from Authorization header
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          details: 'Missing authorization token'
        }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body);
    const {
      eventType,
      userId,
      userEmail,
      userRole,
      success = true,
      errorMessage,
      eventData = {},
      severity = 'info',
    } = body;

    // Validate required fields
    if (!eventType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'eventType is required' }),
      };
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[auth-log] Missing Supabase configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing Supabase configuration'
        }),
      };
    }

    // Create client with user's session token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the token is valid by getting the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('[auth-log] Invalid token:', authError?.message);
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Invalid token',
          details: authError?.message 
        }),
      };
    }

    console.log('[auth-log] Authenticated user:', user.email);

    // Log the security event with captured IP
    const { data, error } = await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_severity: severity,
      p_user_id: user.id, // Use verified user ID from token
      p_user_email: user.email, // Use verified email from token
      p_user_role: userRole || null,
      p_target_user_id: null,
      p_target_user_email: null,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_request_path: '/api/auth',
      p_request_method: 'POST',
      p_event_data: {
        ...eventData,
        captured_server_side: true,
      },
      p_error_message: errorMessage || null,
      p_success: success,
      p_metadata: {
        logged_via: 'netlify_function_authenticated',
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('[auth-log] Error logging security event:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to log event', 
          details: error.message 
        }),
      };
    }

    console.log('[auth-log] ✅ Event logged successfully for user:', user.email);

    // Success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        eventId: data,
        capturedIp: ip,
        message: 'Event logged successfully',
      }),
    };
  } catch (error) {
    console.error('[auth-log] Error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};
