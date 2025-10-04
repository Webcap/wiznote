export interface Note {
  id: string;
  userId: string; // Link to user
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  audioUri?: string; // Audio file URI
  audioFiles?: AudioFile[]; // Voice recordings with transcription
  keyDetails?: string[]; // AI-generated key details
  summary?: string; // AI-generated summary
  // Sharing metadata
  isShared?: boolean;
  shareCount?: number;
  lastSharedAt?: Date;
  // Share permission (for shared notes)
  sharePermission?: SharePermission;
  isSharedNote?: boolean;
}

export interface AudioFile {
  id: string;
  filename: string;
  duration: number;
  transcription?: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiTranscription?: string;
  userEditedTranscription?: string;
  createdAt: Date;
}

export interface NoteFormData {
  id?: string; // Optional for new notes, required for updates
  title: string;
  content: string;
  tags: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  audioUri?: string;
  audioFiles?: AudioFile[];
  keyDetails?: string[];
  summary?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  audioUri?: string;
  audioFiles?: AudioFile[];
  keyDetails?: string[];
  summary?: string;
}

export interface NoteFilters {
  searchQuery: string;
  tags: string[];
  showArchived: boolean;
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

// Note sharing types
export type SharePermission = 'read' | 'edit' | 'admin';

export interface NoteShare {
  id: string;
  noteId: string;
  ownerId: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permissionLevel: SharePermission;
  shareToken?: string;
  isActive: boolean;
  expiresAt?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareOptions {
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permission: SharePermission;
  expiresAt?: Date;
  message?: string;
}

export interface SharedNote extends Note {
  shareInfo: {
    shareId: string;
    permission: SharePermission;
    sharedBy: {
      id: string;
      email: string;
      displayName?: string;
    };
    sharedAt: Date;
    message?: string;
  };
}

export interface ShareAccess {
  id: string;
  shareId: string;
  accessedByUserId?: string;
  accessedAt: Date;
  action: 'viewed' | 'edited' | 'commented';
  ipAddress?: string;
  userAgent?: string;
} 