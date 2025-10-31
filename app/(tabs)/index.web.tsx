import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { TouchableOpacity, View, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLazyData } from '../../hooks/useLazyData';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePDFUpload } from '../../contexts/PDFUploadContext';
import { useAudioUpload } from '../../contexts/AudioUploadContext';
import { pdfStorage } from '../../services/PDFStorage';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { featureFlagService } from '../../services/FeatureFlagService';
import { realtimeSyncService } from '../../services/RealtimeSyncService';
import { Note } from '../../types/Note';
import { PDF_CONFIG } from '../../constants/PDFConfig';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { WebNoteCard } from '../../components/web/WebNoteCard';
import { UploadingNoteCard } from '../../components/UploadingNoteCard';
import { homeStyles as styles } from '../../styles/HomeStyles';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { showSnackbar } = useSnackbar();
  const { uploadingPDF, setUploadingPDF, setOnUploadComplete: setPDFUploadComplete } = usePDFUpload();
  const { uploadingAudio, setOnUploadComplete: setAudioUploadComplete } = useAudioUpload();
  const { notes, loading, error, syncStatus, isRealtimeActive, toggleArchive, toggleFavorite, deleteNote, getFilteredNotes, refreshNotes } = useNotes(
    authLoading ? '' : (user?.id || '')
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
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      realtimeSyncService.setNoteUpdateHandler(() => { refreshNotes?.(); });
      realtimeSyncService.setNoteDeleteHandler(() => { refreshNotes?.(); });
      realtimeSyncService.setCurrentUser(user.id);
      return () => { realtimeSyncService.setCurrentUser(null); };
    }
  }, [isAuthenticated, user?.id, refreshNotes]);

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

  const router = useRouter();
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const iconColor = useThemeColor({}, 'text');

  const handleNoteLongPress = useCallback((note: Note | string) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      showSnackbar(t('home.multiSelectActivated'), 'info', 2000);
    }
    const id = typeof note === 'string' ? note : note.id;
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  }, [isMultiSelectMode, showSnackbar, t]);

  const handleNotePress = useCallback((note: Note) => {
    if (isMultiSelectMode) {
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(note.id)) newSet.delete(note.id); else newSet.add(note.id);
        return newSet;
      });
    } else {
      router.push(`/note/${note.id}`);
    }
  }, [isMultiSelectMode, router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNotes.size === 0) return;
    const confirmed = window.confirm(t('home.confirmDeleteNotes').replace('{{count}}', selectedNotes.size.toString()).replace('{{s}}', selectedNotes.size > 1 ? 's' : ''));
    if (!confirmed) return;
    try {
      const deletePromises = Array.from(selectedNotes).map(noteId => deleteNote(noteId));
      await Promise.all(deletePromises);
      setSelectedNotes(new Set());
      setIsMultiSelectMode(false);
      showSnackbar(t('home.successfullyDeleted').replace('{{count}}', selectedNotes.size.toString()).replace('{{s}}', selectedNotes.size > 1 ? 's' : ''), 'success', 3000);
    } catch (error) {
      showSnackbar(t('home.failedDeleteNotes'), 'error', 5000);
    }
  }, [selectedNotes, deleteNote, showSnackbar, t]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedNotes(new Set());
    showSnackbar(t('home.multiSelectCancelled'), 'info', 1500);
  }, [showSnackbar, t]);

  useEffect(() => {
    // noop for web pulse in previous version; web doesn't need native driver toggling
  }, []);

  const handleCreateNote = useCallback(() => {
    if (showCreateOptions) return;
    setShowCreateOptions(true);
  }, [showCreateOptions]);

  const handleCreateTextNote = useCallback(() => {
    setShowCreateOptions(false);
    router.push('/create' as any);
  }, [router]);

  const handleCreateAudioNote = useCallback(async () => {
    // On web, direct to create-audio; permissions are managed by browser UX
    setShowCreateOptions(false);
    router.push('/create-audio' as any);
  }, [router]);

  const handleCreatePDFNote = useCallback(async () => {
    if (!isFeatureEnabled('pdf_upload')) {
      showSnackbar(t('home.pdfUploadNotAvailable'), 'error');
      setShowCreateOptions(false);
      return;
    }
    setShowCreateOptions(false);
    if (pdfInputRef.current) {
      pdfInputRef.current.click();
    }
  }, [isFeatureEnabled, showSnackbar, t]);

  const handlePDFFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (file.type !== 'application/pdf') {
      showSnackbar(t('home.pleaseSelectPDF'), 'error');
      return;
    }
    if (file.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
      setOversizedFile({ name: file.name, size: file.size });
      setShowSizeLimitWarning(true);
      return;
    }
    if (!user?.id) {
      showSnackbar(t('home.pleaseSignIn'), 'error');
      return;
    }
    try {
      setUploadingPDF({
        fileName: file.name.replace('.pdf', ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: t('home.preparingPDF'),
      });
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${file.name.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      });
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: t('home.uploadingToCloud') } : null);
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        file,
        user.id,
        placeholderNote.id
      );
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: 'Processing with AI...' } : null);
      const aiResult = await pdfStorage.processPDFWithAI(file, { generateTitle: true, generateSummary: true, extractKeyDetails: true });
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: t('home.saving') } : null);
      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || file.name.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded successfully!\n\n${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nText extraction failed. Please try again.`,
        type: 'pdf',
        summary: aiSummary,
        keyDetails: aiResult.keyDetails || [],
        tags: ['pdf'],
      });
      await pdfStorage.savePDFMetadata(placeholderNote.id, user.id, {
        filename: file.name,
        storageUrl: uploadedPDFUrl,
        extractedText: extractedText,
        extractionStatus: extractedText ? 'completed' : 'failed',
        pageCount: pageCount,
        fileSize: file.size,
      });
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: t('home.uploadComplete') } : null);
      await refreshNotes?.();
      setTimeout(() => { setUploadingPDF(null); }, 2000);
    } catch (error) {
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'error', statusMessage: t('home.uploadFailed') } : null);
      setTimeout(() => { setUploadingPDF(null); }, 3000);
    }
  }, [user, showSnackbar, refreshNotes, setUploadingPDF, t]);

  const filteredNotes = getFilteredNotes({
    searchQuery: '',
    tags: [],
    showArchived: false,
    showFavorites: showFavorites,
    sortBy: 'updatedAt',
    sortOrder: sortOrder,
  });

  const handlePremiumPress = () => {
    router.push('join-premium');
  };

  const handleWebCreateNote = () => { router.push('create'); };
  const handleWebEditNote = (note: Note) => { router.push(`/create?noteId=${note.id}`); };
  const handleWebDeleteNote = async (note: Note) => { if (confirm(t('home.confirmDeleteNote'))) await deleteNote(note.id); };
  const handleWebArchiveNote = async (note: Note) => { await toggleArchive(note.id); };

  return (
    <WebLayout
      sidebar={<UserSidebar activePage="home" />}
      header={(
        <View style={styles.webHeader}>
          <View style={styles.webHeaderLeft}>
            <ThemedText type="title">{t('home.myNotes')}</ThemedText>
          </View>
          <View style={styles.webHeaderActions}>
            <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
            {!user?.premium?.isActive && (
              <TouchableOpacity style={styles.webPremiumButton} onPress={handlePremiumPress}>
                <MaterialCommunityIcons name="crown" size={16} color="#FF8C00" />
                <ThemedText style={styles.webPremiumButtonText}>{t('home.joinPremium')}</ThemedText>
              </TouchableOpacity>
            )}
            <ThemedText style={styles.webNoteCount}>
              {filteredNotes.length} {filteredNotes.length === 1 ? t('home.note') : t('home.notes')}
            </ThemedText>
          </View>
        </View>
      )}
    >
      <View style={styles.webContent}>
        {loading ? (
          <View style={styles.webLoadingContainer}>
            <LoadingSpinner size={50} />
            <ThemedText style={styles.webLoadingText}>{t('home.loadingYourNotes')}</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.webErrorContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            <ThemedText style={styles.webErrorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.webRetryButton} onPress={() => window.location.reload()}>
              <ThemedText style={styles.webRetryButtonText}>{t('home.retry')}</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {filteredNotes.length === 0 && !uploadingPDF && !uploadingAudio ? (
              <View style={styles.webEmptyContainer}>
                <Ionicons name="document-outline" size={64} color="#666666" />
                <ThemedText type="subtitle" style={styles.webEmptyTitle}>{t('home.noNotesYet')}</ThemedText>
                <ThemedText style={styles.webEmptySubtitle}>{t('home.createFirstNote')}</ThemedText>
                <TouchableOpacity style={styles.webCreateButton} onPress={handleWebCreateNote}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.webCreateButtonText}>{t('home.createNote')}</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {isMultiSelectMode && (
                  <View style={styles.webSelectionToolbar}>
                    <View style={styles.webSelectionInfo}>
                      <ThemedText style={styles.webSelectionText}>
                        {selectedNotes.size} {selectedNotes.size === 1 ? t('home.noteSelected') : t('home.notesSelected')}
                      </ThemedText>
                    </View>
                    <View style={styles.webSelectionActions}>
                      <TouchableOpacity style={[styles.webSelectionButton, styles.webSelectionButtonDanger]} onPress={handleBulkDelete}>
                        <Ionicons name="trash" size={16} color="#FFFFFF" />
                        <ThemedText style={styles.webSelectionButtonText}>{t('home.delete')}</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.webSelectionButton} onPress={exitMultiSelectMode}>
                        <Ionicons name="close" size={16} color="#666666" />
                        <ThemedText style={[styles.webSelectionButtonText, { color: '#666666' }]}>{t('home.cancel')}</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.webNotesGrid}>
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
                  {filteredNotes.map((note) => (
                    <WebNoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedNotes.has(note.id)}
                      onPress={() => handleNotePress(note)}
                      onLongPress={() => handleNoteLongPress(note.id)}
                      onEdit={() => handleWebEditNote(note)}
                      onDelete={() => handleWebDeleteNote(note)}
                      onArchive={() => handleWebArchiveNote(note)}
                      onToggleFavorite={() => toggleFavorite(note.id)}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Hidden PDF file input for web */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handlePDFFileChange}
      />

      <CreateOptionsSheet
        visible={showCreateOptions}
        onClose={() => setShowCreateOptions(false)}
        onTextNote={handleCreateTextNote}
        onAudioNote={handleCreateAudioNote}
        onPDFNote={handleCreatePDFNote}
        isVoiceRecordingEnabled={isFeatureEnabled('voice_recording')}
        isPDFUploadEnabled={isFeatureEnabled('pdf_upload')}
        testID="create-options-sheet"
      />
    </WebLayout>
  );
}

const CreateOptionsSheet = ({ 
  visible, 
  onClose, 
  onTextNote, 
  onAudioNote,
  onPDFNote,
  isVoiceRecordingEnabled,
  isPDFUploadEnabled,
  testID
}: {
  visible: boolean;
  onClose: () => void;
  onTextNote: () => void;
  onAudioNote: () => void;
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
    if (isPDFUploadEnabled) optionCount++;
    const height = 200 + (optionCount * 80);
    return [height];
  }, [isVoiceRecordingEnabled, isPDFUploadEnabled]);

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


