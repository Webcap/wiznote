# SSL Certificate Error Fix

## Problem
`ERR_CERT_COMMON_NAME_INVALID` when accessing `https://api.webcap.media/api`

This error occurs when:
1. The SSL certificate for `api.webcap.media` doesn't match the domain
2. The certificate is expired or invalid
3. The certificate is for a different domain (e.g., `webcap.media` instead of `api.webcap.media`)

## Root Cause
The Stripe Guardian API is deployed at `api.webcap.media`, but the SSL certificate doesn't include this subdomain in its Subject Alternative Names (SAN).

## Solutions

### Option 1: Fix SSL Certificate (Recommended - Server/Infrastructure Fix)

**Contact your hosting provider (Starlight Hyperlift/Namecheap) to:**

1. **Update SSL Certificate** to include `api.webcap.media`:
   - Add `api.webcap.media` to Subject Alternative Names (SAN)
   - Or use a wildcard certificate: `*.webcap.media`

2. **Verify certificate covers both domains:**
   ```bash
   openssl s_client -connect api.webcap.media:443 -servername api.webcap.media
   ```
   Check that `api.webcap.media` appears in the certificate.

3. **Alternative: Use different subdomain** that already has SSL:
   - If `stripe.webcap.media` or `api2.webcap.media` has valid SSL, update the deployment

### Option 2: Use Alternative Domain (Quick Fix)

If you have a different domain with valid SSL:

1. **Update environment variable:**
   ```env
   EXPO_PUBLIC_WEBHOOK_BASE_URL=https://your-alternative-domain.com/api
   ```

2. **Or update deployment** to use a domain with valid SSL

### Option 3: Temporary Workaround (Development Only)

**⚠️ WARNING: Only for development/local testing. Never use in production.**

For local development only, you can use HTTP instead of HTTPS:
```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=http://localhost:3001
```

### Option 4: Use Proxy/CDN with Valid SSL

1. **Set up Cloudflare/CDN** in front of `api.webcap.media`
2. **Use Cloudflare's SSL** (which will be valid)
3. **Update URL** to use Cloudflare domain

## Immediate Actions

### 1. Check Current Certificate

```bash
# Check certificate details
openssl s_client -connect api.webcap.media:443 -servername api.webcap.media | openssl x509 -noout -text

# Check certificate expiration
echo | openssl s_client -connect api.webcap.media:443 -servername api.webcap.media 2>/dev/null | openssl x509 -noout -dates
```

### 2. Verify Actual Deployment URL

Check your Stripe Guardian deployment:
- What domain is it actually deployed to?
- Does that domain have a valid SSL certificate?
- Is the domain accessible via HTTPS?

### 3. Update Configuration

Once you have the correct URL with valid SSL:

**For Production:**
```env
EXPO_PUBLIC_WEBHOOK_BASE_URL=https://correct-domain.com/api
```

**Or update in code** (`constants/ApiConfig.ts`):
```typescript
// Production: Use correct domain with valid SSL
return 'https://correct-domain.com/api';
```

## Testing

After fixing:

1. **Test in browser:**
   ```bash
   curl https://api.webcap.media/api/ready
   ```
   Should not show certificate errors.

2. **Test in application:**
   - Admin dashboard should load Stripe Guardian status
   - No `ERR_CERT_COMMON_NAME_INVALID` errors in console

## Error Handling Improvement

The code now includes better error handling:
- Catches SSL/certificate errors gracefully
- Shows user-friendly error messages
- Logs detailed errors for debugging

## Next Steps

1. ✅ **Immediate**: Check actual deployed domain and SSL certificate
2. ✅ **Short-term**: Update `EXPO_PUBLIC_WEBHOOK_BASE_URL` to use correct domain
3. ✅ **Long-term**: Fix SSL certificate to include `api.webcap.media` or use alternative domain

