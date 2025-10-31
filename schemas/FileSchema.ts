/**
 * File Upload Validation Schema
 * 
 * Validates file uploads (PDFs, audio files, images) to prevent
 * malicious file uploads and ensure proper file handling.
 */

import { z } from 'zod';

/**
 * File Size Limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  PDF: 10 * 1024 * 1024, // 10 MB
  AUDIO: 50 * 1024 * 1024, // 50 MB
  IMAGE: 5 * 1024 * 1024, // 5 MB
  AVATAR: 2 * 1024 * 1024, // 2 MB
};

/**
 * Allowed MIME Types
 */
export const ALLOWED_MIME_TYPES = {
  PDF: ['application/pdf'],
  AUDIO: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a',
  ],
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  AVATAR: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

/**
 * File Extension Validation
 */
export const ALLOWED_EXTENSIONS = {
  PDF: ['.pdf'],
  AUDIO: ['.mp3', '.wav', '.ogg', '.webm', '.m4a'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  AVATAR: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * Base File Schema
 */
const BaseFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .refine(
      (name) => !/[\x00-\x1F\x7F<>:"/\\|?*]/.test(name),
      'File name contains invalid characters'
    ),
  size: z.number().int().positive('File size must be positive'),
  type: z.string().min(1, 'File type required'),
});

/**
 * PDF File Schema
 */
export const PDFFileSchema = BaseFileSchema.extend({
  size: z
    .number()
    .int()
    .positive()
    .max(FILE_SIZE_LIMITS.PDF, `PDF must be less than ${FILE_SIZE_LIMITS.PDF / 1024 / 1024}MB`),
  type: z
    .string()
    .refine((type) => ALLOWED_MIME_TYPES.PDF.includes(type), 'Invalid PDF file type'),
}).refine(
  (file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.PDF.includes(ext);
  },
  { message: 'File must have .pdf extension' }
);

/**
 * Audio File Schema
 */
export const AudioFileSchema = BaseFileSchema.extend({
  size: z
    .number()
    .int()
    .positive()
    .max(
      FILE_SIZE_LIMITS.AUDIO,
      `Audio must be less than ${FILE_SIZE_LIMITS.AUDIO / 1024 / 1024}MB`
    ),
  type: z
    .string()
    .refine((type) => ALLOWED_MIME_TYPES.AUDIO.includes(type), 'Invalid audio file type'),
  duration: z.number().positive().max(7200).optional(), // Max 2 hours
}).refine(
  (file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.AUDIO.includes(ext);
  },
  { message: 'File must be a valid audio format (.mp3, .wav, .ogg, .webm, .m4a)' }
);

/**
 * Image File Schema
 */
export const ImageFileSchema = BaseFileSchema.extend({
  size: z
    .number()
    .int()
    .positive()
    .max(
      FILE_SIZE_LIMITS.IMAGE,
      `Image must be less than ${FILE_SIZE_LIMITS.IMAGE / 1024 / 1024}MB`
    ),
  type: z
    .string()
    .refine((type) => ALLOWED_MIME_TYPES.IMAGE.includes(type), 'Invalid image file type'),
  width: z.number().int().positive().max(4096).optional(),
  height: z.number().int().positive().max(4096).optional(),
}).refine(
  (file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.IMAGE.includes(ext);
  },
  { message: 'File must be a valid image format (.jpg, .png, .webp, .gif)' }
);

/**
 * Avatar File Schema (stricter than general images)
 */
export const AvatarFileSchema = BaseFileSchema.extend({
  size: z
    .number()
    .int()
    .positive()
    .max(
      FILE_SIZE_LIMITS.AVATAR,
      `Avatar must be less than ${FILE_SIZE_LIMITS.AVATAR / 1024 / 1024}MB`
    ),
  type: z
    .string()
    .refine((type) => ALLOWED_MIME_TYPES.AVATAR.includes(type), 'Invalid avatar file type'),
  width: z.number().int().positive().min(50).max(2048).optional(),
  height: z.number().int().positive().min(50).max(2048).optional(),
}).refine(
  (file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.AVATAR.includes(ext);
  },
  { message: 'Avatar must be .jpg, .png, or .webp' }
);

/**
 * File Path Schema (for storage paths)
 */
export const FilePathSchema = z
  .string()
  .min(1, 'File path required')
  .max(500, 'File path too long')
  .refine(
    (path) => !/\.\./.test(path),
    'Path traversal not allowed'
  )
  .refine(
    (path) => !/[\x00-\x1F\x7F<>"|?*]/.test(path),
    'Path contains invalid characters'
  );

/**
 * Storage Bucket Schema
 */
export const StorageBucketSchema = z.enum(['notes', 'pdfs', 'audio', 'avatars', 'public'], {
  message: 'Invalid storage bucket',
});

/**
 * Type exports
 */
export type PDFFile = z.infer<typeof PDFFileSchema>;
export type AudioFile = z.infer<typeof AudioFileSchema>;
export type ImageFile = z.infer<typeof ImageFileSchema>;
export type AvatarFile = z.infer<typeof AvatarFileSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate PDF file
 */
export function validatePDFFile(file: unknown): PDFFile {
  return PDFFileSchema.parse(file);
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: unknown): AudioFile {
  return AudioFileSchema.parse(file);
}

/**
 * Validate image file
 */
export function validateImageFile(file: unknown): ImageFile {
  return ImageFileSchema.parse(file);
}

/**
 * Validate avatar file
 */
export function validateAvatarFile(file: unknown): AvatarFile {
  return AvatarFileSchema.parse(file);
}

/**
 * Safe file validation with detailed error
 */
export function safeValidateFile(
  file: unknown,
  type: 'pdf' | 'audio' | 'image' | 'avatar'
): {
  success: boolean;
  data?: any;
  error?: string;
} {
  let schema;
  switch (type) {
    case 'pdf':
      schema = PDFFileSchema;
      break;
    case 'audio':
      schema = AudioFileSchema;
      break;
    case 'image':
      schema = ImageFileSchema;
      break;
    case 'avatar':
      schema = AvatarFileSchema;
      break;
  }

  const result = schema.safeParse(file);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = result.error.issues
      .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }
}

/**
 * Sanitize filename
 * Removes dangerous characters and limits length
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, '_');

  // Limit length
  const maxLength = 200;
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, maxLength - ext.length - 1) + '.' + ext;
  }

  return sanitized;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? ('.' + parts.pop()?.toLowerCase()) : '';
}

/**
 * Check if file extension is allowed
 */
export function isAllowedExtension(
  filename: string,
  type: 'pdf' | 'audio' | 'image' | 'avatar'
): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_EXTENSIONS[type.toUpperCase() as keyof typeof ALLOWED_EXTENSIONS].includes(ext);
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(
  mimeType: string,
  type: 'pdf' | 'audio' | 'image' | 'avatar'
): boolean {
  return ALLOWED_MIME_TYPES[type.toUpperCase() as keyof typeof ALLOWED_MIME_TYPES].includes(
    mimeType
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

