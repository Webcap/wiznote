# SendGrid Email Setup Guide

This guide explains how to configure SendGrid for sending account deletion verification emails.

## Overview

The account deletion verification system uses SendGrid to send verification emails to users. When a support agent clicks "Start Verification", an email is sent to the user with a verification link.

## Setup Steps

### 1. Create a SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/) and sign up for a free account
2. Verify your email address

### 2. Get Your API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "WizNote Deletion Verification")
5. Select **Full Access** or **Restricted Access** with **Mail Send** permissions
6. Click **Create & View**
7. **Copy the API key immediately** (you won't be able to see it again)

### 3. Verify Your Sender Domain/Email

Before sending emails, you need to verify your sender identity:

**Option A: Single Sender Verification (Easiest for testing)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form with your email (e.g., `support@wiznote.app`)
4. Complete the verification process
5. Use this email as `SENDGRID_FROM_EMAIL`

**Option B: Domain Authentication (Recommended for production)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. This allows you to send from any email address on your domain

### 4. Configure Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=support@wiznote.app
SENDGRID_FROM_NAME=WizNote Support
```

**Important:** 
- Replace `SG.xxxx...` with your actual SendGrid API key
- Use an email address you've verified in SendGrid
- The `SENDGRID_FROM_NAME` will appear as the sender name in email clients

### 5. Test the Integration

1. Deploy your Netlify function
2. Go to the admin support tool
3. Click "Start Verification" on a deletion request
4. Check the user's email inbox for the verification email
5. Click the verification link to confirm it works

## SendGrid Integration Reference

The implementation follows the [SendGrid Node.js integration guide](https://app.sendgrid.com/guide/integrate/langs/nodejs).

### Code Implementation

The email sending is handled in `netlify/functions/send-deletion-verification.js`:

```javascript
const sgMail = require('@sendgrid/mail');

// Set API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send email
const msg = {
  to: email,
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'support@wiznote.app',
    name: process.env.SENDGRID_FROM_NAME || 'WizNote Support',
  },
  subject: 'Verify Your Account Deletion Request',
  text: emailText,
  html: emailHtml,
};

await sgMail.send(msg);
```

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Verify `SENDGRID_API_KEY` is set correctly in Netlify
2. **Check Sender Verification**: Ensure the sender email is verified in SendGrid
3. **Check SendGrid Dashboard**: Look for errors in **Activity** → **Email Activity**
4. **Check Function Logs**: Review Netlify function logs for errors

### Common Errors

**Error: "The from address does not match a verified Sender Identity"**
- Solution: Verify your sender email in SendGrid (Settings → Sender Authentication)

**Error: "API key is invalid"**
- Solution: Regenerate your API key in SendGrid and update the Netlify environment variable

**Error: "Mail send quota exceeded"**
- Solution: Upgrade your SendGrid plan or wait for quota reset (Free tier: 100 emails/day)

### SendGrid Limits

- **Free Tier**: 100 emails/day, unlimited recipients
- **Essentials**: $19.95/month, 50,000 emails/month
- **Pro**: $89.95/month, 100,000 emails/month

See [SendGrid Pricing](https://sendgrid.com/pricing/) for details.

## Security Best Practices

1. **Never commit API keys**: Keep `SENDGRID_API_KEY` in Netlify environment variables only
2. **Use restricted API keys**: Create API keys with minimal required permissions
3. **Rotate keys regularly**: Regenerate API keys periodically
4. **Monitor usage**: Check SendGrid dashboard for suspicious activity

## Additional Resources

- [SendGrid Node.js Integration Guide](https://app.sendgrid.com/guide/integrate/langs/nodejs)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [SendGrid Email Templates](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates)

