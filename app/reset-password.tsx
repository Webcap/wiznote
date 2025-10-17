import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
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

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const { showSnackbar } = useSnackbar();

  // Set page title for web
  usePageTitle('Reset Password - WizNote');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // On web, Supabase automatically exchanges the token in the URL for a session
      // Wait a moment for this to complete
      if (Platform.OS === 'web') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const user = await betterAuthService.getCurrentUser();
      if (user) {
        console.log('✅ Valid session found for password reset');
        setIsValidSession(true);
      } else {
        // Check if we're coming from a password reset link (has token in URL)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const hasToken = urlParams.get('token') || urlParams.get('access_token');
          
          if (hasToken) {
            // Token present but session not established yet
            // Give it a bit more time and try again
            console.log('⏳ Reset token detected, waiting for session...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            const retryUser = await betterAuthService.getCurrentUser();
            
            if (retryUser) {
              console.log('✅ Session established after retry');
              setIsValidSession(true);
              return;
            }
          }
        }
        
        // No valid session and no token - redirect to login
        console.log('❌ No valid session for password reset');
        if (Platform.OS === 'web') {
          showSnackbar('Invalid or expired reset link. Please request a new one.', 'error', 5000);
        }
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      if (Platform.OS === 'web') {
        showSnackbar('Error validating reset link. Please try again.', 'error', 4000);
      }
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const validateForm = () => {
    if (!newPassword.trim()) {
      const message = 'Please enter a new password';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (newPassword.length < 6) {
      const message = 'Password must be at least 6 characters long';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (!confirmPassword.trim()) {
      const message = 'Please confirm your new password';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }

    if (newPassword !== confirmPassword) {
      const message = 'Passwords do not match';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Error', message);
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
        showSnackbar('Password updated successfully! Redirecting to login...', 'success', 3000);
      } else {
        Alert.alert('Success', 'Password updated successfully!', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
      }
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
      
    } catch (error) {
      // Parse error message and provide user-friendly feedback
      let errorMessage = 'Failed to update password. Please try again.';
      let errorDuration = 6000;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Password too weak
        if (message.includes('password') && message.includes('weak')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          errorDuration = 6000;
        }
        // Session expired
        else if (message.includes('session') || message.includes('expired')) {
          errorMessage = 'Your session has expired. Please request a new password reset link.';
          errorDuration = 8000;
        }
        // Network errors
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
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
        Alert.alert('Password Reset Error', errorMessage);
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
      description: 'Update password',
    },
    {
      key: 'Escape',
      action: handleBackToLogin,
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

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor }]}>
        <View style={styles.loadingContent}>
          <Logo size={80} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            Verifying reset link...
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
            Invalid Reset Link
          </ThemedText>
          <ThemedText style={[styles.errorSubtitle, { color: textSecondaryColor }]}>
            This password reset link is invalid or has expired.
          </ThemedText>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: accentColor }]}
            onPress={handleBackToLogin}
          >
            <ThemedText style={styles.errorButtonText}>
              Back to Login
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

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
                  Set your new password
                </ThemedText>
              </View>
              
              <View style={styles.webFeaturesSection}>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    Secure password update
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    Minimum 6 characters
                  </ThemedText>
                </View>
                <View style={styles.webFeatureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#3CB371" />
                  <ThemedText style={[styles.webFeatureText, { color: textColor }]}>
                    Instant access after reset
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Right Panel - Reset Form */}
            <View style={styles.webRightPanel}>
              <View style={styles.webFormContainer}>
                <View style={styles.webFormHeader}>
                  <ThemedText style={[styles.webFormTitle, { color: textColor }]}>
                    Reset Password
                  </ThemedText>
                  <ThemedText style={[styles.webFormSubtitle, { color: textSecondaryColor }]}>
                    Enter your new password below
                  </ThemedText>
                </View>

                <View style={styles.webForm}>
                  {/* New Password Input */}
                  <View style={styles.webInputContainer}>
                    <ThemedText style={[styles.webLabel, { color: textColor }]}>New Password</ThemedText>
                    <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                      <TextInput
                        style={[styles.webPasswordInput, { color: inputText }]}
                        placeholder="Enter new password"
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
                    <ThemedText style={[styles.webLabel, { color: textColor }]}>Confirm Password</ThemedText>
                    <View style={[styles.webPasswordContainer, { backgroundColor: inputBg, borderColor }]}>
                      <TextInput
                        style={[styles.webPasswordInput, { color: inputText }]}
                        placeholder="Confirm new password"
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
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Back to Login Link */}
                  <View style={styles.webBackContainer}>
                    <ThemedText style={[styles.webBackText, { color: textSecondaryColor }]}>
                      Remember your password?{' '}
                    </ThemedText>
                    <TouchableOpacity onPress={handleBackToLogin}>
                      <ThemedText style={[styles.webBackLink, { color: accentColor }]}>
                        Back to Login
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
                      <ThemedText style={[styles.webShortcutText, { color: textSecondaryColor }]}>Update password</ThemedText>
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
              <ThemedText style={[styles.title, { color: textColor }]}>Reset Password</ThemedText>
              <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
                Enter your new password below
              </ThemedText>
            </View>

            {/* Form Card */}
            <View style={[styles.formCard, { backgroundColor: cardBg }]}>
              <View style={styles.form}>
                {/* New Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="lock-closed" size={18} color={accentColor} />
                    <ThemedText style={[styles.label, { color: textColor }]}>New Password</ThemedText>
                  </View>
                  <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: inputText }]}
                      placeholder="Enter new password"
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
                    <ThemedText style={[styles.label, { color: textColor }]}>Confirm Password</ThemedText>
                  </View>
                  <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: inputText }]}
                      placeholder="Confirm new password"
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
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Back to Login Link */}
            <View style={styles.backContainer}>
              <ThemedText style={[styles.backText, { color: textSecondaryColor }]}>
                Remember your password?{' '}
              </ThemedText>
              <TouchableOpacity onPress={handleBackToLogin}>
                <ThemedText style={[styles.backLink, { color: accentColor }]}>
                  Back to Login
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
});
