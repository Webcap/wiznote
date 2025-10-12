# 🚨 IMPORTANT: Run This Database Migration

## Your PDF notes will show as type "pdf" after running this migration!

### Step 1: Copy this SQL

```sql
-- Add type column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- Add check constraint for valid types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_type_check'
  ) THEN
    ALTER TABLE notes
    ADD CONSTRAINT notes_type_check CHECK (type IN ('text', 'audio', 'pdf'));
  END IF;
END $$;

-- Create index on type column for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes (type);

-- Update existing notes with audio files to have type 'audio'
UPDATE notes
SET type = 'audio'
WHERE (audio_url IS NOT NULL OR (audio_files IS NOT NULL AND audio_files != '[]'::jsonb))
  AND (type IS NULL OR type = 'text');

-- Update existing notes with PDF files to have type 'pdf'
UPDATE notes
SET type = 'pdf'
WHERE (pdf_url IS NOT NULL OR (pdf_files IS NOT NULL AND pdf_files != '[]'::jsonb))
  AND (type IS NULL OR type = 'text');

-- Add comment to document the type column
COMMENT ON COLUMN notes.type IS 'Note type: text (default), audio (voice recording), or pdf (document)';
```

### Step 2: Run in Supabase

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Paste the SQL above
5. Click **Run** (or press F5)

### Step 3: Verify

Run this to check it worked:

```sql
SELECT type, COUNT(*) as count
FROM notes
GROUP BY type
ORDER BY count DESC;
```

You should see something like:
```
type  | count
------+-------
text  | 8
pdf   | 2
audio | 1
```

### ✅ After Running

- ✅ PDF notes will show as type "pdf"
- ✅ Audio notes will show as type "audio"
- ✅ Text notes will show as type "text"
- ✅ New uploads will be correctly classified
- ✅ Existing notes will be auto-migrated

### 🎯 What This Enables

- Filter notes by type
- PDF-specific UI (view/download buttons)
- Better organization
- Type-based analytics
- Specialized features per type

---

**This is required for PDF notes to work properly!**

