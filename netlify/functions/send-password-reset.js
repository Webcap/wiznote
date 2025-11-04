/**
 * Netlify Function: Send Password Reset Email
 * 
 * Generates a password reset link using Supabase admin API and sends it via Brevo.
 * 
 * Uses Brevo (formerly Sendinblue) for email delivery: https://developers.brevo.com/
 */

const brevo = require('@getbrevo/brevo');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Get origin from request headers
  const origin = event.headers.origin || event.headers.Origin || '*';
  
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Vary': 'Origin',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

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
    const { email, redirectTo } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Missing required field: email',
        }),
      };
    }

    // Initialize Supabase admin client to generate reset link
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Server configuration error',
          message: 'Supabase credentials are not configured.',
        }),
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate password reset link using Supabase admin API
    const defaultRedirectTo = redirectTo || (process.env.EXPO_PUBLIC_WEB_URL 
      ? `${process.env.EXPO_PUBLIC_WEB_URL}/reset-password`
      : 'https://wiznote.app/reset-password');
    
    console.log('Generating password reset link for:', email);
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: defaultRedirectTo,
      },
    });

    if (resetError || !resetData) {
      console.error('Error generating reset link:', resetError);
      // Don't reveal if user exists or not for security
      return {
        statusCode: 200, // Return 200 to prevent user enumeration
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        }),
      };
    }

    const resetUrl = resetData.properties.action_link;
    console.log('Password reset link generated successfully');

    // Check Brevo API Key
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    
    if (!BREVO_API_KEY) {
      console.error('Brevo API key not configured in Netlify environment variables');
      console.error('Please set BREVO_API_KEY in Netlify dashboard: Site settings → Environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Email service not configured',
          message: 'Brevo API key is not configured. Please set BREVO_API_KEY in Netlify environment variables.',
          help: 'See Brevo integration guide: https://developers.brevo.com/',
        }),
      };
    }

    // Initialize Brevo client
    let apiInstance;
    try {
      apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
      console.log('Brevo client initialized successfully');
    } catch (initError) {
      console.error('Error initializing Brevo client:', initError);
      throw new Error(`Failed to initialize Brevo client: ${initError.message}`);
    }

    // Email content
    const emailSubject = 'Reset Your WizNote Password';
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.BREVO_FROM_NAME || 'WizNote Support';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #6A5ACD; margin-top: 0;">Reset Your Password</h1>
          
          <p>Hello,</p>
          
          <p>We received a request to reset your WizNote account password. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #6A5ACD; color: #FFFFFF; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #856404;">⚠️ Important:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link will expire after 1 hour</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password will not change unless you click the link above</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please contact our support team at 
            <a href="mailto:support@wiznote.app" style="color: #6A5ACD;">support@wiznote.app</a>
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated email. Please do not reply.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Reset Your WizNote Password

Hello,

We received a request to reset your WizNote account password. Click the link below to create a new password:

${resetUrl}

⚠️ Important:
- This link will expire after 1 hour
- If you didn't request this, please ignore this email
- Your password will not change unless you click the link above

If you have any questions or concerns, please contact our support team at support@wiznote.app

This is an automated email. Please do not reply.
    `;

    // Send email using Brevo
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: email }];
      sendSmtpEmail.sender = { email: fromEmail, name: fromName };
      sendSmtpEmail.subject = emailSubject;
      sendSmtpEmail.htmlContent = emailHtml;
      sendSmtpEmail.textContent = emailText;

      console.log('Sending password reset email with Brevo:', {
        to: sendSmtpEmail.to,
        sender: sendSmtpEmail.sender,
        subject: sendSmtpEmail.subject,
      });

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log(`Password reset email sent successfully to ${email}. MessageID: ${result.messageId}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          success: true,
          message: 'Password reset email sent successfully',
          messageId: result.messageId,
        }),
      };
    } catch (sendError) {
      console.error('Brevo error:', sendError);
      console.error('Brevo error stack:', sendError.stack);
      console.error('Brevo error response:', sendError.response);
      
      // Handle Brevo errors with better error messages
      let errorMessage = 'Failed to send password reset email';
      let errorCode = 'EMAIL_SEND_ERROR';
      let errorDetails = null;
      
      if (sendError && sendError.response) {
        // Brevo API error response
        if (sendError.response.body) {
          const errorBody = sendError.response.body;
          errorDetails = errorBody;
          if (errorBody.message) {
            errorMessage = `Brevo error: ${errorBody.message}`;
          } else if (errorBody.error) {
            errorMessage = `Brevo error: ${errorBody.error}`;
          } else if (typeof errorBody === 'string') {
            errorMessage = `Brevo error: ${errorBody}`;
          }
        }
        if (sendError.response.statusCode) {
          errorMessage += ` (Status: ${sendError.response.statusCode})`;
        }
      } else if (sendError && sendError.message) {
        errorMessage = `Brevo error: ${sendError.message}`;
        errorDetails = sendError.message;
      } else if (sendError && typeof sendError === 'string') {
        errorMessage = `Brevo error: ${sendError}`;
        errorDetails = sendError;
      } else {
        errorDetails = JSON.stringify(sendError);
      }
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Failed to send email',
          message: errorMessage,
          errorCode: errorCode,
          details: errorDetails,
        }),
      };
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor?.name);
    
    const isProduction = process.env.NODE_ENV === 'production';
    let errorMessage = 'An error occurred';
    let errorDetails = null;

    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
      if (isProduction) {
        errorMessage = 'An error occurred sending the password reset email';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
    } else {
      errorDetails = JSON.stringify(error);
      errorMessage = String(error);
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        help: 'Check Netlify function logs for more details. If this persists, verify BREVO_API_KEY is set correctly in Netlify environment variables.',
      }),
    };
  }
};

