import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { ThemedView } from '../components/ThemedView';
import { SunsetBanner } from '../components/SunsetBanner';
import { WebSnackbar } from '../components/web/WebSnackbar';
import { SnackbarProvider, useSnackbar } from '../contexts/SnackbarContext';
import { PDFUploadProvider } from '../contexts/PDFUploadContext';
import { AudioUploadProvider } from '../contexts/AudioUploadContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePageTitle } from '../hooks/usePageTitle';
import { featureFlagService } from '../services/FeatureFlagService';
import { SystemSettingsService } from '../services/SystemSettingsService';
import { crashReportingService } from '../services/CrashReportingService';
import { ThemeProvider as CustomThemeProvider, ThemeContext } from '../ThemeContext';
import '../lib/i18n';

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user, error, isOnline, isInitializing, initializationProgress } = useAuth();
  const networkStatus = useNetworkStatus();
  // Ensure isOnline is always defined
  const safeIsOnline = isOnline ?? true;
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Set page title for web
  usePageTitle();

  // Get user preference if available - use 'dark' as default for loading screens to avoid white flash
  // Only use user theme if preferences are fully loaded
  const userTheme = (user?.preferences?.theme !== undefined) ? user.preferences.theme : 'dark';
  const themeLoaded = user?.preferences?.theme !== undefined;

  // Add a timeout for auth loading to prevent infinite loading
  const [authTimeout, setAuthTimeout] = useState(false);
  const [sessionRestorationComplete, setSessionRestorationComplete] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('Layout: Auth loading timeout reached, forcing continue');
        setAuthTimeout(true);
      }, 20000); // Increased to 20 seconds to allow session restoration
      
      return () => clearTimeout(timer);
    } else {
      setAuthTimeout(false);
    }
  }, [isLoading]);

  // Wait for session restoration AND initialization to complete before allowing navigation
  // CRITICAL: Must have preferences (including theme) loaded before showing any content
  useEffect(() => {
    if (!isLoading && !authTimeout && !isInitializing && user) {
      // Verify user has FULL data (premium, role, AND preferences with theme) before allowing navigation
      const hasFullUserData = 
        user.premium !== undefined && 
        user.role !== undefined && 
        user.preferences !== undefined &&
        user.preferences.theme !== undefined; // Theme must be loaded
      
      if (hasFullUserData) {
        // Add a small delay to ensure everything is ready and theme is applied
        const navigationTimer = setTimeout(() => {
          console.log('Layout: Session restoration and initialization complete with full user data (premium, role, preferences with theme), allowing navigation');
          setSessionRestorationComplete(true);
        }, 300); // Slightly longer delay to ensure theme is applied before showing content
        
        return () => clearTimeout(navigationTimer);
      } else {
        const missingData = [];
        if (user.premium === undefined) missingData.push('premium');
        if (user.role === undefined) missingData.push('role');
        if (user.preferences === undefined) missingData.push('preferences');
        if (user.preferences && user.preferences.theme === undefined) missingData.push('theme');
        console.log(`Layout: User data incomplete (missing: ${missingData.join(', ')}), waiting for initialization...`);
        setSessionRestorationComplete(false);
      }
    } else if (isInitializing || (user && (user.premium === undefined || user.role === undefined || user.preferences === undefined || user.preferences?.theme === undefined))) {
      // Reset completion flag while initializing or if user data is incomplete (including theme)
      setSessionRestorationComplete(false);
    }
  }, [isLoading, authTimeout, isInitializing, user]);

  // Initialize crash reporting service
  useEffect(() => {
    const initializeCrashReporting = async () => {
      try {
        await crashReportingService.initialize({
          environment: __DEV__ ? 'development' : 'production',
          enableInDev: true,
        });
      } catch (error) {
        console.error('Layout: Error initializing crash reporting:', error);
      }
    };
    initializeCrashReporting();
  }, []);

  // Set user in crash reporting service when user changes
  useEffect(() => {
    if (user?.id) {
      crashReportingService.setUser(user.id, user.email || null);
    } else {
      crashReportingService.clearUser();
    }
  }, [user?.id, user?.email]);

  // Initialize feature flag service non-blocking (loads from cache immediately, refreshes in background)
  useEffect(() => {
    if (!isLoading) {
      // Set error handler immediately (non-blocking)
      featureFlagService.setErrorHandler((message, type) => {
        if (Platform.OS === 'web') {
          console.log('Feature flag error:', message, type);
        }
      });
      
      // Initialize in background - don't block rendering
      const initializeFeatureFlags = async () => {
        try {
          console.log('Layout: Initializing feature flags in background...');
          
          // Load from cache first (synchronous, fast)
          // Then refresh from server in background if authenticated
          const initPromise = featureFlagService.initialize(isAuthenticated);
          
          // Also initialize system settings in background
          const systemSettingsPromise = SystemSettingsService.getInstance().getSettings(true);
          
          // Add timeout to prevent blocking
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Feature flag initialization timeout')), 10000);
          });
          
          // Race with timeout but don't block the app
          Promise.race([initPromise, systemSettingsPromise, timeoutPromise]).then(() => {
            console.log('Layout: Feature flags and system settings initialized successfully');
          }).catch((error) => {
            console.warn('Layout: Feature flag or system settings initialization timed out or failed:', error);
            // App continues with cached flags
          });
        } catch (error) {
          console.error('Layout: Error initializing feature flags:', error);
          // Continue anyway, don't block the app - cached flags will be used
        }
      };
      
      // Start initialization in next tick to not block render
      setTimeout(() => {
        initializeFeatureFlags();
      }, 0);
    }
  }, [isLoading, isAuthenticated]);

  // Show error snackbar when auth error occurs
  useEffect(() => {
    if (error && Platform.OS === 'web') {
      console.log('Layout: Auth error occurred:', error);
    }
  }, [error]);

  // Memoize navigation functions to prevent infinite loops
  const navigateToTabs = useCallback(() => {
    console.log('Layout: Navigating to tabs');
    try {
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Layout: Error navigating to tabs:', error);
      // Fallback to push
      try {
        router.push('/(tabs)');
      } catch (fallbackError) {
        console.error('Layout: Fallback navigation also failed:', fallbackError);
      }
    }
  }, [router]);

  const navigateToLogin = useCallback(() => {
    console.log('Layout: Navigating to login');
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Layout: Error navigating to login:', error);
      // Fallback to push
      try {
        router.push('/(auth)/login');
      } catch (fallbackError) {
        console.error('Layout: Fallback navigation also failed:', fallbackError);
      }
    }
  }, [router]);

  // Handle navigation based on auth state
  useEffect(() => {
    console.log('Layout: Navigation effect triggered - isLoading:', isLoading, 'isInitializing:', isInitializing, 'authTimeout:', authTimeout, 'sessionRestorationComplete:', sessionRestorationComplete, 'isAuthenticated:', isAuthenticated);
    
    const SHUTDOWN_DATE = new Date('2026-05-22T03:00:00-04:00'); // 3 AM EST
    const isPastShutdown = new Date() >= SHUTDOWN_DATE;

    // Don't navigate while initializing
    if (isInitializing) {
      console.log('Layout: Waiting for initialization to complete...');
      return;
    }
    
    if ((!isLoading || authTimeout) && sessionRestorationComplete) {
      console.log('Layout: Auth state determined - isAuthenticated:', isAuthenticated, 'authTimeout:', authTimeout, 'isInitializing:', isInitializing);
      
      // Get current pathname to check if we're on a payment page or valid note route
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isPaymentPage = currentPath.startsWith('/payment/');
        const isPaymentSuccessPage = currentPath.startsWith('/payment-success');
        const isPaymentCancelledPage = currentPath.startsWith('/payment-cancelled');
      const isNotePage = currentPath.startsWith('/note/');
      const isCreatePage = currentPath.startsWith('/create');
      const isAdminPage = currentPath.startsWith('/admin');
      const isArchivedPage = currentPath.startsWith('/archived');
      const isSearchPage = currentPath.startsWith('/search');
      const isSettingsPage = currentPath.startsWith('/settings');
      const isJoinPremiumPage = currentPath.startsWith('/join-premium');
      const isUsagePage = currentPath.startsWith('/usage');
      const isUserManagementPage = currentPath.startsWith('/user-management');
      const isAiTranscriptionsPage = currentPath.startsWith('/ai-transcriptions');
      const isCreateAudioPage = currentPath.startsWith('/create-audio');
      const isSubscriptionManagementPage = currentPath.startsWith('/subscription-management');
      const isPrivacyPage = currentPath.startsWith('/privacy');
      const isTermsPage = currentPath.startsWith('/terms');
      const isSharedPage = currentPath.startsWith('/shared/');
      const isDeleteAccountRequestPage = currentPath.startsWith('/delete-account-request');
      const isHelpPage = currentPath.startsWith('/help');
      const isChangelogPage = currentPath.startsWith('/changelog');
      const isFaqPage = currentPath.startsWith('/faq');
      const isTabsPage = currentPath.startsWith('/(tabs)');
      const isIndexPage = currentPath === '/' || currentPath === '' || currentPath === '/index';
      const isForgotPasswordPage = currentPath.startsWith('/forgot-password') || currentPath === 'forgot-password' || currentPath.includes('/forgot-password');
      const isResetPasswordPage = currentPath.startsWith('/reset-password') || currentPath === 'reset-password' || currentPath.includes('/reset-password');
      const isSignupPage = currentPath.startsWith('/signup') || currentPath === 'signup' || currentPath.includes('/signup');
      const isLoginPage = currentPath.startsWith('/login') || currentPath === 'login' || currentPath.includes('/login');
      const isVerifyEmailPage = currentPath.startsWith('/verify-email') || currentPath === 'verify-email' || currentPath.includes('/verify-email');
      const isSunsetPage = currentPath.includes('sunset') && !currentPath.includes('sunset-info');
      const isSunsetInfoPage = currentPath.includes('sunset-info');
      
      console.log('Layout: Path Debug - currentPath:', currentPath, 'length:', currentPath?.length, 'isSunsetPage:', isSunsetPage);
      
      // Check if current path is a valid authenticated route
        const isValidAuthenticatedRoute = isNotePage || isCreatePage || isAdminPage || 
          isArchivedPage || isSearchPage || isSettingsPage || isJoinPremiumPage || 
          isUsagePage || isUserManagementPage || isAiTranscriptionsPage || isCreateAudioPage ||
          isSubscriptionManagementPage || isPaymentSuccessPage || isPaymentCancelledPage || isPaymentPage || isHelpPage || isSunsetPage;
      
      // Check if current path is a public route (accessible without authentication)
      const isVerifyDeletionPage = currentPath === '/verify-deletion' || currentPath.startsWith('/verify-deletion');
      const isPublicRoute = isPrivacyPage || isTermsPage || isSharedPage || isDeleteAccountRequestPage || isForgotPasswordPage || isResetPasswordPage || isIndexPage || isChangelogPage || isFaqPage || isSignupPage || isLoginPage || isVerifyEmailPage || isVerifyDeletionPage || isSunsetInfoPage || isSunsetPage;
      
      console.log('Layout: Current path:', currentPath);
      console.log('Layout: isSunsetPage:', isSunsetPage);
      console.log('Layout: isValidAuthenticatedRoute:', isValidAuthenticatedRoute);
      console.log('Layout: isPublicRoute:', isPublicRoute);
      console.log('Layout: Is payment page:', isPaymentPage);
      console.log('Layout: Is tabs page:', isTabsPage);
      console.log('Layout: Is valid authenticated route:', isValidAuthenticatedRoute);
      console.log('Layout: Is public route:', isPublicRoute);
      console.log('Layout: Is forgot password page:', isForgotPasswordPage);
      console.log('Layout: Is reset password page:', isResetPasswordPage);
      console.log('Layout: Is past shutdown:', isPastShutdown);

      // FORCE SUNSET REDIRECT
      if (isPastShutdown && !isSunsetPage) {
        console.log('Layout: 🌅 WizNote has officially sunset. Redirecting to sunset page.');
        try {
          router.replace('/sunset');
        } catch (error) {
          router.push('/sunset');
        }
        return;
      }
      
      if (isAuthenticated) {
        console.log('Layout: User is authenticated, checking navigation...');
        // Don't redirect if we're on a payment page, valid authenticated route, public route, or already on tabs
        if (!isPaymentPage && !isValidAuthenticatedRoute && !isPublicRoute && !isTabsPage) {
          console.log('Layout: User authenticated, navigating to tabs');
          navigateToTabs();
        } else {
          console.log('Layout: User authenticated on valid route, not redirecting');
        }
      } else {
        // Don't redirect if we're on a payment page or public route
        if (!isPaymentPage && !isPublicRoute) {
          console.log('Layout: User not authenticated, navigating to login');
          navigateToLogin();
        } else {
          console.log('Layout: User not authenticated on payment page or public route, not redirecting');
        }
      }
    } else {
      console.log('Layout: Still loading auth or session restoration not complete, not navigating yet');
    }
  }, [isAuthenticated, isLoading, authTimeout, sessionRestorationComplete, navigateToTabs, navigateToLogin]);

  // Show loading screen while auth is being determined or fonts are loading
  // Use dark theme for loading screens to avoid white flash
  const loadingTheme = themeLoaded ? userTheme : 'dark';
  
  if (!loaded) {
    console.log('Layout: Fonts not loaded yet, showing loading screen');
    return (
      <CustomThemeProvider initialTheme={loadingTheme}>
        <LanguageProvider>
          <AuthLoadingScreen message="Loading fonts..." />
        </LanguageProvider>
      </CustomThemeProvider>
    );
  }

  if (isLoading && !authTimeout) {
    console.log('Layout: Auth loading, showing loading screen - isLoading:', isLoading, 'authTimeout:', authTimeout);
    return (
      <CustomThemeProvider initialTheme={loadingTheme}>
        <LanguageProvider>
          <AuthLoadingScreen message="Restoring your session..." />
        </LanguageProvider>
      </CustomThemeProvider>
    );
  }

  if (isInitializing) {
    console.log('Layout: Initializing user data, showing loading screen');
    const progressMessage = initializationProgress?.message || 'Loading your account...';
    return (
      <CustomThemeProvider initialTheme={loadingTheme}>
        <LanguageProvider>
          <AuthLoadingScreen 
            message={progressMessage}
            progress={initializationProgress}
          />
        </LanguageProvider>
      </CustomThemeProvider>
    );
  }

  if (!sessionRestorationComplete) {
    console.log('Layout: Session restoration not complete, showing loading screen');
    return (
      <CustomThemeProvider initialTheme={loadingTheme}>
        <LanguageProvider>
          <AuthLoadingScreen message="Loading your preferences..." />
        </LanguageProvider>
      </CustomThemeProvider>
    );
  }

  console.log('Layout: Rendering main app content - isLoading:', isLoading, 'authTimeout:', authTimeout, 'sessionRestorationComplete:', sessionRestorationComplete, 'isAuthenticated:', isAuthenticated, 'theme:', userTheme, 'themeLoaded:', themeLoaded);

  // Use the user's theme once preferences are loaded, otherwise keep dark to avoid flash
  const finalTheme = themeLoaded ? userTheme : 'dark';

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App crashed during render:', error, errorInfo);
        // In production, you might want to send this to a crash reporting service
      }}
    >
      <CustomThemeProvider initialTheme={finalTheme}>
        <LanguageProvider>
          <SnackbarProvider>
            <PDFUploadProvider>
              <AudioUploadProvider>
                <ThemeContext.Consumer>
                  {theme => {
                    const isDark = theme === 'dark' || (theme === 'auto' && colorScheme === 'dark');
                    return (
                      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                  <ThemedView style={{ 
                    flex: 1, 
                    minHeight: '100%',
                    width: '100%',
                    margin: 0,
                    padding: 0
                  }}>
                    <SunsetBanner />
                    <Stack>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="signup" options={{ headerShown: false }} />
                      <Stack.Screen name="auth/callback" options={{ headerShown: false, title: 'Verifying...' }} />
                      <Stack.Screen name="note" options={{ headerShown: false }} />
                      <Stack.Screen name="payment" options={{ headerShown: false }} />
                      <Stack.Screen name="create" options={{ headerShown: false }} />
                      <Stack.Screen name="create-audio" options={{ headerShown: false }} />
                      <Stack.Screen name="ai-transcriptions" options={{ headerShown: false }} />
                      <Stack.Screen name="flashcards" options={{ 
                        headerShown: false,
                        header: () => null,
                        headerTitle: '',
                        headerBackTitle: '',
                        headerBackVisible: false
                      }} />
                      <Stack.Screen name="usage" options={{ headerShown: false }} />
                      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
                      <Stack.Screen name="user-management" options={{ headerShown: false }} />
                      <Stack.Screen name="archived" options={{ headerShown: false }} />
                      <Stack.Screen name="join-premium" options={{ headerShown: false }} />
                      <Stack.Screen name="subscription-management" options={{ headerShown: false }} />
                      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                      <Stack.Screen name="privacy" options={{ headerShown: false }} />
                      <Stack.Screen name="terms" options={{ headerShown: false }} />
                      <Stack.Screen name="changelog" options={{ 
                        headerShown: false,
                        presentation: 'card',
                        header: () => null,
                        headerTitle: '',
                        headerBackTitle: '',
                        headerBackVisible: false,
                        headerLeft: () => null,
                        headerRight: () => null,
                      }} />
                      <Stack.Screen name="faq" options={{ 
                        headerShown: false,
                        presentation: 'card',
                        header: () => null,
                        headerTitle: '',
                        headerBackTitle: '',
                        headerBackVisible: false,
                        headerLeft: () => null,
                        headerRight: () => null,
                      }} />
                      <Stack.Screen name="about" options={{ headerShown: false }} />
                      <Stack.Screen name="delete-account-request" options={{ headerShown: false }} />
                      <Stack.Screen name="verify-deletion" options={{ headerShown: false }} />
                      <Stack.Screen name="admin" options={{ headerShown: false }} />
                      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                      <Stack.Screen name="sunset-info" options={{
                        headerShown: false,
                      }} />
                      <Stack.Screen name="sunset" options={{
                        headerShown: false,
                      }} />
                      <Stack.Screen name="help" options={{
                        headerShown: false,
                        presentation: 'card',
                        header: () => null,
                        headerTitle: '',
                        headerBackTitle: '',
                        headerBackVisible: false,
                        headerLeft: () => null,
                        headerRight: () => null,
                      }} />

                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style={isDark ? 'light' : 'dark'} />
                                        <OfflineIndicator 
                        isVisible={!safeIsOnline} 
                        message="You are offline. Some features may be limited."
                      />
                    <SnackbarWrapper />
                  </ThemedView>
                </ThemeProvider>
                      );
                    }}
                  </ThemeContext.Consumer>
              </AudioUploadProvider>
            </PDFUploadProvider>
          </SnackbarProvider>
        </LanguageProvider>
      </CustomThemeProvider>
    </ErrorBoundary>
  );
}

function SnackbarWrapper() {
  const { snackbar, hideSnackbar } = useSnackbar();
  
  return (
    <>
      {/* Web Snackbar for error notifications */}
      {Platform.OS === 'web' && (
        <WebSnackbar
          visible={snackbar.visible}
          message={snackbar.message}
          type={snackbar.type}
          duration={snackbar.duration}
          onClose={hideSnackbar}
          action={snackbar.action}
        />
      )}
    </>
  );
}

export default AppContent;


