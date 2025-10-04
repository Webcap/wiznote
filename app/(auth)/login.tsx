import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
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
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (!email.includes('@')) {
      const message = 'Please enter a valid email address';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (!password) {
      const message = 'Please enter your password';
      if (Platform.OS === 'web') {
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
        showSnackbar('Successfully signed in!', 'success', 3000);
      }
      
      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      } else {
        Alert.alert('Error', errorMessage);
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
            <ThemedText style={[styles.title, { color: textColor }]}>Welcome Back</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              Sign in to continue with Notez
            </ThemedText>
          </View>
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: textColor }]}>Email Address</ThemedText>
              <TextInput
                style={[styles.input, { color: inputText, backgroundColor: inputBg, borderColor }]}
                placeholder="Enter your email"
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
              <ThemedText style={[styles.label, { color: textColor }]}>Password</ThemedText>
              <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }] }>
                <TextInput
                  style={[styles.passwordInput, { color: inputText }]}
                  placeholder="Enter your password"
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
            {/* Google Sign In Button - Disabled */}
            {/* <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <ThemedText style={[styles.dividerText, { color: textSecondaryColor }]}>or</ThemedText>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
            </View>
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: inputBg, borderColor }, isLoading && styles.disabledButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color={textSecondaryColor} />
              <ThemedText style={[styles.googleButtonText, { color: textColor }, isLoading && styles.disabledButtonText]}>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </ThemedText>
            </TouchableOpacity> */}
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
    paddingTop: 60,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
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
  },
  signupText: {
    fontSize: 16,
  },
  signupLink: {
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
    height: '100vh',
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