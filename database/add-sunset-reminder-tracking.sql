-- Add tracking for sunset reminders
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS sunset_reminder_10_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN system_settings.sunset_reminder_10_sent IS 'Whether the 10-day sunset reminder email has been sent';
