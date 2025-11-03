import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { betterAuthService } from '../../services/BetterAuthService';
import { authInitializationService } from '../../services/AuthInitializationService';
import { ProgressCallback } from '../../services/AuthInitializationService';

/**
 * Auth Callback Screen
 * Handles email verification and OAuth callbacks
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'verifying' | 'initializing' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [progress, setProgress] = useState(0);

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
          console.log('Active session found, waiting for initialization...');
          setStatus('initializing');
          setMessage('Loading your account...');
          
          // Set up progress tracking
          const progressCallback: ProgressCallback = (progress) => {
            setMessage(progress.message);
            setProgress(progress.progress);
            
            if (progress.stage === 'complete') {
              // Wait a moment for UI to update, then redirect
              setTimeout(() => {
                setStatus('success');
                setMessage('Ready! Redirecting...');
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 500);
              }, 300);
            } else if (progress.error) {
              setStatus('error');
              setMessage(progress.error);
            }
          };
          
          const unsubscribe = authInitializationService.onProgress(progressCallback);
          
          // Wait for initialization to complete
          try {
            // Check if user is already initialized
            const user = await betterAuthService.instance.waitForInitialization();
            
            if (user && betterAuthService.instance.isUserInitialized()) {
              setStatus('success');
              setMessage('Ready! Redirecting...');
              unsubscribe();
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 500);
            } else {
              // Wait up to 30 seconds for initialization
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Initialization timeout')), 30000);
              });
              
              await Promise.race([
                betterAuthService.instance.waitForInitialization(),
                timeoutPromise
              ]);
              
              unsubscribe();
              
              if (betterAuthService.instance.isUserInitialized()) {
                setStatus('success');
                setMessage('Ready! Redirecting...');
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 500);
              } else {
                throw new Error('Initialization incomplete');
              }
            }
          } catch (error) {
            unsubscribe();
            console.error('Initialization error:', error);
            setStatus('error');
            setMessage('Failed to load your account. Please try signing in again.');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
              router.replace('/(auth)/login');
            }, 3000);
          }
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
        {(status === 'verifying' || status === 'initializing') && (
          <>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.message}>{message}</Text>
            {status === 'initializing' && progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            )}
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
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </TouchableOpacity>
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
  progressContainer: {
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

