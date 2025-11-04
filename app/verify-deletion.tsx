import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { WebLayout } from '../components/web/WebLayout';
import { useThemeColor } from '../hooks/useThemeColor';
import { supportService } from '../services/SupportService';

export default function VerifyDeletionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ticketId = params.ticket as string;
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const cardBg = useThemeColor({}, 'backgroundSecondary');

  useEffect(() => {
    if (!ticketId || !token) {
      setStatus('error');
      setError('Invalid verification link. Please check your email and try again.');
      return;
    }

    verifyRequest();
  }, [ticketId, token]);

  const verifyRequest = async () => {
    try {
      setStatus('verifying');
      setMessage('Verifying your request...');

      const result = await supportService.verifyDeletionRequest(ticketId, token);

      if (result.success && result.verified) {
        setStatus('success');
        setMessage('Your account deletion request has been verified successfully.');
        
        // Auto-close after 5 seconds on web
        if (Platform.OS === 'web') {
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.close();
            }
          }, 5000);
        }
      } else {
        setStatus('error');
        setError(result.error || 'Verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Error verifying deletion request:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred during verification.');
    }
  };

  const handleClose = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.close();
      }
    } else {
      router.replace('/(tabs)');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Verify Account Deletion"
        subtitle="Confirm your account deletion request"
      >
        <ThemedView style={styles.webContainer}>
          <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
            {status === 'loading' || status === 'verifying' ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={accentPrimary} />
                <ThemedText style={styles.message}>{message}</ThemedText>
              </View>
            ) : status === 'success' ? (
              <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={64} color={accentSuccess} />
                <ThemedText style={[styles.title, { color: accentSuccess }]}>
                  Verification Successful
                </ThemedText>
                <ThemedText style={styles.message}>{message}</ThemedText>
                <ThemedText style={styles.infoText}>
                  Your support agent has been notified and will process your deletion request.
                </ThemedText>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: accentPrimary }]}
                  onPress={handleClose}
                >
                  <ThemedText style={styles.buttonText}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="close-circle" size={64} color={accentDanger} />
                <ThemedText style={[styles.title, { color: accentDanger }]}>
                  Verification Failed
                </ThemedText>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <ThemedText style={styles.infoText}>
                  If you believe this is an error, please contact support at{' '}
                  <ThemedText style={{ color: accentPrimary }}>support@wiznote.app</ThemedText>
                </ThemedText>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: accentPrimary }]}
                  onPress={handleClose}
                >
                  <ThemedText style={styles.buttonText}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>
        </ThemedView>
      </WebLayout>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
          {status === 'loading' || status === 'verifying' ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={accentPrimary} />
              <ThemedText style={styles.message}>{message}</ThemedText>
            </View>
          ) : status === 'success' ? (
            <View style={styles.centerContent}>
              <Ionicons name="checkmark-circle" size={64} color={accentSuccess} />
              <ThemedText style={[styles.title, { color: accentSuccess }]}>
                Verification Successful
              </ThemedText>
              <ThemedText style={styles.message}>{message}</ThemedText>
              <ThemedText style={styles.infoText}>
                Your support agent has been notified and will process your deletion request.
              </ThemedText>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: accentPrimary }]}
                onPress={handleClose}
              >
                <ThemedText style={styles.buttonText}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="close-circle" size={64} color={accentDanger} />
              <ThemedText style={[styles.title, { color: accentDanger }]}>
                Verification Failed
              </ThemedText>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <ThemedText style={styles.infoText}>
                If you believe this is an error, please contact support at{' '}
                <ThemedText style={{ color: accentPrimary }}>support@wiznote.app</ThemedText>
              </ThemedText>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: accentPrimary }]}
                onPress={handleClose}
              >
                <ThemedText style={styles.buttonText}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    padding: 30,
    borderRadius: 12,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    color: '#DC3545',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

