# Brevo Email Setup Guide

This guide explains how to configure Brevo (formerly Sendinblue) for sending account deletion verification emails.

## Overview

Brevo is used to send transactional emails for:
- Account deletion verification emails (when support agents initiate verification)
- Password reset emails (when users request password resets)

Both email types are sent via Netlify functions that use the Brevo API.

## Why Brevo?

Brevo is a comprehensive transactional email service that offers:
- High deliverability rates
- Free tier: 300 emails/day
- Fast email delivery
- Detailed analytics and bounce tracking
- Simple API integration
- No account approval restrictions (unlike some competitors)

## Setup Steps

### 1. Create a Brevo Account

1. Go to [Brevo](https://www.brevo.com/) and sign up for a free account
2. Verify your email address
3. Complete the account setup process

### 2. Generate an API Key

1. Log in to [Brevo Dashboard](https://app.brevo.com/)
2. Click on your name at the top-right corner
3. Select **SMTP & API**
4. Go to the **API keys** tab
5. Click **Generate a new API key**
6. Name your API key (e.g., "WizNote Production")
7. Click **Generate**
8. **Copy the API key immediately** (it will only be shown once)

**Important:** Store your API key securely. You won't be able to see it again after leaving this page.

### 3. Verify Your Sender Email

Before sending emails, you need to verify your sender email:

1. Go to **Settings** → **Sender & IP** → **Senders**
2. Click **Add a sender**
3. Enter your email address (e.g., `support@wiznote.app`)
4. Enter your name (e.g., "WizNote Support")
5. Click **Submit**
6. Check your email inbox for a verification email
7. Click the verification link in the email
8. Once verified, you can use this email as `BREVO_FROM_EMAIL`

**Note:** For production use, you should also set up SPF and DKIM records for better deliverability. See Brevo's documentation for DNS configuration.

### 4. Configure Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
BREVO_API_KEY=your-api-key-here
BREVO_FROM_EMAIL=support@wiznote.app
BREVO_FROM_NAME=WizNote Support
```

**Important:** 
- Replace `your-api-key-here` with your actual Brevo API Key
- Use an email address you've verified in Brevo
- The `BREVO_FROM_NAME` will appear as the sender name in email clients

### 5. Install the Brevo SDK

The Brevo SDK (`@getbrevo/brevo`) is already included in `package.json`. If you need to install it manually:

```bash
npm install @getbrevo/brevo
```

**Note:** The old `sib-api-v3-sdk` package is deprecated. We use the official `@getbrevo/brevo` package.

### 6. Test the Integration

1. Deploy your Netlify function
2. Go to the admin support tool
3. Click "Start Verification" on a deletion request
4. Check the user's email inbox for the verification email
5. Click the verification link to confirm it works
6. Check Brevo dashboard → **Statistics** → **Email** to see delivery status

## Brevo Integration Reference

The implementation follows the [Brevo API Documentation](https://developers.brevo.com/).

### Code Implementation

#### Account Deletion Verification

The account deletion verification email is handled in `netlify/functions/send-deletion-verification.js`:

```javascript
const brevo = require('@getbrevo/brevo');

// Initialize Brevo client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// Send email
const sendSmtpEmail = new brevo.SendSmtpEmail({
  to: [{ email: 'user@example.com' }],
  sender: { email: 'support@wiznote.app', name: 'WizNote Support' },
  subject: 'Verify Your Account Deletion Request',
  htmlContent: emailHtml,
  textContent: emailText,
});

const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
console.log('Email sent:', result.messageId);
```

#### Password Reset

The password reset email is handled in `netlify/functions/send-password-reset.js`:

```javascript
const brevo = require('@getbrevo/brevo');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Generate password reset link using Supabase admin API
const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'recovery',
  email: email,
  options: { redirectTo: redirectUrl },
});

// Initialize Brevo client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

// Send email
const sendSmtpEmail = new brevo.SendSmtpEmail();
sendSmtpEmail.to = [{ email: email }];
sendSmtpEmail.sender = { email: fromEmail, name: fromName };
sendSmtpEmail.subject = 'Reset Your WizNote Password';
sendSmtpEmail.htmlContent = emailHtml;
sendSmtpEmail.textContent = emailText;

const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
console.log('Password reset email sent:', result.messageId);
```

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Verify `BREVO_API_KEY` is set correctly in Netlify
2. **Check Sender Verification**: Ensure the sender email is verified in Brevo
3. **Check Brevo Dashboard**: Look for errors in **Statistics** → **Email**
4. **Check Function Logs**: Review Netlify function logs for errors

### Common Errors

**Error: "Invalid API key"**
- Solution: Verify your API key is correct in Netlify environment variables
- Make sure you copied the full API key (it's a long string)

**Error: "Sender not verified"**
- Solution: Verify your sender email in Brevo (Settings → Sender & IP → Senders)
- Check your email inbox for the verification link

**Error: "Rate limit exceeded"**
- Solution: Check your Brevo plan limits
- Free tier: 300 emails/day
- If you exceed limits, upgrade your plan or wait for the limit to reset

**Error: "Invalid recipient email"**
- Solution: Verify the recipient email address format is correct
- Check that the email address is valid

### Brevo Limits

**Free Tier:**
- 300 emails/day
- No monthly limit
- Basic analytics

**Lite Plan ($25/month):**
- 10,000 emails/month
- Advanced analytics
- Priority support

**Premium Plan ($65/month):**
- 20,000 emails/month
- Advanced analytics
- Dedicated IP option
- Priority support

See [Brevo Pricing](https://www.brevo.com/pricing/) for details.

## Brevo Features

### Transactional Emails

Brevo specializes in transactional emails:
- High deliverability rates
- Fast delivery times
- Detailed tracking
- Bounce and spam complaint handling

### Analytics

View email analytics in Brevo dashboard:
- Delivery rates
- Open rates
- Click rates
- Bounce rates
- Spam complaints
- Unsubscribe rates

### Webhooks

Brevo supports webhooks for:
- Email delivery events
- Bounce notifications
- Spam complaint tracking
- Unsubscribe events

## Security Best Practices

1. **Never commit API keys**: Keep `BREVO_API_KEY` in Netlify environment variables only
2. **Use verified senders**: Always verify sender emails/domains in Brevo
3. **Monitor usage**: Check Brevo dashboard for suspicious activity
4. **Rotate keys**: Regenerate API keys periodically
5. **Use environment variables**: Never hardcode API keys in your code

## Migration from Postmark

If you were previously using Postmark:

1. Remove `POSTMARK_SERVER_TOKEN` from Netlify environment variables
2. Add `BREVO_API_KEY` instead
3. Update `POSTMARK_FROM_EMAIL` → `BREVO_FROM_EMAIL`
4. Update `POSTMARK_FROM_NAME` → `BREVO_FROM_NAME`
5. Verify sender email in Brevo dashboard
6. The function code has already been updated to use Brevo

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/)
- [Brevo Node.js SDK](https://github.com/sendinblue/APIv3-nodejs-library)
- [Brevo Sender Verification](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys)
- [Brevo Best Practices](https://help.brevo.com/hc/en-us/articles/360004303733-Best-practices-for-email-deliverability)
- [Brevo Transactional Email Guide](https://developers.brevo.com/docs/send-a-transactional-email)

