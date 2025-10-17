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
import { Logo } from '../../components/Logo';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { loginStyles } from '../../styles/LoginStyles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileWeb, setIsMobileWeb] = useState(false);

  const { signIn } = useAuth();
  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle();

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
      const message = 'Please enter your email address';
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (!email.includes('@')) {
      const message = 'Please enter a valid email address';
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (!password) {
      const message = 'Please enter your password';
      if (Platform.OS === 'web') {
        console.log('Login validation error - calling showSnackbar:', message);
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
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
        showSnackbar('Successfully signed in! Welcome back.', 'success', 3000);
      }
      
      router.replace('/(tabs)');
    } catch (error) {
      // Parse error message and provide user-friendly feedback
      let errorMessage = 'Failed to sign in. Please try again.';
      let errorDuration = 6000;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Invalid credentials
        if (message.includes('invalid login credentials') || 
            message.includes('invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          errorDuration = 7000;
        }
        // Email not confirmed
        else if (message.includes('email not confirmed')) {
          errorMessage = 'Please verify your email address. Check your inbox for the confirmation link.';
          errorDuration = 8000;
        }
        // User not found
        else if (message.includes('user not found') || message.includes('no user found')) {
          errorMessage = 'No account found with this email. Please sign up or check your email address.';
          errorDuration = 7000;
        }
        // Network errors
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          errorDuration = 6000;
        }
        // Rate limiting
        else if (message.includes('rate limit') || message.includes('too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
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
        Alert.alert('Login Error', errorMessage);
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
      description: 'Sign in',
    },
    {
      key: 'Escape',
      action: () => router.back(),
      description: 'Go back',
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
                    <Logo size={60} />
                  </View>
                  <ThemedText style={[loginStyles.webMobileTitle, { color: textColor }]}>WizNote</ThemedText>
                  <ThemedText style={[loginStyles.webMobileSubtitle, { color: textSecondaryColor }]}>
                    Your personal note-taking companion
                  </ThemedText>
                </View>

                {/* Form Section */}
                <View style={[loginStyles.webMobileFormCard, { backgroundColor: cardBg }]}>
                  <View style={loginStyles.webMobileFormHeader}>
                    <ThemedText style={[loginStyles.webMobileFormTitle, { color: textColor }]}>Welcome Back</ThemedText>
                    <ThemedText style={[loginStyles.webMobileFormSubtitle, { color: textSecondaryColor }]}>
                      Sign in to continue with WizNote
                    </ThemedText>
                  </View>

                  <View style={loginStyles.webMobileForm}>
                    {/* Email Input */}
                    <View style={loginStyles.webMobileInputContainer}>
                      <ThemedText style={[loginStyles.webMobileLabel, { color: textColor }]}>Email Address</ThemedText>
                      <TextInput
                        style={[loginStyles.webMobileInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
                        placeholder="Enter your email"
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
                      <ThemedText style={[loginStyles.webMobileLabel, { color: textColor }]}>Password</ThemedText>
                      <View style={[loginStyles.webMobilePasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                        <TextInput
                          style={[loginStyles.webMobilePasswordInput, { color: inputText }]}
                          placeholder="Enter your password"
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
                        Forgot Password?
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                      style={[loginStyles.webMobileLoginButton, { backgroundColor: accentColor }, isLoading && loginStyles.webMobileLoginButtonDisabled]}
                      onPress={handleLogin}
                      disabled={isLoading}
                    >
                      <ThemedText style={loginStyles.webMobileLoginButtonText}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <View style={loginStyles.webMobileSignupContainer}>
                      <ThemedText style={[loginStyles.webMobileSignupText, { color: textSecondaryColor }]}>
                        Don&apos;t have an account?{' '}
                      </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
                        <ThemedText style={[loginStyles.webMobileSignupLink, { color: accentColor }]}>
                          Sign Up
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
                        <ThemedText style={loginStyles.webMobileAndroidTitle}>Get the Android App</ThemedText>
                      </View>
                      <ThemedText style={loginStyles.webMobileAndroidSubtitle}>
                        Take your notes anywhere
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
                        <ThemedText style={loginStyles.webMobileAppleTitle}>iOS Coming Soon</ThemedText>
                      </View>
                      <ThemedText style={loginStyles.webMobileAppleSubtitle}>
                        Stay tuned for release
                      </ThemedText>
                      <TouchableOpacity style={loginStyles.webMobileAppleBadge}>
                        <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
                        <ThemedText style={loginStyles.webMobileAppleBadgeText}>Coming Soon</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Terms and Privacy Links */}
                <View style={loginStyles.webMobilePrivacyContainer}>
                  <ThemedText style={[loginStyles.webMobilePrivacyText, { color: textSecondaryColor }]}>
                    By signing in, you agree to our{' '}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                    <ThemedText style={[loginStyles.webMobilePrivacyLink, { color: accentColor }]}>
                      Terms of Service
                    </ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={[loginStyles.webMobilePrivacyText, { color: textSecondaryColor }]}> and </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                    <ThemedText style={[loginStyles.webMobilePrivacyLink, { color: accentColor }]}>
                      Privacy Policy
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
                      <Logo size={80} />
                    </View>
                    <ThemedText style={[loginStyles.webBrandTitle, { color: textColor }]}>WizNote</ThemedText>
                    <ThemedText style={[loginStyles.webBrandSubtitle, { color: textSecondaryColor }]}>
                      Your personal note-taking companion
                    </ThemedText>
                  </View>
                  
                  <View style={loginStyles.webFeaturesSection}>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        Organize thoughts with smart tags
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        Voice-to-text transcription
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        Cross-platform sync
                      </ThemedText>
                    </View>
                    <View style={loginStyles.webFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                      <ThemedText style={[loginStyles.webFeatureText, { color: textColor }]}>
                        AI-powered insights
                      </ThemedText>
                    </View>
                  </View>

                  {/* Mobile Apps Promotion Section */}
                  <View style={loginStyles.webMobileAppsSection}>
                    {/* Android App Promotion */}
                    <View style={[loginStyles.webAndroidPromotion, { backgroundColor: accentColor }]}>
                      <View style={loginStyles.webAndroidContent}>
                        <View style={loginStyles.webAndroidHeader}>
                          <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                          <ThemedText style={loginStyles.webAndroidTitle}>Get the Android App</ThemedText>
                        </View>
                        <ThemedText style={loginStyles.webAndroidSubtitle}>
                          Take your notes anywhere with our mobile app
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
                          <ThemedText style={loginStyles.webAppleTitle}>iOS App Coming Soon</ThemedText>
                        </View>
                        <ThemedText style={loginStyles.webAppleSubtitle}>
                          Stay tuned for the Apple App Store release
                        </ThemedText>
                        <TouchableOpacity style={loginStyles.webAppleBadge}>
                          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                          <ThemedText style={loginStyles.webAppleBadgeText}>Coming Soon</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Right Panel - Login Form */}
                <View style={loginStyles.webRightPanel}>
                  <View style={loginStyles.webFormContainer}>
                    <View style={loginStyles.webFormHeader}>
                      <ThemedText style={[loginStyles.webFormTitle, { color: textColor }]}>Welcome Back</ThemedText>
                      <ThemedText style={[loginStyles.webFormSubtitle, { color: textSecondaryColor }]}>
                        Sign in to continue with WizNote
                      </ThemedText>
                    </View>

                    <View style={loginStyles.webForm}>
                      {/* Email Input */}
                      <View style={loginStyles.webInputContainer}>
                        <ThemedText style={[loginStyles.webLabel, { color: textColor }]}>Email Address</ThemedText>
                        <TextInput
                          style={[loginStyles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
                          placeholder="Enter your email"
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
                        <ThemedText style={[loginStyles.webLabel, { color: textColor }]}>Password</ThemedText>
                        <View style={[loginStyles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                          <TextInput
                            style={[loginStyles.webPasswordInput, { color: inputText }]}
                            placeholder="Enter your password"
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
                          Forgot Password?
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Sign In Button */}
                      <TouchableOpacity
                        style={[loginStyles.webLoginButton, { backgroundColor: accentColor }, isLoading && loginStyles.webLoginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                      >
                        <ThemedText style={loginStyles.webLoginButtonText}>
                          {isLoading ? 'Signing In...' : 'Sign In'}
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Sign Up Link */}
                      <View style={loginStyles.webSignupContainer}>
                        <ThemedText style={[loginStyles.webSignupText, { color: textSecondaryColor }]}>
                          Don&apos;t have an account?{' '}
                        </ThemedText>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
                          <ThemedText style={[loginStyles.webSignupLink, { color: accentColor }]}>
                            Sign Up
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Terms and Privacy Links */}
                    <View style={loginStyles.webPrivacyContainer}>
                      <ThemedText style={[loginStyles.webPrivacyText, { color: textSecondaryColor }]}>
                        By signing in, you agree to our{' '}
                      </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                        <ThemedText style={[loginStyles.webPrivacyLink, { color: accentColor }]}>
                          Terms of Service
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText style={[loginStyles.webPrivacyText, { color: textSecondaryColor }]}> and </ThemedText>
                      <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                        <ThemedText style={[loginStyles.webPrivacyLink, { color: accentColor }]}>
                          Privacy Policy
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Keyboard Shortcuts */}
                  <View style={[loginStyles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                    <ThemedText style={[loginStyles.webShortcutsTitle, { color: textSecondaryColor }]}>Keyboard Shortcuts</ThemedText>
                    <View style={loginStyles.webShortcutsList}>
                      <View style={loginStyles.webShortcutItem}>
                        <ThemedText style={[loginStyles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>Enter</ThemedText>
                        <ThemedText style={[loginStyles.webShortcutText, { color: textSecondaryColor }]}>Sign in</ThemedText>
                      </View>
                      <View style={loginStyles.webShortcutItem}>
                        <ThemedText style={[loginStyles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>Esc</ThemedText>
                        <ThemedText style={[loginStyles.webShortcutText, { color: textSecondaryColor }]}>Go back</ThemedText>
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
            <View style={[loginStyles.logoContainer, { backgroundColor: cardBg }]}>
              <Logo size={100} />
            </View>
            <ThemedText style={[loginStyles.title, { color: textColor }]}>Welcome Back</ThemedText>
            <ThemedText style={[loginStyles.subtitle, { color: textSecondaryColor }]}>
              Sign in to continue with WizNote
            </ThemedText>
          </View>

          {/* Form Card */}
          <View style={[loginStyles.formCard, { backgroundColor: cardBg }]}>
            <View style={loginStyles.form}>
              {/* Email Input */}
              <View style={loginStyles.inputContainer}>
                <View style={loginStyles.inputLabelContainer}>
                  <Ionicons name="mail" size={18} color={accentColor} />
                  <ThemedText style={[loginStyles.label, { color: textColor }]}>Email Address</ThemedText>
                </View>
                <TextInput
                  style={[loginStyles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                  placeholder="Enter your email"
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
                  <ThemedText style={[loginStyles.label, { color: textColor }]}>Password</ThemedText>
                </View>
                <View style={[loginStyles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[loginStyles.passwordInput, { color: inputText }]}
                    placeholder="Enter your password"
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
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[loginStyles.loginButton, { backgroundColor: accentColor }, isLoading && loginStyles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <ThemedText style={loginStyles.loginButtonText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={loginStyles.signupContainer}>
            <ThemedText style={[loginStyles.signupText, { color: textSecondaryColor }]}>
              Don&apos;t have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
              <ThemedText style={[loginStyles.signupLink, { color: accentColor }]}>
                Sign Up
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Terms and Privacy Links */}
          <View style={loginStyles.privacyContainer}>
            <ThemedText style={[loginStyles.privacyText, { color: textSecondaryColor }]}>
              By signing in, you agree to our{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}>
              <ThemedText style={[loginStyles.privacyLink, { color: accentColor }]}>
                Terms of Service
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[loginStyles.privacyText, { color: textSecondaryColor }]}> and </ThemedText>
            <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
              <ThemedText style={[loginStyles.privacyLink, { color: accentColor }]}>
                Privacy Policy
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}