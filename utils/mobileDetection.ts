/**
 * Mobile Detection Utility
 * Detects mobile browsers and provides information about the platform
 */

export interface MobileInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isIPad: boolean;
  isTablet: boolean;
  userAgent: string;
}

/**
 * Detect if the user is on a mobile device
 */
export function detectMobile(): MobileInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isIPad: false,
      isTablet: false,
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // iPad detection (including iPad Pro with desktop mode)
  const isIPad = 
    /iPad/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Android detection
  const isAndroid = /android/i.test(userAgent);
  
  // Tablet detection
  const isTablet = 
    isIPad || 
    (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) ||
    /tablet/i.test(userAgent);
  
  // Mobile phone detection
  const isMobilePhone = 
    /iPhone|iPod/.test(userAgent) ||
    (/android/i.test(userAgent) && /mobile/i.test(userAgent)) ||
    /windows phone/i.test(userAgent) ||
    /blackberry/i.test(userAgent) ||
    /opera mini/i.test(userAgent);
  
  const isMobile = isMobilePhone || isTablet;

  return {
    isMobile,
    isIOS,
    isAndroid,
    isIPad,
    isTablet,
    userAgent,
  };
}

/**
 * Check if the app is likely installed (via deep link test)
 * This is a best-effort approach as browsers limit deep link detection
 */
export function checkAppInstalled(
  scheme: string,
  timeout: number = 2000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const now = Date.now();
    let timer: number;

    // If page loses visibility, app likely opened
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
        resolve(true);
      }
    };

    // If page blurs, app might have opened
    const handleBlur = () => {
      clearTimeout(timer);
      resolve(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Try to open the deep link
    window.location.href = scheme;

    // If nothing happens after timeout, assume app not installed
    timer = setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      resolve(false);
    }, timeout) as unknown as number;
  });
}

/**
 * Get the app store URL based on platform
 */
export function getAppStoreUrl(mobileInfo: MobileInfo): string | null {
  if (mobileInfo.isIOS || mobileInfo.isIPad) {
    // iOS App Store - Coming soon
    return 'https://apps.apple.com/app/wiznote/id123456789';
  }
  
  if (mobileInfo.isAndroid) {
    // Android Google Play Store - LIVE
    return 'https://play.google.com/store/apps/details?id=com.WizNote.app';
  }
  
  return null;
}

/**
 * Get the deep link URL for the current page
 */
export function getDeepLinkUrl(path: string = ''): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath ? `wiznote://${cleanPath}` : 'wiznote://';
}

/**
 * Attempt to open the app, fallback to app store
 */
export async function openApp(
  deepLinkUrl: string,
  mobileInfo: MobileInfo,
  fallbackToStore: boolean = true
): Promise<void> {
  if (!mobileInfo.isMobile) {
    console.log('Not a mobile device, skipping app open');
    return;
  }

  const appStoreUrl = getAppStoreUrl(mobileInfo);
  
  // Try to open the app
  const appOpened = await checkAppInstalled(deepLinkUrl);
  
  // If app didn't open and we should fallback to store
  if (!appOpened && fallbackToStore && appStoreUrl) {
    window.location.href = appStoreUrl;
  }
}

/**
 * Check if user has previously dismissed the app banner
 */
export function hasUserDismissedBanner(): boolean {
  if (typeof localStorage === 'undefined') return false;
  
  const dismissed = localStorage.getItem('wiznote_app_banner_dismissed');
  if (!dismissed) return false;
  
  // Check if dismissal was more than 7 days ago
  const dismissedDate = new Date(dismissed);
  const now = new Date();
  const daysSinceDismissal = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceDismissal < 7;
}

/**
 * Mark app banner as dismissed
 */
export function dismissBanner(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('wiznote_app_banner_dismissed', new Date().toISOString());
}

