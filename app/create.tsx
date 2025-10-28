import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { CreateNoteHeader } from '../components/create/CreateNoteHeader';
import { NoteTitleInput } from '../components/create/NoteTitleInput';
import { NoteContentEditor } from '../components/create/NoteContentEditor';
import { NoteTagsInput } from '../components/create/NoteTagsInput';
import { RichTextEditor } from '../components/RichTextEditor';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
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

// Memoize the TextInput to prevent re-renders
const MemoizedTextInput = React.memo(({ style, value, onChangeText, ...props }: any) => {
  return <TextInput style={style} value={value} onChangeText={onChangeText} {...props} />;
});

export default function CreateNoteScreen() {
  // Get URL parameters
  const params = useLocalSearchParams<{ noteId?: string; id?: string }>();
  
  // State management
  const [noteId, setNoteId] = useState<string | undefined>(params.noteId || params.id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentFormat, setContentFormat] = useState<'plain' | 'html'>('plain');
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
  const hasUserMadeChangesRef = useRef(false);
  const originalNoteDataRef = useRef<{ title: string; content: string; contentHtml: string; tags: string[] } | null>(null);
  
  // Refs for TextInput to track cursor position
  const contentInputRef = useRef<TextInput>(null);
  const titleInputRef = useRef<TextInput>(null);
  
  // Authentication and data hooks
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || '';
  const isAuthenticated = !!user?.id && !authLoading;
  
  const { notes } = useNotes(userId);
  
  // Feature flags
  const { isFeatureEnabled } = useFeatureFlags();
  const isRichTextEnabled = isFeatureEnabled('rich_text_editor');
  
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
  const borderThemeColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'border');
  
  // Memoize input styles to prevent re-renders
  const titleInputStyle = useMemo(() => [
    styles.titleInput, 
    { backgroundColor: inputBg, color: inputText, borderColor }
  ], [inputBg, inputText, borderColor]);
  
  const contentInputStyle = useMemo(() => [
    styles.contentInput, 
    { backgroundColor: inputBg, color: inputText, borderColor }
  ], [inputBg, inputText, borderColor]);
  
  const tagInputStyle = useMemo(() => [
    styles.tagInput, 
    { backgroundColor: inputBg, color: inputText, borderColor }
  ], [inputBg, inputText, borderColor]);

  // Computed values
  const isEditMode = noteId && !noteId.startsWith('temp_');
  const hasContent = title.trim() || content.trim() || contentHtml.trim();
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
        contentHtml: contentHtml.trim() || undefined,
        contentFormat: contentFormat,
        tags,
      };

      console.log('🔍 Saving note with data:', {
        contentFormat,
        hasContentHtml: !!contentHtml,
        contentHtmlLength: contentHtml?.length,
        contentHtmlPreview: contentHtml?.substring(0, 100),
        contentPreview: content?.substring(0, 100)
      });

        await performManualSave(noteData);
      
      // Navigate back after successful save
      setTimeout(() => {
        router.back();
      }, 100);
    } catch (error) {
      console.error('Manual save failed:', error);
      Alert.alert('Save Failed', 'There was an error saving your note. Please try again.');
    }
  }, [hasContent, isAuthenticated, performManualSave, noteId, title, content, contentHtml, contentFormat, tags]);

  const handleDiscard = useCallback(() => {
    const goBack = () => {
      console.log('Navigating back from edit/create page');
      try {
        // Try to go back first
        if (router.canGoBack()) {
          console.log('Can go back, calling router.back()');
          router.back();
        } else {
          console.log('Cannot go back, navigating to home');
          // If there's no history, navigate to home
          router.push('/(tabs)');
        }
      } catch (error) {
        console.error('Error navigating back:', error);
        // Fallback to home
        router.push('/(tabs)');
      }
    };

    // Check if user actually made changes
    const userMadeChanges = hasUserMadeChangesRef.current;

    console.log('Handle discard - hasContent:', hasContent, 'userMadeChanges:', userMadeChanges);

    // On web, use confirm dialog instead of Alert.alert
    if (Platform.OS === 'web') {
      if (userMadeChanges) {
        const shouldDiscard = window.confirm('Are you sure you want to discard your changes?');
        if (shouldDiscard) {
          goBack();
        }
      } else {
        goBack();
      }
    } else {
      // Use native Alert for mobile
      if (userMadeChanges) {
        Alert.alert(
          'Discard Changes',
          'Are you sure you want to discard your changes?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: goBack }
          ]
        );
      } else {
        goBack();
      }
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
  
  // Track if we're currently typing to prevent auto-save from interfering
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize onChangeText handlers
  const handleTitleChange = useCallback((text: string) => {
    isTypingRef.current = true;
    
    // Use startTransition to make state update non-blocking and prevent cursor issues
    startTransition(() => {
      setTitle(text);
    });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing to false after 500ms of no typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
  }, []);
  
  const handleContentChange = useCallback((text: string) => {
    isTypingRef.current = true;
    
    // Use startTransition to make state update non-blocking and prevent cursor issues
    startTransition(() => {
      setContent(text);
    });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing to false after 500ms of no typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
  }, []);
  
  const handleNewTagChange = useCallback((text: string) => {
    setNewTag(text);
  }, []);

  const handleConflictResolve = useCallback((resolution: any) => {
    setShowConflictModal(false);
    setConflictData(null);
    
    if (resolution.strategy === 'remote' || resolution.strategy === 'merged') {
      if (resolution.data.title !== undefined) setTitle(resolution.data.title);
      if (resolution.data.content !== undefined) setContent(resolution.data.content);
      if (resolution.data.contentHtml !== undefined) setContentHtml(resolution.data.contentHtml);
      if (resolution.data.contentFormat !== undefined) setContentFormat(resolution.data.contentFormat);
      if (resolution.data.tags !== undefined) setTags(resolution.data.tags);
    }
  }, []);

  // Track user changes
  useEffect(() => {
    if (!originalNoteDataRef.current || isInitialLoadRef.current) {
      hasUserMadeChangesRef.current = false;
      return;
    }
    
    const hasChanges = 
      title.trim() !== originalNoteDataRef.current.title ||
      content.trim() !== originalNoteDataRef.current.content ||
      contentHtml.trim() !== originalNoteDataRef.current.contentHtml ||
      JSON.stringify(tags) !== JSON.stringify(originalNoteDataRef.current.tags);
    
    hasUserMadeChangesRef.current = hasChanges;
    
    if (hasChanges) {
      console.log('User made changes detected');
    } else {
      console.log('No changes detected');
    }
  }, [title, content, contentHtml, tags]);

  // Auto-save effect with debouncing
  useEffect(() => {
    // Skip auto-save if:
    // 1. Not authenticated
    // 2. No content
    // 3. Initial load (still loading data)
    // 4. User is currently typing
    // 5. For existing notes: user hasn't made any changes from original data
    const isNewNote = !noteId || noteId.startsWith('temp_') || !originalNoteDataRef.current;
    const shouldSkipAutoSave = !isAuthenticated || !hasContent || !scheduleAutoSave || isInitialLoadRef.current || isTypingRef.current || (!isNewNote && !hasUserMadeChangesRef.current);
    
    if (shouldSkipAutoSave) {
      return;
    }

    console.log('Auto-save triggered - user made changes');

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
          contentHtml: contentHtml.trim() || undefined,
          contentFormat: contentFormat,
          tags,
        };

        await scheduleAutoSave(noteData);
        
        // After successful save, update the original data reference
        // This prevents the discard prompt from showing when there are no unsaved changes
        if (!noteId || noteId.startsWith('temp_')) {
          // For new notes, just clear the changes flag
          hasUserMadeChangesRef.current = false;
          console.log('Auto-save completed - changes saved, resetting change tracking');
        } else {
          // For existing notes, update the original data to match current state
          originalNoteDataRef.current = {
            title: title.trim(),
            content: content.trim(),
            contentHtml: contentHtml.trim(),
            tags: [...tags],
          };
          hasUserMadeChangesRef.current = false;
          console.log('Auto-save completed - changes saved, resetting change tracking');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, contentHtml, contentFormat, tags, isAuthenticated, hasContent, noteId, scheduleAutoSave]);

  // Load existing note data
  useEffect(() => {
    if (isAuthenticated && noteId && !noteId.startsWith('temp_')) {
      const existingNote = notes.find(n => n.id === noteId);
      if (existingNote && (isInitialLoadRef.current || prevNoteIdRef.current !== noteId)) {
        console.log('🔍 Loading note data:', { 
          noteId, 
          hasTitle: !!existingNote.title,
          hasContent: !!existingNote.content,
          hasContentHtml: !!existingNote.contentHtml,
          contentFormat: existingNote.contentFormat
        });
        setTitle(existingNote.title || '');
        setContent(existingNote.content || '');
        setContentHtml(existingNote.contentHtml || '');
        setContentFormat(existingNote.contentFormat || 'plain');
        setTags(existingNote.tags || []);
        
        // Store original data to detect changes
        originalNoteDataRef.current = {
          title: existingNote.title || '',
          content: existingNote.content || '',
          contentHtml: existingNote.contentHtml || '',
          tags: existingNote.tags || []
        };
        
        hasUserMadeChangesRef.current = false;
        isInitialLoadRef.current = false;
        prevNoteIdRef.current = noteId;
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
          <CreateNoteHeader
            isEditMode={isEditMode}
            isRichTextEnabled={isRichTextEnabled}
            isSaveDisabled={isSaveDisabled}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSaved={lastSaved}
            error={error}
            handleSave={handleSave}
            handleDiscard={handleDiscard}
            renderSaveStatus={renderSaveStatus}
            inputText={inputText}
          />

          <ScrollView style={styles.webContent} showsVerticalScrollIndicator={false}>
            {isAuthenticated ? (
              <>
                <NoteTitleInput
                  title={title}
                  setTitle={setTitle}
                  inputBg={inputBg}
                  inputText={inputText}
                  borderColor={borderColor}
                  placeholderColor={placeholderColor}
                />

                <NoteContentEditor
                  isRichTextEnabled={isRichTextEnabled}
                  content={content}
                  setContent={setContent}
                  setContentHtml={setContentHtml}
                  setContentFormat={setContentFormat}
                  inputBg={inputBg}
                  inputText={inputText}
                  borderColor={borderColor}
                  placeholderColor={placeholderColor}
                />

                <NoteTagsInput
                  tags={tags}
                  newTag={newTag}
                  setNewTag={setNewTag}
                  addTag={addTag}
                  removeTag={removeTag}
                  inputBg={inputBg}
                  inputText={inputText}
                  borderColor={borderColor}
                  placeholderColor={placeholderColor}
                />
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
          <View style={[styles.header, { backgroundColor: safeAreaBg, borderBottomColor: borderThemeColor }]}>
            {isAuthenticated && (
              <TouchableOpacity 
                onPress={handleDiscard} 
                style={[styles.backButton, isSaving && { opacity: 0.5 }]} 
                disabled={isSaving}
              >
                <Ionicons name="arrow-back" size={24} color={isSaving ? '#999' : iconColor} />
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
            style={[styles.content, { backgroundColor: safeAreaBg }]} 
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            keyboardDismissMode="none"
          >
            {isAuthenticated ? (
              <>
                <MemoizedTextInput
                  style={titleInputStyle}
                  placeholder="Note title..."
                  placeholderTextColor={placeholderColor}
                  value={title}
                  onChangeText={handleTitleChange}
                  multiline
                  maxLength={200}
                  editable={!isSaving}
                />

                {isRichTextEnabled ? (
                  <View style={{ marginHorizontal: 20, marginTop: 12, marginBottom: 24 }}>
                    <RichTextEditor
                      value={contentHtml || content}
                      onChange={(html, plainText) => {
                        console.log('🔍 RichTextEditor onChange:', { html: html?.substring(0, 100), plainText: plainText?.substring(0, 100), htmlLength: html?.length });
                        setContentHtml(html);
                        setContent(plainText);
                        setContentFormat(html ? 'html' : 'plain');
                        // Log after state update
                        setTimeout(() => {
                          console.log('🔍 State after RichTextEditor onChange - contentHtml:', html?.substring(0, 50), 'contentFormat:', html ? 'html' : 'plain');
                        }, 0);
                      }}
                      placeholder="Start writing your note..."
                      style={{ minHeight: 400 }}
                    />
                  </View>
                ) : (
                  <MemoizedTextInput
                    style={contentInputStyle}
                    placeholder="Start writing your note..."
                    placeholderTextColor={placeholderColor}
                    value={content}
                    onChangeText={handleContentChange}
                    multiline
                    textAlignVertical="top"
                    editable={!isSaving}
                  />
                )}

                {/* Tags Section */}
                <View style={styles.tagsSection}>
                  <ThemedText style={styles.tagsTitle}>Tags</ThemedText>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={tagInputStyle}
                      placeholder="Add a tag..."
                      placeholderTextColor={placeholderColor}
                      value={newTag}
                      onChangeText={handleNewTagChange}
                      onSubmitEditing={addTag}
                      returnKeyType="done"
                      autoCorrect={false}
                      textContentType="none"
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  saveStatus: {
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButtonTextDisabled: {
    color: '#CCCCCC',
  },
  content: {
    flex: 1,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    minHeight: 64,
    lineHeight: 28,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
    minHeight: 400,
    lineHeight: 24,
  },
  tagsSection: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingBottom: 40,
  },
  tagsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  addTagButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
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
  webHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  webRichTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  webRichTextBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
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
  // Rich Text Enhanced Styles
  webSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  richTextIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  richTextIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  richTextFeatures: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(106, 90, 205, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.1)',
  },
  richTextFeaturesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#6A5ACD',
  },
  richTextFeaturesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  richTextFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    borderRadius: 8,
  },
  richTextFeatureText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    color: '#6A5ACD',
  },
  richTextShortcuts: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 90, 205, 0.2)',
  },
  richTextShortcutsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: '#6A5ACD',
  },
  richTextShortcutsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  richTextShortcut: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6A5ACD',
    opacity: 0.8,
  },
  mobileRichTextNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  mobileRichTextNoteText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    color: '#FFA500',
  },
}); 