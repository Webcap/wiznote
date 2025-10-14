/**
 * Authentication & User Validation Schema
 * 
 * Validates all authentication and user-related inputs to prevent
 * injection attacks, ensure data integrity, and enforce security policies.
 */

import { z } from 'zod';

/**
 * Email Schema
 * - Valid email format
 * - Max 255 characters (RFC 5321)
 * - Lowercase normalized
 */
export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email too long')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Password Schema
 * - Min 8 characters
 * - Max 128 characters (bcrypt limit)
 * - Must contain at least one letter and one number
 * - Must contain at least one special character
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine(
    (password) => /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
    'Password must contain at least one letter and one number'
  )
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    'Password must contain at least one special character'
  );

/**
 * Display Name Schema
 * - Optional
 * - Max 100 characters
 * - No control characters
 */
export const DisplayNameSchema = z
  .string()
  .max(100, 'Display name too long')
  .refine(
    (val) => !val || !/[\x00-\x1F\x7F]/.test(val),
    'Display name contains invalid characters'
  )
  .optional();

/**
 * User Role Schema
 * - Must be one of the defined roles
 */
export const UserRoleSchema = z.enum(['user', 'support', 'admin'], {
  errorMap: () => ({ message: 'Invalid user role' }),
});

/**
 * Sign Up Schema
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: DisplayNameSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

/**
 * Sign In Schema
 */
export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password Reset Request Schema
 */
export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

/**
 * Password Reset Schema
 */
export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Change Password Schema
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

/**
 * Update Profile Schema
 */
export const UpdateProfileSchema = z.object({
  displayName: DisplayNameSchema,
  email: EmailSchema.optional(),
});

/**
 * User ID Schema
 */
export const UserIdSchema = z.string().uuid('Invalid user ID');

/**
 * MFA Code Schema
 */
export const MFACodeSchema = z
  .string()
  .length(6, 'MFA code must be 6 digits')
  .regex(/^\d{6}$/, 'MFA code must contain only numbers');

/**
 * MFA Setup Schema
 */
export const MFASetupSchema = z.object({
  code: MFACodeSchema,
  secret: z.string().min(1, 'MFA secret is required'),
});

/**
 * Admin Actions Schema
 */
export const AdminUpdateUserSchema = z.object({
  userId: UserIdSchema,
  role: UserRoleSchema.optional(),
  displayName: DisplayNameSchema,
});

/**
 * Type exports
 */
export type SignUp = z.infer<typeof SignUpSchema>;
export type SignIn = z.infer<typeof SignInSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type MFASetup = z.infer<typeof MFASetupSchema>;
export type AdminUpdateUser = z.infer<typeof AdminUpdateUserSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate email address
 */
export function validateEmail(email: unknown): string {
  return EmailSchema.parse(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: unknown): string {
  return PasswordSchema.parse(password);
}

/**
 * Validate sign up data
 */
export function validateSignUp(data: unknown): SignUp {
  return SignUpSchema.parse(data);
}

/**
 * Validate sign in data
 */
export function validateSignIn(data: unknown): SignIn {
  return SignInSchema.parse(data);
}

/**
 * Safe validation wrapper
 */
export function safeValidateSignUp(data: unknown): {
  success: boolean;
  data?: SignUp;
  error?: string;
} {
  const result = SignUpSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }
}

/**
 * Password strength checker (0-4 score)
 */
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
    feedback.push('Good: Mix of uppercase and lowercase');
  }
  if (/[0-9]/.test(password)) {
    score++;
    feedback.push('Good: Contains numbers');
  }
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
    feedback.push('Good: Contains special characters');
  }

  // Common patterns (reduce score)
  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 2);
    feedback.push('Weak: Only numbers');
  }
  if (/(012|123|234|345|456|567|678|789|890)/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Weak: Contains sequential numbers');
  }
  if (/(abc|bcd|cde|def|efg|fgh)/.test(password.toLowerCase())) {
    score = Math.max(0, score - 1);
    feedback.push('Weak: Contains sequential letters');
  }

  // Cap score at 4
  score = Math.min(4, score);

  return { score, feedback };
}

