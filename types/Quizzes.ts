// Quiz Feature Type Definitions
// This file contains all TypeScript interfaces for the AI-powered quiz functionality

export interface Quiz {
  id: string;
  noteId: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  questionTypes: QuestionType[];
  sourceType: ContentSourceType;
  sourceContent?: string; // The content used to generate the quiz
  generationOptions: QuizGenerationOptions;
  status: QuizStatus;
  questions: QuizQuestion[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: QuestionType;
  correctAnswer: string;
  explanation?: string;
  difficulty: QuizDifficulty;
  options?: QuestionOptions; // For multiple choice questions
  orderIndex: number;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSession {
  id: string;
  userId: string;
  quizId: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  status: QuizSessionStatus;
  progressData: QuizProgressData;
  answers: QuizAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number; // in seconds
  answeredAt: Date;
  reviewNotes?: string;
}

export interface QuizAnalytics {
  id: string;
  userId: string;
  quizId: string;
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
  totalTimeSpent: number; // in seconds
  lastAttempted?: Date;
  masteryLevel: MasteryLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizTag {
  id: string;
  quizId: string;
  tag: string;
  createdAt: Date;
}

// Enums and Constants
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';

export type ContentSourceType = 'note' | 'audio' | 'mixed';

export type QuizStatus = 'active' | 'archived' | 'deleted';

export type QuizSessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'paused';

export type MasteryLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Quiz Generation and Creation
export interface QuizGenerationOptions {
  questionCount: number;
  difficulty: QuizDifficulty;
  questionTypes: QuestionType[];
  focusAreas?: string[]; // Specific topics to focus on
  includeExplanations: boolean;
  sourceContent: string;
  sourceType: ContentSourceType;
}

export interface QuizCreationOptions {
  noteId: string;
  userId: string;
  title: string;
  description?: string;
  generationOptions: QuizGenerationOptions;
  tags?: string[];
}

export interface QuizGenerationResult {
  success: boolean;
  quiz?: Quiz;
  error?: string;
  generationTime?: number; // in milliseconds
  questionsGenerated: number;
}

// Question Options for Multiple Choice
export interface QuestionOptions {
  [key: string]: string; // e.g., {"A": "option text", "B": "option text"}
}

// Quiz Progress Tracking
export interface QuizProgressData {
  currentQuestionIndex: number;
  answeredQuestions: string[]; // question IDs
  timePerQuestion: { [questionId: string]: number };
  hintsUsed: { [questionId: string]: number };
  currentScore: number;
  estimatedTimeRemaining: number;
}

// Quiz Taking and Interaction
export interface QuizStartOptions {
  quizId: string;
  userId: string;
  timeLimit?: number; // in minutes, optional
  allowHints?: boolean;
  showProgress?: boolean;
}

export interface QuizAnswerSubmission {
  sessionId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
  useHint?: boolean;
}

export interface QuizResult {
  sessionId: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number; // percentage
  timeSpent: number;
  averageTimePerQuestion: number;
  difficultyBreakdown: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };
  questionTypeBreakdown: {
    [key in QuestionType]: { correct: number; total: number };
  };
  completedAt: Date;
}

// Quiz Management and Search
export interface QuizSearchFilters {
  userId?: string;
  noteId?: string;
  difficulty?: QuizDifficulty;
  questionTypes?: QuestionType[];
  sourceType?: ContentSourceType;
  status?: QuizStatus;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface QuizListResponse {
  quizzes: Quiz[];
  total: number;
  hasMore: boolean;
  filters: QuizSearchFilters;
}

// Quiz Statistics and Analytics
export interface QuizStatistics {
  totalQuizzes: number;
  totalQuestions: number;
  averageQuestionsPerQuiz: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypeDistribution: {
    [key in QuestionType]: number;
  };
  averageCompletionRate: number;
  averageScore: number;
}

export interface UserQuizPerformance {
  userId: string;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  averageTimePerQuestion: number;
  masteryLevel: MasteryLevel;
  favoriteQuestionTypes: QuestionType[];
  improvementAreas: string[];
  studyStreak: number; // consecutive days
  lastStudied?: Date;
}

// Quiz Export and Import
export interface QuizExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeAnswers: boolean;
  includeExplanations: boolean;
  includeAnalytics: boolean;
  questionOrder: 'original' | 'random' | 'difficulty';
}

export interface QuizImportData {
  title: string;
  description?: string;
  difficulty: QuizDifficulty;
  questions: Omit<QuizQuestion, 'id' | 'quizId' | 'createdAt' | 'updatedAt'>[];
  tags?: string[];
}

// Error Types
export interface QuizError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// API Response Types
export interface QuizApiResponse<T> {
  success: boolean;
  data?: T;
  error?: QuizError;
  message?: string;
}

// Real-time Updates
export interface QuizUpdateEvent {
  type: 'quiz_created' | 'quiz_updated' | 'quiz_deleted' | 'session_started' | 'session_completed';
  quizId: string;
  userId: string;
  timestamp: Date;
  data?: any;
}

// Utility Types
export type QuizWithoutQuestions = Omit<Quiz, 'questions'>;
export type QuizQuestionWithoutQuiz = Omit<QuizQuestion, 'quizId'>;
export type QuizSessionWithoutAnswers = Omit<QuizSession, 'answers'>;

// Constants
export const QUIZ_CONSTRAINTS = {
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 50,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 30,
} as const;

export const QUIZ_DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 2,
  hard: 3,
} as const;

export const QUESTION_TYPE_WEIGHTS = {
  multiple_choice: 1,
  true_false: 1,
  short_answer: 2,
  fill_blank: 1.5,
} as const;
