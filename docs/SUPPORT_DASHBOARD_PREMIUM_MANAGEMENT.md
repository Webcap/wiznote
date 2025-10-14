# Support Dashboard - Premium Management Feature

## Overview

Support staff can now grant free premium access directly from the Support Dashboard without needing to run command-line scripts or access Stripe.

## Features

✅ **Grant Free Premium** - Give users premium access for free
✅ **Custom Duration** - 30 days, 1 year, or lifetime
✅ **Premium Status Display** - See current premium status at a glance  
✅ **Revoke Access** - Remove free premium when needed
✅ **Audit Logging** - Track who granted access and why
✅ **No Stripe Required** - Bypasses Stripe for free access
✅ **Real-time Updates** - Changes reflect immediately

## Access

### Who Can Use It?

- ✅ Support agents (`role: 'support'`)
- ✅ Administrators (`role: 'admin'`)
- ❌ Regular users (not accessible)

### Where to Find It?

1. Navigate to **Admin/Support Dashboard** (`/admin/support`)
2. Search for a user by email or ID
3. Select the user
4. **Premium Access Management** section appears at the top

## How to Use

### Grant Free Premium

1. **Search for User**
   - Enter user email in search box
   - Click "Search"

2. **View Premium Status**
   - Current status shown at top of user details
   - Green badge = Active premium
   - Gray badge = No premium

3. **Click "Grant Free Premium"**
   - Modal opens with options

4. **Choose Duration**
   - Quick select: 30 days, 90 days, 365 days, or Lifetime
   - Or enter custom number of days

5. **Enter Reason** (Required)
   - Examples:
     - "Beta tester"
     - "Customer compensation for issue #123"
     - "Staff account"
     - "Promotional partnership"

6. **Confirm**
   - Review details
   - Click "Grant Access"
   - Premium activates immediately!

### Revoke Free Premium

1. Select user with free premium access
2. Click "Revoke Premium" (red button)
3. Confirm the action
4. Premium access removed

**Note**: Can only revoke FREE premium. Paid Stripe subscriptions must be managed in Stripe Dashboard.

## UI Components

### Premium Status Card

Shows at the top of user details:

```
╔═══════════════════════════════════════════════╗
║  💎 Premium Access Management                 ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Current Status: ✅ Premium Active            ║
║                                               ║
║  Plan: WizNote Pro                            ║
║  Status: active                               ║
║  Valid Until: Dec 31, 2025                    ║
║  Type: 🎁 Free Access                         ║
║  Granted By: support-agent-id                 ║
║  Reason: Beta tester                          ║
║                                               ║
║  [Revoke Premium]                             ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

### Grant Premium Modal

Clean, intuitive modal with:
- User information display
- Duration quick-select buttons
- Custom duration input
- Reason text area (required)
- Clear confirmation

## Technical Details

### Service Layer

**File**: `services/PremiumManagementService.ts`

**Key Methods**:
```typescript
// Grant free premium
await premiumManagementService.grantFreePremium({
  userId: 'user-uuid',
  userEmail: 'user@example.com',
  duration: 365, // or 'lifetime'
  reason: 'Beta tester',
  grantedBy: 'support-agent-id'
});

// Get premium status
const status = await premiumManagementService.getPremiumStatus(userId);

// Revoke premium
await premiumManagementService.revokePremium(
  userId,
  userEmail,
  'No longer needed',
  supportAgentId
);
```

### Database Structure

Updates `user_profiles.premium` (JSONB):

```json
{
  "isActive": true,
  "planId": "cddf6c0b-3ec4-4a68-b137-dfe58ce17c1a",
  "planName": "WizNote Pro",
  "status": "active",
  "currentPeriodEnd": "2026-10-14T00:00:00.000Z",
  "currentPeriodStart": "2025-10-14T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "isFree": true,
  "grantedBy": "ff9aadf8-3efd-462f-b978-f4c6c3e59b56",
  "grantedAt": "2025-10-14T12:00:00.000Z",
  "grantedReason": "Beta tester"
}
```

### Key Fields

- `isActive`: Whether premium is active
- `isFree`: Identifies this as free/comp access (not paid)
- `grantedBy`: Support agent/admin who granted it
- `grantedReason`: Why it was granted (audit trail)
- `currentPeriodEnd`: When access expires

## Use Cases

### Beta Testers

```
Duration: 90 days
Reason: "Beta tester for new PDF features"
```

### Customer Compensation

```
Duration: 30 days
Reason: "Compensation for data sync issue ticket #456"
```

### Staff Accounts

```
Duration: lifetime
Reason: "Staff member - permanent access"
```

### Influencer/Promotional

```
Duration: 365 days
Reason: "Promotional partnership with @influencer"
```

### Short-term Testing

```
Duration: 7 days
Reason: "Testing premium features before purchase decision"
```

## Free vs Paid Premium

| Feature | Free Premium | Paid Premium |
|---------|--------------|--------------|
| Managed In | Support Dashboard | Stripe Dashboard |
| Cost | $0.00 | User pays |
| Duration | Custom (expires) | Auto-renews |
| Stripe Subscription | ❌ No | ✅ Yes |
| Revocable | ✅ Yes (support dashboard) | Via Stripe |
| Audit Trail | ✅ Yes | Via Stripe |
| Use Case | Staff, beta, compensation | Regular customers |

### Identifying Free vs Paid

Check `user_profiles.premium.isFree`:
- `true` = Granted by support (can revoke)
- `false` or `undefined` = Paid Stripe subscription

## Security & Permissions

### Role-Based Access

```typescript
// Only support and admin roles can access
const canGrantPremium = user.role === 'admin' || user.role === 'support';
```

### Audit Trail

Every premium grant/revoke is logged:
- Who granted it (support agent ID & email)
- When it was granted
- Why it was granted
- Duration specified
- User who received it

### Database Security

- Uses `supabaseAdmin` client (bypasses RLS)
- Only callable from server-side or admin tools
- Cannot be called from client-side code

## Monitoring & Analytics

### Track Free Premium Grants

```sql
-- Users with free premium
SELECT 
  email, 
  display_name,
  premium->>'planName' as plan,
  premium->>'grantedReason' as reason,
  premium->>'grantedAt' as granted_at,
  premium->>'currentPeriodEnd' as expires_at
FROM user_profiles
WHERE premium->>'isFree' = 'true'
AND premium->>'isActive' = 'true'
ORDER BY premium->>'grantedAt' DESC;
```

### Expiring Soon

```sql
-- Free premium expiring in next 7 days
SELECT 
  email,
  premium->>'grantedReason' as reason,
  premium->>'currentPeriodEnd' as expires_at
FROM user_profiles
WHERE premium->>'isFree' = 'true'
AND (premium->>'currentPeriodEnd')::timestamp < NOW() + INTERVAL '7 days'
ORDER BY premium->>'currentPeriodEnd' ASC;
```

## Best Practices

### When to Grant Free Premium

✅ **Good Reasons:**
- Beta testing new features
- Customer compensation for issues
- Staff/team accounts
- Promotional partnerships
- Influencer collaborations
- Extended trial for potential customers

❌ **Avoid:**
- Personal favors without documentation
- Excessive durations without justification
- Missing or vague reasons

### Documentation Requirements

Always provide:
1. **Clear reason** - Specific and documentable
2. **Appropriate duration** - Match the use case
3. **Follow-up** - Note ticket number if related to support issue

### Lifetime Access Guidelines

Only grant lifetime access for:
- ✅ Permanent staff accounts
- ✅ Founders/investors
- ✅ Lifetime deal purchases (if applicable)

Avoid for:
- ❌ Temporary partnerships
- ❌ Standard beta testers
- ❌ General promotions

## Troubleshooting

### Premium Not Showing After Grant

1. **Refresh the page** - Changes should be immediate
2. **Check browser console** - Look for errors
3. **Verify in database** - Check `user_profiles.premium`
4. **Clear app cache** - User may need to log out/in

### Can't Revoke Premium

**Issue**: Revoke button not showing

**Solutions:**
- Only FREE premium can be revoked
- Paid Stripe subscriptions must be managed in Stripe
- Check `premium.isFree` field in database

### Grant Button Not Working

**Checklist:**
1. Reason field filled out?
2. Valid duration entered?
3. User already has premium?
4. Check browser console for errors

## Future Enhancements

Planned improvements:
- [ ] Dedicated premium audit log table
- [ ] Email notification to user when granted
- [ ] Bulk premium granting for multiple users
- [ ] Premium extension (add more days to existing)
- [ ] Premium history timeline
- [ ] Export premium grants report

## Related Documentation

- `services/PremiumManagementService.ts` - Service implementation
- `components/support/PremiumManagement.tsx` - UI component
- `scripts/grant-free-premium.js` - CLI alternative
- `scripts/README.md` - All available scripts

## Support

For issues or questions:
1. Check this documentation
2. Review browser console logs
3. Verify user role permissions
4. Check Supabase RLS policies

---

**Last Updated**: October 2025  
**Status**: ✅ Fully Implemented

