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

    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the security event with captured IP
    const { data, error } = await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_severity: severity,
      p_user_id: userId || null,
      p_user_email: userEmail || null,
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
        logged_via: 'netlify_function',
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Error logging security event:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to log event', details: error.message }),
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
    console.error('Error in auth-log function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};

// Handle OPTIONS for CORS preflight
exports.handler.options = async () => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: '',
  };
};

