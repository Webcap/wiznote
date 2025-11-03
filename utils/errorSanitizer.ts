/**
 * Error Sanitization Utilities
 * 
 * Prevents information disclosure through error messages by sanitizing
 * sensitive details before sending to clients.
 */

/**
 * Sanitize error messages for client display
 * Removes sensitive information like stack traces, file paths, API keys, etc.
 */
export function sanitizeErrorForClient(error: unknown, isProduction: boolean = true): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message;
    
    // In production, use generic messages
    if (isProduction) {
      // Check for specific error types and provide user-friendly messages
      if (message.includes('network') || message.includes('fetch') || message.includes('ECONNREFUSED')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'Authentication required. Please sign in and try again.';
      }
      
      if (message.includes('forbidden') || message.includes('403')) {
        return 'You do not have permission to perform this action.';
      }
      
      if (message.includes('not found') || message.includes('404')) {
        return 'The requested resource was not found.';
      }
      
      if (message.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      
      if (message.includes('database') || message.includes('SQL') || message.includes('query')) {
        return 'A database error occurred. Please try again later.';
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return 'Invalid input. Please check your data and try again.';
      }
      
      // Generic fallback for production
      return 'An error occurred. Please try again later.';
    }
    
    // In development, show more details but still sanitize sensitive info
    let devMessage = message;
    
    // Remove potential API keys
    devMessage = devMessage.replace(/[a-zA-Z0-9_-]{20,}/g, (match) => {
      // Check if it looks like an API key
      if (match.includes('key') || match.includes('secret') || match.includes('token')) {
        return '[REDACTED]';
      }
      return match;
    });
    
    // Remove file paths (keep just filename)
    devMessage = devMessage.replace(/\/[^\s]+/g, (match) => {
      if (match.includes('/')) {
        const filename = match.split('/').pop();
        return filename || '[PATH]';
      }
      return match;
    });
    
    // Remove stack trace markers
    devMessage = devMessage.replace(/\s+at\s+.*/g, '');
    
    return devMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return isProduction ? 'An error occurred. Please try again later.' : error;
  }

  // Handle other types
  return 'An unexpected error occurred';
}

/**
 * Log detailed error server-side without exposing to client
 */
export function logErrorForServer(error: unknown, context?: Record<string, any>): void {
  if (typeof console !== 'undefined' && console.error) {
    const errorDetails = {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      context,
      timestamp: new Date().toISOString(),
    };
    
    console.error('[SERVER ERROR]', JSON.stringify(errorDetails, null, 2));
  }
}

/**
 * Create a safe error response for API endpoints
 */
export function createSafeErrorResponse(
  error: unknown,
  isProduction: boolean = true,
  statusCode: number = 500
): {
  statusCode: number;
  body: {
    error: string;
    errorId?: string;
  };
} {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log full error server-side
  logErrorForServer(error, { errorId, statusCode });
  
  // Return sanitized error to client
  return {
    statusCode,
    body: {
      error: sanitizeErrorForClient(error, isProduction),
      ...(isProduction ? { errorId } : {}), // Include error ID in production for support
    },
  };
}

/**
 * Check if an error message contains sensitive information
 */
export function containsSensitiveInfo(message: string): boolean {
  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i,
    /\.env/i,
    /\/etc\/passwd/i,
    /\/home\/[^\/]+/i,
    /[a-zA-Z0-9_-]{20,}/, // Long strings that might be keys
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize error before logging (additional layer of protection)
 */
export function sanitizeErrorForLogging(error: unknown): unknown {
  if (error instanceof Error) {
    let message = error.message;
    
    // Redact sensitive patterns
    message = message.replace(/[a-zA-Z0-9_-]{20,}/g, (match) => {
      if (containsSensitiveInfo(match)) {
        return '[REDACTED]';
      }
      return match;
    });
    
    return {
      ...error,
      message,
    };
  }
  
  return error;
}

