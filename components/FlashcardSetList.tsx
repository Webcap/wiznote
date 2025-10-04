import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { FlashcardService } from '../services/FlashcardService';
import { FlashcardSet } from '../types/Flashcards';
import { FlashcardStudyMode } from './FlashcardStudyMode';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface FlashcardSetListProps {
  userId: string;
  onClose?: () => void;
}

export const FlashcardSetList: React.FC<FlashcardSetListProps> = ({
  userId,
  onClose,
}) => {
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [showStudyMode, setShowStudyMode] = useState(false);

  const backgroundColor = useThemeColor('background');
  const cardBackground = useThemeColor('card');
  const textColor = useThemeColor('text');
  const mutedTextColor = useThemeColor('mutedText');
  const primaryColor = useThemeColor('primary');

  useEffect(() => {
    loadFlashcardSets();
  }, [userId]);

  const loadFlashcardSets = async () => {
    try {
      console.log('🔍 Loading flashcard sets for user:', userId);
      setLoading(true);
      const flashcardService = FlashcardService.getInstance();
      console.log('🔍 FlashcardService instance created');
      const sets = await flashcardService.getFlashcardSetsByUser(userId);
      console.log('🔍 Retrieved flashcard sets:', sets);
      setFlashcardSets(sets);
    } catch (error) {
      console.error('❌ Error loading flashcard sets:', error);
      Alert.alert('Error', 'Failed to load flashcard sets');
    } finally {
      setLoading(false);
    }
  };

  const handleStudySet = (flashcardSet: FlashcardSet) => {
    setSelectedSet(flashcardSet);
    setShowStudyMode(true);
  };

  const handleDeleteSet = async (flashcardSet: FlashcardSet) => {
    Alert.alert(
      'Delete Flashcard Set',
      `Are you sure you want to delete "${flashcardSet.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const flashcardService = FlashcardService.getInstance();
              await flashcardService.deleteFlashcardSet(flashcardSet.id, userId);
              await loadFlashcardSets(); // Reload the list
              Alert.alert('Success', 'Flashcard set deleted successfully');
            } catch (error) {
              console.error('Error deleting flashcard set:', error);
              Alert.alert('Error', 'Failed to delete flashcard set');
            }
          },
        },
      ]
    );
  };

  const handleStudyComplete = (results: any) => {
    setShowStudyMode(false);
    setSelectedSet(null);
    
    // Show completion summary
    Alert.alert(
      'Study Session Complete!',
      `Great job! You completed ${results.session.totalCards} flashcards.\n\n` +
      `Correct: ${results.session.correctAnswers}\n` +
      `Incorrect: ${results.session.incorrectAnswers}\n` +
      `Time: ${Math.round(results.session.timeSpent / 60)}m ${results.session.timeSpent % 60}s`,
      [
        {
          text: 'View Results',
          onPress: () => {
            // TODO: Navigate to detailed results view
            console.log('Study results:', results);
          },
        },
        {
          text: 'Close',
          style: 'cancel',
        },
      ]
    );
  };

  const renderFlashcardSet = ({ item }: { item: FlashcardSet }) => (
    <View style={[styles.setCard, { backgroundColor: cardBackground }]}>
      <View style={styles.setHeader}>
        <View style={styles.setInfo}>
          <ThemedText style={[styles.setTitle, { color: textColor }]}>
            {item.title}
          </ThemedText>
          <ThemedText style={[styles.setSubtitle, { color: mutedTextColor }]}>
            {item.description || 'No description'}
          </ThemedText>
        </View>
        
        <View style={styles.setStats}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: primaryColor }]}>
              {item.totalCards}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>
              Cards
            </ThemedText>
          </View>
          
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>
              {item.masteredCards}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: mutedTextColor }]}>
              Mastered
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.setActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: primaryColor }]}
          onPress={() => handleStudySet(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={16} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>Study</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: mutedTextColor }]}
          onPress={() => {
            // TODO: Navigate to set details/edit view
            Alert.alert('Coming Soon', 'Set editing will be available in the next phase');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create" size={16} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          onPress={() => handleDeleteSet(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={16} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>Delete</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.setFooter}>
        <ThemedText style={[styles.setDate, { color: mutedTextColor }]}>
          Created {new Date(item.createdAt).toLocaleDateString()}
        </ThemedText>
        {item.noteId && (
          <ThemedText style={[styles.setNote, { color: mutedTextColor }]}>
            From note: {item.noteId.substring(0, 8)}...
          </ThemedText>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={[styles.loadingText, { color: mutedTextColor }]}>
          Loading flashcard sets...
        </ThemedText>
      </ThemedView>
    );
  }

  if (flashcardSets.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <Ionicons name="card" size={64} color={mutedTextColor} />
        <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
          No Flashcard Sets Yet
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: mutedTextColor }]}>
          Create your first flashcard set from any note to get started studying!
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBackground }]}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          My Flashcard Sets
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: mutedTextColor }]}>
          {flashcardSets.length} set{flashcardSets.length !== 1 ? 's' : ''} available
        </ThemedText>
      </View>

      {/* Flashcard Sets List */}
      <FlatList
        data={flashcardSets}
        renderItem={renderFlashcardSet}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Study Mode Modal */}
      {showStudyMode && selectedSet && (
        <FlashcardStudyMode
          flashcardSet={selectedSet}
          onClose={() => {
            setShowStudyMode(false);
            setSelectedSet(null);
          }}
          onComplete={handleStudyComplete}
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  setCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  setInfo: {
    flex: 1,
    marginRight: 16,
  },
  setTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  setSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  setStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  setFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setDate: {
    fontSize: 12,
  },
  setNote: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
