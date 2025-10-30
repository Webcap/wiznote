import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Logo } from '../components/Logo';
import { useSnackbar } from '../contexts/SnackbarContext';
import { betterAuthService } from '../services/BetterAuthService';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePageTitle } from '../hooks/usePageTitle';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle({ title: `${t('auth.forgotPassword')} - WizNote` });

  const validateForm = () => {
    if (!email.trim()) {
      const message = t('auth.pleaseEnterEmail');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (!email.includes('@')) {
      const message = t('auth.pleaseEnterValidEmail');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await betterAuthService.resetPassword(email.trim());
      
      setEmailSent(true);
      
      // Show success message
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.passwordResetEmailSentAlert'), 'success', 5000);
      } else {
        Alert.alert(t('auth.emailSent'), t('auth.passwordResetEmailSentAlert'));
      }
      
    } catch (error) {
      // Parse error message and provide user-friendly feedback
      let errorMessage = t('auth.failedToSendPasswordResetEmail');
      let errorDuration = 6000;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many requests')) {
          errorMessage = t('auth.tooManyPasswordResetAttempts');
          errorDuration = 8000;
        }
        // Network errors
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = t('auth.networkErrorPasswordReset');
          errorDuration = 6000;
        }
        // User not found
        else if (message.includes('user not found') || message.includes('no user found')) {
          errorMessage = t('auth.noAccountFoundWithEmail');
          errorDuration = 6000;
        }
        // Generic error with message
        else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      console.log('Password reset error - showing snackbar:', errorMessage);
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', errorDuration);
      } else {
        Alert.alert(t('auth.forgotPasswordError'), errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  // Keyboard shortcuts for web
  useKeyboardShortcuts([
    {
      key: 'Enter',
      action: handleResetPassword,
      description: t('auth.sendResetEmailShortcut'),
    },
    {
      key: 'Escape',
      action: handleBackToLogin,
      description: t('auth.goBack'),
    },
  ]);

  const inputBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const inputText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'backgroundTertiary');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const cardBg = useThemeColor({}, 'backgroundSecondary');

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={[styles.webContainer, { backgroundColor }]}>
        <View style={styles.webContent}>
          {/* Left Panel - Branding */}
          <View style={[styles.webLeftPanel, { backgroundColor: cardBg }]}>
            <View style={styles.webBrandSection}>
              <View style={styles.webLogoContainer}>
                <Logo size={80} />
              </View>
              <ThemedText style={[styles.webBrandTitle, { color: textColor }]}>WizNote</ThemedText>
              <ThemedText style={[styles.webBrandSubtitle, { color: textSecondaryColor }]}>
                {t('auth.resetYourPassword')}
              </ThemedText>
            </View>
            
            <View style={styles.webFeaturesSection}>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  {t('auth.securePasswordReset')}
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  {t('auth.emailVerificationRequired')}
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  {t('auth.quickAndEasyProcess')}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Right Panel - Reset Form */}
          <View style={styles.webRightPanel}>
            <View style={styles.webFormContainer}>
              <View style={styles.webFormHeader}>
                <ThemedText style={[styles.webFormTitle, { color: textColor }]}>
                  {emailSent ? t('auth.checkYourEmail') : t('auth.forgotPassword')}
                </ThemedText>
                <ThemedText style={[styles.webFormSubtitle, { color: textSecondaryColor }]}>
                  {emailSent 
                    ? t('auth.passwordResetEmailSent')
                    : t('auth.enterEmailForResetLink')
                  }
                </ThemedText>
              </View>

              {!emailSent ? (
                <View style={styles.webForm}>
                  {/* Email Input */}
                  <View style={styles.webInputContainer}>
                    <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('auth.emailAddress')}</ThemedText>
                    <TextInput
                      style={[styles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
                      placeholder={t('auth.enterYourEmail')}
                      placeholderTextColor={borderColor}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>

                  {/* Reset Password Button */}
                  <TouchableOpacity
                    style={[styles.webResetButton, { backgroundColor: accentColor }, isLoading && styles.webResetButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.webResetButtonText}>
                      {isLoading ? t('auth.sending') : t('auth.sendResetEmail')}
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Back to Login Link */}
                  <View style={styles.webBackContainer}>
                    <ThemedText style={[styles.webBackText, { color: textSecondaryColor }]}>
                      {t('auth.rememberYourPassword')}{' '}
                    </ThemedText>
                    <TouchableOpacity onPress={handleBackToLogin}>
                      <ThemedText style={[styles.webBackLink, { color: accentColor }]}>
                        {t('auth.backToLogin')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.webSuccessContainer}>
                  <View style={styles.webSuccessIcon}>
                    <Ionicons name="mail" size={48} color={accentColor} />
                  </View>
                  <ThemedText style={[styles.webSuccessTitle, { color: textColor }]}>
                    {t('auth.emailSentSuccessfully')}
                  </ThemedText>
                  <ThemedText style={[styles.webSuccessSubtitle, { color: textSecondaryColor }]}>
                    {t('auth.passwordResetLinkSentTo')}
                  </ThemedText>
                  <ThemedText style={[styles.webSuccessEmail, { color: accentColor }]}>
                    {email}
                  </ThemedText>
                  
                  <TouchableOpacity
                    style={[styles.webResendButton, { backgroundColor: accentColor }]}
                    onPress={() => {
                      setEmailSent(false);
                      handleResetPassword();
                    }}
                  >
                    <ThemedText style={styles.webResendButtonText}>
                      {t('auth.resendEmail')}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.webBackToLoginButton}
                    onPress={handleBackToLogin}
                  >
                    <ThemedText style={[styles.webBackToLoginText, { color: accentColor }]}>
                      {t('auth.backToLogin')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Keyboard Shortcuts */}
              <View style={[styles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                <ThemedText style={[styles.webShortcutsTitle, { color: textSecondaryColor }]}>{t('auth.keyboardShortcuts')}</ThemedText>
                <View style={styles.webShortcutsList}>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.enter')}</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>{t('auth.sendResetEmailShortcut')}</ThemedText>
                  </View>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.esc')}</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>{t('auth.goBack')}</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ThemedView>
      </>
    );
  }

  // Mobile layout
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: cardBg }]}>
              <Logo size={100} />
            </View>
            <ThemedText style={[styles.title, { color: textColor }]}>
              {emailSent ? t('auth.checkYourEmail') : t('auth.forgotPassword')}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              {emailSent 
                ? t('auth.passwordResetEmailSentShort')
                : t('auth.enterEmailToReceiveResetLink')
              }
            </ThemedText>
          </View>

          {!emailSent ? (
            /* Form Card */
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="mail" size={18} color={accentColor} />
                    <ThemedText style={[styles.label, { color: textColor }]}>{t('auth.emailAddress')}</ThemedText>
                  </View>
                  <TextInput
                    style={[styles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                    placeholder={t('auth.enterYourEmail')}
                    placeholderTextColor={textSecondaryColor}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Reset Password Button */}
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: accentColor }, isLoading && styles.resetButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.resetButtonText}>
                    {isLoading ? t('auth.sending') : t('auth.sendResetEmail')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Success Card */
            <View style={[styles.successCard, { backgroundColor: cardBg }]}>
              <View style={styles.successContent}>
                <View style={styles.successIcon}>
                  <Ionicons name="mail" size={48} color={accentColor} />
                </View>
                <ThemedText style={[styles.successTitle, { color: textColor }]}>
                  {t('auth.emailSentSuccessfully')}
                </ThemedText>
                <ThemedText style={[styles.successSubtitle, { color: textSecondaryColor }]}>
                  {t('auth.passwordResetLinkSentTo')}
                </ThemedText>
                <ThemedText style={[styles.successEmail, { color: accentColor }]}>
                  {email}
                </ThemedText>
                
                <TouchableOpacity
                  style={[styles.resendButton, { backgroundColor: accentColor }]}
                  onPress={() => {
                    setEmailSent(false);
                    handleResetPassword();
                  }}
                >
                  <ThemedText style={styles.resendButtonText}>
                    {t('auth.resendEmail')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Back to Login Link */}
          <View style={styles.backContainer}>
            <ThemedText style={[styles.backText, { color: textSecondaryColor }]}>
              {t('auth.rememberYourPassword')}{' '}
            </ThemedText>
            <TouchableOpacity onPress={handleBackToLogin}>
              <ThemedText style={[styles.backLink, { color: accentColor }]}>
                {t('auth.backToLogin')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  resetButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  successEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  resendButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backText: {
    fontSize: 16,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Web specific styles
  webContainer: {
    flex: 1,
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  webLeftPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  webBrandSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  webLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webBrandTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  webBrandSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  webFeaturesSection: {
    width: '100%',
    maxWidth: 400,
  },
  webFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  webFeatureText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  webRightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  webFormContainer: {
    width: '100%',
    maxWidth: 400,
  },
  webFormHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  webFormTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webFormSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  webForm: {
    marginBottom: 40,
  },
  webInputContainer: {
    marginBottom: 24,
  },
  webLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  webResetButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webResetButtonDisabled: {
    opacity: 0.6,
  },
  webResetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webBackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webBackText: {
    fontSize: 16,
  },
  webBackLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  webSuccessContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  webSuccessIcon: {
    marginBottom: 16,
  },
  webSuccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  webSuccessSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  webSuccessEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  webResendButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  webResendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webBackToLoginButton: {
    paddingVertical: 8,
  },
  webBackToLoginText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webShortcutsContainer: {
    borderTopWidth: 1,
    paddingTop: 24,
  },
  webShortcutsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  webShortcutsList: {
    gap: 8,
  },
  webShortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webShortcutKey: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'center',
  },
  webShortcutText: {
    fontSize: 12,
  },
});
