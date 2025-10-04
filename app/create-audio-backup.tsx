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
import { VoiceRecorder } from '../components/VoiceRecorder';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { NOTEZ_SHORTCUTS, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useThemeColor } from '../hooks/useThemeColor';
import { audioStorage } from '../services/AudioStorage';
import { AudioUtils } from '../services/AudioUtils';
import { featureFlagService } from '../services/FeatureFlagService';
import { simpleUsageService } from '../services/SimpleUsageService';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';

// Import web components
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

export default function CreateAudioNoteScreen() {
  const { isFeatureEnabled } = useFeatureFlags();
  const { user, isLoading: authLoading } = useAuth();
  const { canUseFeature } = useFeatureLimits();
  const [canUseVoiceRecording, setCanUseVoiceRecording] = useState<{ 
    canUse: boolean; 
    reason?: string; 
    currentUsage?: number; 
    limit?: number; 
    remaining?: number;
    sessionLimit?: number;
  } | null>(null);
  const [isLoadingFeatureCheck, setIsLoadingFeatureCheck] = useState(true);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryUsageLimit, setSummaryUsageLimit] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    currentUsage: number;
    monthlyLimit: number;
    remainingMonthly: number;
    sessionLimit: number;
  } | null>(null);

  const userId = user?.id || '';

  // Global cleanup on component mount
  useEffect(() => {
    AudioUtils.globalCleanup().catch(console.error);
  }, []);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = useThemeColor({}, 'tint');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');
  
  // Load voice recording capability asynchronously
  useEffect(() => {
    const loadVoiceRecordingCapability = async () => {
      try {
        // Wait for authentication to complete
        if (authLoading) {
          console.log('CreateAudioNoteScreen: Authentication still loading, waiting...');
          return;
        }
        
        setIsLoadingFeatureCheck(true);
        
        console.log('CreateAudioNoteScreen: Starting voice recording capability check');
        console.log('CreateAudioNoteScreen: User state:', { 
          user: !!user, 
          userId: user?.id, 
          userEmail: user?.email,
          userRole: user?.role 
        });

        // Check if user is authenticated
        if (!user?.id) {
          console.log('CreateAudioNoteScreen: User not authenticated yet, skipping usage check');
          setCanUseVoiceRecording({ canUse: true }); // Allow usage until we can check limits
          return;
        }

        // Ensure feature flag service is initialized
        console.log('CreateAudioNoteScreen: Initializing feature flag service...');
        // CreateAudioNoteScreen is only accessible when user is authenticated
        await featureFlagService.initialize(true);
        console.log('CreateAudioNoteScreen: Feature flag service initialized');

        // Check if feature is enabled (Feature Flags)
        console.log('CreateAudioNoteScreen: Checking if voice_recording feature is enabled...');
        const isEnabled = featureFlagService.isFeatureEnabled('voice_recording', user);
        console.log('CreateAudioNoteScreen: Voice recording feature enabled:', isEnabled);
        
        if (!isEnabled) {
          console.log('CreateAudioNoteScreen: Voice recording feature is not enabled');
          setCanUseVoiceRecording({ canUse: false, reason: 'Voice recording feature is not enabled' });
          return;
        }

        // Check usage limits (Feature Limits) - use hook for proper fallback handling
        console.log('CreateAudioNoteScreen: Checking usage limits...');
        const limitCheck = await canUseFeature('voice_recording', 1); // 1 minute
        console.log('CreateAudioNoteScreen: Usage limit check result:', limitCheck);
        setCanUseVoiceRecording(limitCheck);

        // Load detailed usage information
        if (userId) {
          console.log('CreateAudioNoteScreen: Checking usage for authenticated user:', userId);
          const usageCheck = await simpleUsageService.canStartRecordingSession(userId, 5);
          console.log('CreateAudioNoteScreen: Usage check result:', usageCheck);
          setUsageInfo({
            currentUsage: usageCheck.currentUsage,
            monthlyLimit: usageCheck.monthlyLimit,
            remainingMonthly: usageCheck.remainingMonthly,
            sessionLimit: usageCheck.sessionLimit,
          });
        }
      } catch (error) {
        console.error('CreateAudioNoteScreen: Error loading voice recording capability:', error);
        // Fallback to allowing usage if check fails
        setCanUseVoiceRecording({ canUse: true, reason: 'Error checking access, allowing usage as fallback' });
      } finally {
        setIsLoadingFeatureCheck(false);
      }
    };

    loadVoiceRecordingCapability();
  }, [user, userId, authLoading]);

  // Update canSave based on content
  useEffect(() => {
    const hasContent = title.trim() || transcription.trim() || summary.trim();
    setCanSave(hasContent && !isLoading);
  }, [title, transcription, summary, isLoading]);

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
      setShowProgressBar(true);
      setProgress(10);

      // Upload audio file
      const audioUrl = await audioStorage.uploadAudioFile(audioFile.filename, userId, noteId || 'temp');
      setProgress(30);

      setAudioUri(audioUrl);
      setAudioDuration(audioFile.duration);

      // Create note with audio URL
      const note = await supabaseNoteStorage.createNote({
        title: title.trim() || 'Audio Note',
        content: '', // Leave content empty for user to edit
        tags: tags,
        summary: summary,
        audioUrl: audioUrl,
        audioDuration: audioFile.duration,
      });

      setProgress(60);
      setNoteId(note.id);

      // Process audio for transcription and summary
      if (transcription.trim()) {
        setProgress(80);
        // Transcription already provided, just save
        await supabaseNoteStorage.updateNote(note.id, {
          content: '', // Leave content empty for user to edit
          summary: summary || 'Audio note with transcription',
        });
      } else {
        setProgress(80);
        // Process audio for transcription and summary
        // Use the local file path for transcription since RLS policies may not be set up yet
        const processingResult = await AudioUtils.processAudioForTranscription(
          audioFile.filename, // Use local file instead of remote URL
          userId,
          note.id
        );

        if (processingResult.success) {
          setTranscription(processingResult.transcription || '');
          setSummary(processingResult.summary || '');
          
          // Use AI-generated title if available, otherwise use user input or fallback
          const finalTitle = processingResult.title || title.trim() || 'Audio Note';
          setTitle(finalTitle);
          
          // Create audio file data with transcription
          const audioFileData = {
            id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            filename: audioUrl,
            duration: audioFile.duration,
            transcription: processingResult.transcription || '',
            transcriptionStatus: 'completed' as const,
            aiTranscription: processingResult.transcription || '', // Store transcription here
            userEditedTranscription: processingResult.transcription || '',
            createdAt: new Date(),
          };
          
          // Update note with processed content including AI-generated title
          await supabaseNoteStorage.updateNote(note.id, {
            title: finalTitle, // Use AI-generated title
            content: '', // Leave content empty for user to edit
            summary: processingResult.summary || '',
            audioFiles: [audioFileData], // Save audio file with transcription
            keyDetails: processingResult.keyDetails || [], // Save key details to note
          });
        }
      }

      setProgress(100);
      setShowProgressBar(false);
      setIsLoading(false);

      // Navigate to the note page automatically
      router.push(`/note/${note.id}` as any);
    } catch (error) {
      console.error('[Audio] Error processing recording:', error);
      setShowProgressBar(false);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    }
  };

  const saveNote = async () => {
    if (!canSave || isLoading) return;

    try {
      setIsLoading(true);
      setShowProgressBar(true);
      setProgress(10);

      if (!noteId) {
        // Create new note - only save basic info, processing will happen in handleRecordingComplete
        const note = await supabaseNoteStorage.createNote({
          title: title.trim() || 'Audio Note',
          content: '', // Leave content empty for user to edit
          tags: tags,
          summary: summary,
          audioUrl: audioUri,
          audioDuration: audioDuration,
        });

        setProgress(100);
        setShowProgressBar(false);
        setIsLoading(false);

        // Navigate to the note page automatically
        router.push(`/note/${note.id}` as any);
      } else {
        // Update existing note - only update basic fields, keep processed data intact
        await supabaseNoteStorage.updateNote(noteId, {
          title: title.trim() || 'Audio Note',
          content: '', // Leave content empty for user to edit
          tags: tags,
          summary: summary,
          // Don't overwrite transcription, keyDetails, or audioFiles - they're managed by processing
        });

        setProgress(100);
        setShowProgressBar(false);
        setIsLoading(false);

        // Navigate to the note page automatically
        router.push(`/note/${noteId}` as any);
      }
    } catch (error) {
      console.error('[Audio] Error saving note:', error);
      setShowProgressBar(false);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...NOTEZ_SHORTCUTS.SAVE,
      action: saveNote,
    },
  ]);

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

  // Show loading state
  if (isLoadingFeatureCheck) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading voice recording capabilities...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Show feature disabled message
  if (!canUseVoiceRecording?.canUse) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.disabledContainer}>
          <Ionicons name="mic-off" size={64} color={textSecondaryColor} />
          <ThemedText style={styles.disabledTitle}>Voice Recording Unavailable</ThemedText>
          <ThemedText style={styles.disabledText}>
            {canUseVoiceRecording?.reason || 'Voice recording is not available at this time.'}
          </ThemedText>
          {!user?.premium?.isActive && (
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: accentDanger }]}
              onPress={() => router.push('/join-premium' as any)}
            >
              <ThemedText style={styles.upgradeButtonText}>
                Upgrade to Premium
              </ThemedText>
            </TouchableOpacity>
          )}
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
              {usageInfo && !user?.premium?.isActive && (
                <View style={styles.webUsageInfo}>
                  <ThemedText style={styles.webUsageText}>
                    Monthly: {usageInfo.currentUsage}/{usageInfo.monthlyLimit} min • 
                    Session: {usageInfo.sessionLimit} min max
                  </ThemedText>
                </View>
              )}
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
                Processing... {progress}%
              </ThemedText>
            </ThemedView>
          )}

          {/* Main Content */}
          <View style={styles.webContent}>
            {/* How to Use Section */}
            <ThemedView style={styles.webSection}>
              <ThemedText style={styles.webSectionTitle}>How to Use</ThemedText>
              <View style={styles.webRightContent}>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>1.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Click the record button
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>2.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Speak clearly
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>3.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Click the record button again to stop
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>4.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    AI will transcribe and summarize your note
                  </ThemedText>
                </View>
              </View>
            </ThemedView>

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
                <VoiceRecorder
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

            {/* AI Features Info */}
            <ThemedView style={styles.webInfoSection}>
              <ThemedView style={styles.webInfoCard}>
                <View style={styles.webInfoHeader}>
                  <Ionicons name="sparkles" size={20} color={accentPrimary} />
                  <ThemedText style={styles.webInfoTitle}>AI Features</ThemedText>
                </View>
                <View style={styles.webInfoContent}>
                  <View style={styles.webInfoItem}>
                    <Ionicons name="mic-outline" size={16} color={textSecondaryColor} />
                    <ThemedText style={styles.webInfoText}>
                      Automatic transcription
                    </ThemedText>
                  </View>
                  <View style={styles.webInfoItem}>
                    <Ionicons name="document-text-outline" size={16} color={textSecondaryColor} />
                    <ThemedText style={styles.webInfoText}>
                      AI-generated summary
                    </ThemedText>
                  </View>
                  <View style={styles.webInfoItem}>
                    <Ionicons name="search-outline" size={16} color={textSecondaryColor} />
                    <ThemedText style={styles.webInfoText}>
                      Smart search indexing
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
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

        {/* Usage Info */}
        {usageInfo && !user?.premium?.isActive && (
          <View style={styles.usageInfo}>
            <ThemedText style={[styles.usageText, { color: textSecondaryColor }]}>
              Monthly: {usageInfo.currentUsage}/{usageInfo.monthlyLimit} minutes
            </ThemedText>
            <ThemedText style={[styles.usageText, { color: textSecondaryColor }]}>
              Session: {usageInfo.sessionLimit} minutes max
            </ThemedText>
          </View>
        )}

        {/* Progress Bar */}
        {showProgressBar && (
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
            <ThemedText style={[styles.progressText, { color: textColor }]}>
              {progress}%
            </ThemedText>
          </View>
        )}

                  {/* Content */}
          <View style={styles.content}>
            {/* How to Use Section */}
            <ThemedView style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>How to Use</ThemedText>
              <View style={styles.webRightContent}>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>1.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Click the record button
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>2.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Speak clearly
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>3.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    Click the record button again to stop
                  </ThemedText>
                </View>
                <View style={styles.webRightInstruction}>
                  <ThemedText style={styles.webRightNumber}>4.</ThemedText>
                  <ThemedText style={styles.webRightInstructionText}>
                    AI will transcribe and summarize your note
                  </ThemedText>
                </View>
              </View>
            </ThemedView>

          {/* Audio Recorder Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Record Audio</ThemedText>
            <View style={[styles.recorderContainer, { backgroundColor: backgroundSecondary }]}>
              <VoiceRecorder
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
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 20,
  },
  usageText: {
    fontSize: 14,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 40,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
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
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    lineHeight: 24,
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
  webHeaderSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webUsageInfo: {
    marginTop: 6,
  },
  webUsageText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  webUsageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  webUsageLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  webUsageValue: {
    fontSize: 14,
    fontWeight: '600',
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
  webSectionDescription: {
    fontSize: 14,
    marginBottom: 12,
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
  webTextarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    lineHeight: 24,
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
  webInfoCard: {
    borderRadius: 12,
    padding: 20,
  },
  webInfoSection: {
    marginTop: 20,
  },
  webInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  webInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  webInfoContent: {
    marginTop: 12,
  },
  webInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webInfoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  webSaveSection: {
    marginTop: 20,
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
  webSaveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webSaveHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  // New styles for right sidebar
  webRightSidebar: {
    width: 320,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  webRightSection: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  webRightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  webRightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  webRightContent: {
    marginTop: 12,
  },
  webRightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  webRightLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  webRightValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  webRightUpgrade: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  webRightUpgradeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webRightUpgradeButton: {
    backgroundColor: '#FF6B6B',
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: '600',
  },
  webRightUpgradeButtonText: {
    color: '#FFFFFF',
  },
  webRightInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webRightNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  webRightInstructionText: {
    fontSize: 14,
  },
}); 