# Mobile IP Detection Fix - Quick Guide

## Problem
Mobile devices (iOS/Android) are not capturing IP addresses in the Security Center because the Netlify Function is not being reached.

## Root Cause
The MobileAuthLogger is getting a **404 Netlify page** instead of reaching the `/.netlify/functions/auth-log` endpoint.

## Solution Steps

### 1. Verify Environment Variable

Check your `.env` file has the correct API URL:

```bash
# Your .env file should have:
EXPO_PUBLIC_API_URL=https://wiznote.app
```

**For Development:**
```bash
EXPO_PUBLIC_API_URL=http://localhost:8888
```

### 2. Deploy the Netlify Function

The function exists at `netlify/functions/auth-log.js` but needs to be deployed to Netlify.

**Check if deployed:**
1. Visit: https://wiznote.app/.netlify/functions/auth-log
2. You should see a JSON error (not HTML 404)
3. If you see HTML 404, the function isn't deployed

**Deploy it:**
```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Add mobile IP detection function"
git push origin main

# Or manually trigger deployment in Netlify dashboard
```

### 3. Set Netlify Environment Variables

In your Netlify dashboard, go to:
**Site settings → Environment variables**

Add these variables:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **IMPORTANT**: Use the `service_role` key (starts with `eyJ...`), not the `anon` key!

### 4. Test the Function

**Test from command line:**
```bash
curl -X POST https://wiznote.app/.netlify/functions/auth-log \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{
    "eventType": "auth.login.success",
    "userEmail": "test@example.com",
    "success": true
  }'
```

**Expected response:**
```json
{
  "success": true,
  "eventId": "some-uuid",
  "capturedIp": "1.2.3.4",
  "message": "Event logged successfully"
}
```

### 5. Restart Your Mobile App

After deploying the function:
1. Close your mobile app completely
2. Reopen it
3. Login again
4. Check the console logs for `[MobileAuthLogger]` messages

## Verification

### Check Console Logs

You should see:
```
[MobileAuthLogger] Initialized with endpoint: https://wiznote.app/.netlify/functions/auth-log
[MobileAuthLogger] Platform: android (or ios)
[MobileAuthLogger] Logging event: { eventType: 'auth.login.success', endpoint: '...', userEmail: '...' }
[MobileAuthLogger] Response status: 200
[MobileAuthLogger] ✅ Event logged successfully: { eventType: '...', capturedIp: '...', eventId: '...' }
```

### Check Security Dashboard

1. Login from mobile app
2. Visit `/admin/security-dashboard` on web
3. Find the recent login event
4. Verify **IP address is populated** (not null)

### SQL Query to Verify

```sql
-- Check if mobile events have IP addresses
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
WHERE event_data->>'platform' IN ('android', 'ios')
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Error: "Failed to log event: <!DOCTYPE html>"

**Problem:** Getting HTML response (404 page)  
**Solution:** Netlify function not deployed or URL is wrong

1. Check EXPO_PUBLIC_API_URL in `.env`
2. Redeploy to Netlify
3. Verify function exists in Netlify dashboard

### Error: "Server configuration error"

**Problem:** Missing Supabase credentials in Netlify  
**Solution:** Add environment variables to Netlify:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Failed to log event" with 500 status

**Problem:** Supabase function error  
**Solution:** Check Netlify function logs:

```bash
netlify functions:log auth-log
```

Look for specific error messages about the `log_security_event` RPC function.

### IP Address Still Null

**Checklist:**
- ✅ Netlify function is deployed and responding
- ✅ Environment variables are set in Netlify
- ✅ EXPO_PUBLIC_API_URL is set in mobile app
- ✅ Mobile app has been restarted
- ✅ Using latest app build

**Still not working?**

Check the MobileAuthLogger endpoint:
```javascript
// Add temporary logging in your app
import { mobileAuthLogger } from './services/MobileAuthLogger';
console.log('Auth endpoint:', mobileAuthLogger['authLogEndpoint']);
```

## Files Changed

- `services/MobileAuthLogger.ts` - Enhanced error logging and debugging
- `netlify.toml` - Ensured functions aren't blocked by redirects
- `netlify/functions/auth-log.js` - Server-side IP capture function

## Expected Results

After implementing this fix:

1. ✅ Mobile devices will capture IP addresses via server-side detection
2. ✅ Security dashboard will show IP addresses for all mobile events
3. ✅ Better error messages in console for troubleshooting
4. ✅ Account lockout system will work properly with mobile IPs

## Support

For additional help:
- Check `docs/MOBILE_IP_CAPTURE.md` for detailed architecture
- Review Netlify function logs for errors
- Check Supabase logs for database errors
- Test the endpoint directly with curl/Postman

