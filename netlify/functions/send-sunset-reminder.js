/**
 * Netlify Scheduled Function: Send 10-day Sunset Reminder Email
 * 
 * Schedule: Runs daily at 9:00 AM UTC
 */

const { createClient } = require('@supabase/supabase-js');
const brevo = require('@getbrevo/brevo');

exports.handler = async (event, context) => {
  console.log('🌅 Sunset Reminder: Checking if 10-day reminder needs to be sent...');

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseKey = secretKey?.startsWith('sb_secret_') ? secretKey : serviceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Get System Settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (settingsError || !settings) {
      throw new Error(`Failed to fetch system settings: ${settingsError?.message}`);
    }

    // 3. Check if Sunset Mode is Active and Reminder not already sent
    if (!settings.sunset_mode_enabled) {
      console.log('⏩ Sunset mode is not active. Skipping.');
      return { statusCode: 200, body: 'Sunset mode not active' };
    }

    if (settings.sunset_reminder_10_sent) {
      console.log('⏩ 10-day reminder already sent. Skipping.');
      return { statusCode: 200, body: 'Reminder already sent' };
    }

    // 4. Calculate Days Until Shutdown
    const shutdownDate = new Date(settings.sunset_shutdown_date);
    const now = new Date();
    const diffInTime = shutdownDate.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));

    console.log(`📊 Days until shutdown: ${diffInDays}`);

    // We send the reminder if we are 10 days away or closer (but haven't sent yet)
    if (diffInDays > 10) {
      console.log('⏩ Too early for the 10-day reminder. Skipping.');
      return { statusCode: 200, body: `Too early (${diffInDays} days left)` };
    }

    // 5. Fetch All Users
    console.log('👥 Fetching all users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⏩ No users found to notify.');
      return { statusCode: 200, body: 'No users found' };
    }

    console.log(`✅ Found ${users.length} users to notify.`);

    // 6. Initialize Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured.');
    }

    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@wiznote.app';
    const fromName = process.env.BREVO_FROM_NAME || 'WizNote Support';

    // 7. Send Emails in Chunks
    const shutdownDateFormatted = shutdownDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff4f4; border-left: 4px solid #ff4444; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
          <h1 style="color: #d32f2f; margin-top: 0;">Final Reminder: WizNote Shutdown in 10 Days</h1>
          <p style="font-weight: bold; font-size: 18px;">Shutdown Date: ${shutdownDateFormatted}</p>
        </div>
        <p>Hello,</p>
        <p>This is a final reminder that WizNote will be officially shutting down in 10 days. After <strong>${shutdownDateFormatted}</strong>, you will no longer be able to access your notes or account.</p>
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

    console.log('📧 Sending emails...');
    let successCount = 0;
    let errorCount = 0;

    // Send to users one by one (or in small batches)
    // Note: For a large number of users, this should be optimized using Brevo campaigns or batch API
    for (const user of users) {
      if (!user.email) continue;

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: user.email }];
      sendSmtpEmail.sender = { email: fromEmail, name: fromName };
      sendSmtpEmail.subject = 'IMPORTANT: WizNote Shutdown in 10 Days';
      sendSmtpEmail.htmlContent = emailHtml;

      try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err.message);
        errorCount++;
      }
    }

    // 8. Update System Settings to mark as sent
    if (successCount > 0) {
      await supabase
        .from('system_settings')
        .update({ sunset_reminder_10_sent: true })
        .eq('id', 'default');
      
      console.log(`✅ Successfully notified ${successCount} users. ${errorCount} errors.`);
    } else {
      console.log('⚠️ No emails were successfully sent.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Sunset reminder process completed',
        success: successCount,
        errors: errorCount
      })
    };

  } catch (error) {
    console.error('❌ Sunset reminder failed:', error.message);
    return {
      statusCode: 500,
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
