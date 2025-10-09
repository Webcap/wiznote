import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { WebNoteCard } from '../../components/web/WebNoteCard';
import { useAuth } from '../../hooks/useAuth';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Note } from '../../types/Note';

export const options = {
  headerShown: false,
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { notes, loading, toggleFavorite, togglePin, toggleArchive, deleteNote } = useNotes(user?.id || '');
  const router = useRouter();
  const iconColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');

  const favoriteNotes = (notes || [])
    .filter(n => n.isFavorite && !n.isArchived)
    .sort((a, b) => {
      const aTime = a.updatedAt?.getTime ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.updatedAt?.getTime ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

  // Web-specific handlers
  const handleWebNotePress = (note: Note) => {
    router.push(`/note/${note.id}`);
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

  const handleWebToggleFavorite = async (note: Note) => {
    await toggleFavorite(note.id);
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={
          <UserSidebar activePage="favorites" />
        }
      >
        <View style={styles.webContainer}>
          <View style={[styles.webHeader, { backgroundColor: cardBackground }]}>
            <View style={styles.webHeaderLeft}>
              <Ionicons name="star" size={28} color="#FFD700" />
              <ThemedText style={styles.webTitle}>Favorite Notes</ThemedText>
            </View>
            <ThemedText style={[styles.webCount, { color: iconColor }]}>
              {favoriteNotes.length} {favoriteNotes.length === 1 ? 'note' : 'notes'}
            </ThemedText>
          </View>

          {favoriteNotes.length === 0 ? (
            <View style={styles.webEmptyState}>
              <Ionicons name="star-outline" size={64} color="#FFD700" />
              <ThemedText style={styles.webEmptyTitle}>No Favorite Notes</ThemedText>
              <ThemedText style={styles.webEmptySubtitle}>
                Star your important notes to see them here
              </ThemedText>
              <TouchableOpacity 
                style={styles.webBackButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                <ThemedText style={styles.webBackButtonText}>Back to All Notes</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.webNotesGrid}>
              {favoriteNotes.map((note) => (
                <WebNoteCard
                  key={note.id}
                  note={note}
                  onPress={() => handleWebNotePress(note)}
                  onEdit={() => handleWebEditNote(note)}
                  onDelete={() => handleWebDeleteNote(note)}
                  onArchive={() => handleWebArchiveNote(note)}
                  onToggleFavorite={() => handleWebToggleFavorite(note)}
                />
              ))}
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
      <View style={[styles.header, { backgroundColor: cardBackground }]}>
        <View style={styles.headerContent}>
          <Ionicons name="star" size={24} color="#FFD700" />
          <ThemedText style={[styles.title, { color: textColor }]}>Favorites</ThemedText>
        </View>
        <ThemedText style={[styles.count, { color: iconColor }]}>
          {favoriteNotes.length}
        </ThemedText>
      </View>

      {/* Content */}
      {favoriteNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={64} color="#FFD700" />
          <ThemedText style={[styles.emptyText, { color: textColor }]}>No Favorite Notes</ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: iconColor }]}>
            Star your important notes to see them here
          </ThemedText>
          <TouchableOpacity 
            style={styles.goToNotesButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
            <ThemedText style={styles.goToNotesButtonText}>View All Notes</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favoriteNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard 
              note={item} 
              onPress={() => router.push(`/note/${item.id}`)} 
              onTogglePin={() => togglePin(item.id)} 
              onToggleArchive={() => toggleArchive(item.id)} 
              onToggleFavorite={() => toggleFavorite(item.id)}
              onDelete={() => deleteNote(item.id)} 
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Mobile styles
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  count: {
    fontSize: 14,
    opacity: 0.6,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  goToNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  goToNotesButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },

  // Web styles
  webContainer: {
    flex: 1,
    padding: 0,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  webCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  webEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  webEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
  },
  webEmptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  webBackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  webNotesGrid: {
    padding: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});

