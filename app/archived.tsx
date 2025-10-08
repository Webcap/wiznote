import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NoteCard } from '../components/NoteCard';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
// Import web components
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { WebNoteCard } from '../components/web/WebNoteCard';
import { useAuth } from '../hooks/useAuth';
import { useNotes } from '../hooks/useNotes';
import { useThemeColor } from '../hooks/useThemeColor';

export const options = {
  headerShown: false,
};

export default function ArchivedNotesScreen() {
  const { user, isAdmin } = useAuth();
  const { notes, loading, toggleArchive, toggleFavorite, deleteNote } = useNotes(user?.id || '');
  const router = useRouter();
  const navigation = useNavigation();
  const iconColor = useThemeColor({}, 'text');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const archivedNotes = (notes || [])
    .filter(n => n.isArchived)
    .sort((a, b) => {
      const aTime = a.updatedAt?.getTime ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.updatedAt?.getTime ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

  // Web-specific handlers

  const handleWebNotePress = (note: any) => {
    router.push(`/note/${note.id}`);
  };

  const handleWebEditNote = (note: any) => {
    router.push(`/create?noteId=${note.id}`);
  };

  const handleWebDeleteNote = async (note: any) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
    }
  };

  const handleWebArchiveNote = async (note: any) => {
    await toggleArchive(note.id);
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={
          <UserSidebar
            activePage="archived"
          />
        }
        header={
          <View style={styles.webHeader}>
            <TouchableOpacity style={styles.webBackButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={iconColor} />
              <ThemedText style={styles.webBackText}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderTitle}>
              Archived Notes
            </ThemedText>
            <View style={styles.webHeaderRight}>
              <ThemedText style={styles.webNoteCount}>
                {archivedNotes.length} {archivedNotes.length === 1 ? 'note' : 'notes'}
              </ThemedText>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {archivedNotes.length === 0 ? (
            <View style={styles.webEmptyState}>
              <Ionicons name="archive-outline" size={64} color="#A0A0A0" />
              <ThemedText style={styles.webEmptyTitle}>No archived notes</ThemedText>
              <ThemedText style={styles.webEmptySubtitle}>
                Notes you archive will appear here
              </ThemedText>
            </View>
          ) : (
            <View style={styles.webNotesGrid}>
              {archivedNotes.map((note) => (
                <WebNoteCard
                  key={note.id}
                  note={note}
                  onPress={() => handleWebNotePress(note)}
                  onEdit={() => handleWebEditNote(note)}
                  onDelete={() => handleWebDeleteNote(note)}
                  onArchive={() => handleWebArchiveNote(note)}
                  onToggleFavorite={() => toggleFavorite(note.id)}
                />
              ))}
            </View>
          )}
        </View>
      </WebLayout>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Archived Notes</ThemedText>
      </View>

      {archivedNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="archive-outline" size={64} color="#A0A0A0" />
          <ThemedText style={styles.emptyText}>No archived notes</ThemedText>
        </View>
      ) : (
        <FlatList
          data={archivedNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} onTogglePin={() => {}} onToggleArchive={() => {}} onToggleFavorite={() => toggleFavorite(item.id)} onDelete={() => {}} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#A0A0A0',
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: 40,
  },
  // New styles for web layout
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: -24,
    minWidth: 80,
  },
  webBackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webEmptyState: {
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
  webNotesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 5,
  },
}); 