# Admin Dashboard - Subscription Sync Button Quick Start

## What You'll See

When you open the Admin Dashboard and scroll to the **System Monitoring** section, you'll see:

### New Subscription Sync Panel

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 Automatic Subscription Sync                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Sync Status            ✓ Running                           │
│  Sync Interval          Every 10 min                        │
│  Last Sync              10:15:30 AM                         │
│  Total Syncs            25                                  │
│                                                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │  🔄  Trigger Manual Sync                          │     │
│  └───────────────────────────────────────────────────┘     │
│                                                               │
│  ℹ️ Automatic sync runs every 10 minutes to check and      │
│     update subscription statuses from Stripe. Use manual     │
│     sync to force an immediate check.                        │
└─────────────────────────────────────────────────────────────┘
```

## How to Use

### 1. **View Sync Status** (Automatic)
   - Just open the Admin Dashboard
   - Status loads automatically
   - Refreshes every 2 minutes

### 2. **Trigger Manual Sync** (One Click)
   ```
   Click "Trigger Manual Sync" button
   ↓
   See "Syncing..." message
   ↓
   Get success notification
   ↓
   Status updates automatically
   ```

### 3. **Monitor Results**
   - Watch "Total Syncs" number increase
   - Check "Last Sync" timestamp updates
   - Review server logs for detailed results

## Example Workflow

### Scenario: Testing After Deployment

1. **Open Admin Dashboard**
   ```
   Navigate to: /admin-dashboard
   Scroll to: System Monitoring section
   ```

2. **Check Current Status**
   ```
   ✓ Sync Status: Running
   ⏰ Last Sync: 5 minutes ago
   📊 Total Syncs: 15
   ```

3. **Trigger Manual Sync**
   ```
   Click: "Trigger Manual Sync"
   Wait: 2-3 seconds
   See: "✅ Subscription sync triggered successfully!"
   ```

4. **Verify Update**
   ```
   ⏰ Last Sync: Just now
   📊 Total Syncs: 16 (increased)
   ```

5. **Check Server Logs**
   ```
   🔄 [Sync #16] Starting subscription sync...
      🔍 Found 5 active subscriptions in Stripe
      ✅ Synced subscription sub_xxx for user user-123
   ✅ [Sync #16] Completed in 1234ms
      📈 Active: 5 | 📉 Expired: 0 | ❌ Canceled: 0
   ```

## Quick Troubleshooting

### Panel Not Showing?
```bash
# 1. Check if Stripe Guardian is running
curl https://api.webcap.media/api/ready

# Should return:
{
  "ok": true,
  "subscriptionSync": {
    "isRunning": true,
    ...
  }
}
```

### Manual Sync Button Disabled?
- Wait for previous sync to complete
- Check if a sync is already in progress
- Button shows "Syncing..." when active

### No Success Message?
- Check browser console for errors
- Verify network connection
- Ensure Stripe Guardian is accessible

## What Happens Behind the Scenes

```
Admin Dashboard                Stripe Guardian              Stripe API
     │                               │                          │
     ├─ Click "Manual Sync"         │                          │
     │                               │                          │
     ├─ POST /api/sync-status ──────>                          │
     │                               │                          │
     │                               ├─ Fetch subscriptions ───>│
     │                               │                          │
     │                               <── Return subscriptions ──┤
     │                               │                          │
     │                               ├─ Compare with database   │
     │                               ├─ Update records          │
     │                               ├─ Log results             │
     │                               │                          │
     <── Success response ───────────┤                          │
     │                               │                          │
     ├─ Show notification            │                          │
     ├─ Wait 2 seconds              │                          │
     │                               │                          │
     ├─ GET /api/sync-status ───────>                          │
     │                               │                          │
     <── Updated status ─────────────┤                          │
     │                               │                          │
     ├─ Display new sync count       │                          │
     └─ Update last sync time        │                          │
```

## Expected Behavior

### Normal Operation
- ✅ Sync Status: **Running**
- ✅ Last Sync: **< 15 minutes ago**
- ✅ Manual sync works: **Success notification**
- ✅ Logs show: **Sync completed successfully**

### During Manual Sync
- 🔄 Button text: **"Syncing..."**
- 🔄 Button disabled: **Yes**
- 🔄 Icon changes: **Hourglass**
- 🔄 Duration: **2-5 seconds typically**

### After Successful Sync
- ✅ Notification: **"✅ Subscription sync triggered successfully!"**
- ✅ Last Sync: **Just now**
- ✅ Total Syncs: **Increases by 1**
- ✅ Button: **Returns to normal state**

## Common Use Cases

### 1. Daily Health Check
```
Morning routine:
1. Open Admin Dashboard
2. Check "Last Sync" is recent
3. Verify "Sync Status" is Running
```

### 2. After Stripe Changes
```
Made changes in Stripe Dashboard:
1. Click "Trigger Manual Sync"
2. Wait for success notification
3. Verify changes reflected in WizNote
```

### 3. Troubleshooting User Issues
```
User reports subscription problem:
1. Trigger manual sync
2. Check server logs for that user
3. Verify subscription updated
```

### 4. Testing New Deployment
```
After deploying Stripe Guardian:
1. Check sync status shows "Running"
2. Trigger manual sync
3. Verify success notification
4. Check logs for detailed results
```

## Summary

You now have a powerful tool to:
- 👀 **Monitor** automatic subscription syncing
- 🎛️ **Control** when syncs happen
- ✅ **Verify** subscriptions stay in sync
- 🚀 **React** quickly to sync needs

**No more waiting for automatic syncs!** Click the button anytime you need immediate subscription verification. 🎉

---

**For detailed technical information, see:** `ADMIN_SUBSCRIPTION_SYNC_BUTTON.md`

