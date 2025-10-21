# Mobile IP Detection - Secure Authentication Method

## ✅ Secure Approach (No Service Role Key Needed)

Instead of using a service role key, mobile devices now use their **own authenticated session** to log events. This is more secure because:

- ✅ No sensitive service role key needed in Netlify
- ✅ Users can only log events for themselves  
- ✅ Prevents potential abuse of logging endpoint
- ✅ Follows principle of least privilege

## How It Works

```
┌─────────────────┐
│  Mobile App     │  1. User is logged in (has access token)
│  (iOS/Android)  │  2. MobileAuthLogger gets user's session
└────────┬────────┘
         │ POST with Authorization: Bearer <token>
         ▼
┌─────────────────────────────────┐
│  Netlify Function               │  3. Validates user's token
│  auth-log.js                    │  4. Extracts IP from headers
│                                 │  5. Uses user's auth context
│  Verified user can only log     │
│  events for themselves          │
└────────┬────────────────────────┘
         │ Logs with captured IP
         ▼
┌─────────────────────────────────┐
│  Supabase                       │  ✅ IP address captured
│  security_audit_log             │  ✅ User authenticated
│                                 │  ✅ Secure & verified
└─────────────────────────────────┘
```

## Setup Instructions

### Step 1: Set Netlify Environment Variables

In your Netlify dashboard → Site settings → Environment variables:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note:** You only need the **anon key** (the public one), NOT the service role key!

### Step 2: Deploy the Updated Function

```bash
git add .
git commit -m "Use authenticated session for mobile IP logging"
git push origin main
```

### Step 3: Verify It Works

After deployment completes (2-3 minutes):

1. Open your mobile app
2. Login
3. Check console for:
   ```
   ✅ [MobileAuthLogger] Using authenticated session
   ✅ [MobileAuthLogger] Response status: 200
   ✅ [MobileAuthLogger] Event logged successfully
   ```

4. Check Security Dashboard - IP addresses should appear!

## What Changed

### Before (Required Service Role Key):
```javascript
// Used powerful service role key
const supabase = createClient(url, SERVICE_ROLE_KEY);

// ❌ Security risk if key leaked
// ❌ Required storing sensitive key in Netlify
```

### After (Uses User's Own Session):
```javascript
// Uses user's access token from their session
const { session } = await supabase.auth.getSession();

fetch(endpoint, {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});

// ✅ User can only log their own events
// ✅ No sensitive keys in Netlify
// ✅ More secure architecture
```

## Benefits

1. **Better Security**
   - No service role key exposure risk
   - User-scoped permissions
   - Proper authentication flow

2. **Simpler Setup**
   - Only need public anon key
   - No secret keys to manage
   - Easier to deploy

3. **Proper Auditing**
   - Events are tied to verified users
   - Can't fake user IDs
   - Trustworthy audit trail

## Testing

### Test Command
```bash
# This will fail now (no token) - which is correct!
curl -X POST https://wiznote.app/.netlify/functions/auth-log \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","success":true}'

# Expected: 401 Unauthorized (missing token)
```

### Test from Mobile App
The app automatically includes the auth token, so it will work:

```typescript
// This happens automatically in MobileAuthLogger
await mobileAuthLogger.logLoginSuccess(userId, userEmail);
// ✅ Includes user's session token
// ✅ IP captured on server
// ✅ Event logged securely
```

## Troubleshooting

### Error: "Missing authorization token"
**Good!** This means the function is working and requiring authentication.

For mobile app:
- Ensure user is logged in before logging events
- MobileAuthLogger will automatically get the session

### Error: "Invalid token"
**Check:**
- User's session is still valid
- Tokens haven't expired
- Supabase URL and anon key are correct

### IP Still Not Appearing
**Check:**
1. Function is deployed (wait 2-3 minutes after push)
2. Mobile app has been restarted
3. User successfully logged in
4. Check function logs in Netlify dashboard

## Security Comparison

| Aspect | Service Role Key | Authenticated Session |
|--------|-----------------|----------------------|
| **Security** | ⚠️ High risk if leaked | ✅ User-scoped access |
| **Setup** | Complex (secret key) | Simple (public key) |
| **Permissions** | Full database access | User's permissions only |
| **Abuse Risk** | High | Low |
| **Audit Trail** | Can be spoofed | Verified users only |
| **Best Practice** | ❌ Discouraged | ✅ Recommended |

## Migration Notes

If you had the old service role key approach:

1. ✅ Remove `SUPABASE_SERVICE_ROLE_KEY` from Netlify (optional, won't be used)
2. ✅ Add `EXPO_PUBLIC_SUPABASE_ANON_KEY` to Netlify
3. ✅ Deploy the updated function
4. ✅ Restart mobile app

## Files Modified

- `netlify/functions/auth-log.js` - Now uses authenticated sessions
- `services/MobileAuthLogger.ts` - Sends Authorization header
- `MOBILE_IP_SECURE_FIX.md` - This guide

## Support

If you have issues:
1. Check Netlify environment variables are set
2. Verify function is deployed (check Netlify dashboard → Functions)
3. Check function logs for errors
4. Ensure user is logged in before logging events
5. Restart mobile app after deployment

## Success Criteria

✅ Mobile logins show IP addresses in Security Dashboard  
✅ No service role key needed  
✅ 401 error when testing without token (correct behavior)  
✅ Events only logged for authenticated users  
✅ Secure and scalable architecture  

