-- Update Audio Storage Bucket MIME Types
-- This migration updates the audio-files bucket to allow common audio MIME types
-- Run this in Supabase SQL Editor

-- Update the audio-files bucket to allow common audio MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'video/webm'
]
WHERE id = 'audio-files';

-- Verify the update
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'audio-files' 
    AND 'audio/webm' = ANY(allowed_mime_types)
  ) THEN
    RAISE NOTICE '✅ Audio bucket MIME types updated successfully';
    RAISE NOTICE '📝 Allowed MIME types: audio/webm, audio/mpeg, audio/wav, audio/ogg, audio/mp4, video/webm';
  ELSE
    RAISE EXCEPTION 'Failed to update audio bucket MIME types';
  END IF;
END $$;

-- Show current bucket configuration
SELECT 
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets 
WHERE id = 'audio-files';
