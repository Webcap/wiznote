import { Stack } from 'expo-router';
import { SnackbarProvider } from '../../contexts/SnackbarContext';

export default function AuthLayout() {
  return (
    <SnackbarProvider>
      <Stack>
        <Stack.Screen
          name="signup"
          options={{
            title: 'Create Account',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: 'Sign In',
            headerShown: false,
          }}
        />
      </Stack>
    </SnackbarProvider>
  );
} 