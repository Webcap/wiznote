# How Email Sending Works

## Overview

The account deletion verification email is sent using **SendGrid** via a Netlify serverless function. Here's how the complete flow works:

## Email Sending Flow

```
1. Support Agent clicks "Start Verification"
   ↓
2. Frontend calls SupportService.startVerification()
   ↓
3. SupportService generates verification token
   ↓
4. SupportService calls Netlify function: /.netlify/functions/send-deletion-verification
   ↓
5. Netlify Function (send-deletion-verification.js):
   - Receives: email, ticketId, token
   - Gets SendGrid API key from environment variable
   - Initializes SendGrid client: sgMail.setApiKey(SENDGRID_API_KEY)
   - Creates email message (HTML + text)
   - Calls: await sgMail.send(msg)
   ↓
6. SendGrid API:
   - Receives HTTP POST request from Netlify function
   - Validates API key
   - Validates sender email (must be verified)
   - Queues email for delivery
   ↓
7. SendGrid delivers email to user's inbox
   ↓
8. User receives email with verification link
   ↓
9. User clicks link → Verification completed
```

## Technical Details

### 1. **Netlify Function** (`netlify/functions/send-deletion-verification.js`)

The function:
- Uses `@sendgrid/mail` package (installed in root `package.json`)
- Requires `SENDGRID_API_KEY` environment variable
- Builds HTML and text email content
- Calls SendGrid's API via `sgMail.send(msg)`

### 2. **SendGrid Package** (`@sendgrid/mail`)

- **Installed**: Yes, in root `package.json` as `"@sendgrid/mail": "^8.1.6"`
- **How it works**: Makes HTTP requests to SendGrid's REST API
- **API Endpoint**: `https://api.sendgrid.com/v3/mail/send`

### 3. **SendGrid API**

When `sgMail.send(msg)` is called:
- It makes a POST request to SendGrid's API
- Sends email data (to, from, subject, html, text)
- SendGrid validates the request
- SendGrid queues the email for delivery
- Returns success/error response

## Required Configuration

### Netlify Environment Variables

Set these in Netlify dashboard → Site settings → Environment variables:

```
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=support@wiznote.app
SENDGRID_FROM_NAME=WizNote Support
```

### SendGrid Setup

1. **Create SendGrid Account**: https://sendgrid.com/
2. **Get API Key**: Settings → API Keys → Create API Key
3. **Verify Sender Email**: Settings → Sender Authentication
   - Either verify a single sender email
   - Or authenticate your entire domain (recommended)

## Code Flow Example

```javascript
// In send-deletion-verification.js

// 1. Initialize SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 2. Create email message
const msg = {
  to: 'user@example.com',
  from: {
    email: 'support@wiznote.app',
    name: 'WizNote Support',
  },
  subject: 'Verify Your Account Deletion Request',
  html: '<html>...</html>',
  text: 'Plain text version...',
};

// 3. Send via SendGrid API
await sgMail.send(msg);
// This makes an HTTP POST to https://api.sendgrid.com/v3/mail/send
// SendGrid then delivers the email to the recipient
```

## Why Netlify Functions?

Netlify Functions are serverless functions that:
- Run on Netlify's infrastructure
- Have access to `node_modules` from your project
- Can use environment variables securely
- Don't expose API keys to the client
- Handle CORS automatically (when configured)

## Testing

To test if emails are sending:

1. **Check Netlify Function Logs**:
   - Netlify dashboard → Functions → send-deletion-verification
   - Look for success/error messages

2. **Check SendGrid Dashboard**:
   - Activity → Email Activity
   - See if emails were sent/delivered

3. **Check User's Inbox**:
   - Look in inbox and spam folder
   - Verify the email contains the verification link

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Verify `SENDGRID_API_KEY` is set in Netlify
2. **Check Sender Verification**: Email must be verified in SendGrid
3. **Check Function Logs**: Look for error messages
4. **Check SendGrid Dashboard**: See if SendGrid received the request

### Common Errors

- **"Invalid API key"**: API key not set or incorrect
- **"Sender not verified"**: Email address not verified in SendGrid
- **"Quota exceeded"**: Free tier limit reached (100/day)

## Package Dependencies

The `@sendgrid/mail` package is:
- ✅ Installed in root `package.json`
- ✅ Available to Netlify functions (they use root `node_modules`)
- ✅ Makes HTTP requests to SendGrid's API
- ✅ Requires internet connection (Netlify functions have this)

## Summary

Emails are sent by:
1. Netlify function calls SendGrid's API
2. SendGrid API validates and queues the email
3. SendGrid delivers the email to the recipient's mail server
4. User receives email in their inbox

The actual email delivery is handled by SendGrid's infrastructure, not by Netlify or your application directly.

