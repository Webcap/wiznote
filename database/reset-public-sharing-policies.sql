-- =============================================================================
-- RESET AND RECREATE PUBLIC SHARING POLICIES
-- =============================================================================
-- Run this if you get "policy already exists" errors
-- =============================================================================

-- Step 1: Drop ALL existing policies on note_shares
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'note_shares'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON note_shares';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 2: Drop public-sharing related policies on notes
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notes'
      AND (policyname ILIKE '%public%' OR policyname ILIKE '%anon%' OR policyname ILIKE '%shared%')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON notes';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 3: Enable RLS
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Step 4: Fix constraint
ALTER TABLE note_shares DROP CONSTRAINT IF EXISTS valid_share_target;

ALTER TABLE note_shares
ADD CONSTRAINT valid_share_target CHECK (
  (shared_with_user_id IS NOT NULL) OR 
  (shared_with_email IS NOT NULL) OR 
  (share_token IS NOT NULL AND shared_with_user_id IS NULL AND shared_with_email IS NULL)
);

-- Step 5: Create fresh policies for note_shares
CREATE POLICY "anon_can_view_public_shares"
ON note_shares
FOR SELECT
TO anon, authenticated
USING (
  share_token IS NOT NULL 
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "users_can_create_shares"
ON note_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "users_can_view_own_shares"
ON note_shares
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "users_can_view_received_shares"
ON note_shares
FOR SELECT
TO authenticated
USING (auth.uid() = shared_with_user_id);

-- Step 6: Create policy for public note access
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

-- Step 7: Verify
DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PUBLIC SHARING SETUP COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'note_shares';
  
  RAISE NOTICE 'NOTE_SHARES: % policies created', policy_count;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'notes'
    AND policyname = 'anon_can_view_publicly_shared_notes';
  
  IF policy_count > 0 THEN
    RAISE NOTICE 'NOTES: Public access policy created ✓';
  ELSE
    RAISE NOTICE 'NOTES: ❌ Policy creation failed!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  1. Create public links';
  RAISE NOTICE '  2. Share them with anyone';
  RAISE NOTICE '  3. They work without login!';
END $$;

