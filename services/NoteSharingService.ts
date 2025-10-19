import { featureLimitManager } from '../constants/UnifiedFeatureLimits';
import { supabase } from '../lib/supabase';
import {
    Note,
    NoteShare,
    SharedNote,
    ShareOptions,
    SharePermission
} from '../types/Note';

export class NoteSharingService {
  private static instance: NoteSharingService;
  
  public static getInstance(): NoteSharingService {
    if (!NoteSharingService.instance) {
      NoteSharingService.instance = new NoteSharingService();
    }
    return NoteSharingService.instance;
  }

  /**
   * Share a note with another user
   */
  async shareNote(
    noteId: string, 
    ownerId: string, 
    options: ShareOptions
  ): Promise<NoteShare> {
    try {
      // Note sharing is a free core feature - no limits applied

      // Validate the note exists and belongs to the owner
      console.log('NoteSharingService: Validating note ownership:', { noteId, ownerId });
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('id, user_id')
        .eq('id', noteId)
        .eq('user_id', ownerId)
        .single();

      if (noteError) {
        console.error('NoteSharingService: Note validation error:', noteError);
        throw new Error(`Note validation failed: ${noteError.message}`);
      }

      if (!note) {
        console.error('NoteSharingService: Note not found or access denied');
        throw new Error('Note not found or access denied');
      }

      console.log('NoteSharingService: Note validation successful:', note);

      // Check if already shared with this user/email
      const { data: existingShare } = await supabase
        .from('note_shares')
        .select('id')
        .eq('note_id', noteId)
        .eq('is_active', true)
        .or(
          options.sharedWithUserId 
            ? `shared_with_user_id.eq.${options.sharedWithUserId}`
            : `shared_with_email.eq.${options.sharedWithEmail}`
        )
        .single();

      if (existingShare) {
        throw new Error('Note is already shared with this user');
      }

      // Create the share
      const shareData = {
        note_id: noteId,
        owner_id: ownerId,
        shared_with_user_id: options.sharedWithUserId || null,
        shared_with_email: options.sharedWithEmail || null,
        permission_level: options.permission,
        expires_at: options.expiresAt?.toISOString() || null,
        message: options.message || null,
        share_token: this.generateShareToken(),
        is_active: true,
      };

      console.log('NoteSharingService: Creating share with data:', shareData);
      const { data: share, error: shareError } = await supabase
        .from('note_shares')
        .insert(shareData)
        .select()
        .single();

      if (shareError) {
        console.error('NoteSharingService: Share creation error:', shareError);
        throw new Error(`Failed to share note: ${shareError.message}`);
      }

      console.log('NoteSharingService: Share created successfully:', share);

      // Track usage for feature limits
      await this.trackShareUsage(ownerId);

      return share as NoteShare;
    } catch (error) {
      console.error('NoteSharingService: Error sharing note:', error);
      throw error;
    }
  }

  /**
   * Get all shares for a specific note
   */
  async getNoteShares(noteId: string, ownerId: string): Promise<NoteShare[]> {
    try {
      const { data: shares, error } = await supabase
        .from('note_shares')
        .select('*')
        .eq('note_id', noteId)
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get note shares: ${error.message}`);
      }

      return shares as NoteShare[];
    } catch (error) {
      console.error('NoteSharingService: Error getting note shares:', error);
      throw error;
    }
  }

  /**
   * Get notes shared with the current user
   */
  async getSharedNotesWithMe(userId: string): Promise<SharedNote[]> {
    try {
      // First get the shares
      const { data: shares, error: sharesError } = await supabase
        .from('note_shares')
        .select('*')
        .eq('shared_with_user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (sharesError) {
        throw new Error(`Failed to get shared notes: ${sharesError.message}`);
      }

      if (!shares || shares.length === 0) {
        return [];
      }

      // Get the note IDs
      const noteIds = shares.map(share => share.note_id);
      
      // Get the notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds);

      if (notesError) {
        throw new Error(`Failed to get notes: ${notesError.message}`);
      }

      // Get the owner IDs
      const ownerIds = [...new Set(shares.map(share => share.owner_id))];
      
      // Get user details (including email) for owners using RPC
      const { data: userDetails, error: userDetailsError } = await supabase
        .rpc('get_user_details_by_ids', { user_ids: ownerIds });

      if (userDetailsError) {
        console.warn('Failed to get user details via RPC:', userDetailsError);
        console.warn('Falling back to user_profiles (email will not be available)');
      }

      // Create a map for quick lookup
      const notesMap = new Map(notes?.map(note => [note.id, note]) || []);
      const userDetailsMap = new Map(userDetails?.map((user: any) => [user.id, user]) || []);

      // Transform to SharedNote format
      const sharedNotes: SharedNote[] = shares.map((share: any) => {
        const note = notesMap.get(share.note_id);
        const userDetail = userDetailsMap.get(share.owner_id) as any;
        
        return {
          id: share.note_id,
          title: note?.title || 'Unknown Note',
          content: note?.content || '',
          userId: share.owner_id,
          tags: note?.tags || [],
          isPinned: note?.isPinned || false,
          isArchived: note?.isArchived || false,
          isFavorite: note?.isFavorite || false,
          audioFiles: note?.audioFiles || [],
          keyDetails: note?.keyDetails || [],
          summary: note?.summary || null,
          createdAt: new Date(note?.createdAt || share.created_at),
          updatedAt: new Date(note?.updatedAt || share.updated_at),
          shareInfo: {
            shareId: share.id,
            permission: share.permission_level,
            sharedBy: {
              id: share.owner_id,
              email: userDetail?.email || 'Unknown User',
              displayName: userDetail?.display_name || 'Unknown User',
            },
            sharedAt: new Date(share.created_at),
            message: share.message,
          },
        };
      });

      return sharedNotes;
    } catch (error) {
      console.error('NoteSharingService: Error getting shared notes:', error);
      throw error;
    }
  }

  /**
   * Get notes shared by the current user
   */
  async getNotesSharedByMe(userId: string): Promise<NoteShare[]> {
    try {
      // Get the shares
      const { data: shares, error: sharesError } = await supabase
        .from('note_shares')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (sharesError) {
        throw new Error(`Failed to get shared notes: ${sharesError.message}`);
      }

      if (!shares || shares.length === 0) {
        return [];
      }

      // Get the note IDs
      const noteIds = shares.map(share => share.note_id);
      
      // Get the notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('id', noteIds);

      if (notesError) {
        throw new Error(`Failed to get notes: ${notesError.message}`);
      }

      // Create a map for quick lookup
      const notesMap = new Map(notes?.map(note => [note.id, note]) || []);

      // Transform to NoteShare format
      const noteShares: NoteShare[] = shares.map((share: any) => {
        const note = notesMap.get(share.note_id);
        
        return {
          id: share.id,
          noteId: share.note_id,
          ownerId: share.owner_id,
          sharedWithUserId: share.shared_with_user_id,
          sharedWithEmail: share.shared_with_email,
          permissionLevel: share.permission_level,
          shareToken: share.share_token,
          isActive: share.is_active,
          expiresAt: share.expires_at ? new Date(share.expires_at) : undefined,
          message: share.message,
          createdAt: new Date(share.created_at),
          updatedAt: new Date(share.updated_at),
          note: {
            id: share.note_id,
            title: note?.title || 'Unknown Note',
            content: note?.content || '',
            updatedAt: new Date(note?.updatedAt || share.updated_at),
          },
        };
      });

      return noteShares;
    } catch (error) {
      console.error('NoteSharingService: Error getting shared notes:', error);
      throw error;
    }
  }

  /**
   * Update share permissions
   */
  async updateSharePermissions(
    shareId: string, 
    ownerId: string, 
    permission: SharePermission,
    expiresAt?: Date
  ): Promise<NoteShare> {
    try {
      const { data: share, error } = await supabase
        .from('note_shares')
        .update({
          permission_level: permission,
          expires_at: expiresAt?.toISOString() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update share permissions: ${error.message}`);
      }

      return share as NoteShare;
    } catch (error) {
      console.error('NoteSharingService: Error updating share permissions:', error);
      throw error;
    }
  }

  /**
   * Revoke a share
   */
  async revokeShare(shareId: string, ownerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('note_shares')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .eq('owner_id', ownerId);

      if (error) {
        throw new Error(`Failed to revoke share: ${error.message}`);
      }
    } catch (error) {
      console.error('NoteSharingService: Error revoking share:', error);
      throw error;
    }
  }

  /**
   * Create a public share link
   */
  async createPublicShare(
    noteId: string, 
    ownerId: string, 
    expiresAt?: Date
  ): Promise<{ shareToken: string; shareUrl: string }> {
    try {
      const shareToken = this.generateShareToken();
      
      const { data: share, error } = await supabase
        .from('note_shares')
        .insert({
          note_id: noteId,
          owner_id: ownerId,
          permission_level: 'read',
          share_token: shareToken,
          is_active: true,
          expires_at: expiresAt?.toISOString() || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create public share: ${error.message}`);
      }

      // Get the base URL (works on both web and mobile)
      const baseUrl = typeof window !== 'undefined' && window.location 
        ? window.location.origin 
        : (process.env.EXPO_PUBLIC_WEB_URL || 'https://wiznote.app'); // Use environment variable with fallback
      
      const shareUrl = `${baseUrl}/shared/${shareToken}`;
      
      return { shareToken, shareUrl };
    } catch (error) {
      console.error('NoteSharingService: Error creating public share:', error);
      throw error;
    }
  }

  /**
   * Access a note via public share token
   */
  async accessPublicShare(shareToken: string): Promise<{ note: Note; share: NoteShare }> {
    try {
      console.log('🔍 NoteSharingService: Accessing public share with token:', shareToken);
      
      // First, get the share record
      const { data: share, error: shareError } = await supabase
        .from('note_shares')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single();

      if (shareError) {
        console.error('❌ NoteSharingService: Error fetching share:', shareError);
        console.error('❌ Error code:', shareError.code);
        console.error('❌ Error message:', shareError.message);
        console.error('❌ Error details:', shareError.details);
        
        // Check if it's a permission error
        if (shareError.code === '42501') {
          throw new Error('Public share access is not configured. Please run the database migration: database/fix-public-share-constraint.sql');
        }
        
        throw new Error('Share not found or expired');
      }

      if (!share) {
        console.error('❌ NoteSharingService: Share not found');
        throw new Error('Share not found or expired');
      }

      console.log('✅ NoteSharingService: Share found:', share.id);

      // Check if share has expired
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        console.error('❌ NoteSharingService: Share has expired');
        throw new Error('Share has expired');
      }

      // Now get the note separately (with specific fields to avoid user table access)
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('id, title, content, tags, summary, key_details, audio_files, pdf_files, type, created_at, updated_at')
        .eq('id', share.note_id)
        .single();

      if (noteError) {
        console.error('❌ NoteSharingService: Error fetching note:', noteError);
        console.error('❌ Error code:', noteError.code);
        console.error('❌ Error message:', noteError.message);
        
        if (noteError.code === '42501') {
          throw new Error('Public note access is not configured. Please run the database migration: database/fix-public-share-constraint.sql');
        }
        
        throw new Error('Note not found');
      }

      if (!note) {
        console.error('❌ NoteSharingService: Note not found');
        throw new Error('Note not found');
      }

      console.log('✅ NoteSharingService: Note found:', note.id);

      // Track access (don't fail if this errors)
      try {
        await this.trackShareAccess(share.id, 'viewed');
      } catch (trackError) {
        console.warn('Failed to track share access:', trackError);
      }

      // Transform to Note type
      const transformedNote: Note = {
        id: note.id,
        title: note.title,
        content: note.content,
        userId: share.owner_id, // Use owner_id from share
        tags: note.tags || [],
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        audioFiles: note.audio_files || [],
        pdfFiles: note.pdf_files || [],
        type: note.type || 'text',
        keyDetails: note.key_details || [],
        summary: note.summary || null,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      };

      return {
        note: transformedNote,
        share: share as NoteShare,
      };
    } catch (error) {
      console.error('❌ NoteSharingService: Error accessing public share:', error);
      throw error;
    }
  }

  /**
   * Track sharing usage for analytics (no limits enforced - core feature)
   */
  private async trackShareUsage(userId: string): Promise<void> {
    try {
      // Log sharing activity for analytics purposes
      console.log(`NoteSharingService: Tracked share usage for user ${userId}`);
    } catch (error) {
      console.error('NoteSharingService: Error tracking share usage:', error);
    }
  }

  /**
   * Track share access
   */
  private async trackShareAccess(shareId: string, action: 'viewed' | 'edited' | 'commented'): Promise<void> {
    try {
      const { error } = await supabase
        .from('shared_note_access')
        .insert({
          share_id: shareId,
          action,
          accessed_at: new Date().toISOString(),
        });

      if (error) {
        console.error('NoteSharingService: Error tracking share access:', error);
      }
    } catch (error) {
      console.error('NoteSharingService: Error tracking share access:', error);
    }
  }

  /**
   * Generate a unique share token
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check if user has permission to perform action on shared note
   */
  async checkNotePermission(
    noteId: string, 
    userId: string, 
    action: 'read' | 'edit' | 'admin'
  ): Promise<{ hasPermission: boolean; permission: SharePermission | null }> {
    try {
      // Check if user owns the note
      const { data: note } = await supabase
        .from('notes')
        .select('user_id')
        .eq('id', noteId)
        .single();

      if (note?.user_id === userId) {
        return { hasPermission: true, permission: 'admin' };
      }

      // Check if note is shared with user
      const { data: share } = await supabase
        .from('note_shares')
        .select('permission_level')
        .eq('note_id', noteId)
        .eq('shared_with_user_id', userId)
        .eq('is_active', true)
        .single();

      if (!share) {
        return { hasPermission: false, permission: null };
      }

      const permission = share.permission_level as SharePermission;
      const hasPermission = this.hasRequiredPermission(permission, action);

      return { hasPermission, permission };
    } catch (error) {
      console.error('NoteSharingService: Error checking note permission:', error);
      return { hasPermission: false, permission: null };
    }
  }

  /**
   * Check if permission level allows required action
   */
  private hasRequiredPermission(
    userPermission: SharePermission, 
    requiredAction: 'read' | 'edit' | 'admin'
  ): boolean {
    const permissionLevels = { read: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[userPermission];
    const requiredLevel = permissionLevels[requiredAction];
    
    return userLevel >= requiredLevel;
  }

  /**
   * Search for users by email or display name
   */
  async searchUsers(query: string): Promise<any[]> {
    try {
      if (!query || query.length < 2) {
        console.log('NoteSharingService: Query too short:', query.length);
        return [];
      }

      console.log('🔍 NoteSharingService: Searching users with query:', query);

      // Use RPC function to search users (can access auth.users)
      const { data: users, error } = await supabase
        .rpc('search_users_by_email_or_name', { search_query: query });

      if (error) {
        console.error('❌ NoteSharingService: RPC search error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // Check if it's a "function not found" error
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.error('⚠️ The database function "search_users_by_email_or_name" does not exist!');
          console.error('⚠️ Please run the SQL migration: database/create-user-search-function.sql');
        }
        
        // Fallback: Search in user_profiles table for display names only
        console.log('🔄 NoteSharingService: Falling back to user_profiles search');
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .ilike('display_name', `%${query}%`)
          .limit(10);

        if (profileError) {
          console.error('❌ NoteSharingService: Fallback search error:', profileError);
          return [];
        }

        console.log('⚠️ Note: Email search is not available. Only display name search works.');
        console.log('⚠️ Found profiles:', profiles?.length || 0);

        // Transform user_profiles data (no email available)
        return profiles?.map(profile => ({
          id: profile.id,
          email: null, // No email in user_profiles
          display_name: profile.display_name || 'Unknown User'
        })) || [];
      }

      console.log('✅ NoteSharingService: Found users:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('✅ Users:', users.map((u: any) => ({ email: u.email, name: u.display_name })));
      }

      // Users from RPC already have the correct format
      return users || [];
    } catch (error) {
      console.error('❌ NoteSharingService: Search users error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const noteSharingService = NoteSharingService.getInstance();
