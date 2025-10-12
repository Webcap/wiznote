-- =============================================================================
-- PUBLIC SHARE SETUP - Complete Configuration
-- =============================================================================
-- This script sets up everything needed for public link sharing
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Show current policies on notes and note_shares tables
DO $$ 
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE 'CURRENT POLICIES ON NOTES TABLE:';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  FOR r IN 
    SELECT policyname, cmd, roles, qual::text
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notes'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  📋 Policy: %', r.policyname;
    RAISE NOTICE '     Command: %', r.cmd;
    RAISE NOTICE '     Roles: %', r.roles;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE 'CURRENT POLICIES ON NOTE_SHARES TABLE:';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  FOR r IN 
    SELECT policyname, cmd, roles, qual::text
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'note_shares'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  📋 Policy: %', r.policyname;
    RAISE NOTICE '     Command: %', r.cmd;
    RAISE NOTICE '     Roles: %', r.roles;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- Step 2: Enable RLS on both tables
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Step 3: Fix note_shares constraint
ALTER TABLE note_shares DROP CONSTRAINT IF EXISTS valid_share_target;

ALTER TABLE note_shares
ADD CONSTRAINT valid_share_target CHECK (
  (shared_with_user_id IS NOT NULL) OR 
  (shared_with_email IS NOT NULL) OR 
  (share_token IS NOT NULL AND shared_with_user_id IS NULL AND shared_with_email IS NULL)
);

-- Step 4: Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON note_shares;
DROP POLICY IF EXISTS "Users can create shares for their own notes" ON note_shares;
DROP POLICY IF EXISTS "Users can view shares they created" ON note_shares;
DROP POLICY IF EXISTS "Users can view shares with them" ON note_shares;
DROP POLICY IF EXISTS "Publicly shared notes are viewable by anyone" ON notes;

-- Step 5: Create note_shares policies
-- Policy 1: Anonymous and authenticated users can view public shares
CREATE POLICY "anon_can_view_public_shares"
ON note_shares
FOR SELECT
TO anon, authenticated
USING (
  share_token IS NOT NULL 
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
);

-- Policy 2: Authenticated users can create shares for their notes
CREATE POLICY "users_can_create_shares"
ON note_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Users can view their own shares
CREATE POLICY "users_can_view_own_shares"
ON note_shares
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Policy 4: Users can view shares where they are the recipient
CREATE POLICY "users_can_view_received_shares"
ON note_shares
FOR SELECT
TO authenticated
USING (auth.uid() = shared_with_user_id);

-- Step 6: Create notes policy for public access
-- This policy allows ANYONE (anon or authenticated) to view notes with public shares
CREATE POLICY "anon_can_view_publicly_shared_notes"
ON notes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM note_shares 
    WHERE note_shares.note_id = notes.id 
      AND note_shares.share_token IS NOT NULL
      AND note_shares.is_active = true
      AND (note_shares.expires_at IS NULL OR note_shares.expires_at > NOW())
  )
);

-- Step 7: Verify the new policies were created
DO $$ 
DECLARE
  r RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PUBLIC SHARING SETUP COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'note_shares';
  
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE_SHARES POLICIES (% total):', policy_count;
  
  FOR r IN 
    SELECT policyname, cmd, roles
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'note_shares'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  ✓ % (%, %)', r.policyname, r.cmd, r.roles;
  END LOOP;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'notes'
    AND policyname = 'anon_can_view_publicly_shared_notes';
  
  RAISE NOTICE '';
  RAISE NOTICE 'NOTES POLICIES FOR PUBLIC ACCESS:';
  IF policy_count > 0 THEN
    RAISE NOTICE '  ✓ anon_can_view_publicly_shared_notes (SELECT, {anon,authenticated})';
  ELSE
    RAISE NOTICE '  ❌ Policy not created!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Refresh your app';
  RAISE NOTICE '  2. Create a public link from any note';
  RAISE NOTICE '  3. Share the link - no login required!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

