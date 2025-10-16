-- Clear all rate limit attempts (useful during development)
-- ⚠️  Use with caution in production

-- Option 1: Clear all signup rate limits
DELETE FROM rate_limit_attempts WHERE attempt_type = 'auth_signup';

-- Option 2: Clear rate limits for a specific email
-- DELETE FROM rate_limit_attempts 
-- WHERE identifier = 'your-email@example.com' 
-- AND attempt_type = 'auth_signup';

-- Option 3: Clear all rate limit attempts older than 1 hour
-- DELETE FROM rate_limit_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';

-- Option 4: View current rate limit attempts
SELECT 
  identifier,
  attempt_type,
  COUNT(*) as attempt_count,
  MAX(attempted_at) as last_attempt,
  MIN(attempted_at) as first_attempt
FROM rate_limit_attempts
WHERE attempted_at > NOW() - INTERVAL '15 minutes'
GROUP BY identifier, attempt_type
ORDER BY attempt_count DESC, last_attempt DESC;

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Rate limit data cleared';
  RAISE NOTICE 'You can now try signing up again';
END $$;

