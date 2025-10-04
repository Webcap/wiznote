import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface AuthLoadingScreenProps {
  message?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = 'Loading your account...' 
}) => {
  const { isLoading, error, isAuthenticated, loadCurrentUser } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const errorColor = '#FF6B6B';
  const accentColor = useThemeColor({}, 'accentPrimary');
  
  const [loadingMessage, setLoadingMessage] = useState(message);
  const [retryCount, setRetryCount] = useState(0);

  // Update loading message based on retry count
  useEffect(() => {
    if (retryCount > 0) {
      setLoadingMessage(`Retrying connection... (${retryCount})`);
    } else {
      setLoadingMessage(message);
    }
  }, [retryCount, message]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    try {
      await loadCurrentUser();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // Show error state if there's an authentication error
  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={errorColor} />
          <ThemedText style={[styles.errorTitle, { color: textColor }]}>
            Connection Issue
          </ThemedText>
          <ThemedText style={[styles.errorMessage, { color: textColor }]}>
            {error.includes('timeout') ? 
              'Taking longer than expected to connect. Please check your internet connection.' :
              error
            }
          </ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={handleRetry}
          >
            <ThemedText style={styles.retryButtonText}>
              {retryCount > 0 ? 'Try Again' : 'Retry'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          <ActivityIndicator 
            size="large" 
            color={tintColor} 
            style={styles.spinner}
          />
          <ThemedText style={[styles.message, { color: textColor }]}>
            {loadingMessage}
          </ThemedText>
          {retryCount > 0 && (
            <ThemedText style={[styles.subMessage, { color: textColor }]}>
              Attempt {retryCount + 1}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  // If not loading and no error, return null (let parent handle rendering)
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subMessage: {
    fontSize: 14,
    marginTop: 8,
  },
}); 