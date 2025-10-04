import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Logo } from './Logo';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface BrandedLoadingScreenProps {
  message?: string;
  showLogo?: boolean;
  size?: number;
}

export const BrandedLoadingScreen: React.FC<BrandedLoadingScreenProps> = ({
  message = 'Loading...',
  showLogo = true,
  size = 80,
}) => {
  return (
    <ThemedView style={styles.container}>
      {showLogo && (
        <View style={styles.logoContainer}>
          <Logo size={size} />
          <ThemedText style={styles.appName}>WizNote</ThemedText>
        </View>
      )}
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <ThemedText style={styles.loadingText}>{message}</ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
