-- =============================================
-- Diagnose Support Ticket Permission Issues
-- Run these queries to identify the problem
-- =============================================

-- 1. Check if support_tickets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'support_tickets'
) AS table_exists;

-- 2. Check current user's role and email
SELECT 
  up.id,
  au.email,
  up.role,
  up.display_name,
  up.created_at
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.id = auth.uid();

-- 3. Check RLS is enabled on support_tickets
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'support_tickets';

-- 4. List all RLS policies for support_tickets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'support_tickets';

-- 5. Try to view all tickets (will fail if RLS blocks you)
SELECT 
  id,
  type,
  status,
  user_email,
  subject,
  created_at
FROM support_tickets
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if you can update tickets
-- First, get a ticket ID
SELECT id FROM support_tickets LIMIT 1;

-- Then try to update it (replace 'YOUR_TICKET_ID' with actual ID from above)
-- UPDATE support_tickets 
-- SET status = 'in_progress' 
-- WHERE id = 'YOUR_TICKET_ID';

-- =============================================
-- QUICK FIXES
-- =============================================

-- Option 1: Temporarily disable RLS to test (NOT for production!)
-- ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;

-- Option 2: Give your user admin role (RECOMMENDED)
-- First check if your user_profiles record exists
SELECT * FROM user_profiles WHERE id = auth.uid();

-- If it exists but role is NULL or not 'admin', update it:
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- If no record exists in user_profiles, you need to create one first
-- (This should have been created automatically on signup)

-- Option 3: Create a permissive policy for testing
-- CREATE POLICY "temp_allow_all_authenticated"
--   ON support_tickets
--   FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Remember to remove test policies later!
-- DROP POLICY IF EXISTS "temp_allow_all_authenticated" ON support_tickets;

