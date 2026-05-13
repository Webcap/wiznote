import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useSystemSettings } from '../hooks/useSystemSettings';

export default function SunsetPage() {
  const router = useRouter();
  const { hasRole, isLoading: authLoading, isInitializing } = useAuth();
  const { settings, loading: settingsLoading } = useSystemSettings();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = '#6A5ACD';

  // Only allow admins to view while testing
  useEffect(() => {
    console.log('SunsetPage: useEffect trigger - authLoading:', authLoading, 'isInitializing:', isInitializing);
    
    const SHUTDOWN_DATE = new Date('2026-05-22T03:00:00-04:00'); // 3 AM EST
    const isPastShutdown = new Date() >= SHUTDOWN_DATE;

    // We MUST wait for both loading and initialization to be false to have the full user profile (role)
    if (!authLoading && !isInitializing) {
      const isAdmin = hasRole('admin');
      console.log('SunsetPage: isAdmin check:', isAdmin, 'isPastShutdown:', isPastShutdown);
      
      if (!isAdmin && !isPastShutdown) {
        console.log('SunsetPage: User is not admin and shutdown hasn\'t happened, redirecting to home...');
        router.replace('/');
      } else {
        console.log('SunsetPage: Access granted (Admin or post-shutdown)!');
      }
    }
  }, [authLoading, isInitializing, hasRole, router]);

  if (authLoading || isInitializing || settingsLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const shutdownDateStr = settings?.sunsetShutdownDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) || 'the scheduled date';

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="sunny-outline" size={120} color={accentPrimary} />
        </View>
        
        <ThemedText type="title" style={styles.title}>The Sun has Set</ThemedText>
        
        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          WizNote officially ceased operations on {shutdownDateStr}.
        </ThemedText>
        
        <View style={styles.divider} />
        
        <ThemedText style={[styles.description, { color: textColor }]}>
          We want to express our deepest gratitude for being part of our community. 
          Your trust and support over the last few months have meant the world to us.
        </ThemedText>
        
        <ThemedText style={[styles.subDescription, { color: textSecondary }]}>
          As of today, all servers have been decommissioned and user data has been securely deleted in accordance with our sunset policy.
        </ThemedText>
        
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: accentPrimary }]} 
            onPress={() => Linking.openURL('mailto:support@wiznote.app')}
          >
            <ThemedText style={styles.buttonText}>Contact Support</ThemedText>
          </TouchableOpacity>
        </View>
        
        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
          Thank you for the memories. 👋
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
    opacity: 0.9,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 48 : 36,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: '#6A5ACD',
    borderRadius: 2,
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 20,
  },
  subDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 40,
  },
  actionSection: {
    marginBottom: 40,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.5,
  },
});
