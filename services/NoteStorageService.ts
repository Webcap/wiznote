import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note, NoteFormData } from '../types/Note';
// Firebase NoteStorage has been removed from this project.
// Note storage should be implemented using Supabase.
// This file is kept for compatibility but should be updated to use Supabase.
import { localNoteStorage } from './LocalNoteStorage';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'note_sync_queue';
const LAST_SYNC_KEY = 'last_note_sync';

export class NoteStorageService {
  private static instance: NoteStorageService;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  static getInstance(): NoteStorageService {
    if (!NoteStorageService.instance) {
      NoteStorageService.instance = new NoteStorageService();
    }
    return NoteStorageService.instance;
  }

  // Set online/offline status
  setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  // Get notes with offline-first approach
  async getNotes(userId: string): Promise<Note[]> {
    // Don't try to get notes if userId is empty
    if (!userId || userId === '') {
      console.log('NoteStorageService: Empty user ID provided, returning empty array');
      return [];
    }

    try {
      // Always try to load from local storage first
      console.log('NoteStorageService: Loading notes from local storage');
      const localNotes = await localNoteStorage.getNotes(userId);
      
      if (localNotes.length > 0) {
        console.log('NoteStorageService: Found cached notes:', localNotes.length);
        
        // If offline, return local notes immediately
        if (!this.isOnline) {
          console.log('NoteStorageService: Offline mode, returning cached notes');
          return localNotes;
        }
        
        // If online, try to sync with Supabase in background
        // Add a small delay to prevent interference with note creation
        setTimeout(() => {
          this.syncWithSupabase(userId, localNotes).catch(error => {
            console.error('NoteStorageService: Background sync failed:', error);
          });
        }, 1000);
        
        return localNotes;
      }

      // If no local notes and online, try Supabase
      if (this.isOnline) {
        console.log('NoteStorageService: No local notes, fetching from Supabase');
        try {
          // TODO: Implement Supabase note fetching
          // const supabaseNotes = await supabaseNoteStorage.getNotes(userId);
          // await localNoteStorage.saveNotes(userId, supabaseNotes);
          // return supabaseNotes;
          console.log('NoteStorageService: Supabase note fetching not yet implemented');
          return [];
        } catch (error) {
          console.error('NoteStorageService: Failed to fetch from Supabase:', error);
          return [];
        }
      }

      return [];
    } catch (error) {
      console.error('NoteStorageService: Error getting notes:', error);
      return [];
    }
  }

  // Create note with offline support
  async createNote(userId: string, noteData: NoteFormData): Promise<Note> {
    // Don't try to create note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot create note: User ID is required');
    }

    try {
      // Create note locally first for immediate feedback
      const tempId = `temp_${Date.now()}`;
      const newNote: Note = {
        id: tempId,
        userId,
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags || [],
        isPinned: noteData.isPinned || false,
        isArchived: noteData.isArchived || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        audioFiles: [],
        keyDetails: [],
        summary: '',
      };

      // Save to local storage immediately
      await localNoteStorage.addNote(userId, newNote);

      // If online, try to save to Supabase
      if (this.isOnline) {
        try {
          console.log('NoteStorageService: Creating note in Supabase...');
          // TODO: Implement Supabase note creation
          // const supabaseNote = await supabaseNoteStorage.createNote(userId, noteData);
          // console.log('NoteStorageService: Note created in Supabase with ID:', supabaseNote.id);
          
          // Update local storage with the real Supabase ID
          // await localNoteStorage.updateNote(userId, tempId, { id: supabaseNote.id });
          // console.log('NoteStorageService: Updated local storage with Supabase ID');
          
          // return supabaseNote;
          console.log('NoteStorageService: Supabase note creation not yet implemented');
          return newNote;
        } catch (error) {
          console.error('NoteStorageService: Failed to create note in Supabase:', error);
          
          // Add to sync queue for later
          this.addToSyncQueue({
            id: tempId,
            type: 'create',
            data: { ...noteData, userId },
            timestamp: Date.now(),
          });
          
          console.log('NoteStorageService: Added note to sync queue, returning temp note');
          return newNote;
        }
      } else {
        // Add to sync queue for later
        this.addToSyncQueue({
          id: tempId,
          type: 'create',
          data: { ...noteData, userId },
          timestamp: Date.now(),
        });
        
        console.log('NoteStorageService: Offline mode, added note to sync queue');
        return newNote;
      }
    } catch (error) {
      console.error('NoteStorageService: Error creating note:', error);
      throw error;
    }
  }

  // Update note with offline support
  async updateNote(userId: string, noteId: string, updates: Partial<NoteFormData>): Promise<Note | null> {
    // Don't try to update note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot update note: User ID is required');
    }

    try {
      // Update locally first
      await localNoteStorage.updateNote(userId, noteId, updates);

      // If online, try to update Supabase
      if (this.isOnline) {
        try {
          // TODO: Implement Supabase note update
          // const updatedNote = await supabaseNoteStorage.updateNote(noteId, updates, userId);
          // return updatedNote;
          console.log('NoteStorageService: Supabase note update not yet implemented');
          
          // Return the locally updated note
          const localNotes = await localNoteStorage.getNotes(userId);
          return localNotes.find(note => note.id === noteId) || null;
        } catch (error) {
          console.error('NoteStorageService: Failed to update note in Supabase:', error);
          
          // Add to sync queue for later
          this.addToSyncQueue({
            id: noteId,
            type: 'update',
            data: { ...updates, userId },
            timestamp: Date.now(),
          });
          
          // Return the locally updated note
          const localNotes = await localNoteStorage.getNotes(userId);
          return localNotes.find(note => note.id === noteId) || null;
        }
      } else {
        // Add to sync queue for later
        this.addToSyncQueue({
          id: noteId,
          type: 'update',
          data: { ...updates, userId },
          timestamp: Date.now(),
        });
        
        // Return the locally updated note
        const localNotes = await localNoteStorage.getNotes(userId);
        return localNotes.find(note => note.id === noteId) || null;
      }
    } catch (error) {
      console.error('NoteStorageService: Error updating note:', error);
      throw error;
    }
  }

  // Delete note with offline support
  async deleteNote(userId: string, noteId: string): Promise<void> {
    // Don't try to delete note if userId is empty
    if (!userId || userId === '') {
      throw new Error('Cannot delete note: User ID is required');
    }

    try {
      // Delete locally first
      await localNoteStorage.deleteNote(userId, noteId);

      // If online, try to delete from Supabase
      if (this.isOnline) {
        try {
          // TODO: Implement Supabase note deletion
          // await supabaseNoteStorage.deleteNote(noteId, userId);
          console.log('NoteStorageService: Supabase note deletion not yet implemented');
        } catch (error) {
          console.error('NoteStorageService: Failed to delete note from Supabase:', error);
          
          // Add to sync queue for later
          this.addToSyncQueue({
            id: noteId,
            type: 'delete',
            data: { userId },
            timestamp: Date.now(),
          });
        }
      } else {
        // Add to sync queue for later
        this.addToSyncQueue({
          id: noteId,
          type: 'delete',
          data: { userId },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('NoteStorageService: Error deleting note:', error);
      throw error;
    }
  }

      // Sync with Supabase in background
  private async syncWithSupabase(userId: string, localNotes: Note[]): Promise<void> {
    if (this.syncInProgress || !this.isOnline || !userId || userId === '') {
      console.log('NoteStorageService: Skipping background sync - syncInProgress:', this.syncInProgress, 'isOnline:', this.isOnline, 'userId:', userId);
      return;
    }

    this.syncInProgress = true;
    
    try {
      console.log('NoteStorageService: Starting background sync with Supabase');
      console.log('NoteStorageService: Local notes count:', localNotes.length);
      
      // TODO: Implement Supabase note fetching and syncing
      // Get notes from Supabase
      // const supabaseNotes = await supabaseNoteStorage.getNotes(userId);
      // console.log('NoteStorageService: Supabase notes count:', supabaseNotes.length);
      
      // Merge local and Supabase notes (local takes precedence for recent changes)
      // const mergedNotes = this.mergeNotes(localNotes, supabaseNotes);
      // console.log('NoteStorageService: Merged notes count:', mergedNotes.length);
      
      // Save merged notes to local storage
      // await localNoteStorage.saveNotes(userId, mergedNotes);
      
      // Process sync queue
      await this.processSyncQueue();
      
      console.log('NoteStorageService: Supabase sync not yet implemented');
    } catch (error) {
      console.error('NoteStorageService: Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Merge local and Supabase notes
  private mergeNotes(localNotes: Note[], supabaseNotes: Note[]): Note[] {
    const merged = new Map<string, Note>();
    
    // Add Supabase notes first
    supabaseNotes.forEach(note => {
      merged.set(note.id, note);
    });
    
    // Override with local notes (they have more recent changes)
    localNotes.forEach(note => {
      const existing = merged.get(note.id);
      if (!existing || note.updatedAt > existing.updatedAt) {
        merged.set(note.id, note);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Add item to sync queue
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    this.syncQueue.push(item);
    await this.saveSyncQueue();
  }

  // Save sync queue to storage
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('NoteStorageService: Error saving sync queue:', error);
    }
  }

  // Load sync queue from storage
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueJson) {
        this.syncQueue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('NoteStorageService: Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    console.log('NoteStorageService: Processing sync queue:', this.syncQueue.length, 'items');
    
    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const item of itemsToProcess) {
      try {
        // Skip items without proper user ID
        const userId = item.data?.userId || 'unknown';
        if (userId === 'unknown') {
          console.warn('NoteStorageService: Skipping sync item with unknown user ID:', item);
          continue;
        }

        switch (item.type) {
          case 'create':
            // TODO: Implement Supabase note creation
            // await supabaseNoteStorage.createNote(userId, item.data);
            console.log('NoteStorageService: Supabase note creation not yet implemented');
            break;
          case 'update':
            // TODO: Implement Supabase note update
            // await supabaseNoteStorage.updateNote(item.id, item.data, userId);
            console.log('NoteStorageService: Supabase note update not yet implemented');
            break;
          case 'delete':
            // TODO: Implement Supabase note deletion
            // await supabaseNoteStorage.deleteNote(item.id, userId);
            console.log('NoteStorageService: Supabase note deletion not yet implemented');
            break;
        }
      } catch (error) {
        console.error('NoteStorageService: Error processing sync item:', error);
        // Re-add failed items to queue
        this.syncQueue.push(item);
      }
    }
    
    await this.saveSyncQueue();
  }

  // Initialize the service
  async initialize(): Promise<void> {
    await this.loadSyncQueue();
  }

  // Get sync status
  getSyncStatus(): { queueLength: number; isOnline: boolean; syncInProgress: boolean } {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  // Clear all data
  async clearAllData(userId: string): Promise<void> {
    // Don't try to clear data if userId is empty
    if (!userId || userId === '') {
      console.log('NoteStorageService: Empty user ID provided, skipping clear all data');
      return;
    }

    await localNoteStorage.clearUserData(userId);
    this.syncQueue = [];
    await this.saveSyncQueue();
  }
}

// Export singleton instance
export const noteStorageService = NoteStorageService.getInstance(); 