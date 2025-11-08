/**
 * Netlify Function: Gemini API Proxy
 * 
 * Server-side proxy for Gemini API calls to prevent API key exposure in client bundles.
 * This function securely handles all Gemini API requests.
 * 
 * SECURITY: API key is stored server-side only and never exposed to clients.
 */

const normalizeOrigin = (origin) => {
  if (!origin) {
    return '';
  }
  return origin.trim().replace(/\/$/, '');
};

const getAllowedOrigins = () => {
  const baseOrigins = [
    process.env.EXPO_PUBLIC_WEB_URL,
    process.env.EXPO_PUBLIC_API_URL,
    'https://wiznote.app',
  ];

  const extraOrigins = (process.env.GEMINI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const shouldIncludeDevOrigins = process.env.NODE_ENV !== 'production';

  const allOrigins = [
    ...baseOrigins,
    ...(shouldIncludeDevOrigins ? devOrigins : []),
    ...extraOrigins,
  ]
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return Array.from(new Set(allOrigins));
};

const resolveCors = (event) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = normalizeOrigin(
    event.headers.origin || event.headers.Origin || ''
  );

  if (!allowedOrigins.length) {
    return {
      allowedOrigin: '*',
      isOriginAllowed: true,
      requestOrigin,
    };
  }

  if (!requestOrigin) {
    return {
      allowedOrigin: allowedOrigins[0],
      isOriginAllowed: true,
      requestOrigin,
    };
  }

  const isOriginAllowed = allowedOrigins.includes(requestOrigin);

  return {
    allowedOrigin: isOriginAllowed ? requestOrigin : allowedOrigins[0],
    isOriginAllowed,
    requestOrigin,
  };
};

const buildCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

exports.handler = async (event, context) => {
  const cors = resolveCors(event);
  const corsHeaders = buildCorsHeaders(cors.allowedOrigin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    if (!cors.isOriginAllowed) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Origin not allowed',
          requestOrigin: cors.requestOrigin,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (!cors.isOriginAllowed) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: 'Origin not allowed',
        requestOrigin: cors.requestOrigin,
      }),
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get API key from server-side environment (NOT from client)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured in Netlify environment variables');
      console.error('Please set GEMINI_API_KEY in Netlify dashboard: Site settings → Environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({ 
          error: 'API configuration error',
          message: 'Gemini API key is not configured. Please set GEMINI_API_KEY in Netlify environment variables.',
          help: 'See env.template for configuration details or check Netlify dashboard → Site settings → Environment variables'
        }),
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
          ...corsHeaders,
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
          ...corsHeaders,
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
          ...corsHeaders,
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
          ...corsHeaders,
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
        ...corsHeaders,
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
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};

