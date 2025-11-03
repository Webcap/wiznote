/**
 * Request Account Unlock Page
 * 
 * Allows users to request an account unlock via email.
 */

import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { router } from 'expo-router';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { validateEmail } from '../schemas/AuthSchema';
import { sanitizeEmail } from '../utils/sanitization';
import { WebLayout } from '../components/web/WebLayout';
import { useTranslation } from '../hooks/useTranslation';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wiznote.app';

export default function RequestUnlockScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');

  const handleRequestUnlock = async () => {
    try {
      // Validate email
      const sanitizedEmail = sanitizeEmail(email);
      const validation = validateEmail(sanitizedEmail);

      if (!validation.success) {
        Alert.alert(t('common.error'), t('auth.pleaseEnterValidEmail'));
        return;
      }

      setIsLoading(true);

      // Call Netlify function
      const response = await fetch(`${API_URL}/.netlify/functions/unlock-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: sanitizedEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
      } else {
        Alert.alert(
          t('unlock.requestFailed'),
          data.message || data.error || t('unlock.failedToSendUnlockEmail')
        );
      }
    } catch (error) {
      console.error('Error requesting unlock:', error);
      Alert.alert(
        t('common.error'),
        t('unlock.errorRequestingUnlock')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.replace('/(auth)/signin');
  };

  const content = (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {!isSuccess ? (
          <>
            <View style={[styles.iconContainer, { backgroundColor: backgroundSecondary }]}>
              <Ionicons name="lock-closed" size={48} color={accentPrimary} />
            </View>
            <ThemedText style={[styles.title, { color: textColor }]}>
              {t('unlock.requestAccountUnlock')}
            </ThemedText>
            <ThemedText style={[styles.description, { color: textSecondaryColor }]}>
              {t('unlock.requestUnlockDescription')}
            </ThemedText>

            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>
                {t('auth.emailAddress')}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: backgroundSecondary,
                    color: textColor,
                    borderColor: borderColor,
                  },
                ]}
                placeholder={t('auth.enterYourEmail')}
                placeholderTextColor={textSecondaryColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: accentPrimary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleRequestUnlock}
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <LoadingSpinner size={20} color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.buttonText}>{t('unlock.sendUnlockLink')}</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: textSecondaryColor }]}>
                {t('auth.backToLogin')}
              </ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="mail" size={48} color="#10B981" />
            </View>
            <ThemedText style={[styles.title, { color: textColor }]}>
              {t('auth.checkYourEmail')}
            </ThemedText>
            <ThemedText style={[styles.description, { color: textSecondaryColor }]}>
              {t('unlock.unlockEmailSent', { email })}
            </ThemedText>
            <ThemedText style={[styles.note, { color: textSecondaryColor }]}>
              {t('unlock.unlockEmailNote')}
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accentPrimary }]}
              onPress={handleSignIn}
            >
              <ThemedText style={styles.buttonText}>{t('auth.backToLogin')}</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout title={t('unlock.requestAccountUnlock')} subtitle={t('unlock.accountRecovery')}>
        {content}
      </WebLayout>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    gap: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

