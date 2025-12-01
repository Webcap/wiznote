import { supabase } from '../lib/supabase';
import { Note, SharePermission, UpdateNoteData } from '../types/Note';
import { validateNoteTitle, validateNoteContent, NoteIdSchema } from '../schemas/NoteSchema';
import { sanitizeNoteTitle, sanitizeNoteContent, sanitizePlainText } from '../utils/sanitization';
import { Platform } from 'react-native';
import { queryCache } from '../utils/queryCache';

export class SupabaseNoteStorage {
  private currentUser: string | null = null;
  private currentUserEmail: string | null = null;
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
          } else if (status === 'TIMED_OUT') {
            console.warn('SupabaseNoteStorage: Real-time subscription timed out, but will continue to retry automatically');
          } else if (status === 'SUBSCRIBED') {
            console.log('SupabaseNoteStorage: Real-time subscription active and connected');
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

  setCurrentUser(userId: string | null, userEmail: string | null = null) {
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
    this.currentUserEmail = userEmail ? userEmail.trim().toLowerCase() : null;
    
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

  // Trigger a manual refresh of notes (useful after saves)
  async triggerNotesRefresh(): Promise<void> {
    console.log('SupabaseNoteStorage: triggerNotesRefresh called', { 
      hasValidUser: this.hasValidUser(), 
      hasChangeHandler: !!this.onNotesChange 
    });
    
    if (!this.hasValidUser()) {
      console.log('SupabaseNoteStorage: Cannot trigger refresh - no valid user');
      return;
    }

    try {
      console.log('SupabaseNoteStorage: Fetching notes...');
      const notes = await this.getNotes();
      console.log('SupabaseNoteStorage: Got notes, count:', notes.length);
      
      // Always trigger the handler if set, even if it means we'll refresh
      if (this.onNotesChange) {
        console.log('SupabaseNoteStorage: Triggering notes change handler with', notes.length, 'notes');
        console.log('SupabaseNoteStorage: Notes data:', notes.map(n => ({ 
          id: n.id, 
          title: n.title, 
          updatedAt: n.updatedAt?.getTime() 
        })));
        this.onNotesChange(notes);
        console.log('SupabaseNoteStorage: Change handler called successfully');
      } else {
        console.warn('SupabaseNoteStorage: No change handler set, cannot notify of updates');
      }
    } catch (error) {
      console.error('SupabaseNoteStorage: Error triggering notes refresh:', error);
    }
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
    this.currentUserEmail = null;
    this.onError = undefined;
    this.onNotesChange = undefined;
  }

  // Method to explicitly clear user (for sign out scenarios)
  clearUser() {
    this.cleanupRealtimeSubscription();
    this.currentUser = null;
    this.currentUserEmail = null;
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

  /**
   * Safely parse a date string, returning a valid Date or a fallback
   */
  private parseDate(dateValue: any): Date {
    if (!dateValue) {
      return new Date();
    }
    
    // If it's already a Date object, validate it
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date() : dateValue;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Empty string or whitespace-only string
      if (dateValue.trim() === '') {
        return new Date();
      }
      
      const parsed = new Date(dateValue);
      // Check if the parsed date is valid
      if (isNaN(parsed.getTime())) {
        console.warn('SupabaseNoteStorage: Invalid date string:', dateValue);
        return new Date();
      }
      return parsed;
    }
    
    // For any other type, return current date
    return new Date();
  }

  /**
   * Safely extract title from note data
   */
  private extractTitle(titleValue: any): string {
    if (titleValue === null || titleValue === undefined) {
      return '';
    }
    
    if (typeof titleValue === 'string') {
      return titleValue.trim();
    }
    
    // Try to convert to string
    try {
      return String(titleValue).trim();
    } catch {
      return '';
    }
  }

  /**
   * Transform raw Supabase note data to Note format
   */
  private transformNote(note: any): Note {
    try {
      const title = this.extractTitle(note.title);
      const createdAt = this.parseDate(note.created_at);
      const updatedAt = this.parseDate(note.updated_at);
      
      // Validate the transformed note
      if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
        console.warn('SupabaseNoteStorage: Invalid dates in note:', {
          id: note.id,
          created_at: note.created_at,
          updated_at: note.updated_at,
          createdAt: createdAt,
          updatedAt: updatedAt
        });
      }
      
      return {
        id: note.id,
        userId: note.user_id,
        title: title,
        content: note.content || '',
        contentHtml: note.content_html || null,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary || null,
        createdAt: createdAt,
        updatedAt: updatedAt,
      };
    } catch (transformError) {
      console.error('SupabaseNoteStorage: Error transforming note:', {
        noteId: note.id,
        error: transformError,
        rawNote: {
          id: note.id,
          title: note.title,
          updated_at: note.updated_at,
          created_at: note.created_at
        }
      });
      // Return a minimal valid note to prevent breaking the entire list
      return {
        id: note.id || `error_${Date.now()}`,
        userId: note.user_id || this.currentUser || '',
        title: this.extractTitle(note.title) || 'Error loading note',
        content: note.content || '',
        contentHtml: null,
        contentFormat: 'plain',
        type: 'text',
        tags: [],
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        audioFiles: [],
        pdfFiles: [],
        keyDetails: [],
        summary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Transform array of raw Supabase notes to Note format
   */
  private transformNotes(notes: any[]): Note[] {
    return (notes || []).map(note => this.transformNote(note));
  }

  /**
   * Get notes with pagination support
   * @param limit Maximum number of notes to fetch (default: 50)
   * @param offset Number of notes to skip (default: 0)
   * @param forceRefresh Force refresh from database (bypass cache)
   * @returns Object with notes array and hasMore flag
   */
  async getNotesPaginated(limit: number = 50, offset: number = 0, forceRefresh: boolean = false): Promise<{ notes: Note[]; hasMore: boolean; total?: number }> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    // Create cache key
    const cacheKey = `notes_paginated_${this.currentUser}_${limit}_${offset}`;

    // Use query cache with deduplication
    return queryCache.getOrExecute(
      cacheKey,
      async () => {
        try {
          console.log('SupabaseNoteStorage: Fetching paginated notes for user:', this.currentUser, `limit: ${limit}, offset: ${offset}`);
          
          // Add timeout to prevent blocking - longer for mobile
          const timeoutMs = Platform.OS === 'web' ? 20000 : 35000;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Supabase query timeout')), timeoutMs);
          });
          
          // Fetch one extra to check if there are more
          const queryLimit = limit + 1;
          
          // Optimize select to only fetch needed fields for list view
          const queryPromise = supabase
            .from('notes')
            .select('id, user_id, title, content, content_html, content_format, type, tags, is_pinned, is_archived, is_favorite, audio_files, pdf_files, key_details, summary, created_at, updated_at', { count: 'exact' })
            .eq('user_id', this.currentUser)
            .order('updated_at', { ascending: false })
            .range(offset, offset + queryLimit - 1);

          let result: any;
          try {
            result = await Promise.race([
              queryPromise,
              timeoutPromise
            ]);
          } catch (raceError) {
            // If timeout wins, clear it and throw
            if (timeoutId) clearTimeout(timeoutId);
            throw raceError;
          }
          
          // Clear timeout if query completed first
          if (timeoutId) clearTimeout(timeoutId);

          // Check if result is a Supabase response
          if (!result || typeof result !== 'object' || !('data' in result)) {
            console.error('SupabaseNoteStorage: Invalid query result:', result);
            throw new Error('Invalid response from Supabase');
          }

          const { data: notes, error, count } = result;

          if (error) {
            console.error('SupabaseNoteStorage: Query error:', error);
            this.handleError(error, 'getNotesPaginated');
          }

          // Determine if there are more notes
          const hasMore = notes && notes.length > limit;
          // Take only the requested number of notes
          const notesToReturn = notes ? notes.slice(0, limit) : [];

          // Transform notes
          const transformedNotes = this.transformNotes(notesToReturn);

          console.log('SupabaseNoteStorage: Paginated notes - fetched:', transformedNotes.length, 'hasMore:', hasMore, 'total:', count);
          
          return {
            notes: transformedNotes,
            hasMore,
            total: count
          };
        } catch (error) {
          this.handleError(error, 'getNotesPaginated');
          return { notes: [], hasMore: false };
        }
      },
      {
        ttl: 30 * 1000, // 30 seconds cache for notes (they change frequently)
        forceRefresh,
      }
    );
  }

  /**
   * Get all notes (backward compatibility - uses pagination internally for better performance)
   */
  async getNotes(): Promise<Note[]> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      console.log('SupabaseNoteStorage: Fetching all notes for user:', this.currentUser);
      
      // For backward compatibility, fetch all notes but use pagination for better performance
      // Fetch in chunks to avoid timeout issues
      const chunkSize = 100;
      let offset = 0;
      let allNotes: Note[] = [];
      let hasMore = true;

      while (hasMore) {
        const result = await this.getNotesPaginated(chunkSize, offset);
        allNotes = [...allNotes, ...result.notes];
        hasMore = result.hasMore;
        offset += chunkSize;

        // Safety limit to prevent infinite loops
        if (offset > 10000) {
          console.warn('SupabaseNoteStorage: Reached safety limit for note fetching');
          break;
        }
      }

      console.log('SupabaseNoteStorage: Fetched all notes count:', allNotes.length);
      return allNotes;
    } catch (error) {
      this.handleError(error, 'getNotes');
      return [];
    }
  }

  async getNote(noteId: string): Promise<Note | null> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    // Validate noteId
    if (!noteId || typeof noteId !== 'string' || noteId.trim().length === 0) {
      console.error('SupabaseNoteStorage.getNote: Invalid noteId provided:', noteId);
      return null;
    }

    try {
      console.log('🔍 SupabaseNoteStorage.getNote: Starting query with:', {
        noteId,
        noteIdType: typeof noteId,
        noteIdLength: noteId?.length,
        currentUser: this.currentUser,
        currentUserType: typeof this.currentUser
      });

      // First try to get the note as owner
      const response = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', this.currentUser)
        .single();
      
      let { data: note, error } = response;
      
      // Log the full response object
      console.log('🔍 SupabaseNoteStorage.getNote: Full Supabase response object:', response);
      console.log('🔍 SupabaseNoteStorage.getNote: Response.data:', response.data);
      console.log('🔍 SupabaseNoteStorage.getNote: Response.error:', response.error);
      
      // Handle case where Supabase returns an array instead of a single object
      // This can happen if .single() doesn't work as expected
      if (Array.isArray(note) && note.length > 0) {
        console.log('🔍 SupabaseNoteStorage.getNote: Data is an array, extracting first element');
        note = note[0];
      } else if (Array.isArray(note) && note.length === 0) {
        console.log('🔍 SupabaseNoteStorage.getNote: Data is an empty array, treating as not found');
        note = null;
        error = { code: 'PGRST116', message: 'Note not found' } as any;
      }

      // Log the raw Supabase response for debugging
      console.log('🔍 SupabaseNoteStorage.getNote: Raw Supabase response:', {
        hasData: !!note,
        dataType: typeof note,
        dataIsNull: note === null,
        dataIsUndefined: note === undefined,
        dataKeys: note ? Object.keys(note) : [],
        dataKeysDetails: note ? Object.keys(note).map(key => ({ key, value: note[key], valueType: typeof note[key] })) : [],
        fullData: note ? JSON.stringify(note, null, 2) : 'null',
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        noteId: note?.id,
        noteIdType: typeof note?.id
      });
      
      // Direct log of the note object to see its structure
      console.log('🔍 SupabaseNoteStorage.getNote: Direct note object:', note);
      if (note && Object.keys(note).length > 0) {
        console.log('🔍 SupabaseNoteStorage.getNote: First key in note:', Object.keys(note)[0], 'Value:', note[Object.keys(note)[0]]);
      }

      // Validate that we got a valid note with an id
      // Supabase might return an empty object {} instead of null when not found
      if (!error && (!note || note.id === undefined || note.id === null)) {
        console.log('SupabaseNoteStorage.getNote: Query succeeded but note is invalid, treating as not found');
        error = { code: 'PGRST116', message: 'Note not found' } as any;
        note = null;
      }

      // If not found as owner, check if it's a shared note
      if (error && error.code === 'PGRST116') {
        console.log('Note not found as owner, checking if it\'s a shared note...');
        
        // Check if this note is shared with the current user
        const shareSelect = 'id, permission_level, owner_id, shared_with_user_id, shared_with_email, created_at';
        let share: any = null;

        if (this.currentUser) {
          const { data: shareByUser, error: shareByUserError } = await supabase
            .from('note_shares')
            .select(shareSelect)
            .eq('note_id', noteId)
            .eq('shared_with_user_id', this.currentUser)
            .eq('is_active', true)
            .maybeSingle();

          if (shareByUser) {
            share = shareByUser;
          } else if (shareByUserError && shareByUserError.code && shareByUserError.code !== 'PGRST116') {
            console.warn('SupabaseNoteStorage: Error checking note share by user id:', shareByUserError);
          }
        }

        if (!share && this.currentUserEmail) {
          const { data: shareByEmail, error: shareByEmailError } = await supabase
            .from('note_shares')
            .select(shareSelect)
            .eq('note_id', noteId)
            .ilike('shared_with_email', this.currentUserEmail)
            .eq('is_active', true)
            .maybeSingle();

          if (shareByEmail) {
            share = shareByEmail;
          } else if (shareByEmailError && shareByEmailError.code && shareByEmailError.code !== 'PGRST116') {
            console.warn('SupabaseNoteStorage: Error checking note share by email:', shareByEmailError);
          }
        }

        if (!share) {
          console.log('Note is not shared with current user via user ID or email');
          return null;
        }

        console.log('Note is shared with current user (shared access detected), fetching note...');
        
        // Fetch the note without the user_id filter (rely on RLS policy)
        const sharedNoteResponse = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single();

        let { data: sharedNote, error: sharedNoteError } = sharedNoteResponse;

        // Handle case where Supabase returns an array instead of a single object
        if (Array.isArray(sharedNote) && sharedNote.length > 0) {
          console.log('🔍 SupabaseNoteStorage.getNote: Shared note data is an array, extracting first element');
          sharedNote = sharedNote[0];
        } else if (Array.isArray(sharedNote) && sharedNote.length === 0) {
          console.log('🔍 SupabaseNoteStorage.getNote: Shared note data is an empty array');
          sharedNote = null;
          sharedNoteError = { code: 'PGRST116', message: 'Shared note not found' } as any;
        }

        if (sharedNoteError) {
          console.error('Error fetching shared note:', sharedNoteError);
          return null;
        }

        // Validate shared note has valid data
        if (!sharedNote || sharedNote.id === undefined || sharedNote.id === null) {
          console.error('SupabaseNoteStorage.getNote: Shared note query returned invalid data');
          return null;
        }

        note = sharedNote;
        error = null;
        
        // Mark this as a shared note with permission info
        note.isSharedNote = true;
        note.sharePermission = share.permission_level as SharePermission;
      }

      // Final validation: ensure we have a valid note with an id
      if (!note || note.id === undefined || note.id === null) {
        console.log('SupabaseNoteStorage.getNote: Note not found (no valid note data)');
        return null;
      }

      // Handle any remaining errors (non-PGRST116 errors)
      if (error && error.code !== 'PGRST116') {
        console.error('SupabaseNoteStorage.getNote: Error fetching note:', error);
        this.handleError(error, 'getNote');
        return null;
      }

      // Log raw data from Supabase BEFORE transformation
      console.log('🔍 SupabaseNoteStorage.getNote: RAW DATA FROM SUPABASE:', {
        id: note.id,
        title: note.title,
        titleType: typeof note.title,
        titleIsNull: note.title === null,
        titleIsUndefined: note.title === undefined,
        titleValue: JSON.stringify(note.title),
        content: note.content ? `${note.content.substring(0, 100)}...` : note.content,
        contentType: typeof note.content,
        contentIsNull: note.content === null,
        contentIsUndefined: note.content === undefined,
        contentLength: note.content?.length || 0,
        content_html: note.content_html ? `${note.content_html.substring(0, 100)}...` : note.content_html,
        content_htmlLength: note.content_html?.length || 0,
        created_at: note.created_at,
        updated_at: note.updated_at,
        allFields: Object.keys(note)
      });

      // Transform Supabase data to Note format
      const extractedTitle = this.extractTitle(note.title);
      const extractedContent = note.content || '';
      const parsedCreatedAt = this.parseDate(note.created_at);
      const parsedUpdatedAt = this.parseDate(note.updated_at);
      
      const transformedNote = {
        id: note.id,
        userId: note.user_id,
        title: extractedTitle,
        content: extractedContent,
        contentHtml: note.content_html || null,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary || null,
        createdAt: parsedCreatedAt,
        updatedAt: parsedUpdatedAt,
        // Include share permission info if this is a shared note
        isSharedNote: note.isSharedNote || false,
        sharePermission: note.sharePermission,
      };

      // Log transformed data
      console.log('🔍 SupabaseNoteStorage.getNote: TRANSFORMED DATA:', {
        id: transformedNote.id,
        title: transformedNote.title,
        titleLength: transformedNote.title.length,
        content: transformedNote.content ? `${transformedNote.content.substring(0, 100)}...` : transformedNote.content,
        contentLength: transformedNote.content.length,
        contentHtml: transformedNote.contentHtml ? `${transformedNote.contentHtml.substring(0, 100)}...` : transformedNote.contentHtml,
        contentHtmlLength: transformedNote.contentHtml?.length || 0,
        createdAt: transformedNote.createdAt,
        updatedAt: transformedNote.updatedAt,
        createdAtValid: !isNaN(transformedNote.createdAt.getTime()),
        updatedAtValid: !isNaN(transformedNote.updatedAt.getTime())
      });

      return transformedNote;
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
      // ✅ STEP 1: Validate and sanitize note title and content
      console.log('Validating note data...');
      const validatedTitle = validateNoteTitle(noteData.title);
      const validatedContent = validateNoteContent(noteData.content || '');
      
      // Sanitize HTML content to prevent XSS
      const sanitizedTitle = sanitizeNoteTitle(validatedTitle);
      // Sanitize content based on format: plain text vs HTML
      const contentFormat = noteData.contentFormat || 'plain';
      const sanitizedContent = contentFormat === 'html' 
        ? sanitizeNoteContent(validatedContent)
        : sanitizePlainText(validatedContent);
      console.log('✅ Note validation passed');
      
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
        title: sanitizedTitle, // Use sanitized title
        content: sanitizedContent, // Use sanitized content
        content_html: noteData.contentHtml ? sanitizeNoteContent(noteData.contentHtml) : null,
        content_format: noteData.contentFormat || 'plain',
        type: noteData.type || 'text',
        tags: noteData.tags || [],
        is_pinned: noteData.isPinned || false,
        is_archived: noteData.isArchived || false,
        is_favorite: noteData.isFavorite || false,
        audio_files: audioFiles,
        pdf_files: noteData.pdfFiles || [],
        key_details: noteData.keyDetails || [],
        summary: noteData.summary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('SupabaseNoteStorage: About to insert note with ID:', noteId);
      console.log('SupabaseNoteStorage: Note data to insert:', {
        id: noteToCreate.id,
        user_id: noteToCreate.user_id,
        title: noteToCreate.title,
        type: noteToCreate.type,
      });

      const { data: note, error } = await supabase
        .from('notes')
        .insert(noteToCreate)
        .select('*')
        .single();

      console.log('SupabaseNoteStorage: Insert result - error:', error);
      console.log('SupabaseNoteStorage: Insert result - data:', note);

      if (error) {
        console.error('SupabaseNoteStorage: Error creating note:', error);
        console.error('SupabaseNoteStorage: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        // Don't call handleError here since it throws, and we want to throw the original error
        throw new Error(`Failed to create note: ${error.message || 'Unknown error'}`);
      }

      if (!note) {
        console.error('SupabaseNoteStorage: No note data returned from insert');
        throw new Error('Failed to create note: No data returned from database');
      }

      // Handle case where .single() returns an array instead of a single object
      const noteRow = Array.isArray(note) ? note[0] : note;

      if (!noteRow) {
        console.error('SupabaseNoteStorage: No note data in returned array/object:', note);
        throw new Error('Failed to create note: No data in response');
      }

      if (!noteRow.id) {
        console.error('SupabaseNoteStorage: Note created but missing ID:', noteRow);
        console.error('SupabaseNoteStorage: Full noteRow object:', JSON.stringify(noteRow, null, 2));
        throw new Error('Failed to create note: Note ID is missing from database response');
      }

      console.log('SupabaseNoteStorage: Note created successfully with ID:', noteRow.id);

      // Transform Supabase data to Note format
      const transformedNote = {
        id: noteRow.id,
        userId: noteRow.user_id,
        title: this.extractTitle(noteRow.title),
        content: noteRow.content || '',
        contentHtml: noteRow.content_html || null,
        contentFormat: noteRow.content_format || 'plain',
        type: noteRow.type || 'text',
        tags: noteRow.tags || [],
        isPinned: noteRow.is_pinned || false,
        isArchived: noteRow.is_archived || false,
        isFavorite: noteRow.is_favorite || false,
        audioFiles: noteRow.audio_files || [],
        pdfFiles: noteRow.pdf_files || [],
        keyDetails: noteRow.key_details || [],
        summary: noteRow.summary || null,
        createdAt: this.parseDate(noteRow.created_at),
        updatedAt: this.parseDate(noteRow.updated_at),
      };

      console.log('SupabaseNoteStorage: Returning transformed note with ID:', transformedNote.id);
      return transformedNote;
    } catch (error) {
      console.error('SupabaseNoteStorage: Exception in createNote:', error);
      // Don't call handleError since it throws again - just log and re-throw the original error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create note: ${String(error)}`);
    } finally {
      // Invalidate notes cache when note is created
      if (this.currentUser) {
        queryCache.invalidatePattern(`notes_paginated_${this.currentUser}_.*`);
      }
    }
  }

  async updateNote(noteId: string, updates: UpdateNoteData): Promise<Note> {
    if (!this.hasValidUser()) {
      throw new Error('No user authenticated');
    }

    try {
      // ✅ STEP 1: Validate note ID
      NoteIdSchema.parse(noteId);
      
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // ✅ STEP 2: Validate and sanitize fields that are being updated
      if (updates.title !== undefined) {
        const validatedTitle = validateNoteTitle(updates.title);
        updateData.title = sanitizeNoteTitle(validatedTitle);
      }
      if (updates.content !== undefined) {
        const validatedContent = validateNoteContent(updates.content);
        // Sanitize content based on format: plain text vs HTML
        const contentFormat = updates.contentFormat || 'plain';
        updateData.content = contentFormat === 'html'
          ? sanitizeNoteContent(validatedContent)
          : sanitizePlainText(validatedContent);
      }
      if (updates.contentHtml !== undefined) {
        updateData.content_html = updates.contentHtml ? sanitizeNoteContent(updates.contentHtml) : null;
      }
      if (updates.contentFormat !== undefined) updateData.content_format = updates.contentFormat;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
      if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
      if (updates.audioFiles !== undefined) updateData.audio_files = updates.audioFiles;
      if (updates.pdfFiles !== undefined) updateData.pdf_files = updates.pdfFiles;
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
        title: this.extractTitle(note.title),
        content: note.content || '',
        contentHtml: note.content_html || null,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
        keyDetails: note.key_details || [],
        summary: note.summary || null,
        createdAt: this.parseDate(note.created_at),
        updatedAt: this.parseDate(note.updated_at),
      };
    } catch (error) {
      this.handleError(error, 'updateNote');
      throw error;
    } finally {
      // Invalidate notes cache when note is updated
      if (this.currentUser) {
        queryCache.invalidatePattern(`notes_paginated_${this.currentUser}_.*`);
      }
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
    } finally {
      // Invalidate notes cache when note is deleted
      if (this.currentUser) {
        queryCache.invalidatePattern(`notes_paginated_${this.currentUser}_.*`);
      }
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
        contentHtml: note.content_html,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
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
        contentHtml: note.content_html,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
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
        contentHtml: note.content_html,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
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
        contentHtml: note.content_html,
        contentFormat: note.content_format || 'plain',
        type: note.type || 'text',
        tags: note.tags || [],
        isPinned: note.is_pinned || false,
        isArchived: note.is_archived || false,
        isFavorite: note.is_favorite || false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
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