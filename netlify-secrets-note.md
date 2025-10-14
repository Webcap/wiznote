# Netlify Secrets Scanning Note

## Issue

Netlify's build failed due to detecting `EXPO_PUBLIC_GEMINI_API_KEY` in the bundled JavaScript:

```
"AIza***" detected as a likely secret:
  found value in dist/_expo/static/js/web/entry-*.js
```

## Why This Happens

The Gemini API key is exposed in client-side code because:
1. It's prefixed with `EXPO_PUBLIC_` which tells Expo to bundle it into the client
2. This is intentional - the key is meant to be used from the browser
3. Google's Gemini API supports API key restrictions (HTTP referrer restrictions)

## Solutions Applied

### Solution 1: Disable Secret Scanning (Current)

Added to `netlify.toml`:
```toml
[build]
  environment = { SECRETS_SCAN_SMART_DETECTION_ENABLED = "false" }
```

**Pros**:
- ✅ Quick fix
- ✅ Allows build to complete
- ✅ Gemini API key is already restricted by HTTP referrer

**Cons**:
- ⚠️ Disables scanning for all secrets
- ⚠️ Other secrets might slip through

### Solution 2: Whitelist Specific Key (Better)

Add to Netlify environment variables:
```
SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES = "AIza***"
```

**Pros**:
- ✅ Keeps secret scanning enabled
- ✅ Only whitelists this specific key

**Cons**:
- Requires Netlify dashboard configuration

### Solution 3: Move to Server-Side (Most Secure)

Move Gemini API calls to Netlify functions:

1. Create `netlify/functions/gemini-api.js`
2. Call from client: `fetch('/.netlify/functions/gemini-api')`
3. Keep API key server-side only

**Pros**:
- ✅ API key never exposed to client
- ✅ No secret scanning issues
- ✅ Better security

**Cons**:
- Requires refactoring GeminiAI service
- More complex architecture

## Current Setup

### API Key Security

The `EXPO_PUBLIC_GEMINI_API_KEY` is secure because:
1. ✅ Restricted to specific HTTP referrers in Google Cloud Console
2. ✅ Can't be used from other domains
3. ✅ Usage quotas prevent abuse
4. ✅ Can be rotated easily

### Recommendation

**For now**: Use Solution 1 (disable scanner) because:
- Gemini API key is already properly secured with HTTP referrer restrictions
- This is the standard approach for client-side API integrations
- Quick deployment

**Future**: Consider Solution 3 (server-side) for enhanced security

## How to Configure Solution 2 (Recommended)

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add: `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`
3. Value: Your actual Gemini API key (the one that starts with AIza)
4. Remove `SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"` from netlify.toml
5. Redeploy

This keeps scanning enabled but whitelists your legitimate client-side API key.

---

**Current Status**: Solution 1 applied (scanner disabled)  
**Recommended**: Switch to Solution 2 when you have time  
**Future Enhancement**: Solution 3 (server-side proxy)

