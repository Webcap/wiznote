import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';

export default function PaymentSuccessMobileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, forceRefreshSession } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const successColor = useThemeColor({}, 'accentSuccess');

  useEffect(() => {
    // Animate the page in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Refresh user session to get updated premium status
    refreshUserSession();
  }, []);

  const refreshUserSession = async () => {
    try {
      setIsRefreshing(true);
      console.log('Refreshing user session to get updated premium status...');
      
      // Force refresh the user session to get updated premium status
      const refreshedUser = await forceRefreshSession();
      
      if (refreshedUser) {
        console.log('User session refreshed successfully');
        console.log('Premium status:', refreshedUser.premium);
      } else {
        console.log('Failed to refresh user session');
      }
    } catch (error) {
      console.error('Error refreshing user session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContinue = () => {
    // Navigate to the main app
    router.replace('/(tabs)');
  };

  const handleViewFeatures = () => {
    // Navigate to a features page or back to premium plans
    router.replace('/join-premium');
  };

  if (isRefreshing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={[styles.loadingContainer, { backgroundColor }]}>
          <LoadingSpinner size={60} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            {t('paymentSuccess.activatingPremium')}
          </ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {/* Success Animation */}
        <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: successColor + '20' }]}>
          <Ionicons name="checkmark-circle" size={80} color={successColor} />
        </View>

        {/* Success Message */}
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t('paymentSuccess.welcomeToPremium')}
        </ThemedText>
        
        <ThemedText style={[styles.subtitle, { color: textColor }]}>
          {t('paymentSuccess.subscriptionActive')}
        </ThemedText>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <ThemedText style={[styles.featuresTitle, { color: textColor }]}>
            {t('paymentSuccess.youNowHaveAccess')}
          </ThemedText>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="infinite" size={24} color={accentColor} />
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                {t('paymentSuccess.unlimitedNotes')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="mic" size={24} color={accentColor} />
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                {t('paymentSuccess.extendedVoiceRecording')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={24} color={accentColor} />
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                {t('paymentSuccess.aiPoweredFeatures')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={24} color={accentColor} />
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                {t('paymentSuccess.prioritySupport')}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Ionicons name="rocket" size={20} color="#FFFFFF" />
            <ThemedText style={styles.primaryButtonText}>
              {t('paymentSuccess.startUsingPremium')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: accentColor }]}
            onPress={handleViewFeatures}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: accentColor }]}>
              {t('paymentSuccess.viewAllFeatures')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Thank You Message */}
        <ThemedText style={[styles.thankYou, { color: textColor }]}>
          {t('paymentSuccess.thankYouMessage')}
        </ThemedText>
      </Animated.View>
    </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    borderRadius: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  thankYou: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
