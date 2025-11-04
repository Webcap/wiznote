# Postmark Email Setup Guide

This guide explains how to configure Postmark for sending account deletion verification emails.

## Overview

The account deletion verification system uses Postmark to send verification emails to users. When a support agent clicks "Start Verification", an email is sent to the user with a verification link.

## Why Postmark?

Postmark is a transactional email service that focuses on:
- High deliverability rates
- Fast email delivery
- Detailed analytics and bounce tracking
- Simple API integration

## Setup Steps

### 1. Create a Postmark Account

1. Go to [Postmark](https://postmarkapp.com/) and sign up for a free account
2. Verify your email address

### 2. Create a Server

1. Log in to [Postmark Dashboard](https://account.postmarkapp.com/)
2. Click **Add Server** or go to **Servers**
3. Give it a name (e.g., "WizNote Production")
4. Select **Production** or **Development** server type
5. Click **Create Server**
6. **Copy the Server API Token** (starts with your server ID)

### 3. Verify Your Sender Email

Before sending emails, you need to verify your sender email:

1. Go to **Settings** → **Sender Signatures**
2. Click **Add Signature**
3. Enter your email address (e.g., `support@wiznote.app`)
4. Choose verification method:
   - **SPF/DKIM** (recommended for production) - Add DNS records
   - **Domain Verification** - Verify your entire domain
5. Complete the verification process
6. Use this email as `POSTMARK_FROM_EMAIL`

### 4. Configure Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
POSTMARK_SERVER_TOKEN=your-server-api-token-here
POSTMARK_FROM_EMAIL=support@wiznote.app
POSTMARK_FROM_NAME=WizNote Support
```

**Important:** 
- Replace `your-server-api-token-here` with your actual Postmark Server API Token
- Use an email address you've verified in Postmark
- The `POSTMARK_FROM_NAME` will appear as the sender name in email clients

### 5. Test the Integration

1. Deploy your Netlify function
2. Go to the admin support tool
3. Click "Start Verification" on a deletion request
4. Check the user's email inbox for the verification email
5. Click the verification link to confirm it works
6. Check Postmark dashboard → **Activity** to see delivery status

## Postmark Integration Reference

The implementation follows the [Postmark Node.js SDK](https://postmarkapp.com/developer/api/email-api).

### Code Implementation

The email sending is handled in `netlify/functions/send-deletion-verification.js`:

```javascript
const postmark = require('postmark');

// Initialize Postmark client with server token
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

// Send email
const result = await client.sendEmail({
  From: 'WizNote Support <support@wiznote.app>',
  To: 'user@example.com',
  Subject: 'Verify Your Account Deletion Request',
  HtmlBody: emailHtml,
  TextBody: emailText,
  MessageStream: 'outbound',
});

console.log('Email sent:', result.MessageID);
```

## Troubleshooting

### Email Not Sending

1. **Check Server Token**: Verify `POSTMARK_SERVER_TOKEN` is set correctly in Netlify
2. **Check Sender Verification**: Ensure the sender email is verified in Postmark
3. **Check Postmark Dashboard**: Look for errors in **Activity** → **Message Stream**
4. **Check Function Logs**: Review Netlify function logs for errors

### Common Errors

**Error: "Invalid API token"**
- Solution: Verify your Server API Token is correct in Netlify environment variables

**Error: "Sender signature not verified"**
- Solution: Verify your sender email in Postmark (Settings → Sender Signatures)

**Error: "Rate limit exceeded"**
- Solution: Check your Postmark plan limits (Free tier: 100 emails/month)

### Postmark Limits

- **Free Tier**: 100 emails/month
- **Lite**: $15/month, 10,000 emails/month
- **Pro**: $80/month, 100,000 emails/month
- **Enterprise**: Custom pricing

See [Postmark Pricing](https://postmarkapp.com/pricing) for details.

## Postmark Features

### Message Streams

Postmark supports different message streams:
- **outbound**: Standard transactional emails (default)
- **broadcasts**: Marketing emails

For account deletion verification, we use `outbound` (the default).

### Tracking

Postmark provides:
- Delivery tracking
- Open tracking (optional)
- Click tracking (optional)
- Bounce handling
- Spam complaint tracking

### Analytics

View email analytics in Postmark dashboard:
- Delivery rates
- Open rates
- Click rates
- Bounce rates
- Spam complaints

## Security Best Practices

1. **Never commit API tokens**: Keep `POSTMARK_SERVER_TOKEN` in Netlify environment variables only
2. **Use verified senders**: Always verify sender emails/domains in Postmark
3. **Monitor usage**: Check Postmark dashboard for suspicious activity
4. **Rotate tokens**: Regenerate server tokens periodically

## Migration from SendGrid

If you were previously using SendGrid:

1. Remove `SENDGRID_API_KEY` from Netlify environment variables
2. Add `POSTMARK_SERVER_TOKEN` instead
3. Update `SENDGRID_FROM_EMAIL` → `POSTMARK_FROM_EMAIL`
4. Update `SENDGRID_FROM_NAME` → `POSTMARK_FROM_NAME`
5. Verify sender email in Postmark dashboard
6. The function code has already been updated to use Postmark

## Additional Resources

- [Postmark API Documentation](https://postmarkapp.com/developer/api/email-api)
- [Postmark Node.js SDK](https://github.com/wildbit/postmark.js)
- [Postmark Sender Signatures](https://postmarkapp.com/support/article/1093-how-do-i-set-up-a-sender-signature)
- [Postmark Best Practices](https://postmarkapp.com/developer/user-guide/best-practices)

