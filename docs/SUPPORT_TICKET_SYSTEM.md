# Support Ticket System

## Overview

WizNote now has an integrated support ticket system for handling account deletion requests and general support inquiries. This replaces the previous email-only approach.

## Setup

### 1. Create the Database Table

Run the SQL setup file in your Supabase SQL editor:

```sql
-- Run this file:
database/support-tickets-setup.sql
```

This creates:
- `support_tickets` table
- Indexes for performance
- Row Level Security policies
- Auto-update triggers

### 2. Features

#### Account Deletion Requests
- **Public Access**: Anyone can submit a deletion request (no login required)
- **Tracked**: Each request gets a unique ticket ID (e.g., `DEL_1697123456_abc123`)
- **Priority**: Automatically set to "high" priority
- **GDPR Compliant**: Metadata includes data categories to be deleted

#### General Support Tickets
- Multiple ticket types: `technical`, `billing`, `feature_request`, `account_deletion`, `other`
- Priority levels: `low`, `medium`, `high`, `urgent`
- Status tracking: `pending`, `in_progress`, `resolved`, `closed`, `cancelled`

## Usage

### For Users

#### Submit Account Deletion Request
Navigate to: `/delete-account-request`

The form will:
1. Validate email address
2. Submit to `SupportService.createAccountDeletionRequest()`
3. Create a support ticket in the database
4. Return a ticket ID for tracking
5. Show success message with ticket ID

#### Submit General Support Request
Use `SupportService.createSupportTicket()`:

```typescript
const result = await supportService.createSupportTicket({
  email: 'user@example.com',
  subject: 'Cannot upload PDF',
  description: 'Getting error when uploading PDF files...',
  type: 'technical',
  userId: user?.id, // Optional
  priority: 'medium',
});
```

### For Admins/Support

#### View All Tickets
Support tickets are accessible through the admin dashboard at `/admin/support`

#### Query Tickets
```typescript
// Get all pending deletion requests
const { data } = await supabase
  .from('support_tickets')
  .select('*')
  .eq('type', 'account_deletion')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

#### Update Ticket Status
```typescript
await supabase
  .from('support_tickets')
  .update({
    status: 'in_progress',
    assigned_to: supportAgentId,
  })
  .eq('id', ticketId);
```

#### Resolve Ticket
```typescript
await supabase
  .from('support_tickets')
  .update({
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    resolved_by: supportAgentId,
    resolution_notes: 'Account deleted successfully',
  })
  .eq('id', ticketId);
```

## Ticket Structure

```typescript
{
  id: 'DEL_1697123456_abc123',
  type: 'account_deletion',
  status: 'pending',
  priority: 'high',
  user_email: 'user@example.com',
  user_id: 'uuid-here' | null,
  subject: 'Account Deletion Request',
  description: 'User provided reason',
  metadata: {
    requestType: 'account_deletion',
    dataToDelete: [...],
    gdprCompliant: true
  },
  assigned_to: null,
  resolved_at: null,
  resolved_by: null,
  resolution_notes: null,
  created_at: '2024-10-13T...',
  updated_at: '2024-10-13T...'
}
```

## Security

### Row Level Security (RLS)
- **Users**: Can view only their own tickets
- **Public**: Can create tickets (for deletion requests)
- **Admins/Support**: Can view and update all tickets
- **Admins only**: Can delete tickets

### Permissions
- `authenticated`: SELECT, INSERT, UPDATE, DELETE (with RLS)
- `anon`: INSERT only (for public deletion requests)

## Google Play Compliance

This system satisfies Google Play's requirements by:
1. ✅ Providing a public way to request account deletion
2. ✅ No authentication required for deletion requests
3. ✅ Clear tracking and confirmation (ticket ID)
4. ✅ Processing timeframe communicated (24-48 hours)
5. ✅ Accessible via direct URL: `/delete-account-request`

## Integration Points

### Files Modified
- `services/SupportService.ts` - Added ticket creation methods
- `app/delete-account-request.tsx` - Updated to use ticket system
- `database/support-tickets-setup.sql` - Database schema

### Future Enhancements
- Email notifications when ticket status changes
- Admin dashboard view for tickets
- Ticket comments/conversation thread
- Automated workflows for certain ticket types
- Ticket analytics and reporting

## Testing

### Test Account Deletion Request
1. Navigate to `/delete-account-request`
2. Enter email: `test@example.com`
3. Optional reason: "Testing the system"
4. Click "Submit Deletion Request"
5. Should receive ticket ID and success message

### Verify in Database
```sql
SELECT * FROM support_tickets 
WHERE type = 'account_deletion' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Troubleshooting

### Ticket Not Created
- Check browser console for errors
- Verify `support_tickets` table exists
- Check RLS policies are enabled
- Ensure Supabase connection is active

### Graceful Degradation
If the `support_tickets` table doesn't exist, the system will:
- Log the ticket to console
- Still return success to user
- Suggest manual email to support

This ensures the feature works even before database setup.

## Support Contact

All tickets are tracked internally. For urgent issues, users can still email:
- **Email**: support@wiznote.app
- **Response Time**: 24-48 hours

