# Supabase Email Verification Setup Guide

## Overview

This guide walks you through configuring Supabase to send email verification emails from **support@webcap.media**.

---

## Step 1: Configure Custom SMTP Provider

Supabase needs an SMTP provider to send emails. You have two options:

### Option A: Use Supabase's Built-in Email Service (Development Only)

⚠️ **Note**: Supabase's default email service has limitations and is not recommended for production.

1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Authentication** → **Email Templates**
4. The default service will work for testing, but has rate limits

### Option B: Configure Custom SMTP Provider (Recommended for Production)

You'll need SMTP credentials for `support@webcap.media`. Common providers:

#### If using Gmail/Google Workspace:
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587` (TLS) or `465` (SSL)
- Username: `support@webcap.media`
- Password: App-specific password (not your regular password)

#### If using Microsoft 365/Outlook:
- SMTP Host: `smtp.office365.com`
- SMTP Port: `587`
- Username: `support@webcap.media`
- Password: Your email password

#### If using a dedicated email service (SendGrid, Mailgun, etc.):
- Follow provider-specific SMTP settings

---

## Step 2: Configure Supabase SMTP Settings

### Via Supabase Dashboard (UI Method)

1. Go to **Supabase Dashboard**
2. Select your WizNote project
3. Navigate to **Project Settings** (gear icon in left sidebar)
4. Go to **Auth** → **SMTP Settings**
5. Click **Enable Custom SMTP**
6. Fill in the form:
   ```
   SMTP Host: smtp.gmail.com (or your provider)
   SMTP Port: 587
   SMTP Username: support@webcap.media
   SMTP Password: [your-app-password]
   Sender Email: support@webcap.media
   Sender Name: WizNote Support
   ```
7. Click **Save**

### Via Supabase CLI (Advanced)

If you prefer infrastructure-as-code:

```bash
# Update your supabase/config.toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[auth.email.smtp]
host = "smtp.gmail.com"
port = 587
user = "support@webcap.media"
pass = "env(SMTP_PASSWORD)"
admin_email = "support@webcap.media"
sender_name = "WizNote Support"
```

---

## Step 3: Configure Email Templates

### 1. Access Email Templates

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. You'll see several templates:
   - **Confirm signup** ← This is for email verification
   - **Invite user**
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

### 2. Customize "Confirm Signup" Template

Click on **Confirm signup** and customize:

```html
<h2>Welcome to WizNote!</h2>

<p>Thanks for signing up. Please confirm your email address by clicking the link below:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>This link expires in 24 hours.</p>

<p>If you didn't sign up for WizNote, you can safely ignore this email.</p>

<p>Best regards,<br>
The WizNote Team<br>
<a href="https://wiznote.app">wiznote.app</a></p>

<hr>
<p style="font-size: 12px; color: #666;">
This email was sent from support@webcap.media
</p>
```

### 3. Configure Email Settings

Scroll down on the same page and configure:

```
From email: support@webcap.media
From name: WizNote Support
Reply-to email: support@webcap.media
```

### 4. Set Redirect URLs

In **Authentication** → **URL Configuration**, set:

```
Site URL: https://your-domain.com
Redirect URLs: 
  - https://your-domain.com/auth/callback
  - https://your-domain.com/*
  - http://localhost:8081/* (for mobile testing)
```

---

## Step 4: Enable Email Confirmation in Supabase

⚠️ **Important**: With our new WizNote system settings implementation, you can leave this setting either enabled or disabled in Supabase. **WizNote system settings will override this**.

However, for consistency, we recommend enabling it:

1. Go to **Authentication** → **Providers**
2. Click on **Email**
3. Enable **Confirm email**
4. Click **Save**

---

## Step 5: Test Email Verification

### Test Script

Run the test to verify current settings:

```bash
node scripts/test-email-verification-settings.js
```

### Manual Test

1. **Ensure WizNote system settings have email verification enabled:**
   - Go to `/admin/system-settings` in your WizNote app
   - Ensure "Email Verification Required" is **ON**

2. **Sign up a new test user:**
   - Use a real email address you can access
   - Fill in signup form
   - Click "Sign Up"

3. **Expected behavior:**
   - User should see: "Please check your email to verify your account"
   - Check the email inbox for `support@webcap.media` message
   - Email should arrive within 1-2 minutes

4. **Check Supabase logs:**
   - Go to **Supabase Dashboard** → **Logs** → **Auth Logs**
   - Look for email sent events
   - Check for any errors

5. **Verify the user:**
   - Click the verification link in the email
   - Should redirect to your app
   - User should now be able to sign in

---

## Step 6: Set Up SMTP Provider (Detailed Instructions)

### For Google Workspace / Gmail

1. **Enable 2-Factor Authentication:**
   - Go to Google Account settings
   - Security → 2-Step Verification → Enable

2. **Generate App Password:**
   - Go to Google Account → Security
   - Scroll to "2-Step Verification"
   - Click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it "Supabase WizNote"
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this)

3. **Add to Supabase:**
   - Use this app password in SMTP settings (not your regular password)

### For Microsoft 365 / Outlook

1. **Enable Modern Authentication:**
   - Usually enabled by default for Microsoft 365

2. **Get SMTP Password:**
   - Use your regular Microsoft 365 password
   - Or create an app password if available

3. **Configure SMTP:**
   ```
   Host: smtp.office365.com
   Port: 587
   User: support@webcap.media
   Password: [your-password]
   ```

### For SendGrid (Recommended for Production)

1. **Create SendGrid Account:**
   - Sign up at https://sendgrid.com
   - Free tier: 100 emails/day

2. **Verify Domain:**
   - Go to Settings → Sender Authentication
   - Verify `webcap.media` domain
   - Add DNS records they provide

3. **Create API Key:**
   - Go to Settings → API Keys
   - Create API key with "Mail Send" permissions
   - Copy the API key

4. **Configure Supabase:**
   ```
   Host: smtp.sendgrid.net
   Port: 587
   User: apikey (literally the word "apikey")
   Password: [your-sendgrid-api-key]
   Sender: support@webcap.media
   ```

### For Mailgun (Alternative)

1. **Create Mailgun Account:**
   - Sign up at https://www.mailgun.com
   - Free tier: 5,000 emails/month

2. **Add Domain:**
   - Add `webcap.media` as verified domain
   - Add DNS records

3. **Get SMTP Credentials:**
   - Go to Sending → Domain Settings
   - Copy SMTP credentials

4. **Configure Supabase:**
   ```
   Host: smtp.mailgun.org
   Port: 587
   User: postmaster@webcap.media
   Password: [mailgun-smtp-password]
   Sender: support@webcap.media
   ```

---

## Step 7: Verify DNS Records (For Custom Domain)

If using a custom SMTP provider with domain verification:

### Required DNS Records

```
# SPF Record (TXT)
v=spf1 include:_spf.google.com ~all
# or for SendGrid:
v=spf1 include:sendgrid.net ~all

# DKIM Record (TXT)
[Provided by your email service]

# DMARC Record (TXT)
v=DMARC1; p=none; rua=mailto:support@webcap.media
```

### Check DNS Propagation

```bash
# Check SPF
nslookup -type=txt webcap.media

# Check MX records
nslookup -type=mx webcap.media
```

---

## Troubleshooting

### Emails Not Sending

1. **Check Supabase Auth Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for SMTP errors

2. **Verify SMTP Credentials:**
   - Test credentials with a tool like Thunderbird or Outlook
   - Ensure username is full email: `support@webcap.media`

3. **Check Port and Security:**
   - Port 587: STARTTLS (most common)
   - Port 465: SSL/TLS
   - Port 25: Usually blocked by cloud providers

4. **Firewall Issues:**
   - Supabase needs outbound access on SMTP ports
   - Usually not an issue with Supabase Cloud

### Emails Going to Spam

1. **Set up SPF, DKIM, DMARC:**
   - Add proper DNS records for `webcap.media`

2. **Use Verified Domain:**
   - Use SendGrid/Mailgun domain verification

3. **Avoid Spam Triggers:**
   - Don't use ALL CAPS in subject
   - Include unsubscribe link (for marketing emails)
   - Use consistent sender address

### User Not Receiving Email

1. **Check user's email validity:**
   ```sql
   SELECT email, email_confirmed_at, confirmation_sent_at
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

2. **Resend verification email manually:**
   - In Supabase Dashboard → Authentication → Users
   - Click on user → "Resend confirmation"

3. **Check email quota:**
   - Gmail/Google Workspace: 500 emails/day
   - SendGrid free: 100 emails/day
   - Mailgun free: 5,000 emails/month

### WizNote Settings Override Not Working

1. **Check system settings:**
   ```bash
   node scripts/test-email-verification-settings.js
   ```

2. **Verify database setting:**
   ```sql
   SELECT email_verification_required 
   FROM system_settings 
   WHERE id = 'default';
   ```

3. **Clear settings cache:**
   - Wait 60 seconds (cache duration)
   - Or restart your application

4. **Check code implementation:**
   - Ensure `lib/auth.ts` has `shouldRequireEmailVerification()` helper
   - Ensure `BetterAuthService.ts` checks system settings

---

## Testing Checklist

- [ ] SMTP credentials configured in Supabase
- [ ] "Confirm signup" email template customized
- [ ] From email set to `support@webcap.media`
- [ ] Redirect URLs configured
- [ ] WizNote system settings: email verification **enabled**
- [ ] Test signup with real email address
- [ ] Verification email received within 2 minutes
- [ ] Verification link works and redirects properly
- [ ] User can sign in after verification
- [ ] User cannot sign in before verification

---

## Production Checklist

### Before Going Live

- [ ] Use production-grade SMTP provider (SendGrid/Mailgun)
- [ ] Set up domain verification (SPF, DKIM, DMARC)
- [ ] Test email delivery to multiple providers (Gmail, Outlook, Yahoo)
- [ ] Configure proper rate limits in SMTP provider
- [ ] Set up email bounce/complaint handling
- [ ] Monitor email delivery rates
- [ ] Have abuse/support email address monitored
- [ ] Include unsubscribe link in marketing emails
- [ ] Follow CAN-SPAM Act / GDPR guidelines

### Monitoring

```sql
-- Check recent signups and verification status
SELECT 
  email,
  created_at,
  email_confirmed_at,
  confirmation_sent_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Verified'
    WHEN confirmation_sent_at IS NOT NULL THEN 'Pending'
    ELSE 'Not Sent'
  END as status
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Quick Reference

### Current Configuration

- **WizNote System Setting**: Enabled ✅ (check via `/admin/system-settings`)
- **Sender Email**: `support@webcap.media`
- **SMTP Provider**: [To be configured]
- **Verification URL**: `{your-domain}/auth/callback`

### Admin Controls

- **Enable/Disable**: `/admin/system-settings` → "Email Verification Required"
- **View Logs**: Run `node scripts/test-email-verification-settings.js`
- **Check Status**: Query `system_settings` table

### Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/auth/auth-email
- **SendGrid Docs**: https://docs.sendgrid.com/
- **WizNote Email Guide**: `docs/EMAIL_VERIFICATION_SETUP.md`
- **Fix Summary**: `docs/EMAIL_VERIFICATION_FIX_SUMMARY.md`

---

## Summary

1. ✅ Choose SMTP provider (Gmail, SendGrid, Mailgun)
2. ✅ Configure SMTP settings in Supabase Dashboard
3. ✅ Customize email templates with `support@webcap.media`
4. ✅ Set up domain verification (SPF, DKIM, DMARC)
5. ✅ Enable email verification in WizNote system settings
6. ✅ Test with real email address
7. ✅ Monitor delivery and adjust as needed

**Your WizNote app is now ready to send verification emails from support@webcap.media!** 🎉

