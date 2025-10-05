export interface SupabaseErrorInfo {
  userMessage: string;
  type: 'error' | 'warning' | 'info';
  shouldRetry: boolean;
  retryAction?: () => void;
  errorCode?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'network' | 'permission' | 'validation' | 'server' | 'unknown';
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry: (error: unknown) => boolean;
}

export const getSupabaseErrorMessage = (error: any): SupabaseErrorInfo => {
  // Handle Supabase Auth errors
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('invalid login credentials')) {
      return {
        userMessage: 'Invalid email or password. Please try again.',
        type: 'error',
        shouldRetry: true,
        errorCode: 'auth/invalid-credentials',
        severity: 'low',
        category: 'auth',
      };
    }
    
    if (message.includes('email not confirmed')) {
      return {
        userMessage: 'Please verify your email address before signing in.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'auth/email-not-confirmed',
        severity: 'medium',
        category: 'auth',
      };
    }
    
    if (message.includes('user not found')) {
      return {
        userMessage: 'Account not found. Please check your email address.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'auth/user-not-found',
        severity: 'medium',
        category: 'auth',
      };
    }
    
    if (message.includes('email already registered')) {
      return {
        userMessage: 'An account with this email already exists.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'auth/email-already-in-use',
        severity: 'medium',
        category: 'auth',
      };
    }
    
    if (message.includes('weak password')) {
      return {
        userMessage: 'Password is too weak. Please choose a stronger password.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'auth/weak-password',
        severity: 'low',
        category: 'validation',
      };
    }
    
    if (message.includes('invalid email')) {
      return {
        userMessage: 'Please enter a valid email address.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'auth/invalid-email',
        severity: 'low',
        category: 'validation',
      };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return {
        userMessage: 'Network error. Please check your internet connection.',
        type: 'error',
        shouldRetry: true,
        errorCode: 'network/request-failed',
        severity: 'medium',
        category: 'network',
      };
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized')) {
      return {
        userMessage: 'You don\'t have permission to perform this action.',
        type: 'error',
        shouldRetry: false,
        errorCode: 'permission/denied',
        severity: 'high',
        category: 'permission',
      };
    }
    
    // Server errors
    if (message.includes('server') || message.includes('500') || message.includes('502') || message.includes('503')) {
      return {
        userMessage: 'Server error. Please try again later.',
        type: 'error',
        shouldRetry: true,
        errorCode: 'server/error',
        severity: 'medium',
        category: 'server',
      };
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        userMessage: 'Too many requests. Please try again later.',
        type: 'warning',
        shouldRetry: false,
        errorCode: 'rate-limit/exceeded',
        severity: 'medium',
        category: 'server',
      };
    }
  }
  
  // Default error
  return {
    userMessage: 'An unexpected error occurred. Please try again.',
    type: 'error',
    shouldRetry: true,
    errorCode: 'unknown/error',
    severity: 'medium',
    category: 'unknown',
  };
};

export const isSupabaseError = (error: unknown): boolean => {
  return !!(error && typeof error === 'object' && 'message' in error);
};

export const isNetworkError = (error: unknown): boolean => {
  if (isSupabaseError(error)) {
    const message = (error as any).message.toLowerCase();
    return message.includes('network') || message.includes('fetch');
  }
  return false;
};

export const isRetryableError = (error: unknown): boolean => {
  if (isSupabaseError(error)) {
    const errorInfo = getSupabaseErrorMessage(error);
    return errorInfo.shouldRetry;
  }
  return false;
};

export const getErrorType = (error: unknown): 'error' | 'warning' | 'info' => {
  if (isSupabaseError(error)) {
    return getSupabaseErrorMessage(error).type;
  }
  return 'error';
};

export const getErrorSeverity = (error: unknown): 'low' | 'medium' | 'high' | 'critical' => {
  if (isSupabaseError(error)) {
    return getSupabaseErrorMessage(error).severity;
  }
  return 'medium';
};

export const getErrorCategory = (error: unknown): 'auth' | 'network' | 'permission' | 'validation' | 'server' | 'unknown' => {
  if (isSupabaseError(error)) {
    return getSupabaseErrorMessage(error).category;
  }
  return 'unknown';
};

export const shouldRetryWithBackoff = (error: unknown, attempt: number, config: Partial<RetryConfig> = {}): boolean => {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  if (attempt >= finalConfig.maxRetries) {
    return false;
  }
  
  return finalConfig.shouldRetry(error);
};

export const calculateRetryDelay = (attempt: number, config: Partial<RetryConfig> = {}): number => {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
  return Math.min(delay, finalConfig.maxDelay);
};

export const createRetryableOperation = <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): (() => Promise<T>) => {
  return async (): Promise<T> => {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= (config.maxRetries || 3); attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!shouldRetryWithBackoff(error, attempt, config)) {
          throw error;
        }
        
        if (attempt < (config.maxRetries || 3)) {
          const delay = calculateRetryDelay(attempt, config);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
};

export const logError = (error: unknown, context: string = 'Application'): void => {
  const timestamp = new Date().toISOString();
  const errorInfo = isSupabaseError(error) ? getSupabaseErrorMessage(error) : null;
  
  console.error(`[${timestamp}] ${context} Error:`, {
    error,
    errorInfo,
    context,
    timestamp,
  });
  
  // In a real app, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
};

export const isCriticalError = (error: unknown): boolean => {
  return getErrorSeverity(error) === 'critical';
};

export const isHighSeverityError = (error: unknown): boolean => {
  const severity = getErrorSeverity(error);
  return severity === 'high' || severity === 'critical';
};

export const shouldShowUserError = (error: unknown): boolean => {
  // Don't show technical errors to users unless they're actionable
  if (isSupabaseError(error)) {
    const errorInfo = getSupabaseErrorMessage(error);
    return errorInfo.category !== 'unknown' || errorInfo.severity === 'high';
  }
  return true;
};

export const getErrorAction = (error: unknown): string => {
  if (isSupabaseError(error)) {
    const errorInfo = getSupabaseErrorMessage(error);
    if (errorInfo.shouldRetry) {
      return 'Please try again.';
    }
    if (errorInfo.category === 'auth') {
      return 'Please check your credentials and try again.';
    }
    if (errorInfo.category === 'network') {
      return 'Please check your internet connection and try again.';
    }
  }
  return 'Please try again later.';
}; 