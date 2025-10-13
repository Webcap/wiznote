-- Fix the note_shares constraint to allow public shares
-- Public shares have a share_token but no shared_with_user_id or shared_with_email

-- Drop the old constraint if it exists
ALTER TABLE note_shares
DROP CONSTRAINT IF EXISTS valid_share_target;

-- Add the updated constraint that allows:
-- 1. Shares with a specific user (shared_with_user_id IS NOT NULL)
-- 2. Shares with an email (shared_with_email IS NOT NULL)
-- 3. Public shares (share_token IS NOT NULL and both user_id/email are NULL)
ALTER TABLE note_shares
ADD CONSTRAINT valid_share_target CHECK (
  (shared_with_user_id IS NOT NULL) OR 
  (shared_with_email IS NOT NULL) OR 
  (share_token IS NOT NULL AND shared_with_user_id IS NULL AND shared_with_email IS NULL)
);

-- Add comment
COMMENT ON CONSTRAINT valid_share_target ON note_shares IS 'Ensures shares have either a specific target (user_id or email) or are public (token only)';

-- Create RLS policy for public shares (accessible by anyone with the token)
-- This allows anonymous users to view shared notes via public links
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON note_shares;

CREATE POLICY "Public shares are viewable by anyone"
ON note_shares
FOR SELECT
TO anon, authenticated
USING (
  share_token IS NOT NULL 
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
);

-- Allow authenticated users to create shares
DROP POLICY IF EXISTS "Users can create shares for their own notes" ON note_shares;

CREATE POLICY "Users can create shares for their own notes"
ON note_shares
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
);

-- Allow users to view shares they created
DROP POLICY IF EXISTS "Users can view shares they created" ON note_shares;

CREATE POLICY "Users can view shares they created"
ON note_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
);

-- Allow anonymous users to view publicly shared notes
DROP POLICY IF EXISTS "Publicly shared notes are viewable by anyone" ON notes;

CREATE POLICY "Publicly shared notes are viewable by anyone"
ON notes
FOR SELECT
TO anon, authenticated
USING (
  -- Check if the note has an active public share
  EXISTS (
    SELECT 1 
    FROM note_shares 
    WHERE note_shares.note_id = notes.id 
      AND note_shares.share_token IS NOT NULL
      AND note_shares.is_active = true
      AND (note_shares.expires_at IS NULL OR note_shares.expires_at > NOW())
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Public share constraint and policies updated successfully';
  RAISE NOTICE '  - Direct user shares: shared_with_user_id';
  RAISE NOTICE '  - Email shares: shared_with_email';
  RAISE NOTICE '  - Public shares: share_token (no user/email)';
  RAISE NOTICE '  - RLS: Anonymous users can access public shares and notes';
  RAISE NOTICE '';
  RAISE NOTICE 'To create a public share link:';
  RAISE NOTICE '  1. Open any note';
  RAISE NOTICE '  2. Click Share button';
  RAISE NOTICE '  3. Scroll to "Public Link" section';
  RAISE NOTICE '  4. Click "Create Public Link"';
  RAISE NOTICE '  5. Copy and share the link!';
END $$;

