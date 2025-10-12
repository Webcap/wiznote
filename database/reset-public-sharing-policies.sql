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

-- Step 6: Create BASE policies for authenticated users
CREATE POLICY "users_can_insert_own_notes"
ON notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_select_own_notes"
ON notes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notes"
ON notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_notes"
ON notes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Create policy for public note access
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

-- Step 8: Verify
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
  WHERE schemaname = 'public' AND tablename = 'notes';
  
  RAISE NOTICE 'NOTES: % policies created (expected: 5)', policy_count;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'notes'
    AND policyname IN (
      'users_can_insert_own_notes',
      'users_can_select_own_notes',
      'users_can_update_own_notes',
      'users_can_delete_own_notes',
      'anon_can_view_publicly_shared_notes'
    );
  
  IF policy_count = 5 THEN
    RAISE NOTICE 'NOTES: All policies created successfully ✓';
  ELSE
    RAISE NOTICE 'NOTES: ❌ Expected 5 policies but found %', policy_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  1. Create public links';
  RAISE NOTICE '  2. Share them with anyone';
  RAISE NOTICE '  3. They work without login!';
END $$;

