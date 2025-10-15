/**
 * Note Validation Schema
 * 
 * Validates all note-related inputs to prevent injection attacks,
 * ensure data integrity, and enforce business rules.
 */

import { z } from 'zod';

/**
 * Note Title Schema
 * - Required, non-empty string
 * - Max 200 characters
 * - No special control characters
 */
export const NoteTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less')
  .refine(
    (val) => !/[\x00-\x1F\x7F]/.test(val),
    'Title contains invalid characters'
  );

/**
 * Note Content Schema
 * - Can be empty
 * - Max 500KB (500,000 characters)
 * - Will be sanitized before storage
 */
export const NoteContentSchema = z
  .string()
  .max(500000, 'Content must be 500KB or less');

/**
 * Note Type Schema
 * - Must be one of the allowed types
 */
export const NoteTypeSchema = z.enum(['text', 'pdf', 'audio'], {
  errorMap: () => ({ message: 'Invalid note type' }),
});

/**
 * Note Metadata Schema
 * - Optional metadata object
 * - Validated structure for common metadata fields
 */
export const NoteMetadataSchema = z
  .object({
    audioUrl: z.string().url().optional(),
    audioDuration: z.number().positive().optional(),
    audioFormat: z.string().optional(),
    pdfUrl: z.string().url().optional(),
    pdfPages: z.number().int().positive().optional(),
    pdfSize: z.number().int().positive().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    source: z.string().max(100).optional(),
  })
  .passthrough() // Allow additional fields
  .optional();

/**
 * Create Note Schema
 * Used when creating a new note
 */
export const CreateNoteSchema = z.object({
  title: NoteTitleSchema,
  content: NoteContentSchema,
  type: NoteTypeSchema.optional().default('text'),
  metadata: NoteMetadataSchema,
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Update Note Schema
 * Used when updating an existing note
 * All fields optional except ID
 */
export const UpdateNoteSchema = z.object({
  id: z.string().uuid('Invalid note ID'),
  title: NoteTitleSchema.optional(),
  content: NoteContentSchema.optional(),
  type: NoteTypeSchema.optional(),
  metadata: NoteMetadataSchema,
});

/**
 * Note ID Schema
 * For validating note IDs in queries
 * Accepts both UUIDs and custom note IDs (note_timestamp_random)
 */
export const NoteIdSchema = z.string()
  .min(1, 'Note ID is required')
  .refine(
    (id) => {
      // Accept UUIDs
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      // Accept custom note IDs (note_timestamp_random)
      const customIdRegex = /^note_\d+_[a-z0-9]+$/;
      return uuidRegex.test(id) || customIdRegex.test(id);
    },
    'Invalid note ID format'
  );

/**
 * Bulk Note IDs Schema
 * For validating arrays of note IDs
 */
export const BulkNoteIdsSchema = z
  .array(NoteIdSchema)
  .min(1, 'At least one note ID required')
  .max(100, 'Cannot process more than 100 notes at once');

/**
 * Note Search Query Schema
 * For validating search inputs
 */
export const NoteSearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query required')
    .max(200, 'Search query too long')
    .refine(
      (val) => !/[\x00-\x1F\x7F]/.test(val),
      'Search query contains invalid characters'
    ),
  type: NoteTypeSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Share Note Schema
 * For validating note sharing requests
 */
export const ShareNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
  recipientEmail: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  permission: z.enum(['view', 'edit'], {
    errorMap: () => ({ message: 'Permission must be view or edit' }),
  }),
  message: z.string().max(500, 'Message too long').optional(),
});

/**
 * Archive Note Schema
 */
export const ArchiveNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
  archived: z.boolean(),
});

/**
 * Type exports for TypeScript
 */
export type CreateNote = z.infer<typeof CreateNoteSchema>;
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;
export type NoteSearch = z.infer<typeof NoteSearchSchema>;
export type ShareNote = z.infer<typeof ShareNoteSchema>;
export type ArchiveNote = z.infer<typeof ArchiveNoteSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate and sanitize note title
 */
export function validateNoteTitle(title: unknown): string {
  return NoteTitleSchema.parse(title);
}

/**
 * Validate and sanitize note content
 * Note: HTML sanitization should be applied separately
 */
export function validateNoteContent(content: unknown): string {
  return NoteContentSchema.parse(content);
}

/**
 * Validate note creation data
 */
export function validateCreateNote(data: unknown): CreateNote {
  return CreateNoteSchema.parse(data);
}

/**
 * Validate note update data
 */
export function validateUpdateNote(data: unknown): UpdateNote {
  return UpdateNoteSchema.parse(data);
}

/**
 * Validate note search query
 */
export function validateNoteSearch(data: unknown): NoteSearch {
  return NoteSearchSchema.parse(data);
}

/**
 * Safe parse wrapper that returns validation result
 */
export function safeValidateNote(data: unknown): {
  success: boolean;
  data?: CreateNote;
  error?: string;
} {
  const result = CreateNoteSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }
}

