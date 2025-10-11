# How to Update PDF Upload Size Limit

## 📋 Quick Guide

Follow these 3 simple steps to change the PDF upload size limit:

### Step 1: Update App Configuration ⚙️

**File**: `constants/PDFConfig.ts`

Change the `MAX_FILE_SIZE_MB` value:

```typescript
export const PDF_CONFIG = {
  // Change this value (currently 50MB)
  MAX_FILE_SIZE_MB: 100,  // ← Change to 100 for 100MB limit
  
  // ... rest of config (don't change)
};
```

**Example changes**:
- For **10MB** limit: `MAX_FILE_SIZE_MB: 10`
- For **25MB** limit: `MAX_FILE_SIZE_MB: 25`
- For **100MB** limit: `MAX_FILE_SIZE_MB: 100`
- For **200MB** limit: `MAX_FILE_SIZE_MB: 200`

### Step 2: Update Supabase Storage Bucket 🗄️

**File**: `database/update-pdf-size-limit.sql`

1. Open the file and update the value on line 17:

```sql
UPDATE storage.buckets
SET file_size_limit = 104857600  -- Change to match your desired limit
WHERE id = 'pdf-files';
```

**Size conversions**:
- **10MB**: `10485760`
- **25MB**: `26214400`
- **50MB**: `52428800` (current default)
- **100MB**: `104857600`
- **200MB**: `209715200`
- **500MB**: `524288000`

2. Run this SQL in your **Supabase Dashboard**:
   - Go to: SQL Editor
   - Paste the updated SQL
   - Click "Run"

### Step 3: Verify the Change ✅

**In Supabase Dashboard**:
1. Go to: Storage → Buckets
2. Click on: `pdf-files`
3. Check: "File size limit" shows your new limit

**In Your App**:
1. Try uploading a PDF larger than old limit but smaller than new limit
2. Should succeed without errors
3. Error message should show new limit if exceeded

## 📊 Where the Limit is Used

The centralized `PDF_CONFIG` is now used in these locations:

### Client-Side Validation
1. **`app/(tabs)/index.tsx`**
   - Mobile upload handler
   - Web upload handler

2. **`components/web/UserSidebar.tsx`**
   - Mobile upload handler
   - Web upload handler

3. **`components/web/AdminSidebar.tsx`**
   - Mobile upload handler
   - Web upload handler

### Storage Configuration
4. **`services/PDFStorage.ts`**
   - Bucket creation (if bucket doesn't exist)

### Database/Storage
5. **`database/pdf-storage-setup.sql`** (initial setup)
6. **`database/update-pdf-size-limit.sql`** (for updates)

## 🔍 Current Configuration

**Default Settings**:
```typescript
MAX_FILE_SIZE_MB: 50
MAX_FILE_SIZE_BYTES: 52428800
MAX_FILE_SIZE_DISPLAY: "50MB"
```

**Error Messages**:
```
"PDF file must be less than 50MB"
```

After updating, error messages automatically update:
```
"PDF file must be less than 100MB"  // If you set to 100
```

## ⚠️ Important Notes

### Why Update Both Places?

1. **App Config (`constants/PDFConfig.ts`)**:
   - Controls client-side validation
   - Shows error messages to users
   - Prevents unnecessary uploads

2. **Storage Bucket (Supabase SQL)**:
   - Server-side enforcement
   - Prevents oversized uploads at storage layer
   - Security boundary

**Both must match** to avoid confusion!

### Performance Considerations

**Small Limit (10-50MB)**:
- ✅ Faster uploads
- ✅ Lower storage costs
- ✅ Quicker AI processing
- ❌ Limited document size

**Large Limit (100-500MB)**:
- ✅ Supports large documents
- ✅ Better for scanned PDFs
- ❌ Slower uploads
- ❌ Higher storage costs
- ❌ Longer AI processing time

### Recommended Limits by Use Case

| Use Case | Recommended Limit | Reason |
|----------|------------------|--------|
| Text-based PDFs | 10-25MB | Usually sufficient |
| Mixed content | 50MB | Good balance (default) |
| Image-heavy PDFs | 100MB | Accommodates graphics |
| Scanned documents | 100-200MB | High-res scans |
| Technical/CAD docs | 200-500MB | Complex documents |

## 🚀 Example: Changing to 100MB

### Step 1: Update App Config
```typescript
// constants/PDFConfig.ts
export const PDF_CONFIG = {
  MAX_FILE_SIZE_MB: 100,  // Changed from 50 to 100
  // ...
};
```

### Step 2: Update Database
```sql
-- database/update-pdf-size-limit.sql
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'pdf-files';
```

### Step 3: Verify
```sql
-- Check the update
SELECT file_size_limit / 1024 / 1024 AS size_limit_mb
FROM storage.buckets
WHERE id = 'pdf-files';

-- Should return: 100
```

## 🎯 Benefits of Centralized Config

### Before (Hardcoded):
```typescript
// Had to update in 6+ different files!
const maxSize = 50 * 1024 * 1024;  // File 1
const maxSize = 50 * 1024 * 1024;  // File 2
const maxSize = 50 * 1024 * 1024;  // File 3
// ... easy to miss one!
```

### After (Centralized):
```typescript
// Update in ONE place only!
// constants/PDFConfig.ts
MAX_FILE_SIZE_MB: 100

// Used everywhere:
if (file.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
  showSnackbar(`PDF file must be less than ${PDF_CONFIG.MAX_FILE_SIZE_DISPLAY}`, 'error');
}
```

### Advantages:
- ✅ Single source of truth
- ✅ Consistent across all upload paths
- ✅ Easy to update (one file)
- ✅ Type-safe with TypeScript
- ✅ Self-documenting code
- ✅ Automatic error message updates

## 📚 Additional Configuration Options

The `PDF_CONFIG` also includes:

```typescript
export const PDF_CONFIG = {
  MAX_FILE_SIZE_MB: 50,
  
  // Allowed file types
  ALLOWED_MIME_TYPES: ['application/pdf'],
  
  // Storage bucket name
  BUCKET_NAME: 'pdf-files',
  
  // Bucket visibility
  BUCKET_PUBLIC: false,
  
  // Signed URL expiration (1 year)
  SIGNED_URL_EXPIRATION: 365 * 24 * 60 * 60,
};
```

**To allow more file types** (not recommended):
```typescript
ALLOWED_MIME_TYPES: [
  'application/pdf',
  'application/vnd.ms-word',  // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
],
```

## ✅ Checklist

When updating the size limit:

- [ ] Update `MAX_FILE_SIZE_MB` in `constants/PDFConfig.ts`
- [ ] Update `file_size_limit` in `database/update-pdf-size-limit.sql`
- [ ] Run SQL migration in Supabase Dashboard
- [ ] Verify bucket limit in Supabase UI
- [ ] Test upload with file near old limit
- [ ] Test upload with file near new limit
- [ ] Verify error messages show new limit
- [ ] Update documentation if needed

---

**Created**: October 11, 2025  
**Current Default**: 50MB  
**Configuration File**: `constants/PDFConfig.ts`  
**Migration File**: `database/update-pdf-size-limit.sql`

