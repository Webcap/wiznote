/**
 * Security Headers Configuration
 * 
 * This module provides security headers for web applications to protect against
 * XSS, clickjacking, MIME-sniffing, and other common web vulnerabilities.
 * 
 * @see https://owasp.org/www-project-secure-headers/
 */

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-DNS-Prefetch-Control': string;
  'Cross-Origin-Embedder-Policy': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Resource-Policy': string;
}

/**
 * Get security headers configuration
 * These headers protect against common web vulnerabilities
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    // Content Security Policy - Prevents XSS and injection attacks
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://generativelanguage.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: *.supabase.co",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.stripe.com https://api.webcap.media https://ingesteer.services-prod.nsvcs.net https://api.ipify.org https://api64.ipify.org https://ipapi.co wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),

    // Strict Transport Security - Force HTTPS for 1 year
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Prevent clickjacking by disallowing iframe embedding
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection for legacy browsers (modern browsers use CSP)
    'X-XSS-Protection': '1; mode=block',

    // Control what information is sent in Referer header
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Control browser features
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',

    // Prevent DNS prefetching for better privacy
    'X-DNS-Prefetch-Control': 'off',

    // Cross-Origin policies for enhanced isolation
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

/**
 * Apply security headers to a Response object
 * Useful for API routes and serverless functions
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Get cache headers for static assets
 */
export function getCacheHeaders(type: 'static' | 'image' | 'font' | 'no-cache'): Record<string, string> {
  switch (type) {
    case 'static':
    case 'image':
    case 'font':
      return {
        'Cache-Control': 'public, max-age=31536000, immutable',
      };
    case 'no-cache':
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      };
    default:
      return {};
  }
}

/**
 * Security headers explanation
 * For documentation and developer reference
 */
export const SECURITY_HEADERS_DOCS = {
  'Content-Security-Policy': {
    description: 'Prevents XSS attacks by controlling which resources can be loaded',
    impact: 'High - Blocks most XSS attacks',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
  },
  'Strict-Transport-Security': {
    description: 'Forces browsers to only use HTTPS connections',
    impact: 'High - Prevents man-in-the-middle attacks',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
  },
  'X-Frame-Options': {
    description: 'Prevents clickjacking by controlling iframe embedding',
    impact: 'Medium - Prevents UI redressing attacks',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
  },
  'X-Content-Type-Options': {
    description: 'Prevents MIME type sniffing',
    impact: 'Medium - Prevents execution of malicious files disguised as safe types',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
  },
  'Referrer-Policy': {
    description: 'Controls how much referrer information is sent',
    impact: 'Low - Privacy protection',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
  },
  'Permissions-Policy': {
    description: 'Controls which browser features can be used',
    impact: 'Medium - Prevents unauthorized access to camera, mic, etc',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy'],
  },
};

export default getSecurityHeaders;

