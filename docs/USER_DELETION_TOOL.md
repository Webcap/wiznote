# User Deletion Tool - Support Agent Guide

## Overview

The User Deletion Tool is a comprehensive interface for support agents to safely and completely process account deletion requests in compliance with GDPR and Google Play requirements.

## Access

**URL:** `/admin/support` → **Account Deletion** card

**Required Role:** Admin or Support agent

## Features

### 📊 **Dashboard Overview**
- **Total Requests**: Count of all deletion requests
- **Pending**: Requests waiting to be processed
- **Resolved**: Completed deletions

### 🎫 **Ticket Management**

Each deletion request shows:
- **Status Badge**: Pending, In Progress, Resolved, Cancelled
- **Priority Badge**: High (all deletion requests)
- **User Email**: Email of the account to delete
- **User ID**: UUID if user is in the database
- **Ticket ID**: Unique identifier for tracking
- **Reason**: Why the user wants to delete their account
- **Submitted Date**: When the request was made

### 🔄 **Workflow (IMPORTANT)**

#### ⚠️ VERIFICATION IS MANDATORY ⚠️

**You MUST verify every deletion request before processing!**

#### Step 1: Review Request
- Click on a pending deletion request
- Review the user's email and reason
- Note the submission date
- Check for any red flags (suspicious email, recent signup, etc.)

#### Step 2: Verify Request Legitimacy
**🔐 CRITICAL SECURITY STEP:**

1. **Email the user** at the provided email address:
   ```
   Subject: WizNote Account Deletion Request Verification
   
   Hello,
   
   We received a request to delete your WizNote account associated with this email address.
   
   Ticket ID: [TICKET_ID]
   Submitted: [DATE]
   
   To confirm this request came from you, please reply to this email with:
   "I confirm I want to delete my WizNote account and all associated data."
   
   If you did not make this request, please reply immediately and we will investigate.
   
   Thank you,
   WizNote Support Team
   ```

2. **Wait for user response** from the SAME email address

3. **Verify the response**:
   - ✅ Response came from the original email
   - ✅ User explicitly confirms deletion
   - ✅ No active disputes or issues

4. **Click "Start Verification"** to mark as in-progress

#### Step 3: Process Deletion (After Verification)
- Click **"Verify & Delete"** (pending tickets)
- OR **"Complete Deletion"** (in-progress tickets)
- System will ask verification questions
- Confirm you've completed verification steps

#### Step 4: Two-Step Confirmation
1. **Verification Dialog**: Confirms you verified the request
2. **Final Confirmation**: Last chance before deletion

#### Step 5: Automated Deletion
- Watch the progress bar and logs
- Wait for completion (usually 5-10 seconds)
- Ticket automatically marked as resolved

#### Step 4: Automated Deletion Process

The system automatically:

1. **Finds User** (10%)
   - Searches for user by email
   - Retrieves user ID

2. **Deletes Notes** (30-40%)
   - Removes all text, audio, and PDF notes
   - Shows count of deleted notes

3. **Deletes Audio Files** (50-55%)
   - Removes audio file metadata
   - Shows count of deleted audio files

4. **Deletes PDF Files** (60-65%)
   - Removes PDF file metadata
   - Shows count of deleted PDFs

5. **Deletes Flashcards** (70-75%)
   - Removes all flashcards
   - Shows count deleted

6. **Deletes Quizzes** (80-82%)
   - Removes all quizzes
   - Shows count deleted

7. **Deletes Usage Records** (85-88%)
   - Removes feature usage history
   - Cleans up analytics data

8. **Removes Shared Notes** (90-92%)
   - Deletes shared note permissions
   - Removes from shared notes they own

9. **Marks Profile as Deleted** (93-95%)
   - Sets `deleted_at` timestamp
   - Changes role to `'deleted'`
   - Preserves record for audit trail

10. **Deletes Authentication Account** (97-98%)
    - Removes user from `auth.users` table
    - Allows user to re-register with same email
    - Completely removes login credentials

11. **Creates Audit Log** (99%)
    - Records deletion in audit table
    - Logs who performed deletion
    - Stores deletion summary
    - GDPR compliance record

12. **Resolves Ticket** (100%)
    - Marks ticket as resolved
    - Adds resolution notes with deletion summary
    - Records who resolved it and when

### 📈 **Live Progress Tracking**

While deletion is in progress, you'll see:
- **Progress bar** showing percentage complete
- **Current step** description
- **Detailed log** of all actions taken
- **Item counts** for each data type deleted

### ✅ **Completion**

After successful deletion:
- **Success message** shows total items deleted
- **Ticket status** changes to `resolved` (green badge)
- **List refreshes** automatically
- **Progress modal** closes after 2 seconds

## What Gets Deleted

### ✅ User Data COMPLETELY Deleted:
- ✅ Authentication account (auth.users) - **User can re-register**
- ✅ All notes (text, audio, PDF)
- ✅ All audio recordings and transcriptions
- ✅ All PDF documents
- ✅ All flashcards
- ✅ All quizzes
- ✅ Feature usage records
- ✅ Shared note permissions
- ✅ User preferences

### 📋 Audit Records Preserved (for compliance):
- User profile record (marked as deleted with timestamp)
- Support ticket record
- Deletion audit log (who, when, what was deleted)
- Resolution notes

**Important:** User CAN re-register with the same email after deletion (auth account is completely removed).

## Error Handling

### Common Errors:

**"No user found with email"**
- User doesn't exist in the database
- Email might be misspelled in the request
- User might have already been deleted

**Solution:** Verify the email, check if user exists, or mark ticket as cancelled

**"Permission denied"**
- Your user doesn't have admin/support role
- RLS policies blocking the action

**Solution:** Run `UPDATE user_profiles SET role = 'admin' WHERE id = auth.uid();`

**"Failed to delete notes"**
- Database connection issue
- Foreign key constraints

**Solution:** Check database connectivity, review error details

### Recovery:

If deletion fails midway:
- Check the progress log to see what was completed
- Manually complete remaining steps if needed
- Contact database admin for assistance
- Update ticket with current status

## Safety Features

### 🛡️ **Protection Mechanisms:**

1. **Mandatory Verification**
   - Must verify request via email to user
   - Verification dialog with checklist
   - Prevents accidental/fraudulent deletions
   - Ensures request authenticity

2. **Double Confirmation**
   - Verification confirmation dialog
   - Final deletion confirmation dialog
   - Clear warnings about irreversibility
   - Shows exactly what will be deleted

3. **Audit Trail**
   - Ticket records who initiated deletion
   - Resolution notes show what was deleted
   - Timestamps track when deletion occurred
   - User profile preserved with deleted_at flag
   - Verification process documented

4. **Reversibility Window**
   - User profile marked as deleted (not removed)
   - 30-day grace period possible to implement
   - Can restore if deleted by mistake

5. **Progress Tracking**
   - Step-by-step visibility
   - Know exactly what's been deleted
   - Can diagnose failures
   - Real-time status updates

6. **Visual Warnings**
   - Orange verification warning on pending tickets
   - Clear "Verification Required" message
   - Reminds agent to verify before proceeding

## Best Practices

### ✅ DO:
- **ALWAYS verify** by emailing the user first
- Wait for user confirmation from the SAME email
- Review the request before processing
- Verify the email address is correct
- Check if user has active subscription (cancel first if needed)
- Read the user's reason for context
- Process requests within 24-48 hours after verification
- Document any unusual situations in resolution notes
- Keep records of verification emails
- Mark ticket as "in_progress" while awaiting verification

### ❌ DON'T:
- **NEVER delete without email verification**
- Delete accounts without user confirmation
- Process requests from different email addresses
- Skip the verification dialog
- Delete accounts with active disputes
- Process requests older than 30 days without re-verification
- Process suspicious requests (new accounts, typos, etc.)
- Delete if user is disputing charges

### 🚨 RED FLAGS - DO NOT PROCESS:

- Request email doesn't match account email
- User has active billing dispute
- Account created within last 7 days
- Multiple deletion requests from same IP
- Suspicious timing (right after purchase/refund)
- User has open support tickets
- Request contains threats or unusual language

**If you see red flags:** Contact senior support or admin before processing.

## GDPR Compliance

This tool ensures GDPR compliance by:

✅ Processing deletion requests within required timeframe  
✅ Deleting all user personal data  
✅ Maintaining audit trail for legal compliance  
✅ Providing confirmation to users  
✅ Documenting deletion process  
✅ Allowing verification of deletion  

## Subscription Handling

**Important:** Before deleting an account with an active subscription:

1. **Check subscription status** in Stripe
2. **Cancel subscription** if active
3. **Refund if appropriate** (based on policy)
4. **Then process deletion**

The tool currently doesn't auto-cancel Stripe subscriptions - handle manually first.

## Testing

### Test Deletion Request:

1. Go to `/delete-account-request`
2. Submit with a test email
3. Go to `/admin/support` → **Account Deletion**
4. Find the test request
5. Click "Delete Account"
6. Monitor progress
7. Verify completion

### Verify Deletion:

```sql
-- Check if user is marked as deleted
SELECT id, deleted_at, role 
FROM user_profiles 
WHERE email = 'test@example.com';

-- Check if notes are gone
SELECT COUNT(*) FROM notes WHERE user_id = 'USER_ID_HERE';

-- Check ticket was resolved
SELECT * FROM support_tickets WHERE id = 'TICKET_ID_HERE';
```

## Troubleshooting

### Issue: Deletion Hangs at Certain Step

**Solution:**
1. Check browser console for specific error
2. Verify database connectivity
3. Check if foreign key constraints are blocking deletion
4. Manually delete problematic data
5. Update ticket status manually

### Issue: User Profile Not Found

**Solution:**
- User might not exist in database
- Check auth.users table directly
- User might have signed up but profile creation failed
- Mark ticket as "cannot process" and notify user

### Issue: Partial Deletion

**Solution:**
1. Note which steps completed in progress log
2. Manually complete remaining deletions
3. Update ticket with notes about partial deletion
4. Verify all data is gone before marking resolved

## Support Contact

If you encounter issues with the deletion tool:
- Check documentation: `docs/SUPPORT_TICKET_SYSTEM.md`
- Review database setup: `database/support-tickets-setup.sql`
- Contact technical lead for assistance

## Future Enhancements

Planned features:
- Automatic Stripe subscription cancellation
- Bulk deletion processing
- Scheduled deletions
- Email confirmation to user
- Detailed audit report export
- Restoration capability (within grace period)

