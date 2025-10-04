// Web-specific session utilities for better performance and reliability

// Session storage keys
const SESSION_CACHE_KEY = 'notez_session_cache';
const SESSION_TIMESTAMP_KEY = 'notez_session_timestamp';
const SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Check if we're in a web environment
export const isWeb = typeof window !== 'undefined';

// Get cached session data
export const getCachedSession = () => {
  if (!isWeb) return null;
  
  try {
    // Double-check that localStorage is available
    if (typeof localStorage === 'undefined') {
      return null;
    }
    
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < SESSION_CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.warn('Error reading cached session:', error);
  }
  
  return null;
};

// Cache session data
export const cacheSession = (sessionData: any) => {
  if (!isWeb) return;
  
  try {
    // Double-check that localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available, skipping session cache');
      return;
    }
    
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Error caching session:', error);
  }
};

// Clear cached session data
export const clearCachedSession = () => {
  if (!isWeb) return;
  
  try {
    // Double-check that localStorage is available
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Error clearing cached session:', error);
  }
};

// Check if localStorage is available and working
export const isLocalStorageAvailable = () => {
  if (!isWeb) return false;
  
  try {
    // Check if localStorage is defined
    if (typeof localStorage === 'undefined') {
      return false;
    }
    
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

// Debounce function for web
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for web
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Check if page is visible
export const isPageVisible = () => {
  if (!isWeb) return true;
  return !document.hidden;
};

// Add page visibility listener
export const addPageVisibilityListener = (callback: (isVisible: boolean) => void) => {
  if (!isWeb) return () => {};
  
  const handleVisibilityChange = () => {
    callback(!document.hidden);
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

// Get network status
export const getNetworkStatus = () => {
  if (!isWeb) return { online: true, effectiveType: 'unknown' };
  
  return {
    online: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
  };
};

// Add network status listener
export const addNetworkStatusListener = (callback: (status: { online: boolean; effectiveType: string }) => void) => {
  if (!isWeb) return () => {};
  
  const handleOnline = () => callback({ online: true, effectiveType: (navigator as any).connection?.effectiveType || 'unknown' });
  const handleOffline = () => callback({ online: false, effectiveType: 'unknown' });
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}; 