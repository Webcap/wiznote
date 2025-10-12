-- Migration: Update PDF file size limit in storage bucket
-- 
-- INSTRUCTIONS:
-- 1. Update the file_size_limit value below to your desired limit (in bytes)
-- 2. Run this migration in your Supabase SQL editor
-- 3. Update the corresponding value in constants/PDFConfig.ts
--
-- Common size limits:
-- - 10MB  = 10485760
-- - 25MB  = 26214400
-- - 50MB  = 52428800 (current default)
-- - 100MB = 104857600
-- - 200MB = 209715200
-- - 500MB = 524288000

-- Update the pdf-files bucket size limit
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200MB in bytes
WHERE id = 'pdf-files';

-- Verify the update
SELECT id, name, file_size_limit, file_size_limit / 1024 / 1024 AS size_limit_mb
FROM storage.buckets
WHERE id = 'pdf-files';

-- Expected output:
-- id         | name      | file_size_limit | size_limit_mb
-- pdf-files  | pdf-files | 209715200       | 200

