-- =============================================
-- Fix Support Tickets RLS Policies
-- Run this if you're getting permission errors
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;

-- Recreate policies with proper USING and WITH CHECK clauses

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Anyone can create a ticket (for public deletion requests)
CREATE POLICY "Anyone can create tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins and support agents can update tickets
CREATE POLICY "Admins can update tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'support')
    )
  );

-- Policy: Admins can delete tickets
CREATE POLICY "Admins can delete tickets"
  ON support_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admins and support can view all tickets (separate from user policy)
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'support')
    )
  );

-- Verify policies were created
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'support_tickets';

-- Test query to verify permissions
-- Run this as an admin user:
-- SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 5;

