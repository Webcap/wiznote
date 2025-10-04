import { supabase } from '../lib/supabase';
import { NoteFormData } from '../types/Note';
import { conflictResolver } from './ConflictResolver';
import { saveManagerService } from './SaveManagerService';

export interface RealtimeNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private subscriptions: Map<string, any> = new Map();
  private currentUser: string | null = null;
  private onNoteUpdate?: (note: RealtimeNote) => void;
  private onNoteDelete?: (noteId: string) => void;

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  setCurrentUser(userId: string | null) {
    if (this.currentUser !== userId) {
      this.currentUser = userId;
      this.unsubscribeAll();
      
      if (userId) {
        this.subscribeToUserNotes(userId);
      }
    }
  }

  setNoteUpdateHandler(handler: (note: RealtimeNote) => void) {
    this.onNoteUpdate = handler;
  }

  setNoteDeleteHandler(handler: (noteId: string) => void) {
    this.onNoteDelete = handler;
  }

  private subscribeToUserNotes(userId: string) {
    try {
      console.log('RealtimeSyncService: Subscribing to notes for user:', userId);

      const subscription = supabase
        .channel(`notes:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this.handleNoteChange(payload);
          }
        )
        .subscribe();

      this.subscriptions.set(userId, subscription);
      console.log('RealtimeSyncService: Successfully subscribed to notes');
    } catch (error) {
      console.error('RealtimeSyncService: Error subscribing to notes:', error);
    }
  }

  private handleNoteChange(payload: any) {
    try {
      console.log('RealtimeSyncService: Note change received:', payload.eventType, payload.new?.id);

      switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
          if (payload.new) {
            const note: RealtimeNote = {
              id: payload.new.id,
              user_id: payload.new.user_id,
              title: payload.new.title,
              content: payload.new.content,
              tags: payload.new.tags || [],
              is_pinned: payload.new.is_pinned,
              is_archived: payload.new.is_archived,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
            };

            // Check if we have pending local changes for this note
            const hasPendingChanges = saveManagerService.hasPendingChanges(note.id);
            
            if (hasPendingChanges) {
              // Resolve conflict
              this.resolveConflict(note);
            } else {
              // No conflicts, update immediately
              this.onNoteUpdate?.(note);
            }
          }
          break;

        case 'DELETE':
          if (payload.old?.id) {
            this.onNoteDelete?.(payload.old.id);
          }
          break;
      }
    } catch (error) {
      console.error('RealtimeSyncService: Error handling note change:', error);
    }
  }

  private resolveConflict(remoteNote: RealtimeNote) {
    try {
      // Get the current pending operation for this note
      const operation = saveManagerService.getOperationByNoteId(remoteNote.id);
      
      if (!operation) {
        // No pending operation, just update
        this.onNoteUpdate?.(remoteNote);
        return;
      }

      // Convert remote note to NoteFormData
      const remoteData: NoteFormData = {
        id: remoteNote.id,
        title: remoteNote.title,
        content: remoteNote.content,
        tags: remoteNote.tags,
        isPinned: remoteNote.is_pinned,
        isArchived: remoteNote.is_archived,
      };

      // Resolve conflict
      const resolution = conflictResolver.resolveConflict(
        operation.data,
        remoteData,
        new Date(remoteNote.updated_at)
      );

      console.log('RealtimeSyncService: Conflict resolved:', {
        noteId: remoteNote.id,
        strategy: resolution.strategy,
        conflicts: resolution.conflicts,
      });

      if (resolution.strategy === 'local') {
        // Keep local changes, but update the operation with resolved data
        operation.data = resolution.data;
      } else if (resolution.strategy === 'remote') {
        // Use remote data, cancel local operation
        saveManagerService.cancelAutoSave(remoteNote.id);
        this.onNoteUpdate?.(remoteNote);
      } else {
        // Merged - update operation with merged data
        operation.data = resolution.data;
      }
    } catch (error) {
      console.error('RealtimeSyncService: Error resolving conflict:', error);
    }
  }

  private unsubscribeAll() {
    for (const [userId, subscription] of this.subscriptions.entries()) {
      try {
        supabase.removeChannel(subscription);
        console.log('RealtimeSyncService: Unsubscribed from notes for user:', userId);
      } catch (error) {
        console.error('RealtimeSyncService: Error unsubscribing:', error);
      }
    }
    this.subscriptions.clear();
  }

  // Manually sync a specific note
  async syncNote(noteId: string): Promise<void> {
    try {
      const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) {
        throw error;
      }

      if (note) {
        const realtimeNote: RealtimeNote = {
          id: note.id,
          user_id: note.user_id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          is_pinned: note.is_pinned,
          is_archived: note.is_archived,
          created_at: note.created_at,
          updated_at: note.updated_at,
        };

        this.onNoteUpdate?.(realtimeNote);
      }
    } catch (error) {
      console.error('RealtimeSyncService: Error syncing note:', error);
    }
  }

  // Cleanup on destroy
  destroy() {
    this.unsubscribeAll();
    this.currentUser = null;
    this.onNoteUpdate = undefined;
    this.onNoteDelete = undefined;
  }
}

export const realtimeSyncService = RealtimeSyncService.getInstance(); 