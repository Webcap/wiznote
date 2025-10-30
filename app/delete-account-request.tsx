import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Linking
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { Logo } from '../components/Logo';
import { supportService } from '../services/SupportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

// Import web components
import { WebLayout } from '../components/web/WebLayout';

export default function DeleteAccountRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Theme colors - following design.json guidelines
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textMuted = useThemeColor({}, 'textMuted');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const iconColor = useThemeColor({}, 'icon');

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      if (Platform.OS === 'web') {
        showSnackbar(t('deleteAccount.pleaseEnterValidEmail'), 'error');
      } else {
        Alert.alert(t('deleteAccount.invalidEmail'), t('deleteAccount.pleaseEnterValidEmail'));
      }
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting account deletion request...');
      
      // Submit to support ticket system
      const result = await supportService.createAccountDeletionRequest({
        email,
        reason,
        userId: user?.id, // Include user ID if authenticated
      });

      console.log('Deletion request result:', result);

      if (result.success) {
        // Show success message
        const successMessage = t('deleteAccount.successMessage', { ticketId: result.ticketId });
        
        if (Platform.OS === 'web') {
          showSnackbar(
            t('deleteAccount.successSnackbar', { ticketId: result.ticketId }),
            'success',
            5000
          );
          
          // Show detailed confirmation - don't redirect, just alert
          setTimeout(() => {
            alert(successMessage);
          }, 500);
        } else {
          Alert.alert(
            t('deleteAccount.requestSubmitted'),
            successMessage,
            [
              { text: t('common.done') }
            ]
          );
        }
        
        // Reset form
        setEmail('');
        setReason('');
      }
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      
      const errorMessage = error instanceof Error ? error.message : t('deleteAccount.submissionError');
      
      if (Platform.OS === 'web') {
        showSnackbar(
          t('deleteAccount.errorSnackbar', { error: errorMessage }),
          'error',
          5000
        );
      } else {
        Alert.alert(
          t('deleteAccount.submissionError'),
          t('deleteAccount.errorMessage', { error: errorMessage, email }),
          [{ text: t('common.done') }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render content
  const renderContent = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header - Mobile Only */}
      {Platform.OS !== 'web' && (
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      )}

      {/* Logo and Title */}
      <View style={styles.titleSection}>
        <Logo size={60} />
        <ThemedText style={styles.title}>{t('deleteAccount.title')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('deleteAccount.subtitle')}
        </ThemedText>
      </View>

      {/* Info Card */}
      <ThemedView style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={24} color={accentPrimary} />
          <View style={styles.infoTextContainer}>
            <ThemedText style={styles.infoTitle}>{t('deleteAccount.whatHappens')}</ThemedText>
            <ThemedText style={styles.infoText}>
              {t('deleteAccount.consequences')}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Form */}
      <ThemedView style={styles.formCard}>
        <ThemedText style={styles.formTitle}>{t('deleteAccount.formTitle')}</ThemedText>
        
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            {t('deleteAccount.emailLabel')} <ThemedText style={[styles.required, { color: accentDanger }]}>{t('deleteAccount.required')}</ThemedText>
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
            placeholder={t('deleteAccount.emailPlaceholder')}
            placeholderTextColor={textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ThemedText style={styles.helpText}>
            {t('deleteAccount.emailHelpText')}
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            {t('deleteAccount.reasonLabel')}
          </ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
            placeholder={t('deleteAccount.reasonPlaceholder')}
            placeholderTextColor={textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Ionicons 
            name={isSubmitting ? "hourglass" : "mail"} 
            size={20} 
            color="#FFFFFF" 
          />
          <ThemedText style={styles.submitButtonText}>
            {isSubmitting ? t('deleteAccount.submitting') : t('deleteAccount.submitButton')}
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.privacyNote}>
          {t('deleteAccount.privacyNote')}
        </ThemedText>
      </ThemedView>

      {/* Alternative Contact */}
      <ThemedView style={styles.contactCard}>
        <ThemedText style={styles.contactTitle}>{t('deleteAccount.needHelp')}</ThemedText>
        <ThemedText style={styles.contactText}>
          {t('deleteAccount.alternativeContact')}
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === 'web') {
              window.location.href = 'mailto:support@wiznote.app';
            } else {
              Linking.openURL('mailto:support@wiznote.app');
            }
          }}
        >
          <ThemedText style={[styles.emailLink, { color: accentPrimary }]}>support@wiznote.app</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title={t('deleteAccount.webTitle')}
        subtitle={t('deleteAccount.webSubtitle')}
        sidebar={null}
        header={
          <View style={styles.webHeader}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.webBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
              <ThemedText style={styles.webBackText}>{t('deleteAccount.back')}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderTitle}>{t('deleteAccount.webHeaderTitle')}</ThemedText>
            <View style={styles.webHeaderSpacer} />
          </View>
        }
      >
        <ThemedView style={styles.webContent}>
          {renderContent()}
        </ThemedView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  
  // Web Header - Following design.json web header pattern
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webBackText: {
    fontSize: 16,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  webHeaderSpacer: {
    width: 80,
  },
  webContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Scroll Content
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Extra padding for keyboard
  },
  
  // Mobile Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  
  // Title Section
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
  },
  
  // Info Card - Using ThemedView, no hardcoded colors
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  
  // Form Card - Using ThemedView, no hardcoded colors
  formCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  
  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    // Using accentDanger from theme - but for text we need inline style
    opacity: 1,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  helpText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  
  // Submit Button - Hardcoded danger color is acceptable for buttons per design system
  submitButton: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Privacy Note
  privacyNote: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 16,
    lineHeight: 18,
  },
  
  // Contact Card - Using ThemedView, no hardcoded colors
  contactCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  emailLink: {
    fontSize: 16,
    fontWeight: '600',
    // Color will be set using theme
  },
});

