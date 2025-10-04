import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { VoiceRecorderSimple } from '../components/VoiceRecorderSimple';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { AudioUtils } from '../services/AudioUtils';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';

// Import web components
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

export default function CreateAudioNoteScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);

  const userId = user?.id || '';

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  // Global cleanup on component mount
  useEffect(() => {
    AudioUtils.globalCleanup().catch(console.error);
  }, []);

  // Update canSave based on content
  useEffect(() => {
    const hasContent = title.trim() || hasRecording;
    setCanSave(hasContent && !isLoading);
  }, [title, hasRecording, isLoading]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleRecordingComplete = async (audioFile: any) => {
    try {
      console.log('[CreateAudio] Recording completed:', audioFile);
      
      setShowProgressBar(true);
      setProgress(10);
      setProgressMessage('Preparing audio file...');
      console.log('[CreateAudio] Progress set to 10% - Preparing audio file...');
      setHasRecording(true);
      setAudioUri(audioFile.filename);
      setRecordingDuration(audioFile.duration);

      // Create note with audio file
      const note = await supabaseNoteStorage.createNote({
        title: title.trim() || 'Audio Note',
        content: '',
        tags: tags,
        summary: '',
        audioUrl: audioFile.filename,
        audioDuration: audioFile.duration,
      });

      setProgress(60);
      setProgressMessage('Saving to database...');
      console.log('[CreateAudio] Progress set to 60% - Saving to database...');
      setNoteId(note.id);

      // Process audio for transcription and summary if needed
      try {
        setProgress(80);
        setProgressMessage('AI is processing your audio...');
        console.log('[CreateAudio] Progress set to 80% - AI is processing your audio...');
        const processingResult = await AudioUtils.processAudioForTranscription(
          audioFile.filename,
          userId,
          note.id,
          (message, progress) => {
            setProgressMessage(message);
            setProgress(80 + (progress * 0.2)); // Scale 0-100 to 80-100
            console.log('[CreateAudio] AI Progress:', message, progress);
          }
        );

        if (processingResult.success) {
          // Update note with processed content
          setProgressMessage('Updating note with AI content...');
          await supabaseNoteStorage.updateNote(note.id, {
            title: processingResult.title || title.trim() || 'Audio Note',
            content: processingResult.transcription || '',
            summary: processingResult.summary || '',
            keyDetails: processingResult.keyDetails || [],
          });

          // Update local state with AI-generated content
          if (processingResult.title) {
            setTitle(processingResult.title);
          }
        }
      } catch (processingError) {
        console.warn('[CreateAudio] Audio processing failed, continuing with basic note:', processingError);
      }

      setProgress(100);
      setProgressMessage('Complete!');
      setShowProgressBar(false);

      // Navigate to the note page (replace to avoid back button going to create-audio)
      router.replace(`/note/${note.id}` as any);

    } catch (error) {
      console.error('[CreateAudio] Error processing recording:', error);
      setShowProgressBar(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const saveNote = async () => {
    if (!canSave || isLoading) return;

    try {
      setIsLoading(true);
      setShowProgressBar(true);
      setProgress(10);
      setProgressMessage('Saving note...');

      if (!noteId) {
        // Create new note
        const note = await supabaseNoteStorage.createNote({
          title: title.trim() || 'Audio Note',
          content: '',
          tags: tags,
          summary: '',
          audioUrl: audioUri,
          audioDuration: recordingDuration,
        });

        setProgress(100);
        setProgressMessage('Complete!');
        setShowProgressBar(false);
        setIsLoading(false);

        // Navigate to the note page (replace to avoid back button going to create-audio)
        router.replace(`/note/${note.id}` as any);
      } else {
        // Update existing note
        await supabaseNoteStorage.updateNote(noteId, {
          title: title.trim() || 'Audio Note',
          content: '',
          tags: tags,
          summary: '',
        });

        setProgress(100);
        setProgressMessage('Complete!');
        setShowProgressBar(false);
        setIsLoading(false);

        // Navigate to the note page (replace to avoid back button going to create-audio)
        router.replace(`/note/${noteId}` as any);
      }
    } catch (error) {
      console.error('[CreateAudio] Error saving note:', error);
      setShowProgressBar(false);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };


  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={50} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            Loading authentication...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout sidebar={<UserSidebar />}>
        <ThemedView style={styles.webContainer}>
          {/* Header */}
          <ThemedView style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <TouchableOpacity 
                style={styles.webBackButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color={textColor} />
                <ThemedText style={styles.webBackText}>Back</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>Create Audio Note</ThemedText>
            </View>

            <View style={styles.webHeaderRight}>
              <TouchableOpacity
                style={{
                  ...styles.webSaveButton,
                  backgroundColor: canSave ? accentPrimary : backgroundTertiary,
                  opacity: canSave ? 1 : 0.5
                }}
                onPress={saveNote}
                disabled={!canSave || isLoading}
              >
                <ThemedText style={[styles.webSaveButtonText, { color: canSave ? "#FFFFFF" : textSecondaryColor }]}>
                  {isLoading ? 'Saving...' : 'Save Note'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Progress Bar */}
          {showProgressBar && (
            <ThemedView style={styles.webProgressWrapper}>
              <ThemedView style={[styles.webProgressContainer, { backgroundColor: backgroundTertiary }]}>
                <View 
                  style={{
                    ...styles.webProgressBar, 
                    width: `${progress}%`,
                    backgroundColor: accentPrimary 
                  }} 
                />
              </ThemedView>
              <ThemedText style={styles.webProgressText}>
                {progressMessage || 'Processing...'} {progress}%
              </ThemedText>
            </ThemedView>
          )}

          {/* Main Content */}
          <View style={styles.webContent}>
            {/* Audio Recorder Section */}
            <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>Record Audio</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="mic" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>Voice</ThemedText>
                </View>
              </View>
              
              <ThemedView style={styles.webRecorderContainer}>
                <VoiceRecorderSimple
                  onRecordingComplete={handleRecordingComplete}
                  userId={userId}
                  noteId={noteId}
                  onProgress={setProgress}
                />
              </ThemedView>
            </ThemedView>

            {/* Title Section */}
            <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>Note Title</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="document-text" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>Required</ThemedText>
                </View>
              </View>
              <TextInput
                style={[styles.webInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter a descriptive title for your audio note..."
                placeholderTextColor={textSecondaryColor}
              />
            </ThemedView>

            {/* Tags Section */}
            <ThemedView style={styles.webSection}>
              <View style={styles.webSectionHeader}>
                <ThemedText style={styles.webSectionTitle}>Tags</ThemedText>
                <View style={styles.webSectionBadge}>
                  <Ionicons name="pricetag" size={16} color={accentPrimary} />
                  <ThemedText style={styles.webSectionBadgeText}>Optional</ThemedText>
                </View>
              </View>
              <View style={styles.webTagInputContainer}>
                <TextInput
                  style={[styles.webTagInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Add a tag (press Enter to add)..."
                  placeholderTextColor={textSecondaryColor}
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity 
                  style={[styles.webAddTagButton, { backgroundColor: accentPrimary }]} 
                  onPress={addTag}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {tags.length > 0 && (
                <View style={styles.webTagsContainer}>
                  {tags.map((tag, index) => (
                    <View key={index} style={[styles.webTag, { backgroundColor: accentPrimary }]}>
                      <ThemedText style={styles.webTagText}>{tag}</ThemedText>
                      <TouchableOpacity
                        style={styles.webTagRemove}
                        onPress={() => removeTag(tag)}
                      >
                        <ThemedText style={styles.webTagRemoveText}>×</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ThemedView>
          </View>
        </ThemedView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: backgroundTertiary }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Create Audio Note
          </ThemedText>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        {showProgressBar && (
          <View style={styles.mobileProgressWrapper}>
            <View style={[styles.progressContainer, { backgroundColor: backgroundTertiary }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: accentPrimary 
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.progressText, { color: textColor }]}>
              {progressMessage || 'Processing...'} {progress}%
            </ThemedText>
            {__DEV__ && (
              <ThemedText style={[styles.debugText, { color: textColor }]}>
                Debug: showProgressBar={showProgressBar.toString()}, progress={progress}, message=&quot;{progressMessage}&quot;
              </ThemedText>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Audio Recorder Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Record Audio</ThemedText>
            <View style={[styles.recorderContainer, { backgroundColor: backgroundSecondary }]}>
              <VoiceRecorderSimple
                onRecordingComplete={handleRecordingComplete}
                userId={userId}
                noteId={noteId}
                onProgress={setProgress}
              />
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Title</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter note title..."
              placeholderTextColor={textSecondaryColor}
            />
          </View>

          {/* Tags Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Tags</ThemedText>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={[styles.tagInput, { backgroundColor: backgroundSecondary, color: textColor, borderColor: backgroundTertiary }]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag..."
                placeholderTextColor={textSecondaryColor}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={[styles.addTagButton, { backgroundColor: accentPrimary }]} onPress={addTag}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: accentPrimary }]}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { 
                  backgroundColor: canSave ? accentPrimary : backgroundTertiary,
                  opacity: canSave ? 1 : 0.5
                }
              ]}
              onPress={saveNote}
              disabled={!canSave || isLoading}
            >
              <ThemedText style={[styles.saveButtonText, { color: canSave ? "#FFFFFF" : textSecondaryColor }]}>
                {isLoading ? 'Saving...' : 'Save Note'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Mobile styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  mobileProgressWrapper: {
    marginHorizontal: 40,
    marginBottom: 20,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  debugText: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recorderContainer: {
    borderRadius: 12,
    padding: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  saveButtonContainer: {
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Web styles
  webContainer: {
    flex: 1,
    padding: 32,
    maxWidth: '100%',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  webBackText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  webHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  webHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webProgressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  webProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  webProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  webProgressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginLeft: 12,
  },
  webContent: {
    flex: 1,
  },
  webSection: {
    marginBottom: 40,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  webSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  webSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 0,
  },
  webSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  webSectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  webRecorderContainer: {
    borderRadius: 12,
    padding: 20,
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  webTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webTagInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 12,
  },
  webAddTagButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  webTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  webTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  webTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  webTagRemove: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  webTagRemoveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webSaveButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: '600',
  },
  webSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
