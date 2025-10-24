-- Migration: Add rich text support to notes table
-- This migration adds columns for HTML content and content format

-- 1. Add content_html column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS content_html TEXT;

-- 2. Add content_format column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS content_format VARCHAR(10) DEFAULT 'plain';

-- 3. Add check constraint for valid content formats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_content_format_check'
  ) THEN
    ALTER TABLE notes
    ADD CONSTRAINT notes_content_format_check CHECK (content_format IN ('plain', 'html'));
  END IF;
END $$;

-- 4. Create index on content_format for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_content_format ON notes (content_format);

-- 5. Create index on content_html for text search (if needed)
CREATE INDEX IF NOT EXISTS idx_notes_content_html_gin ON notes USING GIN (to_tsvector('english', content_html))
WHERE content_html IS NOT NULL;

-- 6. Add comments to document the new columns
COMMENT ON COLUMN notes.content_html IS 'Rich text content in HTML format. Used when content_format is "html"';
COMMENT ON COLUMN notes.content_format IS 'Content format: "plain" for plain text (default), "html" for rich text';

-- 7. Add rich text editor feature flag (if feature_flags table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    INSERT INTO feature_flags (
      id, name, description, enabled, rollout_percentage, 
      target_environments, premium_only, tracking_enabled, 
      created_by, created_at, updated_at
    ) VALUES (
      'rich_text_editor',
      'Rich Text Editor',
      'Enable rich text editing with HTML formatting (bold, italic, headings, lists)',
      false,
      0,
      to_jsonb(ARRAY['development', 'staging', 'production']),
      false,
      true,
      'system',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      rollout_percentage = EXCLUDED.rollout_percentage,
      updated_at = NOW();
  END IF;
END $$;

-- 8. Add rich text editor to unified feature limits (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_feature_limits') THEN
    INSERT INTO unified_feature_limits (
      feature_id, feature_name, description, free_user_limit, premium_user_limit,
      limit_type, period, is_active, requires_feature_flag, feature_flag_key,
      category, priority, created_at, updated_at
    ) VALUES (
      'rich_text_editor',
      'Rich Text Editor',
      'Create and edit notes with rich text formatting',
      999999,
      999999,
      'count',
      'monthly',
      true,
      true,
      'rich_text_editor',
      'editor',
      5,
      NOW(),
      NOW()
    )
    ON CONFLICT (feature_id) DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;
END $$;

-- 9. Update existing notes to ensure they have the default content_format
UPDATE notes
SET content_format = 'plain'
WHERE content_format IS NULL;

-- 10. Add trigger to automatically set content_format based on content_html presence
CREATE OR REPLACE FUNCTION set_content_format()
RETURNS TRIGGER AS $$
BEGIN
  -- If content_html is provided and not empty, set format to 'html'
  IF NEW.content_html IS NOT NULL AND TRIM(NEW.content_html) != '' THEN
    NEW.content_format = 'html';
  -- If content_html is null or empty, ensure format is 'plain'
  ELSIF NEW.content_html IS NULL OR TRIM(NEW.content_html) = '' THEN
    NEW.content_format = 'plain';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic content_format setting
DROP TRIGGER IF EXISTS trigger_set_content_format ON notes;
CREATE TRIGGER trigger_set_content_format
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION set_content_format();

-- 11. Add function to safely convert plain text to HTML
CREATE OR REPLACE FUNCTION convert_plain_to_html(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF plain_text IS NULL OR TRIM(plain_text) = '' THEN
    RETURN '';
  END IF;
  
  -- Convert line breaks to <br> tags and escape HTML characters
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(plain_text, '&', '&amp;', 'g'),
        '<', '&lt;', 'g'
      ),
      '>', '&gt;', 'g'
    ),
    E'\n', '<br>', 'g'
  );
END;
$$ LANGUAGE plpgsql;

-- 12. Add function to strip HTML tags for plain text fallback
CREATE OR REPLACE FUNCTION strip_html_tags(html_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF html_text IS NULL OR TRIM(html_text) = '' THEN
    RETURN '';
  END IF;
  
  -- Remove HTML tags and decode common entities
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(html_text, '<[^>]*>', '', 'g'),
          '&lt;', '<', 'g'
        ),
        '&gt;', '>', 'g'
      ),
      '&amp;', '&', 'g'
    ),
    '<br>', E'\n', 'g'
  );
END;
$$ LANGUAGE plpgsql;

-- 13. Add comments for the helper functions
COMMENT ON FUNCTION convert_plain_to_html(TEXT) IS 'Converts plain text to basic HTML with line breaks';
COMMENT ON FUNCTION strip_html_tags(TEXT) IS 'Strips HTML tags from rich text content for plain text fallback';
