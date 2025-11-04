/**
 * Netlify Function: Send Account Deletion Verification Email
 * 
 * Sends an email to the user with a verification link to confirm their account deletion request.
 * The user clicks the link to verify, and the support agent can see the verification status.
 * 
 * Uses Postmark for email delivery: https://postmarkapp.com/developer/user-guide/sending-email/sending-with-api
 */

const postmark = require('postmark');

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

    // Check Postmark Server API Token
    const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
    
    if (!POSTMARK_SERVER_TOKEN) {
      console.error('Postmark server token not configured in Netlify environment variables');
      console.error('Please set POSTMARK_SERVER_TOKEN in Netlify dashboard: Site settings → Environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          error: 'Email service not configured',
          message: 'Postmark server token is not configured. Please set POSTMARK_SERVER_TOKEN in Netlify environment variables.',
          help: 'See Postmark integration guide: https://postmarkapp.com/developer/user-guide/sending-email/sending-with-api',
        }),
      };
    }

    // Initialize Postmark client
    const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);

    // Build verification URL
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://wiznote.app';
    const verificationUrl = `${webUrl}/verify-deletion?ticket=${ticketId}&token=${encodeURIComponent(token)}`;

    // Email content
    const emailSubject = 'Verify Your Account Deletion Request';
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.POSTMARK_FROM_NAME || 'WizNote Support';
    
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

    // Send email using Postmark
    try {
      const result = await client.sendEmail({
        From: `${fromName} <${fromEmail}>`,
        To: email,
        Subject: emailSubject,
        HtmlBody: emailHtml,
        TextBody: emailText,
        MessageStream: 'outbound',
      });

      console.log(`Verification email sent successfully to ${email} for ticket ${ticketId}. MessageID: ${result.MessageID}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({
          success: true,
          message: 'Verification email sent successfully',
          messageId: result.MessageID,
        }),
      };
    } catch (sendError) {
      console.error('Postmark error:', sendError);
      
      // Handle Postmark errors
      let errorMessage = 'Failed to send verification email';
      if (sendError && sendError.message) {
        errorMessage = `Postmark error: ${sendError.message}`;
      } else if (sendError && typeof sendError === 'string') {
        errorMessage = `Postmark error: ${sendError}`;
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
        }),
      };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    const isProduction = process.env.NODE_ENV === 'production';
    let errorMessage = 'An error occurred';

    if (error instanceof Error) {
      if (isProduction) {
        errorMessage = 'An error occurred sending the verification email';
      } else {
        errorMessage = error.message;
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

