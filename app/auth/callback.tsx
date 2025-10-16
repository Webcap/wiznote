import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Auth Callback Screen
 * Handles email verification and OAuth callbacks
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('Auth callback params:', params);

      // Check if we have a token hash (from email verification link)
      const tokenHash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;

      if (tokenHash && type) {
        console.log('Processing token hash verification...');
        
        // Verify the email using the token hash
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('error');
          setMessage('Email verification failed. Please try again or request a new verification email.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 3000);
          return;
        }

        console.log('Email verified successfully!');
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
      } else {
        console.log('No token hash found, checking session...');
        
        // Check if there's already an active session (OAuth callback)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 3000);
          return;
        }

        if (session) {
          console.log('Active session found, redirecting to app...');
          setStatus('success');
          setMessage('Signed in successfully! Redirecting...');
          
          // Redirect to main app
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1500);
        } else {
          console.log('No session found, redirecting to login...');
          setStatus('error');
          setMessage('No active session found. Please sign in.');
          
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try signing in again.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.message}>{message}</Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.message, styles.successText]}>{message}</Text>
          </>
        )}
        
        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={[styles.message, styles.errorText]}>{message}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginTop: 20,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIcon: {
    fontSize: 64,
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});

