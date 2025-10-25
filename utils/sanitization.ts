/**
 * Input Sanitization Utilities - Web Version
 * 
 * Provides functions to sanitize user input and prevent XSS attacks.
 * Uses DOMPurify for HTML sanitization and custom functions for other inputs.
 * 
 * Note: For React Native, use sanitization.native.ts instead
 */

import DOMPurify from 'dompurify';

/**
 * DOMPurify Configuration for Different Contexts
 */
const PURIFY_CONFIG = {
  // Strict: Remove all HTML tags, keep only text
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Basic: Allow basic formatting (bold, italic, underline, links)
  BASIC: {
    ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  },

  // Rich: Allow common rich text formatting
  RICH: {
    ALLOWED_TAGS: [
      'b',
      'i',
      'u',
      'a',
      'p',
      'br',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  },

  // Note Content: Full rich text for notes
  NOTE_CONTENT: {
    ALLOWED_TAGS: [
      'b',
      'i',
      'u',
      'a',
      'p',
      'br',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'title', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  },
};

/**
 * Sanitize HTML content based on context
 */
export function sanitizeHTML(
  html: string,
  level: 'strict' | 'basic' | 'rich' | 'note' = 'rich'
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let config;
  switch (level) {
    case 'strict':
      config = PURIFY_CONFIG.STRICT;
      break;
    case 'basic':
      config = PURIFY_CONFIG.BASIC;
      break;
    case 'rich':
      config = PURIFY_CONFIG.RICH;
      break;
    case 'note':
      config = PURIFY_CONFIG.NOTE_CONTENT;
      break;
    default:
      config = PURIFY_CONFIG.RICH;
  }

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizePlainText(text: string): string {
  return sanitizeHTML(text, 'strict');
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
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.toString();
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
  // This is a basic implementation
  // In production, consider using a dedicated Markdown sanitizer
  // like marked + DOMPurify or remark with rehype-sanitize

  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // For now, just sanitize as HTML
  // TODO: Integrate proper Markdown parser + sanitizer
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
 * Sanitize rich text content specifically for our editor
 * This is more restrictive than NOTE_CONTENT to match our editor's capabilities
 */
export function sanitizeRichTextContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Use a more restrictive config that matches our editor's toolbar
  const RICH_TEXT_CONFIG = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 
      'ul', 'ol', 'li', 'a', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    // Ensure links open safely
    ADD_ATTR: ['target', 'rel'],
    ADD_TAGS: [],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style'],
  };

  // Sanitize with our custom config
  let sanitized = DOMPurify.sanitize(content, RICH_TEXT_CONFIG);
  
  // Post-process to ensure links have proper attributes
  sanitized = sanitized.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
    // Add target="_blank" and rel="noopener noreferrer" if not present
    if (!attrs.includes('target=')) {
      attrs += ' target="_blank"';
    }
    if (!attrs.includes('rel=')) {
      attrs += ' rel="noopener noreferrer"';
    }
    return `<a ${attrs}>`;
  });

  return sanitized;
}

/**
 * Convert plain text to safe HTML (for display purposes)
 * Escapes HTML characters and converts newlines to <br> tags
 */
export function plainTextToSafeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Escape HTML characters
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Convert newlines to <br> tags
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Strip HTML tags and return plain text
 * Useful for creating plain text versions of rich content
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and normalize whitespace
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Validate rich text content before saving
 * Checks for dangerous patterns and validates structure
 */
export function validateRichTextContent(content: string): {
  isValid: boolean;
  sanitized: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  let sanitized = content;

  if (!content || typeof content !== 'string') {
    return { isValid: false, sanitized: '', warnings: ['Content is empty or invalid'] };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/gi,
    /data:text\/html/gi,
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /on\w+\s*=/gi, // Event handlers
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      warnings.push(`Suspicious content detected: ${pattern.source}`);
    }
  }

  // Check content length
  if (content.length > 100000) { // 100KB limit
    warnings.push('Content is very large and may impact performance');
  }

  // Sanitize the content
  sanitized = sanitizeRichTextContent(content);

  // Check if sanitization removed significant content
  const originalLength = content.length;
  const sanitizedLength = sanitized.length;
  const reductionPercent = ((originalLength - sanitizedLength) / originalLength) * 100;

  if (reductionPercent > 20) {
    warnings.push(`Significant content was removed during sanitization (${reductionPercent.toFixed(1)}% reduction)`);
  }

  return {
    isValid: warnings.length === 0,
    sanitized,
    warnings,
  };
}

/**
 * Sanitization presets for common use cases
 */
export const SanitizationPresets = {
  noteTitle: (input: string) => sanitizeNoteTitle(input),
  noteContent: (input: string) => sanitizeNoteContent(input),
  richTextContent: (input: string) => sanitizeRichTextContent(input),
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
  sanitizeRichTextContent,
  plainTextToSafeHTML,
  htmlToPlainText,
  validateRichTextContent,
  sanitizeNoteTitle,
  sanitizeEmail,
  sanitizeURL,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeObject,
  SanitizationPresets,
};

