import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useThemeColor } from '../../hooks/useThemeColor';
import { noteSharingService } from '../../services/NoteSharingService';
import { NoteShare, SharedNote } from '../../types/Note';
import { useTranslation } from '../../hooks/useTranslation';

// Import web components
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';

type TabType = 'received' | 'sent';

export default function SharedScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedNotes, setReceivedNotes] = useState<SharedNote[]>([]);
  const [sentShares, setSentShares] = useState<NoteShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'backgroundTertiary');

  // Load shared notes
  const loadSharedNotes = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'received') {
        const notes = await noteSharingService.getSharedNotesWithMe(user.id);
        setReceivedNotes(notes);
      } else {
        const shares = await noteSharingService.getNotesSharedByMe(user.id);
        setSentShares(shares);
      }
    } catch (err) {
      console.error('Error loading shared notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shared notes');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTab]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.id) {
        loadSharedNotes();
      }
    }, [isAuthenticated, user?.id, loadSharedNotes])
  );

  // Reload when tab changes
  useEffect(() => {
    loadSharedNotes();
  }, [activeTab, loadSharedNotes]);

  const handleNotePress = (note: SharedNote) => {
    router.push(`/note/${note.id}` as any);
  };

  const { showSnackbar } = useSnackbar();

  const handleRevokeShare = async (shareId: string) => {
    if (!user?.id) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('shared.confirmRevokeShare'));
      if (!confirmed) return;
      try {
        await noteSharingService.revokeShare(shareId, user.id);
        // Optimistically remove from local state to avoid stale UI
        setSentShares(prev => prev.filter(s => s.id !== shareId));
        await loadSharedNotes();
        showSnackbar(t('shared.revokeShare'), 'success');
      } catch (error) {
        console.error('Error revoking share:', error);
        showSnackbar(t('shared.failedRevokeShare'), 'error');
      }
      return;
    }

    Alert.alert(
      t('shared.revokeShare'),
      t('shared.confirmRevokeShare'),
      [
        { text: t('shared.cancel'), style: 'cancel' },
        {
          text: t('shared.revoke'),
          style: 'destructive',
          onPress: async () => {
            try {
              await noteSharingService.revokeShare(shareId, user.id);
              setSentShares(prev => prev.filter(s => s.id !== shareId));
              await loadSharedNotes();
            } catch (error) {
              console.error('Error revoking share:', error);
              Alert.alert(t('shared.error'), t('shared.failedRevokeShare'));
            }
          },
        },
      ]
    );
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'read':
        return 'eye';
      case 'edit':
        return 'create';
      case 'admin':
        return 'shield';
      default:
        return 'eye';
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'read':
        return '#6B7280';
      case 'edit':
        return '#3B82F6';
      case 'admin':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderReceivedNote = ({ item }: { item: SharedNote }) => (
    <View style={styles.noteContainer}>
      <NoteCard
        note={item}
        onPress={() => handleNotePress(item)}
        onTogglePin={() => {}} // Disabled for shared notes
        onToggleArchive={() => {}} // Disabled for shared notes
        onToggleFavorite={() => {}} // Disabled for shared notes
        onDelete={() => {}} // Disabled for shared notes
      />
      <View style={[styles.shareInfo, { backgroundColor: backgroundSecondary, borderColor }]}>
        <View style={styles.shareInfoLeft}>
          <Ionicons 
            name={getPermissionIcon(item.shareInfo.permission)} 
            size={16} 
            color={getPermissionColor(item.shareInfo.permission)} 
          />
          <ThemedText style={[styles.shareInfoText, { color: textSecondaryColor }]}>
            {t('shared.sharedBy')} {item.shareInfo.sharedBy.displayName || item.shareInfo.sharedBy.email}
          </ThemedText>
        </View>
        <ThemedText style={[styles.shareDate, { color: textSecondaryColor }]}>
          {new Date(item.shareInfo.sharedAt).toLocaleDateString()}
        </ThemedText>
      </View>
    </View>
  );

  const renderSentShare = ({ item }: { item: NoteShare }) => (
    <View style={[styles.shareItem, { backgroundColor: backgroundSecondary, borderColor }]}>
      <View style={styles.shareItemHeader}>
        <View style={styles.shareItemInfo}>
          <ThemedText style={[styles.shareItemTitle, { color: textColor }]} numberOfLines={1}>
            {(item as any).note?.title || t('shared.unknownNote')}
          </ThemedText>
          <ThemedText style={[styles.shareItemRecipient, { color: textSecondaryColor }]}>
            {item.sharedWithEmail || t('shared.unknownUser')}
          </ThemedText>
        </View>
        <View style={styles.shareItemActions}>
          <View style={[styles.permissionBadge, { backgroundColor: getPermissionColor(item.permissionLevel) }]}>
            <Ionicons 
              name={getPermissionIcon(item.permissionLevel)} 
              size={12} 
              color="#FFFFFF" 
            />
            <ThemedText style={styles.permissionBadgeText}>
              {item.permissionLevel}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleRevokeShare(item.id)}
          >
            <Ionicons name="close" size={16} color={accentPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      {item.message && (
        <ThemedText style={[styles.shareMessage, { color: textSecondaryColor }]} numberOfLines={2}>
          "{item.message}"
        </ThemedText>
      )}
      <ThemedText style={[styles.shareDate, { color: textSecondaryColor }]}>
        {t('shared.shared')} {new Date(item.createdAt).toLocaleDateString()}
      </ThemedText>
    </View>
  );

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title={t('shared.sharedNotes')}
        subtitle={t('shared.sharedNotesSubtitle')}
        sidebar={<UserSidebar activePage="shared" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">{t('shared.sharedNotes')}</ThemedText>
            <View style={styles.webHeaderActions}>
              <ThemedText style={[styles.webNoteCount, { color: accentPrimary }]}>
                {activeTab === 'received' ? receivedNotes.length : sentShares.length} {activeTab === 'received' ? t('shared.received') : t('shared.sent')}
              </ThemedText>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {/* Tab Selector */}
          <View style={[styles.tabSelector, { backgroundColor: backgroundSecondary, borderColor }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'received' && { backgroundColor: accentPrimary }
              ]}
              onPress={() => setActiveTab('received')}
            >
              <Ionicons 
                name="download" 
                size={16} 
                color={activeTab === 'received' ? '#FFFFFF' : textSecondaryColor} 
              />
              <ThemedText style={[
                styles.tabButtonText,
                { color: activeTab === 'received' ? '#FFFFFF' : textSecondaryColor }
              ]}>
                {t('shared.received')} ({receivedNotes.length})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'sent' && { backgroundColor: accentPrimary }
              ]}
              onPress={() => setActiveTab('sent')}
            >
              <Ionicons 
                name="share" 
                size={16} 
                color={activeTab === 'sent' ? '#FFFFFF' : textSecondaryColor} 
              />
              <ThemedText style={[
                styles.tabButtonText,
                { color: activeTab === 'sent' ? '#FFFFFF' : textSecondaryColor }
              ]}>
                {t('shared.sent')} ({sentShares.length})
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={50} />
              <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>
                {t('shared.loadingSharedNotes')}
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
              <ThemedText style={[styles.errorText, { color: textColor }]}>
                {error}
              </ThemedText>
              <TouchableOpacity style={styles.retryButton} onPress={loadSharedNotes}>
                <ThemedText style={styles.retryButtonText}>{t('shared.tryAgain')}</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notesContainer}>
              {activeTab === 'received' ? (
                receivedNotes.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#A0A0A0" />
                    <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                      {t('shared.noSharedNotes')}
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
                      {t('shared.sharedWithYou')}
                    </ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={receivedNotes}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReceivedNote}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                  />
                )
              ) : (
                sentShares.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="share-outline" size={64} color="#A0A0A0" />
                    <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                      {t('shared.noSentShares')}
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
                      {t('shared.yourShares')}
                    </ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={sentShares}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSentShare}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                  />
                )
              )}
            </View>
          )}
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          {t('shared.sharedNotes')}
        </ThemedText>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabSelector, { backgroundColor: backgroundSecondary, borderColor }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'received' && { backgroundColor: accentPrimary }
          ]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons 
            name="download" 
            size={16} 
            color={activeTab === 'received' ? '#FFFFFF' : textSecondaryColor} 
          />
          <ThemedText style={[
            styles.tabButtonText,
            { color: activeTab === 'received' ? '#FFFFFF' : textSecondaryColor }
          ]}>
            Received ({receivedNotes.length})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'sent' && { backgroundColor: accentPrimary }
          ]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons 
            name="share" 
            size={16} 
            color={activeTab === 'sent' ? '#FFFFFF' : textSecondaryColor} 
          />
          <ThemedText style={[
            styles.tabButtonText,
            { color: activeTab === 'sent' ? '#FFFFFF' : textSecondaryColor }
          ]}>
            Sent ({sentShares.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} />
          <ThemedText style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading shared notes...
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
          <ThemedText style={[styles.errorText, { color: textColor }]}>
            {error}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadSharedNotes}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.notesContainer}>
          {activeTab === 'received' ? (
            receivedNotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#A0A0A0" />
                <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                  No shared notes
                </ThemedText>
                <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
                  Notes shared with you will appear here
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={receivedNotes}
                keyExtractor={(item) => item.id}
                renderItem={renderReceivedNote}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            sentShares.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="share-outline" size={64} color="#A0A0A0" />
                <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                  No sent shares
                </ThemedText>
                <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
                  Notes you've shared will appear here
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={sentShares}
                keyExtractor={(item) => item.id}
                renderItem={renderSentShare}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  noteContainer: {
    marginBottom: 16,
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  shareInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareInfoText: {
    fontSize: 14,
  },
  shareDate: {
    fontSize: 12,
  },
  shareItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  shareItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shareItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  shareItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareItemRecipient: {
    fontSize: 14,
  },
  shareItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  permissionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  revokeButton: {
    padding: 4,
  },
  shareMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webNoteCount: {
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

