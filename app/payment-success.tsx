import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { refreshUser } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentSuccess');

  const verifySession = useCallback(async (sessionId: string, base: string, retryAttempt = 0) => {
    try {
      console.log(`PaymentSuccess: Attempting session verification (attempt ${retryAttempt + 1})`);
      
      const response = await fetch(`${base}/stripe/verify-session?session_id=` + encodeURIComponent(sessionId));
      console.log('PaymentSuccess: Verification response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('PaymentSuccess: Verification response data:', data);
      
      if (data.premiumGranted) {
        console.log('Premium access granted immediately:', data);
        
        // Refresh user data to get updated premium status
        try { 
          await refreshUser(); 
          console.log('User data refreshed successfully after premium upgrade');
          
          // Show success message
          if (Platform.OS === 'web') {
            // For web, we can show a more immediate success
            setVerifying(false);
          }
        } catch (error) {
          console.error('Failed to refresh user:', error);
          setVerifying(false);
        }
      } else {
        console.log('Session verified but premium not yet granted:', data);
        // Even if verification fails, try to refresh user data as a fallback
        try {
          await refreshUser();
          console.log('Fallback user refresh completed');
        } catch (error) {
          console.error('Fallback user refresh failed:', error);
        }
        setVerifying(false);
      }
      
      return true; // Success
    } catch (error) {
      console.error(`PaymentSuccess: Session verification failed (attempt ${retryAttempt + 1}):`, error);
      
      // Retry up to 2 times with exponential backoff
      if (retryAttempt < 2) {
        const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s
        console.log(`PaymentSuccess: Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          verifySession(sessionId, base, retryAttempt + 1);
        }, delay);
        
        return false; // Still in progress
      } else {
        // All retries failed, try fallback refresh
        console.log('PaymentSuccess: All retries failed, attempting fallback user refresh');
        try {
          await refreshUser();
          console.log('Fallback user refresh completed');
        } catch (refreshError) {
          console.error('Fallback user refresh failed:', refreshError);
        }
        setVerifying(false);
        return false; // Failed
      }
    }
  }, [refreshUser]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Wiznote';
    }
    
    // Verify the Stripe checkout session and refresh premium status
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    console.log('PaymentSuccess: Checking for session ID:', sessionId);
    console.log('PaymentSuccess: Platform:', Platform.OS);
    console.log('PaymentSuccess: Current URL:', window.location.href);
    
    if (!sessionId) {
      console.log('PaymentSuccess: No session ID found, skipping verification');
      return;
    }
    
    setVerifying(true);
    console.log('PaymentSuccess: Starting session verification for:', sessionId);
    
    const base = (
      process.env.EXPO_PUBLIC_WEBHOOK_BASE_URL ||
      (process.env as any).NEXT_PUBLIC_WEBHOOK_BASE_URL ||
      'http://127.0.0.1:3001'
    ).replace(/\/$/, '');
    
    console.log('PaymentSuccess: Using webhook base URL:', base);
    
    verifySession(sessionId, base);
  }, [verifySession]);

  // Refresh auth state when screen comes into focus (especially important for mobile)
  useFocusEffect(
    useCallback(() => {
      console.log('PaymentSuccess: Screen focused, refreshing auth state...');
      // Refresh user data to ensure premium status is up to date
      refreshUser();
    }, [refreshUser])
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={64} color={accentColor} />
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>Payment Successful</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          {verifying ? 'Verifying your subscription…' : 'Your premium features are now active!'}
        </ThemedText>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="home" size={20} color="#FFFFFF" />
          <ThemedText style={styles.buttonText}>Go to Home</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', gap: 12 as any },
  title: { marginTop: 8 },
  subtitle: { textAlign: 'center', marginBottom: 16 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, backgroundColor: '#22C55E', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});


