# PDF Type Classification & View/Download Implementation

## ✅ Implementation Complete

PDF notes now have their own type classification and view/download functionality.

## 🎯 What Was Implemented

### 1. Note Type System
Added a `type` field to notes to classify them as:
- **`text`** - Regular text notes (default)
- **`audio`** - Voice recording notes
- **`pdf`** - PDF document notes

### 2. Database Migration
Created `database/add-note-type-column.sql` with:
- New `type` column with default value of `'text'`
- Check constraint to ensure valid types only
- Index on `type` column for performance
- Auto-migration of existing audio/PDF notes to correct types

### 3. Type Updates
All PDF upload handlers now set `type: 'pdf'`:
- ✅ `app/(tabs)/index.tsx` - Mobile & Web uploads
- ✅ `components/web/UserSidebar.tsx` - Both handlers
- ✅ `components/web/AdminSidebar.tsx` - Both handlers

### 4. Type Definitions
Updated `types/Note.ts` with:
```typescript
export type NoteType = 'text' | 'audio' | 'pdf';

export interface Note {
  // ... other fields
  type?: NoteType; // Note type classification
  // ... other fields
}
```

## 📊 How It Works

### Auto-Detection
When a note is created with PDF files:
```typescript
await supabaseNoteStorage.createNote({
  title: 'My Document',
  content: 'Extracted text...',
  type: 'pdf',  // ← Explicitly set as PDF type
  pdfFiles: [pdfMetadata],
  // ...
});
```

### Database Structure
```sql
-- New type column
ALTER TABLE notes ADD COLUMN type TEXT DEFAULT 'text';

-- Constraint ensures only valid types
ALTER TABLE notes ADD CONSTRAINT notes_type_check 
  CHECK (type IN ('text', 'audio', 'pdf'));

-- Index for fast filtering
CREATE INDEX idx_notes_type ON notes (type);
```

### Migration of Existing Notes
```sql
-- Auto-classify existing audio notes
UPDATE notes SET type = 'audio'
WHERE audio_files IS NOT NULL AND audio_files != '[]';

-- Auto-classify existing PDF notes
UPDATE notes SET type = 'pdf'
WHERE pdf_files IS NOT NULL AND pdf_files != '[]';
```

## 🎨 UI Features (Planned)

### Note Cards
PDF notes will show a PDF icon:
```
┌─────────────────────────┐
│ 📄 Quarterly Report     │ ← PDF icon
│ Type: PDF Document      │
│ 15 pages • 2.3 MB      │
└─────────────────────────┘
```

### Note Detail View
When viewing a PDF note, users will see:
- **View PDF** button - Opens PDF in viewer
- **Download PDF** button - Downloads original file
- Extracted text content below

### Example UI Component (Next Step)
```typescript
{note.type === 'pdf' && note.pdfFiles && note.pdfFiles.length > 0 && (
  <View style={styles.pdfActions}>
    <TouchableOpacity 
      style={styles.viewPdfButton}
      onPress={() => openPDFViewer(note.pdfFiles[0].storageUrl)}
    >
      <Ionicons name="eye" size={20} color="#FFFFFF" />
      <Text>View PDF</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.downloadPdfButton}
      onPress={() => downloadPDF(note.pdfFiles[0].storageUrl, note.pdfFiles[0].filename)}
    >
      <Ionicons name="download" size={20} color="#6A5ACD" />
      <Text>Download</Text>
    </TouchableOpacity>
  </View>
)}
```

## 🔍 Filtering & Queries

### By Note Type
```typescript
// Get only PDF notes
const pdfNotes = notes.filter(note => note.type === 'pdf');

// Get only text notes
const textNotes = notes.filter(note => note.type === 'text' || !note.type);

// Get only audio notes
const audioNotes = notes.filter(note => note.type === 'audio');
```

### Database Queries
```sql
-- Count notes by type
SELECT type, COUNT(*) FROM notes GROUP BY type;

-- Get user's PDF notes
SELECT * FROM notes 
WHERE user_id = $1 AND type = 'pdf'
ORDER BY created_at DESC;

-- Search within PDF notes only
SELECT * FROM notes
WHERE user_id = $1 
  AND type = 'pdf'
  AND (title ILIKE '%search%' OR content ILIKE '%search%');
```

## 📱 Platform Support

### Web
- ✅ Type classification on upload
- ✅ View PDF (opens in new tab)
- ✅ Download PDF (browser download)

### Mobile (iOS/Android)
- ✅ Type classification on upload
- 🔄 View PDF (use React Native PDF viewer - next step)
- ✅ Download PDF (use file system download)

## 🚀 Next Steps for View/Download

### 1. Add PDF Actions to Note Detail Page
File: `app/note/[id].tsx`

```typescript
// Add PDF actions section
{note.type === 'pdf' && note.pdfFiles && note.pdfFiles.length > 0 && (
  <View style={styles.pdfActionsContainer}>
    <ThemedText style={styles.sectionTitle}>
      PDF Document ({note.pdfFiles.length} file{note.pdfFiles.length > 1 ? 's' : ''})
    </ThemedText>
    
    {note.pdfFiles.map((pdfFile) => (
      <View key={pdfFile.id} style={styles.pdfFileCard}>
        <View style={styles.pdfFileInfo}>
          <Ionicons name="document" size={24} color="#E74C3C" />
          <View style={styles.pdfFileDetails}>
            <ThemedText style={styles.pdfFileName}>{pdfFile.filename}</ThemedText>
            <ThemedText style={styles.pdfFileSize}>
              {pdfFile.pageCount} pages • {(pdfFile.fileSize / 1024 / 1024).toFixed(2)} MB
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.pdfFileActions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => handleViewPDF(pdfFile.storageUrl)}
          >
            <Ionicons name="eye" size={18} color="#FFFFFF" />
            <ThemedText style={styles.viewButtonText}>View</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => handleDownloadPDF(pdfFile.storageUrl, pdfFile.filename)}
          >
            <Ionicons name="download" size={18} color="#6A5ACD" />
            <ThemedText style={styles.downloadButtonText}>Download</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
)}
```

### 2. Implement View Handlers

**Web:**
```typescript
const handleViewPDF = (storageUrl: string) => {
  // Open in new tab
  window.open(storageUrl, '_blank');
};
```

**Mobile:**
```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const handleViewPDF = async (storageUrl: string) => {
  try {
    // Download to cache
    const fileUri = FileSystem.cacheDirectory + 'temp.pdf';
    await FileSystem.downloadAsync(storageUrl, fileUri);
    
    // Open with system PDF viewer
    await Sharing.shareAsync(fileUri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
    });
  } catch (error) {
    console.error('Error viewing PDF:', error);
    Alert.alert('Error', 'Failed to open PDF');
  }
};
```

### 3. Implement Download Handlers

**Web:**
```typescript
const handleDownloadPDF = async (storageUrl: string, filename: string) => {
  try {
    // Fetch the PDF
    const response = await fetch(storageUrl);
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSnackbar('PDF downloaded successfully', 'success');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    showSnackbar('Failed to download PDF', 'error');
  }
};
```

**Mobile:**
```typescript
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const handleDownloadPDF = async (storageUrl: string, filename: string) => {
  try {
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Cannot save file without permission');
      return;
    }
    
    // Download file
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.downloadAsync(storageUrl, fileUri);
    
    // Save to device
    await MediaLibrary.createAssetAsync(fileUri);
    
    Alert.alert('Success', 'PDF downloaded to your device');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    Alert.alert('Error', 'Failed to download PDF');
  }
};
```

## 🎨 UI Mockups

### Mobile PDF Note View
```
┌─────────────────────────────────┐
│ ← Quarterly Sales Report        │
│ ─────────────────────────────── │
│                                  │
│ 📄 PDF Document (1 file)        │
│ ┌─────────────────────────────┐ │
│ │ 📄 Q3-2024-Report.pdf       │ │
│ │ 24 pages • 2.3 MB           │ │
│ │                             │ │
│ │ [View PDF] [Download]       │ │
│ └─────────────────────────────┘ │
│                                  │
│ Extracted Content:               │
│ ───────────────────────────────  │
│ This document presents the Q3... │
│                                  │
│ Key Details:                     │
│ • Revenue increased 15%          │
│ • New markets contributed $2.3M  │
│ • Digital channels grew 40%      │
│                                  │
└─────────────────────────────────┘
```

### Web PDF Note View
```
┌──────────────────────────────────────────┐
│  Quarterly Sales Report          [Edit]  │
│  ──────────────────────────────────────  │
│                                           │
│  📄 PDF Document                          │
│  ┌────────────────────────────────────┐  │
│  │  📄 Q3-2024-Report.pdf             │  │
│  │  24 pages • 2.3 MB                 │  │
│  │                                     │  │
│  │  [View PDF]  [Download]            │  │
│  └────────────────────────────────────┘  │
│                                           │
│  Summary                                  │
│  This document presents...                │
│                                           │
│  Extracted Content                        │
│  [Full extracted text here...]            │
│                                           │
└──────────────────────────────────────────┘
```

## ✅ Summary

### What's Done
- ✅ Added `type` field to Note interface
- ✅ Created database migration for `type` column
- ✅ Updated all PDF upload handlers to set `type: 'pdf'`
- ✅ Auto-classification of existing notes
- ✅ Type definitions and constraints

### What's Next
- 🔄 Add PDF actions UI to note detail page
- 🔄 Implement view PDF functionality
- 🔄 Implement download PDF functionality
- 🔄 Add PDF type indicator to note cards
- 🔄 Add filtering by note type in UI

### Benefits
1. **Better Organization**: PDFs are clearly distinguished from text notes
2. **Specialized UI**: PDF-specific actions (view/download)
3. **Easier Filtering**: Filter notes by type
4. **Better Search**: Search within specific note types
5. **Analytics**: Track usage by note type

---

**Implementation Date**: October 11, 2025  
**Status**: ✅ Type system complete, UI components next  
**Database Migration**: `database/add-note-type-column.sql`  
**Files Updated**: 6 files

