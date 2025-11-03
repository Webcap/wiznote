/**
 * Netlify Function: Gemini API Proxy
 * 
 * Server-side proxy for Gemini API calls to prevent API key exposure in client bundles.
 * This function securely handles all Gemini API requests.
 * 
 * SECURITY: API key is stored server-side only and never exposed to clients.
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get API key from server-side environment (NOT from client)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
        },
        body: JSON.stringify({ error: 'API configuration error' }),
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { endpoint, payload } = requestBody;

    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
        },
        body: JSON.stringify({ error: 'Missing or invalid endpoint' }),
      };
    }

    // Validate payload
    if (!payload || typeof payload !== 'object') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
        },
        body: JSON.stringify({ error: 'Missing or invalid payload' }),
      };
    }

    // Build Gemini API URL with server-side API key
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}?key=${GEMINI_API_KEY}`;

    // Make request to Gemini API
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', response.status, responseData);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
        },
        body: JSON.stringify({
          error: 'Gemini API request failed',
          details: responseData.error || responseData,
        }),
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
      },
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('Gemini API proxy error:', error);
    
    // Sanitize error message for client
    const isProduction = process.env.NODE_ENV === 'production';
    let errorMessage = 'An error occurred';
    
    if (error instanceof Error) {
      if (isProduction) {
        // Generic message in production
        errorMessage = 'An error occurred processing your request';
      } else {
        // More details in development (but still sanitized)
        errorMessage = error.message.replace(/key=[^&]+/g, 'key=[REDACTED]');
      }
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.EXPO_PUBLIC_WEB_URL || '*',
      },
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};

