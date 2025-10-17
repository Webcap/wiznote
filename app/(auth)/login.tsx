import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Logo } from '../../components/Logo';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();
  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle();

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

  // Google sign-in functionality disabled
  // const handleGoogleLogin = async () => {
  //   setIsLoading(true);
  //   try {
  //     await signInWithGoogle();
  //     
  //     // Show success message on web
  //     if (Platform.OS === 'web') {
  //       showSnackbar('Successfully signed in with Google!', 'success', 3000);
  //     }
  //     
  //     router.replace('/(tabs)');
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
  //     if (Platform.OS === 'web') {
  //       showSnackbar(errorMessage, 'error', 6000);
  //     } else {
  //       Alert.alert('Error', errorMessage);
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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

  // Web layout
  if (Platform.OS === 'web') {
    return (
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
                Your personal note-taking companion
              </ThemedText>
            </View>
            
            <View style={styles.webFeaturesSection}>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Organize thoughts with smart tags
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Voice-to-text transcription
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  Cross-platform sync
                </ThemedText>
              </View>
              <View style={styles.webFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                  AI-powered insights
                </ThemedText>
              </View>
            </View>

            {/* Mobile Apps Promotion Section */}
            <View style={styles.webMobileAppsSection}>
              {/* Android App Promotion */}
              <View style={[styles.webAndroidPromotion, { backgroundColor: accentColor }]}>
                <View style={styles.webAndroidContent}>
                  <View style={styles.webAndroidHeader}>
                    <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                    <ThemedText style={styles.webAndroidTitle}>Get the Android App</ThemedText>
                  </View>
                  <ThemedText style={styles.webAndroidSubtitle}>
                    Take your notes anywhere with our mobile app
                  </ThemedText>
                  <TouchableOpacity 
                    style={styles.webAndroidButton}
                    onPress={() => {
                      window.open('https://play.google.com/store/apps/details?id=com.WizNote.app', '_blank');
                    }}
                  >
                    <Image 
                      source={require('../../assets/images/get-on-playstore.png')} 
                      style={styles.webPlayStoreBadge}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Apple App Store Coming Soon */}
              <View style={[styles.webApplePromotion, { backgroundColor: '#000000' }]}>
                <View style={styles.webAppleContent}>
                  <View style={styles.webAppleHeader}>
                    <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
                    <ThemedText style={styles.webAppleTitle}>iOS App Coming Soon</ThemedText>
                  </View>
                  <ThemedText style={styles.webAppleSubtitle}>
                    Stay tuned for the Apple App Store release
                  </ThemedText>
                  <TouchableOpacity style={styles.webAppleBadge}>
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                    <ThemedText style={styles.webAppleBadgeText}>Coming Soon</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Right Panel - Login Form */}
          <View style={styles.webRightPanel}>
            <View style={styles.webFormContainer}>
              <View style={styles.webFormHeader}>
                <ThemedText style={[styles.webFormTitle, { color: textColor }]}>Welcome Back</ThemedText>
                <ThemedText style={[styles.webFormSubtitle, { color: textSecondaryColor }]}>
                  Sign in to continue with WizNote
                </ThemedText>
              </View>

              <View style={styles.webForm}>
                {/* Email Input */}
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>Email Address</ThemedText>
                  <TextInput
                    style={[styles.webInput, { color: inputText, backgroundColor: inputBg, borderColor }]}
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
                <View style={styles.webInputContainer}>
                  <ThemedText style={[styles.webLabel, { color: textColor }]}>Password</ThemedText>
                  <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }] }>
                    <TextInput
                      style={[styles.webPasswordInput, { color: inputText }]}
                      placeholder="Enter your password"
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
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity style={styles.webForgotPasswordContainer}>
                  <ThemedText style={[styles.webForgotPasswordText, { color: accentColor }]}>
                    Forgot Password?
                  </ThemedText>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.webLoginButton, { backgroundColor: accentColor }, isLoading && styles.webLoginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.webLoginButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </ThemedText>
                </TouchableOpacity>

                {/* Google Sign In Button - Disabled */}
                {/* <View style={styles.webDividerContainer}>
                  <View style={[styles.webDivider, { backgroundColor: borderColor }]} />
                  <ThemedText style={[styles.webDividerText, { color: textSecondaryColor }]}>or</ThemedText>
                  <View style={[styles.webDivider, { backgroundColor: borderColor }]} />
                </View>

                <TouchableOpacity
                  style={[styles.webGoogleButton, { backgroundColor: inputBg, borderColor }, isLoading && styles.disabledButton]}
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-google" size={20} color={textSecondaryColor} />
                  <ThemedText style={[styles.webGoogleButtonText, { color: textColor }, isLoading && styles.disabledButtonText]}>
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                  </ThemedText>
                </TouchableOpacity> */}

                {/* Sign Up Link */}
                <View style={styles.webSignupContainer}>
                  <ThemedText style={[styles.webSignupText, { color: textSecondaryColor }]}>
                    Don&apos;t have an account?{' '}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
                    <ThemedText style={[styles.webSignupLink, { color: accentColor }]}>
                      Sign Up
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Terms and Privacy Links */}
                <View style={styles.webPrivacyContainer}>
                  <ThemedText style={[styles.webPrivacyText, { color: textSecondaryColor }]}>
                    By signing in, you agree to our{' '}
                  </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                    <ThemedText style={[styles.webPrivacyLink, { color: accentColor }]}>
                      Terms of Service
                    </ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={[styles.webPrivacyText, { color: textSecondaryColor }]}> and </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                    <ThemedText style={[styles.webPrivacyLink, { color: accentColor }]}>
                      Privacy Policy
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Keyboard Shortcuts */}
              <View style={[styles.webShortcutsContainer, { borderTopColor: borderColor }]}>
                <ThemedText style={[styles.webShortcutsTitle, { color: textSecondaryColor }]}>Keyboard Shortcuts</ThemedText>
                <View style={styles.webShortcutsList}>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>Enter</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>Sign in</ThemedText>
                  </View>
                  <View style={styles.webShortcutItem}>
                    <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBg, color: textColor }]}>Esc</ThemedText>
                    <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>Go back</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  // Mobile layout - Redesigned
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
          {/* Header Section */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: cardBg }]}>
              <Logo size={100} />
            </View>
            <ThemedText style={[styles.title, { color: textColor }]}>Welcome Back</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              Sign in to continue with WizNote
            </ThemedText>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: cardBg }]}>
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="mail" size={18} color={accentColor} />
                  <ThemedText style={[styles.label, { color: textColor }]}>Email Address</ThemedText>
                </View>
                <TextInput
                  style={[styles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
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
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="lock-closed" size={18} color={accentColor} />
                  <ThemedText style={[styles.label, { color: textColor }]}>Password</ThemedText>
                </View>
                <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: inputText }]}
                    placeholder="Enter your password"
                    placeholderTextColor={textSecondaryColor}
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
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <ThemedText style={[styles.forgotPasswordText, { color: accentColor }]}>
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: accentColor }, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <ThemedText style={styles.loginButtonText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <ThemedText style={[styles.signupText, { color: textSecondaryColor }]}>
              Don&apos;t have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
              <ThemedText style={[styles.signupLink, { color: accentColor }]}>
                Sign Up
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Mobile Apps Promotion */}
          <View style={styles.mobileAppsSection}>
            {/* Android App Promotion */}
            <View style={[styles.mobileAndroidPromotion, { backgroundColor: accentColor }]}>
              <View style={styles.mobileAndroidContent}>
                <View style={styles.mobileAndroidHeader}>
                  <Ionicons name="phone-portrait" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.mobileAndroidTitle}>Get the Android App</ThemedText>
                </View>
                <ThemedText style={styles.mobileAndroidSubtitle}>
                  Sync your notes across all devices
                </ThemedText>
                <TouchableOpacity 
                  style={styles.mobileAndroidButton}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open('https://play.google.com/store/apps/details?id=com.WizNote.app', '_blank');
                    } else {
                      // For mobile, you might want to open the Play Store app
                      console.log('Open Play Store');
                    }
                  }}
                >
                  <Image 
                    source={require('../../assets/images/get-on-playstore.png')} 
                    style={styles.mobilePlayStoreBadge}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Apple App Store Coming Soon */}
            <View style={[styles.mobileApplePromotion, { backgroundColor: '#000000' }]}>
              <View style={styles.mobileAppleContent}>
                <View style={styles.mobileAppleHeader}>
                  <Ionicons name="phone-portrait" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.mobileAppleTitle}>iOS App Coming Soon</ThemedText>
                </View>
                <ThemedText style={styles.mobileAppleSubtitle}>
                  Stay tuned for the Apple App Store release
                </ThemedText>
                <TouchableOpacity style={styles.mobileAppleBadge}>
                  <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.mobileAppleBadgeText}>Coming Soon</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Terms and Privacy Links */}
          <View style={styles.privacyContainer}>
            <ThemedText style={[styles.privacyText, { color: textSecondaryColor }]}>
              By signing in, you agree to our{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}>
              <ThemedText style={[styles.privacyLink, { color: accentColor }]}>
                Terms of Service
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.privacyText, { color: textSecondaryColor }]}> and </ThemedText>
            <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
              <ThemedText style={[styles.privacyLink, { color: accentColor }]}>
                Privacy Policy
              </ThemedText>
            </TouchableOpacity>
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
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 30,
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  signupText: {
    fontSize: 16,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  privacyText: {
    fontSize: 12,
  },
  privacyLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  mobileAndroidPromotion: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mobileAndroidContent: {
    alignItems: 'center',
  },
  mobileAndroidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mobileAndroidTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mobileAndroidSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.9,
  },
  mobileAndroidButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginTop: 0,
  },
  mobilePlayStoreBadge: {
    height: 40,
    width: 120,
  },
  mobileAppsSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  mobileApplePromotion: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mobileAppleContent: {
    alignItems: 'center',
  },
  mobileAppleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mobileAppleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mobileAppleSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.9,
  },
  mobileAppleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 40,
    marginTop: 0,
  },
  mobileAppleBadgeText: {
    fontSize: 12,
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
  webMobileAppsSection: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 16,
  },
  webAndroidPromotion: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  webApplePromotion: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  webAndroidContent: {
    alignItems: 'center',
  },
  webAndroidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  webAndroidTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  webAndroidSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  webAndroidButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginTop: 0,
  },
  webPlayStoreBadge: {
    height: 60,
    width: 180,
  },
  webAppleContent: {
    alignItems: 'center',
  },
  webAppleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  webAppleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  webAppleSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  webAppleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 60,
    marginTop: 0,
  },
  webAppleBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  webForgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  webForgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webLoginButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webLoginButtonDisabled: {
    opacity: 0.6,
  },
  webLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  webDivider: {
    flex: 1,
    height: 1,
  },
  webDividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  webGoogleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 32,
  },
  webGoogleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  webSignupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSignupText: {
    fontSize: 16,
  },
  webSignupLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  webPrivacyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  webPrivacyText: {
    fontSize: 12,
  },
  webPrivacyLink: {
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
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.6,
  },
}); 