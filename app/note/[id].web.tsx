import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    Alert,
    Linking,
    Platform,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import { AudioPlayer } from '../../components/AudioPlayer';
import { FeatureUsageInline } from '../../components/FeatureUsageInline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { RichTextViewer as RichTextViewerWeb } from '../../components/RichTextViewer.web';
import { ShareModal } from '../../components/ShareModal';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { useUnifiedFeatureLimits } from '../../hooks/useUnifiedFeatureLimits';
import { extractKeyDetailsWithGemini, generateSummaryWithGemini, testGeminiConnection } from '../../services/GeminiAI';
import { featureLimitService } from '../../services/FeatureLimitService';
import { supabase } from '../../lib/supabase';
import { FlashcardService } from '../../services/FlashcardService';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { NoteDetailStyles as styles } from '../../styles/NoteDetailStyles';
import { AudioFile, Note } from '../../types/Note';

// Import web components
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';

export default function NoteDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSnackbar } = useSnackbar();
  
  const BUTTONS = [
    { id: 'transcription', label: t('noteDetail.transcription'), color: '#3CB371' },
    { id: 'quiz', label: t('noteDetail.quiz'), color: '#6A5ACD' },
    { id: 'flashcards', label: t('noteDetail.flashcards'), color: '#9932CC' },
    { id: 'aiChat', label: t('noteDetail.aiChat'), color: '#FF8C00' },
    { id: 'writeEssay', label: t('noteDetail.writeEssay'), color: '#00CED1' },
    { id: 'share', label: t('noteDetail.share'), color: '#10B981' },
    { id: 'viewPDF', label: t('noteDetail.viewPDF'), color: '#E74C3C' },
    { id: 'downloadPDF', label: t('noteDetail.downloadPDF'), color: '#2563EB' },
  ];
  const navigation = useNavigation();
  useLayoutEffect(() => {
    // Explicitly hide React Navigation header
    navigation.setOptions({ 
      headerShown: false,
      header: () => null
    });
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
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

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
  const isAIQuizEnabled = isFeatureEnabled('ai_quiz');
  const isAIFlashcardsEnabled = isFeatureEnabled('ai_flashcards');
  const isAIChatEnabled = isFeatureEnabled('ai_chat');
  const isAIWriteEssayEnabled = isFeatureEnabled('ai_write_essay');
  
  // Get refresh function for usage limits
  const { refreshLimits } = useUnifiedFeatureLimits();
  
  // Debug logging for feature flags
  console.log('🔍 NoteDetailScreen: Feature flag status:', {
    ai_summaries: isAISummariesEnabled,
    ai_key_details: isAIKeyDetailsEnabled,
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
      console.log('🔍 NoteDetailScreen: Note state changed:', {
        noteId: note.id,
        title: note.title,
        titleLength: note.title?.length || 0,
        titleIsEmpty: !note.title || note.title.trim().length === 0,
        hasContent: !!note.content,
        contentLength: note.content?.length || 0,
        contentIsEmpty: !note.content || note.content.trim().length === 0,
        hasContentHtml: !!note.contentHtml,
        contentHtmlLength: note.contentHtml?.length || 0,
        contentFormat: note.contentFormat,
        shouldUseRichTextViewer: Platform.OS === 'web' && note.contentFormat === 'html' && note.contentHtml,
        contentPreview: note.content ? note.content.substring(0, 100) : 'NO CONTENT',
        contentHtmlPreview: note.contentHtml ? note.contentHtml.substring(0, 100) : 'NO HTML',
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        fullNoteObject: JSON.stringify(note, null, 2).substring(0, 500)
      });
    } else {
      console.log('🔍 NoteDetailScreen: Note is null');
    }
  }, [note]);
  
const { notes, toggleArchive, togglePin, updateNote, deleteNote, refreshNotes } = useNotes(user?.id || '', user?.email || null);

  const ensureNoteShape = useCallback(
    (raw: Note | null | undefined): Note | null => {
      if (!raw) {
        return null;
      }

      const coerceDate = (value: unknown): Date | undefined => {
        if (value instanceof Date) {
          return Number.isNaN(value.getTime()) ? undefined : value;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? undefined : parsed;
        }
        return undefined;
      };

      const normalizedCreatedAt = coerceDate(raw.createdAt) ?? coerceDate(raw.updatedAt) ?? new Date();
      const normalizedUpdatedAt = coerceDate(raw.updatedAt) ?? normalizedCreatedAt ?? new Date();

      return {
        ...raw,
        title: typeof raw.title === 'string' ? raw.title : '',
        content: typeof raw.content === 'string' ? raw.content : '',
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        keyDetails: Array.isArray(raw.keyDetails) ? raw.keyDetails : [],
        summary: raw.summary ?? undefined,
        audioFiles: Array.isArray(raw.audioFiles) ? raw.audioFiles : [],
        pdfFiles: Array.isArray(raw.pdfFiles) ? raw.pdfFiles : [],
        createdAt: normalizedCreatedAt,
        updatedAt: normalizedUpdatedAt,
      };
    },
    []
  );

  const [isHydrating, setIsHydrating] = useState(false);

  const noteNeedsHydration = useCallback(
    (candidate: Note | null | undefined): boolean => {
      if (!candidate) {
        return true;
      }
      const titleMissing =
        typeof candidate.title !== 'string' || candidate.title.trim().length === 0;
      const createdInvalid =
        !(candidate.createdAt instanceof Date) || Number.isNaN(candidate.createdAt.getTime());
      const updatedInvalid =
        !(candidate.updatedAt instanceof Date) || Number.isNaN(candidate.updatedAt.getTime());
      return titleMissing || createdInvalid || updatedInvalid;
    },
    []
  );

  // Global debug function for testing feature flags
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugFeatureFlags = () => {
        console.log('🔍 Debug Feature Flags:');
        console.log('ai_summaries:', isAISummariesEnabled);
        console.log('ai_key_details:', isAIKeyDetailsEnabled);
        console.log('useFeatureFlags hook:', { isFeatureEnabled });
      };
    }
  }, [isAISummariesEnabled, isAIKeyDetailsEnabled, isFeatureEnabled]);

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
    const hasPDFFiles = !!(note.pdfFiles && note.pdfFiles.length > 0);
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

  // Simplified note loading: single source of truth from Supabase
  // Only use cache as fallback if Supabase fetch fails
  useEffect(() => {
    if (!id) return;
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[NoteDetail] Waiting for auth to load...');
      return;
    }
    
    // If no user, redirect to login
    if (!user?.id) {
      console.log('[NoteDetail] User not authenticated, redirecting to login');
      router.push({
        pathname: '/(auth)/login',
        params: { redirect: `/note/${id}` }
      });
      return;
    }

    // Reset state when note ID changes
    setIsContentExpanded(false);
    setIsSummaryExpanded(false);
    setNote(null);
    setLoading(true);
    setIsHydrating(true);
    // CRITICAL: Reset generation flags when note ID changes to allow fresh generation
    setKeyDetailsGeneratedFor(null);
    setSummaryGeneratedFor(null);
    if (__DEV__) console.log(`🔍 NoteDetailScreen: Note ID changed to ${id}, resetting generation flags`);

    // Fetch note directly from Supabase - this is our single source of truth
    const fetchNote = async () => {
      try {
        console.log('[NoteDetail] 🔍 Fetching note from Supabase:', id);
        
        const fetchedNote = await supabaseNoteStorage.getNote(id);
        
        if (fetchedNote) {
          console.log('[NoteDetail] ✅ Note fetched successfully:', {
            id: fetchedNote.id,
            title: fetchedNote.title,
            titleLength: fetchedNote.title?.length || 0,
            contentLength: fetchedNote.content?.length || 0,
            hasContentHtml: !!fetchedNote.contentHtml
          });
          
          const normalizedNote = ensureNoteShape(fetchedNote);
          if (normalizedNote) {
            console.log('[NoteDetail] ✅ Setting note state with normalized data');
            setNote(normalizedNote);
          } else {
            console.warn('[NoteDetail] ⚠️ Failed to normalize note, trying cache fallback');
            // Fallback to cache if normalization fails
            const cachedNote = notes.find(n => n.id === id);
            if (cachedNote) {
              const normalizedCached = ensureNoteShape(cachedNote);
              if (normalizedCached) {
                setNote(normalizedCached);
              } else {
                setNote(null);
              }
            } else {
              setNote(null);
            }
          }
        } else {
          console.log('[NoteDetail] ❌ Note not found in Supabase, trying cache fallback');
          // Fallback to cache if Supabase returns null
          const cachedNote = notes.find(n => n.id === id);
          if (cachedNote) {
            const normalizedCached = ensureNoteShape(cachedNote);
            if (normalizedCached) {
              console.log('[NoteDetail] ✅ Using cached note as fallback');
              setNote(normalizedCached);
            } else {
              setNote(null);
            }
          } else {
            setNote(null);
          }
        }
      } catch (error) {
        console.error('[NoteDetail] ❌ Error fetching note:', error);
        // Fallback to cache on error
        const cachedNote = notes.find(n => n.id === id);
        if (cachedNote) {
          const normalizedCached = ensureNoteShape(cachedNote);
          if (normalizedCached) {
            console.log('[NoteDetail] ✅ Using cached note as error fallback');
            setNote(normalizedCached);
          } else {
            setNote(null);
          }
        } else {
          setNote(null);
        }
      } finally {
        setLoading(false);
        setIsHydrating(false);
      }
    };

    fetchNote();
  }, [id, user?.id, authLoading, ensureNoteShape]);

  // Update note from cache only when it changes (e.g., after save)
  // This is a secondary update mechanism, not the primary source
  useEffect(() => {
    if (!id || !note || notes.length === 0) return;
    
    const updatedNote = notes.find(n => n.id === id);
    if (!updatedNote) return;
    
    // Only update if we're not currently loading and the note has actually changed
    if (loading || isHydrating) return;
    
    const normalizedUpdatedNote = ensureNoteShape(updatedNote);
    if (!normalizedUpdatedNote) return;
    
    // Check if the updated note has newer data (by timestamp)
    const currentTimestamp = note.updatedAt?.getTime() || 0;
    const updatedTimestamp = normalizedUpdatedNote.updatedAt?.getTime() || 0;
    
    // Only update if the cache has newer data
    if (updatedTimestamp > currentTimestamp) {
      console.log('[NoteDetail] 📝 Updating note from cache (newer timestamp detected)');
      setNote(normalizedUpdatedNote);
    }
  }, [notes, id, note, loading, isHydrating, ensureNoteShape]);

  // Memoize note content combination to prevent unnecessary re-computation
  const getNotePlainText = useCallback((source: Note | null | undefined): string => {
    if (!source) {
      return '';
    }

    if (source.content && source.content.trim().length > 0) {
      return source.content;
    }

    if (source.contentHtml) {
      const withoutTags = source.contentHtml
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ');
      return withoutTags.trim();
    }

    return '';
  }, []);

  const combinedNoteContent = useMemo(() => {
    if (!note) return '';
    
    let text = getNotePlainText(note);
    
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
  }, [note, note?.audioFiles, (note as any)?.transcription, getNotePlainText]);

  // Memoized key details generation function
  const generateKeyDetails = useCallback(async (text: string, noteId: string) => {
    if (!user || !noteId) return;
    
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
        setKeyDetailsGeneratedFor(noteId);
          setSummaryUsageLimit(t('noteDetail.usageLimitReached', { currentUsage: canUseResult.currentUsage, limit: canUseResult.limit }));
        return;
      }
      
      // Generate key details
      if (__DEV__) console.log('🔍 NoteDetailScreen: Starting key details generation');
      setKeyDetailsLoading(true);
      setKeyDetailsGeneratedFor(noteId);
      
      const details = await extractKeyDetailsWithGemini(text, user);
      if (__DEV__) console.log('🔍 NoteDetailScreen: Key details generated successfully:', details);
      
      setKeyDetails(details);
      setKeyDetailsLoading(false);
      
      // Record usage if generation succeeded
      if (user?.id && details && details.length > 0) {
        try {
          console.log(`🔍 NoteDetailScreen: Recording usage for ai_key_details - userId: ${user.id}, noteId: ${noteId}`);
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_key_details', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          console.log('✅ NoteDetailScreen: AI key details usage recorded successfully');
          
          // Refresh usage limits to update the counter
          setTimeout(() => {
            refreshLimits().catch(err => {
              console.warn('Failed to refresh usage limits after recording:', err);
            });
          }, 500); // Small delay to ensure database update is complete
        } catch (usageError) {
          console.error('❌ NoteDetailScreen: Failed to record AI key details usage:', usageError);
          // Don't throw - allow UI to continue even if usage tracking fails
        }
      } else {
        console.warn(`🔍 NoteDetailScreen: Skipping usage recording - user: ${!!user?.id}, details: ${details?.length || 0}`);
      }
      
      // Save to Firebase
      if (noteId && details && details.length > 0) {
        try {
          if (__DEV__) console.log('🔍 NoteDetailScreen: Saving key details to Firebase');
          await updateNote(noteId, { keyDetails: details });
        } catch (e) {
          console.error('🔍 Failed to save key details:', e);
        }
      }
    } catch (error) {
      console.error('🔍 NoteDetailScreen: Failed to generate key details:', error);
      setKeyDetailsLoading(false);
      
      // If AI key details are disabled, mark as attempted to prevent infinite loop
      // Otherwise, reset to allow retry for other errors
      if (error instanceof Error && error.message.includes('AI key details are currently disabled')) {
        console.log('🔍 NoteDetailScreen: AI key details disabled, marking as attempted to prevent loop');
        setKeyDetailsGeneratedFor(noteId);
      } else {
        setKeyDetailsGeneratedFor(null); // Reset on error to allow retry
      }
    }
  }, [user, updateNote, t, refreshLimits]);

  // Reset generation state when note ID changes - this ensures each note gets a fresh start
  // This effect runs when the URL param changes, which happens before the note loads
  useEffect(() => {
    if (id) {
      console.log(`🔍 NoteDetailScreen: Note ID param changed to ${id}, resetting generation flags`);
      setKeyDetailsGeneratedFor(null);
      setSummaryGeneratedFor(null);
    }
  }, [id]); // Reset when URL param changes

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
      
      // If note already has key details, use them but mark as generated to prevent auto-regeneration
      // This allows manual regeneration later if needed
      if (note.keyDetails && note.keyDetails.length && note.keyDetails.length > 0) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Note already has key details, using existing');
        setKeyDetails(note.keyDetails);
        // Only mark as generated if we haven't already marked it for this note
        if (keyDetailsGeneratedFor !== note.id) {
          setKeyDetailsGeneratedFor(note.id);
        }
        return;
      }
      
      // Skip if we already attempted to generate for this note in this session
      // This prevents infinite loops but allows regeneration when note changes
      if (keyDetailsGeneratedFor === note.id) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Already attempted generation for this note in this session, skipping');
        return;
      }
      
      // Check if user has enabled auto key details generation
      if (user?.preferences?.autoKeyDetails === false) {
        if (__DEV__) console.log('🔍 NoteDetailScreen: Auto key details generation disabled by user preference');
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      // Compute content inside effect to avoid dependency loop
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
      generateKeyDetails(text, note.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, keyDetailsGeneratedFor, isAIKeyDetailsEnabled, user?.id, user?.preferences?.autoKeyDetails, note?.isSharedNote]);

  // Memoized summary generation function
  const generateSummary = useCallback(async (text: string, noteId: string) => {
    if (!user || !noteId) return;
    
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
          setSummaryGeneratedFor(noteId);
          setSummaryUsageLimit(t('noteDetail.usageLimitReachedForSummaries', { currentUsage: canUseResult.currentUsage, limit: canUseResult.limit }));
          return;
        }
      }
        
      // Generate summary
      if (__DEV__) console.log('🔍 NoteDetailScreen: Starting summary generation');
      setSummaryLoading(true);
      setSummaryGeneratedFor(noteId);
      
      const generatedSummary = await generateSummaryWithGemini(text, user);
      if (__DEV__) console.log('🔍 NoteDetailScreen: Summary generated successfully:', generatedSummary);
      
      setSummary(generatedSummary);
      setSummaryLoading(false);
      
      // Record usage if generation succeeded
      if (user?.id && generatedSummary && generatedSummary.trim().length > 0) {
        try {
          console.log(`🔍 NoteDetailScreen: Recording usage for ai_summaries - userId: ${user.id}, noteId: ${noteId}`);
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_summaries', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          console.log('✅ NoteDetailScreen: AI summary usage recorded successfully');
          
          // Refresh usage limits to update the counter
          setTimeout(() => {
            refreshLimits().catch(err => {
              console.warn('Failed to refresh usage limits after recording:', err);
            });
          }, 500); // Small delay to ensure database update is complete
        } catch (usageError) {
          console.error('❌ NoteDetailScreen: Failed to record AI summary usage:', usageError);
          // Don't throw - allow UI to continue even if usage tracking fails
        }
      } else {
        console.warn(`🔍 NoteDetailScreen: Skipping usage recording - user: ${!!user?.id}, summary: ${generatedSummary?.trim().length || 0}`);
      }
      
      // Save to Firebase
      if (noteId && generatedSummary && generatedSummary.trim().length > 0) {
        try {
          if (__DEV__) console.log('🔍 NoteDetailScreen: Saving summary to Firebase');
          await updateNote(noteId, { summary: generatedSummary });
        } catch (e) {
          console.error('🔍 Failed to save summary:', e);
        }
      }
    } catch (error) {
      console.error('🔍 NoteDetailScreen: Failed to generate summary:', error);
      setSummaryLoading(false);
      
      // If AI summaries are disabled, mark as attempted to prevent infinite loop
      // Otherwise, reset to allow retry for other errors
      if (error instanceof Error && error.message.includes('AI summaries are currently disabled')) {
        console.log('🔍 NoteDetailScreen: AI summaries disabled, marking as attempted to prevent loop');
        setSummaryGeneratedFor(noteId);
      } else {
        setSummaryGeneratedFor(null); // Reset on error to allow retry
      }
    }
  }, [user, updateNote, t, refreshLimits]);

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
      
      // If note already has a summary, use it but mark as generated to prevent auto-regeneration
      // This allows manual regeneration later if needed
      if (note.summary && note.summary.trim().length > 0) {
        console.log('🔍 NoteDetailScreen: Note already has a summary, using existing');
        setSummary(note.summary);
        // Only mark as generated if we haven't already marked it for this note
        if (summaryGeneratedFor !== note.id) {
          setSummaryGeneratedFor(note.id);
        }
        return;
      }
      
      // Skip if we already attempted to generate for this note in this session
      // This prevents infinite loops but allows regeneration when note changes
      if (summaryGeneratedFor === note.id) {
        console.log('🔍 NoteDetailScreen: Already attempted summary generation for this note in this session, skipping');
        return;
      }
      
      // Check if user has enabled auto AI summaries generation
      if (user?.preferences?.autoAISummaries === false) {
        console.log('🔍 NoteDetailScreen: Auto AI summaries generation disabled by user preference');
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      // Use memoized content combination
      const text = combinedNoteContent;
      
      console.log('🔍 NoteDetailScreen: Final combined text length for summary:', text.length);
      
      // Skip if no meaningful content
      if (!text.trim()) {
        console.log('🔍 NoteDetailScreen: No meaningful content for summary generation');
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      console.log('🔍 NoteDetailScreen: Content validation passed, proceeding with summary generation');
      
      generateSummary(text, note.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, summaryGeneratedFor, isAISummariesEnabled, user?.id, user?.preferences?.autoAISummaries, note?.isSharedNote]);

  const handleArchiveToggle = async () => {
    if (!note) return;
    
    try {
      await toggleArchive(note.id);
      
      Alert.alert(
        t('noteDetail.success'),
        note.isArchived ? t('noteDetail.noteUnarchived') : t('noteDetail.noteArchived'),
        [{ text: t('noteDetail.ok') }]
      );
    } catch (error) {
      Alert.alert(t('noteDetail.error'), t('noteDetail.failedToUpdateNote'));
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    const notifyNoPermission = () => {
      if (Platform.OS === 'web') {
        showSnackbar(t('noteDetail.noPermissionToDelete'), 'error');
      } else {
        Alert.alert(t('noteDetail.cannotDelete'), t('noteDetail.noPermissionToDelete'));
      }
    };

    // Check permissions for shared notes
    if (!canEditNote(note)) {
      notifyNoPermission();
      return;
    }

    const performDelete = async () => {
      try {
        await deleteNote(note.id);
        try {
          await supabaseNoteStorage.triggerNotesRefresh();
        } catch (refreshError) {
          console.warn('[NoteDetail] Failed to trigger notes refresh after delete:', refreshError);
        }

        try {
          await refreshNotes?.();
        } catch (refreshError) {
          console.warn('[NoteDetail] Failed to call refreshNotes after delete:', refreshError);
        }

        if (Platform.OS === 'web') {
          showSnackbar(t('noteDetail.noteDeleted'), 'success');
          router.back();
        } else {
          Alert.alert(
            t('noteDetail.success'),
            t('noteDetail.noteDeleted'),
            [
              {
                text: t('noteDetail.ok'),
                onPress: () => router.back(),
              },
            ],
          );
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          showSnackbar(t('noteDetail.failedToDeleteNote'), 'error');
        } else {
          Alert.alert(t('noteDetail.error'), t('noteDetail.failedToDeleteNote'));
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(t('noteDetail.confirmDelete'))
        : true;

      if (!confirmed) {
        return;
      }

      await performDelete();
    } else {
      Alert.alert(
        t('noteDetail.deleteNote'),
        t('noteDetail.confirmDelete'),
        [
          { text: t('noteDetail.cancel'), style: 'cancel' },
          {
            text: t('notes.deleteNote'),
            style: 'destructive',
            onPress: () => {
              void performDelete();
            },
          },
        ],
      );
    }
  };

  // Debug function to test Gemini API connection
  const testGeminiAPI = async () => {
    try {
      console.log('🔍 Testing Gemini API connection...');
      const result = await testGeminiConnection();
      console.log('🔍 Gemini API test result:', result);
      
      if (result.success) {
        Alert.alert(t('noteDetail.geminiAPITest'), t('noteDetail.apiConnectionSuccessful'));
      } else {
        Alert.alert(t('noteDetail.geminiAPITest'), t('noteDetail.apiConnectionFailed', { error: result.error }));
      }
    } catch (error) {
      console.error('🔍 Error testing Gemini API:', error);
      Alert.alert(t('noteDetail.geminiAPITest'), t('noteDetail.apiError', { error: String(error) }));
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

  // Handle viewing PDF - Web version
  const handleViewPDF = async (storageUrl: string) => {
    try {
      // Web: Open in new tab
      if (typeof window !== 'undefined') {
        window.open(storageUrl, '_blank');
      }
    } catch (error) {
      console.error('❌ Error viewing PDF:', error);
      Alert.alert(
        t('noteDetail.error'), 
        t('noteDetail.failedToOpenPDF'),
        [{ text: t('noteDetail.ok') }]
      );
    }
  };

  // Handle downloading PDF - Web version
  const handleDownloadPDF = async (storageUrl: string, filename: string) => {
    try {
      // Web: Trigger browser download
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Browser APIs not available');
      }
      
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
      
      Alert.alert(t('noteDetail.success'), t('noteDetail.pdfDownloadedSuccessfully'));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      // Provide helpful error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        Alert.alert(
          t('noteDetail.networkError'),
          t('noteDetail.pdfDownloadNetworkError'),
          [{ text: t('noteDetail.ok') }]
        );
      } else {
        Alert.alert(
          t('noteDetail.error'),
          t('noteDetail.pdfDownloadFailed'),
          [{ text: t('noteDetail.ok') }]
        );
      }
    }
  };

  // Track whether shared note already has AI assets
  const [hasSharedQuizzes, setHasSharedQuizzes] = useState<boolean>(true); // default true; only grey out if confirmed absent
  const [hasSharedFlashcards, setHasSharedFlashcards] = useState<boolean>(true);

  useEffect(() => {
    const checkSharedAssets = async () => {
      if (!note?.id) return;
      try {
        // Check quizzes for this note id
        const { count: quizCount, error: quizCountError } = await supabase
          .from('quizzes')
          .select('id', { count: 'exact', head: true })
          .eq('note_id', note.id);
        if (!quizCountError) {
          setHasSharedQuizzes((quizCount || 0) > 0);
        }

        // Check flashcards for this note id (use service access rules)
        try {
          const sets = await FlashcardService.getInstance().getFlashcardSetsForNote(note.id, user?.id || '');
          setHasSharedFlashcards(Array.isArray(sets) && sets.some(s => (s.flashcards?.length || 0) > 0));
        } catch (e) {
          // If access fails, keep enabled; we only grey out on confirmed absence
        }
      } catch (e) {
        // Silent failure; don't block UI
      }
    };
    checkSharedAssets();
  }, [note?.id, user?.id]);

  // Determine if a button should be disabled and optionally why
  const isButtonDisabled = (buttonId: string): boolean => {
    switch (buttonId) {
      case 'quiz':
        if (!isFeatureEnabled('ai_quiz')) return true;
        // For shared notes, disable if owner hasn't generated yet
        if (note?.isSharedNote) return !hasSharedQuizzes;
        return false;
      case 'flashcards':
        if (!isFeatureEnabled('ai_flashcards')) return true;
        // For shared notes, disable if owner hasn't generated yet
        if (note?.isSharedNote) return !hasSharedFlashcards;
        return false;
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

  // Determine if a button should be hidden entirely (not applicable)
  const isButtonHidden = (buttonId: string): boolean => {
    switch (buttonId) {
      case 'quiz':
        return !isFeatureEnabled('ai_quiz');
      case 'flashcards':
        return !isFeatureEnabled('ai_flashcards');
      case 'aiChat':
        return !isFeatureEnabled('ai_chat');
      case 'writeEssay':
        return !isFeatureEnabled('ai_write_essay');
      case 'transcription':
        return !note || !isAudioNote(note);
      case 'viewPDF':
      case 'downloadPDF':
        return !note || !isPDFNote(note);
      default:
        return false;
    }
  };

  const showSharedMissingAssetsPrompt = (asset: 'quiz' | 'flashcards') => {
    const message = asset === 'quiz'
      ? t('noteDetail.sharedNoQuizGenerated')
      : t('noteDetail.sharedNoFlashcardsGenerated');

    if (user?.id) {
      showSnackbar(message, 'info', 4000, {
        label: t('noteDetail.saveNoteToAccount'),
        onPress: async () => {
          try {
            const created = await supabaseNoteStorage.createNote({
              title: note?.title || '',
              content: note?.content || '',
              contentHtml: note?.contentHtml || null,
              contentFormat: note?.contentFormat || 'plain',
              type: note?.type || 'text',
              tags: note?.tags || [],
              audioFiles: note?.audioFiles || [],
              pdfFiles: note?.pdfFiles || [],
              keyDetails: note?.keyDetails || [],
              summary: note?.summary || null,
            });
            if (created?.id) {
              router.push(`/create?noteId=${created.id}` as any);
            }
          } catch (e) {}
        }
      });
    } else {
      showSnackbar(message, 'info', 4000, {
        label: t('noteDetail.signIn'),
        onPress: () => router.push('/(auth)/login'),
      });
    }
  };

  // Handle action button presses
  const handleActionButton = (buttonId: string) => {
    console.log('🔘 Button pressed:', buttonId, 'Disabled:', isButtonDisabled(buttonId));
    
    // If disabled because shared note lacks generated assets, show prompt
    if (isButtonDisabled(buttonId)) {
      if (note?.isSharedNote && (buttonId === 'quiz' || buttonId === 'flashcards')) {
        if (buttonId === 'quiz' && !hasSharedQuizzes) {
          return showSharedMissingAssetsPrompt('quiz');
        }
        if (buttonId === 'flashcards' && !hasSharedFlashcards) {
          return showSharedMissingAssetsPrompt('flashcards');
        }
      }
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
        Alert.alert(t('noteDetail.aiChat'), t('noteDetail.aiChatComingSoon'));
        break;
      case 'writeEssay':
        Alert.alert(t('noteDetail.writeEssay'), t('noteDetail.writeEssayComingSoon'));
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

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'e',
      ctrl: true,
      action: () => router.push(`/create?noteId=${id}` as any),
      description: t('noteDetail.editNote'),
    },
    {
      key: 'a',
      ctrl: true,
      action: handleArchiveToggle,
      description: t('noteDetail.toggleArchive'),
    },
    {
      key: 'Escape',
      action: () => router.back(),
      description: t('common.goBack'),
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

  if (loading || isHydrating) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.loadingContainer, { backgroundColor }]}>
          <LoadingSpinner size={50} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('noteDetail.loadingNote')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!note) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.errorContainer, { backgroundColor }]}>
          <Ionicons name="document-outline" size={64} color={accentDangerColor} />
          <ThemedText style={[styles.errorText, { color: accentDangerColor }]}>{t('noteDetail.noteNotFound')}</ThemedText>
          <ThemedText style={[styles.errorSubtext, { color: mutedTextColor }]}>{t('noteDetail.noteNotFoundDescription')}</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>{t('noteDetail.goBack')}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // Web layout
  return (
    <WebLayout
      title={note.title || t('noteDetail.untitledNote')}
      subtitle={formatDate(note.createdAt)}
      sidebar={
        <UserSidebar
          activePage="note"
        />
      }
      header={
        <View style={[styles.webHeader, { backgroundColor }]}>
          <View style={styles.webHeaderTop}>
            <TouchableOpacity 
              style={[styles.webBackButton, { backgroundColor: cardBackground }]} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={textColor} />
            </TouchableOpacity>
            <View style={styles.webHeaderTitleContainer}>
              <ThemedText style={[styles.webHeaderTitle, { color: textColor }]} numberOfLines={2}>
                {note.title || t('noteDetail.untitledNote')}
              </ThemedText>
              <View style={styles.webHeaderMeta}>
                <ThemedText style={[styles.webHeaderDate, { color: mutedTextColor }]}>
                  {formatDate(note.createdAt)}
                </ThemedText>
                <View style={styles.webNoteTypeBadge}>
                  {isPDFNote(note) ? (
                    <View style={[styles.webPDFNoteBadge, { backgroundColor: cardBackground }]}>
                      <Ionicons name="document" size={12} color="#E74C3C" />
                      <ThemedText style={[styles.webAudioNoteText, { color: '#E74C3C' }]}>{t('noteDetail.pdfNote')}</ThemedText>
                    </View>
                  ) : isAudioNote(note) ? (
                    <View style={[styles.webAudioNoteBadge, { backgroundColor: cardBackground }]}>
                      <Ionicons name="musical-notes" size={12} color={accentColor} />
                      <ThemedText style={[styles.webAudioNoteText, { color: accentColor }]}>{t('noteDetail.audioNote')}</ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.webTextNoteBadge, { backgroundColor: cardBackground }]}>
                      <Ionicons name="document-text" size={12} color={accentColor} />
                      <ThemedText style={[styles.webTextNoteText, { color: accentColor }]}>{t('noteDetail.textNote')}</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.webHeaderActions}>
              <TouchableOpacity 
                style={[
                  styles.webPinButton, 
                  { 
                    backgroundColor: canEditNote(note) ? cardBackground : '#CCCCCC',
                    opacity: canEditNote(note) ? 1 : 0.5
                  }
                ]} 
                onPress={() => canEditNote(note) ? togglePin(note.id) : null}
                disabled={!canEditNote(note)}
              >
                <Ionicons 
                  name={note.isPinned ? 'pin' : 'pin-outline'} 
                  size={18} 
                  color={canEditNote(note) ? (note.isPinned ? accentColor : textColor) : '#666666'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.webEditButton, 
                  { 
                    backgroundColor: canEditNote(note) ? '#007AFF' : '#CCCCCC',
                    opacity: canEditNote(note) ? 1 : 0.5
                  }
                ]} 
                onPress={() => canEditNote(note) ? router.push(`/create?noteId=${note.id}` as any) : null}
                disabled={!canEditNote(note)}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
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
                  size={18} 
                  color={canEditNote(note) ? textColor : '#666666'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.webArchiveButton, 
                  { 
                    backgroundColor: canEditNote(note) ? cardBackground : '#CCCCCC',
                    opacity: canEditNote(note) ? 1 : 0.5
                  }
                ]} 
                onPress={() => canEditNote(note) ? handleDelete() : null}
                disabled={!canEditNote(note)}
              >
                <Ionicons 
                  name="trash-outline" 
                  size={18} 
                  color={canEditNote(note) ? accentDangerColor : '#666666'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
      scrollable={false}
    >
      <ScrollView 
        style={styles.webContent} 
        contentContainerStyle={styles.webContentContainer}
      >
        {/* Main Content Area */}
        <View style={styles.webMainContent}>
          {/* Audio Player for Audio Notes - Only show if there's exactly one audio file */}
          {isAudioNote(note) && note.audioFiles && note.audioFiles.length === 1 && (
            (() => {
              const audioFile = note.audioFiles[0];
              return (
                <View style={styles.webAudioSection}>
                  <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.audio')}</ThemedText>
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
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.audioFiles')}</ThemedText>
              {note.audioFiles.map((audioFile, index) => (
                <View key={audioFile.id || index} style={[styles.webContentText, { backgroundColor: cardBackground, marginBottom: 12 }]}>
                  <ThemedText style={[styles.webContentTextInner, { color: mutedTextColor, fontSize: 12, marginBottom: 8 }]}>
                    {t('noteDetail.audioFile', { number: index + 1 })}
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

          {/* Summary Section - Show if enabled and has content or usage limit */}
          {isAISummariesEnabled && (summary || summaryLoading || summaryUsageLimit) && (
            <View style={styles.webContentSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.summary')}</ThemedText>
              {user && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  {(() => {
                    try {
                      return <FeatureUsageInline featureId="ai_summaries" compact={true} onUpgradePress={() => router.push('/join-premium')} />;
                    } catch (error) {
                      console.warn('Error rendering AI summaries usage display:', error);
                      return null;
                    }
                  })()}
                  {!note?.isSharedNote && combinedNoteContent.trim() && (summary || summaryLoading) && (
                    <TouchableOpacity
                      onPress={() => {
                        setSummary('');
                        setSummaryGeneratedFor(null);
                        setSummaryLoading(true);
                        generateSummary(combinedNoteContent, note.id);
                      }}
                      disabled={summaryLoading}
                    >
                      <ThemedText style={{ color: summaryLoading ? mutedTextColor : accentColor, fontSize: 12, fontWeight: '600' }}>
                        {t('noteDetail.regenerateSummary')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {summaryLoading && (
                <View style={[styles.webLoadingContainer, { backgroundColor: cardBackground }]}>
                  <LoadingSpinner size={20} />
                  <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>{t('noteDetail.generatingSummary')}</ThemedText>
                </View>
              )}
              {!summaryLoading && summary && (
                <>
                  <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webContentTextInner, { color: textColor }]}>
                      {summary.length > 800 && !isSummaryExpanded
                        ? summary.substring(0, 800) + '...'
                        : summary}
                    </ThemedText>
                  </View>
                  {summary && summary.length > 800 && (
                    <TouchableOpacity onPress={() => setIsSummaryExpanded(!isSummaryExpanded)} style={{ marginTop: 8 }}>
                      <ThemedText style={{ color: accentColor, fontSize: 16, fontWeight: '600' }}>
                        {isSummaryExpanded ? t('noteDetail.seeLess') : t('noteDetail.seeMore')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
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
                    <ThemedText style={styles.webUpgradeButtonText}>{t('noteDetail.upgradeToPremium')}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Note Content - Only show for non-audio notes or audio notes with content */}
          {(!isAudioNote(note) || (isAudioNote(note) && getNotePlainText(note))) && (
            <View style={styles.webContentSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('notes.content')}</ThemedText>
              <View style={[styles.webContentText, { backgroundColor: cardBackground }]}>
                {note.contentFormat === 'html' && note.contentHtml ? (
                  <RichTextViewerWeb
                    content={note.contentHtml || note.content || ''}
                    contentFormat={note.contentFormat === 'html' ? 'html' : 'plain'}
                    textStyle={{ color: textColor }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <ThemedText style={[styles.webContentTextInner, { color: textColor }]}>
                    {getNotePlainText(note) || t('noteDetail.noContentAvailable')}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {/* Key Details Section - Show if enabled and has content or usage limit */}
          {isAIKeyDetailsEnabled && (keyDetailsLoading || (keyDetails && keyDetails.length > 0) || summaryUsageLimit) && (
            <View style={styles.webContentSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.keyDetails')}</ThemedText>
              
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
                  <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>{t('noteDetail.generatingKeyDetails')}</ThemedText>
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
                    <ThemedText style={styles.webUpgradeButtonText}>{t('noteDetail.upgradeToPremium')}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.webContentSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('notes.tags')}</ThemedText>
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
                {note.pdfFiles.length > 1 ? t('noteDetail.pdfDocuments') : t('noteDetail.pdfDocument')} ({note.pdfFiles.length})
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
                          {pdfFile.pageCount || 1} {(pdfFile.pageCount || 1) > 1 ? t('noteDetail.pages') : t('noteDetail.page')}
                        </ThemedText>
                        <ThemedText style={[styles.pdfFileMetaText, { color: mutedTextColor }]}>•</ThemedText>
                        <ThemedText style={[styles.pdfFileMetaText, { color: mutedTextColor }]}>
                          {pdfFile.fileSize ? `${(pdfFile.fileSize / 1024 / 1024).toFixed(2)} MB` : t('noteDetail.unknownSize')}
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
                          {pdfFile.extractionStatus === 'completed' ? t('noteDetail.textExtracted') : t('noteDetail.extractionPending')}
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
                      <ThemedText style={styles.pdfActionButtonText}>{t('noteDetail.viewPDF')}</ThemedText>
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
                      <ThemedText style={[styles.pdfActionButtonText, { color: accentColor }]}>{t('noteDetail.download')}</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sidebar with Actions and Details - Appears first on mobile */}
        <View style={styles.webSidebar}>
          {/* Action Buttons */}
          <View style={styles.webActionSection}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.actions')}</ThemedText>
            <View style={styles.webActionGrid}>
              {BUTTONS.filter((b) => !isButtonHidden(b.id)).map((button) => {
                const disabled = isButtonDisabled(button.id);
                return (
                <TouchableOpacity
                  key={button.id}
                  style={[
                    styles.webActionButton, 
                    { 
                      backgroundColor: button.color,
                      opacity: disabled ? 0.5 : 1
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
              );})}
            </View>
          </View>

          {/* Note Details */}
          <View style={styles.webDetailsSection}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.details')}</ThemedText>
            <View style={styles.webDetailItem}>
              <ThemedText style={[styles.webDetailLabel, { color: mutedTextColor }]}>{t('noteDetail.created')}</ThemedText>
              <ThemedText style={[styles.webDetailValue, { color: textColor }]}>{formatDate(note.createdAt)}</ThemedText>
            </View>
            <View style={styles.webDetailItem}>
              <ThemedText style={[styles.webDetailLabel, { color: mutedTextColor }]}>{t('noteDetail.lastModified')}</ThemedText>
              <ThemedText style={[styles.webDetailValue, { color: textColor }]}>{formatDate(note.updatedAt)}</ThemedText>
            </View>
            {note.isArchived && (
              <View style={[styles.webArchivedBadge, { backgroundColor: cardBackground }]}>
                <Ionicons name="archive" size={16} color={mutedTextColor} />
                <ThemedText style={[styles.webArchivedText, { color: mutedTextColor }]}>{t('noteDetail.archived')}</ThemedText>
              </View>
            )}
          </View>

          {/* Keyboard Shortcuts */}
          <View style={styles.webShortcutsSection}>
            <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.shortcuts')}</ThemedText>
            <View style={styles.webShortcutsList}>
              <View style={styles.webShortcutItem}>
                <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>⌘E</ThemedText>
                <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>{t('noteDetail.editNote')}</ThemedText>
              </View>
              <View style={styles.webShortcutItem}>
                <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>⌘A</ThemedText>
                <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>{t('noteDetail.toggleArchive')}</ThemedText>
              </View>
              <View style={styles.webShortcutItem}>
                <ThemedText style={[styles.webShortcutKey, { backgroundColor: cardBackground, color: textColor }]}>Esc</ThemedText>
                <ThemedText style={[styles.webShortcutText, { color: mutedTextColor }]}>{t('noteDetail.goHome')}</ThemedText>
              </View>
            </View>
          </View>

          {/* Debug Section - Only show in development */}
          {__DEV__ && (
            <View style={styles.webShortcutsSection}>
              <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>{t('noteDetail.debugTools')}</ThemedText>
              <View style={styles.webShortcutsList}>
                <TouchableOpacity 
                  style={[styles.webActionButton, { backgroundColor: '#FF6B6B' }]}
                  onPress={testGeminiAPI}
                >
                  <Ionicons name="bug" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.webActionButtonText}>{t('noteDetail.testAPI')}</ThemedText>
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
