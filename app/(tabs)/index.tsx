import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Logo } from '../../components/Logo';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { UploadingNoteCard } from '../../components/UploadingNoteCard';
import { PDFSizeLimitWarning } from '../../components/PDFSizeLimitWarning';
import { LazyWrapper, LazyViewport } from '../../components/LazyWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLazyData } from '../../hooks/useLazyData';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePDFUpload } from '../../contexts/PDFUploadContext';
import { AudioUtils } from '../../services/AudioUtils';
import { pdfStorage } from '../../services/PDFStorage';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { featureFlagService } from '../../services/FeatureFlagService';
import { realtimeSyncService } from '../../services/RealtimeSyncService';
import { Note } from '../../types/Note';
import { PDF_CONFIG } from '../../constants/PDFConfig';

// Import web components
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { WebNoteCard } from '../../components/web/WebNoteCard';

export default function HomeScreen() {
  console.log('HomeScreen: Component rendering...');
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { showSnackbar } = useSnackbar();
  const { uploadingPDF, setUploadingPDF, setOnUploadComplete } = usePDFUpload();
  const { notes, loading, error, syncStatus, isRealtimeActive, togglePin, toggleArchive, toggleFavorite, deleteNote, getFilteredNotes, refreshNotes } = useNotes(
    authLoading ? '' : (user?.id || '')
  );

  // Register refresh callback for PDF uploads from sidebars
  useEffect(() => {
    setOnUploadComplete(() => refreshNotes);
    return () => setOnUploadComplete(null);
  }, [refreshNotes, setOnUploadComplete]);

  // PDF upload UI state
  const [showSizeLimitWarning, setShowSizeLimitWarning] = useState(false);
  const [oversizedFile, setOversizedFile] = useState<{ name: string; size: number } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Lazy load feature flags with caching
  const featureFlags = useLazyData(
    'feature-flags',
    async () => {
      if (!isAuthenticated) return {};
      return await featureFlagService.getFeatureFlags();
    },
    {
      enabled: isAuthenticated,
      delay: 100, // Small delay to prevent blocking
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      staleTime: 1 * 60 * 1000, // 1 minute stale time
    }
  );

  // Set up real-time sync for notes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('HomeScreen: Setting up real-time sync for user:', user.id);
      
      // Set up note update handler
      realtimeSyncService.setNoteUpdateHandler((note) => {
        console.log('HomeScreen: Real-time note update received:', note.id);
        // Refresh notes to get the latest data
        if (refreshNotes) {
          refreshNotes();
        }
      });

      // Set up note delete handler
      realtimeSyncService.setNoteDeleteHandler((noteId) => {
        console.log('HomeScreen: Real-time note delete received:', noteId);
        // Refresh notes to get the latest data
        if (refreshNotes) {
          refreshNotes();
        }
      });

      // Set current user for real-time sync
      realtimeSyncService.setCurrentUser(user.id);

      return () => {
        console.log('HomeScreen: Cleaning up real-time sync');
        realtimeSyncService.setCurrentUser(null);
      };
    }
  }, [isAuthenticated, user?.id, refreshNotes]);

  // Temporary debug logging to understand authentication state
  useEffect(() => {
    console.log('HomeScreen: Authentication Debug Info:');
    console.log('  - user:', user);
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user?.id:', user?.id);
    console.log('  - user?.email:', user?.email);
    console.log('  - user?.displayName:', user?.displayName);
    console.log('  - authLoading:', authLoading);
    console.log('  - notes loading:', loading);
    console.log('  - notes count:', notes.length);
  }, [user, isAuthenticated, authLoading, loading, notes.length]);

  // Force initialize feature flags if not loaded
  useEffect(() => {
    const initializeFlags = async () => {
      try {
        console.log('HomeScreen: Checking feature flags...');
        const currentFlags = featureFlagService.getAllFlags();
        console.log('HomeScreen: Current flags:', Object.keys(currentFlags));
        
        if (Object.keys(currentFlags).length === 0) {
          console.log('HomeScreen: No flags found, initializing...');
          // HomeScreen is only rendered when user is authenticated
          await featureFlagService.initialize(true);
          console.log('HomeScreen: Flags initialized:', Object.keys(featureFlagService.getAllFlags()));
        }
      } catch (error) {
        console.error('HomeScreen: Error initializing feature flags:', error);
      }
    };

    initializeFlags();
  }, []);

  // Refresh notes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authLoading && refreshNotes) {
        console.log('HomeScreen: Screen focused, refreshing notes...');
        refreshNotes();
      }
    }, [isAuthenticated, authLoading, refreshNotes])
  );
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFavorites, setShowFavorites] = useState(false);
  
  // Multi-select state
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const iconColor = useThemeColor({}, 'text');
  const sortOrderButtonBg = useThemeColor({ light: '#E5E7EB', dark: '#282828' }, 'background');
  const premiumButtonBg = useThemeColor({ light: '#FF8C00', dark: '#FF8C00' }, 'tint');
  const premiumIconColor = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');
  const cardBg = useThemeColor({}, 'backgroundSecondary');

  // Multi-select helper functions
  const handleNoteLongPress = useCallback((note: Note) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
      showSnackbar(
        Platform.OS === 'web' 
          ? 'Multi-select mode activated. Click notes to select more.'
          : 'Hold and release to select. Tap other notes to select more.',
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
  }, [isMultiSelectMode, showSnackbar]);

  const handleNotePress = useCallback((note: Note) => {
    if (isMultiSelectMode) {
      // In multi-select mode, toggle selection instead of navigating
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
      // Normal mode - navigate to note
      router.push(`/note/${note.id}`);
    }
  }, [isMultiSelectMode, router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedNotes.size === 0) return;

    console.log('Bulk delete initiated for notes:', Array.from(selectedNotes));

    // Use browser confirm for web, Alert.alert for mobile
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete ${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''}? This action cannot be undone.`)
      : true; // For mobile, we'll use Alert.alert

    if (Platform.OS === 'web' && !confirmed) {
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Delete Selected Notes',
        `Are you sure you want to delete ${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performBulkDelete();
            }
          }
        ]
      );
    } else {
      await performBulkDelete();
    }

    async function performBulkDelete() {
      try {
        console.log('Starting bulk delete process...');
        const deletePromises = Array.from(selectedNotes).map(noteId => {
          console.log('Deleting note:', noteId);
          return deleteNote(noteId);
        });
        await Promise.all(deletePromises);
        console.log('Bulk delete completed successfully');
        setSelectedNotes(new Set());
        setIsMultiSelectMode(false);
        
        // Show success message using snackbar
        showSnackbar(
          `Successfully deleted ${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''}!`,
          'success',
          3000
        );
      } catch (error) {
        console.error('Error deleting notes:', error);
        showSnackbar(
          'Failed to delete some notes. Please try again.',
          'error',
          5000
        );
      }
    }
  }, [selectedNotes, deleteNote, showSnackbar]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedNotes(new Set());
    showSnackbar(
      'Multi-select mode cancelled.',
      'info',
      1500
    );
  }, [showSnackbar]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const handleCreateNote = useCallback(() => {
    console.log('Create button pressed, showCreateOptions:', showCreateOptions);
    // Prevent multiple rapid clicks
    if (showCreateOptions) return;
    setShowCreateOptions(true);
  }, [showCreateOptions]);

  const handleCreateTextNote = useCallback(() => {
    console.log('Text note button pressed');
    setShowCreateOptions(false);
    router.push('/create' as any);
  }, [router]);

  const handleCreateAudioNote = useCallback(async () => {
    console.log('Audio note button pressed');
    
    try {
      // Check microphone permission
      const permission = await AudioUtils.requestPermissions();
      
      if (permission.status === 'granted') {
        // Permission already granted, navigate to audio screen
        setShowCreateOptions(false);
        router.push('/create-audio' as any);
              } else if (permission.status === 'undetermined') {
          // Permission not determined, request it
          const newPermission = await AudioUtils.requestPermissions();
        
        if (newPermission.status === 'granted') {
          // Permission granted, navigate to audio screen
          setShowCreateOptions(false);
          router.push('/create-audio' as any);
        } else {
          // Permission denied
          Alert.alert(
            'Microphone Permission Required',
            'Audio recording requires microphone access. Please grant permission in your device settings to create audio notes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // On web, we can't open settings, so just show instructions
                Alert.alert(
                  'How to Grant Permission',
                  '1. Go to your browser settings\n2. Find microphone permissions\n3. Allow microphone access for this site\n4. Try creating an audio note again'
                );
              }}
            ]
          );
        }
      } else {
        // Permission denied, show alert
        Alert.alert(
          'Microphone Permission Denied',
          'Audio recording requires microphone access. Please grant permission in your device settings to create audio notes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On web, we can't open settings, so just show instructions
              Alert.alert(
                'How to Grant Permission',
                '1. Go to your browser settings\n2. Find microphone permissions\n3. Allow microphone access for this site\n4. Try creating an audio note again'
              );
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to check microphone permissions. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleCreateAudioNote() }
        ]
      );
    }
  }, [router]);

  const handleCloseCreateOptions = useCallback(() => {
    setShowCreateOptions(false);
  }, []);

  const handleCreatePDFNote = useCallback(async () => {
    console.log('PDF note button pressed');
    
    // Check if PDF upload feature is enabled
    if (!isFeatureEnabled('pdf_upload')) {
      showSnackbar('PDF upload feature is not available', 'error');
      setShowCreateOptions(false);
      return;
    }

    setShowCreateOptions(false);
    
    if (Platform.OS === 'web') {
      // Web: Use file input
      if (pdfInputRef.current) {
        pdfInputRef.current.click();
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
          showSnackbar('No file selected', 'error');
          return;
        }

        // Validate file size
        if (asset.size && asset.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
          setOversizedFile({ name: asset.name, size: asset.size });
          setShowSizeLimitWarning(true);
          return;
        }

        if (!user?.id) {
          showSnackbar('Please sign in to upload PDFs', 'error');
          return;
        }

        // Process the selected PDF
        await handleMobilePDFUpload(asset.uri, asset.name, asset.size || 0);
        
      } catch (error) {
        console.error('Error picking PDF:', error);
        showSnackbar('Failed to select PDF file', 'error');
      }
    }
  }, [isFeatureEnabled, showSnackbar, user]);

  const handleMobilePDFUpload = useCallback(async (fileUri: string, fileName: string, fileSize: number) => {
    if (!user?.id) {
      console.error('❌ No user ID available for PDF upload');
      return;
    }

    console.log('📱 Starting mobile PDF upload:', { fileName, fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`, fileUri });

    try {
      // Show uploading card
      console.log('📤 Setting upload state...');
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: 'Preparing PDF...',
      });

      // Create placeholder note
      console.log('📝 Creating placeholder note...');
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${fileName.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      });
      console.log('✅ Placeholder note created:', placeholderNote.id);

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: 'Uploading to cloud...' } : null);

      // Upload PDF
      console.log('☁️ Uploading PDF to storage...');
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        fileUri,
        user.id,
        placeholderNote.id,
        fileName
      );
      console.log('✅ PDF uploaded:', uploadedPDFUrl);

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, statusMessage: 'Processing with AI...' } : null);

      // Process PDF with AI (extract text, generate title, summary, key details)
      console.log('🤖 Processing PDF with AI...');
      const aiResult = await pdfStorage.processPDFWithAI(fileUri, {
        generateTitle: true,
        generateSummary: true,
        extractKeyDetails: true,
      });
      console.log('✅ AI processing complete:', { 
        hasText: !!aiResult.extractedText, 
        title: aiResult.title,
        pageCount: aiResult.pageCount 
      });

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: 'Saving...' } : null);

      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || fileName.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;

      // Update note with AI-processed content
      console.log('💾 Updating note with AI content...');
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded successfully!\n\n${fileName}\nSize: ${(fileSize / (1024 * 1024)).toFixed(2)} MB\n\nText extraction failed. Please try again.`,
        type: 'pdf',
        summary: aiSummary,
        keyDetails: aiResult.keyDetails || [],
        tags: ['pdf'],
      });
      console.log('✅ Note updated');

      // Save PDF metadata
      console.log('📊 Saving PDF metadata...');
      await pdfStorage.savePDFMetadata(placeholderNote.id, user.id, {
        filename: fileName,
        storageUrl: uploadedPDFUrl,
        extractedText: extractedText,
        extractionStatus: extractedText ? 'completed' : 'failed',
        pageCount: pageCount,
        fileSize: fileSize,
      });
      console.log('✅ Metadata saved');

      // Show completion
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: 'Upload complete!' } : null);

      // Refresh notes immediately to show the new upload
      console.log('🔄 Refreshing notes list...');
      await refreshNotes?.();
      console.log('✅ Notes refreshed');

      // Hide card after delay
      setTimeout(() => {
        console.log('🎉 Hiding upload card');
        setUploadingPDF(null);
      }, 2000);

    } catch (error) {
      console.error('❌ Mobile PDF upload error:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showSnackbar(`PDF upload failed: ${errorMessage}`, 'error');
      
      setUploadingPDF(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'error', 
        statusMessage: 'Upload failed. Please try again.' 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, showSnackbar, refreshNotes, setUploadingPDF]);

  const handlePDFFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    // Validate file type
    if (file.type !== 'application/pdf') {
      showSnackbar('Please select a PDF file', 'error');
      return;
    }

    // Validate file size
    if (file.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
      setOversizedFile({ name: file.name, size: file.size });
      setShowSizeLimitWarning(true);
      return;
    }

    if (!user?.id) {
      showSnackbar('Please sign in to upload PDFs', 'error');
      return;
    }

    try {
      // Show uploading card
      setUploadingPDF({
        fileName: file.name.replace('.pdf', ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: 'Preparing PDF...',
      });

      // Create placeholder note
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${file.name.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      });

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: 'Uploading to cloud...' } : null);

      // Upload PDF
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        file,
        user.id,
        placeholderNote.id
      );

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: 'Processing with AI...' } : null);

      // Process PDF with AI (extract text, generate title, summary, key details)
      const aiResult = await pdfStorage.processPDFWithAI(file, {
        generateTitle: true,
        generateSummary: true,
        extractKeyDetails: true,
      });

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: 'Saving...' } : null);

      const extractedText = aiResult.extractedText || '';
      const aiTitle = aiResult.title || file.name.replace('.pdf', '');
      const aiSummary = aiResult.summary || `PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      const pageCount = aiResult.pageCount || 1;

      // Update note with AI-processed content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded successfully!\n\n${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nText extraction failed. Please try again.`,
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
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: 'Upload complete!' } : null);

      // Refresh notes immediately to show the new upload
      await refreshNotes?.();

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
        statusMessage: 'Upload failed. Please try again.' 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, showSnackbar, refreshNotes, setUploadingPDF]);



  const handlePremiumPress = () => {
    router.push('join-premium');
  };





  const filteredNotes = getFilteredNotes({
    searchQuery: '',
    tags: [],
    showArchived: false,
    showFavorites: showFavorites,
    sortBy: 'updatedAt',
    sortOrder: sortOrder,
  });

  // Debug logging for notes
  useEffect(() => {
    console.log('HomeScreen: Notes debug info:');
    console.log('  - Total notes:', notes.length);
    console.log('  - Filtered notes:', filteredNotes.length);
    console.log('  - Notes:', notes.map(n => ({ id: n.id, title: n.title, isArchived: n.isArchived })));
  }, [notes, filteredNotes]);

  // Split filtered notes into pinned and unpinned
  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  
  // Combine uploading card with notes for display
  const displayNotes = [...unpinnedNotes];

  // Web-specific handlers for note cards
  const handleWebCreateNote = () => {
    router.push('create');
  };

  const handleWebEditNote = (note: Note) => {
    router.push(`/create?noteId=${note.id}`);
  };

  const handleWebDeleteNote = async (note: Note) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
    }
  };

  const handleWebArchiveNote = async (note: Note) => {
    await toggleArchive(note.id);
  };

  // Web layout
  if (Platform.OS === 'web') {

    if (loading) {
      console.log('HomeScreen: Notes loading, showing loading screen');
      return (
        <WebLayout
          sidebar={
            <UserSidebar
              activePage="home"
            />
          }
          header={
            <View style={styles.webHeader}>
              <ThemedText type="title">My Notes</ThemedText>
              <ThemedText style={styles.webLoadingText}>Loading...</ThemedText>
            </View>
          }
        >
          <View style={styles.webLoadingContainer}>
            <LoadingSpinner size={50} />
            <ThemedText style={styles.webLoadingText}>Loading your notes...</ThemedText>
          </View>
        </WebLayout>
      );
    }

    if (error) {
      return (
        <WebLayout
          sidebar={
            <UserSidebar
              activePage="home"
            />
          }
          header={
            <View style={styles.webHeader}>
              <ThemedText type="title">My Notes</ThemedText>
            </View>
          }
        >
          <View style={styles.webErrorContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            <ThemedText style={styles.webErrorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.webRetryButton} onPress={() => window.location.reload()}>
              <ThemedText style={styles.webRetryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </WebLayout>
      );
    }

    console.log('HomeScreen: Rendering main content with', filteredNotes.length, 'notes');
    return (
      <WebLayout
        sidebar={
          <UserSidebar
            activePage="home"
          />
        }
        header={
          <View style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <ThemedText type="title">My Notes</ThemedText>
            </View>
            <View style={styles.webHeaderActions}>
              {/* Sync Status Indicator */}
              <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
              
              {/* Force show for debugging */}
              {!user?.premium?.isActive && (
                <TouchableOpacity style={styles.webPremiumButton} onPress={handlePremiumPress}>
                  <MaterialCommunityIcons name="crown" size={16} color="#FF8C00" />
                  <ThemedText style={styles.webPremiumButtonText}>Join Premium</ThemedText>
                </TouchableOpacity>
              )}

              <ThemedText style={styles.webNoteCount}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </ThemedText>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {filteredNotes.length === 0 && !uploadingPDF ? (
            <View style={styles.webEmptyContainer}>
              <Ionicons name="document-outline" size={64} color="#666666" />
              <ThemedText type="subtitle" style={styles.webEmptyTitle}>
                No notes yet
              </ThemedText>
              <ThemedText style={styles.webEmptySubtitle}>
                Create your first note to get started
              </ThemedText>
              <TouchableOpacity style={styles.webCreateButton} onPress={handleWebCreateNote}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <ThemedText style={styles.webCreateButtonText}>Create Note</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Multi-select Toolbar */}
              {isMultiSelectMode && (
                <View style={styles.webSelectionToolbar}>
                  <View style={styles.webSelectionInfo}>
                    <ThemedText style={styles.webSelectionText}>
                      {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
                    </ThemedText>
                  </View>
                  <View style={styles.webSelectionActions}>
                    <TouchableOpacity 
                      style={[styles.webSelectionButton, styles.webSelectionButtonDanger]}
                      onPress={() => {
                        console.log('Delete button clicked!');
                        handleBulkDelete();
                      }}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.webSelectionButtonText}>Delete</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.webSelectionButton}
                      onPress={exitMultiSelectMode}
                    >
                      <Ionicons name="close" size={16} color="#666666" />
                      <ThemedText style={[styles.webSelectionButtonText, { color: '#666666' }]}>Cancel</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.webNotesGrid}>
                {/* Show uploading PDF card first */}
                {uploadingPDF && (
                  <UploadingNoteCard
                    fileName={uploadingPDF.fileName}
                    fileSize={uploadingPDF.fileSize}
                    progress={uploadingPDF.progress}
                    status={uploadingPDF.status}
                    statusMessage={uploadingPDF.statusMessage}
                  />
                )}
                {/* Then show regular notes */}
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
      </WebLayout>
    );
  }

  // Mobile layout (existing code)
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Logo size={40} />
            <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
            <Ionicons name="add" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.notesSection}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={50} />
            <ThemedText style={styles.loadingText}>Loading your notes...</ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Logo size={40} />
            <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
            <Ionicons name="add" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.notesSection}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={40} />
          <ThemedText style={styles.headerTitle}>WizNote</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Sync Status Indicator */}
                      <SyncStatusIndicator syncStatus={syncStatus} isRealtime={isRealtimeActive} compact={true} />
          
          {/* Force show for debugging */}
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

      {/* Notes Section */}
      <View style={styles.notesSection}>
        <View style={styles.notesSectionHeader}>
          <ThemedText style={styles.sectionTitle}>Recent Notes</ThemedText>
          <View style={styles.sortOrderContainer}>
            <TouchableOpacity
              style={[styles.sortOrderButton, { backgroundColor: showFavorites ? '#FFD700' : sortOrderButtonBg }]}
              onPress={() => setShowFavorites(!showFavorites)}
            >
              <Ionicons
                name={showFavorites ? 'star' : 'star-outline'}
                size={18}
                color={showFavorites ? '#000' : iconColor}
              />
              <ThemedText style={[styles.sortOrderText, { color: showFavorites ? '#000' : iconColor }]}>
                {showFavorites ? 'Favorites' : 'All'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOrderButton, { backgroundColor: sortOrderButtonBg, marginLeft: 8 }]}
              onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <Ionicons
                name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                size={18}
                color={iconColor}
              />
              <ThemedText style={styles.sortOrderText}>
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {pinnedNotes.length === 0 && unpinnedNotes.length === 0 && !uploadingPDF ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#A0A0A0" />
            <ThemedText style={styles.emptyText}>No notes yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap the + button to create your first note
            </ThemedText>

          </View>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <ThemedText style={styles.pinnedLabel}>Pinned</ThemedText>
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
                />
              </>
            )}
            {pinnedNotes.length > 0 && (unpinnedNotes.length > 0 || uploadingPDF) && (
              <View style={styles.sectionDivider} />
            )}
            {(unpinnedNotes.length > 0 || uploadingPDF) && (
              <>
                <ThemedText style={styles.othersLabel}>Others</ThemedText>
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
                  ListHeaderComponent={
                    uploadingPDF ? (
                      <UploadingNoteCard
                        fileName={uploadingPDF.fileName}
                        fileSize={uploadingPDF.fileSize}
                        progress={uploadingPDF.progress}
                        status={uploadingPDF.status}
                        statusMessage={uploadingPDF.statusMessage}
                      />
                    ) : null
                  }
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </>
        )}
      </View>
      
      {/* Hidden PDF file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handlePDFFileChange}
        />
      )}

      {/* Mobile Selection Toolbar */}
      {isMultiSelectMode && Platform.OS !== 'web' && (
        <View style={[styles.mobileSelectionToolbar, { backgroundColor: cardBg }]}>
          <View style={styles.mobileSelectionInfo}>
            <ThemedText style={styles.mobileSelectionText}>
              {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
            </ThemedText>
          </View>
          <View style={styles.mobileSelectionActions}>
            <TouchableOpacity 
              style={[styles.mobileSelectionButton, styles.mobileSelectionButtonDanger]}
              onPress={handleBulkDelete}
              disabled={selectedNotes.size === 0}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <ThemedText style={styles.mobileSelectionButtonText}>Delete</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.mobileSelectionButton, styles.mobileSelectionButtonCancel]}
              onPress={exitMultiSelectMode}
            >
              <Ionicons name="close" size={20} color="#666666" />
              <ThemedText style={[styles.mobileSelectionButtonText, { color: '#666666' }]}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Create Options Bottom Sheet */}
      <CreateOptionsSheet
        visible={showCreateOptions}
        onClose={handleCloseCreateOptions}
        onTextNote={handleCreateTextNote}
        onAudioNote={handleCreateAudioNote}
        onPDFNote={handleCreatePDFNote}
        isVoiceRecordingEnabled={isFeatureEnabled('voice_recording')}
        isPDFUploadEnabled={isFeatureEnabled('pdf_upload')}
        testID="create-options-sheet"
      />

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

// Bottom Sheet Component
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
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [isVisible, setIsVisible] = useState(false);
  const slideCardBg = useThemeColor({ light: '#fff', dark: '#2A2A2A' }, 'background');
  const optionBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const chevronColor = useThemeColor({ light: '#A0A0A0', dark: '#666666' }, 'text');

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [visible, slideAnim]);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay} testID={testID}>
      <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
      <Animated.View 
        style={[
          styles.bottomSheet,
          { backgroundColor: slideCardBg },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.bottomSheetHandle} />
        
        <ThemedText style={styles.bottomSheetTitle}>Create Note</ThemedText>
        <ThemedText style={styles.bottomSheetSubtitle}>Choose the type of note you want to create</ThemedText>
        
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
              <ThemedText style={styles.createOptionTitle}>Text Note</ThemedText>
              <ThemedText style={styles.createOptionDescription}>Write notes with text and formatting</ThemedText>
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
                <ThemedText style={styles.createOptionTitle}>Audio Note</ThemedText>
                <ThemedText style={styles.createOptionDescription}>Record voice notes with AI transcription</ThemedText>
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
                <ThemedText style={styles.createOptionTitle}>Upload PDF</ThemedText>
                <ThemedText style={styles.createOptionDescription}>
                  Extract text from PDF documents
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={chevronColor} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#6A5ACD',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  notesSection: {
    flex: 1,
    paddingHorizontal: 40,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    color: '#A0A0A0',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#A0A0A0',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#FF6B6B',
  },
  sampleButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  sampleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: '#4CAF50',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    }),
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bottomSheetSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 20,
  },
  createOptions: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  createOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  createOptionContent: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  createOptionDescription: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  cancelButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sortOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortOrderText: {
    color: '#6A5ACD',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pinnedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
    marginBottom: 8,
    marginTop: 8,
  },
  othersLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A0A0A0',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 16,
  },
  premiumButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.18)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webHeaderLeft: {
    flex: 1,
  },
  webLoadingText: {
    fontSize: 16,
    color: '#A0A0A0',
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webErrorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#FF6B6B',
  },
  webRetryButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  webRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webNoteCount: {
    fontSize: 16,
    color: '#6A5ACD',
    fontWeight: '600',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webPremiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
    cursor: 'pointer',
  },
  webPremiumButtonText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  webEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  webEmptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    color: '#A0A0A0',
  },
  webCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  webCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  webNotesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 5,
  },
  webNoteCardSkeleton: {
    width: 'calc(33.333% - 10px)',
    minHeight: 200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#E0E0E0',
  },
  // Multi-select toolbar styles
  webSelectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  webSelectionInfo: {
    flex: 1,
  },
  webSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  webSelectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    gap: 6,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  webSelectionButtonDanger: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  webSelectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  // Mobile selection toolbar styles
  mobileSelectionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  mobileSelectionInfo: {
    flex: 1,
  },
  mobileSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileSelectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  mobileSelectionButtonDanger: {
    backgroundColor: '#DC3545',
  },
  mobileSelectionButtonCancel: {
    backgroundColor: '#333333',
  },
  mobileSelectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});