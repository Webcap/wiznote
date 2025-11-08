# Netlify Gemini API Setup Guide

## Problem
Getting `500 Internal Server Error` with message "API configuration error" when calling the Gemini API.

## Root Cause
The `GEMINI_API_KEY` environment variable is not set in your Netlify site's environment variables.

## Solution: Configure Gemini API Key in Netlify

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or use an existing key
4. Copy the API key (starts with `AIza...`)

### Step 2: Add Environment Variable in Netlify

1. **Log into Netlify Dashboard**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Select your site (wiznote.app)

2. **Navigate to Site Settings**
   - Click on your site
   - Go to **Site settings** → **Environment variables**

3. **Add New Environment Variable**
   - Click **Add variable**
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (e.g., `AIza...`)
   - **Scopes**: Select **All scopes** (or at least **Functions**)

4. **Save and Redeploy**
   - Click **Save**
   - The site will automatically redeploy with the new environment variable

### Step 3: Verify Configuration

After redeployment, test the Gemini API:

1. Open the app and try using a Gemini feature (e.g., generate summary)
2. Check Netlify function logs:
   - Go to **Site settings** → **Functions**
   - Click on `gemini-api` function
   - Check **Logs** tab for any errors

### Alternative: Use Netlify CLI

If you prefer using the CLI:

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variable
netlify env:set GEMINI_API_KEY "your-api-key-here" --context production

# For all contexts (production, deploy-preview, branch-deploy)
netlify env:set GEMINI_API_KEY "your-api-key-here"
```

### Verification Commands

```bash
# Check if variable is set (via CLI)
netlify env:list

# Test the function locally
netlify dev
```

## Troubleshooting

### Error: "API configuration error"

**Cause**: `GEMINI_API_KEY` is not set in Netlify environment variables.

**Solution**: 
1. Verify the variable is set in Netlify dashboard
2. Ensure variable name is exactly `GEMINI_API_KEY` (case-sensitive)
3. Redeploy the site after adding the variable

### Error: "Gemini API request failed"

**Cause**: The API key is invalid or has expired.

**Solution**:
1. Verify the API key is correct in Google AI Studio
2. Check if the API key has usage limits
3. Generate a new API key if needed

### Function Not Found (404)

**Cause**: The function file is not in the correct location.

**Solution**:
1. Verify `netlify/functions/gemini-api.js` exists
2. Check `netlify.toml` configuration (if used)
3. Redeploy the site

### CORS Errors

**Cause**: `EXPO_PUBLIC_WEB_URL` is not set correctly.

**Solution**:
1. Set `EXPO_PUBLIC_WEB_URL` in Netlify environment variables
2. Value should be your production domain (e.g., `https://wiznote.app`)

## Security Notes

✅ **DO:**
- Store API key in Netlify environment variables (server-side only)
- Use `GEMINI_API_KEY` (not `EXPO_PUBLIC_GEMINI_API_KEY`)
- Keep API key secret and never commit it to git

❌ **DON'T:**
- Expose API key in client-side code
- Commit API key to version control
- Share API key publicly

## Environment Variables Checklist

Required for Gemini API to work:

- [ ] `GEMINI_API_KEY` - Set in Netlify (server-side only)
- [ ] `EXPO_PUBLIC_WEB_URL` - Set in Netlify (optional, for CORS)
- [ ] `GEMINI_ALLOWED_ORIGINS` - Optional, comma-separated list of extra origins (e.g. local dev URLs)

## Testing Locally

If you want to test locally:

1. Create `.env` file in project root:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```

2. Run Netlify dev:
   ```bash
   netlify dev
   ```

3. The function will use the local `.env` file

**Note**: Never commit `.env` file to git. It's already in `.gitignore`.

## Need Help?

1. Check Netlify function logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure the site has been redeployed after adding variables
4. Check Google AI Studio for API key status and quotas

