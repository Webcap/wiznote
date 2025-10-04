import { Stack } from 'expo-router';
import { SnackbarProvider } from '../../contexts/SnackbarContext';

export default function AdminLayout() {
  return (
    <SnackbarProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="enhanced-plans" />
        <Stack.Screen name="feature-management" />
        <Stack.Screen name="feature-limits" />
        <Stack.Screen name="usage-stats" />
        <Stack.Screen name="support" />
      </Stack>
    </SnackbarProvider>
  );
} 