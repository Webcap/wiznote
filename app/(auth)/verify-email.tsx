import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [countdown, setCountdown] = useState(60); // 60 seconds countdown
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Set page title
  usePageTitle();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email) {
      const message = 'Email address not found. Please sign up again.';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error');
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      const message = 'Verification email sent! Please check your inbox.';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'success', 4000);
      } else {
        Alert.alert('Success', message);
      }

      // Reset countdown
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      console.error('Error resending verification email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend email';
      
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/(auth)/login' as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={[styles.webContainer, { backgroundColor }]}>
        <View style={styles.webContent}>
          {/* Main Card */}
          <View style={[styles.webCard, { backgroundColor: cardBg, borderColor }]}>
            {/* Icon */}
            <View style={[styles.webIconContainer, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="mail-outline" size={64} color={accentColor} />
            </View>

            {/* Title */}
            <ThemedText style={[styles.webTitle, { color: textColor }]}>
              Verify Your Email
            </ThemedText>

            {/* Description */}
            <ThemedText style={[styles.webDescription, { color: textSecondaryColor }]}>
              We've sent a verification email to:
            </ThemedText>

            {/* Email */}
            <View style={[styles.webEmailContainer, { backgroundColor: backgroundColor, borderColor }]}>
              <Ionicons name="mail" size={20} color={accentColor} />
              <ThemedText style={[styles.webEmail, { color: textColor }]}>
                {email || 'your email'}
              </ThemedText>
            </View>

            {/* Instructions */}
            <View style={styles.webInstructionsContainer}>
              <ThemedText style={[styles.webInstructionsTitle, { color: textColor }]}>
                Next Steps:
              </ThemedText>
              <View style={styles.webInstructionItem}>
                <View style={[styles.webInstructionNumber, { backgroundColor: accentColor }]}>
                  <ThemedText style={styles.webInstructionNumberText}>1</ThemedText>
                </View>
                <ThemedText style={[styles.webInstructionText, { color: textSecondaryColor }]}>
                  Check your inbox (and spam folder)
                </ThemedText>
              </View>
              <View style={styles.webInstructionItem}>
                <View style={[styles.webInstructionNumber, { backgroundColor: accentColor }]}>
                  <ThemedText style={styles.webInstructionNumberText}>2</ThemedText>
                </View>
                <ThemedText style={[styles.webInstructionText, { color: textSecondaryColor }]}>
                  Click the verification link in the email
                </ThemedText>
              </View>
              <View style={styles.webInstructionItem}>
                <View style={[styles.webInstructionNumber, { backgroundColor: accentColor }]}>
                  <ThemedText style={styles.webInstructionNumberText}>3</ThemedText>
                </View>
                <ThemedText style={[styles.webInstructionText, { color: textSecondaryColor }]}>
                  Return here and sign in
                </ThemedText>
              </View>
            </View>

            {/* Resend Button */}
            <TouchableOpacity
              style={[
                styles.webResendButton,
                { backgroundColor: canResend ? accentColor : cardBg, borderColor },
                (!canResend || isResending) && styles.webResendButtonDisabled
              ]}
              onPress={handleResendEmail}
              disabled={!canResend || isResending}
            >
              {isResending ? (
                <View style={styles.webLoadingContainer}>
                  <LoadingSpinner size={20} color={accentColor} />
                  <ThemedText style={[styles.webResendButtonText, { color: accentColor }]}>
                    Sending...
                  </ThemedText>
                </View>
              ) : canResend ? (
                <>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.webResendButtonText, { color: '#FFFFFF' }]}>
                    Resend Verification Email
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={[styles.webResendButtonText, { color: textSecondaryColor }]}>
                  Resend available in {formatTime(countdown)}
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Go to Login */}
            <TouchableOpacity
              style={[styles.webLoginButton, { borderColor }]}
              onPress={handleGoToLogin}
            >
              <ThemedText style={[styles.webLoginButtonText, { color: accentColor }]}>
                Go to Sign In
              </ThemedText>
            </TouchableOpacity>

            {/* Help Text */}
            <View style={[styles.webHelpContainer, { borderTopColor: borderColor }]}>
              <Ionicons name="help-circle-outline" size={16} color={textSecondaryColor} />
              <ThemedText style={[styles.webHelpText, { color: textSecondaryColor }]}>
                Didn't receive the email? Check your spam folder or use the resend button above.
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name="mail-outline" size={80} color={accentColor} />
        </View>

        {/* Title */}
        <ThemedText style={[styles.title, { color: textColor }]}>
          Verify Your Email
        </ThemedText>

        {/* Description */}
        <ThemedText style={[styles.description, { color: textSecondaryColor }]}>
          We've sent a verification email to:
        </ThemedText>

        {/* Email */}
        <View style={[styles.emailContainer, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="mail" size={20} color={accentColor} />
          <ThemedText style={[styles.email, { color: textColor }]}>
            {email || 'your email'}
          </ThemedText>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <ThemedText style={[styles.instructionsTitle, { color: textColor }]}>
            Next Steps:
          </ThemedText>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: accentColor }]}>
              <ThemedText style={styles.instructionNumberText}>1</ThemedText>
            </View>
            <ThemedText style={[styles.instructionText, { color: textSecondaryColor }]}>
              Check your inbox (and spam folder)
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: accentColor }]}>
              <ThemedText style={styles.instructionNumberText}>2</ThemedText>
            </View>
            <ThemedText style={[styles.instructionText, { color: textSecondaryColor }]}>
              Tap the verification link in the email
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: accentColor }]}>
              <ThemedText style={styles.instructionNumberText}>3</ThemedText>
            </View>
            <ThemedText style={[styles.instructionText, { color: textSecondaryColor }]}>
              The app will open and verify automatically
            </ThemedText>
          </View>
        </View>

        {/* Resend Button */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            { backgroundColor: canResend ? accentColor : cardBg, borderColor: canResend ? accentColor : borderColor },
            (!canResend || isResending) && styles.resendButtonDisabled
          ]}
          onPress={handleResendEmail}
          disabled={!canResend || isResending}
        >
          {isResending ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={20} color={textColor} />
              <ThemedText style={[styles.resendButtonText, { color: textColor }]}>
                Sending...
              </ThemedText>
            </View>
          ) : canResend ? (
            <>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.resendButtonText, { color: '#FFFFFF' }]}>
                Resend Verification Email
              </ThemedText>
            </>
          ) : (
            <ThemedText style={[styles.resendButtonText, { color: textSecondaryColor }]}>
              Resend available in {formatTime(countdown)}
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Go to Login */}
        <TouchableOpacity
          style={[styles.loginButton, { borderColor }]}
          onPress={handleGoToLogin}
        >
          <ThemedText style={[styles.loginButtonText, { color: accentColor }]}>
            Go to Sign In
          </ThemedText>
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Ionicons name="help-circle-outline" size={16} color={textSecondaryColor} />
          <ThemedText style={[styles.helpText, { color: textSecondaryColor }]}>
            Didn't receive the email? Check your spam folder or use the resend button.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Mobile styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    gap: 12,
    width: '100%',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    paddingTop: 4,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Web styles
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContent: {
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 40,
  },
  webCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 48,
    alignItems: 'center',
  },
  webIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  webTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  webDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  webEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    gap: 12,
    width: '100%',
  },
  webEmail: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  webInstructionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  webInstructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  webInstructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  webInstructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webInstructionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  webInstructionText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
    paddingTop: 5,
  },
  webResendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  webResendButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  webResendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webLoginButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  webLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webHelpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    width: '100%',
  },
  webHelpText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    textAlign: 'center',
  },
});

