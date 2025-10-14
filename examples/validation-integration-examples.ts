/**
 * Validation Integration Examples
 * 
 * This file shows how to integrate validation schemas into existing services.
 * Copy and adapt these examples to your services as needed.
 */

import {
  validateCreateNote,
  validateNoteTitle,
  validateNoteContent,
  validateSignUp,
  validateSignIn,
  validateEmail,
  validatePassword,
  safeValidateNote,
} from '../schemas';
import { sanitizeNoteContent, sanitizeNoteTitle, sanitizeEmail } from '../utils/sanitization';
import { validateAndSanitize, ValidationResult } from '../utils/validation';
import { CreateNoteSchema, SignUpSchema } from '../schemas';

/**
 * ============================================================================
 * EXAMPLE 1: Validating Note Creation
 * ============================================================================
 */

async function createNoteExample(noteData: any) {
  try {
    // Option A: Validate and throw on error
    const validated = validateCreateNote(noteData);
    console.log('✅ Valid note data:', validated);

    // Sanitize content
    const sanitizedContent = sanitizeNoteContent(validated.content);
    const sanitizedTitle = sanitizeNoteTitle(validated.title);

    // Now safe to save to database
    // await saveToDatabase({ ...validated, content: sanitizedContent, title: sanitizedTitle });

    return { success: true, data: validated };
  } catch (error) {
    console.error('❌ Validation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

async function createNoteSafeExample(noteData: any) {
  // Option B: Safe validation (doesn't throw)
  const result = safeValidateNote(noteData);

  if (!result.success) {
    console.error('❌ Validation failed:', result.error);
    return result;
  }

  console.log('✅ Valid note data:', result.data);

  // Sanitize and save
  const sanitized = {
    ...result.data,
    content: sanitizeNoteContent(result.data!.content),
    title: sanitizeNoteTitle(result.data!.title),
  };

  // await saveToDatabase(sanitized);

  return { success: true, data: sanitized };
}

/**
 * ============================================================================
 * EXAMPLE 2: Validating User Sign Up
 * ============================================================================
 */

async function signUpExample(userData: any) {
  try {
    // Validate sign up data
    const validated = validateSignUp(userData);

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(validated.email);

    console.log('✅ Valid sign up data');
    console.log('Email:', sanitizedEmail);
    console.log('Password is valid (not logged for security)');

    // Proceed with account creation
    // await createAccount({ ...validated, email: sanitizedEmail });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Sign up validation failed');

    // Extract user-friendly error messages
    if (error.errors) {
      const messages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      console.error('Errors:', messages);
      return { success: false, errors: messages };
    }

    return { success: false, error: error.message };
  }
}

/**
 * ============================================================================
 * EXAMPLE 3: Validating User Input with Combined Validation & Sanitization
 * ============================================================================
 */

async function validateAndSanitizeExample(userData: any): Promise<ValidationResult<any>> {
  // This helper combines validation and sanitization in one step
  const result = validateAndSanitize(SignUpSchema, userData, true);

  if (!result.success) {
    console.error('❌ Validation failed:', result.error);
    console.error('Field errors:', result.errors);
    return result;
  }

  console.log('✅ Data validated and sanitized:', result.data);
  return result;
}

/**
 * ============================================================================
 * EXAMPLE 4: Validating Individual Fields
 * ============================================================================
 */

function validateIndividualFieldsExample() {
  // Validate email
  try {
    const email = validateEmail('user@example.com');
    console.log('✅ Valid email:', email);
  } catch (error) {
    console.error('❌ Invalid email');
  }

  // Validate password
  try {
    const password = validatePassword('SecurePass123!');
    console.log('✅ Valid password');
  } catch (error: any) {
    console.error('❌ Invalid password:', error.message);
  }

  // Validate note title
  try {
    const title = validateNoteTitle('My Important Note');
    console.log('✅ Valid title:', title);
  } catch (error) {
    console.error('❌ Invalid title');
  }
}

/**
 * ============================================================================
 * EXAMPLE 5: Integration into Service Class
 * ============================================================================
 */

class NoteServiceExample {
  /**
   * Create a new note with validation
   */
  async createNote(noteData: any) {
    // Step 1: Validate input
    const validationResult = validateAndSanitize(CreateNoteSchema, noteData, true);

    if (!validationResult.success) {
      throw new Error(validationResult.error || 'Invalid note data');
    }

    const validated = validationResult.data!;

    // Step 2: Additional sanitization for HTML content
    const sanitized = {
      ...validated,
      title: sanitizeNoteTitle(validated.title),
      content: sanitizeNoteContent(validated.content),
    };

    // Step 3: Save to database (example)
    try {
      // const saved = await supabase.from('notes').insert(sanitized);
      console.log('Note created:', sanitized);
      return { success: true, data: sanitized };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Failed to create note' };
    }
  }

  /**
   * Update note with validation
   */
  async updateNote(noteId: string, updates: any) {
    // Validate partial updates
    const allowedUpdates = ['title', 'content', 'metadata'];
    const validated: any = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'title') {
          validated.title = sanitizeNoteTitle(validateNoteTitle(updates.title));
        } else if (key === 'content') {
          validated.content = sanitizeNoteContent(validateNoteContent(updates.content));
        } else {
          validated[key] = updates[key];
        }
      }
    }

    // Save to database
    console.log('Note updated:', noteId, validated);
    return { success: true, data: validated };
  }
}

/**
 * ============================================================================
 * EXAMPLE 6: Form Validation on Frontend
 * ============================================================================
 */

function validateFormExample(formData: FormData) {
  const email = formData.get('email')?.toString() || '';
  const password = formData.get('password')?.toString() || '';

  const errors: string[] = [];

  // Validate email
  try {
    validateEmail(email);
  } catch (error: any) {
    errors.push(`Email: ${error.message}`);
  }

  // Validate password
  try {
    validatePassword(password);
  } catch (error: any) {
    errors.push(`Password: ${error.message}`);
  }

  if (errors.length > 0) {
    console.error('❌ Form validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    return { valid: false, errors };
  }

  console.log('✅ Form is valid');
  return { valid: true };
}

/**
 * ============================================================================
 * EXAMPLE 7: API Route Validation
 * ============================================================================
 */

async function apiRouteExample(request: any) {
  try {
    const body = await request.json();

    // Validate request body
    const result = validateAndSanitize(CreateNoteSchema, body, true);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: result.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Process validated data
    const note = result.data!;
    console.log('Processing validated note:', note);

    return new Response(
      JSON.stringify({
        success: true,
        data: note,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * ============================================================================
 * Export Examples for Testing
 * ============================================================================
 */

export const ValidationExamples = {
  createNoteExample,
  createNoteSafeExample,
  signUpExample,
  validateAndSanitizeExample,
  validateIndividualFieldsExample,
  NoteServiceExample,
  validateFormExample,
  apiRouteExample,
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running validation examples...\n');

  // Example 1
  createNoteExample({
    title: 'Test Note',
    content: '<p>This is a test note</p>',
    userId: '123e4567-e89b-12d3-a456-426614174000',
  });

  // Example 4
  validateIndividualFieldsExample();
}

