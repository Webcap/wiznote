-- =============================================================================
-- FIX NOTES TABLE RLS POLICIES
-- =============================================================================
-- This script restores the essential RLS policies for the notes table
-- Run this in Supabase SQL Editor to fix "new row violates row-level security policy" errors
-- =============================================================================

-- Step 1: Enable RLS (just in case)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing base policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "users_can_insert_own_notes" ON notes;
DROP POLICY IF EXISTS "users_can_select_own_notes" ON notes;
DROP POLICY IF EXISTS "users_can_update_own_notes" ON notes;
DROP POLICY IF EXISTS "users_can_delete_own_notes" ON notes;

-- Step 3: Create INSERT policy - Users can create their own notes
CREATE POLICY "users_can_insert_own_notes"
ON notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Step 4: Create SELECT policy - Users can view their own notes
CREATE POLICY "users_can_select_own_notes"
ON notes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 5: Create UPDATE policy - Users can update their own notes
CREATE POLICY "users_can_update_own_notes"
ON notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create DELETE policy - Users can delete their own notes
CREATE POLICY "users_can_delete_own_notes"
ON notes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Verify the policies were created
DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ NOTES RLS POLICIES RESTORED!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'notes'
    AND policyname IN (
      'users_can_insert_own_notes',
      'users_can_select_own_notes', 
      'users_can_update_own_notes',
      'users_can_delete_own_notes'
    );
  
  RAISE NOTICE 'NOTES: % base policies created (expected: 4)', policy_count;
  
  IF policy_count = 4 THEN
    RAISE NOTICE '✓ All base policies successfully created!';
  ELSE
    RAISE NOTICE '❌ Warning: Expected 4 policies but found %', policy_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'You should now be able to:';
  RAISE NOTICE '  1. Create new notes';
  RAISE NOTICE '  2. View your notes';
  RAISE NOTICE '  3. Update your notes';
  RAISE NOTICE '  4. Delete your notes';
END $$;

