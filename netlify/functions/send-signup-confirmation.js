/**
 * Netlify Function: Send Signup Confirmation Email
 *
 * Bypasses Supabase's built-in email (which can fail) by:
 * 1. Using Supabase admin generateLink(type: 'signup') - creates user and returns confirmation link
 * 2. Sending the confirmation email via Brevo
 *
 * Uses Brevo (formerly Sendinblue) for email delivery: https://developers.brevo.com/
 */

const brevo = require('@getbrevo/brevo');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Vary': 'Origin',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, password, displayName, redirectTo } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'Missing required fields: email and password' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = secretKey?.startsWith('sb_secret_') ? secretKey : serviceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          error: 'Server configuration error',
          message: 'Supabase credentials not configured.',
        }),
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const defaultRedirectTo = redirectTo || process.env.EXPO_PUBLIC_WEB_URL
      ? `${process.env.EXPO_PUBLIC_WEB_URL}/auth/callback`
      : 'https://wiznote.app/auth/callback';

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim().toLowerCase(),
      password,
      options: {
        redirectTo: defaultRedirectTo,
        data: {
          display_name: displayName || '',
        },
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating signup link:', linkError);
      const msg = linkError?.message || 'Failed to create account';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'An account with this email already exists. Please sign in instead.' }),
        };
      }
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: msg }),
      };
    }

    const confirmationUrl = linkData.properties.action_link;

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          error: 'Email service not configured',
          message: 'BREVO_API_KEY not set in Netlify environment variables.',
        }),
      };
    }

    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.BREVO_FROM_NAME || 'WizNote';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
          <h1 style="color: #6A5ACD; margin-top: 0;">Verify Your WizNote Account</h1>
          <p>Hello${displayName ? ` ${displayName}` : ''},</p>
          <p>Thanks for signing up for WizNote! Click the button below to verify your email and get started:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="display: inline-block; background-color: #6A5ACD; color: #FFFFFF; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email</a>
          </div>
          <p style="font-size: 14px; color: #666;">Or copy this link: ${confirmationUrl}</p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">If you didn't create an account, you can ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email.trim().toLowerCase() }];
    sendSmtpEmail.sender = { email: fromEmail, name: fromName };
    sendSmtpEmail.subject = 'Verify your WizNote account';
    sendSmtpEmail.htmlContent = emailHtml;
    sendSmtpEmail.textContent = `Verify your WizNote account by clicking: ${confirmationUrl}`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      }),
    };
  } catch (error) {
    console.error('Signup confirmation error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
    };
  }
};
