import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Logo } from '../../components/Logo';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { AudioUtils } from '../../services/AudioUtils';
import { featureFlagService } from '../../services/FeatureFlagService';
import { realtimeSyncService } from '../../services/RealtimeSyncService';
import { Note } from '../../types/Note';

// Import web components
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { WebNoteCard } from '../../components/web/WebNoteCard';

export default function HomeScreen() {
  console.log('HomeScreen: Component rendering...');
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { notes, loading, error, syncStatus, isRealtimeActive, togglePin, toggleArchive, deleteNote, getFilteredNotes, refreshNotes } = useNotes(
    authLoading ? '' : (user?.id || '')
  );

  // Set up real-time sync for notes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('HomeScreen: Setting up real-time sync for user:', user.id);
      
      // Set up note update handler
      realtimeSyncService.setNoteUpdateHandler((note) => {
        console.log('HomeScreen: Real-time note update received:', note.id);
        // Refresh notes to get the latest data
        if (refreshNotes) {
          refreshNotes();
        }
      });

      // Set up note delete handler
      realtimeSyncService.setNoteDeleteHandler((noteId) => {
        console.log('HomeScreen: Real-time note delete received:', noteId);
        // Refresh notes to get the latest data
        if (refreshNotes) {
          refreshNotes();
        }
      });

      // Set current user for real-time sync
      realtimeSyncService.setCurrentUser(user.id);

      return () => {
        console.log('HomeScreen: Cleaning up real-time sync');
        realtimeSyncService.setCurrentUser(null);
      };
    }
  }, [isAuthenticated, user?.id, refreshNotes]);

  // Temporary debug logging to understand authentication state
  useEffect(() => {
    console.log('HomeScreen: Authentication Debug Info:');
    console.log('  - user:', user);
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user?.id:', user?.id);
    console.log('  - user?.email:', user?.email);
    console.log('  - user?.displayName:', user?.displayName);
    console.log('  - authLoading:', authLoading);
    console.log('  - notes loading:', loading);
    console.log('  - notes count:', notes.length);
  }, [user, isAuthenticated, authLoading, loading, notes.length]);

  // Force initialize feature flags if not loaded
  useEffect(() => {
    const initializeFlags = async () => {
      try {
        console.log('HomeScreen: Checking feature flags...');
        const currentFlags = featureFlagService.getAllFlags();
        console.log('HomeScreen: Current flags:', Object.keys(currentFlags));
        
        if (Object.keys(currentFlags).length === 0) {
          console.log('HomeScreen: No flags found, initializing...');
          // HomeScreen is only rendered when user is authenticated
          await featureFlagService.initialize(true);
          console.log('HomeScreen: Flags initialized:', Object.keys(featureFlagService.getAllFlags()));
        }
      } catch (error) {
        console.error('HomeScreen: Error initializing feature flags:', error);
      }
    };

    initializeFlags();
  }, []);

  // Refresh notes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authLoading && refreshNotes) {
        console.log('HomeScreen: Screen focused, refreshing notes...');
        refreshNotes();
      }
    }, [isAuthenticated, authLoading, refreshNotes])
  );
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const iconColor = useThemeColor({}, 'text');
  const sortOrderButtonBg = useThemeColor({ light: '#E5E7EB', dark: '#282828' }, 'background');
  const premiumButtonBg = useThemeColor({ light: '#FF8C00', dark: '#FF8C00' }, 'tint');
  const premiumIconColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const handleNotePress = (note: Note) => {
    router.push(`/note/${note.id}` as any);
  };

  const handleCreateNote = useCallback(() => {
    console.log('Create button pressed, showCreateOptions:', showCreateOptions);
    // Prevent multiple rapid clicks
    if (showCreateOptions) return;
    setShowCreateOptions(true);
  }, [showCreateOptions]);

  const handleCreateTextNote = useCallback(() => {
    console.log('Text note button pressed');
    setShowCreateOptions(false);
    router.push('/create' as any);
  }, [router]);

  const handleCreateAudioNote = useCallback(async () => {
    console.log('Audio note button pressed');
    
    try {
      // Check microphone permission
      const permission = await AudioUtils.requestPermissions();
      
      if (permission.status === 'granted') {
        // Permission already granted, navigate to audio screen
        setShowCreateOptions(false);
        router.push('/create-audio' as any);
              } else if (permission.status === 'undetermined') {
          // Permission not determined, request it
          const newPermission = await AudioUtils.requestPermissions();
        
        if (newPermission.status === 'granted') {
          // Permission granted, navigate to audio screen
          setShowCreateOptions(false);
          router.push('/create-audio' as any);
        } else {
          // Permission denied
          Alert.alert(
            'Microphone Permission Required',
            'Audio recording requires microphone access. Please grant permission in your device settings to create audio notes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // On web, we can't open settings, so just show instructions
                Alert.alert(
                  'How to Grant Permission',
                  '1. Go to your browser settings\n2. Find microphone permissions\n3. Allow microphone access for this site\n4. Try creating an audio note again'
                );
              }}
            ]
          );
        }
      } else {
        // Permission denied, show alert
        Alert.alert(
          'Microphone Permission Denied',
          'Audio recording requires microphone access. Please grant permission in your device settings to create audio notes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On web, we can't open settings, so just show instructions
              Alert.alert(
                'How to Grant Permission',
                '1. Go to your browser settings\n2. Find microphone permissions\n3. Allow microphone access for this site\n4. Try creating an audio note again'
              );
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to check microphone permissions. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleCreateAudioNote() }
        ]
      );
    }
  }, [router]);

  const handleCloseCreateOptions = useCallback(() => {
    setShowCreateOptions(false);
  }, []);



  const handlePremiumPress = () => {
    router.push('join-premium');
  };





  const filteredNotes = getFilteredNotes({
    searchQuery: '',
    tags: [],
    showArchived: false,
    sortBy: 'updatedAt',
    sortOrder: sortOrder,
  });

  // Debug logging for notes
  useEffect(() => {
    console.log('HomeScreen: Notes debug info:');
    console.log('  - Total notes:', notes.length);
    console.log('  - Filtered notes:', filteredNotes.length);
    console.log('  - Notes:', notes.map(n => ({ id: n.id, title: n.title, isArchived: n.isArchived })));
  }, [notes, filteredNotes]);

  // Split filtered notes into pinned and unpinned
  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  // Web-specific handlers for note cards
  const handleWebCreateNote = () => {
    router.push('create');
  };

  const handleWebEditNote = (note: Note) => {
    router.push(`/create?noteId=${note.id}`);
  };

  const handleWebDeleteNote = async (note: Note) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
    }
  };

  const handleWebArchiveNote = async (note: Note) => {
    await toggleArchive(note.id);
  };

  // Web layout
  if (Platform.OS === 'web') {

    if (loading) {
      console.log('HomeScreen: Notes loading, showing loading screen');
      return (
        <WebLayout
          sidebar={
            <UserSidebar
              activePage="home"
            />
          }
          header={
            <View style={styles.webHeader}>
              <ThemedText type="title">My Notes</ThemedText>
              <ThemedText style={styles.webLoadingText}>Loading...</ThemedText>
            </View>
          }
        >
          <View style={styles.webLoadingContainer}>
            <LoadingSpinner size={50} />
            <ThemedText style={styles.webLoadingText}>Loading your notes...</ThemedText>
          </View>
        </WebLayout>
      );
    }

    if (error) {
      return (
        <WebLayout
          sidebar={
            <UserSidebar
              activePage="home"
            />
          }
          header={
            <View style={styles.webHeader}>
              <ThemedText type="title">My Notes</ThemedText>
            </View>
          }
        >
          <View style={styles.webErrorContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            <ThemedText style={styles.webErrorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.webRetryButton} onPress={() => window.location.reload()}>
              <ThemedText style={styles.webRetryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </WebLayout>
      );
    }

    console.log('HomeScreen: Rendering main content with', filteredNotes.length, 'notes');
    return (
      <WebLayout
        sidebar={
          <UserSidebar
            activePage="home"
          />
        }
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <ThemedText type="title">My Notes</ThemedText>
            </View>
            <View style={styles.webHeaderActions}>
              {/* Sync Status Indicator */}
              <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
              
              {/* Force show for debugging */}
              {!user?.premium?.isActive && (
                <TouchableOpacity style={styles.webPremiumButton} onPress={handlePremiumPress}>
                  <MaterialCommunityIcons name="crown" size={16} color="#FF8C00" />
                  <ThemedText style={styles.webPremiumButtonText}>Join Premium</ThemedText>
                </TouchableOpacity>
              )}

              <ThemedText style={styles.webNoteCount}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </ThemedText>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {filteredNotes.length === 0 ? (
            <View style={styles.webEmptyContainer}>
              <Ionicons name="document-outline" size={64} color="#666666" />
              <ThemedText type="subtitle" style={styles.webEmptyTitle}>
                No notes yet
              </ThemedText>
              <ThemedText style={styles.webEmptySubtitle}>
                Create your first note to get started
              </ThemedText>
              <TouchableOpacity style={styles.webCreateButton} onPress={handleWebCreateNote}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <ThemedText style={styles.webCreateButtonText}>Create Note</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.webNotesGrid}>
              {filteredNotes.map((note) => (
                <WebNoteCard
                  key={note.id}
                  note={note}
                  onPress={() => handleNotePress(note)}
                  onEdit={() => handleWebEditNote(note)}
                  onDelete={() => handleWebDeleteNote(note)}
                  onArchive={() => handleWebArchiveNote(note)}
                />
              ))}
            </View>
          )}
        </View>
      </WebLayout>
    );
  }

  // Mobile layout (existing code)
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Logo size={40} />
            <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
            <Ionicons name="add" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.notesSection}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={50} />
            <ThemedText style={styles.loadingText}>Loading your notes...</ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Logo size={40} />
            <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
            <Ionicons name="add" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.notesSection}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={40} />
          <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Sync Status Indicator */}
                      <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
          
          {/* Force show for debugging */}
          {!user?.premium?.isActive && (
            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: premiumButtonBg }]}
              onPress={handlePremiumPress}
              testID="premium-button"
              accessibilityLabel="Join Premium"
            >
              <MaterialCommunityIcons name="crown" size={22} color={premiumIconColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote} testID="create-button">
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="add" size={24} color={iconColor} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.notesSection}>
        <View style={styles.notesSectionHeader}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.sortOrderContainer}>
            <TouchableOpacity
              style={[styles.sortOrderButton, { backgroundColor: sortOrderButtonBg }]}
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <Ionicons
                name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                size={18}
                color={iconColor}
              />
              <ThemedText style={styles.sortOrderText}>
                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {pinnedNotes.length === 0 && unpinnedNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#A0A0A0" />
            <ThemedText style={styles.emptyText}>No notes yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap the + button to create your first note
            </ThemedText>

          </View>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <ThemedText style={styles.pinnedLabel}>Pinned</ThemedText>
                <FlatList
                  data={pinnedNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NoteCard
                      note={item}
                      onPress={handleNotePress}
                      onTogglePin={togglePin}
                      onToggleArchive={toggleArchive}
                      onDelete={deleteNote}
                    />
                  )}
                  contentContainerStyle={[styles.listContainer, { paddingBottom: 32 }]}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
            {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
              <View style={styles.sectionDivider} />
            )}
            {unpinnedNotes.length > 0 && (
              <>
                <ThemedText style={styles.othersLabel}>Others</ThemedText>
                <FlatList
                  data={unpinnedNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NoteCard
                      note={item}
                      onPress={handleNotePress}
                      onTogglePin={togglePin}
                      onToggleArchive={toggleArchive}
                      onDelete={deleteNote}
                    />
                  )}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </>
        )}
      </View>
      
      {/* Create Options Bottom Sheet */}
      <CreateOptionsSheet
        visible={showCreateOptions}
        onClose={handleCloseCreateOptions}
        onTextNote={handleCreateTextNote}
        onAudioNote={handleCreateAudioNote}
        isVoiceRecordingEnabled={isFeatureEnabled('voice_recording')}
        testID="create-options-sheet"
      />
    </ThemedView>
  );
}

// Bottom Sheet Component
const CreateOptionsSheet = ({ 
  visible, 
  onClose, 
  onTextNote, 
  onAudioNote,
  isVoiceRecordingEnabled,
  testID
}: {
  visible: boolean;
  onClose: () => void;
  onTextNote: () => void;
  onAudioNote: () => void;
  isVoiceRecordingEnabled: boolean;
  testID?: string;
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [isVisible, setIsVisible] = useState(false);
  const slideCardBg = useThemeColor({ light: '#fff', dark: '#2A2A2A' }, 'background');
  const optionBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const chevronColor = useThemeColor({ light: '#A0A0A0', dark: '#666666' }, 'text');

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible, slideAnim]);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay} testID={testID}>
      <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
      <Animated.View 
        style={[
          styles.bottomSheet,
          { backgroundColor: slideCardBg },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.bottomSheetHandle} />
        
        <ThemedText style={styles.bottomSheetTitle}>Create Note</ThemedText>
        <ThemedText style={styles.bottomSheetSubtitle}>Choose the type of note you want to create</ThemedText>
        
        <View style={styles.createOptions}>
          <TouchableOpacity 
            style={[styles.createOption, { backgroundColor: optionBg }]} 
            onPress={onTextNote} 
            testID="text-note-button"
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <View style={styles.createOptionIcon}>
              <Ionicons name="document-text" size={24} color="#6A5ACD" />
            </View>
            <View style={styles.createOptionContent}>
              <ThemedText style={styles.createOptionTitle}>Text Note</ThemedText>
              <ThemedText style={styles.createOptionDescription}>Write notes with text and formatting</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          </TouchableOpacity>

          {isVoiceRecordingEnabled && (
            <TouchableOpacity 
              style={[styles.createOption, { backgroundColor: optionBg }]} 
              onPress={onAudioNote} 
              testID="audio-note-button"
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <View style={styles.createOptionIcon}>
                <Ionicons name="mic" size={24} color="#6A5ACD" />
              </View>
              <View style={styles.createOptionContent}>
                <ThemedText style={styles.createOptionTitle}>Audio Note</ThemedText>
                <ThemedText style={styles.createOptionDescription}>Record voice notes with AI transcription</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={chevronColor} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#6A5ACD',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  notesSection: {
    flex: 1,
    paddingHorizontal: 40,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    color: '#A0A0A0',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#A0A0A0',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#FF6B6B',
  },
  sampleButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  sampleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: '#4CAF50',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    }),
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bottomSheetSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 20,
  },
  createOptions: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  createOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  createOptionContent: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  createOptionDescription: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  cancelButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sortOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortOrderText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pinnedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
    marginBottom: 8,
    marginTop: 8,
  },
  othersLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A0A0A0',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 16,
  },
  premiumButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.18)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webHeaderLeft: {
    flex: 1,
  },
  webLoadingText: {
    fontSize: 16,
    color: '#A0A0A0',
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webErrorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#FF6B6B',
  },
  webRetryButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  webRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webNoteCount: {
    fontSize: 16,
    color: '#6A5ACD',
    fontWeight: '600',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webPremiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
    cursor: 'pointer',
  },
  webPremiumButtonText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  webEmptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    color: '#A0A0A0',
  },
  webCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  webCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  webNotesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 5,
  },
});