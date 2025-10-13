import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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

export default function DeleteAccountRequestScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#2A2A2A' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F6FA', dark: '#1A1A1A' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'text');

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid email address');
      } else {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
      }
      return;
    }

    setIsSubmitting(true);

    // Create mailto link
    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(
      `I would like to request the deletion of my WizNote account and all associated data.\n\n` +
      `Account Email: ${email}\n\n` +
      `Reason for deletion (optional):\n${reason || 'Not provided'}\n\n` +
      `Please confirm the deletion of all my data including:\n` +
      `- My account profile\n` +
      `- All notes and documents\n` +
      `- All preferences and settings\n` +
      `- All subscription information\n\n` +
      `I understand this action cannot be undone.`
    );
    const mailtoUrl = `mailto:support@wiznote.app?subject=${subject}&body=${body}`;

    try {
      if (Platform.OS === 'web') {
        // For web, open mailto link
        window.location.href = mailtoUrl;
        
        // Show confirmation
        setTimeout(() => {
          if (confirm('Your email client should have opened with a pre-filled deletion request. If it didn\'t open, please email support@wiznote.app directly.\n\nWould you like to return to the home page?')) {
            router.push('/');
          }
          setIsSubmitting(false);
        }, 1000);
      } else {
        // For mobile, use Linking API
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        if (canOpen) {
          await Linking.openURL(mailtoUrl);
          Alert.alert(
            'Email Client Opened',
            'Your email client should have opened with a pre-filled deletion request. Please send the email to complete your request.\n\nYou should receive a confirmation within 24-48 hours.',
            [
              { text: 'OK', onPress: () => router.push('/') }
            ]
          );
        } else {
          Alert.alert(
            'Cannot Open Email',
            `Please email support@wiznote.app directly with your account email (${email}) to request deletion.`,
            [{ text: 'OK' }]
          );
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      if (Platform.OS === 'web') {
        alert(`Error opening email client. Please email support@wiznote.app directly with your account email (${email}) to request deletion.`);
      } else {
        Alert.alert(
          'Error',
          `Please email support@wiznote.app directly with your account email (${email}) to request deletion.`
        );
      }
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Logo and Title */}
        <View style={styles.titleSection}>
          <Logo size={60} />
          <ThemedText style={styles.title}>Account Deletion Request</ThemedText>
          <ThemedText style={styles.subtitle}>
            Request to delete your WizNote account and all associated data
          </ThemedText>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={24} color="#6A5ACD" />
            <View style={styles.infoTextContainer}>
              <ThemedText style={styles.infoTitle}>What happens when you delete your account?</ThemedText>
              <ThemedText style={styles.infoText}>
                • All your notes and documents will be permanently deleted{'\n'}
                • Your account profile and settings will be removed{'\n'}
                • Any active subscriptions will be cancelled{'\n'}
                • This action cannot be undone{'\n'}
                • Processing time: 24-48 hours
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.formTitle}>Deletion Request Form</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Email Address <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="Enter your account email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ThemedText style={styles.helpText}>
              Enter the email address associated with your WizNote account
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Reason for deletion (optional)
            </ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="Tell us why you're leaving (optional)"
              placeholderTextColor="#A0A0A0"
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
              {isSubmitting ? 'Opening Email Client...' : 'Submit Deletion Request'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.privacyNote}>
            By submitting this request, you confirm that you want to permanently delete your account and all associated data. You will receive a confirmation email within 24-48 hours.
          </ThemedText>
        </View>

        {/* Alternative Contact */}
        <View style={[styles.contactCard, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.contactTitle}>Need Help?</ThemedText>
          <ThemedText style={styles.contactText}>
            If you're having trouble with this form, you can also email us directly at:
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
            <ThemedText style={styles.emailLink}>support@wiznote.app</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
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
  formCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
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
  privacyNote: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 16,
    lineHeight: 18,
  },
  contactCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
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
    color: '#6A5ACD',
    fontWeight: '600',
  },
});

