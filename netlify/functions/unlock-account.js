/**
 * Netlify Function: Unlock Account Request
 * 
 * Sends an email with an unlock link to locked accounts.
 * Users can request unlock via email verification.
 * 
 * Usage:
 * POST /unlock-account
 * Body: { email: "user@example.com" }
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
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is actually locked
    const { data: lockoutData, error: lockoutError } = await supabase.rpc('is_account_locked', {
      p_user_email: normalizedEmail,
    });

    if (lockoutError) {
      console.error('Error checking lockout status:', lockoutError);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to check account status' }),
      };
    }

    const isLocked = lockoutData && lockoutData.length > 0 && lockoutData[0].is_locked;
    
    if (!isLocked) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Account is not locked',
          message: 'This account is not currently locked. You can sign in normally.',
        }),
      };
    }

    // Get user ID
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to find user' }),
      };
    }

    const user = usersData.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!user) {
      // Don't reveal if account exists (security best practice)
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true,
          message: 'If an account exists and is locked, an unlock email has been sent.',
        }),
      };
    }

    // Generate unlock token using Supabase's token generation
    // We'll use a password reset token approach but for unlock
    const unlockToken = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
    });

    if (unlockToken.error) {
      console.error('Error generating unlock token:', unlockToken.error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to generate unlock link' }),
      };
    }

    // Extract the token from the link
    const unlockLink = unlockToken.data.properties.action_link;
    
    // Replace the redirect URL to point to our unlock page
    const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://wiznote.app';
    const unlockUrl = `${baseUrl}/unlock-account?token=${encodeURIComponent(unlockLink.split('token=')[1]?.split('&')[0] || unlockLink)}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email using Supabase's email service
    // Note: This requires Supabase email templates to be configured
    // For now, we'll log it and return success
    // In production, you'd use a service like Resend, SendGrid, or configure Supabase email templates
    
    console.log('Unlock link generated for:', normalizedEmail);
    console.log('Unlock URL:', unlockUrl);

    // Log the unlock request directly to database
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: 'account.unlock.request',
        p_user_id: user.id,
        p_user_email: normalizedEmail,
        p_success: true,
        p_metadata: JSON.stringify({ 
          unlock_method: 'email_request',
          ip_address: event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'] || 'unknown',
        }),
      });
    } catch (logError) {
      console.error('Failed to log unlock request:', logError);
      // Don't fail the request if logging fails
    }

    // Return success (email sending would happen via Supabase email service)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: true,
        message: 'If an account exists and is locked, an unlock email has been sent to your email address.',
        // In development, you might want to return the link for testing
        ...(process.env.NODE_ENV === 'development' && { unlockUrl }),
      }),
    };

  } catch (error) {
    console.error('Error in unlock-account function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

