import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { WebNoteCard } from '../components/web/WebNoteCard';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { NOTEZ_SHORTCUTS, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNotes } from '../hooks/useNotes';
import { Note } from '../types/Note';

export default function WebHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { notes, loading, deleteNote, toggleArchive, toggleFavorite } = useNotes(user?.id || '', user?.email || null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...NOTEZ_SHORTCUTS.NEW_NOTE,
      action: () => router.push('/create'),
    },
    {
      ...NOTEZ_SHORTCUTS.SEARCH,
      action: () => router.push('/search'),
    },
  ]);

  // Filter notes based on search
  const filteredNotes = (notes || []).filter(note => 
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNotePress = (note: Note) => {
    setSelectedNoteId(note.id);
    router.push(`/note/${note.id}`);
  };

  const handleEditNote = (note: Note) => {
    router.push(`/create?noteId=${note.id}`);
  };

  const handleDeleteNote = async (note: Note) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
    }
  };

  const handleArchiveNote = async (note: Note) => {
    await toggleArchive(note.id);
  };

  const handleCreateNote = () => {
    router.push('/create');
  };

  const handleSearch = () => {
    router.push('/search');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleJoinPremium = () => {
    router.push('join-premium');
  };

  // Debug premium button visibility
  console.log('Premium button debug:', {
    userPremiumActive: user?.premium?.isActive,
    premiumFeatureEnabled: isFeatureEnabled('premium_features'),
    userSignedIn: !!user?.id,
    shouldShowButton: user?.id && !user?.premium?.isActive && isFeatureEnabled('premium_features'),
    user: user ? { id: user.id, role: user.role, premium: user.premium } : 'no user',
    userExists: !!user,
    userAuthenticated: !!user?.id
  });

  // Force show button for testing (temporary)
  const forceShowButton = true;

  if (Platform.OS !== 'web') {
    return null;
  }



  return (
    <WebLayout
      title="My Notes"
      subtitle={filteredNotes.length > 0 ? `${filteredNotes.length} ${filteredNotes.length === 1 ? 'note' : 'notes'}` : undefined}
      sidebar={
        <UserSidebar
          activePage="home"
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      }
      header={
        (forceShowButton || (user?.id && !user?.premium?.isActive && isFeatureEnabled('premium_features'))) ? (
          <TouchableOpacity style={styles.premiumButton} onPress={handleJoinPremium}>
            <Ionicons name="star" size={18} color="#FF8C00" />
          </TouchableOpacity>
        ) : null
      }
      scrollable={false}
    >
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading notes...</ThemedText>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color="#666666" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first note to get started'
              }
            </ThemedText>
            {!searchQuery && (
              <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <ThemedText style={styles.createButtonText}>Create Note</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {filteredNotes.map((note) => (
              <WebNoteCard
                key={note.id}
                note={note}
                onPress={() => handleNotePress(note)}
                onEdit={() => handleEditNote(note)}
                onDelete={() => handleDeleteNote(note)}
                onArchive={() => handleArchiveNote(note)}
                onToggleFavorite={() => toggleFavorite(note.id)}
                isSelected={selectedNoteId === note.id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'column',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 6,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 16,
        paddingVertical: 14,
      },
    } : {}),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 24,
      },
      '@media (max-width: 480px)': {
        fontSize: 22,
      },
    } : {}),
  },
  noteCount: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 13,
      },
    } : {}),
  },
  content: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
      },
    } : {}),
  },
  scrollContentContainer: {
    flexGrow: 1,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: '100%',
        paddingHorizontal: 0,
      },
    } : {}),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    cursor: 'pointer',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 36,
        height: 36,
        borderRadius: 18,
      },
    } : {}),
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'stretch',
        maxWidth: '100%',
        width: '100%',
      },
      '@media (max-width: 480px)': {
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
    } : {}),
  },
}); 