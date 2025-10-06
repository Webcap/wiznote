import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';
import { EnhancedSaveStatus } from '../components/EnhancedSaveStatus';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { NOTEZ_SHORTCUTS, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNotes } from '../hooks/useNotes';
import { useSaveManager } from '../hooks/useSaveManager';
import { useThemeColor } from '../hooks/useThemeColor';

// Types
import { NoteFormData } from '../types/Note';

// Error Boundary Component
const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Error in CreateNoteScreen:', error);
    return <>{fallback}</>;
  }
};

export default function CreateNoteScreen() {
  // Get URL parameters
  const params = useLocalSearchParams<{ noteId?: string; id?: string }>();
  
  // State management
  const [noteId, setNoteId] = useState<string | undefined>(params.noteId || params.id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    localData: any;
    remoteData: any;
    conflicts: string[];
  } | null>(null);

  // Refs for optimization
  const prevNoteIdRef = useRef<string | undefined>(noteId);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Authentication and data hooks
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || '';
  const isAuthenticated = !!user?.id && !authLoading;
  
  const { notes } = useNotes(userId);
  
  // Generate temporary ID for new notes
  const currentNoteId = useMemo(() => {
    if (!isAuthenticated) return undefined;
    return noteId || `temp_${Date.now()}`;
  }, [noteId, isAuthenticated]);

  // Save manager hook
  const {
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    error,
    scheduleAutoSave,
    performManualSave,
    clearError,
  } = useSaveManager(isAuthenticated ? userId : null, {
    noteId: currentNoteId,
    onSaveSuccess: useCallback((savedNoteId: string) => {
      if (isAuthenticated && (noteId?.startsWith('temp_') || !noteId)) {
        setNoteId(savedNoteId);
        if (Platform.OS === 'web') {
          router.replace(`/create?noteId=${savedNoteId}`);
        }
      }
    }, [isAuthenticated, noteId]),
    onSaveError: useCallback((errorMessage: string) => {
      if (isAuthenticated) {
        Alert.alert('Save Error', errorMessage);
      }
    }, [isAuthenticated]),
  });

  // Theme colors
  const iconColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const inputText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'background');
  const tagBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const tagText = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({}, 'textMuted');
  const safeAreaBg = useThemeColor({}, 'background');

  // Computed values
  const isEditMode = noteId && !noteId.startsWith('temp_');
  const hasContent = title.trim() || content.trim();
  const isSaveDisabled = isSaving || authLoading || !isAuthenticated || !hasContent || !performManualSave;

  // Handler functions
  const handleSave = useCallback(async () => {
    if (!hasContent) {
      Alert.alert('Error', 'Please enter a title or content');
      return;
    }
    
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required', 
        'Please sign in to save notes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (!performManualSave) {
      Alert.alert('Error', 'Save function is not available. Please try again.');
      return;
    }

    try {
      const noteData: NoteFormData = {
        id: noteId?.startsWith('temp_') ? undefined : noteId,
        title: title.trim(),
        content: content.trim(),
        tags,
      };

        await performManualSave(noteData);
      
      // Navigate back after successful save
      setTimeout(() => {
        router.back();
      }, 100);
    } catch (error) {
      console.error('Manual save failed:', error);
      Alert.alert('Save Failed', 'There was an error saving your note. Please try again.');
    }
  }, [hasContent, isAuthenticated, performManualSave, noteId, title, content, tags]);

  const handleDiscard = useCallback(() => {
    if (hasContent) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  }, [hasContent]);

  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleConflictResolve = useCallback((resolution: any) => {
    setShowConflictModal(false);
    setConflictData(null);
    
    if (resolution.strategy === 'remote' || resolution.strategy === 'merged') {
      if (resolution.data.title !== undefined) setTitle(resolution.data.title);
      if (resolution.data.content !== undefined) setContent(resolution.data.content);
      if (resolution.data.tags !== undefined) setTags(resolution.data.tags);
    }
  }, []);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!isAuthenticated || !hasContent || !scheduleAutoSave || isInitialLoadRef.current) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const noteData: NoteFormData = {
          id: noteId?.startsWith('temp_') ? undefined : noteId,
          title: title.trim(),
          content: content.trim(),
          tags,
        };

        await scheduleAutoSave(noteData);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, tags, isAuthenticated, hasContent, noteId, scheduleAutoSave]);

  // Load existing note data
  useEffect(() => {
    if (isAuthenticated && noteId && !noteId.startsWith('temp_')) {
      const existingNote = notes.find(n => n.id === noteId);
      if (existingNote && isInitialLoadRef.current) {
        setTitle(existingNote.title || '');
        setContent(existingNote.content || '');
        setTags(existingNote.tags || []);
        isInitialLoadRef.current = false;
      }
    }
  }, [noteId, notes, isAuthenticated]);

  // Update noteId from URL parameters
  useEffect(() => {
    const newNoteId = params.noteId || params.id;
    if (newNoteId && newNoteId !== prevNoteIdRef.current) {
      setNoteId(newNoteId);
      prevNoteIdRef.current = newNoteId;
      isInitialLoadRef.current = true;
    }
  }, [params.noteId, params.id]);

  // Clear error when user starts typing
  useEffect(() => {
    if (error && clearError && hasContent) {
      const timeoutId = setTimeout(() => {
        clearError();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [error, clearError, hasContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    isAuthenticated ? [
      {
        ...NOTEZ_SHORTCUTS.SAVE,
        action: () => {
          if (!isSaveDisabled) {
            handleSave();
          }
        },
      },
      {
        key: 'Escape',
        action: handleDiscard,
        description: 'Discard changes',
      },
    ] : []
  );

  // Render save status component
  const renderSaveStatus = useCallback(() => {
    if (!isAuthenticated) return null;

    return (
      <View style={styles.saveStatus}>
        <EnhancedSaveStatus
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSaved={lastSaved}
          error={error}
          pendingOperations={0}
          onRetry={() => {
            handleSave();
          }}
        />
      </View>
    );
  }, [isAuthenticated, isSaving, hasUnsavedChanges, lastSaved, error, handleSave, performManualSave]);

  // Loading state
  if (authLoading) {
    return (
      <ErrorBoundary fallback={<ThemedView style={styles.container}><LoadingSpinner /></ThemedView>}>
      <ThemedView style={styles.container}>
        <LoadingSpinner />
      </ThemedView>
      </ErrorBoundary>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <ErrorBoundary fallback={<ThemedView style={styles.container}><LoadingSpinner /></ThemedView>}>
      <WebLayout sidebar={<UserSidebar />}>
        <ThemedView style={styles.webContainer}>
          {/* Header */}
          <ThemedView style={styles.webHeader}>
            <View style={styles.webHeaderLeft}>
              <TouchableOpacity 
                style={styles.webBackButton}
                onPress={handleDiscard}
              >
                <Ionicons name="arrow-back" size={20} color={inputText} />
                <ThemedText style={styles.webBackText}>Back</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.webHeaderCenter}>
              <ThemedText style={styles.webHeaderTitle}>
                  {isEditMode ? 'Edit Note' : 'Create a Note'}
              </ThemedText>
                {renderSaveStatus()}
            </View>

            <View style={styles.webHeaderRight}>
              <TouchableOpacity
                  style={[
                    styles.webSaveButton,
                    {
                  backgroundColor: isSaveDisabled ? '#9CA3AF' : '#6A5ACD',
                  opacity: isSaveDisabled ? 0.5 : 1
                    }
                  ]}
                onPress={handleSave}
                disabled={isSaveDisabled}
              >
                <ThemedText style={[styles.webSaveButtonText, { color: '#FFFFFF' }]}>
                  {isSaving ? 'Saving...' : 'Save Note'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Main Content */}
            <ScrollView style={styles.webContent} showsVerticalScrollIndicator={false}>
            {isAuthenticated ? (
              <>
                {/* Title Section */}
                <ThemedView style={styles.webSection}>
                  <View style={styles.webSectionHeader}>
                    <ThemedText style={styles.webSectionTitle}>Title</ThemedText>
                    <View style={styles.webSectionBadge}>
                      <Ionicons name="document-text" size={16} color="#6A5ACD" />
                      <ThemedText style={styles.webSectionBadgeText}>Required</ThemedText>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.webInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter a descriptive title for your note..."
                    placeholderTextColor={placeholderColor}
                    multiline
                    maxLength={200}
                  />
                </ThemedView>

                {/* Content Section */}
                <ThemedView style={styles.webSection}>
                  <View style={styles.webSectionHeader}>
                    <ThemedText style={styles.webSectionTitle}>Content</ThemedText>
                    <View style={styles.webSectionBadge}>
                      <Ionicons name="create" size={16} color="#6A5ACD" />
                      <ThemedText style={styles.webSectionBadgeText}>Required</ThemedText>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.webTextarea, { backgroundColor: inputBg, color: inputText, borderColor }]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Start writing your note content here..."
                    placeholderTextColor={placeholderColor}
                    multiline
                    textAlignVertical="top"
                  />
                </ThemedView>

                {/* Tags Section */}
                <ThemedView style={styles.webSection}>
                  <View style={styles.webSectionHeader}>
                    <ThemedText style={styles.webSectionTitle}>Tags</ThemedText>
                    <View style={styles.webSectionBadge}>
                      <Ionicons name="pricetag" size={16} color="#6A5ACD" />
                      <ThemedText style={styles.webSectionBadgeText}>Optional</ThemedText>
                    </View>
                  </View>
                  <View style={styles.webTagInputContainer}>
                    <TextInput
                      style={[styles.webTagInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
                      value={newTag}
                      onChangeText={setNewTag}
                      placeholder="Add a tag (press Enter to add)..."
                      placeholderTextColor={placeholderColor}
                      onSubmitEditing={addTag}
                    />
                    <TouchableOpacity 
                      style={[styles.webAddTagButton, { backgroundColor: '#6A5ACD' }]} 
                      onPress={addTag}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {tags.length > 0 && (
                    <View style={styles.webTagsContainer}>
                      {tags.map((tag, index) => (
                        <View key={index} style={[styles.webTag, { backgroundColor: '#6A5ACD' }]}>
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
              </>
            ) : (
              <View style={styles.authContainer}>
                <ThemedText style={styles.authTitle}>Authentication Required</ThemedText>
                <ThemedText style={styles.authMessage}>
                  Please sign in to create and save notes.
                </ThemedText>
                <TouchableOpacity
                  style={styles.authButton}
                  onPress={() => router.push('/login')}
                >
                  <ThemedText style={styles.authButtonText}>Sign In</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            </ScrollView>
        </ThemedView>
      </WebLayout>
      </ErrorBoundary>
    );
  }

  // Mobile layout
  return (
    <ErrorBoundary fallback={<ThemedView style={styles.container}><LoadingSpinner /></ThemedView>}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: safeAreaBg }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            {isAuthenticated && (
              <TouchableOpacity onPress={handleDiscard} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={iconColor} />
              </TouchableOpacity>
            )}
            
            {isAuthenticated && (
              <>
                <View style={styles.headerCenter}>
                  <ThemedText style={styles.headerTitle}>
                    {isEditMode ? 'Edit Note' : 'New Note'}
                  </ThemedText>
                  {renderSaveStatus()}
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaveDisabled}
                  style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
                >
                  <ThemedText style={[styles.saveButtonText, isSaveDisabled && styles.saveButtonTextDisabled]}>
                    Save
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {isAuthenticated ? (
              <>
                <TextInput
                  style={[styles.titleInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
                  placeholder="Note title..."
                  placeholderTextColor={placeholderColor}
                  value={title}
                  onChangeText={setTitle}
                  multiline
                  maxLength={200}
                />

                <TextInput
                  style={[styles.contentInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
                  placeholder="Start writing your note..."
                  placeholderTextColor={placeholderColor}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                />

                {/* Tags Section */}
                <View style={styles.tagsSection}>
                  <ThemedText style={styles.tagsTitle}>Tags</ThemedText>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={[styles.tagInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
                      placeholder="Add a tag..."
                      placeholderTextColor={placeholderColor}
                      value={newTag}
                      onChangeText={setNewTag}
                      onSubmitEditing={addTag}
                      returnKeyType="done"
                    />
                    <TouchableOpacity onPress={addTag} style={[styles.addTagButton, { backgroundColor: tagBg }]}>
                      <Ionicons name="add" size={20} color={tagText} />
                    </TouchableOpacity>
                  </View>
                  
                  {tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {tags.map((tag, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.tag, { backgroundColor: tagBg }]}
                          onPress={() => removeTag(tag)}
                        >
                          <ThemedText style={[styles.tagText, { color: tagText }]}>{tag}</ThemedText>
                          <Ionicons name="close" size={16} color={tagText} style={styles.tagRemoveIcon} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.authContainer}>
                <ThemedText style={styles.authTitle}>Authentication Required</ThemedText>
                <ThemedText style={styles.authMessage}>
                  Please sign in to create and save notes.
                </ThemedText>
                <TouchableOpacity
                  style={styles.authButton}
                  onPress={() => router.push('/login')}
                >
                  <ThemedText style={styles.authButtonText}>Sign In</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        
        {/* Conflict Resolution Modal */}
        <ConflictResolutionModal
          visible={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onResolve={handleConflictResolve}
          localData={conflictData?.localData || {}}
          remoteData={conflictData?.remoteData || {}}
          conflicts={conflictData?.conflicts || []}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveStatus: {
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#CCCCCC',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
    minHeight: 60,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 200,
  },
  tagsSection: {
    marginTop: 8,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addTagButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagRemoveIcon: {
    marginLeft: 6,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  authButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Web-specific styles
  webContainer: {
    flex: 1,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webHeaderLeft: {
    flex: 1,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
  },
  webBackText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderCenter: {
    flex: 2,
    alignItems: 'center',
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  webHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  webSaveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webContent: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  webSection: {
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  webSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  webSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webSectionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#6A5ACD',
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  webTextarea: {
    minHeight: 300,
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
    marginBottom: 16,
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
  },
  webTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    marginLeft: 8,
    padding: 2,
  },
  webTagRemoveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 