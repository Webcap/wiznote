import { Platform, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { EditProfileWeb } from '../components/profile/EditProfileWeb';
import { EditProfileMobile } from '../components/profile/EditProfileMobile';
import { useSnackbar } from '../contexts/SnackbarContext';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useRouter, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, updateProfile, updatePassword, isLoading } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      if (Platform.OS === 'web') {
        window.location.href = '/(auth)/login';
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state
  if (isLoading || !user) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>{t('editProfile.loading')}</ThemedText>
      </ThemedView>
    );
  }

  const handleUpdateProfile = async (updates: { displayName?: string; email?: string }) => {
    try {
      await updateProfile(updates);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await updatePassword(currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  };

  // Show message for mobile using Alert
  const showMobileMessage = (message: string, type: 'success' | 'error' | 'info') => {
    if (Platform.OS === 'web') {
      showSnackbar(message, type, 4000);
    } else {
      Alert.alert(
        type === 'success' ? t('editProfile.success') : type === 'error' ? t('editProfile.error') : t('editProfile.info'),
        message
      );
    }
  };

  // Render web or mobile version based on platform
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EditProfileWeb
          user={user}
          onUpdateProfile={handleUpdateProfile}
          onUpdatePassword={handleUpdatePassword}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EditProfileMobile
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onUpdatePassword={handleUpdatePassword}
        showMessage={showMobileMessage}
      />
    </>
  );
}

