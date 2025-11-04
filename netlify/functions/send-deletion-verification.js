/**
 * Netlify Function: Send Account Deletion Verification Email
 * 
 * Sends an email to the user with a verification link to confirm their account deletion request.
 * The user clicks the link to verify, and the support agent can see the verification status.
 * 
 * Uses Brevo (formerly Sendinblue) for email delivery: https://developers.brevo.com/
 */

const brevo = require('@getbrevo/brevo');

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
    const { email, ticketId, token } = JSON.parse(event.body || '{}');

    if (!email || !ticketId || !token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Missing required fields: email, ticketId, token',
        }),
      };
    }

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
      // Set API key using the setApiKey method
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
      console.log('Brevo client initialized successfully');
    } catch (initError) {
      console.error('Error initializing Brevo client:', initError);
      throw new Error(`Failed to initialize Brevo client: ${initError.message}`);
    }

    // Build verification URL
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://wiznote.app';
    const verificationUrl = `${webUrl}/verify-deletion?ticket=${ticketId}&token=${encodeURIComponent(token)}`;

    // Email content
    const emailSubject = 'Verify Your Account Deletion Request';
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.BREVO_FROM_NAME || 'WizNote Support';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Account Deletion Request</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #6A5ACD; margin-top: 0;">Verify Your Account Deletion Request</h1>
          
          <p>Hello,</p>
          
          <p>You recently requested to delete your WizNote account. To proceed with the deletion, please verify this request by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #DC3545; color: #FFFFFF; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Verify Account Deletion
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #856404;">⚠️ Important:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link will expire after 24 hours</li>
              <li>Once verified, your account deletion will be processed</li>
              <li>This action cannot be undone</li>
              <li>If you did not request this, please ignore this email</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please contact our support team at 
            <a href="mailto:support@wiznote.app" style="color: #6A5ACD;">support@wiznote.app</a>
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Ticket ID: ${ticketId}<br>
            This is an automated email. Please do not reply.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Verify Your Account Deletion Request

Hello,

You recently requested to delete your WizNote account. To proceed with the deletion, please verify this request by clicking the link below:

${verificationUrl}

⚠️ Important:
- This link will expire after 24 hours
- Once verified, your account deletion will be processed
- This action cannot be undone
- If you did not request this, please ignore this email

If you have any questions or concerns, please contact our support team at support@wiznote.app

Ticket ID: ${ticketId}
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

      console.log('Sending email with Brevo:', {
        to: sendSmtpEmail.to,
        sender: sendSmtpEmail.sender,
        subject: sendSmtpEmail.subject,
      });

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log(`Verification email sent successfully to ${email} for ticket ${ticketId}. MessageID: ${result.messageId}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          success: true,
          message: 'Verification email sent successfully',
          messageId: result.messageId,
        }),
      };
    } catch (sendError) {
      console.error('Brevo error:', sendError);
      console.error('Brevo error stack:', sendError.stack);
      console.error('Brevo error response:', sendError.response);
      
      // Handle Brevo errors with better error messages
      let errorMessage = 'Failed to send verification email';
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
          help: 'If this is a Brevo account issue, you can use the Admin Override feature to verify the deletion request without email verification.',
        }),
      };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
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
        errorMessage = 'An error occurred sending the verification email';
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

