import { supabase } from '../lib/supabase';
import { NoteFormData } from '../types/Note';
import { localSaveManager } from './LocalSaveManager';

export interface SaveOperation {
  id: string;
  type: 'create' | 'update';
  data: NoteFormData;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'saving' | 'saved' | 'error';
  error?: string;
}

export interface SaveStatus {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
  pendingOperations: number;
}

export class SaveManagerService {
  private static instance: SaveManagerService;
  private operations: Map<string, SaveOperation> = new Map();
  private autoSaveQueue: string[] = [];
  private manualSaveQueue: string[] = [];
  private isProcessing = false;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private currentUser: string | null = null;
  private onStatusChange?: (status: SaveStatus) => void;
  private onError?: (error: string, operationId: string) => void;
  private isOnline: boolean = true;
  private tempIdToNoteIdMap: Map<string, string> = new Map(); // Track temp ID to actual note ID mapping

  static getInstance(): SaveManagerService {
    if (!SaveManagerService.instance) {
      SaveManagerService.instance = new SaveManagerService();
    }
    return SaveManagerService.instance;
  }

  setCurrentUser(userId: string | null) {
    // Only clear operations if the user actually changes
    if (this.currentUser !== userId) {
      this.currentUser = userId;
      this.clearAllOperations();
      
      // Load pending saves for the new user
      if (userId) {
        this.loadPendingSaves();
      }
    }
  }

  setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    
    // If coming back online, sync pending saves
    if (isOnline) {
      this.syncPendingSaves();
    }
  }

  setStatusChangeHandler(handler: (status: SaveStatus) => void) {
    this.onStatusChange = handler;
  }

  setErrorHandler(handler: (error: string, operationId: string) => void) {
    this.onError = handler;
  }

  private clearAllOperations() {
    this.operations.clear();
    this.autoSaveQueue = [];
    this.manualSaveQueue = [];
    this.autoSaveTimers.forEach(timer => clearTimeout(timer));
    this.autoSaveTimers.clear();
    this.tempIdToNoteIdMap.clear(); // Clear temp ID mappings
    this.isProcessing = false;
  }

  private notifyStatusChange() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }

  private notifyError(error: string, operationId: string) {
    if (this.onError) {
      this.onError(error, operationId);
    }
  }

  getStatus(): SaveStatus {
    const pendingOperations = this.operations.size;
    const isSaving = this.isProcessing || Array.from(this.operations.values()).some(op => op.status === 'saving');
    const lastSaved = this.getLastSavedTime();
    const hasUnsavedChanges = this.autoSaveQueue.length > 0 || this.manualSaveQueue.length > 0;
    const error = this.getLastError();

    return {
      isSaving,
      lastSaved,
      hasUnsavedChanges,
      error,
      pendingOperations,
    };
  }

  private getLastSavedTime(): Date | null {
    const savedOperations = Array.from(this.operations.values())
      .filter(op => op.status === 'saved')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return savedOperations.length > 0 ? new Date(savedOperations[0].timestamp) : null;
  }

  private getLastError(): string | null {
    const errorOperations = Array.from(this.operations.values())
      .filter(op => op.status === 'error')
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return errorOperations.length > 0 ? errorOperations[0].error || null : null;
  }

  async scheduleAutoSave(noteId: string, data: NoteFormData): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const operationId = `auto_${noteId}_${Date.now()}`;
    
    // Clear existing auto-save timer for this note
    const existingTimer = this.autoSaveTimers.get(noteId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Create new operation
    const operation: SaveOperation = {
      id: operationId,
      type: noteId.startsWith('temp_') ? 'create' : 'update',
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.operations.set(operationId, operation);
    this.autoSaveQueue.push(operationId);

    // Set debounced timer (2 seconds)
    const timer = setTimeout(() => {
      this.processAutoSaveQueue();
    }, 2000);

    this.autoSaveTimers.set(noteId, timer);
    this.notifyStatusChange();
  }

  async performManualSave(noteId: string, data: NoteFormData): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // Cancel any pending auto-save for this note
    const existingTimer = this.autoSaveTimers.get(noteId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.autoSaveTimers.delete(noteId);
    }

    // Check if there's a pending auto-save operation that might have already created the note
    let actualNoteId = noteId;
    let shouldCreate = noteId.startsWith('temp_');
    
    // Check if this temp ID has already been mapped to an actual note ID
    if (noteId.startsWith('temp_') && this.tempIdToNoteIdMap.has(noteId)) {
      actualNoteId = this.tempIdToNoteIdMap.get(noteId)!;
      shouldCreate = false;
      console.log(`SaveManagerService: Temp ID ${noteId} already mapped to actual note ID ${actualNoteId}, will update instead of create`);
    }
    
    // Also look for any completed auto-save operations that might have created this note
    for (const [opId, operation] of this.operations.entries()) {
      if (operation.status === 'saved' && 
          operation.type === 'create' && 
          operation.data.id === noteId) {
        // An auto-save operation has already created this note, so we should update instead
        actualNoteId = operation.data.id;
        shouldCreate = false;
        break;
      }
    }

    // Remove any pending auto-save operations for this note
    this.autoSaveQueue = this.autoSaveQueue.filter(opId => {
      const op = this.operations.get(opId);
      return op && op.data.id !== noteId;
    });

    const operationId = `manual_${actualNoteId}_${Date.now()}`;
    
    console.log(`SaveManagerService: Manual save operation - original noteId: ${noteId}, actualNoteId: ${actualNoteId}, shouldCreate: ${shouldCreate}`);
    
    const operation: SaveOperation = {
      id: operationId,
      type: shouldCreate ? 'create' : 'update',
      data: {
        ...data,
        id: shouldCreate ? undefined : actualNoteId, // Clear id for create operations
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.operations.set(operationId, operation);
    this.manualSaveQueue.unshift(operationId); // Add to front for priority

    // Process immediately
    await this.processManualSaveQueue();
  }

  private async processAutoSaveQueue(): Promise<void> {
    if (this.isProcessing || this.autoSaveQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyStatusChange();

    try {
      while (this.autoSaveQueue.length > 0) {
        const operationId = this.autoSaveQueue.shift()!;
        const operation = this.operations.get(operationId);
        
        if (!operation) continue;

        await this.executeOperation(operation);
      }
    } finally {
      this.isProcessing = false;
      this.notifyStatusChange();
    }
  }

  private async processManualSaveQueue(): Promise<void> {
    if (this.manualSaveQueue.length === 0) {
      return;
    }

    try {
      while (this.manualSaveQueue.length > 0) {
        const operationId = this.manualSaveQueue.shift()!;
        const operation = this.operations.get(operationId);
        
        if (!operation) continue;

        await this.executeOperation(operation);
      }
    } catch (error) {
      console.error('Error processing manual save queue:', error);
    }
  }

  private async executeOperation(operation: SaveOperation): Promise<void> {
    try {
      operation.status = 'saving';
      this.notifyStatusChange();

      // Check if we're offline
      if (!this.isOnline) {
        console.log('SaveManagerService: Offline, saving locally');
        await this.saveLocally(operation);
        return;
      }

      if (operation.type === 'create') {
        await this.createNote(operation);
      } else {
        await this.updateNote(operation);
      }

      operation.status = 'saved';
      this.notifyStatusChange();
    } catch (error) {
      operation.status = 'error';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.retryCount++;

      this.notifyError(operation.error, operation.id);
      this.notifyStatusChange();

      // If offline or network error, save locally
      if (!this.isOnline || this.isNetworkError(error)) {
        console.log('SaveManagerService: Network error, saving locally');
        try {
          await this.saveLocally(operation);
        } catch (localError) {
          console.error('SaveManagerService: Failed to save locally:', localError);
        }
        return;
      }

      // Retry logic for auto-save operations
      if (operation.retryCount < 3 && operation.id.startsWith('auto_')) {
        const retryDelay = Math.pow(2, operation.retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          this.autoSaveQueue.push(operation.id);
          this.processAutoSaveQueue();
        }, retryDelay);
      }
    }
  }

  private isNetworkError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes('network') || 
           errorMessage.includes('fetch') || 
           errorMessage.includes('timeout') ||
           errorMessage.includes('connection');
  }

  private async createNote(operation: SaveOperation): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // Generate a unique ID for the note
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const noteToCreate = {
      id: noteId,
      user_id: this.currentUser,
      title: operation.data.title,
      content: operation.data.content || '',
      tags: operation.data.tags || [],
      is_pinned: operation.data.isPinned || false,
      is_archived: operation.data.isArchived || false,
      audio_files: operation.data.audioFiles || [],
      key_details: operation.data.keyDetails || [],
      summary: operation.data.summary,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: note, error } = await supabase
      .from('notes')
      .insert(noteToCreate)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }

    // Update the operation data with the new note ID
    operation.data.id = note.id;
    
    // Store the mapping from temp ID to actual note ID
    const originalTempId = operation.id.split('_')[1]; // Extract the original temp ID from operation ID
    if (originalTempId.startsWith('temp_')) {
      this.tempIdToNoteIdMap.set(originalTempId, note.id);
      console.log(`SaveManagerService: Mapped temp ID ${originalTempId} to actual note ID ${note.id}`);
    }
    
    // Also update any pending operations that reference the old temp ID
    for (const [opId, pendingOp] of this.operations.entries()) {
      if (pendingOp.status === 'pending' && 
          pendingOp.data.id === originalTempId) {
        pendingOp.data.id = note.id;
      }
    }
  }

  private async updateNote(operation: SaveOperation): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are being updated
    if (operation.data.title !== undefined) updateData.title = operation.data.title;
    if (operation.data.content !== undefined) updateData.content = operation.data.content;
    if (operation.data.tags !== undefined) updateData.tags = operation.data.tags;
    if (operation.data.isPinned !== undefined) updateData.is_pinned = operation.data.isPinned;
    if (operation.data.isArchived !== undefined) updateData.is_archived = operation.data.isArchived;
    if (operation.data.audioFiles !== undefined) updateData.audio_files = operation.data.audioFiles;
    if (operation.data.keyDetails !== undefined) updateData.key_details = operation.data.keyDetails;
    if (operation.data.summary !== undefined) updateData.summary = operation.data.summary;

    const { error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', operation.data.id)
      .eq('user_id', this.currentUser);

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }

  // Clean up completed operations (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [operationId, operation] of this.operations.entries()) {
      if (operation.timestamp < oneHourAgo && operation.status === 'saved') {
        this.operations.delete(operationId);
      }
    }

    // Clean up old temp ID mappings (older than 1 hour)
    for (const [tempId, noteId] of this.tempIdToNoteIdMap.entries()) {
      // Check if any recent operations reference this temp ID
      const hasRecentOperations = Array.from(this.operations.values()).some(op => 
        op.timestamp > oneHourAgo && op.data.id === tempId
      );
      
      if (!hasRecentOperations) {
        this.tempIdToNoteIdMap.delete(tempId);
      }
    }

    this.notifyStatusChange();
  }

  // Get operation by note ID
  getOperationByNoteId(noteId: string): SaveOperation | null {
    for (const operation of this.operations.values()) {
      if (operation.data.id === noteId) {
        return operation;
      }
    }
    return null;
  }

  // Check if note has pending changes
  hasPendingChanges(noteId: string): boolean {
    return this.autoSaveQueue.some(opId => {
      const op = this.operations.get(opId);
      return op && op.data.id === noteId;
    }) || this.manualSaveQueue.some(opId => {
      const op = this.operations.get(opId);
      return op && op.data.id === noteId;
    });
  }

  // Cancel auto-save for a specific note
  cancelAutoSave(noteId: string): void {
    // Clear existing auto-save timer for this note
    const existingTimer = this.autoSaveTimers.get(noteId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.autoSaveTimers.delete(noteId);
    }

    // Remove any pending auto-save operations for this note
    this.autoSaveQueue = this.autoSaveQueue.filter(opId => {
      const op = this.operations.get(opId);
      return op && op.data.id !== noteId;
    });

    this.notifyStatusChange();
  }

  // Get the actual note ID for a temp ID (useful for debugging)
  getActualNoteId(tempId: string): string | null {
    return this.tempIdToNoteIdMap.get(tempId) || null;
  }

  // Load pending saves from local storage
  private async loadPendingSaves(): Promise<void> {
    try {
      await localSaveManager.loadPendingSaves();
      console.log('SaveManagerService: Loaded pending saves from local storage');
    } catch (error) {
      console.error('SaveManagerService: Error loading pending saves:', error);
    }
  }

  // Sync pending saves when coming back online
  private async syncPendingSaves(): Promise<void> {
    try {
      const pendingSaves = await localSaveManager.getPendingSaves();
      console.log('SaveManagerService: Syncing', pendingSaves.length, 'pending saves');

      for (const pendingSave of pendingSaves) {
        try {
          // Create a save operation for the pending save
          const operationId = `sync_${pendingSave.id}`;
          const operation: SaveOperation = {
            id: operationId,
            type: pendingSave.data.id ? 'update' : 'create',
            data: pendingSave.data,
            timestamp: pendingSave.timestamp,
            retryCount: pendingSave.retryCount,
            status: 'pending',
          };

          this.operations.set(operationId, operation);
          this.manualSaveQueue.unshift(operationId); // High priority

          // Remove from local storage after successful sync
          await localSaveManager.removePendingSave(pendingSave.id);
        } catch (error) {
          console.error('SaveManagerService: Error syncing pending save:', error);
        }
      }

      // Process the sync queue
      await this.processManualSaveQueue();
    } catch (error) {
      console.error('SaveManagerService: Error syncing pending saves:', error);
    }
  }

  // Save locally when offline
  private async saveLocally(operation: SaveOperation): Promise<void> {
    try {
      const noteId = operation.data.id || `temp_${Date.now()}`;
      await localSaveManager.saveLocally(noteId, operation.data);
      console.log('SaveManagerService: Saved locally due to offline status');
      
      // Mark operation as saved (locally)
      operation.status = 'saved';
      this.notifyStatusChange();
    } catch (error) {
      console.error('SaveManagerService: Error saving locally:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const saveManagerService = SaveManagerService.getInstance(); 