export interface Flashcard {
  id: string;
  flashcardSetId: string;
  noteId: string; // This is TEXT in database, so string is correct
  userId: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  isCorrect?: boolean;
  lastReviewed?: Date;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashcardSet {
  id: string;
  noteId: string; // This is TEXT in database, so string is correct
  userId: string;
  title: string;
  description?: string;
  flashcards: Flashcard[];
  totalCards: number;
  masteredCards: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashcardSession {
  id: string;
  userId: string;
  flashcardSetId: string;
  startTime: Date;
  endTime?: Date;
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number; // in seconds
  createdAt: Date;
}

export interface FlashcardGenerationOptions {
  numCards: number; // 5-20 cards
  difficulty: 'easy' | 'medium' | 'hard';
  focusAreas?: string[]; // specific topics to focus on
  includeExplanations: boolean; // whether to include explanations
}

export interface FlashcardGenerationResult {
  success: boolean;
  flashcardSet?: FlashcardSet;
  error?: string;
  generationTime?: number; // in milliseconds
}

export interface FlashcardStudyResult {
  flashcardId: string;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  userAnswer?: string; // for review mode
}

export interface FlashcardStudySession {
  sessionId: string;
  flashcardSetId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  results: FlashcardStudyResult[];
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalTimeSpent: number;
}

export interface FlashcardStats {
  totalSets: number;
  totalCards: number;
  masteredCards: number;
  totalStudySessions: number;
  totalStudyTime: number; // in minutes
  averageAccuracy: number; // percentage
  studyStreak: number; // consecutive days
  lastStudied?: Date;
}

export interface FlashcardProgress {
  flashcardId: string;
  reviewCount: number;
  consecutiveCorrect: number;
  lastReviewed?: Date;
  nextReviewDate?: Date; // for spaced repetition
  masteryLevel: 'new' | 'learning' | 'reviewing' | 'mastered';
}

export interface FlashcardExportOptions {
  format: 'pdf' | 'csv' | 'anki' | 'json';
  includeExplanations: boolean;
  includeMetadata: boolean;
  groupByCategory: boolean;
}

export interface FlashcardImportOptions {
  format: 'csv' | 'anki' | 'json';
  overwriteExisting: boolean;
  validateContent: boolean;
}

export interface FlashcardSearchFilters {
  query?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  mastered?: boolean;
  lastReviewedAfter?: Date;
  lastReviewedBefore?: Date;
}

export interface FlashcardBulkOperation {
  operation: 'delete' | 'update' | 'move' | 'duplicate';
  flashcardIds: string[];
  updates?: Partial<Flashcard>;
  targetSetId?: string;
}

// Database response types (for Supabase)
export interface FlashcardSetRow {
  id: string;
  note_id: string; // TEXT in database
  user_id: string;
  title: string;
  description: string | null;
  total_cards: number;
  mastered_cards: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardRow {
  id: string;
  flashcard_set_id: string;
  note_id: string; // TEXT in database
  user_id: string;
  question: string;
  answer: string;
  explanation: string | null;
  difficulty: string;
  category: string | null;
  tags: string[] | null;
  is_correct: boolean | null;
  last_reviewed: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardSessionRow {
  id: string;
  user_id: string;
  flashcard_set_id: string;
  start_time: string;
  end_time: string | null;
  total_cards: number;
  correct_answers: number;
  incorrect_answers: number;
  time_spent: number;
  created_at: string;
}

// Utility types
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered';
export type StudyMode = 'learn' | 'review' | 'test' | 'spaced';

// Constants
export const FLASHCARD_LIMITS = {
  FREE: {
    MAX_SETS_PER_MONTH: 3,
    MAX_CARDS_PER_SET: 10,
    MAX_SESSIONS_PER_MONTH: 5,
  },
  PREMIUM: {
    MAX_SETS_PER_MONTH: -1, // unlimited
    MAX_CARDS_PER_SET: 50,
    MAX_SESSIONS_PER_MONTH: -1, // unlimited
  },
} as const;

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard'];
export const MASTERY_LEVELS: MasteryLevel[] = ['new', 'learning', 'reviewing', 'mastered'];
export const STUDY_MODES: StudyMode[] = ['learn', 'review', 'test', 'spaced'];

