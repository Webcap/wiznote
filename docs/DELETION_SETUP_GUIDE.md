# Complete Account Deletion Setup Guide

## Quick Start (5 Minutes)

### Step 1: Run Database Setup Scripts

In your **Supabase SQL Editor**, run these files **in order**:

```sql
-- 1. Create support tickets table
-- Copy and paste: database/support-tickets-setup.sql
-- This creates the ticket system

-- 2. Create deletion functions
-- Copy and paste: database/delete-auth-user-function.sql
-- This enables complete user deletion including auth
```

### Step 2: Set Your User Role

```sql
-- Give yourself admin access
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- Verify it worked
SELECT role FROM user_profiles WHERE id = auth.uid();
-- Should return: 'admin'
```

### Step 3: Test the System

1. **Submit a test deletion request:**
   - Go to: `http://localhost:8081/delete-account-request`
   - Enter: `test@example.com`
   - Click: "Submit Deletion Request"
   - Note the ticket ID

2. **View the ticket:**
   - Go to: `/admin/support`
   - Click: "Account Deletion"
   - You should see your test ticket

3. **Process the ticket:**
   - Click: "Verify & Delete"
   - Follow verification prompts
   - Watch the deletion progress

### Step 4: Verify Completion

```sql
-- Check the ticket was resolved
SELECT * FROM support_tickets 
WHERE type = 'account_deletion' 
ORDER BY created_at DESC 
LIMIT 1;
-- Status should be 'resolved'

-- Check audit log
SELECT * FROM user_deletion_audit 
ORDER BY deleted_at DESC 
LIMIT 1;
-- Should show the deletion record
```

## ✅ What This Enables

### For Users:
- ✅ Can request account deletion without logging in
- ✅ Get a tracking ticket ID
- ✅ Receive email confirmation
- ✅ Can re-register with same email after deletion

### For Support Agents:
- ✅ View all deletion requests
- ✅ Verify requests are legitimate
- ✅ Process complete deletions with one click
- ✅ Track progress in real-time
- ✅ See audit trail

### For Compliance:
- ✅ GDPR compliant
- ✅ Google Play compliant
- ✅ Complete audit trail
- ✅ Documented verification process
- ✅ Processing timeline tracking

## Complete Deletion Process

When a support agent processes a deletion request, the system:

1. ✅ Finds the user account
2. ✅ Deletes all notes (text, audio, PDF)
3. ✅ Deletes all audio files and transcriptions
4. ✅ Deletes all PDF documents
5. ✅ Deletes all flashcards
6. ✅ Deletes all quizzes
7. ✅ Deletes feature usage history
8. ✅ Removes shared note permissions
9. ✅ Marks user profile as deleted
10. ✅ **Deletes authentication account (auth.users)**
11. ✅ Creates audit log entry
12. ✅ Resolves the support ticket

**Result:** User is COMPLETELY removed and can re-register with the same email.

## Database Schema Created

### Tables:
- `support_tickets` - Deletion requests and general tickets
- `user_deletion_audit` - Audit log of all deletions

### Functions:
- `delete_auth_user(UUID)` - Delete user from auth system
- `log_user_deletion(UUID, TEXT, UUID, JSONB)` - Create audit record

### Policies:
- Public can create tickets (no auth required)
- Users can view own tickets
- Admins can view/update all tickets
- Only admins can delete users

## Troubleshooting

### "Permission denied" when updating ticket
**Fix:**
```sql
UPDATE user_profiles SET role = 'admin' WHERE id = auth.uid();
```

### "Function delete_auth_user does not exist"
**Fix:**
Run `database/delete-auth-user-function.sql`

### "Table support_tickets does not exist"
**Fix:**
Run `database/support-tickets-setup.sql`

### "Could not delete auth account"
**Fix:**
- Check function exists
- Verify function has SECURITY DEFINER
- Check if user exists in auth.users
- Review function error logs

## Verification Email Workflow

### 1. User Submits Request
- Gets ticket ID
- Receives confirmation

### 2. Support Agent Reviews
- Sees pending ticket
- Orange warning: "Verification Required"

### 3. Agent Sends Verification Email
- Use template from `DELETION_VERIFICATION_EMAIL_TEMPLATE.md`
- Click "Start Verification" to mark as in-progress

### 4. User Confirms
- Replies from same email
- Explicitly confirms deletion

### 5. Agent Processes Deletion
- Click "Complete Deletion"
- Verification checklist appears
- Agent confirms all checks passed
- Deletion proceeds automatically

### 6. Completion Email
- Send Template 4 to user
- Include deletion summary
- Confirm completion

## Security Checklist

Before deleting ANY account, verify:

- [ ] Email sent to user for confirmation
- [ ] User responded from SAME email address
- [ ] User explicitly confirmed deletion
- [ ] No active billing disputes
- [ ] No suspicious activity
- [ ] Account is older than 7 days (if suspicious)
- [ ] No open support tickets (besides deletion)
- [ ] Checked for any subscription refund issues

**If ANY checkbox fails, DO NOT proceed.**

## GDPR Compliance

This system is GDPR compliant because:

✅ Users can request deletion without logging in  
✅ Requests processed within 30 days  
✅ All personal data deleted  
✅ Audit trail maintained for legal compliance  
✅ User receives confirmation  
✅ Deletion is complete and irreversible  
✅ User can re-register (no data retained)  

## Support Contact

Questions about the deletion tool?
- Review: `docs/USER_DELETION_TOOL.md`
- Email templates: `docs/DELETION_VERIFICATION_EMAIL_TEMPLATE.md`
- Diagnostics: `database/diagnose-ticket-permissions.sql`

