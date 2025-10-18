import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { WebLayout } from '../components/web/WebLayout';
import UserTicketDetail from '../components/UserTicketDetail';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { supportService } from '../services/SupportService';

type TicketType = 'technical' | 'billing' | 'feature_request' | 'account_deletion' | 'other';

interface TicketTypeOption {
  value: TicketType;
  label: string;
  description: string;
  icon: string;
}

const TICKET_TYPES: TicketTypeOption[] = [
  {
    value: 'technical',
    label: 'Technical Issue',
    description: 'Report bugs, errors, or technical problems',
    icon: 'bug',
  },
  {
    value: 'billing',
    label: 'Billing Question',
    description: 'Questions about payments, subscriptions, or refunds',
    icon: 'card',
  },
  {
    value: 'feature_request',
    label: 'Feature Request',
    description: 'Suggest new features or improvements',
    icon: 'bulb',
  },
  {
    value: 'account_deletion',
    label: 'Delete My Account',
    description: 'Request permanent account deletion',
    icon: 'trash',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'General questions or feedback',
    icon: 'help-circle',
  },
];

export default function HelpScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  // Form state
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');
  
  // Ticket detail state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'ticket-detail'>('form');

  // User tickets state
  const [userTickets, setUserTickets] = useState<Array<{
    id: string;
    type: TicketType;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    subject: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }>>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const borderColor = useThemeColor({}, 'border');

  // Fetch user's tickets on mount
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user?.id) return;

      setIsLoadingTickets(true);
      try {
        const tickets = await supportService.getUserTickets(user.id);
        setUserTickets(tickets);
      } catch (error) {
        console.error('Error fetching user tickets:', error);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    fetchUserTickets();
  }, [user?.id]);

  // Update email when user changes
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleSubmit = async () => {
    // Validation
    if (!selectedType) {
      const message = 'Please select a ticket type';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Required', message);
      }
      return;
    }

    if (!subject.trim()) {
      const message = 'Please enter a subject';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Required', message);
      }
      return;
    }

    if (!description.trim()) {
      const message = 'Please describe your issue';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 4000);
      } else {
        Alert.alert('Required', message);
      }
      return;
    }

    // Only validate email if user is not signed in
    if (!user?.email) {
      if (!email.trim()) {
        const message = 'Please enter your email';
        if (Platform.OS === 'web') {
          showSnackbar(message, 'error', 4000);
        } else {
          Alert.alert('Required', message);
        }
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const message = 'Please enter a valid email address';
        if (Platform.OS === 'web') {
          showSnackbar(message, 'error', 4000);
        } else {
          Alert.alert('Invalid Email', message);
        }
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await supportService.createSupportTicket({
        email: email.trim(),
        subject: subject.trim(),
        description: description.trim(),
        type: selectedType,
        userId: user?.id,
        priority: selectedType === 'account_deletion' ? 'high' : 'medium',
      });

      if (result.success) {
        setTicketId(result.ticketId);
        setShowSuccess(true);

        // Reset form
        setSelectedType(null);
        setSubject('');
        setDescription('');

        // Refresh user tickets if signed in
        if (user?.id) {
          const tickets = await supportService.getUserTickets(user.id);
          setUserTickets(tickets);
        }

        if (Platform.OS === 'web') {
          showSnackbar(`✅ ${result.message}`, 'success', 6000);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit ticket';

      if (Platform.OS === 'web') {
        showSnackbar(`❌ ${errorMsg}`, 'error', 6000);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewTicket = () => {
    setShowSuccess(false);
    setTicketId('');
    setSelectedType(null);
    setSubject('');
    setDescription('');
  };

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setViewMode('ticket-detail');
  };

  const handleCloseTicket = () => {
    setSelectedTicket(null);
    setViewMode('form');
  };

  const renderContent = () => {
    // Show ticket detail view if selected
    if (viewMode === 'ticket-detail' && selectedTicket && user) {
      return (
        <UserTicketDetail
          ticket={selectedTicket}
          userId={user.id}
          userEmail={user.email}
          onBack={handleCloseTicket}
          onMessageSent={async () => {
            // Refresh tickets
            const tickets = await supportService.getUserTickets(user.id);
            setUserTickets(tickets);
          }}
        />
      );
    }

    if (showSuccess) {
      return (
        <View style={styles.successContainer}>
          <View style={[styles.successCard, { backgroundColor: backgroundSecondary, borderColor: accentSuccess }]}>
            <Ionicons name="checkmark-circle" size={64} color={accentSuccess} />
            <ThemedText style={styles.successTitle}>Ticket Submitted!</ThemedText>
            <ThemedText style={[styles.successMessage, { color: textSecondary }]}>
              Your support ticket has been created successfully.
            </ThemedText>
            <View style={[styles.ticketIdContainer, { backgroundColor, borderColor }]}>
              <ThemedText style={[styles.ticketIdLabel, { color: textSecondary }]}>Ticket ID:</ThemedText>
              <ThemedText style={[styles.ticketIdValue, { color: accentPrimary }]}>{ticketId}</ThemedText>
            </View>
            <ThemedText style={[styles.successSubtext, { color: textSecondary }]}>
              We'll respond to your email address within 24-48 hours.
            </ThemedText>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: accentPrimary }]}
                onPress={handleStartNewTicket}
              >
                <Text style={styles.buttonText}>Submit Another Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.secondaryButtonText, { color: textColor }]}>Back to App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <ThemedText type="title" style={styles.headerTitle}>How Can We Help?</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
            Submit a support ticket and we'll get back to you as soon as possible.
          </ThemedText>
        </View>

        {/* User's Open Tickets - Only show for signed-in users */}
        {user?.id && (
          <View style={styles.section}>
            <View style={styles.ticketsHeader}>
              <ThemedText style={styles.sectionLabel}>Your Support Tickets</ThemedText>
              {isLoadingTickets && <ActivityIndicator size="small" color={accentPrimary} />}
            </View>

            {!isLoadingTickets && userTickets.length === 0 && (
              <View style={[styles.emptyTickets, { backgroundColor: backgroundSecondary, borderColor }]}>
                <Ionicons name="checkmark-circle" size={48} color={accentSuccess} />
                <ThemedText style={[styles.emptyTicketsText, { color: textSecondary }]}>
                  No open tickets. You're all caught up!
                </ThemedText>
              </View>
            )}

            {userTickets.length > 0 && (
              <View style={styles.ticketsList}>
                {userTickets.map((ticket) => (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[styles.ticketCard, { backgroundColor: backgroundSecondary, borderColor }]}
                    onPress={() => handleOpenTicket(ticket)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ticketHeader}>
                      <View style={styles.ticketHeaderLeft}>
                        <Ionicons
                          name={
                            ticket.type === 'technical' ? 'bug' :
                            ticket.type === 'billing' ? 'card' :
                            ticket.type === 'feature_request' ? 'bulb' :
                            ticket.type === 'account_deletion' ? 'trash' :
                            'help-circle'
                          }
                          size={20}
                          color={accentPrimary}
                        />
                        <ThemedText style={styles.ticketSubject}>{ticket.subject}</ThemedText>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              ticket.status === 'resolved' || ticket.status === 'closed'
                                ? accentSuccess + '20'
                                : ticket.status === 'in_progress'
                                ? accentPrimary + '20'
                                : textSecondary + '20',
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.statusText,
                            {
                              color:
                                ticket.status === 'resolved' || ticket.status === 'closed'
                                  ? accentSuccess
                                  : ticket.status === 'in_progress'
                                  ? accentPrimary
                                  : textSecondary,
                            },
                          ]}
                        >
                          {ticket.status === 'in_progress' ? 'In Progress' : 
                           ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.ticketDescription, { color: textSecondary }]} numberOfLines={2}>
                      {ticket.description}
                    </ThemedText>
                    <View style={styles.ticketFooter}>
                      <ThemedText style={[styles.ticketMeta, { color: textSecondary }]}>
                        {ticket.createdAt.toLocaleDateString()} • ID: {ticket.id.split('_')[1]}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Ticket Type Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>What do you need help with? *</ThemedText>
          <View style={styles.ticketTypesGrid}>
            {TICKET_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.ticketTypeCard,
                  { 
                    backgroundColor: backgroundSecondary, 
                    borderColor: selectedType === type.value ? accentPrimary : borderColor,
                    borderWidth: selectedType === type.value ? 2 : 1,
                  }
                ]}
                onPress={() => setSelectedType(type.value)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={32} 
                  color={selectedType === type.value ? accentPrimary : textSecondary} 
                />
                <ThemedText style={[styles.ticketTypeLabel, selectedType === type.value && { color: accentPrimary }]}>
                  {type.label}
                </ThemedText>
                <ThemedText style={[styles.ticketTypeDescription, { color: textSecondary }]}>
                  {type.description}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Subject *</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: backgroundSecondary, color: textColor, borderColor }]}
            placeholder="Brief description of your issue"
            placeholderTextColor={textSecondary}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />
          <ThemedText style={[styles.helperText, { color: textSecondary }]}>
            {subject.length}/200 characters
          </ThemedText>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Description *</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: backgroundSecondary, color: textColor, borderColor }
            ]}
            placeholder="Please provide as much detail as possible about your issue..."
            placeholderTextColor={textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={2000}
          />
          <ThemedText style={[styles.helperText, { color: textSecondary }]}>
            {description.length}/2000 characters
          </ThemedText>
        </View>

        {/* Email Input - Only show for non-signed in users */}
        {!user?.email && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Your Email *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: backgroundSecondary, color: textColor, borderColor }]}
              placeholder="email@example.com"
              placeholderTextColor={textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ThemedText style={[styles.helperText, { color: textSecondary }]}>
              We'll send updates to this email address
            </ThemedText>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: accentPrimary },
              isSubmitting && { opacity: 0.6 }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { borderColor }]}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={[styles.helpSection, { backgroundColor: backgroundSecondary, borderColor }]}>
          <Ionicons name="information-circle" size={24} color={accentPrimary} />
          <View style={styles.helpTextContainer}>
            <ThemedText style={styles.helpTitle}>Response Time</ThemedText>
            <ThemedText style={[styles.helpText, { color: textSecondary }]}>
              We typically respond within 24-48 hours. For urgent issues, we'll prioritize your ticket.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    );
  };

  // Web Layout
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <WebLayout
          sidebar={null}
          header={
            <View style={styles.webHeader}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={styles.webBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={textColor} />
                <ThemedText style={styles.webBackText}>Back</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.webHeaderTitle}>Help & Support</ThemedText>
              <View style={styles.webHeaderSpacer} />
            </View>
          }
        >
          <View style={styles.webContent}>
            {renderContent()}
          </View>
        </WebLayout>
      </>
    );
  }

  // Mobile Layout
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {viewMode !== 'ticket-detail' && (
          <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <ThemedText type="title">Help & Support</ThemedText>
          </View>
        )}
        {renderContent()}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    gap: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ticketTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ticketTypeCard: {
    width: (Platform.OS === 'web' ? 'calc(50% - 6px)' : '48%') as any,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  ticketTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  ticketTypeDescription: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  // User tickets section styles
  ticketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketsList: {
    gap: 12,
  },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ticketMeta: {
    fontSize: 12,
  },
  emptyTickets: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTicketsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  submitSection: {
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 32,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    maxWidth: 500,
    width: '100%',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  ticketIdLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  ticketIdValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set inline
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

