# Monthly Usage Reset Setup for Netlify

This guide explains how to set up automatic monthly usage resets for your WizNote app hosted on Netlify.

## Overview

The system automatically resets expired user usage records on the 1st of every month at 2 AM UTC. This ensures that users get their monthly limits refreshed properly.

## Files Created

1. **`netlify/functions/monthly-reset.js`** - Main scheduled function for automatic resets
2. **`netlify/functions/manual-reset.js`** - Manual reset API endpoint
3. **`netlify.toml`** - Netlify configuration file
4. **`scripts/test-monthly-reset.js`** - Test script to verify the system

## Setup Instructions

### 1. Deploy the Functions

The functions are already created in your project. When you deploy to Netlify, they will be automatically available.

### 2. Configure Environment Variables

In your Netlify dashboard, add these environment variables:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
USAGE_RESET_API_KEY=your-secret-api-key (optional, for manual resets)
```

### 3. Enable Scheduled Functions

In your Netlify dashboard:

1. Go to **Functions** → **Scheduled Functions**
2. Enable scheduled functions for your site
3. The monthly reset will automatically run on the 1st of every month at 2 AM UTC

### 4. Test the System

Before going live, test the reset system:

```bash
# Test the reset logic (doesn't actually reset anything)
node scripts/test-monthly-reset.js
```

## How It Works

### Automatic Monthly Reset

- **Schedule**: 1st of every month at 2 AM UTC
- **Function**: `netlify/functions/monthly-reset.js`
- **Process**:
  1. Fetches all user usage records
  2. Identifies expired records based on their period type (daily/weekly/monthly)
  3. Resets expired records to 0 usage
  4. Updates period start/end dates
  5. Logs results

### Manual Reset (Optional)

You can also trigger a manual reset via API:

```bash
# Reset all usage records
curl -X POST https://your-site.netlify.app/.netlify/functions/manual-reset \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-secret-api-key"}'
```

## Monitoring

### Netlify Function Logs

Check the function logs in your Netlify dashboard:
1. Go to **Functions** → **monthly-reset**
2. View the logs to see reset results

### Expected Log Output

```
🔄 Monthly Usage Reset: Starting...
📅 Reset date: 2025-01-01T02:00:00.000Z
📊 Found 150 usage records to check
🔄 Found 45 expired records to reset
✅ Reset usage for user abc123..., feature ai_key_details
✅ Reset usage for user def456..., feature ai_summaries
...
✅ Monthly reset completed: 45/45 records reset successfully
```

## Troubleshooting

### Common Issues

1. **Function not running**: Check that scheduled functions are enabled in Netlify
2. **Database errors**: Verify Supabase environment variables are correct
3. **No records reset**: This is normal if all usage is current

### Manual Testing

If you need to test the reset manually:

```bash
# Test the reset logic
node scripts/test-monthly-reset.js

# Or call the manual reset API
curl -X POST https://your-site.netlify.app/.netlify/functions/manual-reset
```

## Security

- The scheduled function only runs when called by Netlify's scheduler
- Manual reset requires an API key (if configured)
- All database operations use your Supabase credentials

## Customization

### Change Reset Schedule

Edit `netlify.toml` to change the schedule:

```toml
[plugins.inputs]
  # Run on the 1st of every month at 3 AM UTC instead of 2 AM
  schedule = "0 3 1 * *"
  function = "monthly-reset"
```

### Add More Reset Types

You can create additional scheduled functions for:
- Weekly resets
- Daily resets
- Specific feature resets

## Support

If you encounter issues:

1. Check Netlify function logs
2. Verify environment variables
3. Test with the manual reset API
4. Run the test script locally

The system is designed to be robust and will continue working even if some individual resets fail.
