# External Cron Service Setup for Monthly Usage Reset

Since Netlify's scheduled functions might not be available in your plan, here's how to set up automatic monthly resets using external cron services.

## Environment Variables Required

Before setting up the cron job, make sure these environment variables are configured in your Netlify dashboard:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (required)
# OR use the legacy name if you prefer:
SUPABASE_SECRET_KEY=your-service-role-key (alternative name)
CRON_API_KEY=your-secret-key (optional, for security)
```

**Important**: The `cron-reset` function requires the **service role key**, not the anon key, because it needs to bypass Row Level Security (RLS) policies to update usage records.

## Option 1: cron-job.org (Free & Easy)

### Setup Steps:

1. **Go to [cron-job.org](https://cron-job.org)**
2. **Create a free account**
3. **Add a new cron job:**
   - **Title**: "WizNote Monthly Usage Reset"
   - **Address**: `https://your-site.netlify.app/.netlify/functions/cron-reset`
   - **Schedule**: `0 2 1 * *` (1st of every month at 2 AM UTC)
   - **Method**: GET
   - **Description**: "Automatically reset expired user usage records"

4. **Optional Security**: Add an API key
   - In Netlify dashboard, add environment variable: `CRON_API_KEY=your-secret-key`
   - In cron-job.org, add query parameter: `?key=your-secret-key`

### Example URL:
```
https://wiznote.app/.netlify/functions/cron-reset?key=your-secret-key
```

## Option 2: EasyCron (Free Tier)

### Setup Steps:

1. **Go to [EasyCron.com](https://www.easycron.com)**
2. **Sign up for free account**
3. **Create new cron job:**
   - **Job Name**: "WizNote Monthly Reset"
   - **URL**: `https://your-site.netlify.app/.netlify/functions/cron-reset`
   - **Cron Expression**: `0 2 1 * *`
   - **HTTP Method**: GET
   - **Timeout**: 300 seconds

## Option 3: GitHub Actions (Free)

### Setup Steps:

1. **Create `.github/workflows/monthly-reset.yml` in your repo:**

```yaml
name: Monthly Usage Reset

on:
  schedule:
    # Run on the 1st of every month at 2 AM UTC
    - cron: '0 2 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  reset-usage:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Monthly Reset
        run: |
          curl -X GET "https://your-site.netlify.app/.netlify/functions/cron-reset?key=${{ secrets.CRON_API_KEY }}"
```

2. **Add secret in GitHub:**
   - Go to Settings → Secrets and variables → Actions
   - Add `CRON_API_KEY` with your secret key

## Option 4: Uptime Robot (Free)

### Setup Steps:

1. **Go to [UptimeRobot.com](https://uptimerobot.com)**
2. **Create free account**
3. **Add new monitor:**
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: "WizNote Monthly Reset"
   - **URL**: `https://your-site.netlify.app/.netlify/functions/cron-reset`
   - **Monitoring Interval**: 1440 minutes (24 hours)
   - **HTTP Method**: GET

## Testing Your Setup

### Manual Test:
```bash
# Test the cron endpoint
curl "https://your-site.netlify.app/.netlify/functions/cron-reset"

# With API key (if configured)
curl "https://your-site.netlify.app/.netlify/functions/cron-reset?key=your-secret-key"
```

### Expected Response:
```json
{
  "success": true,
  "message": "Cron-triggered usage reset completed",
  "resetCount": 45,
  "totalChecked": 150,
  "expiredFound": 45,
  "timestamp": "2025-01-01T02:00:00.000Z"
}
```

## Monitoring

### Check Function Logs:
1. Go to your Netlify dashboard
2. Navigate to **Functions** → **cron-reset**
3. View the logs to see reset results

### Expected Log Output:
```
🔄 Cron-triggered Usage Reset: Starting...
📅 Cron reset date: 2025-01-01T02:00:00.000Z
📊 Found 150 usage records
🔄 Found 45 expired records to reset
✅ Reset usage for user abc123..., feature ai_key_details
✅ Reset usage for user def456..., feature ai_summaries
...
✅ Cron reset completed: 45/45 records reset successfully
```

## Security Considerations

### API Key Protection:
- Use a strong, random API key
- Store it securely in your cron service
- Don't commit API keys to your repository

### Rate Limiting:
- Most cron services respect rate limits
- The function is designed to handle multiple calls safely
- Failed resets are logged but don't break the system

## Troubleshooting

### Common Issues:

1. **Function not responding:**
   - Check Netlify function logs
   - Verify the URL is correct
   - Ensure your site is deployed

2. **Authentication errors:**
   - Verify API key matches in both places
   - Check environment variables in Netlify

3. **No records reset:**
   - This is normal if all usage is current
   - Check the logs for details

### Manual Reset:
If you need to trigger a reset manually:
```bash
curl "https://your-site.netlify.app/.netlify/functions/cron-reset?key=your-secret-key"
```

## Recommended Setup

**For simplicity and reliability, I recommend cron-job.org:**
- ✅ Free forever
- ✅ Easy setup
- ✅ Reliable execution
- ✅ Good logging
- ✅ Email notifications on failure

This approach gives you the same automatic monthly reset functionality without depending on Netlify's scheduled functions feature.
