import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { WebLayout } from '../web/WebLayout';
import { UserSidebar } from '../web/UserSidebar';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { User } from '../../types/User';
import { useTranslation } from '../../hooks/useTranslation';

interface EditProfileWebProps {
  user: User;
  onUpdateProfile: (updates: { displayName?: string; email?: string }) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export function EditProfileWeb({ user, onUpdateProfile, onUpdatePassword }: EditProfileWebProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const iconColor = useThemeColor({}, 'icon');
  
  // Form state
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Helper function to format dates
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'N/A';
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsUpdatingProfile(true);
      
      // Validate inputs
      if (!displayName.trim()) {
        showSnackbar(t('editProfile.displayNameEmpty'), 'error', 4000);
        return;
      }
      
      if (!email.trim()) {
        showSnackbar(t('editProfile.emailEmpty'), 'error', 4000);
        return;
      }
      
      // Check if anything changed
      if (displayName === user.displayName && email === user.email) {
        showSnackbar(t('editProfile.noChangesToSave'), 'info', 3000);
        return;
      }
      
      // Update profile
      const updates: { displayName?: string; email?: string } = {};
      
      if (displayName !== user.displayName) {
        updates.displayName = displayName.trim();
      }
      
      if (email !== user.email) {
        updates.email = email.trim();
      }
      
      await onUpdateProfile(updates);
      
      showSnackbar(t('editProfile.profileUpdatedSuccessfully'), 'success', 4000);
      
      // If email was changed, show additional info
      if (updates.email) {
        setTimeout(() => {
          showSnackbar(t('editProfile.checkEmailVerification'), 'info', 6000);
        }, 4500);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(
        error instanceof Error ? error.message : t('editProfile.failedToUpdateProfile'),
        'error',
        5000
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setIsUpdatingPassword(true);
      
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        showSnackbar(t('editProfile.pleaseFillAllPasswordFields'), 'error', 4000);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showSnackbar(t('editProfile.passwordsDoNotMatch'), 'error', 4000);
        return;
      }
      
      if (newPassword.length < 8) {
        showSnackbar(t('editProfile.passwordMinLength'), 'error', 4000);
        return;
      }
      
      if (currentPassword === newPassword) {
        showSnackbar(t('editProfile.passwordMustBeDifferent'), 'error', 4000);
        return;
      }
      
      await onUpdatePassword(currentPassword, newPassword);
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      showSnackbar(t('editProfile.passwordUpdatedSuccessfully'), 'success', 4000);
    } catch (error) {
      console.error('Error updating password:', error);
      showSnackbar(
        error instanceof Error ? error.message : t('editProfile.failedToUpdatePassword'),
        'error',
        5000
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <WebLayout
      title={t('editProfile.editProfile')}
      subtitle={t('editProfile.updateAccountInformation')}
      sidebar={<UserSidebar activePage="settings" />}
      header={
        <ThemedView style={{ paddingHorizontal: 0, paddingTop: 40, paddingBottom: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </TouchableOpacity>
            <ThemedText type="title">{t('editProfile.editProfile')}</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ScrollView style={{ flex: 1 }}>
        {/* Profile Information Section */}
        <ThemedView style={{ marginBottom: 32 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.profileInformation')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 24,
            gap: 20 
          }}>
            {/* Avatar Section */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: accentColor,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12
              }}>
                {user.photoURL ? (
                  <Ionicons name="person" size={48} color="#FFFFFF" />
                ) : (
                  <ThemedText style={{ fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' }}>
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
              <TouchableOpacity 
                style={{
                  backgroundColor: cardBg,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: borderColor
                }}
              >
                <ThemedText style={{ color: accentColor, fontWeight: '600' }}>
                  {t('editProfile.changePhoto')}
                </ThemedText>
              </TouchableOpacity>
            </View>
            
            {/* Display Name Input */}
            <View>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8,
                color: textSecondary 
              }}>
                {t('editProfile.displayName')}
              </ThemedText>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('editProfile.enterDisplayName')}
                placeholderTextColor={textSecondary}
                style={{
                  backgroundColor: backgroundColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: textColor
                }}
              />
            </View>

            {/* Email Input */}
            <View>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8,
                color: textSecondary 
              }}>
                {t('editProfile.emailAddress')}
              </ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('editProfile.enterEmail')}
                placeholderTextColor={textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  backgroundColor: backgroundColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: textColor
                }}
              />
              <ThemedText style={{ 
                fontSize: 12, 
                marginTop: 4,
                color: textSecondary 
              }}>
                {t('editProfile.emailVerificationNotice')}
              </ThemedText>
            </View>

            {/* Save Profile Button */}
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={isUpdatingProfile}
              style={{
                backgroundColor: accentColor,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 8,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: isUpdatingProfile ? 0.6 : 1
              }}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              )}
              <ThemedText style={{ 
                color: '#FFFFFF', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                {isUpdatingProfile ? t('editProfile.saving') : t('editProfile.saveProfile')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        {/* Password Section */}
        <ThemedView style={{ marginBottom: 32 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.changePassword')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 24,
            gap: 20 
          }}>
            {/* Current Password Input */}
            <View>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8,
                color: textSecondary 
              }}>
                {t('editProfile.currentPassword')}
              </ThemedText>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('editProfile.enterCurrentPassword')}
                placeholderTextColor={textSecondary}
                secureTextEntry
                autoCapitalize="none"
                style={{
                  backgroundColor: backgroundColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: textColor
                }}
              />
            </View>

            {/* New Password Input */}
            <View>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8,
                color: textSecondary 
              }}>
                {t('editProfile.newPassword')}
              </ThemedText>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('editProfile.enterNewPassword')}
                placeholderTextColor={textSecondary}
                secureTextEntry
                autoCapitalize="none"
                style={{
                  backgroundColor: backgroundColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: textColor
                }}
              />
            </View>

            {/* Confirm Password Input */}
            <View>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 8,
                color: textSecondary 
              }}>
                {t('editProfile.confirmNewPassword')}
              </ThemedText>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('editProfile.confirmPasswordPlaceholder')}
                placeholderTextColor={textSecondary}
                secureTextEntry
                autoCapitalize="none"
                style={{
                  backgroundColor: backgroundColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: textColor
                }}
              />
              <ThemedText style={{ 
                fontSize: 12, 
                marginTop: 4,
                color: textSecondary 
              }}>
                {t('editProfile.passwordRequirement')}
              </ThemedText>
            </View>

            {/* Update Password Button */}
            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={isUpdatingPassword}
              style={{
                backgroundColor: accentColor,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 8,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: isUpdatingPassword ? 0.6 : 1
              }}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="key" size={20} color="#FFFFFF" />
              )}
              <ThemedText style={{ 
                color: '#FFFFFF', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                {isUpdatingPassword ? t('editProfile.updating') : t('editProfile.updatePassword')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        {/* Account Info */}
        <ThemedView style={{ marginBottom: 32 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.accountInformation')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 24,
            gap: 16 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary }}>{t('editProfile.accountId')}</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>{user.id.slice(0, 8)}...</ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary }}>{t('editProfile.memberSince')}</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>
                {formatDate(user.createdAt)}
              </ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary }}>{t('editProfile.lastLogin')}</ThemedText>
              <ThemedText style={{ fontWeight: '600' }}>
                {formatDate(user.lastLoginAt)}
              </ThemedText>
            </View>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </WebLayout>
  );
}

