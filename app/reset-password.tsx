import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Linking,
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
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [windowWidth, setWindowWidth] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return Dimensions.get('window').width;
  });

  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle(`${t('auth.resetPassword')} - WizNote`);

  // Track window dimensions for responsive layout
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      
      // Add event listener
      window.addEventListener('resize', handleResize);
      
      // Set initial width
      setWindowWidth(window.innerWidth);
      
      // Cleanup
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Determine if we should use mobile layout on web
  const isMobileWeb = Platform.OS === 'web' && windowWidth < 768;

  // Debug logging for mobile detection
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('🔍 Reset Password - Mobile Detection:', {
        windowWidth,
        isMobileWeb,
        breakpoint: 768,
      });
    }
  }, [windowWidth, isMobileWeb]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log('🔄 Checking session for password reset...');
      
      // On web, check if we have a token in the URL hash (Supabase auth callback)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.log('📍 Current URL:', window.location.href);
        console.log('📍 Hash:', window.location.hash);
        console.log('📍 Search:', window.location.search);
        
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const errorCode = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        console.log('🔍 URL parameters:', {
          hasHash: window.location.hash.length > 0,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type: type,
          error: errorCode,
          errorDescription: errorDescription,
        });
        
        // Check for errors in the URL
        if (errorCode) {
          console.error('❌ Error in URL:', errorCode, errorDescription);
          if (Platform.OS === 'web') {
            showSnackbar(t('auth.resetLinkError', { error: errorDescription || errorCode }), 'error', 6000);
          }
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }
        
        // If we have tokens, manually set the session
        if (accessToken && refreshToken) {
          console.log('🔑 Tokens found - manually setting session...');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('❌ Error setting session:', error);
              throw error;
            }
            
            if (data.session) {
              console.log('✅ Session set successfully:', data.session.user.email);
              setIsValidSession(true);
              return;
            }
          } catch (sessionError) {
            console.error('❌ Failed to set session:', sessionError);
            if (Platform.OS === 'web') {
              showSnackbar(t('auth.failedToValidateResetLink'), 'error', 5000);
            }
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        } else if (accessToken && type === 'recovery') {
          console.log('✅ Password recovery token detected - waiting for Supabase to process...');
          await new Promise(resolve => setTimeout(resolve, 2500));
        } else if (accessToken) {
          console.log('✅ Access token detected (type:', type, ') - waiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('⏳ No token in URL, checking for existing session...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Check for user session (with multiple retries)
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔍 Session check attempt ${attempt}/3...`);
        const user = await betterAuthService.getCurrentUser();
        
        if (user) {
          console.log('✅ Valid session found for password reset:', user.email);
          setIsValidSession(true);
          return;
        }
        
        if (attempt < 3) {
          console.log('⏳ No session yet, waiting 1.5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      // After all retries, no valid session found
      console.log('❌ No valid session found after 3 attempts');
      console.log('💡 Possible causes:');
      console.log('   1. Link has expired (>24 hours old)');
      console.log('   2. Link was already used');
      console.log('   3. Supabase redirect URL not configured correctly');
      console.log('   4. EXPO_PUBLIC_WEB_URL not set to https://wiznote.app');
      console.log('💡 Check your .env file and Supabase dashboard settings!');
      
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.invalidOrExpiredResetLink'), 'error', 6000);
      } else {
        Alert.alert(t('auth.invalidResetLink'), t('auth.resetLinkInvalidOrExpired'));
      }
      setTimeout(() => router.replace('/(auth)/login'), 3000);
      
    } catch (error) {
      console.error('❌ Error checking session:', error);
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.errorValidatingResetLink'), 'error', 4000);
      } else {
        Alert.alert(t('common.error'), t('auth.failedToValidateResetLink'));
      }
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const validateForm = () => {
    if (!newPassword.trim()) {
      const message = t('auth.pleaseEnterNewPassword');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (newPassword.length < 6) {
      const message = t('auth.passwordMustBe6Characters');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (!confirmPassword.trim()) {
      const message = t('auth.pleaseConfirmNewPassword');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (newPassword !== confirmPassword) {
      const message = t('auth.passwordsDoNotMatch');
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
      await betterAuthService.updatePassword(newPassword);
      
      // Show success message
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.passwordUpdatedSuccessfully'), 'success', 3000);
      } else {
        Alert.alert(t('noteDetail.success'), t('auth.passwordUpdatedSuccess'), [
          { text: t('noteDetail.ok'), onPress: () => router.replace('/(auth)/login') }
        ]);
      }
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
      
    } catch (error) {
      // Parse error message and provide user-friendly feedback
      let errorMessage = t('auth.failedToUpdatePassword');
      let errorDuration = 6000;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Password too weak
        if (message.includes('password') && message.includes('weak')) {
          errorMessage = t('auth.passwordTooWeak');
          errorDuration = 6000;
        }
        // Session expired
        else if (message.includes('session') || message.includes('expired')) {
          errorMessage = t('auth.sessionExpired');
          errorDuration = 8000;
        }
        // Network errors
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = t('auth.networkErrorPasswordReset');
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
        Alert.alert(t('auth.passwordResetError'), errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  // Keyboard shortcuts for web
  useKeyboardShortcuts([
    {
      key: 'Enter',
      action: handleResetPassword,
      description: t('auth.updatePasswordShortcut'),
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

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor }]}>
        <View style={styles.loadingContent}>
          <Logo size={80} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            {t('auth.verifyingResetLink')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Show error if no valid session
  if (!isValidSession) {
    return (
      <ThemedView style={[styles.errorContainer, { backgroundColor }]}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <ThemedText style={[styles.errorTitle, { color: textColor }]}>
            {t('auth.invalidResetLink')}
          </ThemedText>
          <ThemedText style={[styles.errorSubtitle, { color: textSecondaryColor }]}>
            {t('auth.resetLinkInvalidOrExpired')}
          </ThemedText>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: accentColor }]}
            onPress={handleBackToLogin}
          >
            <ThemedText style={styles.errorButtonText}>
              {t('auth.backToLogin')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    // Mobile web layout
    if (isMobileWeb) {
      return (
        <>
          <Stack.Screen options={{ headerShown: false }} />
          <ThemedView style={[styles.webContainer, { backgroundColor }]}>
            <ScrollView 
              contentContainerStyle={styles.webMobileScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Mobile Header */}
              <View style={styles.webMobileHeader}>
                <View style={[styles.webMobileLogoContainer, { backgroundColor: cardBg }]}>
                  <Logo size={60} />
                </View>
                <ThemedText style={[styles.webMobileTitle, { color: textColor }]}>
                  {t('auth.resetPassword')}
                </ThemedText>
                <ThemedText style={[styles.webMobileSubtitle, { color: textSecondaryColor }]}>
                  {t('auth.enterNewPasswordBelow')}
                </ThemedText>
              </View>

              {/* Mobile Form Card */}
              <View style={[styles.webMobileFormCard, { backgroundColor: cardBg }]}>
                {/* New Password Input */}
                <View style={styles.webMobileInputContainer}>
                  <ThemedText style={[styles.webMobileLabel, { color: textColor }]}>
                    {t('auth.newPassword')}
                  </ThemedText>
                  <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.webPasswordInput, { color: inputText }]}
                      placeholder={t('auth.enterNewPassword')}
                      placeholderTextColor={textSecondaryColor}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.webEyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={textSecondaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.webMobileInputContainer}>
                  <ThemedText style={[styles.webMobileLabel, { color: textColor }]}>
                    {t('auth.confirmPassword')}
                  </ThemedText>
                  <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.webPasswordInput, { color: inputText }]}
                      placeholder={t('auth.confirmNewPassword')}
                      placeholderTextColor={textSecondaryColor}
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
                        color={textSecondaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Update Password Button */}
                <TouchableOpacity
                  style={[styles.webMobileUpdateButton, { backgroundColor: accentColor }, isLoading && styles.webUpdateButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.webUpdateButtonText}>
                    {isLoading ? t('auth.updating') : t('auth.updatePassword')}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Back to Login Link */}
              <View style={styles.webMobileBackContainer}>
                <ThemedText style={[styles.webBackText, { color: textSecondaryColor }]}>
                  {t('auth.rememberYourPassword')}{' '}
                </ThemedText>
                <TouchableOpacity onPress={handleBackToLogin}>
                  <ThemedText style={[styles.webBackLink, { color: accentColor }]}>
                    {t('auth.backToLogin')}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Security Features */}
              <View style={[styles.webMobileFeaturesCard, { backgroundColor: cardBg }]}>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#3CB371" />
                  <ThemedText style={[styles.webMobileFeatureText, { color: textSecondaryColor }]}>
                    {t('auth.securePasswordUpdate')}
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="key" size={16} color="#3CB371" />
                  <ThemedText style={[styles.webMobileFeatureText, { color: textSecondaryColor }]}>
                    {t('auth.minimum6Characters')}
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#3CB371" />
                  <ThemedText style={[styles.webMobileFeatureText, { color: textSecondaryColor }]}>
                    {t('auth.instantAccessAfterReset')}
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          </ThemedView>
        </>
      );
    }

    // Desktop web layout
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
                  {t('auth.setYourNewPassword')}
                </ThemedText>
              </View>
              
              <View style={styles.webFeaturesSection}>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    {t('auth.securePasswordUpdate')}
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    {t('auth.minimum6Characters')}
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    {t('auth.instantAccessAfterReset')}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Right Panel - Reset Form */}
            <View style={styles.webRightPanel}>
              <View style={styles.webFormContainer}>
                <View style={styles.webFormHeader}>
                  <ThemedText style={[styles.webFormTitle, { color: textColor }]}>
                    {t('auth.resetPassword')}
                  </ThemedText>
                  <ThemedText style={[styles.webFormSubtitle, { color: textSecondaryColor }]}>
                    {t('auth.enterNewPasswordBelow')}
                  </ThemedText>
                </View>

                <View style={styles.webForm}>
                  {/* New Password Input */}
                  <View style={styles.webInputContainer}>
                    <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('auth.newPassword')}</ThemedText>
                    <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                      <TextInput
                        style={[styles.webPasswordInput, { color: inputText }]}
                        placeholder={t('auth.enterNewPassword')}
                        placeholderTextColor={borderColor}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.webEyeButton}
                      >
                        <Ionicons
                          name={showNewPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={borderColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.webInputContainer}>
                    <ThemedText style={[styles.webLabel, { color: textColor }]}>{t('auth.confirmPassword')}</ThemedText>
                    <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                      <TextInput
                        style={[styles.webPasswordInput, { color: inputText }]}
                        placeholder={t('auth.confirmNewPassword')}
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

                  {/* Update Password Button */}
                  <TouchableOpacity
                    style={[styles.webUpdateButton, { backgroundColor: accentColor }, isLoading && styles.webUpdateButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.webUpdateButtonText}>
                      {isLoading ? t('auth.updating') : t('auth.updatePassword')}
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

                {/* Keyboard Shortcuts */}
                <View style={[styles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                  <ThemedText style={[styles.webShortcutsTitle, { color: textSecondaryColor }]}>{t('auth.keyboardShortcuts')}</ThemedText>
                  <View style={styles.webShortcutsList}>
                    <View style={styles.webShortcutItem}>
                      <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.enter')}</ThemedText>
                      <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>{t('auth.updatePasswordShortcut')}</ThemedText>
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
              <ThemedText style={[styles.title, { color: textColor }]}>{t('auth.resetPassword')}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
                {t('auth.enterNewPasswordBelow')}
              </ThemedText>
            </View>

            {/* Form Card */}
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <View style={styles.form}>
                {/* New Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="lock-closed" size={18} color={accentColor} />
                    <ThemedText style={[styles.label, { color: textColor }]}>{t('auth.newPassword')}</ThemedText>
                  </View>
                  <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: inputText }]}
                      placeholder={t('auth.enterNewPassword')}
                      placeholderTextColor={textSecondaryColor}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={textSecondaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="lock-closed" size={18} color={accentColor} />
                    <ThemedText style={[styles.label, { color: textColor }]}>{t('auth.confirmPassword')}</ThemedText>
                  </View>
                  <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: inputText }]}
                      placeholder={t('auth.confirmNewPassword')}
                      placeholderTextColor={textSecondaryColor}
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
                        color={textSecondaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Update Password Button */}
                <TouchableOpacity
                  style={[styles.updateButton, { backgroundColor: accentColor }, isLoading && styles.updateButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.updateButtonText}>
                    {isLoading ? t('auth.updating') : t('auth.updatePassword')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

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
    paddingTop: 60,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  updateButton: {
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
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 22,
  },
  errorButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  webUpdateButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webUpdateButtonDisabled: {
    opacity: 0.6,
  },
  webUpdateButtonText: {
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
  // Mobile Web styles
  webMobileScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  webMobileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  webMobileLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webMobileTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  webMobileSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  webMobileFormCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  webMobileInputContainer: {
    marginBottom: 20,
  },
  webMobileLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  webMobileUpdateButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webMobileBackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  webMobileFeaturesCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  webMobileFeatureText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});
