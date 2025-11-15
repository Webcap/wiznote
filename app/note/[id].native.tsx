import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { RichTextViewer as RichTextViewerNative } from '../../components/RichTextViewer.native';
import { ShareModal } from '../../components/ShareModal';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
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

// Shared logic would be extracted to a hook or utils file, but keeping it here for now
export default function NoteDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  
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
    // Hide header on all platforms - useLayoutEffect ensures it runs before render
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

  const processedNotesRef = useRef<Set<string>>(new Set());
  
  // Helper function to check if user can edit the note
  const canEditNote = (note: Note | null): boolean => {
    if (!note) return false;
    if (!note.isSharedNote) return true;
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
  
  const showDebugInfo = __DEV__;
  
  const { user, isLoading: authLoading } = useAuth();
  const { notes, toggleArchive, updateNote, deleteNote } = useNotes(user?.id || '', user?.email || null);

  // Helper functions for note type detection
  const isAudioNote = (note: Note): boolean => {
    if (note.type === 'audio') return true;
    const hasAudioFiles = note.audioFiles && note.audioFiles.length > 0;
    const hasAudioUri = !!note.audioUri;
    return hasAudioFiles || hasAudioUri;
  };

  const isPDFNote = (note: Note): boolean => {
    if (note.type === 'pdf') return true;
    return !!(note.pdfFiles && note.pdfFiles.length > 0);
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
    
    // If no user, show alert and redirect
    if (!user?.id) {
      console.log('[NoteDetail] User not authenticated');
      Alert.alert(
        t('noteDetail.authenticationRequired'),
        t('noteDetail.pleaseSignInToViewSharedNote'),
        [
          { text: t('noteDetail.cancel'), style: 'cancel', onPress: () => router.back() },
          { text: t('noteDetail.signIn'), onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }

    // Reset state when note ID changes
    setIsContentExpanded(false);
    setIsSummaryExpanded(false);
    setNote(null);
    setLoading(true);

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
          
          setNote(fetchedNote);
        } else {
          console.log('[NoteDetail] ❌ Note not found in Supabase, trying cache fallback');
          // Fallback to cache if Supabase returns null
          const cachedNote = notes.find(n => n.id === id);
          if (cachedNote) {
            console.log('[NoteDetail] ✅ Using cached note as fallback');
            setNote(cachedNote);
          } else {
            setNote(null);
          }
        }
      } catch (error) {
        console.error('[NoteDetail] ❌ Error fetching note:', error);
        // Fallback to cache on error
        const cachedNote = notes.find(n => n.id === id);
        if (cachedNote) {
          console.log('[NoteDetail] ✅ Using cached note as error fallback');
          setNote(cachedNote);
        } else {
          setNote(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id, user?.id, authLoading, t]);

  // Update note from cache only when it changes (e.g., after save)
  // This is a secondary update mechanism, not the primary source
  useEffect(() => {
    if (!id || !note || notes.length === 0) return;
    
    const updatedNote = notes.find(n => n.id === id);
    if (!updatedNote) return;
    
    // Only update if we're not currently loading and the note has actually changed
    if (loading) return;
    
    // Check if the updated note has newer data (by timestamp)
    const currentTimestamp = note.updatedAt?.getTime() || 0;
    const updatedTimestamp = updatedNote.updatedAt?.getTime() || 0;
    
    // Only update if the cache has newer data
    if (updatedTimestamp > currentTimestamp) {
      console.log('[NoteDetail] 📝 Updating note from cache (newer timestamp detected)');
      setNote(updatedNote);
    }
  }, [notes, id, note, loading]);

  // Refresh note when screen comes into focus (native only)
  useFocusEffect(
    useCallback(() => {
      if (!id || !user?.id) return;
      
      const fetchFromDatabase = async () => {
        try {
          console.log('[NoteDetail] 📡 Refreshing note from database...');
          const freshNote = await supabaseNoteStorage.getNote(id);
          if (freshNote) {
            console.log('[NoteDetail] ✅ Note refreshed:', {
              title: freshNote.title,
              contentLength: freshNote.content?.length || 0
            });
            setNote(freshNote);
          }
        } catch (error) {
          console.error('[NoteDetail] ❌ Error refreshing note:', error);
        }
      };
      
      fetchFromDatabase();
    }, [id, user?.id])
  );

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
    
    if ((note as any).transcription) {
      text += '\n' + (note as any).transcription;
    }
    
    if (note.audioFiles && note.audioFiles.length > 0) {
      note.audioFiles.forEach(f => {
        if (f.transcription) text += '\n' + f.transcription;
        if (f.aiTranscription) text += '\n' + f.aiTranscription;
        if (f.userEditedTranscription) text += '\n' + f.userEditedTranscription;
      });
    }
    
    return text;
  }, [note, note?.audioFiles, (note as any)?.transcription, getNotePlainText]);

  const generateKeyDetails = useCallback(async (text: string, noteId: string) => {
    if (!user || !noteId) return;
    
    try {
      const canUseResult = await featureLimitService.canUseFeature(
        user.id, 
        'ai_key_details', 
        1, 
        user.premium?.isActive || false
      );
      
      if (!canUseResult.canUse) {
        setKeyDetailsGeneratedFor(noteId);
        setSummaryUsageLimit(t('noteDetail.usageLimitReached', { currentUsage: canUseResult.currentUsage, limit: canUseResult.limit }));
        return;
      }
      
      setKeyDetailsLoading(true);
      setKeyDetailsGeneratedFor(noteId);
      
      const details = await extractKeyDetailsWithGemini(text, user);
      
      setKeyDetails(details);
      setKeyDetailsLoading(false);
      
      if (user?.id && details && details.length > 0) {
        try {
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_key_details', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          
          // Refresh usage limits to update the counter
          setTimeout(() => {
            refreshLimits().catch(err => {
              console.warn('Failed to refresh usage limits after recording:', err);
            });
          }, 500); // Small delay to ensure database update is complete
        } catch (usageError) {
          console.error('🔍 NoteDetailScreen: Failed to record AI key details usage:', usageError);
        }
      }
      
      if (noteId && details && details.length > 0) {
        try {
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

  useEffect(() => {
    if (note && isAIKeyDetailsEnabled) {
      if (note.isSharedNote) {
        if (note.keyDetails && note.keyDetails.length > 0) {
          setKeyDetails(note.keyDetails);
        }
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      if (note.keyDetails && note.keyDetails.length && note.keyDetails.length > 0) {
        setKeyDetails(note.keyDetails);
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      if (keyDetailsGeneratedFor === note.id) {
        return;
      }
      
      if (user?.preferences?.autoKeyDetails === false) {
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      // Compute content inside effect to avoid dependency loop
      const text = combinedNoteContent;
      
      if (!text.trim()) {
        setKeyDetailsGeneratedFor(note.id);
        return;
      }
      
      generateKeyDetails(text, note.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, keyDetailsGeneratedFor, isAIKeyDetailsEnabled, user?.id, user?.preferences?.autoKeyDetails, note?.isSharedNote]);

  const generateSummary = useCallback(async (text: string, noteId: string) => {
    if (!user || !noteId) return;
    
    try {
      if (user) {
        const canUseResult = await featureLimitService.canUseFeature(
          user.id, 
          'ai_summaries', 
          1, 
          user.premium?.isActive || false
        );
        
        if (!canUseResult.canUse) {
          setSummaryGeneratedFor(noteId);
          setSummaryUsageLimit(t('noteDetail.usageLimitReachedForSummaries', { currentUsage: canUseResult.currentUsage, limit: canUseResult.limit }));
          return;
        }
      }
        
      setSummaryLoading(true);
      setSummaryGeneratedFor(noteId);
      
      const generatedSummary = await generateSummaryWithGemini(text, user);
      
      setSummary(generatedSummary);
      setSummaryLoading(false);
      
      if (user?.id && generatedSummary && generatedSummary.trim().length > 0) {
        try {
          await featureLimitService.recordFeatureUsage(
            user.id, 
            'ai_summaries', 
            1, 
            user.premium?.isActive || false,
            'count'
          );
          
          // Refresh usage limits to update the counter
          setTimeout(() => {
            refreshLimits().catch(err => {
              console.warn('Failed to refresh usage limits after recording:', err);
            });
          }, 500); // Small delay to ensure database update is complete
        } catch (usageError) {
          console.error('🔍 NoteDetailScreen: Failed to record AI summary usage:', usageError);
        }
      }
      
      if (noteId && generatedSummary && generatedSummary.trim().length > 0) {
        try {
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

  useEffect(() => {
    if (note && isAISummariesEnabled) {
      if (note.isSharedNote) {
        if (note.summary && note.summary.trim().length > 0) {
          setSummary(note.summary);
        }
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      if (note.summary && note.summary.trim().length > 0) {
        setSummary(note.summary);
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      if (summaryGeneratedFor === note.id) {
        return;
      }
      
      if (user?.preferences?.autoAISummaries === false) {
        setSummaryGeneratedFor(note.id);
        return;
      }
      
      const text = combinedNoteContent;
      
      if (!text.trim()) {
        setSummaryGeneratedFor(note.id);
        return;
      }
      
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
    
    if (!canEditNote(note)) {
      Alert.alert(t('noteDetail.cannotDelete'), t('noteDetail.noPermissionToDelete'));
      return;
    }
    
    Alert.alert(
      t('noteDetail.deleteNote'),
      t('noteDetail.confirmDelete'),
      [
        { text: t('noteDetail.cancel'), style: 'cancel' },
        {
          text: t('notes.deleteNote'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(note.id);
              router.back();
            } catch (error) {
              Alert.alert(t('noteDetail.error'), t('noteDetail.failedToDeleteNote'));
            }
          }
        }
      ]
    );
  };

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

  // Handle viewing PDF - Native version
  const handleViewPDF = async (storageUrl: string) => {
    try {
      console.log('👁️ Opening PDF in viewer');
      console.log('📄 PDF URL:', storageUrl);
      
      const canOpen = await Linking.canOpenURL(storageUrl);
      
      if (canOpen) {
        console.log('✅ Opening PDF with system browser/viewer');
        await Linking.openURL(storageUrl);
      } else {
        throw new Error('Cannot open PDF URL');
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

  // Handle downloading PDF - Native version
  const handleDownloadPDF = async (storageUrl: string, filename: string) => {
    try {
      console.log('💾 Downloading PDF');
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          t('noteDetail.notAvailable'),
          t('noteDetail.fileSharingNotAvailable'),
          [{ text: t('noteDetail.ok') }]
        );
        return;
      }
      
      const fileUri = FileSystem.documentDirectory + filename;
      
      Alert.alert(t('noteDetail.downloading'), t('noteDetail.preparingFile'), [], { cancelable: false });
      
      await FileSystem.downloadAsync(storageUrl, fileUri);
      
      Alert.alert('', '');
      
      await Sharing.shareAsync(fileUri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: t('noteDetail.savePDF'),
      });
      
      Alert.alert(
        t('noteDetail.success'), 
        t('noteDetail.shareMenuInstructions'),
        [{ text: t('noteDetail.ok') }]
      );
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        Alert.alert(
          t('noteDetail.networkError'),
          t('noteDetail.pdfDownloadNetworkError'),
          [{ text: t('noteDetail.ok') }]
        );
      } else if (errorMessage.includes('storage') || errorMessage.includes('space')) {
        Alert.alert(
          t('noteDetail.storageError'),
          t('noteDetail.notEnoughStorageSpace'),
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

  // Shared note AI assets availability
  const [hasSharedQuizzes, setHasSharedQuizzes] = useState<boolean>(true);
  const [hasSharedFlashcards, setHasSharedFlashcards] = useState<boolean>(true);

  useEffect(() => {
    const checkSharedAssets = async () => {
      if (!note?.id) return;
      try {
        const { count: quizCount, error: quizCountError } = await supabase
          .from('quizzes')
          .select('id', { count: 'exact', head: true })
          .eq('note_id', note.id);
        if (!quizCountError) {
          setHasSharedQuizzes((quizCount || 0) > 0);
        }

        try {
          const sets = await FlashcardService.getInstance().getFlashcardSetsForNote(note.id, user?.id || '');
          setHasSharedFlashcards(Array.isArray(sets) && sets.some(s => (s.flashcards?.length || 0) > 0));
        } catch (e) {
          // Keep enabled on error; only grey out if confirmed absent
        }
      } catch (e) {}
    };
    checkSharedAssets();
  }, [note?.id, user?.id]);

  const isButtonDisabled = (buttonId: string): boolean => {
    switch (buttonId) {
      case 'quiz':
        if (!isFeatureEnabled('ai_quiz')) return true;
        if (note?.isSharedNote) return !hasSharedQuizzes;
        return false;
      case 'flashcards':
        if (!isFeatureEnabled('ai_flashcards')) return true;
        if (note?.isSharedNote) return !hasSharedFlashcards;
        return false;
      case 'aiChat':
        return !isFeatureEnabled('ai_chat');
      case 'writeEssay':
        return !isFeatureEnabled('ai_write_essay');
      case 'share':
        return false;
      case 'transcription':
        return !note || !isAudioNote(note);
      case 'viewPDF':
      case 'downloadPDF':
        return !note || !isPDFNote(note);
      default:
        return false;
    }
  };

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

  const handleActionButton = (buttonId: string) => {
    console.log('🔘 Button pressed:', buttonId, 'Disabled:', isButtonDisabled(buttonId));
    
    if (isButtonDisabled(buttonId)) {
      if (note?.isSharedNote && (buttonId === 'quiz' || buttonId === 'flashcards')) {
        const title = t('noteDetail.notAvailable');
        const message = buttonId === 'quiz' ? t('noteDetail.sharedNoQuizGenerated') : t('noteDetail.sharedNoFlashcardsGenerated');
        const actions: any[] = [];
        if (user?.id) {
          actions.push({
            text: t('noteDetail.saveNoteToAccount'),
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
          actions.push({ text: t('noteDetail.signIn'), onPress: () => router.push('/(auth)/login') });
        }
        actions.push({ text: t('noteDetail.cancel'), style: 'cancel' });
        Alert.alert(title, message, actions);
        return;
      }
      console.log('❌ Button is disabled, not handling');
      return;
    }

    switch (buttonId) {
      case 'quiz':
        router.push(`/quizzes/create?noteId=${id}`);
        break;
      case 'transcription':
        router.push(`/ai-transcriptions?noteId=${id}`);
        break;
      case 'flashcards':
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

  const iconColor = useThemeColor({}, 'text');
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

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor, paddingTop: Platform.select({ ios: 60, android: 60, default: 0 }) }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginRight: 12, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.headerTitle, { color: textColor }]}>{note.title || t('noteDetail.untitledNote')}</ThemedText>
            {note.isSharedNote && (
              <View style={[styles.permissionBadge, { backgroundColor: note.sharePermission === 'read' ? '#FFA500' : '#10B981' }]}>
                <Ionicons 
                  name={note.sharePermission === 'read' ? 'eye' : note.sharePermission === 'edit' ? 'create' : 'shield'} 
                  size={12} 
                  color="#FFFFFF" 
                />
                <ThemedText style={styles.permissionText}>
                  {note.sharePermission === 'read' ? t('noteDetail.permissionReadOnly') : note.sharePermission === 'edit' ? t('noteDetail.permissionCanEdit') : t('noteDetail.permissionAdmin')}
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
                  backgroundColor: canEditNote(note) ? '#007AFF' : '#CCCCCC',
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
            <TouchableOpacity 
              style={[
                styles.archiveButton, 
                { 
                  backgroundColor: canEditNote(note) ? accentDangerColor : '#CCCCCC',
                  opacity: canEditNote(note) ? 1 : 0.5
                }
              ]} 
              onPress={() => canEditNote(note) ? handleDelete() : null}
              disabled={!canEditNote(note)}
            >
              <Ionicons 
                name="trash-outline" 
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
                onPress={testGeminiAPI}
              >
                <ThemedText style={styles.debugButtonText}>{t('noteDetail.testAPI')}</ThemedText>
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
                {BUTTONS.slice(0, 2).filter((b) => !isButtonHidden(b.id)).map((button) => {
                  const disabled = isButtonDisabled(button.id);
                  return (
                  <TouchableOpacity
                    key={button.id}
                    style={[
                      styles.actionButton, 
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
                      color={iconColor} 
                    />
                    <ThemedText style={[
                      styles.actionButtonText,
                      { color: iconColor }
                    ]}>
                      {button.label}
                    </ThemedText>
                  </TouchableOpacity>
                );})}
              </View>
              <View style={styles.buttonRow}>
                {BUTTONS.slice(2, 4).filter((b) => !isButtonHidden(b.id)).map((button) => {
                  const disabled = isButtonDisabled(button.id);
                  return (
                  <TouchableOpacity
                    key={button.id}
                    style={[
                      styles.actionButton, 
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
                      color={iconColor} 
                    />
                    <ThemedText style={[
                      styles.actionButtonText,
                      { color: iconColor }
                    ]}>
                      {button.label}
                    </ThemedText>
                  </TouchableOpacity>
                );})}
              </View>
              <View style={styles.buttonRow}>
                {BUTTONS.slice(4, 6).filter((b) => !isButtonHidden(b.id)).map((button) => {
                  const disabled = isButtonDisabled(button.id);
                  return (
                  <TouchableOpacity
                    key={button.id}
                    style={[
                      styles.actionButton, 
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
                      color={iconColor} 
                    />
                    <ThemedText style={[
                      styles.actionButtonText,
                      { color: iconColor }
                    ]}>
                      {button.label}
                    </ThemedText>
                  </TouchableOpacity>
                );})}
              </View>
              <View style={styles.buttonRow}>
                {BUTTONS.slice(6, 8).filter((b) => !isButtonHidden(b.id)).map((button) => {
                  const disabled = isButtonDisabled(button.id);
                  return (
                  <TouchableOpacity
                    key={button.id}
                    style={[
                      styles.actionButton, 
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
                      color={iconColor} 
                    />
                    <ThemedText style={[
                      styles.actionButtonText,
                      { color: iconColor }
                    ]}>
                      {button.label}
                    </ThemedText>
                  </TouchableOpacity>
                );})}
              </View>
            </View>
          </View>

          {/* Audio Player for Audio Notes - Only show if there's exactly one audio file */}
          {isAudioNote(note) && note.audioFiles && note.audioFiles.length === 1 && (
            (() => {
              const audioFile = note.audioFiles[0];
              return (
                <AudioPlayer 
                  audioFile={audioFile}
                  onTranscriptionUpdate={(transcription) => {
                    console.log('Transcription updated:', transcription);
                  }}
                  onTranscriptionStatusUpdate={(status) => {
                    console.log('Transcription status updated:', status);
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
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summaryTitle, { color: textColor }]}>{t('noteDetail.summary')}</ThemedText>
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
                <ThemedText style={[styles.summaryContent, { color: textColor }]}>{t('noteDetail.generatingSummary')}</ThemedText>
              )}
              {!summaryLoading && summary && (
                <>
                  <ThemedText style={[styles.summaryContent, { color: textColor, lineHeight: 22, paddingVertical: 4 }]}>
                    {summary.length > 800 && !isSummaryExpanded
                      ? summary.substring(0, 800) + '...'
                      : summary}
                  </ThemedText>
                  {summary && summary.length > 800 && (
                    <TouchableOpacity 
                      onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
                      style={{ marginTop: 8 }}
                    >
                      <ThemedText style={{ color: accentColor, fontSize: 16, fontWeight: '600' }}>
                        {isSummaryExpanded ? t('noteDetail.seeLess') : t('noteDetail.seeMore')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
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
                    <ThemedText style={styles.upgradeButtonText}>{t('noteDetail.upgradeToPremium')}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Note Content Section - Only show for non-audio notes or audio notes with content */}
          {(!isAudioNote(note) || (isAudioNote(note) && getNotePlainText(note))) && (
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summaryTitle, { color: textColor }]}>{t('notes.content')}</ThemedText>
              {note.contentFormat === 'html' && note.contentHtml ? (
                <>
                  <View style={{ width: '100%', minHeight: isContentExpanded ? 'auto' : 400, maxHeight: isContentExpanded ? undefined : 800 }}>
                    <RichTextViewerNative
                      content={isContentExpanded ? note.contentHtml : note.contentHtml.substring(0, 3000)}
                      contentFormat="html"
                      textStyle={{ color: textColor }}
                      style={{ width: '100%', minHeight: 400 }}
                    />
                  </View>
                  {note.contentHtml && note.contentHtml.length > 3000 && (
                    <TouchableOpacity 
                      onPress={() => setIsContentExpanded(!isContentExpanded)}
                      style={{ marginTop: 16, alignSelf: 'flex-start' }}
                    >
                      <ThemedText style={{ color: accentColor, fontSize: 16, fontWeight: '600' }}>
                        {isContentExpanded ? t('noteDetail.seeLess') : t('noteDetail.seeMore')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  {(() => {
                    const textContent = getNotePlainText(note) || t('noteDetail.noContentAvailable');
                    const shouldTruncate = textContent.length > 1500 && !isContentExpanded;
                    const displayContent = shouldTruncate ? textContent.substring(0, 1500) + '...' : textContent;
                    
                    return (
                      <ThemedText style={[styles.summaryContent, { color: textColor, lineHeight: 24, paddingVertical: 8 }]}>
                        {displayContent}
                      </ThemedText>
                    );
                  })()}
                  {note.content && note.content.length > 1500 && (
                    <TouchableOpacity 
                      onPress={() => setIsContentExpanded(!isContentExpanded)}
                      style={{ marginTop: 12 }}
                    >
                      <ThemedText style={{ color: accentColor, fontSize: 16, fontWeight: '600' }}>
                        {isContentExpanded ? t('noteDetail.seeLess') : t('noteDetail.seeMore')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Key Details Section - Show if enabled and has content or usage limit */}
          {isAIKeyDetailsEnabled && (keyDetailsLoading || (keyDetails && keyDetails.length > 0) || summaryUsageLimit) && (
            <View style={styles.summarySection}>
              <ThemedText style={[styles.summarySubtitle, { color: textColor }]}>{t('noteDetail.keyDetails')}</ThemedText>
              
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
                <ThemedText style={[styles.summaryContent, { color: textColor }]}>{t('noteDetail.generatingKeyDetails')}</ThemedText>
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
                    <ThemedText style={styles.upgradeButtonText}>{t('noteDetail.upgradeToPremium')}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <ThemedText style={[styles.sectionLabel, { color: mutedTextColor }]}>{t('notes.tags')}</ThemedText>
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
            <ThemedText style={[styles.sectionLabel, { color: mutedTextColor }]}>{t('noteDetail.details')}</ThemedText>
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: mutedTextColor }]}>{t('noteDetail.created')}</ThemedText>
              <ThemedText style={[styles.dateValue, { color: textColor }]}>{formatDate(note.createdAt)}</ThemedText>
            </View>
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: mutedTextColor }]}>{t('noteDetail.lastModified')}</ThemedText>
              <ThemedText style={[styles.dateValue, { color: textColor }]}>{formatDate(note.updatedAt)}</ThemedText>
            </View>
            {note.isArchived && (
              <View style={[styles.archivedBadge, { backgroundColor: cardBackground }]}>
                <Ionicons name="archive" size={16} color={mutedTextColor} />
                <ThemedText style={[styles.archivedText, { color: mutedTextColor }]}>{t('noteDetail.archived')}</ThemedText>
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
          if (note) {
            console.log('Note shared successfully');
          }
        }}
      />
    </ThemedView>
  );
}
