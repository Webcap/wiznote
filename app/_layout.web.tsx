import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { ThemedView } from '../components/ThemedView';
import { WebSnackbar } from '../components/web/WebSnackbar';
import { SmartAppBanner } from '../components/web/SmartAppBanner';
import { SnackbarProvider, useSnackbar } from '../contexts/SnackbarContext';
import { PDFUploadProvider } from '../contexts/PDFUploadContext';
import { AudioUploadProvider } from '../contexts/AudioUploadContext';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePageTitle } from '../hooks/usePageTitle';
import { featureFlagService } from '../services/FeatureFlagService';
import { ThemeProvider as CustomThemeProvider, ThemeContext } from '../ThemeContext';

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user, error, isOnline } = useAuth();
  // Ensure isOnline is always defined
  const safeIsOnline = isOnline ?? true;
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Set page title for web
  usePageTitle();

  // Get user preference if available
  const userTheme = user?.preferences?.theme || 'auto';

  // Initialize feature flag service only after auth is determined
  useEffect(() => {
    if (!isLoading) {
      const initializeFeatureFlags = async () => {
        try {
          console.log('Layout: Initializing feature flags...');
          featureFlagService.setErrorHandler((message, type) => {
            if (Platform.OS === 'web') {
              console.log('Feature flag error:', message, type);
            }
          });
          // Pass authentication status to feature flag service
          await featureFlagService.initialize(isAuthenticated);
          console.log('Layout: Feature flags initialized successfully');
        } catch (error) {
          console.error('Layout: Error initializing feature flags:', error);
        }
      };
      initializeFeatureFlags();
    }
  }, [isLoading, isAuthenticated]);

  // Show error snackbar when auth error occurs
  useEffect(() => {
    if (error && Platform.OS === 'web') {
      console.log('Layout: Auth error occurred:', error);
    }
  }, [error]);

  // Handle navigation based on auth state with debouncing
  useEffect(() => {
    if (!isLoading) {
      console.log('Layout: Auth state determined - isAuthenticated:', isAuthenticated);
      
      // Debounce navigation to prevent rapid redirects
      const navigationTimeout = setTimeout(() => {
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
        
        // Check if current path is a valid authenticated route
        const isValidAuthenticatedRoute = isNotePage || isCreatePage || isAdminPage || 
          isArchivedPage || isSearchPage || isSettingsPage || isJoinPremiumPage || 
          isUsagePage || isUserManagementPage || isAiTranscriptionsPage || isCreateAudioPage ||
          isSubscriptionManagementPage || isPaymentSuccessPage || isPaymentCancelledPage || isPaymentPage;
        
        // Check if current path is a public route (accessible without authentication)
        const isPublicRoute = isPrivacyPage || isTermsPage || isSharedPage || isDeleteAccountRequestPage;
        
        console.log('Layout: Current path:', currentPath);
        console.log('Layout: Is payment page:', isPaymentPage);
        console.log('Layout: Is valid authenticated route:', isValidAuthenticatedRoute);
        console.log('Layout: Is public route:', isPublicRoute);
        
        if (isAuthenticated) {
          // Don't redirect if we're on a payment page, valid authenticated route, or public route
          if (!isPaymentPage && !isValidAuthenticatedRoute && !isPublicRoute) {
            console.log('Layout: User authenticated, navigating to tabs');
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
          } else {
            console.log('Layout: User authenticated on valid route, not redirecting');
          }
        } else {
          // Don't redirect if we're on a payment page or public route
          if (!isPaymentPage && !isPublicRoute) {
            console.log('Layout: User not authenticated, navigating to login');
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
          } else {
            console.log('Layout: User not authenticated on payment page or public route, not redirecting');
          }
        }
      }, 100); // 100ms debounce for navigation
      
      return () => clearTimeout(navigationTimeout);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen while auth is being determined or fonts are loading
  if (!loaded || isLoading) {
    return (
      <CustomThemeProvider initialTheme={userTheme}>
        <AuthLoadingScreen message="Initializing..." />
      </CustomThemeProvider>
    );
  }

  return (
    <CustomThemeProvider initialTheme={userTheme}>
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
                    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any, width: '100vw' as any } : { minHeight: '100%', width: '100%' }),
                    margin: 0,
                    padding: 0
                  }}>
                    {/* Smart App Banner for mobile web visitors */}
                    <SmartAppBanner 
                      appName="WizNote"
                      description="Get our native app for a better experience"
                      backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'}
                      textColor={isDark ? '#FFFFFF' : '#000000'}
                      buttonColor="#6A5ACD"
                      showOnTablets={false}
                    />
                    <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="note" options={{ headerShown: false }} />
                    <Stack.Screen name="payment" options={{ headerShown: false }} />
                    <Stack.Screen name="create" options={{ headerShown: false }} />
                    <Stack.Screen name="create-audio" options={{ headerShown: false }} />
                    <Stack.Screen name="ai-transcriptions" options={{ headerShown: false }} />
                    <Stack.Screen name="flashcards" options={{ 
                      headerShown: false,
                      header: () => null,
                      headerStyle: { backgroundColor: 'transparent' },
                      headerTitle: '',
                      headerBackTitle: '',
                      headerBackVisible: false
                    }} />
                    <Stack.Screen name="usage" options={{ headerShown: false }} />
                    <Stack.Screen name="simple-usage" options={{ headerShown: false }} />
                    <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
                    <Stack.Screen name="user-management" options={{ headerShown: false }} />
                    <Stack.Screen name="archived" options={{ headerShown: false }} />
                    <Stack.Screen name="join-premium" options={{ headerShown: false }} />
                    <Stack.Screen name="subscription-management" options={{ headerShown: false }} />
                    <Stack.Screen name="privacy" options={{ headerShown: false }} />
                    <Stack.Screen name="terms" options={{ headerShown: false }} />
                    <Stack.Screen name="delete-account-request" options={{ headerShown: false }} />
                    <Stack.Screen name="admin" options={{ headerShown: false }} />

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
    </CustomThemeProvider>
  );
}

function SnackbarWrapper() {
  const { snackbar, hideSnackbar } = useSnackbar();
  
  console.log('SnackbarWrapper render - snackbar state:', snackbar);
  console.log('Platform.OS:', Platform.OS);
  
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