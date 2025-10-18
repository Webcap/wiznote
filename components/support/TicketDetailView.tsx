import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { supportService } from '../../services/SupportService';

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderEmail: string;
  senderRole: string;
  senderName: string;
  message: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Ticket {
  id: string;
  type: string;
  status: string;
  priority: string;
  userEmail: string;
  userId?: string;
  subject: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TicketDetailViewProps {
  ticket: Ticket;
  supportAgentId: string;
  supportAgentEmail: string;
  onClose: () => void;
  onTicketUpdated?: () => void;
}

export default function TicketDetailView({
  ticket,
  supportAgentId,
  supportAgentEmail,
  onClose,
  onTicketUpdated,
}: TicketDetailViewProps) {
  const { showSnackbar } = useSnackbar();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
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
  const accentDanger = useThemeColor({}, 'accentDanger');
  const borderColor = useThemeColor({}, 'border');

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await supportService.getTicketMessages(ticket.id);
      setMessages(msgs);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (Platform.OS === 'web') {
        showSnackbar('Failed to load messages', 'error');
      } else {
        Alert.alert('Error', 'Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      if (Platform.OS === 'web') {
        showSnackbar('Please enter a message', 'error');
      } else {
        Alert.alert('Required', 'Please enter a message');
      }
      return;
    }

    setSending(true);
    try {
      const result = await supportService.sendTicketMessage({
        ticketId: ticket.id,
        senderId: supportAgentId,
        senderEmail: supportAgentEmail,
        senderRole: 'support',
        message: newMessage,
        isInternal,
      });

      if (result.success) {
        setNewMessage('');
        setIsInternal(false);
        await loadMessages();
        
        if (Platform.OS === 'web') {
          showSnackbar('Message sent successfully', 'success');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (Platform.OS === 'web') {
        showSnackbar('Failed to send message', 'error');
      } else {
        Alert.alert('Error', 'Failed to send message');
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
      case 'cancelled':
        return accentDanger;
      default:
        return accentPrimary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={accentPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Ticket Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Ticket Info */}
      <View style={[styles.ticketInfo, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <View style={styles.ticketInfoHeader}>
          <Text style={[styles.ticketSubject, { color: textColor }]}>{ticket.subject}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {ticket.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="person" size={16} color={textSecondary} />
            <Text style={[styles.metaText, { color: textSecondary }]}>From: {ticket.userEmail}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="pricetag" size={16} color={textSecondary} />
            <Text style={[styles.metaText, { color: textSecondary }]}>Type: {ticket.type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="flag" size={16} color={textSecondary} />
            <Text style={[styles.metaText, { color: textSecondary }]}>Priority: {ticket.priority}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={16} color={textSecondary} />
            <Text style={[styles.metaText, { color: textSecondary }]}>
              Created: {ticket.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor, borderColor }]}>
          <Text style={[styles.descriptionLabel, { color: textSecondary }]}>Original Request:</Text>
          <Text style={[styles.descriptionText, { color: textColor }]}>{ticket.description}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={accentPrimary} style={styles.loader} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbox-outline" size={48} color={textSecondary} />
            <Text style={[styles.emptyMessagesText, { color: textSecondary }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.senderRole === 'support' || msg.senderRole === 'admin';
            const isCurrentAgent = msg.senderId === supportAgentId;

            return (
              <View key={msg.id} style={styles.messageWrapper}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isAgent
                        ? (msg.isInternal ? accentWarning + '20' : accentPrimary + '20')
                        : backgroundSecondary,
                      borderColor: msg.isInternal ? accentWarning : borderColor,
                      borderWidth: msg.isInternal ? 2 : 1,
                      alignSelf: isAgent ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  {msg.isInternal && (
                    <View style={[styles.internalBadge, { backgroundColor: accentWarning }]}>
                      <Ionicons name="lock-closed" size={12} color="#FFF" />
                      <Text style={styles.internalBadgeText}>Internal Note</Text>
                    </View>
                  )}
                  <View style={styles.messageMeta}>
                    <Text style={[styles.senderName, { color: isAgent ? accentPrimary : textColor }]}>
                      {msg.senderName} {isCurrentAgent && '(You)'}
                    </Text>
                    <Text style={[styles.messageTime, { color: textSecondary }]}>
                      {msg.createdAt.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.messageText, { color: textColor }]}>{msg.message}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={[styles.inputContainer, { backgroundColor: backgroundSecondary, borderTopColor: borderColor }]}>
        {/* Internal Note Toggle */}
        <TouchableOpacity
          style={styles.internalToggle}
          onPress={() => setIsInternal(!isInternal)}
        >
          <Ionicons
            name={isInternal ? 'lock-closed' : 'lock-open'}
            size={20}
            color={isInternal ? accentWarning : textSecondary}
          />
          <Text style={[styles.internalToggleText, { color: isInternal ? accentWarning : textSecondary }]}>
            {isInternal ? 'Internal Note (Private)' : 'Public Reply'}
          </Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            placeholder="Type your message..."
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
              <Ionicons name="send" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  ticketInfo: {
    padding: 16,
    borderBottomWidth: 1,
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
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
  },
  descriptionCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
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
    padding: 16,
    gap: 12,
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
    fontSize: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 12,
  },
  internalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  internalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  senderName: {
    fontSize: 14,
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
    padding: 16,
    gap: 12,
  },
  internalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  internalToggleText: {
    fontSize: 14,
    fontWeight: '500',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

