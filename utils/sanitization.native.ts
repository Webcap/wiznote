/**
 * Input Sanitization Utilities - React Native Version
 * 
 * Provides functions to sanitize user input for React Native environments.
 * Uses simple regex-based sanitization since DOMPurify requires a DOM.
 */

/**
 * Strip HTML tags from a string
 */
function stripHTMLTags(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  
  return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
    return entities[match.toLowerCase()] || match;
  });
}

/**
 * Sanitize HTML content based on context
 * For React Native, we use simpler text-based sanitization
 */
export function sanitizeHTML(
  html: string,
  level: 'strict' | 'basic' | 'rich' | 'note' = 'rich'
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // For strict mode, remove all HTML and decode entities
  if (level === 'strict') {
    let sanitized = stripHTMLTags(html);
    sanitized = decodeHTMLEntities(sanitized);
    return sanitized;
  }

  // For other levels, we'll keep basic structure but still strip dangerous content
  let sanitized = html;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // For note level, keep the HTML structure
  if (level === 'note' || level === 'rich' || level === 'basic') {
    return sanitized;
  }

  return sanitized;
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = stripHTMLTags(text);
  sanitized = decodeHTMLEntities(sanitized);
  return sanitized;
}

/**
 * Sanitize note content
 */
export function sanitizeNoteContent(content: string): string {
  return sanitizeHTML(content, 'note');
}

/**
 * Sanitize note title
 */
export function sanitizeNoteTitle(title: string): string {
  // Remove all HTML, control characters, and trim
  let sanitized = sanitizePlainText(title);
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized.trim();
}

/**
 * Sanitize URL
 * Ensures URL is safe and well-formed
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Simple URL validation for React Native
    const urlTrimmed = url.trim();
    
    // Check if it starts with http:// or https://
    if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
      return '';
    }
    
    // Basic validation - must have protocol and domain
    if (urlTrimmed.length < 10) { // Minimum: https://a.b
      return '';
    }
    
    // Check for dangerous patterns
    if (urlTrimmed.includes('javascript:') || 
        urlTrimmed.includes('data:') || 
        urlTrimmed.includes('vbscript:') ||
        urlTrimmed.includes('file:')) {
      return '';
    }

    return urlTrimmed;
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remove HTML and control characters
  let sanitized = sanitizePlainText(email);
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim and lowercase
  return sanitized.trim().toLowerCase();
}

/**
 * Sanitize search query
 * Remove potentially dangerous characters while keeping useful ones
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Remove HTML
  let sanitized = sanitizePlainText(query);

  // Remove control characters but keep spaces
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Sanitize JSON input
 * Parse and re-stringify to remove potential code injection
 */
export function sanitizeJSON(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed);
  } catch {
    return '';
  }
}

/**
 * Escape SQL-like wildcards
 * For use with LIKE queries to prevent injection
 */
export function escapeSQLWildcards(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/[%_]/g, '\\$&');
}

/**
 * Sanitize filename
 * Remove path traversal and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal
  let sanitized = filename.replace(/\.\./g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - ext.length - 1) + '.' + ext;
  }

  return sanitized.trim();
}

/**
 * Sanitize object by applying sanitization to all string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  level: 'strict' | 'basic' | 'rich' = 'strict'
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value, level);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, level);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeHTML(item, level) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Strip dangerous protocols from URLs
 */
export function stripDangerousProtocols(url: string): string {
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

  let sanitized = url.trim().toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (sanitized.startsWith(protocol)) {
      return '';
    }
  }

  return url;
}

/**
 * Validate and sanitize Markdown content
 * Allows Markdown syntax but sanitizes the output HTML
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // For now, just sanitize as HTML
  return sanitizeHTML(markdown, 'note');
}

/**
 * Remove null bytes (can cause issues in some contexts)
 */
export function removeNullBytes(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/\0/g, '');
}

/**
 * Truncate string safely (respecting word boundaries)
 */
export function truncateString(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (!str || str.length <= maxLength) {
    return str;
  }

  const truncated = str.substring(0, maxLength - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + ellipsis;
  }

  return truncated + ellipsis;
}

/**
 * Sanitization presets for common use cases
 */
export const SanitizationPresets = {
  noteTitle: (input: string) => sanitizeNoteTitle(input),
  noteContent: (input: string) => sanitizeNoteContent(input),
  plainText: (input: string) => sanitizePlainText(input),
  email: (input: string) => sanitizeEmail(input),
  searchQuery: (input: string) => sanitizeSearchQuery(input),
  filename: (input: string) => sanitizeFilename(input),
  url: (input: string) => sanitizeURL(input),
};

export default {
  sanitizeHTML,
  sanitizePlainText,
  sanitizeNoteContent,
  sanitizeNoteTitle,
  sanitizeEmail,
  sanitizeURL,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeObject,
  SanitizationPresets,
};

