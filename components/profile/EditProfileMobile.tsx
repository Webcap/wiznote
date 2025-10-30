import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { User } from '../../types/User';
import { useTranslation } from '../../hooks/useTranslation';

interface EditProfileMobileProps {
  user: User;
  onUpdateProfile: (updates: { displayName?: string; email?: string }) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  showMessage: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function EditProfileMobile({ 
  user, 
  onUpdateProfile, 
  onUpdatePassword,
  showMessage 
}: EditProfileMobileProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
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
        showMessage(t('editProfile.displayNameEmpty'), 'error');
        return;
      }
      
      if (!email.trim()) {
        showMessage(t('editProfile.emailEmpty'), 'error');
        return;
      }
      
      // Check if anything changed
      if (displayName === user.displayName && email === user.email) {
        showMessage(t('editProfile.noChangesToSave'), 'info');
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
      
      showMessage(t('editProfile.profileUpdatedSuccessfully'), 'success');
      
      // If email was changed, show additional info
      if (updates.email) {
        setTimeout(() => {
          showMessage(t('editProfile.checkEmailVerification'), 'info');
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage(
        error instanceof Error ? error.message : t('editProfile.failedToUpdateProfile'),
        'error'
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
        showMessage(t('editProfile.pleaseFillAllPasswordFields'), 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showMessage(t('editProfile.passwordsDoNotMatch'), 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showMessage(t('editProfile.passwordMinLength'), 'error');
        return;
      }
      
      if (currentPassword === newPassword) {
        showMessage(t('editProfile.passwordMustBeDifferent'), 'error');
        return;
      }
      
      await onUpdatePassword(currentPassword, newPassword);
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      showMessage(t('editProfile.passwordUpdatedSuccessfully'), 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      showMessage(
        error instanceof Error ? error.message : t('editProfile.failedToUpdatePassword'),
        'error'
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor }}>
      {/* Header */}
      <ThemedView style={{ 
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: cardBg
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
          <ThemedText type="title">{t('editProfile.editProfile')}</ThemedText>
        </View>
      </ThemedView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Avatar Section */}
        <ThemedView style={{ alignItems: 'center', marginBottom: 32 }}>
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
        </ThemedView>

        {/* Profile Information Section */}
        <ThemedView style={{ marginBottom: 32 }}>
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.profileInformation')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 20,
            gap: 16 
          }}>
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
                marginTop: 8,
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
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.changePassword')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 20,
            gap: 16 
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
                marginTop: 8,
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
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            {t('editProfile.accountInformation')}
          </ThemedText>
          
          <ThemedView style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 20,
            gap: 12 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary, fontSize: 14 }}>{t('editProfile.accountId')}</ThemedText>
              <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{user.id.slice(0, 8)}...</ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary, fontSize: 14 }}>{t('editProfile.memberSince')}</ThemedText>
              <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                {formatDate(user.createdAt)}
              </ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ color: textSecondary, fontSize: 14 }}>{t('editProfile.lastLogin')}</ThemedText>
              <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                {formatDate(user.lastLoginAt)}
              </ThemedText>
            </View>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

