import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    Alert,
    Linking,
    Platform,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioPlayer } from '../../components/AudioPlayer';
import { FeatureUsageInline } from '../../components/FeatureUsageInline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { RichTextViewer as RichTextViewerWeb } from '../../components/RichTextViewer.web';
import { RichTextViewer as RichTextViewerNative } from '../../components/RichTextViewer.native';
import { ShareModal } from '../../components/ShareModal';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { extractKeyDetailsWithGemini, generateSummaryWithGemini, testGeminiConnection } from '../../services/GeminiAI';
import { featureLimitService } from '../../services/FeatureLimitService';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { NoteDetailStyles as styles } from '../../styles/NoteDetailStyles';
import { AudioFile, Note } from '../../types/Note';

// Import web components
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';

const BUTTONS = [
  { id: 'transcription', label: 'Transcription', color: '#3CB371' },
  { id: 'quiz', label: 'Quiz', color: '#6A5ACD' },
  { id: 'flashcards', label: 'Flashcards', color: '#9932CC' },
  { id: 'aiChat', label: 'AI Chat', color: '#FF8C00' },
  { id: 'writeEssay', label: 'Write Essay', color: '#00CED1' },
  { id: 'share', label: 'Share', color: '#10B981' },
  { id: 'viewPDF', label: 'View PDF', color: '#E74C3C' },
  { id: 'downloadPDF', label: 'Download PDF', color: '#2563EB' },
];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  useEffect(() => {
    // Hide header on web platform
    if (Platform.OS === 'web') {
      navigation.setOptions({ headerShown: false });
    } else {
      navigation.setOptions({ 
        title: 'Notez',
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )
      });
    }
  }, [navigation]);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyDetails, setKeyDetails] = useState<string[] | null>(null);
  const [keyDetailsLoading, setKeyDetailsLoading] = useState(false);
  const [keyDetailsGeneratedFor, setKeyDetailsGeneratedFor] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGeneratedFor, setSummaryGeneratedFor] = useState<string | null>(null);
  const [summaryUsageLimit, setSummaryUsageLimit] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Debug share modal state
  useEffect(() => {
    console.log('🔍 showShareModal state changed:', showShareModal);
  }, [showShareModal]);

  const processedNotesRef = useRef<Set<string>>(new Set());
  
  // Helper function to check if user can edit the note
  const canEditNote = (note: Note | null): boolean => {
    if (!note) return false;
    
    // If it's not a shared note, user owns it and can edit
    if (!note.isSharedNote) return true;
    
    // If it's a shared note, check permission level
    // Only 'edit' and 'admin' permissions allow editing
    return note.sharePermission === 'edit' || note.sharePermission === 'admin';
  };
  
  // Check if AI features are enabled
  const { isFeatureEnabled } = useFeatureFlags();
  const isAISummariesEnabled = isFeatureEnabled('ai_summaries');
  const isAIKeyDetailsEnabled = isFeatureEnabled('ai_key_details');
  const isRichTextEnabled = isFeatureEnabled('rich_text_editor');
  const isAIQuizEnabled = isFeatureEnabled('ai_quiz');
  const isAIFlashcardsEnabled = isFeatureEnabled('ai_flashcards');
  const isAIChatEnabled = isFeatureEnabled('ai_chat');
  const isAIWriteEssayEnabled = isFeatureEnabled('ai_write_essay');
  
  // Debug logging for feature flags
  console.log('🔍 NoteDetailScreen: Feature flag status:', {
    ai_summaries: isAISummariesEnabled,
    ai_key_details: isAIKeyDetailsEnabled,
    rich_text_editor: isRichTextEnabled,
    ai_quiz: isAIQuizEnabled,
    ai_flashcards: isAIFlashcardsEnabled,
    ai_chat: isAIChatEnabled,
    ai_write_essay: isAIWriteEssayEnabled
  });
  
  // Debug UI indicator (only in development)
  const showDebugInfo = __DEV__;
  
  const { user, isLoading: authLoading } = useAuth();
  
  // Debug logging for note content
  useEffect(() => {
    if (note) {
      console.log('🔍 NoteDetailScreen: Note content debug:', {
        noteId: note.id,
        hasContent: !!note.content,
        contentLength: note.content?.length || 0,
        hasContentHtml: !!note.contentHtml,
        contentHtmlLength: note.contentHtml?.length || 0,
        contentFormat: note.contentFormat,
        isRichTextEnabled: isRichTextEnabled,
        shouldUseRichTextViewer: Platform.OS === 'web' && note.contentFormat === 'html' && note.contentHtml,
        contentPreview: note.content?.substring(0, 100),
        contentHtmlPreview: note.contentHtml?.substring(0, 100)
      });
    }
  }, [note, isRichTextEnabled]);
  
  // Global debug function for testing feature flags
  if (typeof window !== 'undefined') {
    (window as any).debugFeatureFlags = () => {
      console.log('🔍 Debug Feature Flags:');
      console.log('ai_summaries:', isAISummariesEnabled);
      console.log('ai_key_details:', isAIKeyDetailsEnabled);
      console.log('useFeatureFlags hook:', { isFeatureEnabled });
    };
    
    // Test function removed - was bypassing usage limits
  }
  const { notes, toggleArchive, updateNote } = useNotes(user?.id || '');

  // Helper functions for note type detection
  const isAudioNote = (note: Note): boolean => {
    // Check type field first (most reliable)
    if (note.type === 'audio') return true;
    
    // Fallback to checking for audio files
    const hasAudioFiles = note.audioFiles && note.audioFiles.length > 0;
    const hasAudioUri = !!note.audioUri;
    console.log('[NoteDetail] Audio detection:', {
      noteId: note.id,
      type: note.type,
      hasAudioFiles,
      audioFilesLength: note.audioFiles?.length || 0,
      hasAudioUri,
      audioUri: note.audioUri,
      audioFiles: note.audioFiles
    });
    return hasAudioFiles || hasAudioUri;
  };

  const isPDFNote = (note: Note): boolean => {
    // Check type field first (most reliable)
    if (note.type === 'pdf') return true;
    
    // Fallback to checking for PDF files
    const hasPDFFiles = note.pdfFiles && note.pdfFiles.length > 0;
    console.log('[NoteDetail] PDF detection:', {
      noteId: note.id,
      type: note.type,
      hasPDFFiles,
      pdfFilesLength: note.pdfFiles?.length || 0,
    });
    return hasPDFFiles;
  };

  const getPrimaryAudioFile = (note: Note): AudioFile | null => {
    console.log('[NoteDetail] Getting primary audio file:', {
      noteId: note.id,
      audioFiles: note.audioFiles,
      audioUri: note.audioUri
    });
    
    if (note.audioFiles && note.audioFiles.length > 0) {
      console.log('[NoteDetail] Using audioFiles[0]:', note.audioFiles[0]);
      return note.audioFiles[0];
    }
    // Fallback to legacy audioUri
    if (note.audioUri) {
      console.log('[NoteDetail] Using legacy audioUri:', note.audioUri);
      return {
        id: 'legacy_audio',
        filename: note.audioUri,
        duration: 0,
        transcription: (note as any).transcription || '',
        transcriptionStatus: 'completed' as const,
        aiTranscription: '',
        userEditedTranscription: (note as any).transcription || '',
        createdAt: note.createdAt,
      };
    }
    console.log('[NoteDetail] No audio file found');
    return null;
  };

  useEffect(() => {
    const loadNote = async () => {
      if (!id) return;
      
      // Wait for auth to finish loading before checking authentication
      if (authLoading) {
        console.log('Waiting for auth to load...');
        return;
      }
      
      setLoading(true);
      
      // First try to find the note in the user's notes
      const foundNote = notes.find(n => n.id === id);
      if (foundNote) {
        setNote(foundNote);
        setLoading(false);
        return;
      }
      
      // If not found in user's notes, try to fetch it directly (for shared notes)
      // This requires authentication
      if (!user?.id) {
        console.log('User not authenticated, cannot access shared notes');
        // Redirect to login if not authenticated
        if (Platform.OS === 'web') {
          router.push({
            pathname: '/(auth)/login',
            params: { redirect: `/note/${id}` }
          });
        } else {
          Alert.alert(
            'Authentication Required',
            'Please sign in to view this shared note.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
              { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
            ]
          );
        }
        setLoading(false);
        return;
      }

      console.log('Note not found in user notes, trying to fetch as shared note...');
      try {
        const sharedNote = await supabaseNoteStorage.getNote(id);
        if (sharedNote) {
          console.log('Successfully loaded shared note:', sharedNote.title);
          setNote(sharedNote);
        } else {
          console.log('Note not found or not shared with current user');
          setNote(null);
        }
      } catch (error) {
        console.error('Error fetching shared note:', error);
        setNote(null);
      }
      setLoading(false);
    };

    loadNote();
  }, [id, notes, user?.id, authLoading]);

  // Memoize note content combination to prevent unnecessary re-computation
  const combinedNoteContent = useMemo(() => {
    if (!note) return '';
    
    let text = note.content || '';
    
    // Add transcription from note.transcription (legacy field)
    if ((note as any).transcription) {
      text += '\n' + (note as any).transcription;
    }
    
    // Add transcriptions from audioFiles (current implementation)
    if (note.audioFiles && note.audioFiles.length > 0) {
      note.audioFiles.forEach(f => {
        if (f.transcription) text += '\n' + f.transcription;
        if (f.aiTranscription) text += '\n' + f.aiTranscription;
        if (f.userEditedTranscription) text += '\n' + f.userEditedTranscription;
      });
    }
    
    return text;
  }, [note?.content, note?.audioFiles, (note as any)?.transcription]);

  // Memoized key details generation function
  const generateKeyDetails = useCallback(async (text: string) => {
    if (!user || !note) return;
    
    try {
      // Check usage limits using unified feature limit system
      const canUseResult = await featureLimitService.canUseFeature(
        user.id, 
        'ai_key_details', 
        1, 
        user.premium?.isActive || false
      );
      
      if (!canUseResult.canUse) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: User cannot use AI key details:', canUseResult.reason);
        setKeyDetailsGeneratedFor(note.id);
        setSummaryUsageLimit(`Usage limit reached (${canUseResult.currentUsage}/${canUseResult.limit}). Upgrade to Premium for unlimited key details!`);
        return;
      }
      
      // Generate key details
      if (__DEV__) console.log('🔍 NoteDetailScreen: Starting key details generation');
      setKeyDetailsLoading(true);
      setKeyDetailsGeneratedFor(note.id);
      
      const details = await extractKeyDetailsWithGemini(text);
      if (__DEV__) console.log('🔍 NoteDetailScreen: Key details generated successfully:', details);
      
      setKeyDetails(details);
      setKeyDetailsLoading(false);
      
      // Record usage if generation succeeded
      if (user?.id && details && details.length > 0) {
        try {
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_key_details', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          if (__DEV__) console.log('🔍 NoteDetailScreen: AI key details usage recorded');
        } catch (usageError) {
          console.error('🔍 NoteDetailScreen: Failed to record AI key details usage:', usageError);
        }
      }
      
      // Save to Firebase
      if (note && details && details.length > 0) {
        try {
          if (__DEV__) console.log('🔍 NoteDetailScreen: Saving key details to Firebase');
          await updateNote(note.id, { keyDetails: details });
        } catch (e) {
          console.error('🔍 Failed to save key details:', e);
        }
      }
    } catch (error) {
      console.error('🔍 NoteDetailScreen: Failed to generate key details:', error);
      setKeyDetailsLoading(false);
      setKeyDetailsGeneratedFor(null); // Reset on error to allow retry
    }
  }, [user, note, updateNote]);

  // Generate key details when note changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 NoteDetailScreen: Key details effect triggered with:', {
        note: !!note,
        isAIKeyDetailsEnabled,
        noteId: note?.id,
        hasKeyDetails: note?.keyDetails?.length ? note.keyDetails.length > 0 : false,
        keyDetailsGeneratedFor
      });
    }
    
    if (note && isAIKeyDetailsEnabled) {
      if (__DEV__) console.log('🔍 NoteDetailScreen: Key details effect triggered for note:', note.id);
      
      // Skip generation for shared notes - only show existing key details
      if (note.isSharedNote) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: This is a shared note, skipping auto-generation');
        if (note.keyDetails && note.keyDetails.length > 0) {
          setKeyDetails(note.keyDetails);
        }
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      // Skip if we already have key details for this note
      if (note.keyDetails && note.keyDetails.length && note.keyDetails.length > 0) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Note already has key details, using existing');
        setKeyDetails(note.keyDetails);
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      // Skip if we already attempted to generate for this note
      if (keyDetailsGeneratedFor === note.id) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Already attempted generation for this note');
        return;
      }
      
      // Check if user has enabled auto key details generation
      if (user?.preferences?.autoKeyDetails === false) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Auto key details generation disabled by user preference');
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      // Use memoized content combination
      const text = combinedNoteContent;
      
      if (__DEV__) {
        console.log('🔍 NoteDetailScreen: Final combined text length:', text.length);
        console.log('🔍 NoteDetailScreen: Text preview:', text.substring(0, 200) + '...');
      }
      
      // Skip if no meaningful content
      if (!text.trim()) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: No meaningful content for key details generation');
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      if (__DEV__) console.log('🔍 NoteDetailScreen: Content validation passed, proceeding with generation');
      
      // Use memoized generation function
      generateKeyDetails(text);
    }
  }, [note?.id, keyDetailsGeneratedFor, isAIKeyDetailsEnabled, user?.id, user?.preferences?.autoKeyDetails, note?.isSharedNote, combinedNoteContent, generateKeyDetails]);

  // Memoized summary generation function
  const generateSummary = useCallback(async (text: string) => {
    if (!user || !note) return;
    
    try {
      // Check feature limits before generating summary
      if (user) {
        const canUseResult = await featureLimitService.canUseFeature(
          user.id, 
          'ai_summaries', 
          1, 
          user.premium?.isActive || false
        );
        
        if (!canUseResult.canUse) {
          if (__DEV__) console.log('🚫 AI Summary BLOCKED:', canUseResult.reason);
          setSummaryGeneratedFor(note.id);
          setSummaryUsageLimit(`Usage limit reached (${canUseResult.currentUsage}/${canUseResult.limit}). Upgrade to Premium for unlimited summaries!`);
          return;
        }
      }
        
      // Generate summary
      if (__DEV__) console.log('🔍 NoteDetailScreen: Starting summary generation');
      setSummaryLoading(true);
      setSummaryGeneratedFor(note.id);
      
      const generatedSummary = await generateSummaryWithGemini(text);
      if (__DEV__) console.log('🔍 NoteDetailScreen: Summary generated successfully:', generatedSummary);
      
      setSummary(generatedSummary);
      setSummaryLoading(false);
      
      // Record usage if generation succeeded
      if (user?.id && generatedSummary && generatedSummary.trim().length > 0) {
        try {
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_summaries', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          if (__DEV__) console.log('🔍 NoteDetailScreen: AI summary usage recorded');
        } catch (usageError) {
          console.error('🔍 NoteDetailScreen: Failed to record AI summary usage:', usageError);
        }
      }
      
      // Save to Firebase
      if (note && generatedSummary && generatedSummary.trim().length > 0) {
        try {
          if (__DEV__) console.log('🔍 NoteDetailScreen: Saving summary to Firebase');
          await updateNote(note.id, { summary: generatedSummary });
        } catch (e) {
          console.error('🔍 Failed to save summary:', e);
        }
      }
    } catch (error) {
      console.error('🔍 NoteDetailScreen: Failed to generate summary:', error);
      setSummaryLoading(false);
      setSummaryGeneratedFor(null); // Reset on error to allow retry
    }
  }, [user, note, updateNote]);

  // Generate summary when note changes
  useEffect(() => {
    if (note && isAISummariesEnabled) {
      console.log('🔍 NoteDetailScreen: Summary effect triggered for note:', note.id);
      
      // Skip generation for shared notes - only show existing summary
      if (note.isSharedNote) {
        console.log('🔍 NoteDetailScreen: This is a shared note, skipping auto-generation of summary');
        if (note.summary && note.summary.trim().length > 0) {
          setSummary(note.summary);
        }
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      // Skip if we already have a summary for this note
      if (note.summary && note.summary.trim().length > 0) {
        console.log('🔍 NoteDetailScreen: Note already has a summary, using existing');
        setSummary(note.summary);
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      // Skip if we already attempted to generate for this note
      if (summaryGeneratedFor === note.id) {
        console.log('🔍 NoteDetailScreen: Already attempted summary generation for this note');
        return;
      }
      
      // Check if user has enabled auto AI summaries generation
      if (user?.preferences?.autoAISummaries === false) {
        console.log('🔍 NoteDetailScreen: Auto AI summaries generation disabled by user preference');
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      // Combine note content
      let text = note.content || '';
      
      // Add transcription from note.transcription (legacy field)
      if ((note as any).transcription) {
        text += '\n' + (note as any).transcription;
        console.log('🔍 NoteDetailScreen: Added legacy transcription for summary, text length now:', text.length);
      }
      
      // Add transcriptions from audioFiles (current implementation)
      if (note.audioFiles && note.audioFiles.length > 0) {
        note.audioFiles.forEach(f => {
          if (f.transcription) {
            text += '\n' + f.transcription;
            console.log('🔍 NoteDetailScreen: Added audio file transcription for summary, text length now:', text.length);
          }
          if (f.aiTranscription) {
            text += '\n' + f.aiTranscription;
            console.log('🔍 NoteDetailScreen: Added AI transcription for summary, text length now:', text.length);
          }
          if (f.userEditedTranscription) {
            text += '\n' + f.userEditedTranscription;
            console.log('🔍 NoteDetailScreen: Added user edited transcription for summary, text length now:', text.length);
          }
        });
      }
      
      console.log('🔍 NoteDetailScreen: Final combined text length for summary:', text.length);
      console.log('🔍 NoteDetailScreen: Summary text preview:', text.substring(0, 200) + '...');
      
      // Skip if no meaningful content
      if (!text.trim()) {
        console.log('🔍 NoteDetailScreen: No meaningful content for summary generation');
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      console.log('🔍 NoteDetailScreen: Content validation passed, proceeding with summary generation');
      
      // Check usage limits and generate
      const generateSummary = async () => {
        try {
        // Check feature limits before generating summary
        if (user) {
          const canUseResult = await featureLimitService.canUseFeature(
            user.id, 
            'ai_summaries', 
            1, 
            user.premium?.isActive || false
          );
          
          if (!canUseResult.canUse) {
            console.log('🚫 AI Summary BLOCKED:', canUseResult.reason);
            setSummaryGeneratedFor(note.id);
            setSummaryUsageLimit(`Usage limit reached (${canUseResult.currentUsage}/${canUseResult.limit}). Upgrade to Premium for unlimited summaries!`);
            return;
          }
        }
          
          // Generate summary
          console.log('🔍 NoteDetailScreen: Starting summary generation');
          setSummaryLoading(true);
          setSummaryGeneratedFor(note.id);
          
          const generatedSummary = await generateSummaryWithGemini(text);
          console.log('🔍 NoteDetailScreen: Summary generated successfully:', generatedSummary);
          
          setSummary(generatedSummary);
          setSummaryLoading(false);
          
          // Record usage if generation succeeded
          if (user?.id && generatedSummary && generatedSummary.trim().length > 0) {
            try {
              await featureLimitService.recordFeatureUsage(
                user.id, 
                'ai_summaries', 
                1, 
                user.premium?.isActive || false,
                'count'
              );
              console.log('🔍 NoteDetailScreen: AI summary usage recorded');
            } catch (usageError) {
              console.error('🔍 NoteDetailScreen: Failed to record AI summary usage:', usageError);
            }
          }
          
          // Save to Firebase
          if (note && generatedSummary && generatedSummary.trim().length > 0) {
            try {
              console.log('🔍 NoteDetailScreen: Saving summary to Firebase');
              await updateNote(note.id, { summary: generatedSummary });
            } catch (e) {
              console.error('🔍 Failed to save summary:', e);
            }
          }
        } catch (error) {
          console.error('🔍 NoteDetailScreen: Failed to generate summary:', error);
          setSummaryLoading(false);
          setSummaryGeneratedFor(null); // Reset on error to allow retry
        }
      };
      
      generateSummary();
    }
  }, [note?.id, summaryGeneratedFor, isAISummariesEnabled, user?.id, user?.preferences?.autoAISummaries, note?.isSharedNote, combinedNoteContent, generateSummary]);

  const handleArchiveToggle = async () => {
    if (!note) return;
    
    try {
      await toggleArchive(note.id);
      
      Alert.alert(
        'Success',
        note.isArchived ? 'Note unarchived' : 'Note archived',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
    }
  };

  // Debug function to test Gemini API connection
  const testGeminiAPI = async () => {
    try {
      console.log('🔍 Testing Gemini API connection...');
      const result = await testGeminiConnection();
      console.log('🔍 Gemini API test result:', result);
      
      if (result.success) {
        Alert.alert('Gemini API Test', '✅ API connection successful!');
      } else {
        Alert.alert('Gemini API Test', `❌ API connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('🔍 Error testing Gemini API:', error);
      Alert.alert('Gemini API Test', `❌ Error: ${error}`);
    }
  };

  // Manual trigger for key details generation
  const manuallyGenerateKeyDetails = async () => {
    if (!note) return;
    
    // Don't allow manual generation for shared notes
    if (note.isSharedNote) {
      Alert.alert(
        'Cannot Generate',
        'You cannot generate AI features for shared notes. Only the note owner can do this.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      console.log('🔍 Manually triggering key details generation...');
      setKeyDetailsLoading(true);
      
      // Combine note content
      let text = note.content || '';
      
      // Add transcription from note.transcription (legacy field)
      if ((note as any).transcription) {
        text += '\n' + (note as any).transcription;
        console.log('🔍 Manual generation - Added legacy transcription, text length now:', text.length);
      }
      
      // Add transcriptions from audioFiles (current implementation)
      if (note.audioFiles && note.audioFiles.length > 0) {
        note.audioFiles.forEach(f => {
          if (f.transcription) {
            text += '\n' + f.transcription;
            console.log('🔍 Manual generation - Added audio file transcription, text length now:', text.length);
          }
          if (f.aiTranscription) {
            text += '\n' + f.aiTranscription;
            console.log('🔍 Manual generation - Added AI transcription, text length now:', text.length);
          }
          if (f.userEditedTranscription) {
            text += '\n' + f.userEditedTranscription;
            console.log('🔍 Manual generation - Added user edited transcription, text length now:', text.length);
          }
        });
      }
      
      console.log('🔍 Manual generation - Final text length:', text.length);
      console.log('🔍 Manual generation - Text preview:', text.substring(0, 200) + '...');
      
        // Check feature limits before generating key details
        if (user) {
          const canUseResult = await featureLimitService.canUseFeature(
            user.id, 
            'ai_key_details', 
            1, 
            user.premium?.isActive || false
          );
          
          if (!canUseResult.canUse) {
            console.log('🚫 Manual AI Key Details BLOCKED:', canUseResult.reason);
            setKeyDetailsLoading(false);
            Alert.alert('Limit Reached', `Usage limit reached (${canUseResult.currentUsage}/${canUseResult.limit}). Upgrade to Premium for unlimited key details!`);
            return;
          }
        }
      
      const details = await extractKeyDetailsWithGemini(text);
      console.log('🔍 Manual generation - Generated details:', details);
      
      setKeyDetails(details);
      setKeyDetailsLoading(false);
      
      // Record usage if generation succeeded
      if (user?.id && details && details.length > 0) {
        try {
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_key_details', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          console.log('🔍 Manual generation - AI key details usage recorded');
        } catch (usageError) {
          console.error('🔍 Manual generation - Failed to record AI key details usage:', usageError);
        }
      }
      
      // Save to Firebase
      if (details && details.length > 0) {
        await updateNote(note.id, { keyDetails: details });
        console.log('🔍 Manual generation - Saved to Firebase');
      }
      
      Alert.alert('Manual Generation', `✅ Generated ${details.length} key details!`);
    } catch (error) {
      console.error('🔍 Manual generation failed:', error);
      setKeyDetailsLoading(false);
      Alert.alert('Manual Generation', `❌ Failed: ${error}`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle viewing PDF
  const handleViewPDF = async (storageUrl: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Open in new tab
        window.open(storageUrl, '_blank');
      } else {
        // Mobile: Open PDF directly in browser/viewer
        console.log('👁️ Opening PDF in viewer');
        console.log('📄 PDF URL:', storageUrl);
        
        // Check if we can open the URL
        const canOpen = await Linking.canOpenURL(storageUrl);
        
        if (canOpen) {
          console.log('✅ Opening PDF with system browser/viewer');
          await Linking.openURL(storageUrl);
        } else {
          throw new Error('Cannot open PDF URL');
        }
      }
    } catch (error) {
      console.error('❌ Error viewing PDF:', error);
      Alert.alert(
        'Error', 
        'Failed to open PDF. The file may not be accessible.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle downloading PDF
  const handleDownloadPDF = async (storageUrl: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Trigger browser download
        const response = await fetch(storageUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'PDF downloaded successfully');
      } else {
        // Mobile: Use share sheet to let user choose where to save
        console.log('💾 Downloading PDF');
        
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            'Not Available',
            'File sharing is not available on this device.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Download to documents directory
        const fileUri = FileSystem.documentDirectory + filename;
        
        // Show loading
        Alert.alert('Downloading', 'Preparing file...', [], { cancelable: false });
        
        await FileSystem.downloadAsync(storageUrl, fileUri);
        
        // Dismiss loading
        Alert.alert('', '');
        
        // Share the file - this opens native share sheet
        // User can choose to save to Files, iCloud, Google Drive, etc.
        // No special permissions needed - share sheet handles it
        await Sharing.shareAsync(fileUri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Save PDF',
        });
        
        Alert.alert(
          'Success', 
          'Use the share menu to save the PDF to your preferred location.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      // Provide helpful error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        Alert.alert(
          'Network Error',
          'Failed to download PDF. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('storage') || errorMessage.includes('space')) {
        Alert.alert(
          'Storage Error',
          'Not enough storage space on your device. Please free up some space and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to download PDF. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Check if a button should be disabled based on feature flags and note type
  const isButtonDisabled = (buttonId: string): boolean => {
    switch (buttonId) {
      case 'quiz':
        return !isFeatureEnabled('ai_quiz');
      case 'flashcards':
        return !isFeatureEnabled('ai_flashcards');
      case 'aiChat':
        return !isFeatureEnabled('ai_chat');
      case 'writeEssay':
        return !isFeatureEnabled('ai_write_essay');
      case 'share':
        return false; // Note sharing is always enabled
      case 'transcription':
        // Only show transcription button for audio notes
        return !note || !isAudioNote(note);
      case 'viewPDF':
      case 'downloadPDF':
        // Only show PDF buttons for PDF notes
        return !note || !isPDFNote(note);
      default:
        return false;
    }
  };

  // Handle action button presses
  const handleActionButton = (buttonId: string) => {
    console.log('🔘 Button pressed:', buttonId, 'Disabled:', isButtonDisabled(buttonId));
    
    // Don't handle disabled buttons
    if (isButtonDisabled(buttonId)) {
      console.log('❌ Button is disabled, not handling');
      return;
    }

    switch (buttonId) {
      case 'quiz':
        // Navigate to quiz creation page with note ID
        router.push(`/quizzes/create?noteId=${id}`);
        break;
      case 'transcription':
        router.push(`/ai-transcriptions?noteId=${id}`);
        break;
      case 'flashcards':
        // Navigate to flashcards page with note ID
        router.push(`/flashcards?noteId=${id}`);
        break;
      case 'aiChat':
        Alert.alert('AI Chat', 'AI Chat feature coming soon!');
        break;
      case 'writeEssay':
        Alert.alert('Write Essay', 'Write Essay feature coming soon!');
        break;
      case 'share':
        console.log('📤 Opening share modal');
        setShowShareModal(true);
        break;
      case 'viewPDF':
        console.log('👁️ Opening PDF viewer');
        if (note && note.pdfFiles && note.pdfFiles.length > 0) {
          handleViewPDF(note.pdfFiles[0].storageUrl);
        }
        break;
      case 'downloadPDF':
        console.log('💾 Downloading PDF');
        if (note && note.pdfFiles && note.pdfFiles.length > 0) {
          handleDownloadPDF(note.pdfFiles[0].storageUrl, note.pdfFiles[0].filename);
        }
        break;
      default:
        break;
    }
  };

  // Get icon for each button
  const getButtonIcon = (buttonId: string) => {
    switch (buttonId) {
      case 'quiz':
        return 'help-circle';
      case 'transcription':
        return 'text';
      case 'flashcards':
        return 'card';
      case 'aiChat':
        return 'chatbubble-ellipses';
      case 'writeEssay':
        return 'create';
      case 'share':
        return 'share';
      case 'viewPDF':
        return 'eye';
      case 'downloadPDF':
        return 'download';
      default:
        return 'help-circle';
    }
  };

  // Web-specific handlers
  const handleWebCreateNote = () => {
    router.push('create');
  };

  const handleWebSearch = () => {
    router.push('/(tabs)/search');
  };

  const handleWebHome = () => {
    router.back();
  };

  const handleWebSettings = () => {
    router.push('/(tabs)/settings');
  };



  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'e',
      ctrl: true,
      action: () => router.push(`/create?noteId=${id}` as any),
      description: 'Edit note',
    },
    {
      key: 'a',
      ctrl: true,
      action: handleArchiveToggle,
      description: 'Toggle archive',
    },
    {
      key: 'Escape',
      action: () => router.back(),
      description: 'Go back',
    },
  ]);

  const iconColor = useThemeColor({}, 'text');
  const actionButtonBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const badgeBg = useThemeColor({ light: '#E5E7EB', dark: '#282828' }, 'background');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const accentDangerColor = useThemeColor({}, 'accentDanger');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.loadingContainer, { backgroundColor }]}>
          <LoadingSpinner size={50} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>Loading note...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!note) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.errorContainer, { backgroundColor }]}>
          <Ionicons name="document-outline" size={64} color={accentDangerColor} />
          <ThemedText style={[styles.errorText, { color: accentDangerColor }]}>Note not found</ThemedText>
          <ThemedText style={[styles.errorSubtext, { color: mutedTextColor }]}>The note you&apos;re looking for doesn&apos;t exist or has been deleted.</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    const sidebarItems = [
      {
        id: 'home',
        label: 'All Notes',
        icon: 'document-text' as const,
        onPress: handleWebHome,
        isActive: false,
      },
      {
        id: 'favorites',
        label: 'Favorites',
        icon: 'star' as const,
        onPress: () => {},
        isActive: false,
      },
      {
        id: 'archived',
        label: 'Archived',
        icon: 'archive' as const,
        onPress: () => router.push('archived'),
        isActive: false,
      },
      {
        id: 'audio',
        label: 'Audio Notes',
        icon: 'mic' as const,
        onPress: () => router.push('/create-audio'),
        isActive: false,
      },
    ];

    return (
      <WebLayout
        sidebar={
          <UserSidebar
            activePage="note"
          />
        }
        header={
          <View style={[styles.webHeader, { backgroundColor }]}>
            <TouchableOpacity style={[styles.webBackButton, { backgroundColor: cardBackground }]} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={textColor} />
              <ThemedText style={[styles.webBackText, { color: textColor }]}>Back</ThemedText>
            </TouchableOpacity>
            <View style={styles.webHeaderInfo}>
              <ThemedText style={[styles.webHeaderTitle, { color: textColor }]}>
                {note.title || 'Untitled Note'}
              </ThemedText>
              <ThemedText style={[styles.webHeaderDate, { color: mutedTextColor }]}>
                {formatDate(note.createdAt)}
              </ThemedText>
            </View>
            <View style={styles.webHeaderRight}>
              <View style={styles.webNoteTypeBadge}>
                {isPDFNote(note) ? (
                  <View style={[styles.webPDFNoteBadge, { backgroundColor: cardBackground }]}>
                    <Ionicons name="document" size={16} color="#E74C3C" />
                    <ThemedText style={[styles.webAudioNoteText, { color: '#E74C3C' }]}>PDF Note</ThemedText>
                  </View>
                ) : isAudioNote(note) ? (
                  <View style={[styles.webAudioNoteBadge, { backgroundColor: cardBackground }]}>
                    <Ionicons name="musical-notes" size={16} color={accentColor} />
                    <ThemedText style={[styles.webAudioNoteText, { color: accentColor }]}>Audio Note</ThemedText>
                  </View>
                ) : (
                  <View style={[styles.webTextNoteBadge, { backgroundColor: cardBackground }]}>
                    <Ionicons name="document-text" size={16} color={accentColor} />
                    <ThemedText style={[styles.webTextNoteText, { color: accentColor }]}>Text Note</ThemedText>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={[
                  styles.webEditButton, 
                  { 
                    backgroundColor: canEditNote(note) ? cardBackground : '#CCCCCC',
                    opacity: canEditNote(note) ? 1 : 0.5
                  }
                ]} 
                onPress={() => canEditNote(note) ? router.push(`/create?noteId=${note.id}` as any) : null}
                disabled={!canEditNote(note)}
              >
                <Ionicons name="create-outline" size={20} color={canEditNote(note) ? textColor : '#666666'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.webArchiveButton, 
                  { 
                    backgroundColor: canEditNote(note) ? cardBackground : '#CCCCCC',
                    opacity: canEditNote(note) ? 1 : 0.5
                  }
                ]} 
                onPress={() => canEditNote(note) ? handleArchiveToggle() : null}
                disabled={!canEditNote(note)}
              >
                <Ionicons 
                  name={note.isArchived ? 'archive' : 'archive-outline'} 
                  size={20} 
                  color={canEditNote(note) ? textColor : '#666666'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        }
      >
        <ScrollView style={styles.webContent} contentContainerStyle={styles.webContentContainer}>
          {/* Main Content Area */}
          <View style={styles.webMainContent}>
            {/* Audio Player for Audio Notes - Only show if there's exactly one audio file */}
            {isAudioNote(note) && note.audioFiles && note.audioFiles.length === 1 && (
              (() => {
                const audioFile = note.audioFiles[0];
                return (
                  <View style={styles.webAudioSection}>
                    <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Audio</ThemedText>
                    <AudioPlayer 
                      audioFile={audioFile}
                      onTranscriptionUpdate={(transcription) => {
                        // Handle transcription updates if needed
                        console.log('Transcription updated:', transcription);
                      }}
                      onTranscriptionStatusUpdate={(status) => {
                        // Handle transcription status updates
                        console.log('Transcription status updated:', status);
                        // You could update the note state here if needed
                      }}
                    />
                  </View>
                );
              })()
            )}

            {/* Multiple Audio Files Section - Show when there are multiple audio files */}
            {note.audioFiles && note.audioFiles.length > 1 && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Audio Files</ThemedText>
                {note.audioFiles.map((audioFile, index) => (
                  <View key={audioFile.id || index} style={[styles.webContentText, { backgroundColor: cardBackground, marginBottom: 12 }]}>
                    <ThemedText style={[styles.webContentTextInner, { color: mutedTextColor, fontSize: 12, marginBottom: 8 }]}>
                      Audio File {index + 1}
                    </ThemedText>
                    <AudioPlayer 
                      audioFile={audioFile}
                      onTranscriptionUpdate={(transcription) => {
                        console.log(`Transcription updated for audio ${index}:`, transcription);
                      }}
                      onTranscriptionStatusUpdate={(status) => {
                        console.log(`Transcription status updated for audio ${index}:`, status);
                      }}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Note Content - Only show for non-audio notes or audio notes with content */}
            {(!isAudioNote(note) || (isAudioNote(note) && note.content && note.content.trim() !== '')) && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Content</ThemedText>
                <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                  {isRichTextEnabled ? (
                    Platform.OS === 'web' ? (
                      <RichTextViewerWeb
                        content={note.contentHtml || note.content || ''}
                        contentFormat={note.contentFormat === 'html' ? 'html' : 'plain'}
                        textStyle={{ color: textColor }}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <RichTextViewerNative
                        content={note.contentHtml || note.content || ''}
                        contentFormat={note.contentFormat === 'html' ? 'html' : 'plain'}
                        textStyle={{ color: textColor }}
                        style={{ flex: 1 }}
                      />
                    )
                  ) : (
                    <ThemedText style={[styles.webContentTextInner, { color: textColor }]}>
                      {note.content || 'No content available'}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}

            {/* Summary Section - Show if enabled and has content or usage limit */}
            {isAISummariesEnabled && (summary || summaryLoading || summaryUsageLimit) && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Summary</ThemedText>
                {user && (
                  <View>
                    {(() => {
                      try {
                        return <FeatureUsageInline featureId="ai_summaries" compact={true} onUpgradePress={() => router.push('/join-premium')} />;
                      } catch (error) {
                        console.warn('Error rendering AI summaries usage display:', error);
                        return null;
                      }
                    })()}
                  </View>
                )}
                {summaryLoading && (
                  <View style={[styles.webLoadingContainer, { backgroundColor: cardBackground }]}>
                    <LoadingSpinner size={20} />
                    <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>Generating summary...</ThemedText>
                  </View>
                )}
                {!summaryLoading && summary && (
                  <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webContentTextInner, { color: textColor }]}>
                      {summary}
                    </ThemedText>
                  </View>
                )}
                {!summaryLoading && !summary && summaryUsageLimit && (
                  <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webNoDetailsText, { color: mutedTextColor }]}>
                      {summaryUsageLimit}
                    </ThemedText>
                    <TouchableOpacity 
                      style={[styles.webUpgradeButton, { backgroundColor: accentColor }]}
                      onPress={() => router.push('/join-premium')}
                    >
                      <ThemedText style={styles.webUpgradeButtonText}>Upgrade to Premium</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
                        )}



            {/* Key Details Section - Show if enabled and has content or usage limit */}
            {isAIKeyDetailsEnabled && (keyDetailsLoading || (keyDetails && keyDetails.length > 0) || summaryUsageLimit) && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Key Details</ThemedText>
                
                {/* Debug Info - Only show in development */}
                {__DEV__ && (
                  <View style={[styles.webContentText, { backgroundColor: cardBackground, marginBottom: 12 }]}>
                    <ThemedText style={[styles.webContentTextInner, { color: mutedTextColor, fontSize: 12 }]}>
                      Debug Info:{'\n'}
                      • Feature Enabled: {isAIKeyDetailsEnabled ? 'Yes' : 'No'}{'\n'}
                      • Note Content Length: {note?.content?.length || 0}{'\n'}
                      • Key Details in Note: {note?.keyDetails ? 'Yes' : 'No'}{'\n'}
                      • Key Details in State: {keyDetails ? keyDetails.length : 0}{'\n'}
                      • Loading: {keyDetailsLoading ? 'Yes' : 'No'}{'\n'}
                      • Generated For: {keyDetailsGeneratedFor || 'None'}{'\n'}
                      • Processed Notes: {Array.from(processedNotesRef.current).join(', ') || 'None'}
                    </ThemedText>
                  </View>
                )}
                {user && (
                  <View>
                    {(() => {
                      try {
                        return <FeatureUsageInline featureId="ai_key_details" compact={true} onUpgradePress={() => router.push('/join-premium')} />;
                      } catch (error) {
                        console.warn('Error rendering AI key details usage display:', error);
                        return null;
                      }
                    })()}
                  </View>
                )}
                {keyDetailsLoading && (
                  <View style={[styles.webLoadingContainer, { backgroundColor: cardBackground }]}>
                    <LoadingSpinner size={20} />
                    <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>Generating key details...</ThemedText>
                  </View>
                )}
                {!keyDetailsLoading && keyDetails && keyDetails.length > 0 && (
                  <View style={styles.webKeyDetailsList}>
                    {keyDetails.map((detail, idx) => (
                      <View key={idx} style={styles.webKeyDetailItem}>
                        <ThemedText style={[styles.webKeyDetailText, { color: textColor }]}>• {detail}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
                {!keyDetailsLoading && (!keyDetails || keyDetails.length === 0) && summaryUsageLimit && (
                  <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webNoDetailsText, { color: mutedTextColor }]}>
                      {summaryUsageLimit}
                    </ThemedText>
                    <TouchableOpacity 
                      style={[styles.webUpgradeButton, { backgroundColor: accentColor }]}
                      onPress={() => router.push('/join-premium')}
                    >
                      <ThemedText style={styles.webUpgradeButtonText}>Upgrade to Premium</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Tags</ThemedText>
                <View style={styles.webTagsContainer}>
                  {note.tags.map((tag, index) => (
                    <View key={index} style={[styles.webTag, { backgroundColor: cardBackground }]}>
                      <ThemedText style={[styles.webTagText, { color: textColor }]}>#{tag}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* PDF Files Section - Show for PDF notes */}
            {note.type === 'pdf' && note.pdfFiles && note.pdfFiles.length > 0 && (
              <View style={styles.webContentSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                  PDF Document{note.pdfFiles.length > 1 ? 's' : ''} ({note.pdfFiles.length})
                </ThemedText>
                {note.pdfFiles.map((pdfFile, index) => (
                  <View key={pdfFile.id || index} style={[styles.pdfFileCard, { backgroundColor: cardBackground, borderColor: borderColor }]}>
                    <View style={styles.pdfFileHeader}>
                      <View style={styles.pdfFileIcon}>
                        <Ionicons name="document" size={32} color="#E74C3C" />
                      </View>
                      <View style={styles.pdfFileInfo}>
                        <ThemedText style={[styles.pdfFileName, { color: textColor }]}>
                          {pdfFile.filename}
                        </ThemedText>
                        <View style={styles.pdfFileMeta}>
                          <ThemedText style={[styles.pdfFileMetaText, { color: mutedTextColor }]}>
                            {pdfFile.pageCount || 1} page{(pdfFile.pageCount || 1) > 1 ? 's' : ''}
                          </ThemedText>
                          <ThemedText style={[styles.pdfFileMetaText, { color: mutedTextColor }]}>•</ThemedText>
                          <ThemedText style={[styles.pdfFileMetaText, { color: mutedTextColor }]}>
                            {pdfFile.fileSize ? `${(pdfFile.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                          </ThemedText>
                        </View>
                        <View style={styles.pdfFileStatus}>
                          <Ionicons 
                            name={pdfFile.extractionStatus === 'completed' ? 'checkmark-circle' : 'time'} 
                            size={14} 
                            color={pdfFile.extractionStatus === 'completed' ? '#10B981' : '#F59E0B'} 
                          />
                          <ThemedText style={[styles.pdfFileStatusText, { 
                            color: pdfFile.extractionStatus === 'completed' ? '#10B981' : '#F59E0B' 
                          }]}>
                            {pdfFile.extractionStatus === 'completed' ? 'Text extracted' : 'Extraction pending'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.pdfFileActions}>
                      <TouchableOpacity 
                        style={[styles.pdfActionButton, styles.viewButton, { backgroundColor: accentColor }]}
                        onPress={() => handleViewPDF(pdfFile.storageUrl)}
                      >
                        <Ionicons name="eye" size={18} color="#FFFFFF" />
                        <ThemedText style={styles.pdfActionButtonText}>View PDF</ThemedText>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.pdfActionButton, styles.downloadButton, { 
                          backgroundColor: 'transparent',
                          borderWidth: 1,
                          borderColor: accentColor 
                        }]}
                        onPress={() => handleDownloadPDF(pdfFile.storageUrl, pdfFile.filename)}
                      >
                        <Ionicons name="download" size={18} color={accentColor} />
                        <ThemedText style={[styles.pdfActionButtonText, { color: accentColor }]}>Download</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Sidebar with Actions and Details */}
          <View style={styles.webSidebar}>
            {/* Action Buttons */}
            <View style={styles.webActionSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Actions</ThemedText>
                             <View style={styles.webActionGrid}>
                 {BUTTONS.filter(button => {
                   const disabled = isButtonDisabled(button.id);
                   console.log('🌐 Web Button:', button.id, 'Disabled:', disabled);
                   return !disabled;
                 }).map((button) => (
                   <TouchableOpacity
                     key={button.id}
                     style={[
                       styles.webActionButton, 
                       { 
                         backgroundColor: button.color,
                         opacity: 1
                       }
                     ]}
                     onPress={() => handleActionButton(button.id)}
                   >
                     <Ionicons 
                       name={getButtonIcon(button.id)} 
                       size={16} 
                       color="#FFFFFF" 
                     />
                     <ThemedText style={[
                       styles.webActionButtonText,
                       { color: '#FFFFFF' }
                     ]}>
                       {button.label}
                     </ThemedText>
                   </TouchableOpacity>
                 ))}
               </View>
             </View>

            {/* Note Details */}
            <View style={styles.webDetailsSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Details</ThemedText>
              <View style={styles.webDetailItem}>
                <ThemedText style={[styles.webDetailLabel, { color: mutedTextColor }]}>Created</ThemedText>
                <ThemedText style={[styles.webDetailValue, { color: textColor }]}>{formatDate(note.createdAt)}</ThemedText>
              </View>
              <View style={styles.webDetailItem}>
                <ThemedText style={[styles.webDetailLabel, { color: mutedTextColor }]}>Last Modified</ThemedText>
                <ThemedText style={[styles.webDetailValue, { color: textColor }]}>{formatDate(note.updatedAt)}</ThemedText>
              </View>
              {note.isArchived && (
                <View style={[styles.webArchivedBadge, { backgroundColor: cardBackground }]}>
                  <Ionicons name="archive" size={16} color={mutedTextColor} />
                  <ThemedText style={[styles.webArchivedText, { color: mutedTextColor }]}>Archived</ThemedText>
                </View>
              )}
            </View>

            {/* Keyboard Shortcuts */}
            <View style={styles.webShortcutsSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Shortcuts</ThemedText>
              <View style={styles.webShortcutsList}>
                <View style={styles.webShortcutItem}>
                  <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>⌘E</ThemedText>
                  <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>Edit note</ThemedText>
                </View>
                <View style={styles.webShortcutItem}>
                  <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>⌘A</ThemedText>
                  <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>Toggle archive</ThemedText>
                </View>
                <View style={styles.webShortcutItem}>
                  <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>Esc</ThemedText>
                  <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>Go home</ThemedText>
                </View>
              </View>
            </View>

            {/* Debug Section - Only show in development */}
            {__DEV__ && (
              <View style={styles.webShortcutsSection}>
                <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>Debug Tools</ThemedText>
                <View style={styles.webShortcutsList}>
                  <TouchableOpacity 
                    style={[styles.webActionButton, { backgroundColor: '#FF6B6B' }]}
                    onPress={testGeminiAPI}
                  >
                    <Ionicons name="bug" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.webActionButtonText}>Test API</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Share Modal */}
        <ShareModal
          visible={showShareModal}
          note={note}
          onClose={() => setShowShareModal(false)}
          onShareSuccess={() => {
            // Refresh note data to show updated sharing status
            if (note) {
              // You could add a refresh function here if needed
              console.log('Note shared successfully');
            }
          }}
        />
       </WebLayout>
     );
   }

  // Mobile layout (existing code)
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={[styles.headerTitle, { color: textColor }]}>{note.title || 'Untitled Note'}</ThemedText>
            {note.isSharedNote && (
              <View style={[styles.permissionBadge, { backgroundColor: note.sharePermission === 'read' ? '#FFA500' : '#10B981' }]}>
                <Ionicons 
                  name={note.sharePermission === 'read' ? 'eye' : note.sharePermission === 'edit' ? 'create' : 'shield'} 
                  size={12} 
                  color="#FFFFFF" 
                />
                <ThemedText style={styles.permissionText}>
                  {note.sharePermission === 'read' ? 'Read Only' : note.sharePermission === 'edit' ? 'Can Edit' : 'Admin'}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.headerDate, { color: mutedTextColor }]}>{formatDate(note.createdAt)}</ThemedText>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[
                styles.editButton, 
                { 
                  backgroundColor: canEditNote(note) ? accentColor : '#CCCCCC',
                  opacity: canEditNote(note) ? 1 : 0.5
                }
              ]} 
              onPress={() => canEditNote(note) ? router.push(`/create?noteId=${note.id}` as any) : null}
              disabled={!canEditNote(note)}
            >
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.archiveButton, 
                { 
                  backgroundColor: canEditNote(note) ? accentColor : '#CCCCCC',
                  opacity: canEditNote(note) ? 1 : 0.5
                }
              ]} 
              onPress={() => canEditNote(note) ? handleArchiveToggle() : null}
              disabled={!canEditNote(note)}
            >
              <Ionicons 
                name={note.isArchived ? 'archive' : 'archive-outline'} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Info (Development Only) */}
        {showDebugInfo && (
          <View style={styles.debugSection}>
            <ThemedText style={styles.debugTitle}>🔍 Debug Info (Dev Only)</ThemedText>
            <ThemedText style={styles.debugText}>
              AI Summaries: {isAISummariesEnabled ? '✅' : '❌'}
            </ThemedText>
            <ThemedText style={styles.debugText}>
              AI Key Details: {isAIKeyDetailsEnabled ? '✅' : '❌'}
            </ThemedText>
                         <ThemedText style={styles.debugText}>
               AI Quiz: {isAIQuizEnabled ? '✅' : '❌'}
             </ThemedText>

             <ThemedText style={styles.debugText}>
               AI Chat: {isAIChatEnabled ? '✅' : '❌'}
             </ThemedText>
             <ThemedText style={styles.debugText}>
               AI Write Essay: {isAIWriteEssayEnabled ? '✅' : '❌'}
             </ThemedText>
            <View style={styles.debugButtons}>
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={() => (window as any).debugFeatureFlags?.()}
              >
                <ThemedText style={styles.debugButtonText}>Debug Flags</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.debugButton} 
                onPress={() => (window as any).testAIKeyDetails?.()}
              >
                <ThemedText style={styles.debugButtonText}>Test Key Details</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Note Content */}
        <View style={styles.content}>
          {/* Note Type Indicator */}
          <View style={styles.noteTypeWrapper}>
            <View style={styles.noteTypeOuterContainer}>
              <View style={styles.noteTypeContainer}>
                {isPDFNote(note) ? (
                  <View style={[styles.pdfNoteBadge, { backgroundColor: cardBackground, borderColor: '#E74C3C' }]}>
                    <Ionicons name="document" size={16} color="#E74C3C" />
                    <ThemedText style={[styles.audioNoteText, { color: '#E74C3C' }]}>PDF Note</ThemedText>
                  </View>
                ) : isAudioNote(note) ? (
                  <View style={[styles.audioNoteBadge, { backgroundColor: cardBackground, borderColor: accentColor }]}>
                    <Ionicons name="musical-notes" size={16} color={accentColor} />
                    <ThemedText style={[styles.audioNoteText, { color: accentColor }]}>Audio Note</ThemedText>
                  </View>
                ) : (
                  <View style={[styles.textNoteBadge, { backgroundColor: cardBackground, borderColor: accentColor }]}>
                    <Ionicons name="document-text" size={16} color={accentColor} />
                    <ThemedText style={[styles.textNoteText, { color: accentColor }]}>Text Note</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsWrapper}>
            <View style={styles.actionButtonsContainer}>
                             <View style={styles.buttonRow}>
                 {BUTTONS.slice(0, 2).filter(button => !isButtonDisabled(button.id)).map((button) => (
                   <TouchableOpacity
                     key={button.id}
                     style={[
                       styles.actionButton, 
                       { 
                         backgroundColor: button.color,
                         opacity: 1
                       }
                     ]}
                     onPress={() => handleActionButton(button.id)}
                   >
                     <Ionicons 
                       name={getButtonIcon(button.id)} 
                       size={16} 
                       color={iconColor} 
                     />
                     <ThemedText style={[
                       styles.actionButtonText,
                       { color: iconColor }
                     ]}>
                       {button.label}
                     </ThemedText>
                   </TouchableOpacity>
                 ))}
               </View>
                             <View style={styles.buttonRow}>
                 {BUTTONS.slice(2, 4).filter(button => !isButtonDisabled(button.id)).map((button) => (
                   <TouchableOpacity
                     key={button.id}
                     style={[
                       styles.actionButton, 
                       { 
                         backgroundColor: button.color,
                         opacity: 1
                       }
                     ]}
                     onPress={() => handleActionButton(button.id)}
                   >
                     <Ionicons 
                       name={getButtonIcon(button.id)} 
                       size={16} 
                       color={iconColor} 
                     />
                     <ThemedText style={[
                       styles.actionButtonText,
                       { color: iconColor }
                     ]}>
                       {button.label}
                     </ThemedText>
                   </TouchableOpacity>
                 ))}
               </View>
                             <View style={styles.buttonRow}>
                 {BUTTONS.slice(4, 6).filter(button => {
                   const disabled = isButtonDisabled(button.id);
                   console.log('🔍 Button:', button.id, 'Disabled:', disabled);
                   return !disabled;
                 }).map((button) => (
                   <TouchableOpacity
                     key={button.id}
                     style={[
                       styles.actionButton, 
                       { 
                         backgroundColor: button.color,
                         opacity: 1
                       }
                     ]}
                     onPress={() => handleActionButton(button.id)}
                   >
                     <Ionicons 
                       name={getButtonIcon(button.id)} 
                       size={16} 
                       color={iconColor} 
                     />
                     <ThemedText style={[
                       styles.actionButtonText,
                       { color: iconColor }
                     ]}>
                       {button.label}
                     </ThemedText>
                   </TouchableOpacity>
                 ))}
               </View>
                             <View style={styles.buttonRow}>
                 {BUTTONS.slice(6, 8).filter(button => {
                   const disabled = isButtonDisabled(button.id);
                   console.log('🔍 PDF Button:', button.id, 'Disabled:', disabled);
                   return !disabled;
                 }).map((button) => (
                   <TouchableOpacity
                     key={button.id}
                     style={[
                       styles.actionButton, 
                       { 
                         backgroundColor: button.color,
                         opacity: 1
                       }
                     ]}
                     onPress={() => handleActionButton(button.id)}
                   >
                     <Ionicons 
                       name={getButtonIcon(button.id)} 
                       size={16} 
                       color={iconColor} 
                     />
                     <ThemedText style={[
                       styles.actionButtonText,
                       { color: iconColor }
                     ]}>
                       {button.label}
                     </ThemedText>
                   </TouchableOpacity>
                 ))}
               </View>
            </View>
          </View>

          {/* Debug Section - Only show in development */}
          {__DEV__ && (
            <View style={styles.actionButtonsWrapper}>
              <View style={styles.actionButtonsContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
                    onPress={testGeminiAPI}
                  >
                    <Ionicons name="bug" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.actionButtonText}>Test API</ThemedText>
                  </TouchableOpacity>

                </View>
              </View>
            </View>
          )}

          {/* Audio Player for Audio Notes - Only show if there's exactly one audio file */}
          {isAudioNote(note) && note.audioFiles && note.audioFiles.length === 1 && (
            (() => {
              const audioFile = note.audioFiles[0];
              return (
                <AudioPlayer 
                  audioFile={audioFile}
                  onTranscriptionUpdate={(transcription) => {
                    // Handle transcription updates if needed
                    console.log('Transcription updated:', transcription);
                  }}
                  onTranscriptionStatusUpdate={(status) => {
                    // Handle transcription status updates
                    console.log('Transcription status updated:', status);
                    // You could update the note state here if needed
                  }}
                />
              );
            })()
          )}

          {/* All Audio Files Section - Show when there are multiple audio files */}
          {note.audioFiles && note.audioFiles.length > 1 && (
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summaryTitle, { color: textColor }]}>Audio Files</ThemedText>
              {note.audioFiles.map((audioFile, index) => (
                <View key={audioFile.id || index} style={styles.audioFileItem}>
                  <AudioPlayer 
                    audioFile={audioFile}
                    onTranscriptionUpdate={(transcription) => {
                      console.log(`Transcription updated for audio ${index}:`, transcription);
                      // Update the specific audio file's transcription
                      const updatedAudioFiles = [...(note.audioFiles || [])];
                      updatedAudioFiles[index] = { ...audioFile, transcription };
                      // You could update the note state here
                    }}
                    onTranscriptionStatusUpdate={(status) => {
                      console.log(`Transcription status updated for audio ${index}:`, status);
                      // Update the specific audio file's transcription status
                      const updatedAudioFiles = [...(note.audioFiles || [])];
                      updatedAudioFiles[index] = { ...audioFile, transcriptionStatus: status };
                      // You could update the note state here
                    }}
                  />
                </View>
              ))}
            </View>
          )}



          {/* Note Content Section - Only show for non-audio notes or audio notes with content */}
          {(!isAudioNote(note) || (isAudioNote(note) && note.content && note.content.trim() !== '')) && (
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summaryTitle, { color: textColor }]}>Content</ThemedText>
              {(() => {
                // Debug logging
                console.log('🔍 RichTextViewer Render:', {
                  isRichTextEnabled,
                  contentFormat: note.contentFormat,
                  hasContentHtml: !!note.contentHtml,
                  contentHtmlPreview: note.contentHtml?.substring(0, 50),
                  contentPreview: note.content?.substring(0, 50),
                });
                return null;
              })()}
              {isRichTextEnabled && note.contentFormat === 'html' && note.contentHtml ? (
                Platform.OS === 'web' ? (
                  <RichTextViewerWeb
                    content={note.contentHtml}
                    contentFormat="html"
                    textStyle={{ color: textColor }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <RichTextViewerNative
                    content={note.contentHtml}
                    contentFormat="html"
                    textStyle={{ color: textColor }}
                    style={{ flex: 1 }}
                  />
                )
              ) : (
                <ThemedText style={[styles.summaryContent, { color: textColor }]}>
                  {note.content || 'No content available'}
                </ThemedText>
              )}
            </View>
          )}

                      {/* Summary Section - Show if enabled and has content or usage limit */}
            {isAISummariesEnabled && (summary || summaryLoading || summaryUsageLimit) && (
                          <View style={styles.summarySection}>
              <ThemedText style={[styles.summaryTitle, { color: textColor }]}>Summary</ThemedText>
              {user && (
                <View>
                  {(() => {
                    try {
                      return <FeatureUsageInline featureId="ai_summaries" compact={true} onUpgradePress={() => router.push('/join-premium')} />;
                    } catch (error) {
                      console.warn('Error rendering AI summaries usage display:', error);
                      return null;
                    }
                  })()}
                </View>
              )}
                {summaryLoading && (
                  <ThemedText style={[styles.summaryContent, { color: textColor }]}>Generating summary...</ThemedText>
                )}
                {!summaryLoading && summary && (
                  <ThemedText style={[styles.summaryContent, { color: textColor }]}>
                    {summary}
                  </ThemedText>
                )}
                {!summaryLoading && !summary && summaryUsageLimit && (
                  <View>
                    <ThemedText style={[styles.contentText, { color: mutedTextColor }]}>
                      {summaryUsageLimit}
                    </ThemedText>
                    <TouchableOpacity 
                      style={[styles.upgradeButton, { backgroundColor: accentColor }]}
                      onPress={() => router.push('/join-premium')}
                    >
                      <ThemedText style={styles.upgradeButtonText}>Upgrade to Premium</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          {/* Key Details Section - Show if enabled and has content or usage limit */}
          {isAIKeyDetailsEnabled && (keyDetailsLoading || (keyDetails && keyDetails.length > 0) || summaryUsageLimit) && (
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summarySubtitle, { color: textColor }]}>Key Details</ThemedText>
              
              {/* Debug Info - Only show in development */}
              {__DEV__ && (
                <View style={{ marginBottom: 8, padding: 8, backgroundColor: cardBackground, borderRadius: 8 }}>
                  <ThemedText style={[styles.contentText, { color: mutedTextColor, fontSize: 11 }]}>
                    Debug: Feature={isAIKeyDetailsEnabled ? 'On' : 'Off'}, Content={note?.content?.length || 0}, Loading={keyDetailsLoading ? 'Yes' : 'No'}, Generated={keyDetailsGeneratedFor || 'None'}
                  </ThemedText>
                </View>
              )}
              {user && (
                <View>
                  {(() => {
                    try {
                      return <FeatureUsageInline featureId="ai_key_details" compact={true} onUpgradePress={() => router.push('/join-premium')} />;
                    } catch (error) {
                      console.warn('Error rendering AI key details usage display:', error);
                      return null;
                    }
                  })()}
                </View>
              )}
              {keyDetailsLoading && (
                <ThemedText style={[styles.summaryContent, { color: textColor }]}>Generating key details...</ThemedText>
              )}
              {!keyDetailsLoading && keyDetails && keyDetails.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {keyDetails.map((detail, idx) => (
                    <ThemedText key={idx} style={[styles.contentText, { color: textColor }]}>{`• ${detail}`}</ThemedText>
                  ))}
                </View>
              )}
              {!keyDetailsLoading && (!keyDetails || keyDetails.length === 0) && summaryUsageLimit && (
                <View>
                  <ThemedText style={[styles.contentText, { color: mutedTextColor }]}>
                    {summaryUsageLimit}
                  </ThemedText>
                  <TouchableOpacity 
                    style={[styles.upgradeButton, { backgroundColor: accentColor }]}
                    onPress={() => router.push('/join-premium')}
                  >
                    <ThemedText style={styles.upgradeButtonText}>Upgrade to Premium</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <ThemedText style={[styles.sectionLabel, { color: mutedTextColor }]}>Tags</ThemedText>
              <View style={styles.tagsContainer}>
                {note.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: cardBackground }] }>
                    <ThemedText style={[styles.tagText, { color: textColor }]}>#{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Dates */}
          <View style={styles.datesSection}>
            <ThemedText style={[styles.sectionLabel, { color: mutedTextColor }]}>Details</ThemedText>
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: mutedTextColor }]}>Created</ThemedText>
              <ThemedText style={[styles.dateValue, { color: textColor }]}>{formatDate(note.createdAt)}</ThemedText>
            </View>
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: mutedTextColor }]}>Last Modified</ThemedText>
              <ThemedText style={[styles.dateValue, { color: textColor }]}>{formatDate(note.updatedAt)}</ThemedText>
            </View>
            {note.isArchived && (
              <View style={[styles.archivedBadge, { backgroundColor: cardBackground }]}>
                <Ionicons name="archive" size={16} color={mutedTextColor} />
                <ThemedText style={[styles.archivedText, { color: mutedTextColor }]}>Archived</ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        note={note}
        onClose={() => setShowShareModal(false)}
        onShareSuccess={() => {
          // Refresh note data to show updated sharing status
          if (note) {
            // You could add a refresh function here if needed
            console.log('Note shared successfully');
          }
        }}
      />
    </ThemedView>
  );
} 