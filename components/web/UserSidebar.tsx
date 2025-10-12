import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore - react-dom types not available in React Native environment
import { createPortal } from 'react-dom';
import { Alert, Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { usePDFUpload } from '../../contexts/PDFUploadContext';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useThemeColor } from '../../hooks/useThemeColor';
import { pdfStorage } from '../../services/PDFStorage';
import { supabaseNoteStorage } from '../../services/SupabaseNoteStorage';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { PDFSizeLimitWarning } from '../PDFSizeLimitWarning';
import { PDF_CONFIG } from '../../constants/PDFConfig';

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
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const { isAdmin, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { setUploadingPDF, onUploadComplete } = usePDFUpload();
  const { isFeatureEnabled } = useFeatureFlags();
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showSizeLimitWarning, setShowSizeLimitWarning] = useState(false);
  const [oversizedFile, setOversizedFile] = useState<{ name: string; size: number } | null>(null);
  const dropdownRef = useRef<View>(null);
  const buttonRef = useRef<typeof TouchableOpacity>(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

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
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
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
  }, [showCreateDropdown]);

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
      label: 'All Notes',
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
      label: 'Shared',
      icon: 'people' as const,
      onPress: () => router.push('/(tabs)/shared'),
      isActive: activePage === 'shared',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: 'star' as const,
      onPress: () => router.push('/(tabs)/favorites'),
      isActive: activePage === 'favorites',
    },
    {
      id: 'archived',
      label: 'Archived',
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
  ], [activePage, searchQuery, onSearchQueryChange]);

  // Add admin section if user is admin
  const adminItems = useMemo(() => isAdmin() ? [
    {
      id: 'admin-separator',
      label: 'Admin',
      icon: 'shield' as const,
      onPress: () => {},
      isActive: false,
      isSeparator: true,
    },
    {
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      icon: 'shield' as const,
      onPress: () => router.push('admin-dashboard'),
      isActive: activePage === 'admin-dashboard',
    },
  ] : [], [isAdmin, activePage]);

  const allSidebarItems = useMemo(() => [...sidebarItems, ...adminItems], [sidebarItems, adminItems]);

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

  const handlePDFUploadClick = useCallback(async () => {
    // Check if PDF upload feature is enabled
    if (!isFeatureEnabled('pdf_upload')) {
      showSnackbar('PDF upload feature is not available', 'error');
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
    if (!user?.id) return;

    try {
      // Show upload card
      setUploadingPDF({
        fileName: fileName.replace('.pdf', ''),
        fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: 'Preparing PDF...',
      });

      // Create a placeholder note immediately
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${fileName.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      });

      // Navigate to home screen immediately
      router.push('/(tabs)');

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: 'Uploading to cloud...' } : null);
      
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        fileUri,
        user.id,
        placeholderNote.id,
        fileName
      );

      // Process PDF with AI
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: 'Processing with AI...' } : null);
      
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
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: 'Saving...' } : null);

      // Update note with AI-processed content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded!\n\n${fileName}\nText extraction failed.`,
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
      setUploadingPDF(prev => prev ? { ...prev, progress: 100, status: 'completed', statusMessage: 'Upload complete!' } : null);

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
        statusMessage: 'Upload failed. Please try again.' 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, setUploadingPDF]);

  const handlePDFFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    event.target.value = '';

    // Validate file type
    if (file.type !== 'application/pdf') {
      Alert.alert('Invalid File', 'Please select a PDF file.');
      return;
    }

    // Validate file size
    if (file.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
      setOversizedFile({ name: file.name, size: file.size });
      setShowSizeLimitWarning(true);
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to upload PDFs.');
      return;
    }

    try {
      // Show upload card
      setUploadingPDF({
        fileName: file.name.replace('.pdf', ''),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        progress: 10,
        status: 'uploading',
        statusMessage: 'Preparing PDF...',
      });

      // Create a placeholder note immediately with special indicator
      const placeholderNote = await supabaseNoteStorage.createNote({
        title: `📄 ${file.name.replace('.pdf', '')}`,
        content: '⏳ Uploading PDF... Please wait while we process your document.',
        type: 'pdf',
        tags: ['pdf', 'uploading'],
        summary: `Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      });

      // Navigate to home screen immediately
      router.push('/(tabs)');

      // Update progress
      setUploadingPDF(prev => prev ? { ...prev, progress: 30, statusMessage: 'Uploading to cloud...' } : null);
      
      const uploadedPDFUrl = await pdfStorage.uploadPDFFile(
        file,
        user.id,
        placeholderNote.id
      );

      // Process PDF with AI
      setUploadingPDF(prev => prev ? { ...prev, progress: 50, status: 'processing', statusMessage: 'Processing with AI...' } : null);
      
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
      setUploadingPDF(prev => prev ? { ...prev, progress: 85, statusMessage: 'Saving...' } : null);

      // Update note with AI-processed content
      await supabaseNoteStorage.updateNote(placeholderNote.id, {
        title: aiTitle,
        content: extractedText || `PDF uploaded!\n\n${file.name}\nText extraction failed.`,
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
        statusMessage: 'Upload failed. Please try again.' 
      } : null);
      
      setTimeout(() => {
        setUploadingPDF(null);
      }, 3000);
    }
  }, [user, setUploadingPDF]);

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

      {/* Logo/Brand */}
      <View style={styles.brand}>
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
            <ThemedText style={styles.createButtonText}>New Note</ThemedText>
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
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => handleCreateOption('create')}
                >
                  <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                    <Ionicons name="document-text" size={18} color="#6A5ACD" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>Create Text Note</div>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>Rich text with formatting</div>
                  </div>
                </div>
                
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => handleCreateOption('create-audio')}
                >
                  <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                    <Ionicons name="mic" size={18} color="#6A5ACD" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>Create Audio Note</div>
                    <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>Voice recording & transcription</div>
                  </div>
                </div>
                
                {/* PDF Upload Option - Feature Flag Protected */}
                {isFeatureEnabled('pdf_upload') && (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    onClick={handlePDFUploadClick}
                  >
                    <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px' }}>
                      <Ionicons name="document" size={18} color="#6A5ACD" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333333', marginBottom: '2px' }}>Upload PDF</div>
                      <div style={{ fontSize: '12px', color: '#666666', fontWeight: '400' }}>Extract text from PDF documents</div>
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
          <ThemedText style={styles.bottomLabel}>Search</ThemedText>
          <ThemedText style={styles.shortcut}>⌘K</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={handleWebSettings}>
          <Ionicons name="settings" size={20} color={iconColor} />
          <ThemedText style={styles.bottomLabel}>Settings</ThemedText>
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
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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