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
  
  // On web, also check URL search params directly as fallback
  let ticketId = params.ticket as string;
  let token = params.token as string;
  
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (!ticketId) ticketId = urlParams.get('ticket') || '';
    if (!token) token = urlParams.get('token') || '';
  }

  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);
  
  console.log('VerifyDeletionScreen: Loaded with params:', { ticketId, token, allParams: params });

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const cardBg = useThemeColor({}, 'backgroundSecondary');

  useEffect(() => {
    // Prevent navigation during verification
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const preventNavigation = (e: BeforeUnloadEvent) => {
        if (status === 'verifying') {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', preventNavigation);
      return () => window.removeEventListener('beforeunload', preventNavigation);
    }
  }, [status]);

  useEffect(() => {
    console.log('VerifyDeletionScreen: useEffect triggered', { ticketId, token });
    
    if (!ticketId || !token) {
      console.error('VerifyDeletionScreen: Missing ticketId or token', { ticketId, token });
      setStatus('error');
      setError('Invalid verification link. Please check your email and try again.');
      return;
    }

    console.log('VerifyDeletionScreen: Starting verification');
    verifyRequest();
  }, [ticketId, token]);

  const verifyRequest = async () => {
    try {
      console.log('VerifyDeletionScreen: verifyRequest called', { ticketId, token });
      setStatus('verifying');
      setMessage('Verifying your request...');

      const result = await supportService.verifyDeletionRequest(ticketId, token);
      console.log('VerifyDeletionScreen: Verification result', result);

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

