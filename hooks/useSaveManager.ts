import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { saveManagerService, SaveStatus } from '../services/SaveManagerService';
import { NoteFormData } from '../types/Note';

export interface UseSaveManagerOptions {
  noteId?: string;
  onSaveSuccess?: (noteId: string) => void;
  onSaveError?: (error: string) => void;
  autoSaveDelay?: number; // in milliseconds, default 2000
}

export interface UseSaveManagerReturn {
  // State
  saveStatus: SaveStatus;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  error: string | null;
  
  // Actions
  scheduleAutoSave: (data: NoteFormData) => Promise<void>;
  performManualSave: (data: NoteFormData) => Promise<void>;
  cancelAutoSave: () => void;
  clearError: () => void;
  
  // Utilities
  hasPendingChanges: (noteId: string) => boolean;
}

export const useSaveManager = (
  userId: string | null,
  options: UseSaveManagerOptions = {}
): UseSaveManagerReturn => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
    pendingOperations: 0,
  });

  const { showSnackbar } = useSnackbar();
  const { noteId, onSaveSuccess, onSaveError, autoSaveDelay = 2000 } = options;
  const lastSavedDataRef = useRef<NoteFormData | null>(null);

  // Set up save manager with current user
  useEffect(() => {
    // Only set user if we have a valid userId (not empty string)
    if (userId && userId.trim() !== '') {
      saveManagerService.setCurrentUser(userId);
    } else {
      // Clear user if no valid userId
      saveManagerService.setCurrentUser(null);
    }
  }, [userId]);

  // Set up status change handler
  useEffect(() => {
    const handleStatusChange = (status: SaveStatus) => {
      setSaveStatus(status);
    };

    try {
      saveManagerService.setStatusChangeHandler(handleStatusChange);
    } catch (error) {
      console.error('Failed to set status change handler:', error);
    }

    return () => {
      try {
        saveManagerService.setStatusChangeHandler(() => {}); // Set empty handler instead of undefined
      } catch (error) {
        console.error('Failed to clear status change handler:', error);
      }
    };
  }, []);

  // Set up error handler
  useEffect(() => {
    const handleError = (error: string, operationId: string) => {
      console.error('SaveManager error:', error, 'Operation:', operationId);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(`Save failed: ${error}`, 'error', 6000);
      }
      
      // Call custom error handler if provided
      if (onSaveError) {
        onSaveError(error);
      }
    };

    try {
      saveManagerService.setErrorHandler(handleError);
    } catch (error) {
      console.error('Failed to set error handler:', error);
    }

    return () => {
      try {
        saveManagerService.setErrorHandler(() => {}); // Set empty handler instead of undefined
      } catch (error) {
        console.error('Failed to clear error handler:', error);
      }
    };
  }, [showSnackbar, onSaveError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending operations for this note
      if (noteId) {
        saveManagerService.cancelAutoSave(noteId);
      }
    };
  }, [noteId]);

  // Schedule auto-save with debouncing
  const scheduleAutoSave = useCallback(async (data: NoteFormData): Promise<void> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    if (!noteId) {
      throw new Error('Note ID is required for auto-save');
    }

    // Check if content has actually changed
    if (lastSavedDataRef.current) {
      const hasChanged = 
        data.title !== lastSavedDataRef.current.title ||
        data.content !== lastSavedDataRef.current.content ||
        data.contentHtml !== lastSavedDataRef.current.contentHtml ||
        data.contentFormat !== lastSavedDataRef.current.contentFormat ||
        JSON.stringify(data.tags) !== JSON.stringify(lastSavedDataRef.current.tags) ||
        data.isPinned !== lastSavedDataRef.current.isPinned ||
        data.isArchived !== lastSavedDataRef.current.isArchived;

      if (!hasChanged) {
        return; // No changes, skip auto-save
      }
    }

    try {
      await saveManagerService.scheduleAutoSave(noteId, data);
      lastSavedDataRef.current = { ...data };
    } catch (error) {
      console.error('Failed to schedule auto-save:', error);
      throw error;
    }
  }, [userId, noteId]);

  // Perform manual save immediately
  const performManualSave = useCallback(async (data: NoteFormData): Promise<void> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    if (!noteId) {
      throw new Error('Note ID is required for manual save');
    }

    try {
      await saveManagerService.performManualSave(noteId, data);
      lastSavedDataRef.current = { ...data };
      
      // Show success notification on web
      if (Platform.OS === 'web') {
        showSnackbar('Note saved successfully', 'success', 3000);
      }
      
      // Call success handler if provided
      if (onSaveSuccess) {
        onSaveSuccess(noteId);
      }
    } catch (error) {
      console.error('Failed to perform manual save:', error);
      
      // Show error notification on web
      if (Platform.OS === 'web') {
        showSnackbar(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 6000);
      }
      
      throw error;
    }
  }, [userId, noteId, showSnackbar, onSaveSuccess]);

  // Cancel pending auto-save for current note
  const cancelAutoSave = useCallback(() => {
    if (noteId) {
      saveManagerService.cancelAutoSave(noteId);
    }
  }, [noteId]);

  // Clear error state
  const clearError = useCallback(() => {
    setSaveStatus(prev => ({ ...prev, error: null }));
  }, []);

  // Check if a specific note has pending changes
  const hasPendingChanges = useCallback((noteId: string): boolean => {
    return saveManagerService.hasPendingChanges(noteId);
  }, []);

  // Periodic cleanup of old operations
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      saveManagerService.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    // State
    saveStatus,
    isSaving: saveStatus.isSaving,
    hasUnsavedChanges: saveStatus.hasUnsavedChanges,
    lastSaved: saveStatus.lastSaved,
    error: saveStatus.error,
    
    // Actions
    scheduleAutoSave,
    performManualSave,
    cancelAutoSave,
    clearError,
    
    // Utilities
    hasPendingChanges,
  };
}; 