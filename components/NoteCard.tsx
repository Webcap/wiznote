import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Note } from '../types/Note';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NoteCard = ({ note, onPress, onTogglePin, onToggleArchive, onToggleFavorite, onDelete }: NoteCardProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => onDelete(note.id) 
        },
      ]
    );
  };

  const formatDate = (date: any) => {
    let dateObj: Date | null = null;

    if (!date) return '';

    // Firestore Timestamp object with toDate()
    if (typeof date === 'object' && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Firestore Timestamp as plain object with seconds/nanoseconds
    else if (
      typeof date === 'object' &&
      typeof date.seconds === 'number' &&
      typeof date.nanoseconds === 'number'
    ) {
      dateObj = new Date(date.seconds * 1000);
    }
    else if (date instanceof Date) {
      dateObj = date;
    }
    else if (typeof date === 'object' && typeof date.toString === 'function') {
      dateObj = new Date(date.toString());
    }
    else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return '';

    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return dateObj.toLocaleDateString();
  };

  // Check if note has audio content
  const isAudioNote = (note: Note) => {
    return (
      note.audioFiles && 
      note.audioFiles.length > 0
    ) || note.audioUri;
  };

  // Check if note has PDF content
  const isPDFNote = (note: Note) => {
    return (
      note.pdfFiles && 
      note.pdfFiles.length > 0
    ) || note.pdfUrl;
  };

  // Check if note has transcription
  const hasTranscription = (note: Note) => {
    return note.audioFiles?.some(audioFile => 
      audioFile.transcription || 
      audioFile.aiTranscription || 
      audioFile.userEditedTranscription
    ) || false;
  };



  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity testID="note-card" style={styles.card} onPress={() => onPress(note)}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {note.title || 'Untitled Note'}
            </Text>
            <View style={styles.titleIcons}>
              {note.isShared && (
                <Ionicons name="people" size={14} color="#6A5ACD" style={styles.shareIcon} />
              )}
              {note.isPinned && (
                <Ionicons testID="pin-icon" name="pin" size={16} color="#6A5ACD" style={styles.pinIcon} />
              )}
            </View>
          </View>
          <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
        </View>

        {/* Note Type Badge */}
        <View style={styles.noteTypeContainer}>
          {isPDFNote(note) ? (
            <View style={styles.pdfNoteBadge}>
              <Ionicons name="document" size={12} color="#E74C3C" />
              <Text style={styles.pdfNoteText}>PDF</Text>
            </View>
          ) : isAudioNote(note) ? (
            <View style={styles.audioNoteBadge}>
              <Ionicons name="musical-notes" size={12} color="#6A5ACD" />
              <Text style={styles.audioNoteText}>
                {hasTranscription(note) ? 'Audio + Transcription' : 'Audio Note'}
              </Text>
            </View>
          ) : (
            <View style={styles.textNoteBadge}>
              <Ionicons name="document-text" size={12} color="#3CB371" />
              <Text style={styles.textNoteText}>Text</Text>
            </View>
          )}
        </View>

        {note.content && (
          <Text style={styles.content} numberOfLines={3}>
            {note.content}
          </Text>
        )}

        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {note.tags.length > 3 && (
              <Text style={styles.moreTags}>+{note.tags.length - 3}</Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onToggleFavorite(note.id)}
          >
            <Ionicons
              name={note.isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={note.isFavorite ? '#FFD700' : '#A0A0A0'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onTogglePin(note.id)}
          >
            <Ionicons
              name={note.isPinned ? 'pin' : 'pin-outline'}
              size={20}
              color={note.isPinned ? '#6A5ACD' : '#A0A0A0'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onToggleArchive(note.id)}
          >
            <Ionicons
              name={note.isArchived ? 'archive' : 'archive-outline'}
              size={20}
              color={note.isArchived ? '#6A5ACD' : '#A0A0A0'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // This style is for the Animated.View, not the TouchableOpacity
    // The TouchableOpacity itself has its own styles.
  },
  card: {
    backgroundColor: '#282828',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minWidth: 0, // allow flex shrink
  },
  titleIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    minWidth: 0, // allow ellipsis
  },
  pinIcon: {
    marginTop: 2, // Align pin icon with text
  },
  shareIcon: {
    marginTop: 2, // Align share icon with text
  },
  date: {
    fontSize: 12,
    color: '#666666',
  },
  content: {
    fontSize: 14,
    color: '#A0A0A0',
    lineHeight: 20,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 10,
    color: '#A0A0A0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    width: 40, // Increased size for better touch target
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#333333',
  },
  noteTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  audioNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  audioNoteText: {
    fontSize: 12,
    color: '#6A5ACD',
    marginLeft: 4,
  },
  pdfNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdfNoteText: {
    fontSize: 12,
    color: '#E74C3C',
    marginLeft: 4,
    fontWeight: '600',
  },
  textNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textNoteText: {
    fontSize: 12,
    color: '#3CB371',
    marginLeft: 4,
  },
}); 