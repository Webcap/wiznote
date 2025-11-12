import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';
import { Note, NoteFormData } from '../types/Note';

interface FilterOptions {
  searchQuery: string;
  tags: string[];
  showArchived: boolean;
  showFavorites: boolean;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

export const useNotes = (userId: string, userEmail?: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const { showSnackbar } = useSnackbar();
  
  // Real-time sync subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);
  
  // Keep track of the last valid user ID/email to prevent race conditions
  const lastValidUserIdRef = useRef<string | null>(null);
  const lastValidUserEmailRef = useRef<string | null>(null);
  const clearUserIdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debug logging for mobile vs web differences
  const debugLogRef = useRef<{ count: number; lastLog: number }>({ count: 0, lastLog: 0 });
  
  // Check if userId is a valid authenticated user
  const isAuthenticatedUser = userId && userId !== '';
  
  const getPlainTextFromNote = useCallback((value: Note): string => {
    if (value.content && value.content.trim().length > 0) {
      return value.content;
    }

    if (value.contentHtml) {
      const withoutTags = value.contentHtml
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ');
      return withoutTags.trim();
    }

    return '';
  }, []);

  // Additional protection for mobile navigation issues
  const shouldUseFallback = !isAuthenticatedUser && lastValidUserIdRef.current;
  
  // Debug logging for authentication state
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastLog = now - debugLogRef.current.lastLog;
    
    // Throttle debug logging to avoid spam
    if (timeSinceLastLog > 1000) {
      debugLogRef.current.count++;
      debugLogRef.current.lastLog = now;
      
      console.log(
        `useNotes [${Platform.OS}] #${debugLogRef.current.count}: userId="${userId}", isAuthenticatedUser=${isAuthenticatedUser}, lastValidUserId="${lastValidUserIdRef.current}", lastValidUserEmail="${lastValidUserEmailRef.current}"`
      );
    }
    
    if (userId && userId !== '') {
      console.log('useNotes: Using authenticated user ID:', userId);
      lastValidUserIdRef.current = userId;
      if (userEmail && userEmail !== '') {
        lastValidUserEmailRef.current = userEmail.trim().toLowerCase();
      }
      
      // Clear any existing timeout since we have a valid user ID
      if (clearUserIdTimeoutRef.current) {
        clearTimeout(clearUserIdTimeoutRef.current);
        clearUserIdTimeoutRef.current = null;
      }
    } else if (!userId || userId === '') {
      console.log('useNotes: Empty user ID provided, this usually means auth is still loading');
      // Don't clear the last valid user ID immediately to prevent race conditions
      // But set a timeout to clear it after 5 seconds if no valid user ID comes back
      if (lastValidUserIdRef.current && !clearUserIdTimeoutRef.current) {
        clearUserIdTimeoutRef.current = setTimeout(() => {
          console.log('useNotes: Clearing last valid user ID after timeout');
          lastValidUserIdRef.current = null;
          lastValidUserEmailRef.current = null;
          clearUserIdTimeoutRef.current = null;
        }, 5000);
      }
    } else {
      console.warn('useNotes: No user ID provided, this should not happen');
    }
  }, [userId, userEmail, isAuthenticatedUser]);
  
      // Additional check for Supabase Auth state
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  // Initialize Supabase note storage
  useEffect(() => {
    // Use the current userId if available, otherwise fall back to the last valid user ID
    const effectiveUserId = userId && userId !== '' ? userId : lastValidUserIdRef.current;
    const effectiveEmailCandidate =
      userEmail && userEmail !== ''
        ? userEmail.trim().toLowerCase()
        : lastValidUserEmailRef.current;
    const effectiveEmail = effectiveEmailCandidate ?? null;
    
    if (effectiveUserId) {
      console.log('useNotes: Setting current user for SupabaseNoteStorage:', effectiveUserId);
      supabaseNoteStorage.setCurrentUser(effectiveUserId, effectiveEmail);
      supabaseNoteStorage.setErrorHandler((error, type) => {
        console.error('SupabaseNoteStorage error:', error, type);
        if (Platform.OS === 'web') {
          showSnackbar(error, type);
        }
      });
      supabaseNoteStorage.setNotesChangeHandler((notes) => {
        setNotes(notes);
        setSyncStatus('synced');
      });
    } else {
      console.log('useNotes: No valid user ID available, skipping SupabaseNoteStorage initialization');
    }
  }, [userId, userEmail, showSnackbar]);

  // Load notes function that can be called manually
  const loadNotes = useCallback(async () => {
    // Use the current userId if available, otherwise fall back to the last valid user ID
    const effectiveUserId = userId && userId !== '' ? userId : lastValidUserIdRef.current;
    
    // Don't try to load notes if no valid user ID is available
    if (!effectiveUserId) {
      console.log('useNotes: Skipping note load - no valid user ID available');
      setLoading(false);
      setNotes([]);
      setError(null);
      setSyncStatus('local');
      return;
    }
    
    // Additional protection for mobile navigation issues
    if (shouldUseFallback) {
      console.log('useNotes: Using fallback user ID for mobile navigation protection:', effectiveUserId);
    }

    setLoading(true);
    setError(null);
    setSyncStatus('local');

    try {
      console.log('useNotes: Loading notes for user:', effectiveUserId);
      
      // Add timeout to prevent blocking - longer for mobile
      const timeoutMs = Platform.OS === 'web' ? 15000 : 30000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Note loading timeout')), timeoutMs);
      });
      
      // Load notes from Supabase with timeout
      const notes = await Promise.race([
        supabaseNoteStorage.getNotes(),
        timeoutPromise
      ]) as Note[];
      
      console.log('useNotes: Loaded notes:', notes.length);
      console.log('useNotes: Notes details:', notes.map((n: Note) => ({ id: n.id, title: n.title, isArchived: n.isArchived })));
      setNotes(notes);
      setLoading(false);
      setSyncStatus('synced');
    } catch (error) {
      console.error('useNotes: Error loading notes:', error);
      setError('Failed to load notes');
      setLoading(false);
      setSyncStatus('error');
    }
  }, [userId, shouldUseFallback]);

  // Set up real-time sync subscription
  const setupRealtimeSync = useCallback(() => {
    // Use the current userId if available, otherwise fall back to the last valid user ID
    const effectiveUserId = userId && userId !== '' ? userId : lastValidUserIdRef.current;
    
    if (!effectiveUserId || isSubscribedRef.current) {
      return;
    }

    try {
      console.log('useNotes: Setting up real-time sync for user:', effectiveUserId);
      setSyncStatus('syncing');
      
      // Clean up any existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Supabase handles real-time updates automatically through the subscription
      // set up in the initialization effect
      console.log('useNotes: Real-time sync is handled automatically by Supabase');
      setIsRealtimeActive(true);
      setSyncStatus('synced');
      
      // No need for manual subscription since Supabase handles it automatically
      isSubscribedRef.current = true;
      console.log('useNotes: Real-time sync subscription established');
      
    } catch (error) {
      console.error('useNotes: Error setting up real-time sync:', error);
      setSyncStatus('error');
      // Fall back to manual loading - call loadNotes directly instead of depending on it
      if (userId && userId !== '') {
        supabaseNoteStorage.getNotes().then(notes => {
          setNotes(notes);
          setLoading(false);
          setSyncStatus('synced');
        }).catch(err => {
          console.error('useNotes: Error in fallback note loading:', err);
          setError('Failed to load notes');
          setLoading(false);
          setSyncStatus('error');
        });
      }
    }
  }, [userId, showSnackbar]);

  // Clean up subscription on unmount or userId change
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log('useNotes: Cleaning up real-time sync subscription');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isSubscribedRef.current = false;
        setIsRealtimeActive(false);
      }
      
      // Clear timeout if it exists
      if (clearUserIdTimeoutRef.current) {
        clearTimeout(clearUserIdTimeoutRef.current);
        clearUserIdTimeoutRef.current = null;
      }
      
      // Cleanup SupabaseNoteStorage when unmounting or changing users
      if (userId) {
        console.log('useNotes: Cleaning up SupabaseNoteStorage for user:', userId);
        supabaseNoteStorage.cleanup();
      }
    };
  }, [userId]);

  // Load notes on mount with offline-first approach
  useEffect(() => {
    loadNotes();
    
    // Set up real-time sync after initial load
    if (userId && userId !== '') {
      // Small delay to ensure initial load completes first
      const timer = setTimeout(() => {
        setupRealtimeSync();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loadNotes, setupRealtimeSync, userId]);

  // Refresh notes function for manual refresh
  const refreshNotes = useCallback(async () => {
    console.log('useNotes: Manual refresh triggered');
    await loadNotes();
  }, [loadNotes]);

  // Create a new note
  const createNote = useCallback(async (noteData: NoteFormData): Promise<Note> => {
    // Don't try to create note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot create note: User not authenticated');
    }

    try {
      setError(null);
      console.log('useNotes: Creating note with data:', noteData);
      const newNote = await supabaseNoteStorage.createNote(noteData);
      console.log('useNotes: Note created successfully:', newNote);
      
      // Update local state immediately
      setNotes(prevNotes => {
        const updatedNotes = [newNote, ...prevNotes];
        console.log('useNotes: Updated notes array, new length:', updatedNotes.length);
        return updatedNotes;
      });
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note created successfully', 'success', 3000);
      }
      
      return newNote;
    } catch (err) {
      console.error('useNotes: Error creating note:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar]);

  // Update an existing note
  const updateNote = useCallback(async (id: string, updates: Partial<NoteFormData>): Promise<Note | null> => {
    // Don't try to update note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot update note: User not authenticated');
    }

    try {
      setError(null);
      const updatedNote = await supabaseNoteStorage.updateNote(id, updates);
      
      // Update local state immediately
      if (updatedNote) {
        setNotes(prevNotes => 
          prevNotes.map(note => note.id === id ? updatedNote : note)
        );
      }
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note updated successfully', 'success', 3000);
      }
      
      return updatedNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar]);

  // Delete a note
  const deleteNote = useCallback(async (id: string): Promise<void> => {
    // Don't try to delete note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot delete note: User not authenticated');
    }

    try {
      setError(null);
      await supabaseNoteStorage.deleteNote(id);
      
      // Update local state immediately
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note deleted successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar]);

  // Toggle pin status
  const togglePin = useCallback(async (id: string): Promise<void> => {
    // Don't try to toggle pin if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot toggle pin: User not authenticated');
    }

    try {
      setError(null);
      const note = notes.find(n => n.id === id);
      if (note) {
        await supabaseNoteStorage.updateNote(id, { isPinned: !note.isPinned });
        
        // Update local state immediately
        setNotes(prevNotes => 
          prevNotes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n)
        );
      }
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note pin status updated', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle pin';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar, notes]);

  // Toggle archive status
  const toggleArchive = useCallback(async (id: string): Promise<void> => {
    // Don't try to toggle archive if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot toggle archive: User not authenticated');
    }

    try {
      setError(null);
      const note = notes.find(n => n.id === id);
      if (note) {
        await supabaseNoteStorage.updateNote(id, { isArchived: !note.isArchived });
        
        // Update local state immediately
        setNotes(prevNotes => 
          prevNotes.map(n => n.id === id ? { ...n, isArchived: !n.isArchived } : n)
        );
      }
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note archive status updated', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle archive';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar, notes]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    // Don't try to toggle favorite if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot toggle favorite: User not authenticated');
    }

    try {
      setError(null);
      const note = notes.find(n => n.id === id);
      if (note) {
        await supabaseNoteStorage.updateNote(id, { isFavorite: !note.isFavorite });
        
        // Update local state immediately
        setNotes(prevNotes => 
          prevNotes.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n)
        );
      }
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        const message = note?.isFavorite ? 'Removed from favorites' : 'Added to favorites';
        showSnackbar(message, 'success', 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle favorite';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [userId, showSnackbar, notes]);

  // Search notes using Supabase
  const searchNotes = useCallback(async (query: string): Promise<Note[]> => {
    try {
      setError(null);
      
      // Search using Supabase
      const searchResults = await supabaseNoteStorage.searchNotes(query);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search notes';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Get all tags using Supabase
  const getAllTags = useCallback(async (): Promise<string[]> => {
    try {
      setError(null);
      
      // Get tags from Supabase
      const allTags = await supabaseNoteStorage.getAllTags();
      return allTags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get tags';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Save audio file to note (placeholder for now)
  const saveAudioFile = useCallback(async (noteId: string, audioFile: any): Promise<void> => {
    try {
      setError(null);
      // TODO: Implement audio file saving with offline support
      console.log('Audio file saving not yet implemented with offline support');
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Audio file saved successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save audio file';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Delete audio file from note (placeholder for now)
  const deleteAudioFile = useCallback(async (noteId: string, audioFileId: string): Promise<void> => {
    try {
      setError(null);
      // TODO: Implement audio file deletion with offline support
      console.log('Audio file deletion not yet implemented with offline support');
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Audio file deleted successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete audio file';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Update transcription (placeholder for now)
  const updateTranscription = useCallback(async (audioFileId: string, transcription: string): Promise<void> => {
    try {
      setError(null);
      // TODO: Implement transcription updating with offline support
      console.log('Transcription updating not yet implemented with offline support');
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Transcription updated successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transcription';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Create sample data (placeholder for now)
  const createSampleData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      // TODO: Implement sample data creation with offline support
      console.log('Sample data creation not yet implemented with offline support');
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Sample data created successfully', 'success', 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sample data';
      setError(errorMessage);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 6000);
      }
      
      throw err;
    }
  }, [showSnackbar]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Filter and sort notes
  const getFilteredNotes = useCallback((options: FilterOptions): Note[] => {
    let filteredNotes = [...notes];

    // Filter by search query
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      filteredNotes = filteredNotes.filter(note => {
        const plainText = getPlainTextFromNote(note).toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          plainText.includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        );
      });
    }

    // Filter by tags
    if (options.tags.length > 0) {
      filteredNotes = filteredNotes.filter(note =>
        options.tags.some(tag => note.tags.includes(tag))
      );
    }

    // Filter by archive status
    if (!options.showArchived) {
      filteredNotes = filteredNotes.filter(note => !note.isArchived);
    }

    // Filter by favorite status
    if (options.showFavorites) {
      filteredNotes = filteredNotes.filter(note => note.isFavorite);
    }

    // Sort notes
    filteredNotes.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (options.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'updatedAt':
        default:
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
      }

      if (options.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredNotes;
  }, [notes, getPlainTextFromNote]);

  return {
    notes,
    loading,
    error,
    syncStatus,
    isRealtimeActive,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleArchive,
    toggleFavorite,
    searchNotes,
    getAllTags,
    saveAudioFile,
    deleteAudioFile,
    updateTranscription,
    createSampleData,
    clearError,
    getFilteredNotes,
    refreshNotes,
  };
}; 