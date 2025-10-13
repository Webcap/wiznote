# Admin Dashboard - Subscription Sync Button

## Overview
Added a manual subscription sync button to the WizNote admin dashboard that allows administrators to trigger immediate subscription synchronization with Stripe.

## What Was Added

### 1. **Subscription Sync Status Display**
The admin dashboard now shows real-time subscription sync information:
- **Sync Status**: Whether automatic sync is running or stopped
- **Sync Interval**: How often automatic sync runs (default: 10 minutes)
- **Last Sync Time**: When the last sync completed
- **Total Syncs**: Number of syncs performed since server start

### 2. **Manual Sync Button**
A prominent button that allows admins to:
- Trigger an immediate subscription sync
- Force-check all subscription statuses with Stripe
- Bypass the automatic 10-minute interval when needed

### 3. **Visual Feedback**
The UI provides clear feedback:
- ✅ Success notification when sync is triggered
- ⏳ Loading state while syncing
- 🔄 Real-time status updates
- ℹ️ Helpful information about what the sync does

## Features

### Automatic Status Updates
- Status is fetched automatically when the dashboard loads
- Updates every 2 minutes along with other monitoring data
- Shows sync information extracted from the Stripe Guardian `/api/ready` endpoint

### Smart Button Behavior
- Button is disabled while a sync is in progress
- Changes appearance to show "Syncing..." state
- Success/error notifications via snackbar (web) or alert (mobile)
- Auto-refreshes status 2 seconds after triggering

### Cross-Platform Support
- Works on both web and mobile platforms
- Uses platform-appropriate notifications (snackbar vs alerts)
- Consistent UI across all platforms

## Location in Admin Dashboard

The subscription sync section appears in the **System Monitoring** area, right after the Stripe Guardian status details. It's prominently displayed to make it easy for admins to:
1. Check if automatic sync is running
2. See when the last sync occurred
3. Trigger manual syncs when needed

## How to Use

### Viewing Sync Status
1. Navigate to Admin Dashboard
2. Scroll to "System Monitoring" section
3. Look for "Automatic Subscription Sync" panel
4. View current sync status, interval, and last sync time

### Triggering Manual Sync
1. Click the **"Trigger Manual Sync"** button
2. Wait for the success notification
3. Status will auto-refresh after 2 seconds
4. Check server logs for detailed sync results

## What Happens When You Click the Button

1. **Button State Changes**
   - Button becomes disabled
   - Text changes to "Syncing..."
   - Icon changes to hourglass

2. **API Call**
   - POST request to `/api/sync-status`
   - Triggers immediate subscription sync on Stripe Guardian

3. **Sync Process** (Server-side)
   - Fetches active subscriptions from Stripe
   - Compares with database records
   - Updates subscription statuses
   - Deactivates expired subscriptions
   - Syncs canceled subscriptions

4. **UI Updates**
   - Shows success/error notification
   - Refreshes sync status after 2 seconds
   - Button returns to normal state

## Use Cases

### When to Use Manual Sync

**✅ Good Use Cases:**
- Testing subscription sync after Stripe Guardian deployment
- Verifying a specific subscription issue was resolved
- Force-checking statuses after webhook failures
- Immediate update needed (can't wait for next automatic sync)
- Troubleshooting subscription discrepancies

**❌ Not Needed For:**
- Normal operations (automatic sync handles this)
- Every subscription change (webhooks handle real-time updates)
- Regular monitoring (automatic sync runs every 10 minutes)

## Technical Details

### API Endpoints Used

#### GET `/api/sync-status`
Fetches current sync status:
```json
{
  "ok": true,
  "sync": {
    "isRunning": true,
    "lastSyncTime": "2025-10-13T10:00:00.000Z",
    "syncCount": 5,
    "intervalMinutes": 10
  }
}
```

#### POST `/api/sync-status`
Triggers manual sync:
```json
{
  "ok": true,
  "message": "Sync triggered",
  "timestamp": "2025-10-13T10:00:00.000Z"
}
```

### State Management

```typescript
// Subscription sync state
const [subscriptionSync, setSubscriptionSync] = useState<{
  isRunning?: boolean;
  lastSyncTime?: string;
  syncCount?: number;
  intervalMinutes?: number;
  isSyncing?: boolean;
}>({});
```

### Key Functions

1. **fetchSubscriptionSyncStatus()** - Fetches current sync status
2. **triggerManualSync()** - Triggers manual sync with UI feedback
3. **fetchMonitoring()** - Includes sync status in overall monitoring

## UI Components

### Sync Status Panel
```typescript
<View style={styles.syncSection}>
  <View style={styles.syncHeader}>
    <Ionicons name="sync" size={20} color="#4CAF50" />
    <Text>Automatic Subscription Sync</Text>
  </View>
  
  {/* Status details */}
  
  <TouchableOpacity
    style={styles.manualSyncButton}
    onPress={triggerManualSync}
    disabled={subscriptionSync.isSyncing}
  >
    <Ionicons name="sync" size={20} color="white" />
    <Text>Trigger Manual Sync</Text>
  </TouchableOpacity>
</View>
```

### Styles
```typescript
syncSection: {
  padding: 16,
  borderRadius: 12,
  backgroundColor: cardBg + '80',
  marginTop: 16,
},
manualSyncButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  backgroundColor: accentPrimary,
  gap: 8,
  marginTop: 12,
}
```

## Error Handling

### Network Errors
- Displays error notification
- Logs error to console
- Resets button state

### API Errors
- Shows user-friendly error message
- Provides details in notification
- Allows retry

### Timeout Handling
- 10-second timeout on requests
- Graceful error message
- Button remains functional

## Monitoring

### What to Watch For

**Sync Status:**
- Should show "Running" under normal conditions
- Check if "Last Sync" is recent (< 15 minutes)
- Verify sync count increases over time

**After Manual Trigger:**
- Success notification appears
- Last sync time updates
- Sync count increments
- Server logs show sync operation

### Health Indicators

**✅ Healthy:**
```
Sync Status: Running ✓
Sync Interval: Every 10 min
Last Sync: 10:15:30 AM
Total Syncs: 25
```

**⚠️ Potential Issues:**
```
Sync Status: Stopped ✗
Last Sync: > 30 minutes ago
Error triggering manual sync
```

## Troubleshooting

### Button Not Appearing
- Ensure Stripe Guardian is running
- Check that `/api/ready` endpoint includes `subscriptionSync` data
- Verify environment variables are set correctly

### Manual Sync Fails
```bash
# Check Stripe Guardian logs
# Verify API endpoint is accessible
curl https://api.webcap.media/api/sync-status

# Test manual trigger
curl -X POST https://api.webcap.media/api/sync-status
```

### Status Not Updating
- Refresh the dashboard
- Check browser console for errors
- Verify network connectivity to Stripe Guardian

## Benefits

### For Administrators
- ✅ **Visibility**: See sync status at a glance
- ✅ **Control**: Trigger syncs on-demand
- ✅ **Confidence**: Verify sync is working
- ✅ **Speed**: No need to wait for next automatic sync

### For System Health
- ✅ **Proactive monitoring**: Catch sync issues early
- ✅ **Quick resolution**: Force sync when needed
- ✅ **Better debugging**: Test sync functionality easily

## Future Enhancements

Potential improvements:
- [ ] Show detailed sync results (subscriptions synced, errors)
- [ ] Display sync history/log
- [ ] Add sync metrics/charts
- [ ] Configure sync interval from UI
- [ ] Email alerts for sync failures
- [ ] Pause/resume automatic sync

## Related Documentation

- `stripe-guardian/AUTOMATIC_SUBSCRIPTION_SYNC.md` - Sync system documentation
- `stripe-guardian/DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `stripe-guardian/README.md` - Stripe Guardian overview

## Summary

The admin dashboard now includes a comprehensive subscription sync monitoring and control panel that:
- 📊 Displays real-time sync status
- 🔄 Allows manual sync triggering
- ✅ Provides visual feedback
- 📱 Works on all platforms
- 🚀 Makes subscription management easier

Administrators can now proactively monitor and control subscription synchronization directly from the dashboard! 🎉

