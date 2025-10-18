-- Support Ticket Messages System
-- This allows support agents and users to have conversations within tickets

-- Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'support', 'admin')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes only visible to support staff
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON support_ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON support_ticket_messages(created_at DESC);

-- Row Level Security Policies
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their own tickets (non-internal only)
CREATE POLICY "Users can view their ticket messages"
  ON support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Must be related to a ticket owned by the user
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    -- And must not be an internal note
    AND is_internal = FALSE
  );

-- Users can send messages to their own tickets
CREATE POLICY "Users can send messages to their tickets"
  ON support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be related to a ticket owned by the user
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    -- And sender must be the current user
    AND sender_id = auth.uid()
    -- Users cannot mark messages as internal
    AND is_internal = FALSE
  );

-- Support agents and admins can view all messages (including internal)
CREATE POLICY "Support staff can view all ticket messages"
  ON support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is support or admin
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('support', 'admin')
    )
  );

-- Support agents and admins can send messages to any ticket
CREATE POLICY "Support staff can send messages to any ticket"
  ON support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is support or admin
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('support', 'admin')
    )
    -- And sender must be the current user
    AND sender_id = auth.uid()
  );

-- Support agents and admins can update their own messages
CREATE POLICY "Support staff can update their messages"
  ON support_ticket_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('support', 'admin')
    )
  );

-- Function to get ticket messages with sender info
CREATE OR REPLACE FUNCTION get_ticket_messages(p_ticket_id TEXT)
RETURNS TABLE (
  id TEXT,
  ticket_id TEXT,
  sender_id UUID,
  sender_email TEXT,
  sender_role TEXT,
  sender_name TEXT,
  message TEXT,
  is_internal BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.ticket_id,
    m.sender_id,
    m.sender_email,
    m.sender_role,
    COALESCE(p.display_name, m.sender_email) as sender_name,
    m.message,
    m.is_internal,
    m.metadata,
    m.created_at,
    m.updated_at
  FROM support_ticket_messages m
  LEFT JOIN user_profiles p ON p.id = m.sender_id
  WHERE m.ticket_id = p_ticket_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ticket_messages(TEXT) TO authenticated;

-- Comment on table
COMMENT ON TABLE support_ticket_messages IS 'Messages and conversations within support tickets';
COMMENT ON COLUMN support_ticket_messages.is_internal IS 'If true, only visible to support staff (internal notes)';

-- Function to send email notification when support responds
-- This uses Supabase's email sending capabilities
CREATE OR REPLACE FUNCTION notify_user_of_ticket_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  user_email TEXT;
  ticket_subject TEXT;
  is_first_response BOOLEAN;
  message_count INT;
BEGIN
  -- Only send notifications for non-internal messages from support/admin
  IF NEW.is_internal = TRUE OR NEW.sender_role = 'user' THEN
    RETURN NEW;
  END IF;

  -- Get ticket details
  SELECT * INTO ticket_record
  FROM support_tickets
  WHERE id = NEW.ticket_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  user_email := ticket_record.user_email;
  ticket_subject := ticket_record.subject;

  -- Check if this is the first response from support
  SELECT COUNT(*) INTO message_count
  FROM support_ticket_messages
  WHERE ticket_id = NEW.ticket_id
  AND sender_role IN ('support', 'admin')
  AND is_internal = FALSE
  AND id != NEW.id;

  is_first_response := (message_count = 0);

  -- Log the notification attempt
  RAISE NOTICE 'Sending email notification to % for ticket % (first response: %)', 
    user_email, NEW.ticket_id, is_first_response;

  -- Note: Actual email sending would be handled by Supabase Auth email templates
  -- or an external email service (SendGrid, Mailgun, etc.)
  -- For now, we'll store a notification record that can be processed by a background job

  -- Insert into a notifications queue table (if it exists)
  BEGIN
    INSERT INTO email_notifications_queue (
      recipient_email,
      email_type,
      subject,
      template_data,
      created_at
    ) VALUES (
      user_email,
      'ticket_response',
      'New Response to Your Support Ticket #' || SUBSTRING(NEW.ticket_id FROM 5 FOR 13),
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'ticket_subject', ticket_subject,
        'message', NEW.message,
        'sender_name', NEW.sender_email,
        'is_first_response', is_first_response,
        'ticket_url', 'https://your-app-url.com/help'
      ),
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Queue table doesn't exist, just log it
      RAISE NOTICE 'Email notification queued for %: New response on ticket %', user_email, ticket_subject;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger to send notifications
DROP TRIGGER IF EXISTS trigger_notify_ticket_response ON support_ticket_messages;
CREATE TRIGGER trigger_notify_ticket_response
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_ticket_response();

COMMENT ON FUNCTION notify_user_of_ticket_response() IS 'Sends email notification to user when support responds to their ticket';

-- Optional: Create email notifications queue table for async email sending
CREATE TABLE IF NOT EXISTS email_notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('ticket_response', 'ticket_created', 'ticket_resolved')),
  subject TEXT NOT NULL,
  template_data JSONB,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for processing queue
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_notifications_queue(created_at)
  WHERE sent_at IS NULL AND (failed_at IS NULL OR retry_count < 3);

COMMENT ON TABLE email_notifications_queue IS 'Queue for async email notifications to be processed by background job';

