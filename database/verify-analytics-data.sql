-- =============================================
-- Verify Analytics Data
-- Run these queries to check what data exists
-- =============================================

-- 1. Check if user_feature_usage table exists and has data
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT feature_id) as unique_features
FROM user_feature_usage;

-- 2. See all feature IDs in use
SELECT 
  feature_id,
  COUNT(*) as user_count,
  SUM(usage_count) as total_usage,
  MAX(last_used_at) as most_recent_use
FROM user_feature_usage
GROUP BY feature_id
ORDER BY total_usage DESC;

-- 3. Check recent activity (last 7 days)
SELECT 
  feature_id,
  COUNT(*) as user_count,
  SUM(usage_count) as total_usage
FROM user_feature_usage
WHERE last_used_at >= NOW() - INTERVAL '7 days'
GROUP BY feature_id
ORDER BY total_usage DESC;

-- 4. Check support tickets data
SELECT 
  type,
  status,
  COUNT(*) as count
FROM support_tickets
GROUP BY type, status
ORDER BY count DESC;

-- 5. Check if there's ANY feature usage data
SELECT * FROM user_feature_usage 
ORDER BY last_used_at DESC 
LIMIT 10;

-- =============================================
-- If NO DATA - Create Sample Data (for testing)
-- =============================================

-- Sample feature usage (run this if table is empty)
/*
INSERT INTO user_feature_usage (user_id, feature_id, usage_count, last_used_at, created_at)
VALUES 
  (auth.uid(), 'ai_transcription', 15, NOW(), NOW()),
  (auth.uid(), 'voice_recording', 25, NOW(), NOW()),
  (auth.uid(), 'ai_summary', 8, NOW(), NOW()),
  (auth.uid(), 'flashcard_generation', 12, NOW(), NOW()),
  (auth.uid(), 'quiz_generation', 5, NOW(), NOW()),
  (auth.uid(), 'pdf_upload', 3, NOW(), NOW())
ON CONFLICT (user_id, feature_id, period_start) 
DO UPDATE SET 
  usage_count = EXCLUDED.usage_count,
  last_used_at = EXCLUDED.last_used_at;
*/

-- =============================================
-- Troubleshooting
-- =============================================

-- If you see errors, check:

-- A. Does the table exist?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_feature_usage'
) AS table_exists;

-- B. Do you have permission to read it?
SELECT * FROM user_feature_usage LIMIT 1;

-- C. Check table structure
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'user_feature_usage';

