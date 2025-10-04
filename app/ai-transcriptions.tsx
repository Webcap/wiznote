import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../hooks/useAuth';
import { useNotes } from '../hooks/useNotes';
import { useThemeColor } from '../hooks/useThemeColor';
import { NoteDetailStyles as styles } from '../styles/NoteDetailStyles';

export const config = {
  headerShown: false,
};

export default function AITranscriptionsScreen() {
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { notes, loading: notesLoading } = useNotes(user?.id || '');
  const router = useRouter();

  const iconColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#222' }, 'background');

  // Find the current note if noteId is provided
  const note = notes.find(n => n.id === noteId);

  // Gather all audio files for the current note, showing transcription, aiTranscription, or status
  const transcriptions = note
    ? (note.audioFiles || []).map(audio => {
        let displayText = '';
        if (audio.transcription && audio.transcription.trim() !== '') {
          displayText = audio.transcription;
        } else if (audio.aiTranscription && audio.aiTranscription.trim() !== '') {
          displayText = audio.aiTranscription;
        } else if (audio.transcriptionStatus && audio.transcriptionStatus !== 'completed') {
          displayText = `Transcription ${audio.transcriptionStatus}...`;
        } else {
          displayText = 'No transcription available.';
        }
        return {
          noteTitle: note.title,
          audioFileName: audio.filename,
          displayText,
        };
      })
    : [];

  if (authLoading || notesLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner size={50} />
        <ThemedText style={styles.loadingText}>Loading AI transcriptions...</ThemedText>
      </ThemedView>
    );
  }

  if (!noteId) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>No note selected</ThemedText>
        <ThemedText style={styles.errorSubtext}>Please select a note to view its AI transcriptions.</ThemedText>
      </ThemedView>
    );
  }

  if (!note) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Note not found</ThemedText>
        <ThemedText style={styles.errorSubtext}>The selected note does not exist or has been deleted.</ThemedText>
      </ThemedView>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>No AI transcriptions found</ThemedText>
        <ThemedText style={styles.errorSubtext}>This note has no audio files with AI transcriptions yet.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', paddingBottom: 20 }]}> 
        <TouchableOpacity onPress={() => router.replace(`/note/${noteId}`)} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { marginBottom: 0 }]}>Transcriptions</ThemedText>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {transcriptions.map((t, idx) => (
          <View key={idx} style={[styles.contentSection, { backgroundColor: cardBg, borderRadius: 12, marginBottom: 16, padding: 16 }]}> 
            <ThemedText style={[styles.headerTitle, { fontSize: 18, marginBottom: 4 }]}>{t.noteTitle}</ThemedText>
            <ThemedText style={[styles.sectionLabel, { marginBottom: 8 }]}>Audio File: {t.audioFileName}</ThemedText>
            <ThemedText style={styles.contentText}>{t.displayText}</ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
} 