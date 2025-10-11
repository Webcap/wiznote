-- Migration: Add type column to notes table
-- This adds a type field to differentiate between text, audio, and pdf notes

-- 1. Add type column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- 2. Add check constraint for valid types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_type_check'
  ) THEN
    ALTER TABLE notes
    ADD CONSTRAINT notes_type_check CHECK (type IN ('text', 'audio', 'pdf'));
  END IF;
END $$;

-- 3. Create index on type column for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes (type);

-- 4. Update existing notes with audio files to have type 'audio'
UPDATE notes
SET type = 'audio'
WHERE audio_files IS NOT NULL 
  AND audio_files != '[]'::jsonb
  AND (type IS NULL OR type = 'text');

-- 5. Update existing notes with PDF files to have type 'pdf'
UPDATE notes
SET type = 'pdf'
WHERE pdf_files IS NOT NULL 
  AND pdf_files != '[]'::jsonb
  AND (type IS NULL OR type = 'text');

-- 6. Add comment to document the type column
COMMENT ON COLUMN notes.type IS 'Note type: text (default), audio (voice recording), or pdf (document)';

