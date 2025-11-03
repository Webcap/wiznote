/**
 * Support & Tickets Validation Schema
 * 
 * Validates support ticket and user management inputs.
 */

import { z } from 'zod';

/**
 * Support Ticket Type Schema
 */
export const TicketTypeSchema = z.enum(
  ['account_deletion', 'billing', 'technical', 'feature_request', 'other'],
  {
    message: 'Invalid ticket type',
  }
);

/**
 * Support Ticket Status Schema
 */
export const TicketStatusSchema = z.enum(
  ['pending', 'in_progress', 'resolved', 'cancelled'],
  {
    message: 'Invalid ticket status',
  }
);

/**
 * Support Ticket Priority Schema
 */
export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  message: 'Invalid priority level',
});

/**
 * Create Support Ticket Schema
 */
export const CreateSupportTicketSchema = z.object({
  type: TicketTypeSchema,
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long')
    .refine(
      (val) => !/[\x00-\x1F\x7F]/.test(val),
      'Subject contains invalid characters'
    ),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description too long'),
  priority: TicketPrioritySchema.optional().default('medium'),
  userEmail: z.string().email('Invalid email').max(255).optional(),
});

/**
 * Update Support Ticket Schema
 */
export const UpdateSupportTicketSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID'),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assignedTo: z.string().uuid().optional(),
  resolvedBy: z.string().uuid().optional(),
  resolution: z.string().max(5000).optional(),
});

/**
 * Premium Grant Schema
 */
export const GrantPremiumSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  userEmail: z.string().email('Invalid email').max(255),
  duration: z
    .union([
      z.number().int().positive().max(3650), // Max 10 years in days
      z.literal('lifetime'),
    ])
    .refine(
      (val) => val === 'lifetime' || (typeof val === 'number' && val > 0),
      'Invalid duration'
    ),
  planId: z.string().max(100).optional(),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason too long'),
  grantedBy: z.string().uuid('Invalid admin ID'),
});

/**
 * Revoke Premium Schema
 */
export const RevokePremiumSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  userEmail: z.string().email('Invalid email').max(255),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason too long'),
  revokedBy: z.string().uuid('Invalid admin ID'),
});

/**
 * Feature Limit Override Schema
 */
export const FeatureLimitOverrideSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  featureId: z.string().min(1).max(100),
  newLimit: z
    .union([z.number().int().nonnegative(), z.literal('unlimited')])
    .refine(
      (val) => val === 'unlimited' || val >= 0,
      'Limit must be non-negative or unlimited'
    ),
  duration: z.enum(['24hours', '7days', '30days', 'permanent'], {
    message: 'Invalid duration',
  }),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason too long'),
  supportAgentId: z.string().uuid('Invalid support agent ID'),
});

/**
 * User Search Schema
 */
export const UserSearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query required')
    .max(255, 'Search query too long'),
  role: z.enum(['user', 'support', 'admin']).optional(),
  limit: z.number().int().positive().max(100).optional().default(10),
});

/**
 * Type exports
 */
export type CreateSupportTicket = z.infer<typeof CreateSupportTicketSchema>;
export type UpdateSupportTicket = z.infer<typeof UpdateSupportTicketSchema>;
export type GrantPremium = z.infer<typeof GrantPremiumSchema>;
export type RevokePremium = z.infer<typeof RevokePremiumSchema>;
export type FeatureLimitOverride = z.infer<typeof FeatureLimitOverrideSchema>;
export type UserSearch = z.infer<typeof UserSearchSchema>;

/**
 * Validation helper functions
 */

export function validateCreateTicket(data: unknown): CreateSupportTicket {
  return CreateSupportTicketSchema.parse(data);
}

export function validateUpdateTicket(data: unknown): UpdateSupportTicket {
  return UpdateSupportTicketSchema.parse(data);
}

export function validateGrantPremium(data: unknown): GrantPremium {
  return GrantPremiumSchema.parse(data);
}

export function validateRevokePremium(data: unknown): RevokePremium {
  return RevokePremiumSchema.parse(data);
}

export function safeValidateTicket(data: unknown): {
  success: boolean;
  data?: CreateSupportTicket;
  error?: string;
} {
  const result = CreateSupportTicketSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = result.error.issues
      .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }
}

