import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore - react-dom types not available in React Native environment
import { createPortal } from 'react-dom';
import { Alert, Animated, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePDFUpload } from '../../contexts/PDFUploadContext';
import { useAudioUpload } from '../../contexts/AudioUploadContext';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useThemeColor } from '../../hooks/useThemeColor';
import { pdfStorage } from '../../services/PDFStorage';
import { audioStorage } from '../../services/AudioStorage';
import { AudioUtils } from '../../services/AudioUtils';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { PDFSizeLimitWarning } from '../PDFSizeLimitWarning';
import { PDF_CONFIG } from '../../constants/PDFConfig';
import { useTranslation } from '../../hooks/useTranslation';

// Audio upload configuration
const AUDIO_CONFIG = {
  MAX_FILE_SIZE_MB: 200,
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },
  ALLOWED_EXTENSIONS: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
  ALLOWED_MIME_TYPES: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/webm'],
};

interface UserSidebarProps {
  activePage?: string;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export function UserSidebar({ 
  activePage = 'home', 
  searchQuery = '',
  onSearchQueryChange 
}: UserSidebarProps) {
  const { t } = useTranslation();
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const { isAdmin, isSupport, user } = useAuth();

  const { showSnackbar } = useSnackbar();
  const { setUploadingPDF, onUploadComplete } = usePDFUpload();
  const { setUploadingAudio } = useAudioUpload();
  const { isFeatureEnabled } = useFeatureFlags();
  const { settings } = useSystemSettings();
  const isSunsetMode = settings?.sunsetModeEnabled;
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showSizeLimitWarning, setShowSizeLimitWarning] = useState(false);
  const [oversizedFile, setOversizedFile] = useState<{ name: string; size: number } | null>(null);
  const dropdownRef = useRef<View>(null);
  const buttonRef = useRef<typeof TouchableOpacity>(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  if (Platform.OS !== 'web') {
    return null;
  }

  // Handle click outside to close dropdown
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current && 
      buttonRef.current &&
      !(dropdownRef.current as any).contains(event.target as Node) &&
      !(buttonRef.current as any).contains(event.target as Node)
    ) {
      setShowCreateDropdown(false);
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }
      if (event.metaKey && event.key === 'n') {
        event.preventDefault();
        setShowCreateDropdown(!showCreateDropdown);
      }
      if (event.key === 'Escape') {
        setShowCreateDropdown(false);
      }
      // Arrow key navigation in dropdown
      if (showCreateDropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        // TODO: Implement arrow key navigation between dropdown items
      }
    }, [showCreateDropdown]
  );

  useEffect(() => {
    if (showCreateDropdown) {
      document.addEventListener('mousedown', handleClickOutside, { passive: true });
      document.addEventListener('keydown', handleKeyDown, { passive: false });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreateDropdown, handleClickOutside, handleKeyDown]);

  // Close dropdown when navigating
  useEffect(() => {
    setShowCreateDropdown(false);
  }, [activePage]);

  // Close dropdown when component unmounts
  useEffect(() => {
    return () => {
      setShowCreateDropdown(false);
    };
  }, []);

  // Close dropdown when search query changes
  useEffect(() => {
    setShowCreateDropdown(false);
  }, [searchQuery]);

  // Animate dropdown
  useEffect(() => {
    if (showCreateDropdown) {
      Animated.spring(dropdownAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 80,
        friction: 8,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }).start();
    } else {
      Animated.spring(dropdownAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 9,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }).start();
    }
  }, [showCreateDropdown, dropdownAnim]);

  const sidebarItems = useMemo(() => [
    {
      id: 'home',
      label: t('sidebar.allNotes'),
      icon: 'document-text' as const,
      onPress: () => {
        if (onSearchQueryChange) {
          onSearchQueryChange('');
        } else {
          router.push('/(tabs)');
        }
      },
      isActive: activePage === 'home' && !searchQuery,
    },
    {
      id: 'shared',
      label: t('sidebar.shared'),
      icon: 'people' as const,
      onPress: () => router.push('/(tabs)/shared'),
      isActive: activePage === 'shared',
    },
    {
      id: 'favorites',
      label: t('sidebar.favorites'),
      icon: 'star' as const,
      onPress: () => router.push('/(tabs)/favorites'),
      isActive: activePage === 'favorites',
    },
    {
      id: 'archived',
      label: t('sidebar.archived'),
      icon: 'archive' as const,
      onPress: () => router.push('archived'),
      isActive: activePage === 'archived',
    },
    // {
    //   id: 'audio',
    //   label: 'Audio Notes',
    //   icon: 'mic' as const,
    //   onPress: () => router.push('create-audio'),
    //   isActive: activePage === 'audio',
    // },
  ], [activePage, searchQuery, onSearchQueryChange, t]);

  // Add admin section if user is admin
  const adminItems = isAdmin()
    ? [
        {
          id: 'admin-separator',
          label: t('sidebar.admin'),
          icon: 'shield' as const,
          onPress: () => {},
          isActive: false,
          isSeparator: true,
        },
        {
          id: 'admin-dashboard',
          label: t('sidebar.adminDashboard'),
          icon: 'shield' as const,
          onPress: () => router.push('admin-dashboard'),
          isActive: activePage === 'admin-dashboard',
        },
      ]
    : [];

  // Add support section if user is support
  const supportItems =
    isSupport() && !isAdmin()
      ? [
          {
            id: 'support-separator',
            label: t('sidebar.support'),
            icon: 'headset' as const,
            onPress: () => {},
            isActive: false,
            isSeparator: true,
          },
          {
            id: 'support-dashboard',
            label: t('sidebar.supportDashboard'),
            icon: 'headset' as const,
            onPress: () => router.push('/admin/support'),
            isActive: activePage === 'support',
          },
        ]
      : [];

  const allSidebarItems = useMemo(() => [...sidebarItems, ...adminItems, ...supportItems], [sidebarItems, adminItems, supportItems]);

  // Memoized navigation item renderer
  const renderNavigationItem = useCallback((item: any) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.navItem,
        item.isActive && { backgroundColor: accentColor + '20' },
        item.isSeparator && styles.separatorItem
      ]}
      onPress={item.onPress}
      disabled={item.isSeparator}
    >
      <Ionicons 
        name={item.icon} 
        size={20} 
        color={item.isActive ? accentColor : iconColor} 
      />
      <ThemedText 
        style={[
          styles.navLabel,
          item.isActive && { color: accentColor },
          item.isSeparator && styles.separatorLabel
        ]}
      >
        {item.label}
      </ThemedText>
      {item.shortcut && (
        <ThemedText style={styles.shortcut}>{item.shortcut}</ThemedText>
      )}
    </TouchableOpacity>
  ), [accentColor, iconColor]);

  const handleWebCreateNote = useCallback(() => router.push('create'), []);
  const handleWebCreateAudioNote = useCallback(() => router.push('/create-audio'), []);
  const handleWebSearch = useCallback(() => router.push('/(tabs)/search'), []);
  const handleWebSettings = useCallback(() => router.push('/(tabs)/settings'), []);

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

  // Helper function to extract audio duration on web using Web Audio API
  const extractAudioDuration = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        resolve(duration);
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });
  }, []);

  const handleAudioUploadClick = useCallback(async () => {
    setShowCreateDropdown(false);
    
    if (Platform.OS === 'web') {
      // Web: Use file input
      if (audioFileInputRef.current) {
        audioFileInputRef.current.click();
      }
    }
    // Mobile handling is done in the index.native.tsx file
  }, []);

  const handleAudioFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    
    // Validate file format
    if (!isValidAudioFormat(file.name, file.type)) {
      showSnackbar(t('home.unsupportedAudioFormat'), 'error');
      return;
    }
    
    // Validate file size
    if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE_BYTES) {
      setOversizedFile({ name: file.name, size: file.size });
      setShowSizeLimitWarning(true);
      return;
    }
    
    if (!user?.id) {
      showSnackbar(t('home.pleaseSignIn'), 'error');
      return;
    }

    try {
      // Extract audio duration
      let duration = 0;
      try {
        duration = await extractAudioDuration(file);
        if (duration === 0) {
          showSnackbar(t('home.failedToExtractDuration'), 'error');
        }
      } catch (durationError) {
        console.error('[UserSidebar] Error extracting audio duration:', durationError);
      }

      setUploadingAudio({
        fileName: file.name.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        duration: Math.round(duration),
        audioUrl: '',
        progress: 10,
        status: 'uploading',
        statusMessage: t('home.preparingAudio'),
      });

      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `🎤 ${file.name.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, '')}`,
        content: '⏳ Uploading audio... Please wait while we process your file.',
        type: 'audio',
        tags: ['audio', 'uploading'],
        summary: `Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        audioUrl: '',
        audioDuration: Math.round(duration),
      });

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 30,
        statusMessage: t('home.uploadingAudioToCloud'),
      } : null);

      // Create blob URL for upload
      const blobUrl = URL.createObjectURL(file);
      const uploadedAudioUrl = await audioStorage.uploadAudioFile(
        blobUrl,
        user.id,
        placeholderNote.id,
        file // Pass the file blob for web
      );
      URL.revokeObjectURL(blobUrl);

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 50,
        status: 'processing',
        statusMessage: t('home.processingAudioWithAI'),
        audioUrl: uploadedAudioUrl,
      } : null);

      // Process audio for transcription
      const processingResult = await AudioUtils.processAudioForTranscription(
        uploadedAudioUrl,
        user.id,
        placeholderNote.id,
        (message, progress) => {
          const mappedProgress = 50 + (progress * 0.4);
          setUploadingAudio(prev => prev ? {
            ...prev,
            progress: mappedProgress,
            statusMessage: message,
          } : null);
        },
        file // Pass the file blob for transcription
      );

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 85,
        statusMessage: t('home.saving'),
      } : null);

      // Update note with transcription and AI content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: processingResult.title || file.name.replace(/\.(mp3|m4a|wav|ogg|webm)$/i, ''),
        content: processingResult.transcription || '',
        summary: processingResult.summary || `Audio: ${file.name}`,
        keyDetails: processingResult.keyDetails || [],
        tags: ['audio'],
        audioUrl: uploadedAudioUrl,
        audioDuration: Math.round(duration),
      });

      // Track usage (count duration in minutes)
      try {
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
      } catch (usageError) {
        console.error('[UserSidebar] Error recording audio usage:', usageError);
      }

      setUploadingAudio(prev => prev ? {
        ...prev,
        progress: 100,
        status: 'completed',
        statusMessage: t('home.uploadComplete'),
      } : null);

      if (onUploadComplete) {
        await onUploadComplete();
      }
      setTimeout(() => { setUploadingAudio(null); }, 2000);
    } catch (error) {
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
  }, [user, showSnackbar, setUploadingAudio, isValidAudioFormat, extractAudioDuration, onUploadComplete, t]);

  const handlePDFUploadClick = useCallback(async () => {
    // Check if PDF upload feature is enabled
    if (!isFeatureEnabled('pdf_upload')) {
      showSnackbar(t('sidebar.pdfUploadNotAvailable'), 'error');
      setShowCreateDropdown(false);
      return;
    }

    setShowCreateDropdown(false);
    
    if (Platform.OS === 'web') {
      // Web: Use file input
      if (pdfFileInputRef.current) {
        pdfFileInputRef.current.click();
      }
    } else {
      // Mobile: Use expo-document-picker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled) {
          console.log('PDF selection cancelled');
          return;
        }

        const asset = result.assets[0];
        
        // Validate file
        if (!asset) {
          showSnackbar(t('sidebar.noFileSelected'), 'error');
          return;
        }

        // Validate file size
        if (asset.size && asset.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
          setOversizedFile({ name: asset.name, size: asset.size });
          setShowSizeLimitWarning(true);
          return;
        }

        if (!user?.id) {
          showSnackbar(t('sidebar.signInToUploadPDFs'), 'error');
          return;
        }

        // Process the selected PDF
        await handleMobilePDFUpload(asset.uri, asset.name, asset.size || 0);
        
      } catch (error) {
        console.error('Error picking PDF:', error);
        showSnackbar(t('sidebar.failedToSelectPDF'), 'error');
      }
    }
  }, [isFeatureEnabled, showSnackbar, user, t]);

  const handleMobilePDFUpload = useCallback(async (fileUri: string, fileName: string, fileSize: number) => {
    if (!user?.id) return;

    try {
      // Show upload card
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: t('sidebar.preparingPDF'),
      });

      // Create a placeholder note immediately
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${fileName.replace('.pdf', '')}`,
        content: `⏳ ${t('sidebar.uploadingPDF')} Please wait while we process your document.`,
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `${t('sidebar.uploadingPDF')} ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      });

      // Navigate to home screen immediately
      router.push('/(tabs)');

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: t('sidebar.uploadingToCloud') } : null);
      
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        fileUri,
        user.id,
        placeholderNote.id,
        fileName
      );

      // Process PDF with AI
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: t('sidebar.processingWithAI') } : null);
      
      const aiResult = await pdfStorage.processPDFWithAI(fileUri, {
        generateTitle: true,
        generateSummary: true,
        extractKeyDetails: true,
      });

      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || fileName.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: t('sidebar.saving') } : null);

      // Update note with AI-processed content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded!\n\n${fileName}\n${t('sidebar.textExtractionFailed')}.`,
        type: 'pdf',
        summary: aiSummary,
        keyDetails: aiResult.keyDetails || [],
        tags: ['pdf'],
      });

      // Save PDF metadata
      await pdfStorage.savePDFMetadata(placeholderNote.id, user.id, {
        filename: fileName,
        storageUrl: uploadedPDFUrl,
        extractedText: extractedText,
        extractionStatus: extractedText ? 'completed' : 'failed',
        pageCount: pageCount,
        fileSize: fileSize,
      });

      // Show completion
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: t('sidebar.uploadComplete') } : null);

      // Refresh notes immediately to show the new upload
      if (onUploadComplete) {
        await onUploadComplete();
      }

      // Hide card after delay
      setTimeout(() => {
        setUploadingPDF(null);
      }, 2000);

    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadingPDF(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'error', 
        statusMessage: t('sidebar.uploadFailed') 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, setUploadingPDF, t]);

  const handlePDFFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    event.target.value = '';

    // Validate file type
    if (file.type !== 'application/pdf') {
      Alert.alert(t('sidebar.invalidFile'), t('sidebar.pleaseSelectPDF'));
      return;
    }

    // Validate file size
    if (file.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
      setOversizedFile({ name: file.name, size: file.size });
      setShowSizeLimitWarning(true);
      return;
    }

    if (!user?.id) {
      Alert.alert(t('sidebar.authenticationRequired'), t('sidebar.signInToUploadPDFs') + '.');
      return;
    }

    try {
      // Show upload card
      setUploadingPDF({
        fileName: file.name.replace('.pdf', ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: t('sidebar.preparingPDF'),
      });

      // Create a placeholder note immediately with special indicator
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${file.name.replace('.pdf', '')}`,
        content: `⏳ ${t('sidebar.uploadingPDF')} Please wait while we process your document.`,
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `${t('sidebar.uploadingPDF')} ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      });

      if (!placeholderNote || !placeholderNote.id) {
        console.error('PDF upload: Failed to create placeholder note:', placeholderNote);
        throw new Error('Failed to create note for PDF upload. Please try again.');
      }

      console.log('PDF upload: Placeholder note created with ID:', placeholderNote.id);

      // Navigate to home screen immediately
      router.push('/(tabs)');

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: t('sidebar.uploadingToCloud') } : null);
      
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        file,
        user.id,
        placeholderNote.id
      );

      // Process PDF with AI
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: t('sidebar.processingWithAI') } : null);
      
      const aiResult = await pdfStorage.processPDFWithAI(file, {
        generateTitle: true,
        generateSummary: true,
        extractKeyDetails: true,
      });

      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || file.name.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: t('sidebar.saving') } : null);

      // Update note with AI-processed content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded!\n\n${file.name}\n${t('sidebar.textExtractionFailed')}.`,
        type: 'pdf',
        summary: aiSummary,
        keyDetails: aiResult.keyDetails || [],
        tags: ['pdf'],
      });

      // Save PDF metadata
      await pdfStorage.savePDFMetadata(placeholderNote.id, user.id, {
        filename: file.name,
        storageUrl: uploadedPDFUrl,
        extractedText: extractedText,
        extractionStatus: extractedText ? 'completed' : 'failed',
        pageCount: pageCount,
        fileSize: file.size,
      });

      // Show completion
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: t('sidebar.uploadComplete') } : null);

      // Refresh notes immediately to show the new upload
      if (onUploadComplete) {
        await onUploadComplete();
      }

      // Hide card after delay
      setTimeout(() => {
        setUploadingPDF(null);
      }, 2000);

    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadingPDF(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'error', 
        statusMessage: t('sidebar.uploadFailed') 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, setUploadingPDF, t]);

  const handleCreateDropdownToggle = useCallback(() => {
    if (!showCreateDropdown && buttonRef.current) {
      // Calculate dropdown position when opening
      const buttonElement = buttonRef.current as any;
      if (buttonElement && buttonElement.getBoundingClientRect) {
        const rect = buttonElement.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left
        });
      }
    }
    setShowCreateDropdown(!showCreateDropdown);
  }, [showCreateDropdown]);

  const handleCreateOption = useCallback((route: string) => {
    setShowCreateDropdown(false);
    router.push(route);
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Hidden PDF file input */}
      <input
        ref={pdfFileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handlePDFFileChange}
      />

      {/* Hidden Audio file input */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleAudioFileChange}
      />

      {/* Logo/Brand */}
      <View style={styles.brand}>
        <Image
          source={require('../../assets/images/WiznoteLogoNov25.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <ThemedText type="title" style={styles.logo}>
          WizNote
        </ThemedText>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <View style={styles.createButtonContainer}>
          <TouchableOpacity 
            ref={buttonRef as any}
            style={styles.createButton} 
            onPress={handleCreateDropdownToggle}
            accessibilityLabel="Create new note"
            accessibilityHint="Opens dropdown with note creation options"
            accessibilityRole="button"
            accessibilityState={{ expanded: showCreateDropdown }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>{t('sidebar.newNote')}</ThemedText>
            <View style={styles.createButtonRight}>
              <ThemedText style={styles.shortcut}>⌘N</ThemedText>
              <Ionicons 
                name={showCreateDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#FFFFFF" 
                style={[
                  styles.chevronIcon,
                  Platform.OS === 'web' && {
                    transform: [{ rotate: showCreateDropdown ? '180deg' : '0deg' }],
                  }
                ]}
              />
            </View>
          </TouchableOpacity>
          
          {/* Dropdown Menu */}
          {showCreateDropdown && Platform.OS === 'web' && createPortal(
              <div 
                ref={dropdownRef as any}
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(106, 90, 205, 0.2)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  zIndex: 999999,
                  minWidth: '200px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    cursor: isSunsetMode ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isSunsetMode ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSunsetMode) {
                      e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSunsetMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                  onClick={isSunsetMode ? undefined : () => handleCreateOption('create')}
                >
                  <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                    <Ionicons name="document-text" size={18} color={isSunsetMode ? '#999' : '#6A5ACD'} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>{t('sidebar.createTextNote')}</div>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>{t('sidebar.createTextNoteDesc')}</div>
                  </div>
                </div>
                
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: isSunsetMode ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isSunsetMode ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSunsetMode) {
                      e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSunsetMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                  onClick={isSunsetMode ? undefined : () => handleCreateOption('create-audio')}
                >
                  <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                    <Ionicons name="mic" size={18} color={isSunsetMode ? '#999' : '#6A5ACD'} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>{t('sidebar.createAudioNote')}</div>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>{t('sidebar.createAudioNoteDesc')}</div>
                  </div>
                </div>

                {/* Upload Audio Option */}
                {isFeatureEnabled('voice_recording') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: isSunsetMode ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isSunsetMode ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSunsetMode) {
                        e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSunsetMode) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    onClick={isSunsetMode ? undefined : handleAudioUploadClick}
                  >
                    <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                      <Ionicons name="cloud-upload" size={18} color={isSunsetMode ? '#999' : '#6A5ACD'} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>{t('sidebar.uploadAudio')}</div>
                      <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>{t('sidebar.uploadAudioDesc')}</div>
                    </div>
                  </div>
                )}

                {/* PDF Upload Option - Feature Flag Protected */}
                {isFeatureEnabled('pdf_upload') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: isSunsetMode ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isSunsetMode ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSunsetMode) {
                        e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSunsetMode) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    onClick={isSunsetMode ? undefined : handlePDFUploadClick}
                  >
                    <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                      <Ionicons name="document" size={18} color={isSunsetMode ? '#999' : '#6A5ACD'} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>{t('sidebar.uploadPDF')}</div>
                      <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>{t('sidebar.uploadPDFDesc')}</div>
                    </div>
                  </div>
                )}
              </div>,
              document.body
            )}
          
        </View>
      </View>

      {/* Navigation Items */}
      <View style={styles.navigation}>
        {allSidebarItems.map(renderNavigationItem)}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomItem} onPress={handleWebSearch}>
          <Ionicons name="search" size={20} color={iconColor} />
          <ThemedText style={styles.bottomLabel}>{t('sidebar.search')}</ThemedText>
          <ThemedText style={styles.shortcut}>⌘K</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={() => router.push('/help')}>
          <Ionicons name="help-circle" size={20} color={iconColor} />
          <ThemedText style={styles.bottomLabel}>{t('sidebar.helpSupport')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={handleWebSettings}>
          <Ionicons name="settings" size={20} color={iconColor} />
          <ThemedText style={styles.bottomLabel}>{t('sidebar.settings')}</ThemedText>
        </TouchableOpacity>
      </View>

      {/* PDF Size Limit Warning */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    zIndex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickActions: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  createButtonContainer: {
    position: 'relative',
    zIndex: 9999,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
    ...(Platform.OS === 'web' ? {
      ':hover': {
        backgroundColor: '#5A4ABD',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 8px rgba(106, 90, 205, 0.3)',
      },
      ':focus': {
        outline: '2px solid rgba(255, 255, 255, 0.5)',
        outlineOffset: '2px',
      },
      ':active': {
        transform: 'translateY(0px)',
        boxShadow: '0 2px 4px rgba(106, 90, 205, 0.3)',
      },
    } : {}),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  createButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevronIcon: {
    marginLeft: 4,
    ...(Platform.OS === 'web' ? {
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } : {}),
    ...(Platform.OS === 'web' ? {
      transform: 'rotate(0deg)',
    } : {}),
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999999,
    overflow: 'hidden',
    minWidth: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(106, 90, 205, 0.2)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(8px)',
    } : {}),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(106, 90, 205, 0.1)',
        transform: 'translateX(4px)',
      },
      ':focus': {
        backgroundColor: 'rgba(106, 90, 205, 0.15)',
        outline: '2px solid rgba(106, 90, 205, 0.5)',
        outlineOffset: '-2px',
      },
      ':active': {
        backgroundColor: 'rgba(106, 90, 205, 0.2)',
      },
      ':last-child': {
        borderBottomWidth: 0,
      },
    } : {}),
  },
  dropdownItemIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemContent: {
    flex: 1,
    flexDirection: 'column',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Platform.OS === 'web' ? '#333333' : '#FFFFFF',
    marginBottom: 2,
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    color: Platform.OS === 'web' ? '#666666' : 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  navigation: {
    flex: 1,
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  navLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  separatorItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 8,
  },
  separatorLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomActions: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  bottomLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  shortcut: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
}); 