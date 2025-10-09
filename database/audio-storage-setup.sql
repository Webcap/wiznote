-- Audio Storage Bucket Setup (SECURE - Private Bucket)
-- This migration creates a PRIVATE audio-files storage bucket
-- Run this in Supabase SQL Editor

-- Create the audio-files bucket as PRIVATE (public = false)
-- Users can only access their own files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Verify bucket was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'audio-files') THEN
    RAISE NOTICE '✅ Audio storage bucket created as PRIVATE';
    RAISE NOTICE '🔐 Bucket is secure - users can only access their own files';
    RAISE NOTICE '📝 NEXT STEP: Go to Storage → audio-files → Policies to create policies';
  ELSE
    RAISE EXCEPTION 'Failed to create audio-files bucket';
  END IF;
END $$;

