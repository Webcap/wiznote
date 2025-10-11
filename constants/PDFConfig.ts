/**
 * PDF Configuration Constants
 * Centralized configuration for PDF upload limits and settings
 */

// PDF File Size Limits
export const PDF_CONFIG = {
  // Maximum file size in bytes (default: 200MB)
  // To change the limit:
  // 1. Update MAX_FILE_SIZE_MB below
  // 2. Run the database migration to update the bucket (see instructions below)
  MAX_FILE_SIZE_MB: 200,
  
  // Computed max size in bytes (do not edit directly)
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },
  
  // Human-readable max size string
  get MAX_FILE_SIZE_DISPLAY() {
    return `${this.MAX_FILE_SIZE_MB}MB`;
  },
  
  // Allowed MIME types
  ALLOWED_MIME_TYPES: ['application/pdf'],
  
  // Bucket configuration
  BUCKET_NAME: 'pdf-files',
  BUCKET_PUBLIC: false,
  
  // Signed URL expiration (in seconds)
  SIGNED_URL_EXPIRATION: 365 * 24 * 60 * 60, // 1 year
};

/**
 * HOW TO UPDATE THE SIZE LIMIT:
 * 
 * 1. Update MAX_FILE_SIZE_MB above (e.g., change 50 to 100 for 100MB limit)
 * 
 * 2. Update the Supabase Storage bucket limit by running this SQL:
 * 
 *    UPDATE storage.buckets
 *    SET file_size_limit = 104857600  -- 100MB in bytes (100 * 1024 * 1024)
 *    WHERE id = 'pdf-files';
 * 
 * 3. Verify the change in Supabase Dashboard:
 *    - Go to Storage > Buckets
 *    - Click on pdf-files bucket
 *    - Check "File size limit" matches your new limit
 * 
 * Common size limits:
 * - 10MB  = 10485760 bytes
 * - 25MB  = 26214400 bytes
 * - 50MB  = 52428800 bytes (current default)
 * - 100MB = 104857600 bytes
 * - 200MB = 209715200 bytes
 * - 500MB = 524288000 bytes
 */

