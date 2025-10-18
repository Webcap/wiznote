import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LandingPage from '../components/LandingPage';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('Index page - Platform:', Platform.OS, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

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

  // For authenticated users, redirect to home
  if (isAuthenticated) {
    console.log('Index: Redirecting to tabs (authenticated)');
    return <Redirect href="/(tabs)" />;
  }

  // For mobile or fallback: redirect to login
  console.log('Index: Redirecting to login (fallback)');
  return <Redirect href="/(auth)/login" />;
}


