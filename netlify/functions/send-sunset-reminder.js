/**
 * Netlify Function: Send Sunset Reminder Email
 * 
 * Supports both:
 * 1. Scheduled CRON execution (daily at 9:00 AM UTC)
 * 2. Manual trigger via POST (admin only)
 */

const { createClient } = require('@supabase/supabase-js');
const brevo = require('@getbrevo/brevo');

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers: corsHeaders, 
      body: '' 
    };
  }

  console.log(`🌅 Sunset Reminder: Execution started (${event.httpMethod})...`);

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = secretKey?.startsWith('sb_secret_') ? secretKey : serviceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Authentication and Authorization (for manual triggers)
    let isManual = event.httpMethod === 'POST';
    let manualDays = null;
    let isTestOnly = false;

    if (isManual) {
      const authHeader = event.headers['authorization'] || event.headers['Authorization'];
      const accessToken = authHeader?.replace('Bearer ', '');

      if (!accessToken) {
        return { 
          statusCode: 401, 
          headers: corsHeaders, 
          body: JSON.stringify({ error: 'Unauthorized: Missing token' }) 
        };
      }

      // Verify user via token
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
      if (authError || !user) {
        return { 
          statusCode: 401, 
          headers: corsHeaders, 
          body: JSON.stringify({ error: 'Unauthorized: Invalid token' }) 
        };
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        return { 
          statusCode: 403, 
          headers: corsHeaders, 
          body: JSON.stringify({ error: 'Forbidden: Admin access required' }) 
        };
      }

      // Parse body
      try {
        const body = JSON.parse(event.body || '{}');
        manualDays = body.days;
        isTestOnly = !!body.testOnly;
      } catch (e) {
        console.warn('Failed to parse body:', e);
      }
    }

    // 3. Get System Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (settingsError || !settings) {
      throw new Error(`Failed to fetch system settings: ${settingsError?.message}`);
    }

    // 4. Decision Logic
    const shutdownDate = new Date(settings.sunset_shutdown_date);
    const now = new Date();
    const diffInTime = shutdownDate.getTime() - now.getTime();
    const actualDiffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
    
    // Use manual days if provided, otherwise use calculated days
    const daysToReport = manualDays !== null ? manualDays : actualDiffInDays;

    if (!isManual) {
      // Scheduled CRON checks
      if (!settings.sunset_mode_enabled) {
        return { 
          statusCode: 200, 
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Sunset mode not active' }) 
        };
      }

      if (settings.sunset_reminder_10_sent) {
        return { 
          statusCode: 200, 
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Reminder already sent' }) 
        };
      }

      // Scheduled function only triggers at exactly 10 days (or closer if missed)
      if (actualDiffInDays > 10) {
        return { 
          statusCode: 200, 
          headers: corsHeaders,
          body: JSON.stringify({ message: `Too early (${actualDiffInDays} days left)` }) 
        };
      }
    }

    console.log(`📊 Days to report in email: ${daysToReport}${isTestOnly ? ' (TEST ONLY - Admins only)' : ''}`);

    // 5. Fetch Users to notify
    let usersToNotify = [];
    if (isTestOnly) {
      console.log('👥 Fetching admin users for test...');
      const { data: adminProfiles, error: adminError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin');
      
      if (adminError) throw new Error(`Failed to fetch admin profiles: ${adminError.message}`);
      
      // Get full user objects to ensure we have current emails
      for (const p of adminProfiles) {
        const { data: { user }, error: uError } = await supabaseAdmin.auth.admin.getUserById(p.id);
        if (!uError && user) usersToNotify.push(user);
      }
    } else {
      console.log('👥 Fetching all users...');
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
      usersToNotify = users || [];
    }

    if (usersToNotify.length === 0) {
      console.log('⏩ No users found to notify.');
      return { 
        statusCode: 200, 
        headers: corsHeaders, 
        body: JSON.stringify({ message: 'No users found' }) 
      };
    }

    console.log(`✅ Found ${usersToNotify.length} users to notify.`);

    // 6. Initialize Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not configured.');

    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.BREVO_FROM_NAME || 'WizNote Support';

    // 7. Prepare Email Content
    const shutdownDateFormatted = shutdownDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff4f4; border-left: 4px solid #ff4444; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
          <h1 style="color: #d32f2f; margin-top: 0;">${isTestOnly ? '[TEST] ' : ''}Final Reminder: WizNote Shutdown in ${daysToReport} Days</h1>
          <p style="font-weight: bold; font-size: 18px;">Shutdown Date: ${shutdownDateFormatted}</p>
        </div>
        <p>Hello,</p>
        <p>This is a final reminder that WizNote will be officially shutting down in ${daysToReport} days. After <strong>${shutdownDateFormatted}</strong>, you will no longer be able to access your notes or account.</p>
        <p><strong>Action Required:</strong> If you have any important data stored in WizNote, please log in now to export or copy your notes before the platform is decommissioned.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://wiznote.app/login" style="display: inline-block; background-color: #6A5ACD; color: #FFFFFF; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Log In to Export Data</a>
        </div>
        <p>We want to thank you for being a part of WizNote. We apologize for any inconvenience this decommissioning may cause.</p>
        <p>Sincerely,<br>The WizNote Team</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">This is a mandatory system notification regarding the status of your account.</p>
      </body>
      </html>
    `;

    // 8. Send Emails
    console.log(`📧 Sending ${isTestOnly ? 'TEST ' : ''}emails...`);
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToNotify) {
      if (!user.email) continue;
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: user.email }];
      sendSmtpEmail.sender = { email: fromEmail, name: fromName };
      sendSmtpEmail.subject = `${isTestOnly ? '[TEST] ' : ''}IMPORTANT: WizNote Shutdown in ${daysToReport} Days`;
      sendSmtpEmail.htmlContent = emailHtml;

      try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err.message);
        errorCount++;
      }
    }

    // 9. Update tracking if this was the official 10-day reminder (scheduled or manual)
    if (!isTestOnly && daysToReport <= 10 && successCount > 0) {
      await supabaseAdmin
        .from('system_settings')
        .update({ sunset_reminder_10_sent: true })
        .eq('id', 'default');
      console.log('✅ Updated sunset_reminder_10_sent flag in settings.');
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: isTestOnly ? 'Test emails sent to admins' : 'Sunset reminder process completed',
        success: successCount,
        errors: errorCount,
        daysReported: daysToReport
      })
    };

  } catch (error) {
    console.error('❌ Sunset reminder failed:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Netlify Scheduled Function Config
 */
exports.config = {
  schedule: "0 9 * * *" // 9 AM UTC daily
};
