-- Migration: Add PDF Upload to Unified Feature Limits
-- This adds the pdf_upload feature to the unified_feature_limits table

-- 1. Insert the pdf_upload feature limit
INSERT INTO unified_feature_limits (
  feature_id,
  feature_name,
  description,
  free_user_limit,
  premium_user_limit,
  limit_type,
  period,
  is_active,
  requires_feature_flag,
  feature_flag_key,
  category,
  priority,
  created_at,
  updated_at
) VALUES (
  'pdf_upload',
  'PDF Upload',
  'Upload and extract text from PDF documents',
  999999,                    -- unlimited for testing (large number represents unlimited)
  999999,                    -- unlimited for premium
  'count',                   -- limit_type: count (number of PDFs)
  'monthly',                 -- period: monthly
  true,                      -- is_active
  true,                      -- requires_feature_flag
  'pdf_upload',              -- feature_flag_key
  'storage',                 -- category: storage (core features)
  8,                         -- priority: 8 (after note_storage which is 7)
  NOW(),                     -- created_at
  NOW()                      -- updated_at
)
ON CONFLICT (feature_id) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_user_limit = EXCLUDED.free_user_limit,
  premium_user_limit = EXCLUDED.premium_user_limit,
  limit_type = EXCLUDED.limit_type,
  period = EXCLUDED.period,
  is_active = EXCLUDED.is_active,
  requires_feature_flag = EXCLUDED.requires_feature_flag,
  feature_flag_key = EXCLUDED.feature_flag_key,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- 2. Verify the insert
SELECT 
  feature_id,
  feature_name,
  category,
  free_user_limit,
  premium_user_limit,
  is_active,
  feature_flag_key
FROM unified_feature_limits
WHERE feature_id = 'pdf_upload';

-- 3. Show all storage category features
SELECT 
  feature_id,
  feature_name,
  priority,
  category
FROM unified_feature_limits
WHERE category = 'storage'
ORDER BY priority;

