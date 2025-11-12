import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useNotes } from '../hooks/useNotes';
import { useThemeColor } from '../hooks/useThemeColor';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useTranslation } from '../hooks/useTranslation';

export const config = {
  headerShown: false,
};

interface TimestampSegment {
  timestamp: string;
  text: string;
  startSeconds: number;
}

// Parse transcription text to extract timestamp segments
// Supports formats like: [00:12] text, (00:12) text, 00:12 text, etc.
function parseTranscriptionWithTimestamps(text: string, duration?: number): TimestampSegment[] {
  if (!text || text.trim() === '') {
    return [];
  }

  try {
    // Pattern to match timestamps in various formats: [00:12], (00:12), 00:12, etc.
    // Simplified pattern to avoid regex syntax issues
    const timestampPattern = /\[?\(?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[\]\)\s]*/g;
    const segments: TimestampSegment[] = [];
    const matches: Array<{ index: number; timestamp: string; startSeconds: number }> = [];
    
    // Find all timestamp matches first
    let match;
    const matchesArray: RegExpExecArray[] = [];
    timestampPattern.lastIndex = 0; // Reset regex
    while ((match = timestampPattern.exec(text)) !== null) {
      matchesArray.push(match);
    }
    
    // Process matches
    matchesArray.forEach((match) => {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      const startSeconds = hours * 3600 + minutes * 60 + seconds;
      
      matches.push({
        index: match.index,
        timestamp: formatTimestamp(startSeconds),
        startSeconds,
      });
    });
    
    // If we found timestamps, create segments
    if (matches.length > 0) {
      let lastIndex = 0;
      
      matches.forEach((timestampMatch, idx) => {
        // Find the end of the timestamp marker (after brackets, parentheses, or colon)
        let textStart = timestampMatch.index;
        const afterMatch = text.substring(timestampMatch.index);
        const markerEnd = afterMatch.search(/[:\]\s\)]/);
        if (markerEnd >= 0) {
          textStart = timestampMatch.index + markerEnd + 1;
        }
        
        // Add text before this timestamp if any
        if (textStart > lastIndex) {
          const prevText = text.substring(lastIndex, textStart).trim();
          if (prevText) {
            segments.push({
              timestamp: idx > 0 ? segments[segments.length - 1].timestamp : '00:00',
              text: prevText,
              startSeconds: idx > 0 ? segments[segments.length - 1].startSeconds : 0,
            });
          }
        }
        
        // Get text for this timestamp (until next timestamp or end)
        const textEnd = idx < matches.length - 1 ? matches[idx + 1].index : text.length;
        const segmentText = text.substring(textStart, textEnd).trim();
        
        if (segmentText) {
          segments.push({
            timestamp: timestampMatch.timestamp,
            text: segmentText,
            startSeconds: timestampMatch.startSeconds,
          });
        }
        
        lastIndex = textEnd;
      });
      
      // Add remaining text after last timestamp
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex).trim();
        if (remainingText && segments.length > 0) {
          segments.push({
            timestamp: segments[segments.length - 1].timestamp,
            text: remainingText,
            startSeconds: segments[segments.length - 1].startSeconds,
          });
        }
      }
    }
    
    // If no timestamps found, split by sentences and estimate
    if (segments.length === 0) {
      const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim());
      if (sentences.length > 1) {
        const estimatedDuration = duration || 60;
        const timePerSentence = estimatedDuration / sentences.length;
        
        sentences.forEach((sentence, index) => {
          segments.push({
            timestamp: formatTimestamp(Math.floor(index * timePerSentence)),
            text: sentence.trim(),
            startSeconds: Math.floor(index * timePerSentence),
          });
        });
      } else {
        segments.push({
          timestamp: '00:00',
          text: text,
          startSeconds: 0,
        });
      }
    }
    
    return segments;
  } catch (error) {
    console.error('Error parsing transcription with timestamps:', error);
    // Fallback: return whole text as single segment
    return [{
      timestamp: '00:00',
      text: text,
      startSeconds: 0,
    }];
  }
}

// Format seconds to MM:SS or HH:MM:SS
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function AITranscriptionsScreen() {
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { notes, loading: notesLoading } = useNotes(user?.id || '', user?.email || null);
  const router = useRouter();
  const { t } = useTranslation();

  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textMuted = useThemeColor({}, 'textMuted');
  const iconColor = useThemeColor({}, 'icon');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#222' }, 'backgroundSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  // Find the current note if noteId is provided
  const note = notes.find(n => n.id === noteId);

  // Gather all audio files with parsed transcriptions
  const transcriptions = note
    ? (note.audioFiles || []).map(audio => {
        let displayText = '';
        let status = '';
        
        if (audio.transcription && audio.transcription.trim() !== '') {
          displayText = audio.transcription;
        } else if (audio.aiTranscription && audio.aiTranscription.trim() !== '') {
          displayText = audio.aiTranscription;
        } else if (audio.userEditedTranscription && audio.userEditedTranscription.trim() !== '') {
          displayText = audio.userEditedTranscription;
        } else if (audio.transcriptionStatus && audio.transcriptionStatus !== 'completed') {
          status = audio.transcriptionStatus;
          displayText = '';
        } else {
          status = 'no_transcription';
          displayText = '';
        }
        
        const segments = displayText ? parseTranscriptionWithTimestamps(displayText, audio.duration) : [];
        
        return {
          noteTitle: note.title,
          audioFileName: audio.filename,
          displayText,
          segments,
          status,
          duration: audio.duration,
          createdAt: audio.createdAt,
        };
      })
    : [];

  if (authLoading || notesLoading) {
    const loadingContent = (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner size={50} />
        <ThemedText style={styles.loadingText}>{t('transcription.loading') || 'Loading transcriptions...'}</ThemedText>
      </ThemedView>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout title={t('transcription.title') || 'Transcriptions'} sidebar={<UserSidebar />}>
          {loadingContent}
        </WebLayout>
      );
    }
    return loadingContent;
  }

  if (!noteId) {
    const errorContent = (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="document-text-outline" size={64} color={textMuted} />
        <ThemedText style={styles.errorText}>{t('transcription.noNoteSelected') || 'No note selected'}</ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {t('transcription.selectNoteToView') || 'Please select a note to view its transcriptions.'}
        </ThemedText>
      </ThemedView>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout title={t('transcription.title') || 'Transcriptions'} sidebar={<UserSidebar />}>
          {errorContent}
        </WebLayout>
      );
    }
    return errorContent;
  }

  if (!note) {
    const errorContent = (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={textMuted} />
        <ThemedText style={styles.errorText}>{t('transcription.noteNotFound') || 'Note not found'}</ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {t('transcription.noteDeleted') || 'The selected note does not exist or has been deleted.'}
        </ThemedText>
      </ThemedView>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout title={t('transcription.title') || 'Transcriptions'} sidebar={<UserSidebar />}>
          {errorContent}
        </WebLayout>
      );
    }
    return errorContent;
  }

  if (transcriptions.length === 0) {
    const errorContent = (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="mic-outline" size={64} color={textMuted} />
        <ThemedText style={styles.errorText}>
          {t('transcription.noTranscriptions') || 'No transcriptions found'}
        </ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {t('transcription.noAudioFiles') || 'This note has no audio files with transcriptions yet.'}
        </ThemedText>
      </ThemedView>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout title={t('transcription.title') || 'Transcriptions'} sidebar={<UserSidebar />}>
          {errorContent}
        </WebLayout>
      );
    }
    return errorContent;
  }

  const mainContent = (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity 
            onPress={() => router.replace(`/note/${noteId}` as any)} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>
            {t('transcription.title') || 'Transcriptions'}
          </ThemedText>
          {note && (
            <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
              {note.title}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Transcriptions List */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {transcriptions.map((transcription, idx) => (
          <View 
            key={idx} 
            style={[styles.transcriptionCard, { backgroundColor: cardBg, borderColor }]}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="mic" size={20} color={accentPrimary} />
                <ThemedText style={styles.cardTitle} numberOfLines={1}>
                  {transcription.audioFileName}
                </ThemedText>
              </View>
              {transcription.duration && (
                <ThemedText style={[styles.duration, { color: textSecondary }]}>
                  {formatTimestamp(transcription.duration)}
                </ThemedText>
              )}
            </View>

            {/* Transcription Content */}
            {transcription.status === 'processing' && (
              <View style={styles.statusContainer}>
                <LoadingSpinner size={24} />
                <ThemedText style={[styles.statusText, { color: textSecondary }]}>
                  {t('transcription.processing') || 'Processing transcription...'}
                </ThemedText>
              </View>
            )}

            {transcription.status === 'pending' && (
              <View style={styles.statusContainer}>
                <Ionicons name="time-outline" size={24} color={textSecondary} />
                <ThemedText style={[styles.statusText, { color: textSecondary }]}>
                  {t('transcription.pending') || 'Transcription pending...'}
                </ThemedText>
              </View>
            )}

            {transcription.status === 'failed' && (
              <View style={styles.statusContainer}>
                <Ionicons name="alert-circle-outline" size={24} color={textMuted} />
                <ThemedText style={[styles.statusText, { color: textMuted }]}>
                  {t('transcription.failed') || 'Transcription failed'}
                </ThemedText>
              </View>
            )}

            {transcription.status === 'no_transcription' && (
              <View style={styles.statusContainer}>
                <Ionicons name="document-text-outline" size={24} color={textMuted} />
                <ThemedText style={[styles.statusText, { color: textMuted }]}>
                  {t('transcription.notAvailable') || 'No transcription available'}
                </ThemedText>
              </View>
            )}

            {/* Segments with Timestamps */}
            {transcription.segments.length > 0 && (
              <View style={styles.segmentsContainer}>
                {transcription.segments.map((segment, segmentIdx) => (
                  <TouchableOpacity
                    key={segmentIdx}
                    style={[
                      styles.segment,
                      segmentIdx < transcription.segments.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                        paddingBottom: 16,
                        marginBottom: 16,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    {segment.timestamp && (
                      <View style={[styles.timestampBadge, { backgroundColor: accentPrimary }]}>
                        <ThemedText style={styles.timestampText}>
                          {segment.timestamp}
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText style={[styles.segmentText, { color: textColor }]}>
                      {segment.text}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout 
        title={t('transcription.title') || 'Transcriptions'}
        subtitle={note?.title}
        sidebar={<UserSidebar />}
      >
        {mainContent}
      </WebLayout>
    );
  }

  return mainContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: 40,
  },
  transcriptionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      web: {
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  duration: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  statusText: {
    fontSize: 14,
  },
  segmentsContainer: {
    marginTop: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timestampBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    flexShrink: 0,
  },
  timestampText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  segmentText: {
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
});
