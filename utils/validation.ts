/**
 * Validation Utilities
 * 
 * Helper functions for input validation throughout the application.
 * Combines Zod schemas with sanitization for complete input protection.
 */

import { ZodError, ZodSchema } from 'zod';
import { sanitizeHTML, sanitizePlainText } from './sanitization';

/**
 * Validation Result Type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Validate and sanitize data using a Zod schema
 */
export function validateAndSanitize<T>(
  schema: ZodSchema<T>,
  data: unknown,
  sanitize: boolean = true
): ValidationResult<T> {
  try {
    // First, validate with schema
    const validated = schema.parse(data);

    // Optionally sanitize string fields
    if (sanitize && typeof validated === 'object' && validated !== null) {
      const sanitized = sanitizeObjectStrings(validated);
      return {
        success: true,
        data: sanitized as T,
      };
    }

    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.issues.map((err) => err.message).join(', '),
        errors: error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    return {
      success: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Sanitize all string fields in an object
 */
function sanitizeObjectStrings<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizePlainText(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings) as unknown as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate multiple fields at once
 */
export function validateFields(validations: Array<{
  field: string;
  value: unknown;
  schema: ZodSchema;
}>): ValidationResult<Record<string, any>> {
  const errors: Array<{ field: string; message: string }> = [];
  const data: Record<string, any> = {};

  for (const { field, value, schema } of validations) {
    const result = validateAndSanitize(schema, value);

    if (result.success) {
      data[field] = result.data;
    } else {
      errors.push({
        field,
        message: result.error || 'Validation failed',
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      error: errors.map((e) => `${e.field}: ${e.message}`).join(', '),
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * Create a validation middleware for consistent error handling
 */
export function createValidator<T>(schema: ZodSchema<T>) {
  return {
    validate: (data: unknown): T => {
      return schema.parse(data);
    },

    validateSafe: (data: unknown): ValidationResult<T> => {
      return validateAndSanitize(schema, data);
    },

    validateOrThrow: (data: unknown): T => {
      const result = validateAndSanitize(schema, data);
      if (!result.success) {
        throw new Error(result.error || 'Validation failed');
      }
      return result.data!;
    },
  };
}

/**
 * Format validation errors for user display
 */
export function formatValidationError(error: ValidationResult<any>): string {
  if (!error.errors || error.errors.length === 0) {
    return error.error || 'Validation failed';
  }

  if (error.errors.length === 1) {
    return error.errors[0].message;
  }

  return error.errors.map((e, i) => `${i + 1}. ${e.field}: ${e.message}`).join('\n');
}

/**
 * Check if value is safe (no XSS, SQL injection attempts)
 */
export function isSafeInput(input: string): boolean {
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /eval\s*\(/i,
    /expression\s*\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /\bUNION\b.*\bSELECT\b/i, // SQL injection
    /\bDROP\b.*\bTABLE\b/i,
    /\bINSERT\b.*\bINTO\b/i,
    /\bDELETE\b.*\bFROM\b/i,
    /--/, // SQL comments
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate array of items
 */
export function validateArray<T>(
  schema: ZodSchema<T>,
  items: unknown[]
): ValidationResult<T[]> {
  const validated: T[] = [];
  const errors: Array<{ field: string; message: string }> = [];

  items.forEach((item, index) => {
    const result = validateAndSanitize(schema, item);

    if (result.success) {
      validated.push(result.data!);
    } else {
      errors.push({
        field: `[${index}]`,
        message: result.error || 'Invalid item',
      });
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      error: `${errors.length} items failed validation`,
    };
  }

  return {
    success: true,
    data: validated,
  };
}

/**
 * Validation decorator for TypeScript classes (future use)
 */
export function Validate<T>(schema: ZodSchema<T>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Validate first argument
      if (args.length > 0) {
        const result = validateAndSanitize(schema, args[0]);

        if (!result.success) {
          throw new Error(result.error);
        }

        args[0] = result.data;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export default {
  validateAndSanitize,
  validateFields,
  createValidator,
  formatValidationError,
  isSafeInput,
  validateArray,
};

