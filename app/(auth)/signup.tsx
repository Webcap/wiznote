import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';

export default function SignupScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle();

  const validateForm = () => {
    if (!email.trim()) {
      const message = t('signup.pleaseEnterEmailAddress');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    if (!email.includes('@')) {
      const message = t('signup.pleaseEnterValidEmailAddress');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    if (!password) {
      const message = t('signup.pleaseEnterPassword');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    if (password.length < 8) {
      const message = t('signup.passwordMinLength');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      const message = t('signup.passwordRequiresLetterAndNumber');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      const message = t('signup.passwordRequiresSpecialCharacter');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    if (password !== confirmPassword) {
      const message = t('signup.passwordsDoNotMatch');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('SignupScreen: Starting sign up process...');
      const user = await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      
      console.log('SignupScreen: Sign up successful, user:', user);
      
      // Show success message on web
      if (Platform.OS === 'web') {
        showSnackbar(t('signup.accountCreatedSuccessfully'), 'success', 3000);
      }
      
      console.log('SignupScreen: Navigating to tabs...');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('SignupScreen: Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : t('signup.failedToCreateAccount');
      
      // Check if this is the email verification required message
      if (errorMessage.includes('Please check your email to verify your account') || 
          errorMessage.includes('verify your account before signing in')) {
        // This is expected when email verification is enabled
        console.log('SignupScreen: Email verification required - redirecting to verify-email screen');
        
        // Redirect to verify-email screen with email parameter
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim() }
        } as any);
        
      } else {
        // This is an actual error
        if (Platform.OS === 'web') {
          showSnackbar(errorMessage, 'error', 6000);
        } else {
          Alert.alert(t('signup.error'), errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
      if (Platform.OS === 'web') {
        showSnackbar(t('signup.accountCreatedSuccessfully'), 'success', 3000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('signup.failedToCreateAccount');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 6000);
      } else {
        Alert.alert(t('signup.error'), message);
      }
    }
  };

  // Keyboard shortcuts for web
  useKeyboardShortcuts([
    {
      key: 'Enter',
      action: handleSignUp,
      description: t('signup.createAccountShortcut'),
    },
    {
      key: 'Escape',
      action: () => router.back(),
      description: t('signup.goBackShortcut'),
    },
  ]);

  const iconColor = useThemeColor({}, 'text');
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
      <ThemedView style={[styles.webContainer, { backgroundColor }]}>
        <View style={styles.webContent}>
          {/* Left Panel - Branding */}
          <View style={[styles.webLeftPanel, { backgroundColor: cardBg }]}>
            <View style={styles.webBrandSection}>
              <View style={[styles.webLogoContainer, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="document-text" size={48} color={accentColor} />
              </View>
              <ThemedText style={[styles.webBrandTitle, { color: textColor }]}>WizNote</ThemedText>
              <ThemedText style={[styles.webBrandSubtitle, { color: textSecondaryColor }]}>
                Your personal note-taking companion
              </ThemedText>
            </View>
            
            <View style={styles.webFeaturesSection}>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Free forever plan available
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  No credit card required
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Start organizing immediately
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Cancel anytime
                </ThemedText>
              </View>
            </View>

            <View style={styles.webBenefitsSection}>
              <ThemedText style={[styles.webBenefitsTitle, { color: textColor }]}>What you&apos;ll get:</ThemedText>
              <View style={styles.webBenefitItem}>
                <Ionicons name="infinite" size={16} color={accentColor} />
                <ThemedText style={[styles.webBenefitText, { color: textSecondaryColor }]}>Unlimited notes</ThemedText>
              </View>
              <View style={styles.webBenefitItem}>
                <Ionicons name="cloud" size={16} color={accentColor} />
                <ThemedText style={[styles.webBenefitText, { color: textSecondaryColor }]}>Cloud sync</ThemedText>
              </View>
              <View style={styles.webBenefitItem}>
                <Ionicons name="mic" size={16} color={accentColor} />
                <ThemedText style={[styles.webBenefitText, { color: textSecondaryColor }]}>Voice transcription</ThemedText>
              </View>
              <View style={styles.webBenefitItem}>
                <Ionicons name="sparkles" size={16} color={accentColor} />
                <ThemedText style={[styles.webBenefitText, { color: textSecondaryColor }]}>AI-powered insights</ThemedText>
              </View>
            </View>
          </View>

          {/* Right Panel - Sign Up Form */}
          <View style={styles.webRightPanel}>
            <View style={styles.webFormContainer}>
              <View style={styles.webFormHeader}>
                <ThemedText style={[styles.webFormTitle, { color: textColor }]}>{t('signup.createAccount')}</ThemedText>
                <ThemedText style={[styles.webFormSubtitle, { color: textSecondaryColor }]}>
                  {t('signup.createAccountDesc')}
                </ThemedText>
              </View>

              <View style={styles.webForm}>
                {/* Display Name Input */}
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('signup.displayName')}</ThemedText>
                  <TextInput
                    style={[styles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
                    placeholder={t('signup.enterYourName')}
                    placeholderTextColor={borderColor}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                {/* Email Input */}
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('signup.emailAddress')}</ThemedText>
                  <TextInput
                    style={[styles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
                    placeholder={t('signup.enterYourEmail')}
                    placeholderTextColor={borderColor}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('signup.password')}</ThemedText>
                  <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }] }>
                    <TextInput
                      style={[styles.webPasswordInput, { color: inputText }]}
                      placeholder={t('signup.enterYourPassword')}
                      placeholderTextColor={borderColor}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.webEyeButton}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={borderColor}
                      />
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={[styles.webPasswordHint, { color: textSecondaryColor }]}>
                    {t('signup.passwordRequirement')}
                  </ThemedText>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('signup.confirmPassword')}</ThemedText>
                  <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }] }>
                    <TextInput
                      style={[styles.webPasswordInput, { color: inputText }]}
                      placeholder={t('signup.confirmYourPassword')}
                      placeholderTextColor={borderColor}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.webEyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={borderColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[styles.webSignupButton, { backgroundColor: accentColor }, isLoading && styles.webSignupButtonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={styles.webLoadingContainer}>
                      <LoadingSpinner size={20} color="#FFFFFF" />
                      <ThemedText style={styles.webSignupButtonText}>{t('signup.creatingAccount')}</ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={styles.webSignupButtonText}>{t('signup.createAccount')}</ThemedText>
                  )}
                </TouchableOpacity>

                {/* Or Divider */}
                <View style={{ height: 12 }} />

                {/* Google Sign Up (Brand-compliant) */}
                <TouchableOpacity
                  style={[
                    styles.webSignupButton,
                    { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775', paddingLeft: 12, paddingRight: 12 },
                    isLoading && styles.webSignupButtonDisabled
                  ]}
                  onPress={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                      style={{ width: 18, height: 18, marginRight: 10 }}
                      resizeMode="contain"
                    />
                    <ThemedText style={[styles.webSignupButtonText, { color: '#1F1F1F', fontWeight: '500' }]}>
                      {t('auth.signUpWithGoogle')}
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                {/* Sign In Link */}
                <View style={styles.webSigninContainer}>
                  <ThemedText style={[styles.webSigninText, { color: textSecondaryColor }]}>
                    {t('auth.alreadyHaveAccount')}{' '}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                    <ThemedText style={[styles.webSigninLink, { color: accentColor }]}>
                      {t('auth.login')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms and Privacy */}
              <View style={styles.webTermsContainer}>
                <ThemedText style={[styles.webTermsText, { color: textSecondaryColor }]}>
                  {t('signup.byCreatingAccountAgree')}{' '}
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                  <ThemedText style={[styles.webTermsLink, { color: accentColor }]}>{t('signup.termsOfService')}</ThemedText>
                </TouchableOpacity>
                <ThemedText style={[styles.webTermsText, { color: textSecondaryColor }]}> {t('auth.and')} </ThemedText>
                <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                  <ThemedText style={[styles.webTermsLink, { color: accentColor }]}>{t('signup.privacyPolicy')}</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Keyboard Shortcuts */}
              <View style={[styles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                <ThemedText style={[styles.webShortcutsTitle, { color: textSecondaryColor }]}>{t('auth.keyboardShortcuts')}</ThemedText>
                <View style={styles.webShortcutsList}>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.enter')}</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>{t('signup.createAccountShortcut')}</ThemedText>
                  </View>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.esc')}</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>{t('signup.goBackShortcut')}</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  // Mobile layout (existing code)
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: textColor }]}>{t('signup.createAccount')}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              {t('signup.createAccountDesc')}
            </ThemedText>
          </View>
          <View style={styles.form}>
            {/* Display Name Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>{t('signup.displayName')}</ThemedText>
              <TextInput
                style={[styles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                placeholder={t('signup.enterYourName')}
                placeholderTextColor={borderColor}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>{t('signup.emailAddress')}</ThemedText>
              <TextInput
                style={[styles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                placeholder={t('signup.enterYourEmail')}
                placeholderTextColor={borderColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>{t('signup.password')}</ThemedText>
              <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }] }>
                <TextInput
                  style={[styles.passwordInput, { color: inputText }]}
                  placeholder={t('signup.enterYourPassword')}
                  placeholderTextColor={borderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={borderColor}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>{t('signup.confirmPassword')}</ThemedText>
              <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }] }>
                <TextInput
                  style={[styles.passwordInput, { color: inputText }]}
                  placeholder={t('signup.confirmYourPassword')}
                  placeholderTextColor={borderColor}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={borderColor}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signupButton, { backgroundColor: accentColor }, isLoading && styles.signupButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner size={20} color={inputText} />
                  <ThemedText style={styles.signupButtonText}>{t('signup.creatingAccount')}</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.signupButtonText}>{t('signup.createAccount')}</ThemedText>
              )}
            </TouchableOpacity>

            {/* Google Sign Up (Brand-compliant) */}
            <TouchableOpacity
              style={[
                styles.signupButton,
                { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775', paddingLeft: 12, paddingRight: 12 },
                isLoading && styles.signupButtonDisabled
              ]}
              onPress={handleGoogleSignUp}
              disabled={isLoading}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={{ width: 18, height: 18, marginRight: 10 }}
                  resizeMode="contain"
                />
                <ThemedText style={[styles.signupButtonText, { color: '#1F1F1F', fontWeight: '500' }]}>
                  {t('auth.signUpWithGoogle')}
                </ThemedText>
              </View>
            </TouchableOpacity>
            {/* Sign In Link */}
            <View style={styles.signinContainer}>
              <ThemedText style={[styles.signinText, { color: textSecondaryColor }]}>
                {t('auth.alreadyHaveAccount')}{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                <ThemedText style={[styles.signinLink, { color: accentColor }]}>
                  {t('auth.login')}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Terms and Privacy Links */}
            <View style={styles.privacyContainer}>
              <ThemedText style={[styles.privacyText, { color: textSecondaryColor }]}>
                {t('signup.byCreatingAccountAgree')}{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                <ThemedText style={[styles.privacyLink, { color: accentColor }]}>
                  {t('signup.termsOfService')}
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={[styles.privacyText, { color: textSecondaryColor }]}> {t('auth.and')} </ThemedText>
              <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                <ThemedText style={[styles.privacyLink, { color: accentColor }]}>
                  {t('signup.privacyPolicy')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
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
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  signupButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: 16,
  },
  signinLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  privacyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  privacyLink: {
    fontSize: 12,
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
    marginBottom: 40,
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
    marginBottom: 40,
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
  webBenefitsSection: {
    width: '100%',
    maxWidth: 400,
  },
  webBenefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  webBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  webBenefitText: {
    fontSize: 14,
    marginLeft: 8,
  },
  webRightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    paddingTop: 80,
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
    marginBottom: 32,
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
  webPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 56,
  },
  webPasswordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  webEyeButton: {
    paddingHorizontal: 16,
  },
  webPasswordHint: {
    fontSize: 12,
    marginTop: 4,
  },
  webSignupButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webSignupButtonDisabled: {
    opacity: 0.6,
  },
  webSignupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webSigninContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSigninText: {
    fontSize: 16,
  },
  webSigninLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  webTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  webTermsText: {
    fontSize: 12,
  },
  webTermsLink: {
    fontSize: 12,
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