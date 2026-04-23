import { UserRole } from './User';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number; // For gradual rollouts
  targetUsers?: string[]; // Specific user IDs
  targetRoles?: UserRole[]; // Role-based targeting
  targetEnvironments?: ('development' | 'staging' | 'production')[];
  // Premium targeting
  premiumOnly?: boolean; // Only available to premium users
  // Usage tracking
  trackingEnabled?: boolean; // Whether this feature should show up in user tracking pages
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  version: string;
  lastUpdated: Date;
}

export type FeatureFlagKey = 
  | 'ai_transcription'
  | 'voice_recording'
  | 'pdf_upload'
  | 'ai_name_generating'
  | 'ai_summaries'
  | 'ai_key_details'
  | 'premium_features'
  | 'rich_text_editor'
  | 'advanced_search'
  | 'note_export'
  | 'note_sharing'
  | 'ai_quiz'
  | 'ai_flashcards'
  | 'ai_chat'
  | 'ai_write_essay'
  | 'google_sign_in';
 