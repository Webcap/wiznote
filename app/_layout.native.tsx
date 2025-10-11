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
import { SnackbarProvider, useSnackbar } from '../contexts/SnackbarContext';
import { PDFUploadProvider } from '../contexts/PDFUploadContext';
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

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading) {
      console.log('Layout: Auth state determined - isAuthenticated:', isAuthenticated);
      

      
      if (isAuthenticated) {
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
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen while auth is being determined or fonts are loading
  if (!loaded || isLoading) {
    return (
      <CustomThemeProvider initialTheme={userTheme}>
        <AuthLoadingScreen message={!loaded ? "Loading fonts..." : "Restoring your session..."} />
      </CustomThemeProvider>
    );
  }

  return (
    <CustomThemeProvider initialTheme={userTheme}>

        <SnackbarProvider>
          <PDFUploadProvider>
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

                      <Stack.Screen name="create" options={{ headerShown: false }} />
                      <Stack.Screen name="create-audio" options={{ headerShown: false }} />
                      <Stack.Screen name="ai-transcriptions" options={{ headerShown: false }} />
                      <Stack.Screen name="usage" options={{ headerShown: false }} />
                      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
                      <Stack.Screen name="user-management" options={{ headerShown: false }} />
                      <Stack.Screen name="archived" options={{ headerShown: false }} />
                      <Stack.Screen name="join-premium" options={{ headerShown: false }} />
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
          </PDFUploadProvider>
        </SnackbarProvider>
    </CustomThemeProvider>
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