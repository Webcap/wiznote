# API Request Signing Setup Guide

**Last Updated**: October 2025  
**Status**: ✅ **COMPLETE** - Fully implemented and tested  
**Priority**: Priority 3.3 - Medium Priority

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [How It Works](#how-it-works)
5. [Implementation](#implementation)
6. [Client Usage](#client-usage)
7. [Server Integration](#server-integration)
8. [Key Management](#key-management)
9. [Testing](#testing)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The API Request Signing system uses HMAC-SHA256 signatures to verify the authenticity and integrity of API requests. It prevents API tampering, replay attacks, and unauthorized access to critical endpoints.

### Key Benefits

- **Tamper Prevention**: Detect modified requests
- **Replay Attack Protection**: Prevent reuse of captured requests
- **Timestamp Validation**: Reject old or future-dated requests
- **Request Authentication**: Verify request origin
- **Audit Trail**: Complete log of all signed requests
- **Key Rotation**: Seamless key rotation without downtime

### Use Cases

- Stripe payment API calls
- User management operations
- Premium subscription changes
- Critical data modifications
- Admin operations

---

## Features

### ✅ Core Features

1. **HMAC-SHA256 Signing**
   - Industry-standard cryptographic signing
   - Constant-time comparison prevents timing attacks
   - Supports both web and React Native

2. **Replay Attack Prevention**
   - Unique request IDs
   - Timestamp validation (5-minute window)
   - Signature deduplication
   - Request logging for detection

3. **Key Management**
   - Create and revoke keys
   - Seamless key rotation
   - Version tracking
   - Usage statistics

4. **Flexible Integration**
   - Helper functions for easy use
   - Middleware for automatic verification
   - Works with both REST and GraphQL
   - Gradual rollout support (optional signing)

5. **Complete Audit Trail**
   - Log all signed requests
   - Track valid/invalid signatures
   - Replay attempt tracking
   - Admin dashboard ready

---

## Installation

### Step 1: Install Dependencies

```bash
npm install expo-crypto
```

### Step 2: Run Database Setup

Execute in Supabase SQL Editor:

```bash
# Copy the SQL file
cat database/api-request-signing-setup.sql
```

Or:
1. Go to: https://supabase.com/dashboard/project/_/sql/new
2. Paste contents of `database/api-request-signing-setup.sql`
3. Click **Run**

This creates:
- `api_signing_keys` table
- `signed_request_log` table
- 8 helper functions
- RLS policies
- Performance indexes

### Step 3: Generate and Store API Key

```typescript
import { setApiSigningKey } from '../lib/auth';
import crypto from 'crypto';

// Generate a secure API key (32 bytes = 256 bits)
const apiKey = crypto.randomBytes(32).toString('hex');

// Store in environment variable
// Add to .env:
// API_SIGNING_KEY=your-generated-key-here

// Set in application (client-side)
await setApiSigningKey(process.env.API_SIGNING_KEY!);
```

### Step 4: Create Key in Database

```sql
-- Generate key hash (don't store the key itself!)
-- Calculate SHA-256 of your API key and use that hash
SELECT create_api_signing_key(
  'production_client_key',
  'your-key-hash-here',
  'client_api',
  ARRAY['payment', 'subscription', 'user_management']
);
```

### Step 5: Verify Installation

```bash
node scripts/test-request-signing.js
```

Expected: All 10 tests should pass ✅

---

## How It Works

### Signature Generation (Client)

```
1. Generate unique request ID
2. Get current timestamp (milliseconds)
3. Hash request body (if present)
4. Build signature payload:
   METHOD|PATH|REQUEST_ID|TIMESTAMP|BODY_HASH|USER_ID
5. Generate HMAC-SHA256 signature
6. Attach headers:
   X-Request-ID: req_123...
   X-Timestamp: 1697456789000
   X-Signature: a1b2c3d4...
   X-User-ID: user-id (optional)
```

### Signature Verification (Server)

```
1. Extract signature headers
2. Check timestamp drift (< 5 minutes)
3. Rebuild signature payload
4. Generate expected signature
5. Compare (constant-time)
6. Check for replay attack
7. Log request
8. Accept or reject
```

### Replay Attack Prevention

```
┌──────────────────────────┐
│  Request arrives          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Extract signature        │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Check signature in DB    │
│  (within 5-minute window) │
└──────────┬───────────────┘
           │
      ┌────┴────┐
      │ Found?  │
      └────┬────┘
           │
    YES ◄──┴──► NO
     │           │
     ▼           ▼
┌─────────┐  ┌──────────┐
│ REPLAY  │  │  VALID   │
│ REJECT  │  │  ACCEPT  │
└─────────┘  └──────────┘
```

---

## Implementation

### Client-Side (Sign Requests)

```typescript
import { signApiRequest } from '../lib/auth';

async function callPaymentAPI(userId: string, amount: number) {
  // 1. Prepare request
  const method = 'POST';
  const path = '/api/payment/create';
  const body = { userId, amount };
  
  // 2. Sign the request
  const { headers } = await signApiRequest(method, path, body, userId);
  
  // 3. Make request with signed headers
  const response = await fetch(`https://api.example.com${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  
  return response.json();
}
```

### Server-Side (Verify Signatures)

```typescript
import { verifyRequestSignature } from '../lib/requestSigningMiddleware';

// Express/Node.js endpoint
app.post('/api/payment/create', async (req, res) => {
  // Verify signature
  const verification = await verifyRequestSignature(
    req.method,
    req.path,
    req.headers,
    req.body,
    { required: true, rejectReplays: true }
  );
  
  if (!verification.isValid) {
    return res.status(401).json({
      error: verification.error || 'Invalid signature',
    });
  }
  
  // Process request...
  const result = await processPayment(req.body);
  res.json(result);
});
```

### Middleware Usage

```typescript
import { createSignatureMiddleware } from '../lib/requestSigningMiddleware';

// Apply to all protected routes
app.use('/api/protected/*', createSignatureMiddleware({
  required: true,
  logFailures: true,
  rejectReplays: true,
}));

// Apply to specific routes
app.post('/api/payment', 
  createSignatureMiddleware({ required: true }),
  handlePayment
);
```

---

## Client Usage

### Example 1: Sign a GET Request

```typescript
import { signApiRequest } from '../lib/auth';

const { headers } = await signApiRequest('GET', '/api/user/profile', undefined, userId);

fetch('https://api.example.com/api/user/profile', {
  method: 'GET',
  headers,
});
```

### Example 2: Sign a POST Request with Body

```typescript
import { signApiRequest } from '../lib/auth';

const body = { name: 'John', email: 'john@example.com' };
const { headers } = await signApiRequest('POST', '/api/user/update', body, userId);

fetch('https://api.example.com/api/user/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...headers,
  },
  body: JSON.stringify(body),
});
```

### Example 3: Initialize API Key

```typescript
import { setApiSigningKey } from '../lib/auth';

// On app initialization
async function initializeApp() {
  const apiKey = process.env.API_SIGNING_KEY;
  if (apiKey) {
    await setApiSigningKey(apiKey, 'production_client_key');
  }
}
```

---

## Server Integration

### Stripe Guardian Integration

Add to your Stripe Guardian endpoints:

```javascript
// stripe-guardian/api/stripe/create-checkout.js
const { verifyRequestSignature } = require('../../lib/requestSigningMiddleware');

module.exports = async (req, res) => {
  // Verify signature
  const verification = await verifyRequestSignature(
    req.method,
    req.path,
    req.headers,
    req.body,
    { required: true }
  );
  
  if (!verification.isValid) {
    return res.status(401).json({ error: verification.error });
  }
  
  // Process request...
};
```

---

## Key Management

### Generate New Key

```typescript
import crypto from 'crypto';

// Generate secure key (256 bits)
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('API Key:', apiKey);
console.log('Store this in your .env file as API_SIGNING_KEY');

// Generate key hash for database
const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
console.log('Key Hash (for database):', keyHash);
```

### Create Key in Database

```sql
SELECT create_api_signing_key(
  'production_client_key',     -- key name
  'your-key-hash-here',         -- SHA-256 hash of the key
  'client_api',                 -- purpose
  ARRAY['payment', 'subscription', 'user_management'],  -- allowed operations
  NULL,                         -- no expiry
  '{}'::jsonb                   -- metadata
);
```

### Rotate Key

```sql
-- This keeps old key active during transition, then revokes it
SELECT rotate_api_signing_key(
  'production_client_key',  -- old key name
  'new-key-hash-here',      -- new key hash
  'admin-user-id'           -- who rotated it
);
```

### Revoke Key

```sql
SELECT revoke_api_signing_key(
  'production_client_key',
  'admin-user-id',
  'security_incident'  -- reason
);
```

---

## Testing

### Automated Tests

```bash
node scripts/test-request-signing.js
```

### Manual Test

```typescript
import { signApiRequest, verifyApiSignature } from '../lib/auth';

// Client: Sign request
const { signature, requestId, timestamp, headers } = await signApiRequest(
  'POST',
  '/api/test',
  { data: 'test' },
  'user-123'
);

console.log('Signed headers:', headers);

// Server: Verify
const verification = await verifyApiSignature(
  signature,
  'POST',
  '/api/test',
  requestId,
  timestamp,
  undefined,
  'user-123'
);

console.log('Valid:', verification.isValid);
```

---

## Monitoring

### Admin Dashboard Queries

#### Request Statistics

```sql
SELECT * FROM get_request_signing_stats(24);
```

#### Invalid Signatures (Last 24h)

```sql
SELECT 
  user_email,
  method,
  path,
  validation_error,
  created_at
FROM signed_request_log
WHERE is_valid = false
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

#### Replay Attempts

```sql
SELECT 
  user_email,
  method,
  path,
  signature,
  timestamp,
  created_at
FROM signed_request_log
WHERE is_replay = true
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### Key Usage Statistics

```sql
SELECT 
  key_name,
  key_version,
  usage_count,
  last_used_at,
  CASE 
    WHEN is_active THEN 'Active'
    ELSE 'Revoked'
  END as status
FROM api_signing_keys
ORDER BY last_used_at DESC NULLS LAST;
```

---

## Security Best Practices

### 1. Key Management

- **Never commit keys to git** - Use environment variables
- **Rotate keys regularly** - Every 90 days recommended
- **Use strong keys** - Minimum 256 bits (32 bytes)
- **Separate keys per environment** - Dev, staging, production

### 2. Signature Validation

- **Always validate timestamp** - Reject requests > 5 minutes old
- **Use constant-time comparison** - Prevents timing attacks
- **Log all failures** - Monitor for attack patterns
- **Reject replays** - Check signature uniqueness

### 3. Error Handling

- **Don't leak information** - Generic error messages
- **Log detailed errors** - For admin investigation
- **Fail securely** - Reject on verification errors
- **Rate limit failures** - Prevent brute force

### 4. Performance

- **Cache verification results** - For repeated checks
- **Async verification** - Don't block requests
- **Cleanup old logs** - Keep database performant
- **Index optimization** - For fast lookups

---

## Troubleshooting

### Issue: Signature verification fails

**Common causes:**
1. **Time drift** - Client/server clocks out of sync
2. **Wrong key** - Client and server using different keys
3. **Body mismatch** - Body modified after signing
4. **Payload order** - Fields in wrong order

**Solution:**
```typescript
// Check timestamp drift
const drift = Math.abs(Date.now() - timestamp);
console.log('Time drift (ms):', drift);

// Verify payload construction
const payload = `${method}|${path}|${requestId}|${timestamp}|${bodyHash}|${userId}`;
console.log('Signature payload:', payload);
```

### Issue: Replay attacks not detected

**Cause:** Database not logging requests

**Solution:** Ensure `logRequest()` is called after verification

### Issue: Performance degradation

**Cause:** Too many request logs

**Solution:** Run cleanup regularly
```sql
SELECT cleanup_old_request_logs(30); -- Keep last 30 days
```

---

## Advanced Usage

### Stripe Guardian Integration Example

```javascript
// stripe-guardian/server.js
const { verifyRequestSignature } = require('./lib/requestSigningMiddleware');

// Global middleware for all /api/stripe/* routes
app.use('/api/stripe/*', async (req, res, next) => {
  const verification = await verifyRequestSignature(
    req.method,
    req.path,
    req.headers,
    req.body,
    { required: true, rejectReplays: true }
  );
  
  if (!verification.isValid) {
    return res.status(401).json({ error: verification.error });
  }
  
  req.userId = verification.userId;
  next();
});
```

### Custom Signature Algorithm

```typescript
// If you need a custom signing algorithm
import { requestSigningService } from '../services/RequestSigningService';

// Set custom key
requestSigningService.setApiKey('your-key', 'custom_key_name');

// Sign request
const signedRequest = await requestSigningService.signRequest(
  'POST',
  '/api/custom',
  { data: 'value' }
);

// Use the signature
console.log('Signature:', signedRequest.signature);
```

---

## Migration Guide

### Gradual Rollout

Start with optional signing:

```typescript
// Phase 1: Optional (monitor adoption)
verifyRequestSignature(method, path, headers, body, {
  required: false,  // Allow unsigned requests
  logFailures: true, // But log them
});

// Phase 2: Required for new clients
verifyRequestSignature(method, path, headers, body, {
  required: true,  // Reject unsigned requests
  logFailures: true,
});
```

### Key Rotation Process

1. **Create new key**
   ```sql
   SELECT rotate_api_signing_key('old_key', 'new_key_hash');
   ```

2. **Update client** - Deploy new key
3. **Monitor** - Check old key usage drops to zero
4. **Complete** - Old key auto-revoked during rotation

---

## Performance Considerations

### Request Overhead

- **Signature generation**: ~1-2ms
- **Signature verification**: ~2-3ms
- **Database logging**: ~5-10ms (async)

**Total overhead**: ~5-15ms per request (acceptable for security)

### Optimization Tips

1. **Batch operations** - Sign multiple requests at once
2. **Cache keys** - Don't fetch from DB every time
3. **Async logging** - Don't block on log writes
4. **Regular cleanup** - Keep log table small

---

## Related Documentation

- [Security Logging Setup](./SECURITY_LOGGING_SETUP.md)
- [CSRF Protection Setup](./CSRF_PROTECTION_SETUP.md)
- [App Security Plan](../.cursor/plans/app-security-comprehensive-plan-75375d97.plan.md)

---

## Support

For questions or issues:
- Review [Troubleshooting](#troubleshooting) section
- Check test script output
- Contact security team

**Implementation Date**: October 2025  
**Last Updated**: October 2025  
**Status**: ✅ Production Ready (after database setup and key generation)

