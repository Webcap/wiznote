import { supabase } from '../lib/supabase';
import { Note, SharePermission, UpdateNoteData } from '../types/Note';

export class SupabaseNoteStorage {
  private currentUser: string | null = null;
  private onError?: (error: string, type: 'error' | 'warning' | 'info') => void;
  private onNotesChange?: (notes: Note[]) => void;
  private isOnline: boolean = true;
  private realtimeSubscription: any = null;
  private isRealtimeInitialized: boolean = false;

  constructor() {
    // Don't initialize real-time subscription in constructor
    // It will be initialized when setCurrentUser is called with a valid user ID
    console.log('SupabaseNoteStorage: Service instance created (no real-time subscription initialized yet)');
  }

  private initializeRealtimeSubscription() {
    // Only initialize if we have a current user and haven't already initialized
    if (!this.currentUser || this.isRealtimeInitialized) {
      return null;
    }

    try {
      console.log('SupabaseNoteStorage: Initializing real-time subscription for user:', this.currentUser);
      // Subscribe to real-time changes for notes
      const subscription = supabase
        .channel('notes_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${this.currentUser}`
          },
          (payload) => {
            console.log('SupabaseNoteStorage: Real-time change detected:', payload);
            this.handleRealtimeChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('SupabaseNoteStorage: Real-time subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.warn('SupabaseNoteStorage: Real-time subscription error, will retry when user is set');
          }
        });

      this.realtimeSubscription = subscription;
      this.isRealtimeInitialized = true;
      console.log('SupabaseNoteStorage: Real-time subscription initialized');
      return subscription;
    } catch (error) {
      console.error('SupabaseNoteStorage: Error initializing real-time subscription:', error);
      return null;
    }
  }

  private cleanupRealtimeSubscription() {
    if (this.realtimeSubscription) {
      try {
        this.realtimeSubscription.unsubscribe();
        console.log('SupabaseNoteStorage: Real-time subscription cleaned up');
      } catch (error) {
        console.error('SupabaseNoteStorage: Error cleaning up real-time subscription:', error);
      }
      this.realtimeSubscription = null;
      this.isRealtimeInitialized = false;
    }
  }

  private handleRealtimeChange(payload: any) {
    if (!this.hasValidUser()) return;

    // Refresh notes when changes occur
    this.getNotes().then(notes => {
      if (this.onNotesChange) {
        this.onNotesChange(notes);
      }
    }).catch(error => {
      console.error('SupabaseNoteStorage: Error handling real-time change:', error);
    });
  }

  setCurrentUser(userId: string | null) {
    console.log('SupabaseNoteStorage: setCurrentUser called with userId:', userId ? `${userId.substring(0, 8)}...` : 'null');
    
    // Don't clear the current user if an empty string is passed (this prevents race conditions)
    if (userId === '') {
      console.log('SupabaseNoteStorage: Empty string provided, keeping current user to prevent race conditions');
      return;
    }
    
    // Additional protection: don't clear if we have a valid user and the new userId is null
    if (this.currentUser && this.currentUser !== '' && !userId) {
      console.log('SupabaseNoteStorage: Valid user exists, ignoring null userId to prevent race conditions');
      return;
    }
    
    // Clean up existing subscription if user is changing
    if (this.currentUser !== userId) {
      console.log('SupabaseNoteStorage: User changed, cleaning up existing subscription');
      this.cleanupRealtimeSubscription();
    }
    
    this.currentUser = userId;
    
    // Initialize real-time subscription only if we have a valid user ID
    if (userId && userId.trim() !== '') {
      console.log('SupabaseNoteStorage: Valid user ID provided, initializing real-time subscription');
      this.initializeRealtimeSubscription();
    } else {
      console.log('SupabaseNoteStorage: No valid user ID provided, skipping real-time subscription initialization');
    }
  }

  setErrorHandler(handler: (error: string, type: 'error' | 'warning' | 'info') => void) {
    this.onError = handler;
  }

  setNotesChangeHandler(handler: (notes: Note[]) => void) {
    this.onNotesChange = handler;
  }

  setOnlineStatus(online: boolean) {
    this.isOnline = online;
  }

  // Check if we have a valid current user
  private hasValidUser(): boolean {
    return this.currentUser !== null && this.currentUser !== '' && this.currentUser.trim() !== '';
  }

  // Public method to cleanup real-time subscription
  cleanup() {
    this.cleanupRealtimeSubscription();
    // Don't clear currentUser here - let it be managed by setCurrentUser calls
    // this.currentUser = null;
    this.onError = undefined;
    this.onNotesChange = undefined;
  }

  // Method to explicitly clear user (for sign out scenarios)
  clearUser() {
    this.cleanupRealtimeSubscription();
    this.currentUser = null;
    this.onError = undefined;
    this.onNotesChange = undefined;
  }

  // Destructor to ensure cleanup
  destroy() {
    this.cleanup();
  }

  private handleError(error: any, context: string) {
    const errorMessage = error?.message || error?.error_description || 'Unknown error';
    console.error(`SupabaseNoteStorage ${context}:`, error);
    
    if (this.onError) {
      this.onError(`${context}: ${errorMessage}`, 'error');
    }
    
    throw new Error(errorMessage);
  }

  async getNotes(): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      console.log('SupabaseNoteStorage: Fetching notes for user:', this.currentUser);
      
      // Add timeout to prevent blocking
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Supabase query timeout')), 15000);
      });
      
      const queryPromise = supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.currentUser)
        .order('updated_at', { ascending: false });

      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      const { data: notes, error } = result;

      if (error) {
        this.handleError(error, 'getNotes');
      }

      // Transform Supabase data to Note format
      const transformedNotes: Note[] = (notes || []).map((note: any) => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      return transformedNotes;
    } catch (error) {
      this.handleError(error, 'getNotes');
      return [];
    }
  }

  async getNote(noteId: string): Promise<Note | null> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      // First try to get the note as owner
      let { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', this.currentUser)
        .single();

      // If not found as owner, check if it's a shared note
      if (error && error.code === 'PGRST116') {
        console.log('Note not found as owner, checking if it\'s a shared note...');
        
        // Check if this note is shared with the current user
        const { data: share, error: shareError } = await supabase
          .from('note_shares')
          .select('id, permission_level, owner_id, created_at')
          .eq('note_id', noteId)
          .eq('shared_with_user_id', this.currentUser)
          .eq('is_active', true)
          .single();

        if (shareError || !share) {
          console.log('Note is not shared with current user');
          return null;
        }

        console.log('Note is shared with current user, fetching note...');
        
        // Fetch the note without the user_id filter (rely on RLS policy)
        const { data: sharedNote, error: sharedNoteError } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single();

        if (sharedNoteError) {
          console.error('Error fetching shared note:', sharedNoteError);
          return null;
        }

        note = sharedNote;
        error = null;
        
        // Mark this as a shared note with permission info
        note.isSharedNote = true;
        note.sharePermission = share.permission_level as SharePermission;
      }

      if (error) {
        this.handleError(error, 'getNote');
        return null;
      }

      if (!note) return null;

      // Transform Supabase data to Note format
      return {
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
        // Include share permission info if this is a shared note
        isSharedNote: note.isSharedNote || false,
        sharePermission: note.sharePermission,
      };
    } catch (error) {
      this.handleError(error, 'getNote');
      return null;
    }
  }

  async createNote(noteData: any): Promise<Note> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      // Generate a unique ID for the note
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Handle audio data - convert audioUrl/audioDuration to audioFiles format
      let audioFiles = noteData.audioFiles || [];
      if (noteData.audioUrl && !audioFiles.length) {
        // Convert legacy audioUrl/audioDuration to audioFiles format
        audioFiles = [{
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: noteData.audioUrl,
          duration: noteData.audioDuration || 0,
          transcription: noteData.transcription || '',
          transcriptionStatus: 'completed' as const,
          aiTranscription: '',
          userEditedTranscription: noteData.transcription || '',
          createdAt: new Date(),
        }];
      }
      
      const noteToCreate = {
        id: noteId,
        user_id: this.currentUser,
        title: noteData.title,
        content: noteData.content || '',
        tags: noteData.tags || [],
        is_pinned: noteData.isPinned || false,
        is_archived: noteData.isArchived || false,
        audio_files: audioFiles,
        key_details: noteData.keyDetails || [],
        summary: noteData.summary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: note, error } = await supabase
        .from('notes')
        .insert(noteToCreate)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'createNote');
      }

      // Transform Supabase data to Note format
      return {
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      };
    } catch (error) {
      this.handleError(error, 'createNote');
      throw error;
    }
  }

  async updateNote(noteId: string, updates: UpdateNoteData): Promise<Note> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are being updated
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
      if (updates.audioFiles !== undefined) updateData.audio_files = updates.audioFiles;
      if (updates.keyDetails !== undefined) updateData.key_details = updates.keyDetails;
      if (updates.summary !== undefined) updateData.summary = updates.summary;

      const { data: note, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', noteId)
        .eq('user_id', this.currentUser)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'updateNote');
      }

      // Transform Supabase data to Note format
      return {
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      };
    } catch (error) {
      this.handleError(error, 'updateNote');
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', this.currentUser);

      if (error) {
        this.handleError(error, 'deleteNote');
      }
    } catch (error) {
      this.handleError(error, 'deleteNote');
      throw error;
    }
  }

  async searchNotes(query: string): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.currentUser)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('updated_at', { ascending: false });

      if (error) {
        this.handleError(error, 'searchNotes');
      }

      // Transform Supabase data to Note format
      const transformedNotes: Note[] = (notes || []).map((note: any) => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      return transformedNotes;
    } catch (error) {
      this.handleError(error, 'searchNotes');
      return [];
    }
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.currentUser)
        .contains('tags', [tag])
        .order('updated_at', { ascending: false });

      if (error) {
        this.handleError(error, 'getNotesByTag');
      }

      // Transform Supabase data to Note format
      const transformedNotes: Note[] = (notes || []).map((note: any) => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      return transformedNotes;
    } catch (error) {
      this.handleError(error, 'getNotesByTag');
      return [];
    }
  }

  async getPinnedNotes(): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.currentUser)
        .eq('is_pinned', true)
        .order('updated_at', { ascending: false });

      if (error) {
        this.handleError(error, 'getPinnedNotes');
      }

      // Transform Supabase data to Note format
      const transformedNotes: Note[] = (notes || []).map((note: any) => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      return transformedNotes;
    } catch (error) {
      this.handleError(error, 'getPinnedNotes');
      return [];
    }
  }

  async getArchivedNotes(): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.currentUser)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) {
        this.handleError(error, 'getArchivedNotes');
      }

      // Transform Supabase data to Note format
      const transformedNotes: Note[] = (notes || []).map((note: any) => ({
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        audioFiles: note.audio_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      return transformedNotes;
    } catch (error) {
      this.handleError(error, 'getArchivedNotes');
      return [];
    }
  }

  async getAllTags(): Promise<string[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('tags')
        .eq('user_id', this.currentUser);

      if (error) {
        this.handleError(error, 'getAllTags');
      }

      // Extract all unique tags
      const allTags = new Set<string>();
      (notes || []).forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach(tag => allTags.add(tag));
        }
      });

      return Array.from(allTags).sort();
    } catch (error) {
      this.handleError(error, 'getAllTags');
      return [];
    }
  }

  async syncNotes(): Promise<void> {
    // Supabase handles real-time sync automatically
    // This method is kept for compatibility
    console.log('SupabaseNoteStorage: Real-time sync is handled automatically');
  }

  getSyncStatus(): { isOnline: boolean; lastSyncTime: Date; pendingOperations: number } {
    return {
      isOnline: this.isOnline,
      lastSyncTime: new Date(),
      pendingOperations: 0, // Supabase handles operations immediately
    };
  }
}

// Export a singleton instance
export const supabaseNoteStorage = new SupabaseNoteStorage(); 