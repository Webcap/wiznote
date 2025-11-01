import { FeatureFlag, FeatureFlagKey } from '../types/FeatureFlags';

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlag> = {

  advanced_search: {
    id: 'advanced_search',
    name: 'Advanced Search',
    description: 'Enable advanced search and filtering features',
    enabled: false,
    premiumOnly: false,
    trackingEnabled: true, // Track usage for premium features
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  note_sharing: {
    id: 'note_sharing',
    name: 'Note Sharing',
    description: 'Enable note sharing functionality',
    enabled: false,
    premiumOnly: false,
    trackingEnabled: true, // Track sharing usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  ai_key_details: {
    id: 'ai_key_details',
    name: 'AI Key Details',
    description: 'Enable AI-powered key details extraction from notes',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: true, // Track AI usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  ai_name_generating: {
    id: 'ai_name_generating',
    name: 'AI Name Generating',
    description: 'Enable AI-powered automatic note title generation based on content',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: true, // Track AI usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  ai_summaries: {
    id: 'ai_summaries',
    name: 'AI Summaries',
    description: 'Enable AI-powered note summaries generation',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: true, // Track AI usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  ai_transcription: {
    id: 'ai_transcription',
    name: 'AI Transcription',
    description: 'Enable AI-powered voice-to-text transcription for recorded audio',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: true, // Track AI usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },



  note_export: {
    id: 'note_export',
    name: 'Note Export',
    description: 'Enable note export functionality',
    enabled: false,
    premiumOnly: false,
    trackingEnabled: true, // Track export usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  premium_features: {
    id: 'premium_features',
    name: 'Premium Features',
    description: 'Enable premium features for paid users',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: false, // Premium features flag doesn't need tracking
    rolloutPercentage: 100,
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },
  voice_recording: {
    id: 'voice_recording',
    name: 'Voice Recording',
    description: 'Enable voice note recording functionality',
    enabled: true,
    premiumOnly: false, // Allow free users with limits
    trackingEnabled: true, // Track voice recording usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  pdf_upload: {
    id: 'pdf_upload',
    name: 'PDF Upload',
    description: 'Enable PDF document upload and text extraction functionality',
    enabled: true,
    premiumOnly: false, // Free for testing, will be premium-only in production
    trackingEnabled: true, // Track PDF upload usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  ai_quiz: {
    id: 'ai_quiz',
    name: 'AI Quiz Generation',
    description: 'Enable AI-powered quiz generation based on notes content, audio, summaries, and key details',
    enabled: true,
    premiumOnly: false, // Premium feature - set to false for testing
    trackingEnabled: true, // Track AI quiz usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  ai_flashcards: {
    id: 'ai_flashcards',
    name: 'AI Flashcard Generation',
    description: 'Enable AI-powered flashcard generation based on notes content, audio, summaries, and key details',
    enabled: true,
    premiumOnly: false, // Premium feature
    trackingEnabled: true, // Track AI flashcard usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  ai_chat: {
    id: 'ai_chat',
    name: 'AI Chat',
    description: 'Enable AI-powered chat functionality for interactive note assistance and learning',
    enabled: false,
    premiumOnly: true, // Premium feature
    trackingEnabled: true, // Track AI chat usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  ai_write_essay: {
    id: 'ai_write_essay',
    name: 'AI Essay Writing',
    description: 'Enable AI-powered essay writing assistance based on notes content, audio, summaries, and key details',
    enabled: false,
    premiumOnly: true, // Premium feature
    trackingEnabled: true, // Track AI essay writing usage
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  rich_text_editor: {
    id: 'rich_text_editor',
    name: 'Rich Text Editor',
    description: 'Enable rich text editing with HTML formatting (bold, italic, headings, lists)',
    enabled: true,
    premiumOnly: false, // Free for testing, will be premium-only in production
    trackingEnabled: true, // Track rich text usage
    rolloutPercentage: 100, // Enable for all users in development
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  },

  google_sign_in: {
    id: 'google_sign_in',
    name: 'Google Sign-In',
    description: 'Enable Google OAuth sign-in and sign-up functionality',
    enabled: true,
    premiumOnly: false,
    trackingEnabled: false, // Don't track authentication methods
    rolloutPercentage: 100,
    targetEnvironments: ['development', 'staging', 'production'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  }
};
