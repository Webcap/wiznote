# PDF Storage Setup

This document explains how to set up PDF storage for WizNote.

## Overview

The PDF storage feature allows users to upload PDF documents to their notes. The system:
- Stores PDFs in Supabase Storage
- Extracts text from PDFs (placeholder for future implementation)
- Associates PDFs with notes via metadata

## Database Setup

### 1. Run the Migration

Execute the SQL migration to set up the database schema:

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f database/pdf-storage-setup.sql
```

Or use the Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/pdf-storage-setup.sql`
4. Click "Run"

### 2. What the Migration Does

The migration:
- Adds `pdf_files` JSONB column to the `notes` table
- Adds `pdf_url` TEXT column for backward compatibility
- Creates indexes for better query performance
- Creates the `pdf-files` storage bucket
- Sets up Row Level Security (RLS) policies

### 3. Storage Bucket Structure

PDFs are organized in the following structure:
```
pdf-files/
  └── {userId}/
      └── {noteId}/
          └── pdf_{timestamp}_{filename}.pdf
```

## PDF File Metadata Structure

Each PDF file in the `pdf_files` array has the following structure:

```typescript
{
  id: string;              // Unique identifier for the PDF
  filename: string;        // Original filename
  storageUrl: string;      // Supabase storage URL
  extractedText?: string;  // Text extracted from PDF
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  pageCount?: number;      // Number of pages in PDF
  fileSize?: number;       // File size in bytes
  createdAt: Date;         // Upload timestamp
}
```

## Features

### Current Features
- ✅ PDF file upload (web only)
- ✅ File validation (type and size)
- ✅ Secure storage with RLS policies
- ✅ PDF metadata management
- ✅ Integration with notes system

### Future Enhancements
- ⏳ Text extraction using PDF.js
- ⏳ PDF preview/viewer
- ⏳ Mobile support
- ⏳ OCR for scanned PDFs
- ⏳ AI-powered summarization

## Usage

### For Users

1. Click "New Note" in the sidebar
2. Select "Upload PDF"
3. Choose a PDF file (max 50MB)
4. Add a title and tags
5. Click "Save Note"

### For Developers

#### Upload a PDF

```typescript
import { pdfStorage } from '../services/PDFStorage';

// Upload PDF file
const pdfUrl = await pdfStorage.uploadPDFFile(
  file,      // File or Blob object
  userId,    // User ID
  noteId     // Note ID
);

// Save metadata
await pdfStorage.savePDFMetadata(noteId, userId, {
  filename: file.name,
  storageUrl: pdfUrl,
  extractedText: '',
  extractionStatus: 'pending',
  fileSize: file.size,
});
```

#### Delete a PDF

```typescript
// Delete PDF and metadata
await pdfStorage.deletePDFFileAndMetadata(
  noteId,
  userId,
  pdfFileId
);
```

## Storage Limits

- **Max file size**: 50MB per PDF
- **Allowed types**: PDF only (application/pdf)
- **Bucket**: Private (requires authentication)

## Security

- All PDFs are private and require authentication
- RLS policies ensure users can only access their own files
- Signed URLs are used for secure access (valid for 1 year)

## Troubleshooting

### Bucket Not Found
If you see "Bucket not found" errors:
1. Verify the migration ran successfully
2. Check Supabase Dashboard > Storage > Buckets
3. Manually create bucket if needed:
   - Name: `pdf-files`
   - Public: No
   - File size limit: 52428800 bytes (50MB)
   - Allowed MIME types: application/pdf

### RLS Policy Errors
If you see RLS policy errors:
1. Verify RLS is enabled on the storage.objects table
2. Check that policies exist in Supabase Dashboard > Storage > Policies
3. Verify user is authenticated

### Text Extraction Not Working
The current implementation uses a placeholder for text extraction. Future versions will integrate PDF.js or a similar library.

## Related Files

- `services/PDFStorage.ts` - PDF storage service
- `app/create-pdf.tsx` - PDF upload page
- `types/Note.ts` - TypeScript definitions
- `database/pdf-storage-setup.sql` - Database migration
- `components/web/UserSidebar.tsx` - Updated with PDF option

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify database migration completed successfully
3. Ensure Supabase storage is properly configured
4. Check RLS policies in Supabase Dashboard

