import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { loginStyles } from '../../styles/LoginStyles';
import { systemSettingsService } from '../../services/SystemSettingsService';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileWeb, setIsMobileWeb] = useState(false);
  const [googleSignInEnabled, setGoogleSignInEnabled] = useState(true); // Default to true for better UX
  const [settingsLoading, setSettingsLoading] = useState(true);

  const { signIn, signInWithGoogle } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { isFeatureEnabled, loading: featureFlagsLoading } = useFeatureFlags();

  // Set page title for web
  usePageTitle();

  // Load Google Sign-In settings (both feature flag and system setting)
  useEffect(() => {
    let isMounted = true;

    const loadGoogleSignInSettings = async () => {
      if (featureFlagsLoading) return;

      try {
        setSettingsLoading(true);
        const [settings, featureFlagEnabled] = await Promise.all([
          systemSettingsService.getSettings(),
          Promise.resolve(isFeatureEnabled('google_sign_in')),
        ]);

        if (!isMounted) {
          return;
        }

        const enabled = featureFlagEnabled && settings.googleSignInEnabled;
        setGoogleSignInEnabled(enabled);
      } catch (error) {
        console.error('Error loading Google Sign-In settings:', error);
        if (isMounted) {
          setGoogleSignInEnabled(false);
        }
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadGoogleSignInSettings();

    return () => {
      isMounted = false;
    };
  }, [featureFlagsLoading, isFeatureEnabled]);

  // Detect mobile web browsers
  useEffect(() => {
    if (Platform.OS === 'web') {
      const { width } = Dimensions.get('window');
      const isMobile = width <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileWeb(isMobile);
    }
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      const message = t('auth.pleaseEnterEmail');
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (!email.includes('@')) {
      const message = t('auth.pleaseEnterValidEmail');
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    if (!password) {
      const message = t('auth.pleaseEnterPassword');
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert(t('common.error'), message);
      }
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await signIn({
        email: email.trim(),
        password,
      });
      
      // Show success message on web
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.successfullySignedIn'), 'success', 3000);
      }
      
      router.replace('/(tabs)');
    } catch (error) {
      // Parse error message and provide user-friendly feedback
      let errorMessage = t('auth.failedToSignIn');
      let errorDuration = 6000;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Invalid credentials
        if (message.includes('invalid login credentials') || 
            message.includes('invalid email or password')) {
          errorMessage = t('auth.invalidEmailPassword');
          errorDuration = 7000;
        }
        // Email not confirmed
        else if (message.includes('email not confirmed')) {
          errorMessage = t('auth.verifyEmail');
          errorDuration = 8000;
        }
        // User not found
        else if (message.includes('user not found') || message.includes('no user found')) {
          errorMessage = t('auth.noAccountFound');
          errorDuration = 7000;
        }
        // Network errors
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = t('auth.networkError');
          errorDuration = 6000;
        }
        // Rate limiting
        else if (message.includes('rate limit') || message.includes('too many requests')) {
          errorMessage = t('auth.tooManyLoginAttempts');
          errorDuration = 8000;
        }
        // Generic error with message
        else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      console.log('Login error - showing snackbar:', errorMessage, 'Duration:', errorDuration);
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', errorDuration);
      } else {
        Alert.alert(t('auth.loginError'), errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Double-check both feature flag and system setting before proceeding
    if (!googleSignInEnabled) {
      // Re-check to provide specific error message
      try {
        const featureFlagEnabled = isFeatureEnabled('google_sign_in');
        const systemSettingEnabled = await systemSettingsService.isGoogleSignInEnabled();
        
        let message = t('auth.googleSignInDisabled');
        if (!featureFlagEnabled && !systemSettingEnabled) {
          message = 'Google Sign-In is disabled by feature flag and system settings';
        } else if (!featureFlagEnabled) {
          message = 'Google Sign-In is disabled by feature flag';
        } else if (!systemSettingEnabled) {
          message = t('auth.googleSignInDisabled'); // System setting message (already translated)
        }
        
        if (Platform.OS === 'web') {
          showSnackbar(message, 'error', 6000);
        } else {
          Alert.alert(t('common.error'), message);
        }
      } catch (error) {
        // Fallback to generic message
        const message = t('auth.googleSignInDisabled');
        if (Platform.OS === 'web') {
          showSnackbar(message, 'error', 6000);
        } else {
          Alert.alert(t('common.error'), message);
        }
      }
      return;
    }

    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (Platform.OS === 'web') {
        showSnackbar(t('auth.successfullySignedIn'), 'success', 3000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.failedToSignIn');
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 6000);
      } else {
        Alert.alert(t('auth.loginError'), message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts for web
  useKeyboardShortcuts([
    {
      key: 'Enter',
      action: handleLogin,
      description: t('auth.signIn'),
    },
    {
      key: 'Escape',
      action: () => router.back(),
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

  if (settingsLoading || featureFlagsLoading) {
    return (
      <ThemedView style={[loginStyles.loadingWrapper, { backgroundColor }]}>
        <LoadingSpinner size={40} />
        <ThemedText style={[loginStyles.loadingText, { color: textColor }]}>
          {t('auth.initializing')}
        </ThemedText>
      </ThemedView>
    );
  }

  // Web layout - Responsive design
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={[loginStyles.webContainer, { backgroundColor }]}>
        <ScrollView 
          contentContainerStyle={loginStyles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            loginStyles.webContent, 
            isMobileWeb && loginStyles.webContentMobile
          ]}>
            {/* Mobile Web Layout - Single Column */}
            {isMobileWeb ? (
              <View style={loginStyles.webMobileLayout}>
                {/* Header Section */}
                <View style={loginStyles.webMobileHeader}>
                  <View style={loginStyles.webMobileLogoContainer}>
                    <Image
                      source={require('../../assets/images/WiznoteLogoNov25.png')}
                      style={loginStyles.webMobileLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <ThemedText style={[loginStyles.webMobileTitle, { color: textColor }]}>WizNote</ThemedText>
                  <ThemedText style={[loginStyles.webMobileSubtitle, { color: textSecondaryColor }]}>
                    {t('auth.yourPersonalNoteTaking')}
                  </ThemedText>
                </View>

                {/* Form Section */}
                <View style={[loginStyles.webMobileFormCard, { backgroundColor: cardBg }]}>
                  <View style={loginStyles.webMobileFormHeader}>
                    <ThemedText style={[loginStyles.webMobileFormTitle, { color: textColor }]}>{t('auth.welcomeBack')}</ThemedText>
                    <ThemedText style={[loginStyles.webMobileFormSubtitle, { color: textSecondaryColor }]}>
                      {t('auth.signInToContinue')}
                    </ThemedText>
                  </View>

                  <View style={loginStyles.webMobileForm}>
                    {/* Email Input */}
                    <View style={loginStyles.webMobileInputContainer}>
                      <ThemedText style={[loginStyles.webMobileLabel, { color: textColor }]}>{t('auth.emailAddress')}</ThemedText>
                      <TextInput
                        style={[loginStyles.webMobileInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
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

                    {/* Password Input */}
                    <View style={loginStyles.webMobileInputContainer}>
                      <ThemedText style={[loginStyles.webMobileLabel, { color: textColor }]}>{t('auth.password')}</ThemedText>
                      <View style={[loginStyles.webMobilePasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                        <TextInput
                          style={[loginStyles.webMobilePasswordInput, { color: inputText }]}
                          placeholder={t('auth.enterYourPassword')}
                          placeholderTextColor={borderColor}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={loginStyles.webMobileEyeButton}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color={borderColor}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Forgot Password Link */}
                    <TouchableOpacity 
                      style={loginStyles.webMobileForgotPasswordContainer}
                      onPress={() => router.push('/forgot-password' as any)}
                    >
                      <ThemedText style={[loginStyles.webMobileForgotPasswordText, { color: accentColor }]}>
                        {t('auth.forgotPassword')}
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                      style={[loginStyles.webMobileLoginButton, { backgroundColor: accentColor }, isLoading && loginStyles.webMobileLoginButtonDisabled]}
                      onPress={handleLogin}
                      disabled={isLoading}
                    >
                      <ThemedText style={loginStyles.webMobileLoginButtonText}>
                        {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                      </ThemedText>
                    </TouchableOpacity>

                  {googleSignInEnabled && (
                    <>
                      {/* Or Divider */}
                      <View style={{ height: 12 }} />
                      
                      {/* Google Sign-In (Brand-compliant) */}
                      <TouchableOpacity
                        style={[
                          loginStyles.webMobileLoginButton,
                          { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775', paddingLeft: 12, paddingRight: 12 },
                          isLoading && loginStyles.webMobileLoginButtonDisabled
                        ]}
                        onPress={handleGoogleSignIn}
                        disabled={isLoading}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Image
                            source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                            style={{ width: 18, height: 18, marginRight: 10 }}
                            resizeMode="contain"
                          />
                          <ThemedText style={[loginStyles.webMobileLoginButtonText, { color: '#1F1F1F', fontWeight: '500' }]}>
                            {t('auth.signInWithGoogle')}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}

                    {/* Sign Up Link */}
                    <View style={loginStyles.webMobileSignupContainer}>
                      <ThemedText style={[loginStyles.webMobileSignupText, { color: textSecondaryColor }]}>
                        {t('auth.dontHaveAccountShort')}{' '}
                      </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                        <ThemedText style={[loginStyles.webMobileSignupLink, { color: accentColor }]}>
                          {t('auth.signup')}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Mobile Apps Promotion */}
                <View style={loginStyles.webMobileAppsSection}>
                  <View style={[loginStyles.webMobileAndroidPromotion, { backgroundColor: accentColor }]}>
                    <View style={loginStyles.webMobileAndroidContent}>
                      <View style={loginStyles.webMobileAndroidHeader}>
                        <Ionicons name="phone-portrait" size={20} color="#FFFFFF" />
                        <ThemedText style={loginStyles.webMobileAndroidTitle}>{t('auth.getAndroidApp')}</ThemedText>
                      </View>
                      <ThemedText style={loginStyles.webMobileAndroidSubtitle}>
                        {t('auth.takeNotesAnywhere')}
                      </ThemedText>
                      <TouchableOpacity 
                        style={loginStyles.webMobileAndroidButton}
                        onPress={() => {
                          window.open('https://play.google.com/store/apps/details?id=com.WizNote.app', '_blank');
                        }}
                      >
                        <Image 
                          source={require('../../assets/images/get-on-playstore.png')} 
                          style={loginStyles.webMobilePlayStoreBadge as any}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[loginStyles.webMobileApplePromotion, { backgroundColor: '#000000' }]}>
                    <View style={loginStyles.webMobileAppleContent}>
                      <View style={loginStyles.webMobileAppleHeader}>
                        <Ionicons name="phone-portrait" size={20} color="#FFFFFF" />
                        <ThemedText style={loginStyles.webMobileAppleTitle}>{t('auth.iosComingSoon')}</ThemedText>
                      </View>
                      <ThemedText style={loginStyles.webMobileAppleSubtitle}>
                        {t('auth.stayTunedRelease')}
                      </ThemedText>
                      <TouchableOpacity style={loginStyles.webMobileAppleBadge}>
                        <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
                        <ThemedText style={loginStyles.webMobileAppleBadgeText}>{t('auth.comingSoon')}</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Terms and Privacy Links */}
                <View style={loginStyles.webMobilePrivacyContainer}>
                  <ThemedText style={[loginStyles.webMobilePrivacyText, { color: textSecondaryColor }]}>
                    {t('auth.bySigningInAgree')}{' '}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                    <ThemedText style={[loginStyles.webMobilePrivacyLink, { color: accentColor }]}>
                      {t('auth.termsOfServiceShort')}
                    </ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={[loginStyles.webMobilePrivacyText, { color: textSecondaryColor }]}> {t('auth.and')} </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                    <ThemedText style={[loginStyles.webMobilePrivacyLink, { color: accentColor }]}>
                      {t('auth.privacyPolicyShort')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Desktop Layout - Two Column */
              <>
                {/* Left Panel - Branding */}
                <View style={[loginStyles.webLeftPanel, { backgroundColor: cardBg }]}>
                  <View style={loginStyles.webBrandSection}>
                    <View style={loginStyles.webLogoContainer}>
                      <Image
                        source={require('../../assets/images/WiznoteLogoNov25.png')}
                        style={loginStyles.webLogoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <ThemedText style={[loginStyles.webBrandTitle, { color: textColor }]}>WizNote</ThemedText>
                    <ThemedText style={[loginStyles.webBrandSubtitle, { color: textSecondaryColor }]}>
                      {t('auth.yourPersonalNoteTaking')}
                    </ThemedText>
                  </View>
                  
                  <View style={loginStyles.webFeaturesSection}>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        {t('auth.organizeThoughts')}
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        {t('auth.voiceToTextTranscription')}
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        {t('auth.crossPlatformSync')}
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        {t('auth.aiPoweredInsights')}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Mobile Apps Promotion Section */}
                  <View style={loginStyles.webDesktopAppsSection}>
                    {/* Android App Promotion */}
                    <View style={[loginStyles.webAndroidPromotion, { backgroundColor: accentColor }]}>
                      <View style={loginStyles.webAndroidContent}>
                        <View style={loginStyles.webAndroidHeader}>
                          <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                          <ThemedText style={loginStyles.webAndroidTitle}>{t('auth.getAndroidApp')}</ThemedText>
                        </View>
                        <ThemedText style={loginStyles.webAndroidSubtitle}>
                          {t('auth.takeNotesAnywhereWithApp')}
                        </ThemedText>
                        <TouchableOpacity 
                          style={loginStyles.webAndroidButton}
                          onPress={() => {
                            window.open('https://play.google.com/store/apps/details?id=com.WizNote.app', '_blank');
                          }}
                        >
                          <Image 
                            source={require('../../assets/images/get-on-playstore.png')} 
                            style={loginStyles.webPlayStoreBadge as any}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Apple App Store Coming Soon */}
                    <View style={[loginStyles.webApplePromotion, { backgroundColor: '#000000' }]}>
                      <View style={loginStyles.webAppleContent}>
                        <View style={loginStyles.webAppleHeader}>
                          <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                          <ThemedText style={loginStyles.webAppleTitle}>{t('auth.iosAppComingSoon')}</ThemedText>
                        </View>
                        <ThemedText style={loginStyles.webAppleSubtitle}>
                          {t('auth.stayTunedAppleStore')}
                        </ThemedText>
                        <TouchableOpacity style={loginStyles.webAppleBadge}>
                          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                          <ThemedText style={loginStyles.webAppleBadgeText}>{t('auth.comingSoon')}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Right Panel - Login Form */}
                <View style={loginStyles.webRightPanel}>
                  <View style={loginStyles.webFormContainer}>
                    <View style={loginStyles.webFormHeader}>
                      <ThemedText style={[loginStyles.webFormTitle, { color: textColor }]}>{t('auth.welcomeBack')}</ThemedText>
                      <ThemedText style={[loginStyles.webFormSubtitle, { color: textSecondaryColor }]}>
                        {t('auth.signInToContinue')}
                      </ThemedText>
                    </View>

                    <View style={loginStyles.webForm}>
                      {/* Email Input */}
                      <View style={loginStyles.webInputContainer}>
                        <ThemedText style={[loginStyles.webLabel, { color: textColor }]}>{t('auth.emailAddress')}</ThemedText>
                        <TextInput
                          style={[loginStyles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
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

                      {/* Password Input */}
                      <View style={loginStyles.webInputContainer}>
                        <ThemedText style={[loginStyles.webLabel, { color: textColor }]}>{t('auth.password')}</ThemedText>
                        <View style={[loginStyles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                          <TextInput
                            style={[loginStyles.webPasswordInput, { color: inputText }]}
                            placeholder={t('auth.enterYourPassword')}
                            placeholderTextColor={borderColor}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                          <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={loginStyles.webEyeButton}
                          >
                            <Ionicons
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={20}
                              color={borderColor}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Forgot Password Link */}
                      <TouchableOpacity 
                        style={loginStyles.webForgotPasswordContainer}
                        onPress={() => router.push('/forgot-password' as any)}
                      >
                        <ThemedText style={[loginStyles.webForgotPasswordText, { color: accentColor }]}>
                          {t('auth.forgotPassword')}
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Sign In Button */}
                      <TouchableOpacity
                        style={[loginStyles.webLoginButton, { backgroundColor: accentColor }, isLoading && loginStyles.webLoginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                      >
                        <ThemedText style={loginStyles.webLoginButtonText}>
                          {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                        </ThemedText>
                      </TouchableOpacity>

                      {googleSignInEnabled && (
                        <>
                          {/* Or Divider */}
                          <View style={{ height: 12 }} />

                          {/* Google Sign-In (Brand-compliant) */}
                          <TouchableOpacity
                            style={[
                              loginStyles.webLoginButton,
                              { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775', paddingLeft: 12, paddingRight: 12 },
                              isLoading && loginStyles.webLoginButtonDisabled
                            ]}
                            onPress={handleGoogleSignIn}
                            disabled={isLoading}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                              <Image
                                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                                style={{ width: 18, height: 18, marginRight: 10 }}
                                resizeMode="contain"
                              />
                              <ThemedText style={[loginStyles.webLoginButtonText, { color: '#1F1F1F', fontWeight: '500' }]}>
                                {t('auth.signInWithGoogle')}
                              </ThemedText>
                            </View>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* Sign Up Link */}
                      <View style={loginStyles.webSignupContainer}>
                        <ThemedText style={[loginStyles.webSignupText, { color: textSecondaryColor }]}>
                          {t('auth.dontHaveAccountShort')}{' '}
                        </ThemedText>
                        <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                          <ThemedText style={[loginStyles.webSignupLink, { color: accentColor }]}>
                            {t('auth.signup')}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Terms and Privacy Links */}
                    <View style={loginStyles.webPrivacyContainer}>
                      <ThemedText style={[loginStyles.webPrivacyText, { color: textSecondaryColor }]}>
                        {t('auth.bySigningInAgree')}{' '}
                      </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                        <ThemedText style={[loginStyles.webPrivacyLink, { color: accentColor }]}>
                          {t('auth.termsOfServiceShort')}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText style={[loginStyles.webPrivacyText, { color: textSecondaryColor }]}> {t('auth.and')} </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                        <ThemedText style={[loginStyles.webPrivacyLink, { color: accentColor }]}>
                          {t('auth.privacyPolicyShort')}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Keyboard Shortcuts */}
                  <View style={[loginStyles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                    <ThemedText style={[loginStyles.webShortcutsTitle, { color: textSecondaryColor }]}>{t('auth.keyboardShortcuts')}</ThemedText>
                    <View style={loginStyles.webShortcutsList}>
                      <View style={loginStyles.webShortcutItem}>
                        <ThemedText style={[loginStyles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.enter')}</ThemedText>
                        <ThemedText style={[loginStyles.webShortcutText, { color: textSecondaryColor }]}>{t('auth.signIn')}</ThemedText>
                      </View>
                      <View style={loginStyles.webShortcutItem}>
                        <ThemedText style={[loginStyles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>{t('auth.esc')}</ThemedText>
                        <ThemedText style={[loginStyles.webShortcutText, { color: textSecondaryColor }]}>{t('auth.goBack')}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // Mobile layout - Redesigned
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={[loginStyles.container, { backgroundColor }]}>
        <ScrollView
          contentContainerStyle={loginStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={loginStyles.header}>
            <View style={loginStyles.logoContainer}>
              <Image
                source={require('../../assets/images/WiznoteLogoNov25.png')}
                style={loginStyles.logoImage}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={[loginStyles.title, { color: textColor }]}>{t('auth.welcomeBack')}</ThemedText>
            <ThemedText style={[loginStyles.subtitle, { color: textSecondaryColor }]}>
              {t('auth.signInToContinue')}
            </ThemedText>
          </View>

          {/* Form Card */}
          <View style={[loginStyles.formCard, { backgroundColor: cardBg }]}>
            <View style={loginStyles.form}>
              {/* Email Input */}
              <View style={loginStyles.inputContainer}>
                <View style={loginStyles.inputLabelContainer}>
                  <Ionicons name="mail" size={18} color={accentColor} />
                  <ThemedText style={[loginStyles.label, { color: textColor }]}>{t('auth.emailAddress')}</ThemedText>
                </View>
                <TextInput
                  style={[loginStyles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                  placeholder={t('auth.enterYourEmail')}
                  placeholderTextColor={textSecondaryColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={loginStyles.inputContainer}>
                <View style={loginStyles.inputLabelContainer}>
                  <Ionicons name="lock-closed" size={18} color={accentColor} />
                  <ThemedText style={[loginStyles.label, { color: textColor }]}>{t('auth.password')}</ThemedText>
                </View>
                <View style={[loginStyles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[loginStyles.passwordInput, { color: inputText }]}
                    placeholder={t('auth.enterYourPassword')}
                    placeholderTextColor={textSecondaryColor}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={loginStyles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity 
                style={loginStyles.forgotPasswordContainer}
                onPress={() => router.push('/forgot-password' as any)}
              >
                <ThemedText style={[loginStyles.forgotPasswordText, { color: accentColor }]}>
                  {t('auth.forgotPassword')}
                </ThemedText>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[loginStyles.loginButton, { backgroundColor: accentColor }, isLoading && loginStyles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <ThemedText style={loginStyles.loginButtonText}>
                  {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                </ThemedText>
              </TouchableOpacity>

          {googleSignInEnabled && (
            <>
              {/* Or Divider */}
              <View style={{ height: 12 }} />
              
              {/* Google Sign-In (Brand-compliant) */}
              <TouchableOpacity
                style={[
                  loginStyles.loginButton,
                  { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775', paddingLeft: 12, paddingRight: 12 },
                  isLoading && loginStyles.loginButtonDisabled
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                    style={{ width: 18, height: 18, marginRight: 10 }}
                    resizeMode="contain"
                  />
                  <ThemedText style={[loginStyles.loginButtonText, { color: '#1F1F1F', fontWeight: '500' }]}>
                    {t('auth.signInWithGoogle')}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </>
          )}
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={loginStyles.signupContainer}>
            <ThemedText style={[loginStyles.signupText, { color: textSecondaryColor }]}>
              {t('auth.dontHaveAccountShort')}{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/signup' as any)}>
              <ThemedText style={[loginStyles.signupLink, { color: accentColor }]}>
                {t('auth.signup')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Terms and Privacy Links */}
          <View style={loginStyles.privacyContainer}>
            <ThemedText style={[loginStyles.privacyText, { color: textSecondaryColor }]}>
              {t('auth.bySigningInAgree')}{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}>
              <ThemedText style={[loginStyles.privacyLink, { color: accentColor }]}>
                {t('auth.termsOfServiceShort')}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[loginStyles.privacyText, { color: textSecondaryColor }]}> {t('auth.and')} </ThemedText>
            <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
              <ThemedText style={[loginStyles.privacyLink, { color: accentColor }]}>
                {t('auth.privacyPolicyShort')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}