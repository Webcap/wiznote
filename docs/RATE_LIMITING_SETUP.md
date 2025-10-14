# Rate Limiting System Setup

## Overview

The WizNote rate limiting system protects authentication endpoints and API routes from brute force attacks and abuse. It provides admin-configurable enforcement with real-time toggle capability.

## Features

- ✅ **Admin-Controlled Toggle**: Enable/disable enforcement via system settings
- ✅ **Real-Time Updates**: Changes take effect within 1 minute (cache expiration)
- ✅ **Configurable Limits**: Customize attempts and time windows
- ✅ **Automatic Tracking**: All attempts logged to database
- ✅ **Graceful Degradation**: Fails open on errors (availability over security)
- ✅ **Comprehensive Logging**: Track attempts for security monitoring
- ✅ **Cleanup Functions**: Automated maintenance for old records

## Architecture

### Components

1. **Database Layer** (`database/rate-limiting-setup.sql`)
   - `rate_limit_attempts` table - Tracks all attempts
   - `check_rate_limit()` function - Verifies if limit exceeded
   - `record_rate_limit_attempt()` function - Logs attempts
   - `cleanup_rate_limit_attempts()` function - Maintenance

2. **Service Layer** (`services/RateLimitService.ts`)
   - `checkAuthRateLimit()` - Check if rate limited
   - `recordAttempt()` - Log attempt to database
   - `checkAndRecordAuthAttempt()` - Combined check + record
   - Admin functions for monitoring

3. **Auth Integration** (`lib/auth.ts`)
   - `isRateLimitEnabled()` - Check if enforcement active
   - `checkAuthRateLimit()` - Helper for checking limits
   - `formatRateLimitError()` - User-friendly error messages

4. **Enforcement** (`services/BetterAuthService.ts`)
   - Pre-authentication rate limit checks
   - Integrated into `signIn()` and `signUp()` flows
   - Automatic error handling and logging

## Database Schema

```sql
CREATE TABLE rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,        -- Email or IP address
  attempt_type TEXT NOT NULL,      -- 'auth_signin', 'auth_signup', 'api_request'
  endpoint TEXT,                   -- Optional: specific endpoint
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes

- `idx_rate_limit_identifier_type` - Fast lookups by identifier + type
- `idx_rate_limit_attempted_at` - Efficient cleanup of old records

## Configuration

### System Settings (Database)

Located in `system_settings` table:

```sql
rate_limit_enabled BOOLEAN           -- Master toggle (default: TRUE)
rate_limit_auth_attempts INTEGER     -- Max attempts (default: 5)
rate_limit_auth_window_minutes INT   -- Time window (default: 15)
rate_limit_api_requests INTEGER      -- API limit (default: 100)
rate_limit_api_window_minutes INT    -- API window (default: 1)
```

### Default Values

- **Auth Attempts**: 5 attempts per 15 minutes
- **API Requests**: 100 requests per 1 minute
- **Enforcement**: Enabled by default (secure)
- **Cache Duration**: 1 minute

## Admin Configuration

### Via Admin Panel

1. Navigate to `/admin/system-settings`
2. Find "Rate Limiting" section
3. Toggle "Enable Rate Limiting" on/off
4. Adjust "Max Auth Attempts" and "Auth Window (minutes)"
5. Click "Save Changes"
6. Changes take effect within 1 minute

### Via Database (Direct)

```sql
-- Enable rate limiting
UPDATE system_settings 
SET rate_limit_enabled = true 
WHERE id = 'default';

-- Disable rate limiting
UPDATE system_settings 
SET rate_limit_enabled = false 
WHERE id = 'default';

-- Adjust limits
UPDATE system_settings 
SET 
  rate_limit_auth_attempts = 10,
  rate_limit_auth_window_minutes = 30
WHERE id = 'default';
```

## Usage

### In Code (Automatic)

Rate limiting is automatically enforced in:

- `signIn()` - Before password verification
- `signUp()` - Before account creation

No additional code needed!

### Manual Check (Custom Endpoints)

```typescript
import { checkAuthRateLimit, formatRateLimitError } from '../lib/auth';

async function customAuthEndpoint(email: string) {
  // Check rate limit
  const rateLimitCheck = await checkAuthRateLimit(email, 'auth_signin');
  
  if (!rateLimitCheck.allowed) {
    throw new Error(formatRateLimitError(rateLimitCheck));
  }
  
  // Proceed with authentication...
}
```

## User Experience

### Allowed Request

User sees normal authentication flow with no interruption.

### Rate Limited Request

User receives error message:

```
Too many attempts. You've made 5 attempts (limit: 5). 
Please try again in 15 minutes.
```

The error includes:
- Current attempt count
- Maximum allowed
- Time until they can retry

## Monitoring

### View Recent Attempts (Admin)

```typescript
import { rateLimitService } from '../services/RateLimitService';

// Get recent auth attempts
const attempts = await rateLimitService.getRecentAuthAttempts(50);

// Get attempts for specific email
const userAttempts = await rateLimitService.getAttempts('user@example.com', 100);
```

### Database Queries

```sql
-- Most attempted emails (last 24 hours)
SELECT 
  identifier, 
  COUNT(*) as attempts,
  MAX(attempted_at) as last_attempt
FROM rate_limit_attempts
WHERE 
  attempt_type = 'auth_signin'
  AND attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY identifier
ORDER BY attempts DESC
LIMIT 20;

-- Recent rate-limited attempts
SELECT *
FROM rate_limit_attempts
WHERE metadata->>'rateLimited' = 'true'
ORDER BY attempted_at DESC
LIMIT 50;
```

## Maintenance

### Automatic Cleanup

Rate limit attempts older than 30 days should be cleaned up regularly.

**Recommended Cron Job:**

```bash
# Daily cleanup at 2 AM
0 2 * * * psql $DATABASE_URL -c "SELECT cleanup_rate_limit_attempts(30);"
```

**Manual Cleanup:**

```sql
-- Cleanup attempts older than 30 days
SELECT cleanup_rate_limit_attempts(30);

-- Cleanup attempts older than 7 days
SELECT cleanup_rate_limit_attempts(7);
```

### Cache Management

The `SystemSettingsService` caches settings for 1 minute. To force refresh:

```typescript
import { systemSettingsService } from '../services/SystemSettingsService';

systemSettingsService.clearCache();
```

## Testing

### Environment Setup

Before testing, ensure your `.env` file has the required keys:

```bash
# Public variables (safe for Expo)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Server-side secret (Node.js scripts only - NEVER expose to client)
# NEW FORMAT (recommended):
SUPABASE_SECRET_KEY=sb_secret_your_actual_secret_key

# OR LEGACY FORMAT (if service role keys are still enabled):
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-actual-service-role-key
```

**Where to find your secret key:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project → **Settings** → **API**
3. Look for **Secret Key** in the "Secret keys" section (starts with `sb_secret_`)
4. If using legacy keys, find **Service Role Key** (JWT format)

### Test Script

Run the comprehensive test suite:

```bash
node scripts/test-rate-limiting.js
```

Tests verify:
- ✅ Rate limit enforcement when enabled
- ✅ Bypass when disabled
- ✅ Attempt tracking
- ✅ Cleanup functions
- ✅ Dynamic setting changes

### Manual Testing

1. **Enable Rate Limiting**
   ```bash
   # Set to 3 attempts per 5 minutes for easy testing
   UPDATE system_settings 
   SET 
     rate_limit_enabled = true,
     rate_limit_auth_attempts = 3,
     rate_limit_auth_window_minutes = 5
   WHERE id = 'default';
   ```

2. **Test Sign-In**
   - Attempt to sign in with wrong password 3 times
   - 4th attempt should show rate limit error
   - Wait 5 minutes, should work again

3. **Disable Enforcement**
   ```bash
   UPDATE system_settings 
   SET rate_limit_enabled = false 
   WHERE id = 'default';
   ```

4. **Test Bypassed**
   - Attempts should succeed regardless of count
   - (Still tracked, just not enforced)

## Security Considerations

### Why Fail Open?

The system fails open (allows requests) on errors to prioritize **availability over security**:

- Database errors shouldn't lock out all users
- Settings service failures shouldn't break authentication
- Better UX for legitimate users

### Rate Limit vs. Account Lockout

These are **separate features**:

- **Rate Limiting**: Temporary throttling based on recent attempts
  - Window: 15 minutes (default)
  - Resets automatically
  - Based on email identifier

- **Account Lockout**: Permanent lock until admin action
  - Duration: 30 minutes or email verification (default)
  - Requires unlock action
  - Based on user account

Both can be enabled simultaneously for defense in depth.

### Identifier Choice

Currently using **email address** as identifier:

- ✅ Works for both sign-in and sign-up
- ✅ Prevents targeted attacks on specific accounts
- ❌ Doesn't prevent distributed attacks from multiple emails

**Future Enhancement**: Consider IP-based rate limiting for API endpoints.

## Troubleshooting

### Issue: Rate limiting not working

**Checklist:**
1. Check database: `SELECT * FROM system_settings WHERE id = 'default';`
2. Verify `rate_limit_enabled = true`
3. Clear cache: `systemSettingsService.clearCache()`
4. Check recent attempts: `SELECT * FROM rate_limit_attempts ORDER BY attempted_at DESC;`
5. Verify database functions exist: `\df check_rate_limit`

### Issue: All users locked out

**Solution:**
```sql
-- Temporarily disable rate limiting
UPDATE system_settings SET rate_limit_enabled = false WHERE id = 'default';

-- Clear recent attempts if needed
DELETE FROM rate_limit_attempts 
WHERE attempted_at > NOW() - INTERVAL '1 hour';

-- Re-enable with higher limits
UPDATE system_settings 
SET 
  rate_limit_enabled = true,
  rate_limit_auth_attempts = 10,
  rate_limit_auth_window_minutes = 15
WHERE id = 'default';
```

### Issue: Database function errors

**Re-run setup:**
```bash
psql $DATABASE_URL < database/rate-limiting-setup.sql
```

## Future Enhancements

### Planned Features

1. **IP-based Rate Limiting**
   - Track by IP address for API endpoints
   - Prevent distributed attacks

2. **Adaptive Limits**
   - Increase limits for verified users
   - Stricter limits during attack patterns

3. **Admin Dashboard**
   - Real-time rate limit monitoring
   - Suspicious activity alerts
   - Block/unblock specific identifiers

4. **Whitelist/Blacklist**
   - Bypass rate limits for trusted IPs/emails
   - Permanent blocks for known bad actors

5. **Geographic Rate Limiting**
   - Different limits by region
   - Block/allow by country

## References

- System Settings: `services/SystemSettingsService.ts`
- Rate Limit Service: `services/RateLimitService.ts`
- Auth Integration: `lib/auth.ts`
- Database Schema: `database/rate-limiting-setup.sql`
- Test Script: `scripts/test-rate-limiting.js`
- Security Plan: `.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md`

## Support

For issues or questions:
1. Check this documentation
2. Review test script output
3. Check security plan for context
4. Contact security team

---

**Last Updated**: October 2025
**Status**: ✅ Fully Implemented with Admin Toggle

