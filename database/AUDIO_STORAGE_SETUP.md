# Audio Storage Setup Guide (SECURE CONFIGURATION)

## Problem

Audio recording on web wasn't working because:
1. ✅ Audio records successfully as a blob
2. ✅ Blob uploads to Supabase storage
3. ❌ **Storage bucket doesn't have permissions to read files** → 400 error
4. ❌ AI transcription can't fetch the file → no AI processing

## Solution

Set up a **secure, private storage bucket** where users can only access their own audio files.

## Security Model 🔐

**Bucket Type:** Private (NOT public)

**Access Rules:**
- ✅ User A can upload/read/delete files in `audio-files/userA/...`
- ❌ User A **CANNOT** access `audio-files/userB/...`
- ✅ AI transcription works (uses user's auth token)
- ✅ Audio playback works (user is authenticated)
- ❌ Unauthenticated users **CANNOT** access any files

**File Structure:**
```
audio-files/
├── user123/
│   ├── note456/
│   │   └── audio_123.webm  ← Only user123 can access
│   └── note789/
│       └── audio_456.webm
└── user999/
    └── note111/
        └── audio_789.webm  ← Only user999 can access
```

## Steps to Fix

### Step 1: Create Private Storage Bucket (via SQL)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy the entire contents of `database/audio-storage-setup.sql`
6. Paste it into the SQL editor
7. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

You should see:
```
✅ Audio storage bucket created as PRIVATE
🔐 Bucket is secure - users can only access their own files
```

### Step 2: Create Security Policies (via Dashboard UI)

Now create 4 policies to control who can access what.

1. In Supabase Dashboard, click **Storage** in the left sidebar
2. Click on **"audio-files"** bucket
3. Click the **"Policies"** tab at the top
4. Click **"New Policy"** button

---

#### 📥 Policy 1: Upload Own Files (Required)

1. Click **"New Policy"**
2. Select template: **"Give users access to a folder based on their user ID"** or create from scratch
3. Fill in:
   - **Policy name:** `Users can upload their own audio files`
   - **Policy command:** Check **INSERT** ✅
   - **Target roles:** Select **authenticated**
   - **WITH CHECK expression:**
     ```sql
     bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
4. Click **Review** → **Save policy**

---

#### 📖 Policy 2: Read Own Files (Required)

1. Click **"New Policy"**
2. Fill in:
   - **Policy name:** `Users can read their own audio files`
   - **Policy command:** Check **SELECT** ✅
   - **Target roles:** Select **authenticated**
   - **USING expression:**
     ```sql
     bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
3. Click **Review** → **Save policy**

---

#### ✏️ Policy 3: Update Own Files (Optional)

1. Click **"New Policy"**
2. Fill in:
   - **Policy name:** `Users can update their own audio files`
   - **Policy command:** Check **UPDATE** ✅
   - **Target roles:** Select **authenticated**
   - **USING expression:**
     ```sql
     bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - **WITH CHECK expression:** (same as USING)
     ```sql
     bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
3. Click **Review** → **Save policy**

---

#### 🗑️ Policy 4: Delete Own Files (Optional)

1. Click **"New Policy"**
2. Fill in:
   - **Policy name:** `Users can delete their own audio files`
   - **Policy command:** Check **DELETE** ✅
   - **Target roles:** Select **authenticated**
   - **USING expression:**
     ```sql
     bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
3. Click **Review** → **Save policy**

---

### Step 3: Verify Policies

You should now see 4 policies listed:
- ✅ Users can upload their own audio files (INSERT)
- ✅ Users can read their own audio files (SELECT)
- ✅ Users can update their own audio files (UPDATE)
- ✅ Users can delete their own audio files (DELETE)

### Step 4: Verify Bucket is Private

1. Go to **Storage** → **audio-files** → **Configuration**
2. Confirm **Public bucket:** is set to **No** ✅

### 4. Test Audio Recording

1. Go back to your web app
2. Navigate to "Create Audio Note"
3. Record audio
4. The audio should now:
   - ✅ Upload successfully
   - ✅ Save with permanent URL
   - ✅ Trigger AI transcription
   - ✅ Be playable after page refresh

## What the Migration Does

### Creates the Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
```

### Sets Up Permissions

1. **Upload**: Only authenticated users can upload to `audio-files/{their_user_id}/...`
2. **Read**: Anyone can read from the bucket (public playback)
3. **Update/Delete**: Only the file owner can modify/delete their files

## Troubleshooting

### Error: "bucket already exists"
This is fine - the migration uses `ON CONFLICT DO UPDATE` to handle existing buckets.

### Error: "permission denied"
Make sure you're running this as a Supabase admin in the SQL Editor.

### Files still not accessible
1. Check bucket exists: `SELECT * FROM storage.buckets WHERE id = 'audio-files';`
2. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%audio%';`
3. Verify bucket is public: The `public` column should be `true`

### Still getting 400 errors
1. Clear your browser cache
2. Try a hard refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`)
3. Check the Supabase Storage dashboard to verify files are uploading
4. Check browser console for detailed error messages

## Alternative: Manual Setup via Dashboard

If SQL migration doesn't work, you can set up manually:

1. Go to **Storage** in Supabase Dashboard
2. Click **"Create a new bucket"**
3. Name it `audio-files`
4. Set **Public bucket**: `Yes`
5. Click **Create**
6. Go to **Policies** tab
7. Add the policies from the SQL file manually

## Quick Reference: Policy SQL

If you prefer to copy/paste, here are the 4 policy definitions:

### Policy 1: Upload (INSERT)
```sql
bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 2: Read (SELECT)
```sql
bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 3: Update (UPDATE)
```sql
bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 4: Delete (DELETE)
```sql
bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text
```

**They're all the same!** Just change the operation (INSERT/SELECT/UPDATE/DELETE) for each policy.

---

## Files Involved

- `database/audio-storage-setup.sql` - The migration SQL
- `services/AudioStorage.ts` - Handles file uploads
- `services/AudioUtils.web.ts` - Handles fetching for transcription (with auth headers)
- `app/create-audio.tsx` - Creates audio notes

## Next Steps After Migration

Once the migration is complete, web audio recording will be fully functional with:
- ✅ Permanent storage (private & secure)
- ✅ AI transcription (with authentication)
- ✅ AI summaries
- ✅ AI quiz generation
- ✅ Audio playback from any device (logged in)
- 🔐 **Maximum privacy** - users can only access their own files

