-- Migration: Add PDF file support to notes table
-- This migration adds columns and storage for PDF files

-- 1. Add pdf_files column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS pdf_files JSONB DEFAULT '[]'::jsonb;

-- 2. Add pdf_url column for backward compatibility
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 3. Create index on pdf_files for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_pdf_files ON notes USING GIN (pdf_files);

-- 4. Create the pdf-files storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-files',
  'pdf-files',
  false,
  52428800, -- 50MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up RLS policies for pdf-files bucket
-- Drop existing policies if they exist, then recreate them

DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;

-- Allow authenticated users to upload their own PDFs
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-files' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own PDFs
CREATE POLICY "Users can read their own PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdf-files' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own PDFs
CREATE POLICY "Users can update their own PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdf-files' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdf-files' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6. Add comment to document the pdf_files structure
COMMENT ON COLUMN notes.pdf_files IS 'Array of PDF file objects with structure: { id, filename, storageUrl, extractedText, extractionStatus, pageCount, fileSize, createdAt }';
COMMENT ON COLUMN notes.pdf_url IS 'Legacy field for single PDF URL. Use pdf_files array instead.';

-- 7. Add PDF upload feature flag (if feature_flags table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    INSERT INTO feature_flags (
      id, name, description, enabled, rollout_percentage, 
      target_environments, premium_only, tracking_enabled, 
      created_by, created_at, updated_at
    ) VALUES (
      'pdf_upload',
      'PDF Upload',
      'Enable PDF document upload and text extraction functionality',
      true,
      100,
      to_jsonb(ARRAY['development', 'staging', 'production']),
      false,
      true,
      'system',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      updated_at = NOW();
  END IF;
END $$;

-- 8. Add PDF upload to unified feature limits (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_feature_limits') THEN
    INSERT INTO unified_feature_limits (
      feature_id, feature_name, description, free_user_limit, premium_user_limit,
      limit_type, period, is_active, requires_feature_flag, feature_flag_key,
      category, priority, created_at, updated_at
    ) VALUES (
      'pdf_upload',
      'PDF Upload',
      'Upload and extract text from PDF documents',
      999999,
      999999,
      'count',
      'monthly',
      true,
      true,
      'pdf_upload',
      'storage',
      8,
      NOW(),
      NOW()
    )
    ON CONFLICT (feature_id) DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;
END $$;

