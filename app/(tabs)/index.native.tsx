import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert, Animated, FlatList, Platform, RefreshControl, TouchableOpacity, View, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Logo } from '../../components/Logo';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { UploadingNoteCard } from '../../components/UploadingNoteCard';
import { PDFSizeLimitWarning } from '../../components/PDFSizeLimitWarning';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePDFUpload } from '../../contexts/PDFUploadContext';
import { useAudioUpload } from '../../contexts/AudioUploadContext';
import { AudioUtils } from '../../services/AudioUtils';
import { pdfStorage } from '../../services/PDFStorage';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { featureFlagService } from '../../services/FeatureFlagService';
import { realtimeSyncService } from '../../services/RealtimeSyncService';
import { Note } from '../../types/Note';
import { PDF_CONFIG } from '../../constants/PDFConfig';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { homeStyles as styles } from '../../styles/HomeStyles';
import { audioStorage } from '../../services/AudioStorage';
import { DashboardSunsetBanner } from '../../components/DashboardSunsetBanner';

// Audio upload configuration
const AUDIO_CONFIG = {
  MAX_FILE_SIZE_MB: 200,
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },
  ALLOWED_EXTENSIONS: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
  ALLOWED_MIME_TYPES: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/webm'],
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { settings } = useSystemSettings();
  const isSunsetMode = settings?.sunsetModeEnabled;
  const { showSnackbar } = useSnackbar();
  const { uploadingPDF, setUploadingPDF, setOnUploadComplete: setPDFUploadComplete } = usePDFUpload();
  const { uploadingAudio, setUploadingAudio, setOnUploadComplete: setAudioUploadComplete } = useAudioUpload();
  const { notes, loading, error, syncStatus, isRealtimeActive, togglePin, toggleArchive, toggleFavorite, deleteNote, getFilteredNotes, refreshNotes } = useNotes(
    authLoading ? '' : (user?.id || ''),
    authLoading ? null : (user?.email || null)
  );

  useEffect(() => {
    setPDFUploadComplete(() => refreshNotes);
    setAudioUploadComplete(() => refreshNotes);
    return () => {
      setPDFUploadComplete(null);
      setAudioUploadComplete(null);
    };
  }, [refreshNotes, setPDFUploadComplete, setAudioUploadComplete]);

  const [showSizeLimitWarning, setShowSizeLimitWarning] = useState(false);
  const [oversizedFile, setOversizedFile] = useState<{ name: string; size: number } | null>(null);

  // Helper function to validate audio file format
  const isValidAudioFormat = useCallback((fileName: string, mimeType?: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && AUDIO_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      return true;
    }
    if (mimeType && AUDIO_CONFIG.ALLOWED_MIME_TYPES.some(allowed => mimeType.includes(allowed.split('/')[1]))) {
      return true;
    }
    return false;
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotes();
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotes]);

  useEffect(() => {
    const initializeFlags = async () => {
      try {
        const currentFlags = featureFlagService.getAllFlags();
        if (Object.keys(currentFlags).length === 0) {
          await featureFlagService.initialize(true);
        }
      } catch {}
    };
    initializeFlags();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authLoading && refreshNotes) {
        refreshNotes();
      }
    }, [isAuthenticated, authLoading, refreshNotes])
  );

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      realtimeSyncService.setNoteUpdateHandler(() => {
        refreshNotes?.();
      });
      realtimeSyncService.setNoteDeleteHandler(() => {
        refreshNotes?.();
      });
      realtimeSyncService.setCurrentUser(user.id);
      return () => {
        realtimeSyncService.setCurrentUser(null);
      };
    }
  }, [isAuthenticated, user?.id, refreshNotes]);

  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const iconColor = useThemeColor({}, 'text');
  const sortOrderButtonBg = useThemeColor({ light: '#E5E7EB', dark: '#282828' }, 'background');
  const premiumButtonBg = useThemeColor({ light: '#FF8C00', dark: '#FF8C00' }, 'tint');
  const premiumIconColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');

  const handleNoteLongPress = useCallback((note: Note) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      showSnackbar(
        Platform.OS === 'web' 
          ? t('home.multiSelectActivated')
          : t('home.holdReleaseSelect'),
        'info',
        2000
      );
    }
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(note.id)) {
        newSet.delete(note.id);
      } else {
        newSet.add(note.id);
      }
      return newSet;
    });
  }, [isMultiSelectMode, showSnackbar, t]);

  const handleNotePress = useCallback((note: Note) => {
    if (isMultiSelectMode) {
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(note.id)) {
          newSet.delete(note.id);
        } else {
          newSet.add(note.id);
        }
        return newSet;
      });
    } else {
      router.push(`/note/${note.id}`);
    }
  }, [isMultiSelectMode, router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNotes.size === 0) return;
    if (Platform.OS !== 'web') {
      Alert.alert(
        t('home.deleteSelectedNotes'),
        t('home.confirmDeleteNotes').replace('{{count}}', selectedNotes.size.toString()).replace('{{s}}', selectedNotes.size > 1 ? 's' : ''),
        [
          { text: t('home.cancel'), style: 'cancel' },
          { text: t('home.delete'), style: 'destructive', onPress: async () => { await performBulkDelete(); } }
        ]
      );
    } else {
      await performBulkDelete();
    }

    async function performBulkDelete() {
      try {
        const deletePromises = Array.from(selectedNotes).map(noteId => deleteNote(noteId));
        await Promise.all(deletePromises);
        setSelectedNotes(new Set());
        setIsMultiSelectMode(false);
        showSnackbar(
          t('home.successfullyDeleted').replace('{{count}}', selectedNotes.size.toString()).replace('{{s}}', selectedNotes.size > 1 ? 's' : ''),
          'success',
          3000
        );
      } catch (error) {
        showSnackbar(
          t('home.failedDeleteNotes'),
          'error',
          5000
        );
      }
    }
  }, [selectedNotes, deleteNote, showSnackbar, t]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedNotes(new Set());
    showSnackbar(t('home.multiSelectCancelled'), 'info', 1500);
  }, [showSnackbar, t]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleCreateNote = useCallback(() => {
    if (showCreateOptions) return;
    setShowCreateOptions(true);
  }, [showCreateOptions]);

  const handleCreateTextNote = useCallback(() => {
    setShowCreateOptions(false);
    router.push('/create' as any);
  }, [router]);

  const handleCreateAudioNote = useCallback(async () => {
    if (isSunsetMode) {
      Alert.alert(t('common.notice'), t('home.newUploadsDisabled'));
      setShowCreateOptions(false);
      return;
    }
    try {
      const permission = await AudioUtils.requestPermissions();
      if (permission.status === 'granted') {
        setShowCreateOptions(false);
        router.push('/create-audio' as any);
      } else if (permission.status === 'undetermined') {
        const newPermission = await AudioUtils.requestPermissions();
        if (newPermission.status === 'granted') {
          setShowCreateOptions(false);
          router.push('/create-audio' as any);
        } else {
          Alert.alert(
            t('home.microphonePermissionRequired'),
            t('home.microphonePermissionDesc'),
            [
              { text: t('home.cancel'), style: 'cancel' },
              { text: t('home.openSettings'), onPress: () => {
                Alert.alert(
                  t('home.howToGrantPermission'),
                  t('home.permissionInstructions')
                );
              }}
            ]
          );
        }
      } else {
        Alert.alert(
          t('home.microphonePermissionDenied'),
          t('home.microphonePermissionDesc'),
          [
            { text: t('home.cancel'), style: 'cancel' },
            { text: t('home.openSettings'), onPress: () => {
              Alert.alert(
                t('home.howToGrantPermission'),
                t('home.permissionInstructions')
              );
            }}
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        t('home.permissionError'),
        t('home.unableToCheckPermissions'),
        [
          { text: t('home.cancel'), style: 'cancel' },
          { text: t('home.tryAgain'), onPress: () => handleCreateAudioNote() }
        ]
      );
    }
  }, [router, t]);

  const handleCreatePDFNote = useCallback(async () => {
    if (!isFeatureEnabled('pdf_upload')) {
      showSnackbar(t('home.pdfUploadNotAvailable'), 'error');
      setShowCreateOptions(false);
      return;
    }
    if (isSunsetMode) {
      Alert.alert(t('common.notice'), t('home.newUploadsDisabled'));
      setShowCreateOptions(false);
      return;
    }
    setShowCreateOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        showSnackbar(t('home.noFileSelected'), 'error');
        return;
      }
      if (asset.size && asset.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
        setOversizedFile({ name: asset.name, size: asset.size });
        setShowSizeLimitWarning(true);
        return;
      }
      if (!user?.id) {
        showSnackbar(t('home.pleaseSignIn'), 'error');
        return;
      }
      await handleMobilePDFUpload(asset.uri, asset.name, asset.size || 0);
    } catch (error) {
      showSnackbar(t('home.failedToSelectPDF'), 'error');
    }
  }, [isFeatureEnabled, showSnackbar, user, t]);

  const handleMobilePDFUpload = useCallback(async (fileUri: string, fileName: string, fileSize: number) => {
    if (!user?.id) return;
    try {
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: t('home.preparingPDF'),
      });
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${fileName.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      });
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 30,
        status: 'uploading',
        statusMessage: t('home.uploadingToCloud'),
      });
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        fileUri,
        user.id,
        placeholderNote.id,
        fileName
      );
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 50,
        status: 'processing',
        statusMessage: t('home.processingWithAI'),
      });
      const aiResult = await pdfStorage.processPDFWithAI(fileUri, { generateTitle: true, generateSummary: true, extractKeyDetails: true });
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 85,
        status: 'processing',
        statusMessage: t('home.saving'),
      });
      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || fileName.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded successfully!\n\n${fileName}\nSize: ${(fileSize / (1024 * 1024)).toFixed(2)} MB\n\nText extraction failed. Please try again.`,
        type: 'pdf',
        summary: aiSummary,
        keyDetails: aiResult.keyDetails || [],
        tags: ['pdf'],
      });
      await pdfStorage.savePDFMetadata(placeholderNote.id, user.id, {
        filename: fileName,
        storageUrl: uploadedPDFUrl,
        extractedText: extractedText,
        extractionStatus: extractedText ? 'completed' : 'failed',
        pageCount: pageCount,
        fileSize: fileSize,
      });
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 100,
        status: 'completed',
        statusMessage: t('home.uploadComplete'),
      });
      await refreshNotes?.();
      setTimeout(() => { setUploadingPDF(null); }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showSnackbar(t('home.pdfUploadFailed').replace('{{error}}', errorMessage), 'error');
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 100,
        status: 'error',
        statusMessage: t('home.uploadFailed'),
      });
      setTimeout(() => { setUploadingPDF(null); }, 3000);
    }
  }, [user, showSnackbar, refreshNotes, setUploadingPDF, t]);

  const handleUploadAudioNote = useCallback(async () => {
    setShowCreateOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'audio/*', 
        copyToCacheDirectory: true, 
        multiple: false 
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        showSnackbar(t('home.noFileSelected'), 'error');
        return;
      }
      // Validate file format
      if (!isValidAudioFormat(asset.name, asset.mimeType || undefined)) {
        showSnackbar(t('home.unsupportedAudioFormat'), 'error');
        return;
      }
      // Validate file size
      if (asset.size && asset.size > AUDIO_CONFIG.MAX_FILE_SIZE_BYTES) {
        setOversizedFile({ name: asset.name, size: asset.size });
        setShowSizeLimitWarning(true);
        return;
      }
      if (!user?.id) {
        showSnackbar(t('home.pleaseSignIn'), 'error');
        return;
      }
      await handleMobileAudioUpload(asset.uri, asset.name, asset.size || 0);
    } catch (error) {
      showSnackbar(t('home.failedToSelectAudio'), 'error');
    }
  }, [isValidAudioFormat, showSnackbar, user, t]);

  const handleMobileAudioUpload = useCallback(async (fileUri: string, fileName: string, fileSize: number) => {
    if (!user?.id) {
      console.error('[HomeScreen] handleMobileAudioUpload: No user ID');
      return;
    }
    
    console.log('[HomeScreen] handleMobileAudioUpload: Starting upload', { fileUri, fileName, fileSize, userId: user.id });
    
    try {
      // Extract audio duration
      let duration = 0;
      try {
        console.log('[HomeScreen] Extracting audio duration from:', fileUri);
        duration = await AudioUtils.getAudioDuration(fileUri);
        console.log('[HomeScreen] Audio duration extracted:', duration, 'seconds');
        if (duration === 0) {
          console.warn('[HomeScreen] Audio duration is 0, continuing anyway');
          showSnackbar(t('home.failedToExtractDuration'), 'error');
          // Continue anyway, duration will be 0
        }
      } catch (durationError) {
        console.error('[HomeScreen] Error extracting audio duration:', durationError);
        // Continue with duration 0
      }

      console.log('[HomeScreen] Setting upload state to preparing...');
      setUploadingAudio({
        fileName: fileName.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        duration: Math.round(duration),
        audioUrl: '',
        progress: 10,
        status: 'uploading',
        statusMessage: t('home.preparingAudio'),
      });
      
      console.log('[HomeScreen] Creating placeholder note...');
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `🎤 ${fileName.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, '')}`,
        content: '⏳ Uploading audio... Please wait while we process your file.',
        type: 'audio',
        tags: ['audio', 'uploading'],
        summary: `Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
        audioUrl: '',
        audioDuration: Math.round(duration),
      });
      console.log('[HomeScreen] Placeholder note created:', placeholderNote.id);

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 30,
        statusMessage: t('home.uploadingAudioToCloud'),
      } : null);

      console.log('[HomeScreen] Starting audio file upload to storage...');
      const uploadedAudioUrl = await audioStorage.uploadAudioFile(
        fileUri,
        user.id,
        placeholderNote.id
      );
      console.log('[HomeScreen] Audio file uploaded successfully:', uploadedAudioUrl);

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 50,
        status: 'processing',
        statusMessage: t('home.processingAudioWithAI'),
        audioUrl: uploadedAudioUrl,
      } : null);

      console.log('[HomeScreen] Processing audio for transcription...');
      // Process audio for transcription
      const processingResult = await AudioUtils.processAudioForTranscription(
        uploadedAudioUrl,
        user.id,
        placeholderNote.id,
        (message, progress) => {
          const mappedProgress = 50 + (progress * 0.4); // Scale 0-100 to 50-90
          setUploadingAudio(prev => prev ? {
            ...prev,
            progress: mappedProgress,
            statusMessage: message,
          } : null);
        }
      );
      console.log('[HomeScreen] Audio processing completed:', { 
        hasTitle: !!processingResult.title,
        hasTranscription: !!processingResult.transcription,
        hasSummary: !!processingResult.summary,
        keyDetailsCount: processingResult.keyDetails?.length || 0
      });

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 85,
        statusMessage: t('home.saving'),
      } : null);

      console.log('[HomeScreen] Updating note with transcription and AI content...');
      // Update note with transcription and AI content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: processingResult.title || fileName.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, ''),
        content: processingResult.transcription || '',
        summary: processingResult.summary || `Audio: ${fileName}`,
        keyDetails: processingResult.keyDetails || [],
        tags: ['audio'],
        audioUrl: uploadedAudioUrl,
        audioDuration: Math.round(duration),
      });
      console.log('[HomeScreen] Note updated successfully');

      // Track usage (count duration in minutes)
      try {
        console.log('[HomeScreen] Recording feature usage...');
        const { featureLimitService } = await import('../../services/FeatureLimitService');
        await featureLimitService.initialize();
        const durationInMinutes = Math.round(duration / 60);
        const isPremium = Boolean(user?.premium?.isActive && user?.premium?.status !== 'canceled');
        await featureLimitService.recordFeatureUsage(
          user.id,
          'voice_recording',
          durationInMinutes,
          isPremium,
          'duration'
        );
        console.log('[HomeScreen] Feature usage recorded');
      } catch (usageError) {
        console.error('[HomeScreen] Error recording audio usage:', usageError);
      }

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 100,
        status: 'completed',
        statusMessage: t('home.uploadComplete'),
      } : null);

      console.log('[HomeScreen] Audio upload completed successfully');
      await refreshNotes?.();
      setTimeout(() => { setUploadingAudio(null); }, 2000);
    } catch (error) {
      console.error('[HomeScreen] Audio upload failed:', error);
      console.error('[HomeScreen] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileUri,
        fileName,
        fileSize,
        userId: user?.id
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showSnackbar(t('home.audioUploadFailed').replace('{{error}}', errorMessage), 'error');
      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 100,
        status: 'error',
        statusMessage: t('home.uploadFailed'),
      } : null);
      setTimeout(() => { setUploadingAudio(null); }, 3000);
    }
  }, [user, showSnackbar, refreshNotes, setUploadingAudio, t]);

  // No-op: feature flags are initialized above; no lazy fetch needed here

  const filteredNotes = getFilteredNotes({
    searchQuery: '',
    tags: [],
    showArchived: false,
    showFavorites: showFavorites,
    sortBy: 'updatedAt',
    sortOrder: sortOrder,
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const displayNotes = [...unpinnedNotes];

  const handlePremiumPress = () => {
    router.push('join-premium');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={40} />
          <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
          {!user?.premium?.isActive && (
            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: premiumButtonBg }]}
              onPress={handlePremiumPress}
              testID="premium-button"
              accessibilityLabel="Join Premium"
            >
              <MaterialCommunityIcons name="crown" size={22} color={premiumIconColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote} testID="create-button">
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="add" size={24} color={iconColor} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.notesSection}>
        <DashboardSunsetBanner />
        <View style={styles.notesSectionHeader}>
          <ThemedText style={styles.sectionTitle}>{t('home.recentNotes')}</ThemedText>
          <View style={styles.sortOrderContainer}>
            <TouchableOpacity
              style={[styles.sortOrderButton, { backgroundColor: showFavorites ? '#FFD700' : sortOrderButtonBg }]}
              onPress={() => setShowFavorites(!showFavorites)}
            >
              <Ionicons name={showFavorites ? 'star' : 'star-outline'} size={16} color={showFavorites ? '#000' : iconColor} />
              <ThemedText style={[styles.sortOrderText, { color: showFavorites ? '#000' : iconColor }]} numberOfLines={1}>
                {showFavorites ? t('home.favorites') : t('home.all')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOrderButton, { backgroundColor: sortOrderButtonBg }]}
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={16} color={iconColor} />
              <ThemedText style={styles.sortOrderText} numberOfLines={1}>
                {sortOrder === 'desc' ? t('home.newest') : t('home.oldest')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {pinnedNotes.length === 0 && unpinnedNotes.length === 0 && !uploadingPDF && !uploadingAudio ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#A0A0A0" />
            <ThemedText style={styles.emptyText}>{t('home.noNotesYet')}</ThemedText>
            <ThemedText style={styles.emptySubtext}>{t('home.tapPlusButton')}</ThemedText>
          </View>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <ThemedText style={styles.pinnedLabel}>{t('home.pinned')}</ThemedText>
                <FlatList
                  data={pinnedNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NoteCard
                      note={item}
                      onPress={handleNotePress}
                      onTogglePin={togglePin}
                      onToggleArchive={toggleArchive}
                      onToggleFavorite={toggleFavorite}
                      onDelete={deleteNote}
                      isSelected={selectedNotes.has(item.id)}
                      onLongPress={handleNoteLongPress}
                    />
                  )}
                  contentContainerStyle={[styles.listContainer, { paddingBottom: 32 }]}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={10}
                  getItemLayout={(data, index) => ({
                    length: 150, // Estimated average height
                    offset: 150 * index,
                    index,
                  })}
                />
              </>
            )}
            {pinnedNotes.length > 0 && (unpinnedNotes.length > 0 || uploadingPDF || uploadingAudio) && (
              <View style={styles.sectionDivider} />
            )}
            {(unpinnedNotes.length > 0 || uploadingPDF || uploadingAudio) && (
              <>
                {(unpinnedNotes.length > 0 || pinnedNotes.length > 0) && (
                  <ThemedText style={styles.othersLabel}>{t('home.others')}</ThemedText>
                )}
                <FlatList
                  data={displayNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NoteCard
                      note={item}
                      onPress={handleNotePress}
                      onTogglePin={togglePin}
                      onToggleArchive={toggleArchive}
                      onToggleFavorite={toggleFavorite}
                      onDelete={deleteNote}
                      isSelected={selectedNotes.has(item.id)}
                      onLongPress={handleNoteLongPress}
                    />
                  )}
                  ListHeaderComponent={(
                    (uploadingAudio || uploadingPDF) ? (
                      <>
                        {uploadingAudio && (
                          <UploadingNoteCard
                            fileName={`🎤 ${uploadingAudio.fileName}`}
                            fileSize={uploadingAudio.fileSize}
                            progress={uploadingAudio.progress}
                            status={uploadingAudio.status}
                            statusMessage={uploadingAudio.statusMessage}
                          />
                        )}
                        {uploadingPDF && (
                          <UploadingNoteCard
                            fileName={uploadingPDF.fileName}
                            fileSize={uploadingPDF.fileSize}
                            progress={uploadingPDF.progress}
                            status={uploadingPDF.status}
                            statusMessage={uploadingPDF.statusMessage}
                          />
                        )}
                      </>
                    ) : null
                  )}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={10}
                  getItemLayout={(data, index) => ({
                    length: 150, // Estimated average height
                    offset: 150 * index,
                    index,
                  })}
                  onEndReachedThreshold={0.5}
                />
              </>
            )}
          </>
        )}
      </View>

      {isMultiSelectMode && Platform.OS !== 'web' && (
        <View style={[styles.mobileSelectionToolbar, { backgroundColor: cardBg }]}>
          <View style={styles.mobileSelectionInfo}>
            <ThemedText style={styles.mobileSelectionText}>
              {selectedNotes.size} {selectedNotes.size === 1 ? t('home.noteSelected') : t('home.notesSelected')}
            </ThemedText>
          </View>
          <View style={styles.mobileSelectionActions}>
            <TouchableOpacity 
              style={[styles.mobileSelectionButton, styles.mobileSelectionButtonDanger]}
              onPress={handleBulkDelete}
              disabled={selectedNotes.size === 0}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <ThemedText style={styles.mobileSelectionButtonText}>{t('home.delete')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.mobileSelectionButton, styles.mobileSelectionButtonCancel]}
              onPress={exitMultiSelectMode}
            >
              <Ionicons name="close" size={20} color="#666666" />
              <ThemedText style={[styles.mobileSelectionButtonText, { color: '#666666' }]}>{t('home.cancel')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CreateOptionsSheet
        visible={showCreateOptions}
        onClose={() => setShowCreateOptions(false)}
        onTextNote={handleCreateTextNote}
        onAudioNote={handleCreateAudioNote}
        onUploadAudio={handleUploadAudioNote}
        onPDFNote={handleCreatePDFNote}
        isVoiceRecordingEnabled={isFeatureEnabled('voice_recording')}
        isPDFUploadEnabled={isFeatureEnabled('pdf_upload')}
        testID="create-options-sheet"
      />

      {oversizedFile && (
        <PDFSizeLimitWarning
          visible={showSizeLimitWarning}
          fileName={oversizedFile.name}
          fileSize={oversizedFile.size}
          onClose={() => {
            setShowSizeLimitWarning(false);
            setOversizedFile(null);
          }}
        />
      )}
    </ThemedView>
  );
}

const CreateOptionsSheet = ({ 
  visible, 
  onClose, 
  onTextNote, 
  onAudioNote,
  onUploadAudio,
  onPDFNote,
  isVoiceRecordingEnabled,
  isPDFUploadEnabled,
  testID
}: {
  visible: boolean;
  onClose: () => void;
  onTextNote: () => void;
  onAudioNote: () => void;
  onUploadAudio?: () => void;
  onPDFNote: () => void;
  isVoiceRecordingEnabled: boolean;
  isPDFUploadEnabled: boolean;
  testID?: string;
}) => {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const slideCardBg = useThemeColor({ light: '#fff', dark: '#2A2A2A' }, 'background');
  const optionBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const chevronColor = useThemeColor({ light: '#A0A0A0', dark: '#666666' }, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const snapPoints = useMemo(() => {
    let optionCount = 1;
    if (isVoiceRecordingEnabled) optionCount++;
    if (onUploadAudio) optionCount++;
    if (isPDFUploadEnabled) optionCount++;
    const height = 200 + (optionCount * 80);
    return [height];
  }, [isVoiceRecordingEnabled, isPDFUploadEnabled, onUploadAudio]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          backdropComponent={renderBackdrop}
          enablePanDownToClose={true}
          backgroundStyle={{ backgroundColor: slideCardBg }}
          handleIndicatorStyle={{ backgroundColor: textSecondary }}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            <ThemedText style={styles.bottomSheetTitle}>{t('home.createNote')}</ThemedText>
            <ThemedText style={styles.bottomSheetSubtitle}>{t('home.chooseNoteType')}</ThemedText>
            <View style={styles.createOptions}>
              <TouchableOpacity 
                style={[styles.createOption, { backgroundColor: optionBg }]} 
                onPress={onTextNote} 
                testID="text-note-button"
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <View style={styles.createOptionIcon}>
                  <Ionicons name="document-text" size={24} color="#6A5ACD" />
                </View>
                <View style={styles.createOptionContent}>
                  <ThemedText style={styles.createOptionTitle}>{t('home.textNote')}</ThemedText>
                  <ThemedText style={styles.createOptionDescription}>{t('home.textNoteDesc')}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>

              {isVoiceRecordingEnabled && (
                <TouchableOpacity 
                  style={[styles.createOption, { backgroundColor: optionBg }]} 
                  onPress={onAudioNote} 
                  testID="audio-note-button"
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <View style={styles.createOptionIcon}>
                    <Ionicons name="mic" size={24} color="#6A5ACD" />
                  </View>
                  <View style={styles.createOptionContent}>
                    <ThemedText style={styles.createOptionTitle}>{t('home.audioNote')}</ThemedText>
                    <ThemedText style={styles.createOptionDescription}>{t('home.audioNoteDesc')}</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                </TouchableOpacity>
              )}

              {onUploadAudio && (
                <TouchableOpacity 
                  style={[styles.createOption, { backgroundColor: optionBg }]} 
                  onPress={onUploadAudio} 
                  testID="upload-audio-button"
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <View style={styles.createOptionIcon}>
                    <Ionicons name="cloud-upload" size={24} color="#6A5ACD" />
                  </View>
                  <View style={styles.createOptionContent}>
                    <ThemedText style={styles.createOptionTitle}>{t('sidebar.uploadAudio')}</ThemedText>
                    <ThemedText style={styles.createOptionDescription}>{t('sidebar.uploadAudioDesc')}</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                </TouchableOpacity>
              )}

              {isPDFUploadEnabled && (
                <TouchableOpacity 
                  style={[styles.createOption, { backgroundColor: optionBg }]} 
                  onPress={onPDFNote} 
                  testID="pdf-note-button"
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <View style={styles.createOptionIcon}>
                    <Ionicons name="document" size={24} color="#E74C3C" />
                  </View>
                  <View style={styles.createOptionContent}>
                    <ThemedText style={styles.createOptionTitle}>{t('home.uploadPDF')}</ThemedText>
                    <ThemedText style={styles.createOptionDescription}>
                      {t('home.uploadPDFDesc')}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelButtonText}>{t('home.cancel')}</ThemedText>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};


