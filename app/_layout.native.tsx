import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineIndicator } from '../components/OfflineIndicator';

import { ThemedView } from '../components/ThemedView';
import { WebSnackbar } from '../components/web/WebSnackbar';
import { SnackbarProvider, useSnackbar } from '../contexts/SnackbarContext';
import { PDFUploadProvider } from '../contexts/PDFUploadContext';
import { AudioUploadProvider } from '../contexts/AudioUploadContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTranslation } from '../hooks/useTranslation';
import { featureFlagService } from '../services/FeatureFlagService';
import { ThemeProvider as CustomThemeProvider, ThemeContext } from '../ThemeContext';
import '../lib/i18n';

function AppContent() {
  const { t } = useTranslation();
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

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log('Deep link received:', url);
      
      // Parse the URL
      const parsed = Linking.parse(url);
      console.log('Parsed deep link:', parsed);
      
      // Check if it's an auth callback
      if (parsed.path === 'auth/callback') {
        console.log('Auth callback deep link detected, navigating...');
        // Extract query parameters from the URL
        const params = parsed.queryParams || {};
        
        // Navigate to the callback screen with parameters
        router.push({
          pathname: '/auth/callback',
          params: params as any,
        });
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

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
          
          // Add timeout to prevent blocking
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Feature flag initialization timeout')), 10000);
          });
          
          // Race with timeout but don't block the app
          Promise.race([initPromise, timeoutPromise]).then(() => {
            console.log('Layout: Feature flags initialized successfully');
          }).catch((error) => {
            console.warn('Layout: Feature flag initialization timed out or failed (using cache):', error);
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

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading) {
      console.log('Layout: Auth state determined - isAuthenticated:', isAuthenticated, 'user:', user?.id);
      
      // Wait a bit longer on mobile to ensure auth state is fully propagated
      // Don't navigate immediately if we don't have a definitive auth state
      const navigationTimer = setTimeout(() => {
        // Ensure we have a definitive auth state before navigating
        const currentIsAuthenticated = !!user;
        console.log('Layout: After delay - isAuthenticated:', currentIsAuthenticated);
        
        if (currentIsAuthenticated) {
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
        }
      }, 1500); // Increased to 1500ms to allow auth state to fully propagate on mobile
      
      return () => clearTimeout(navigationTimer);
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Check if user profile with preferences is fully loaded
  const isProfileLoaded = user ? (
    user.preferences !== undefined && 
    user.preferences !== null
  ) : !isAuthenticated; // If not authenticated, profile is "loaded" (no profile needed)

  // Show loading screen while auth is being determined, fonts are loading, or profile isn't fully loaded
  if (!loaded || isLoading || (isAuthenticated && !isProfileLoaded)) {
    const loadingMessage = !loaded 
      ? t('auth.loadingFonts') 
      : isLoading 
        ? t('auth.restoringSession') 
        : t('auth.loadingProfile');
    
    return (
      <CustomThemeProvider initialTheme={userTheme}>
        <LanguageProvider>
          <AuthLoadingScreen message={loadingMessage} />
        </LanguageProvider>
      </CustomThemeProvider>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Native app crashed during render:', error, errorInfo);
        // In production, you might want to send this to a crash reporting service
      }}
    >
      <CustomThemeProvider initialTheme={userTheme}>
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
                        <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="auth/callback" options={{ headerShown: false, title: 'Verifying...' }} />
                        <Stack.Screen name="note" options={{ headerShown: false }} />

                        <Stack.Screen name="create" options={{ headerShown: false }} />
                        <Stack.Screen name="create-audio" options={{ headerShown: false }} />
                        <Stack.Screen name="ai-transcriptions" options={{ headerShown: false }} />
                        <Stack.Screen name="usage" options={{ headerShown: false }} />
                        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
                        <Stack.Screen name="user-management" options={{ headerShown: false }} />
                        <Stack.Screen name="archived" options={{ headerShown: false }} />
                        <Stack.Screen name="join-premium" options={{ headerShown: false }} />
                        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                        <Stack.Screen name="privacy" options={{ headerShown: false }} />
                        <Stack.Screen name="terms" options={{ headerShown: false }} />
                        <Stack.Screen name="changelog" options={{ headerShown: false }} />
                        <Stack.Screen name="about" options={{ headerShown: false }} />
                        <Stack.Screen name="admin" options={{ headerShown: false }} />
                        <Stack.Screen name="flashcards" options={{ headerShown: false }} />
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