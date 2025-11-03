# Mobile IP Address Capture - Server-Side Implementation

This document explains how mobile apps (iOS/Android) capture real IP addresses through server-side logging.

## Overview

**Problem**: Mobile apps can't reliably capture their own public IP addresses client-side due to:
- Carrier NAT/VPN configurations
- OS privacy restrictions
- Network complexity
- Performance impact

**Solution**: Server-side IP capture through Netlify Functions

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (iOS/Android)  │
└────────┬────────┘
         │ 1. Auth event
         │    (no IP yet)
         ▼
┌─────────────────────────────────┐
│  Netlify Function               │
│  /.netlify/functions/auth-log   │
│                                 │
│  2. Extract IP from headers:    │
│     - x-forwarded-for           │
│     - x-real-ip                 │
│     - client-ip                 │
└────────┬────────────────────────┘
         │ 3. Log to Supabase
         │    with captured IP
         ▼
┌─────────────────────────────────┐
│  Supabase                       │
│  security_audit_log             │
│  ✅ ip_address populated        │
└─────────────────────────────────┘
```

## Components

### 1. Netlify Function (`netlify/functions/auth-log.js`)

Serverless function that:
- Receives auth events from mobile apps
- Extracts real IP from request headers
- Logs to Supabase with captured IP
- Returns confirmation to mobile app

### 2. Mobile Auth Logger (`services/MobileAuthLogger.ts`)

Client-side service that:
- Sends auth events to Netlify Function
- Handles errors gracefully
- Provides helper methods for common events

### 3. Auth Helper Integration (`lib/auth.ts`)

Routes logging based on platform:
- **Web**: Direct to SecurityLoggingService (client-side IP)
- **Mobile**: Through MobileAuthLogger (server-side IP)

## Setup

### Step 1: Add Environment Variable

Add to your `.env`:

```env
# API URL for mobile security logging
EXPO_PUBLIC_API_URL=https://your-site.netlify.app
```

**Development**: Use `http://localhost:8888` (Netlify Dev)  
**Production**: Use your Netlify domain

### Step 2: Deploy Netlify Function

The function at `netlify/functions/auth-log.js` will automatically deploy with your Netlify site.

**Required Netlify Environment Variables**:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_key (recommended, NEW format)
# OR legacy format (if still enabled):
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Test the Function

```bash
# Test locally with Netlify Dev
netlify dev

# Test the endpoint
curl -X POST http://localhost:8888/.netlify/functions/auth-log \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "auth.login.success",
    "userId": "test-user",
    "userEmail": "test@example.com",
    "success": true
  }'
```

## Usage

### Automatic (Recommended)

Once set up, all auth events from mobile apps automatically use server-side IP capture:

```typescript
// In your auth service - this already works!
await logAuthEvent(
  'auth.login.success',
  user.id,
  user.email,
  true
);
// ✅ Automatically routes through Netlify Function on mobile
// ✅ IP address captured server-side
```

### Manual (Advanced)

Direct usage of mobile logger:

```typescript
import { mobileAuthLogger } from '../services/MobileAuthLogger';

// Log login success
await mobileAuthLogger.logLoginSuccess(
  userId,
  userEmail,
  { customField: 'value' }
);

// Log login failure
await mobileAuthLogger.logLoginFailure(
  userEmail,
  'Invalid credentials',
  { attemptCount: 3 }
);

// Custom event
await mobileAuthLogger.logAuthEvent('auth.logout', {
  userId,
  userEmail,
  success: true,
});
```

## Verification

### Check in Security Dashboard

1. Login from mobile app (iOS/Android)
2. Visit `/admin/security-dashboard` on web
3. Check "Recent Security Events"
4. Verify IP address is populated

### SQL Query

```sql
-- Check recent mobile logins with IP addresses
SELECT 
  created_at,
  event_type,
  user_email,
  ip_address,
  user_agent,
  event_data->>'platform' as platform,
  CASE 
    WHEN ip_address IS NOT NULL THEN '✅ Has IP'
    ELSE '❌ No IP'
  END as ip_status
FROM security_audit_log
WHERE user_agent LIKE '%android%' OR user_agent LIKE '%ios%'
ORDER BY created_at DESC
LIMIT 20;
```

## IP Header Priority

The function checks headers in this order:

1. `x-forwarded-for` (most reliable, includes client IP)
2. `x-real-ip` (Cloudflare, some proxies)
3. `client-ip` (some load balancers)
4. `context.clientContext.ip` (Netlify context)
5. `'unknown'` (fallback)

## Security Considerations

### Authentication

**Current**: No authentication on the function (logs are write-only)

**Why it's safe**:
- Logs are append-only (can't modify existing data)
- Requires valid Supabase user IDs/emails
- Admin dashboard requires authentication to view
- Rate limiting at Supabase level

**Optional hardening** (if concerned about abuse):

```javascript
// Add to auth-log.js
const VALID_API_KEY = process.env.MOBILE_LOGGER_API_KEY;

// Check API key
const apiKey = event.headers['x-api-key'];
if (apiKey !== VALID_API_KEY) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}
```

### Rate Limiting

Consider adding rate limiting if you experience abuse:

```javascript
// Use Netlify's rate limiting
// Add to netlify.toml:
[[plugins]]
  package = "@netlify/plugin-rate-limit"
  
  [plugins.inputs]
    routes = ["/.netlify/functions/auth-log"]
    maxRequests = 100
    windowInSeconds = 60
```

## Troubleshooting

### IP Not Showing

**Check 1**: Verify environment variable
```bash
echo $EXPO_PUBLIC_API_URL
# Should show your Netlify domain
```

**Check 2**: Check function logs
```bash
netlify functions:log auth-log
```

**Check 3**: Test function directly
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/auth-log \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"eventType":"auth.login.success","userEmail":"test@example.com","success":true}'
```

### Function Not Deploying

**Check**: Netlify build logs
```bash
netlify build --dry
```

**Verify**: Function is detected
```bash
netlify functions:list
# Should show: auth-log
```

### Wrong IP Address

If the IP doesn't match your actual IP:
- You're behind a proxy/VPN
- Using mobile carrier NAT (expected)
- The captured IP is the carrier's gateway (this is correct!)

## Platform Comparison

| Platform | IP Capture Method | IP Source |
|----------|------------------|-----------|
| **Web** | Client-side (ipify API) | User's direct IP |
| **iOS** | Server-side (Netlify) | Carrier gateway IP |
| **Android** | Server-side (Netlify) | Carrier gateway IP |

## Cost Considerations

**Netlify Functions**:
- Free tier: 125K requests/month
- Typical usage: ~5-10 auth events per user per day
- 1000 users = 5-10K requests/month (well within free tier)

**Alternative**: If you exceed limits, consider:
1. Caching recent IPs per user (reduce redundant calls)
2. Only logging critical events (login failures, suspicious activity)
3. Using a dedicated backend service

## Future Enhancements

Potential improvements:

1. **IP Geolocation**: Add location data
   ```javascript
   const geo = await fetch(`https://ipapi.co/${ip}/json/`);
   ```

2. **Suspicious IP Detection**: Flag known malicious IPs
3. **IP-based Rate Limiting**: Additional security layer
4. **Analytics**: Track login patterns by region

## Related Documentation

- [Security Logging Setup](./SECURITY_LOGGING_SETUP.md)
- [Account Lockout Setup](./ACCOUNT_LOCKOUT_SETUP.md)
- [Security Dashboard](./SECURITY_DASHBOARD.md)

## Support

For issues with mobile IP capture:
1. Check Netlify function logs
2. Verify environment variables
3. Test with curl/Postman
4. Review Supabase logs

