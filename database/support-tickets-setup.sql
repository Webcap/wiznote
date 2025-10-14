-- =============================================
-- Support Tickets Table Setup
-- For account deletion requests and general support
-- =============================================

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('technical', 'billing', 'feature_request', 'account_deletion', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  user_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

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

-- Policy: Only admins and support agents can update tickets
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

-- Policy: Only admins can delete tickets
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

-- Policy: Admins and support can view all tickets
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

-- Add comments for documentation
COMMENT ON TABLE support_tickets IS 'Support tickets including account deletion requests';
COMMENT ON COLUMN support_tickets.id IS 'Unique ticket identifier (e.g., DEL_*, TKT_*)';
COMMENT ON COLUMN support_tickets.type IS 'Type of support request';
COMMENT ON COLUMN support_tickets.status IS 'Current status of the ticket';
COMMENT ON COLUMN support_tickets.priority IS 'Priority level of the ticket';
COMMENT ON COLUMN support_tickets.user_email IS 'Email of the person requesting support';
COMMENT ON COLUMN support_tickets.user_id IS 'User ID if authenticated, NULL if public request';
COMMENT ON COLUMN support_tickets.metadata IS 'Additional ticket data (JSON)';
COMMENT ON COLUMN support_tickets.assigned_to IS 'Support agent assigned to this ticket';

-- Grant permissions
GRANT SELECT ON support_tickets TO authenticated;
GRANT INSERT ON support_tickets TO authenticated, anon;
GRANT UPDATE, DELETE ON support_tickets TO authenticated;

