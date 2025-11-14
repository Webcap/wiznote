import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LandingPage from '../components/LandingPage';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  console.log('Index page - Platform:', Platform.OS, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // Handle redirects after auth state is determined
  useEffect(() => {
    if (isLoading) {
      return;
    }

    // For authenticated users, redirect to home
    if (isAuthenticated) {
      console.log('Index: Redirecting to tabs (authenticated)');
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Index: Error redirecting to tabs:', error);
        // Fallback to push
        try {
          router.push('/(tabs)');
        } catch (fallbackError) {
          console.error('Index: Fallback redirect also failed:', fallbackError);
        }
      }
    } else if (Platform.OS !== 'web') {
      // For mobile non-authenticated users, redirect to login
      console.log('Index: Redirecting to login (mobile + not authenticated)');
      try {
        router.replace('/(auth)/login');
      } catch (error) {
        console.error('Index: Error redirecting to login:', error);
        // Fallback to push
        try {
          router.push('/(auth)/login');
        } catch (fallbackError) {
          console.error('Index: Fallback redirect also failed:', fallbackError);
        }
      }
    }
    // On web, non-authenticated users will see the landing page (handled in render)
  }, [isAuthenticated, isLoading, router]);

  // While loading, show nothing (the layout shows loading screen)
  if (isLoading) {
    console.log('Index: Still loading auth...');
    return null;
  }

  // On web, show landing page to non-authenticated users
  if (Platform.OS === 'web' && !isAuthenticated) {
    console.log('Index: Showing landing page (web + not authenticated)');
    return <LandingPage />;
  }

  // For authenticated users or mobile, show nothing while redirect happens
  // (the useEffect handles the redirect)
  return null;
}


