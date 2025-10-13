# Test User Scripts for Account Deletion Testing

## Quick Start

### Create Test User with Full Data

Run this command to create the test user:

```bash
node scripts/create-test-user-for-deletion.js
```

This will create:
- ✅ User: `test.16@webcap.cc` / `test123456`
- ✅ Display Name: `test16`
- ✅ 5 test notes (text, audio, pinned, archived)
- ✅ Test quizzes
- ✅ Test flashcards
- ✅ Usage data set to 100%
- ✅ Feature analytics

### Test Account Deletion Manually

1. **Login to the app** with:
   - Email: `test.16@webcap.cc`
   - Password: `test123456`

2. **Go to Settings** → Danger Zone → Delete Account

3. **Follow the prompts**:
   - Enter password: `test123456`
   - Type: `DELETE`
   - Confirm deletion

4. **Verify** the account and all data are deleted

### Delete Test User Programmatically (For Cleanup)

If you want to clean up the test user via script:

```bash
node scripts/delete-test-user.js
```

This will:
- ✅ Delete the auth user
- ✅ Delete the profile
- ✅ Verify complete deletion

## Script Details

### create-test-user-for-deletion.js

**What it does:**
- Creates auth user with service role (bypasses email verification)
- Creates user profile with full preferences
- Creates 5 diverse test notes
- Creates test quizzes (if table exists)
- Creates test flashcards (if table exists)
- Sets usage tracking to 100%
- Creates feature analytics

**Requirements:**
- `EXPO_PUBLIC_SUPABASE_URL` in `.env`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### delete-test-user.js

**What it does:**
- Finds the test user by email
- Shows existing data before deletion
- Deletes the auth user (admin API)
- Cleans up profile manually
- Verifies complete deletion
- Reports what was deleted

**Use this for:**
- Cleaning up after testing
- Verifying the database state
- Checking if deletion worked correctly

## Example Output

### Creating Test User

```
🔧 Creating test user for deletion testing...

👤 Creating auth user...
✅ Auth user created: 8a7f1fbd-2b4f-4f18-87cc-abea09d2ee9f

📝 Creating user profile...
✅ User profile created

📄 Creating test notes...
✅ Created 5 test notes

📚 Creating test quizzes...
✅ Created 1 test quizzes

🃏 Creating test flashcards...
✅ Created 2 test flashcards

📊 Setting usage to 100%...
✅ Usage set to 100%

📈 Creating feature analytics...
✅ Created 3 analytics entries

============================================================
✅ TEST USER CREATED SUCCESSFULLY!
============================================================

📋 User Details:
   Email:        test.16@webcap.cc
   Password:     test123456
   Display Name: test16
   User ID:      8a7f1fbd-2b4f-4f18-87cc-abea09d2ee9f

📊 Test Data:
   ✅ 5 notes created
   ✅ Usage set to 100%
   ✅ Profile fully configured

🧪 Test the Account Deletion:
   1. Login with the credentials above
   2. Go to Settings → Danger Zone
   3. Click "Delete Account"
   4. Enter password: test123456
   5. Type "DELETE" to confirm
   6. Verify all data is deleted

============================================================
```

### Deleting Test User

```
🗑️  Deleting test user and verifying deletion...

🔍 Finding user...
✅ Found user: 8a7f1fbd-2b4f-4f18-87cc-abea09d2ee9f

📊 Checking existing data...
   Notes: 5
   Profile: exists

🗑️  Deleting user...
✅ User deleted from auth.users

🧹 Cleaning up profile...
✅ Profile deleted

✅ Verifying deletion...

============================================================
VERIFICATION RESULTS:
============================================================
   Auth User: ✅ Deleted
   Profile: ✅ Deleted
   Notes: 0 ✅ Deleted
============================================================

✅ COMPLETE DELETION SUCCESSFUL! 🎉
   All user data has been completely removed.
```

## Troubleshooting

### "Missing environment variables"

Make sure your `.env` file has:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### "User already exists"

If the user already exists, the script will:
1. Detect the existing user
2. Skip user creation
3. Still create all the test data
4. Link data to the existing user

Or you can run the delete script first:
```bash
node scripts/delete-test-user.js
node scripts/create-test-user-for-deletion.js
```

### "Table does not exist"

Some tables might not exist in your database (like `flashcards`, `quizzes`, etc.). The script will:
- ✅ Continue without errors
- ⚠️  Show a warning
- ✅ Create what it can

This is normal and expected!

## Testing Workflow

1. **Create test user**: `node scripts/create-test-user-for-deletion.js`
2. **Test deletion in app**: Login and use the UI to delete account
3. **Verify in Supabase**: Check that user and data are gone
4. **Cleanup if needed**: `node scripts/delete-test-user.js`

## Files Created

- `scripts/create-test-user-for-deletion.js` - Creates test user with data
- `scripts/delete-test-user.js` - Deletes test user and verifies
- `scripts/TEST_USER_SCRIPTS_README.md` - This file

Enjoy testing! 🎉

