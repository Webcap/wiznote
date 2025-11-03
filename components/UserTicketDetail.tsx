import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSnackbar } from '../contexts/SnackbarContext';
import { supportService } from '../services/SupportService';
import { useTranslation } from '../hooks/useTranslation';

interface UserTicketDetailProps {
  ticket: {
    id: string;
    type: string;
    status: string;
    priority: string;
    subject: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  };
  userId: string;
  userEmail: string;
  onBack: () => void;
  onMessageSent?: () => void;
}

export default function UserTicketDetail({
  ticket,
  userId,
  userEmail,
  onBack,
  onMessageSent,
}: UserTicketDetailProps) {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const borderColor = useThemeColor({}, 'border');

  // Load messages on mount and poll for updates
  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    
    return () => clearInterval(interval);
  }, [ticket.id]);

  const loadMessages = async () => {
    if (!loading) {
      setLoading(true);
    }
    
    try {
      const msgs = await supportService.getTicketMessages(ticket.id);
      // Filter out internal messages for users
      const publicMessages = msgs.filter(m => !m.isInternal);
      setMessages(publicMessages);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      if (Platform.OS === 'web') {
        showSnackbar(t('help.pleaseEnterMessage'), 'error');
      } else {
        Alert.alert(t('help.required'), t('help.pleaseEnterMessage'));
      }
      return;
    }

    setSending(true);
    try {
      const result = await supportService.sendTicketMessage({
        ticketId: ticket.id,
        senderId: userId,
        senderEmail: userEmail,
        senderRole: 'user',
        message: newMessage,
        isInternal: false,
      });

      if (result.success) {
        setNewMessage('');
        await loadMessages();
        onMessageSent?.();
        
        if (Platform.OS === 'web') {
          showSnackbar(t('help.messageSentSuccess'), 'success');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (Platform.OS === 'web') {
        showSnackbar(t('help.failedToSendMessage'), 'error');
      } else {
        Alert.alert(t('common.error'), t('help.failedToSendMessage'));
      }
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return accentSuccess;
      case 'in_progress':
        return accentWarning;
      default:
        return accentPrimary;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>{t('help.ticketDetails')}</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Ticket Info */}
      <View style={[styles.ticketInfo, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.ticketInfoHeader}>
          <ThemedText style={styles.ticketSubject}>{ticket.subject}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {ticket.status === 'in_progress' ? t('help.statusInProgress') : 
               ticket.status === 'pending' ? t('help.statusPending') :
               ticket.status === 'resolved' ? t('help.statusResolved') :
               ticket.status === 'closed' ? t('help.statusClosed') :
               ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.ticketMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="pricetag" size={14} color={textSecondary} />
            <ThemedText style={[styles.metaText, { color: textSecondary }]}>
              {t('help.type')} {(() => {
                // Convert snake_case to camelCase for translation keys
                const ticketTypeKey = ticket.type.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                return t(`help.ticketTypes.${ticketTypeKey}`) || ticket.type;
              })()}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={14} color={textSecondary} />
            <ThemedText style={[styles.metaText, { color: textSecondary }]}>
              {t('help.created')} {ticket.createdAt.toLocaleDateString()}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor, borderColor }]}>
          <ThemedText style={[styles.descriptionLabel, { color: textSecondary }]}>
            {t('help.yourRequest')}
          </ThemedText>
          <ThemedText style={[styles.descriptionText, { color: textColor }]}>
            {ticket.description}
          </ThemedText>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {loading && messages.length === 0 ? (
          <ActivityIndicator size="large" color={accentPrimary} style={styles.loader} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbox-outline" size={48} color={textSecondary} />
            <ThemedText style={[styles.emptyMessagesText, { color: textSecondary }]}>
              {t('help.noMessagesYet')}
            </ThemedText>
          </View>
        ) : (
          messages.map((msg) => {
            const isUser = msg.senderRole === 'user';
            const isCurrentUser = msg.senderId === userId;

            return (
              <View key={msg.id} style={styles.messageWrapper}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isUser
                        ? accentPrimary + '20'
                        : backgroundSecondary,
                      borderColor: isUser ? accentPrimary : borderColor,
                      borderWidth: 1,
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.messageMeta}>
                    <ThemedText style={[styles.senderName, { color: isUser ? accentPrimary : textColor }]}>
                      {isCurrentUser ? t('common.you') : msg.senderName}
                      {!isUser && ` (${t('help.support')})`}
                    </ThemedText>
                    <ThemedText style={[styles.messageTime, { color: textSecondary }]}>
                      {msg.createdAt.toLocaleString()}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.messageText, { color: textColor }]}>
                    {msg.message}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Message Input - Only show if ticket is not resolved/closed */}
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <View style={[styles.inputContainer, { backgroundColor: backgroundSecondary, borderTopColor: borderColor }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
              placeholder={t('help.typeYourMessage')}
              placeholderTextColor={textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: accentPrimary,
                  opacity: !newMessage.trim() || sending ? 0.5 : 1,
                },
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(ticket.status === 'resolved' || ticket.status === 'closed') && (
        <View style={[styles.closedNotice, { backgroundColor: accentSuccess + '20', borderColor: accentSuccess }]}>
          <Ionicons name="checkmark-circle" size={20} color={accentSuccess} />
          <ThemedText style={[styles.closedNoticeText, { color: accentSuccess }]}>
            {ticket.status === 'resolved' ? t('help.ticketHasBeenResolved') : t('help.ticketHasBeenClosed')}
          </ThemedText>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  ticketInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  ticketInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  ticketSubject: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ticketMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  descriptionCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 16,
  },
  loader: {
    marginTop: 32,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyMessagesText: {
    fontSize: 14,
    textAlign: 'center',
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 12,
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

