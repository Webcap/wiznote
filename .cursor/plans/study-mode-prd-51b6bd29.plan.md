<!-- 51b6bd29-d84c-40d5-8177-4c2b0ef2a4e2 f3799ee1-922a-4dd2-b1b2-d1b429426035 -->
# Study Mode - Product Requirements Document

## 1. Executive Summary

**Feature Name:** Study Mode

**Purpose:** Unified study experience that transforms note content into interactive study materials (Flashcards, Quizzes, and modular Study Games)

**Target Users:** All users with notes containing study-worthy content

**Priority:** High - Consolidates existing quiz feature and expands study capabilities

---

## 2. User Flow

### 2.1 Activating Study Mode from a Note

**Entry Point:** Note Detail Page (`app/note/[id].web.tsx` and `app/note/[id].native.tsx`)

**Current State:**

- Note detail page has separate buttons for "Quiz" and "Flashcards"
- Quiz button navigates to `/quizzes/create?noteId=${id}`
- Flashcards button navigates to `/flashcards?noteId=${id}`

**New State:**

1. User views a note detail page
2. Single "Study Mode" button replaces separate Quiz/Flashcards buttons
3. Clicking "Study Mode" opens Study Mode Hub (`/study-mode?noteId=${id}`)
4. Hub displays three sections:

   - **Flashcards** - Existing flashcard sets for this note
   - **Quizzes** - Existing quizzes for this note (migrated from current quiz feature)
   - **Study Games** - Available interactive games (dynamically loaded from admin-managed game library)

**Study Mode Hub UI:**

```
┌─────────────────────────────────────────┐
│  Study Mode - [Note Title]              │
├─────────────────────────────────────────┤
│  [Flashcards Section]                   │
│  • View existing sets                   │
│  • Generate new flashcards             │
│                                         │
│  [Quizzes Section]                      │
│  • View existing quizzes               │
│  • Create new quiz                      │
│                                         │
│  [Study Games Section]                 │
│  • [Game 1] [Game 2] [Game 3] ...     │
│  • Games loaded from admin panel       │
└─────────────────────────────────────────┘
```

---

## 3. Feature Breakdown

### 3.1 Flashcards (Existing - Enhanced)

**Location:** `app/flashcards.tsx`, `services/FlashcardService.ts`, `components/FlashcardStudyMode.tsx`

**Current Functionality:**

- Generate flashcards from note content using AI (Gemini)
- Flashcard sets with multiple cards
- Study mode with flip animation
- Progress tracking

**Enhancements for Study Mode:**

- Accessible from Study Mode Hub
- Maintain existing generation logic
- Add "Quick Study" mode (5-card subset)
- Integration with Study Games (flashcards can be used as game data source)

**Data Flow:**

```
Note Content → FlashcardService.generateFlashcards() → FlashcardSet → Study Mode Hub
```

---

### 3.2 Quizzes (Existing - Migrated)

**Location:** `app/quizzes/`, `services/QuizGenerationService.ts`, `services/QuizService.ts`

**Current Functionality:**

- AI-powered quiz generation from note content
- Multiple question types (multiple_choice, true_false, short_answer, fill_blank)
- Quiz taking interface
- Results and analytics

**Migration Plan:**

1. Move quiz routes from `/quizzes/*` to `/study-mode/quizzes/*`
2. Update navigation in Study Mode Hub
3. Maintain all existing quiz functionality
4. Update note detail page to route to Study Mode instead of direct quiz creation

**New Routes:**

- `/study-mode/quizzes/create?noteId=${id}` (was `/quizzes/create`)
- `/study-mode/quizzes/${quizId}` (was `/quizzes/${quizId}`)
- `/study-mode/quizzes/${quizId}/take` (was `/quizzes/${quizId}/take`)
- `/study-mode/quizzes?noteId=${id}` (was `/notes/${id}/quizzes`)

**Data Flow:**

```
Note Content → QuizGenerationService.generateQuizFromContent() → Quiz → Study Mode Hub
```

---

### 3.3 Study Games Lobby (New)

**Location:** `app/study-mode/games/index.tsx` (new)

**Purpose:** Central hub for all interactive study games

**Features:**

- Grid/list view of available games
- Games loaded dynamically from database (`study_games` table)
- Each game card shows:
  - Game name and icon
  - Description
  - Difficulty indicator
  - Enabled/disabled status (from admin panel)
- Filter by difficulty, category
- Search games by name

**Game Card UI:**

```
┌─────────────────────┐
│  [Game Icon]        │
│  Game Name          │
│  Description...     │
│  Difficulty: Medium │
│  [Play Button]      │
└─────────────────────┘
```

**Data Source:** `study_games` table (admin-managed)

---

## 4. Admin Logic - Game Library Management

### 4.1 Admin Panel Location

**File:** `app/admin/study-games.tsx` (new)

**Access:** Admin users only (role check via `useAuth().hasRole('admin')`)

### 4.2 Game Management Features

**1. View All Games**

- List of all registered games in system
- Columns: Name, Type, Status (Enabled/Disabled), Created Date, Actions

**2. Add New Game**

- Form fields:
  - Game Name (required)
  - Game Type/ID (unique identifier, e.g., "matching_game", "word_scramble")
  - Description
  - Icon (Ionicons name or custom)
  - Category (e.g., "memory", "speed", "knowledge")
  - Default Difficulty
  - Configuration Schema (JSON) - defines game-specific settings
  - Component Path (optional - for custom game components)
- Save creates entry in `study_games` table

**3. Enable/Disable Games**

- Toggle switch per game
- Disabled games don't appear in Study Games Lobby
- Instant effect (no app restart needed)

**4. Edit Game**

- Modify game metadata
- Update configuration schema
- Change enabled status

**5. Delete Game**

- Soft delete (mark as deleted, don't remove from DB)
- Or hard delete with confirmation

### 4.3 Database Schema

**Table: `study_games`**

```sql
CREATE TABLE IF NOT EXISTS study_games (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    game_type TEXT NOT NULL UNIQUE, -- e.g., "matching_game", "word_scramble"
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Ionicons name
    category TEXT, -- "memory", "speed", "knowledge", etc.
    default_difficulty TEXT CHECK (default_difficulty IN ('easy', 'medium', 'hard')),
    config_schema JSONB, -- Game-specific configuration structure
    component_path TEXT, -- Optional: path to custom React component
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_study_games_enabled ON study_games(enabled) WHERE deleted_at IS NULL;
CREATE INDEX idx_study_games_type ON study_games(game_type) WHERE deleted_at IS NULL;
```

**Table: `study_game_sessions`** (for tracking game play)

```sql
CREATE TABLE IF NOT EXISTS study_game_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    game_config JSONB, -- Game-specific configuration used
    score INTEGER,
    time_spent_seconds INTEGER,
    questions_used JSONB, -- Array of question IDs used in game
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Technical Architecture - Data Flow

### 5.1 Standardized Question Format

**Purpose:** Universal data structure that all study materials (Flashcards, Quizzes, Games) can consume

**Location:** `types/StudyMaterials.ts` (new)

**Interface:**

```typescript
export interface StandardizedQuestion {
  id: string;
  source: 'flashcard' | 'quiz' | 'generated'; // Origin of question
  sourceId?: string; // ID of original flashcard/quiz question
  questionText: string;
  answer: string;
  questionType: QuestionType; // 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
  options?: QuestionOptions; // For multiple choice: {"A": "option1", "B": "option2"}
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>; // Game-specific or extended metadata
}
```

### 5.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Note Content                              │
│  (text, HTML, audio transcription, PDF text)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Study Material Generator Service                   │
│  (StudyMaterialGeneratorService.ts - new)                    │
│                                                              │
│  • Parses note content                                      │
│  • Extracts key concepts                                    │
│  • Generates standardized questions                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Standardized Question Format                        │
│  (StandardizedQuestion[])                                   │
│                                                              │
│  • Universal question structure                             │
│  • Compatible with all study types                          │
└──────┬───────────────┬───────────────┬──────────────────────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Flashcards  │ │   Quizzes   │ │    Games    │
│   Module    │ │   Module    │ │   Module    │
│             │ │             │ │             │
│ Uses        │ │ Uses        │ │ Uses        │
│ Standardized│ │ Standardized│ │ Standardized│
│ Questions   │ │ Questions   │ │ Questions   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 5.3 Study Material Generator Service

**File:** `services/StudyMaterialGeneratorService.ts` (new)

**Responsibilities:**

1. Extract text content from notes (handles HTML, plain text, audio transcriptions)
2. Generate standardized questions using AI (Gemini)
3. Transform existing flashcards/quizzes to standardized format
4. Cache generated questions for reuse across study types

**Key Methods:**

```typescript
class StudyMaterialGeneratorService {
  // Generate standardized questions from note content
  async generateQuestionsFromNote(
    noteId: string,
    options: GenerationOptions
  ): Promise<StandardizedQuestion[]>
  
  // Convert existing flashcards to standardized format
  async convertFlashcardsToQuestions(
    flashcardSetId: string
  ): Promise<StandardizedQuestion[]>
  
  // Convert existing quiz to standardized format
  async convertQuizToQuestions(
    quizId: string
  ): Promise<StandardizedQuestion[]>
  
  // Get questions for a specific game type
  async getQuestionsForGame(
    noteId: string,
    gameType: string,
    count: number
  ): Promise<StandardizedQuestion[]>
}
```

### 5.4 Game Module Architecture

**Pattern:** Plugin-based system where games are dynamically loaded

**Base Game Interface:**

```typescript
// types/StudyGames.ts (new)
export interface StudyGame {
  gameType: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType<GameProps>;
  configSchema: JSONSchema; // Configuration structure
  validateConfig: (config: any) => boolean;
  getRequiredQuestionTypes: () => QuestionType[];
  getMinQuestions: () => number;
  getMaxQuestions: () => number;
}

export interface GameProps {
  questions: StandardizedQuestion[];
  config: GameConfig;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

export interface GameResult {
  score: number;
  timeSpent: number;
  questionsAnswered: number;
  correctAnswers: number;
  gameType: string;
}
```

**Game Registry:**

```typescript
// services/StudyGameRegistry.ts (new)
class StudyGameRegistry {
  private games: Map<string, StudyGame> = new Map();
  
  // Register a game (called during app initialization)
  registerGame(game: StudyGame): void
  
  // Get enabled games from database
  async loadEnabledGames(): Promise<StudyGame[]>
  
  // Get game by type
  getGame(gameType: string): StudyGame | undefined
  
  // Get all registered games
  getAllGames(): StudyGame[]
}
```

**Built-in Games (Initial Implementation):**

1. **Matching Game** (`matching_game`)

   - Match questions to answers
   - Drag-and-drop or click-to-match
   - Time-based scoring

2. **Word Scramble** (`word_scramble`)

   - Scrambled answer words
   - User unscrambles to answer
   - Works with short_answer questions

3. **Multiple Choice Race** (`mc_race`)

   - Rapid-fire multiple choice
   - Timer per question
   - Speed bonus points

**Game Component Structure:**

```
components/study-games/
  ├── BaseGameWrapper.tsx (common game UI wrapper)
  ├── MatchingGame.tsx
  ├── WordScrambleGame.tsx
  ├── MultipleChoiceRace.tsx
  └── index.ts (exports all games)
```

---

## 6. Implementation Plan

### Phase 1: Foundation

1. Create `StudyMaterialGeneratorService.ts`
2. Create `StandardizedQuestion` type definition
3. Create database tables (`study_games`, `study_game_sessions`)
4. Create Study Mode Hub page (`app/study-mode/index.tsx`)

### Phase 2: Migration

1. Update note detail page to show "Study Mode" button
2. Migrate quiz routes to `/study-mode/quizzes/*`
3. Integrate flashcards into Study Mode Hub
4. Update all navigation references

### Phase 3: Admin Panel

1. Create admin game management page (`app/admin/study-games.tsx`)
2. Implement CRUD operations for games
3. Add enable/disable functionality
4. Create game configuration UI

### Phase 4: Game System

1. Create `StudyGameRegistry` service
2. Implement base game wrapper component
3. Build 2-3 initial games (Matching, Word Scramble, MC Race)
4. Create game loading system from database

### Phase 5: Integration

1. Connect games to Study Mode Hub
2. Implement question generation for games
3. Add game session tracking
4. Create game results/analytics

---

## 7. File Structure

```
app/
  study-mode/
    index.tsx (Study Mode Hub - new)
    flashcards/
      index.tsx (migrated from app/flashcards.tsx)
      [setId].tsx (for viewing/studying specific flashcard sets)
    quizzes/
      index.tsx (migrated from app/notes/[id]/quizzes.tsx, now handles noteId param)
      create.tsx (migrated from app/quizzes/create.tsx)
      [id].tsx (migrated from app/quizzes/[id].tsx)
      [id]/take.tsx (migrated from app/quizzes/[id]/take.tsx)
    games/
      index.tsx (Games Lobby - new)
      [gameType].tsx (Game Play Screen - new)

app/admin/
  study-games.tsx (new - Game Management)

services/
  StudyMaterialGeneratorService.ts (new)
  StudyGameRegistry.ts (new)

components/
  study-games/
    BaseGameWrapper.tsx (new)
    MatchingGame.tsx (new)
    WordScrambleGame.tsx (new)
    MultipleChoiceRace.tsx (new)
    index.ts (new)

types/
  StudyMaterials.ts (new)
  StudyGames.ts (new)

database/
  study-games-migration.sql (new)
```

---

## 8. Design System Compliance

Following `design.json` patterns:

- Use `<ThemedView>` and `<ThemedText>` for all UI
- Use `useThemeColor` hook for colors
- Follow web layout patterns (`WebLayout`, `WebSidebar`) for web
- Use snackbar system for notifications (`WebSnackbar` for web)
- Maintain responsive design patterns
- Follow existing button and card styling

---

## 9. Feature Flags

### 9.1 Study Mode Feature Flags

**Location:** `constants/DefaultFeatureFlags.ts`, `types/FeatureFlags.ts`

**New Feature Flags Required:**

1. **`study_mode`** (Main Feature Flag)

   - **Purpose:** Master toggle for Study Mode feature
   - **Default:** `enabled: true`
   - **Premium Only:** `false` (Study Mode itself is free, but individual features may be premium)
   - **Tracking:** `true`
   - **Description:** "Enable Study Mode - unified study experience with Flashcards, Quizzes, and Interactive Games"

2. **`study_games`** (Study Games Feature Flag)

   - **Purpose:** Enable/disable the Study Games section
   - **Default:** `enabled: true`
   - **Premium Only:** `false` (can be toggled per game in admin panel)
   - **Tracking:** `true`
   - **Description:** "Enable interactive study games in Study Mode"

**Existing Feature Flags (Reused):**

- `ai_quiz` - Controls quiz generation (already exists)
- `ai_flashcards` - Controls flashcard generation (already exists)

### 9.2 Feature Flag Integration

**Study Mode Hub Access Control:**

```typescript
// In app/study-mode/index.tsx
const { isFeatureEnabled } = useFeatureFlags();

// Check if Study Mode is enabled
if (!isFeatureEnabled('study_mode')) {
  // Show message: "Study Mode is currently unavailable"
  return <UnavailableMessage />;
}

// Check individual sections
const showFlashcards = isFeatureEnabled('ai_flashcards');
const showQuizzes = isFeatureEnabled('ai_quiz');
const showGames = isFeatureEnabled('study_games');
```

**Game-Specific Feature Flags (Optional):**

- Individual games can have feature flags for granular control
- Format: `study_game_${gameType}` (e.g., `study_game_matching_game`)
- Managed in admin panel alongside game enable/disable toggle
- Allows A/B testing of specific games

### 9.3 Admin Panel Integration

**Location:** `app/admin/feature-management.tsx`

**Updates Required:**

1. Add `study_mode` and `study_games` to feature flag list
2. Display in "AI" or "Study" category
3. Allow admins to:

   - Enable/disable Study Mode globally
   - Enable/disable Study Games section
   - Set premium-only restrictions
   - Configure rollout percentages
   - Target specific user roles/environments

**Feature Flag Categories:**

- Add new category: `'study'` for Study Mode related flags
- Or use existing `'ai'` category since Study Mode uses AI generation

### 9.4 Feature Flag Checks in Services

**StudyMaterialGeneratorService:**

```typescript
// Check study_mode flag before generating materials
const isStudyModeEnabled = featureFlagService.isFeatureEnabled('study_mode', user);
if (!isStudyModeEnabled) {
  throw new Error('Study Mode is currently disabled');
}
```

**StudyGameRegistry:**

```typescript
// Check study_games flag before loading games
const areGamesEnabled = featureFlagService.isFeatureEnabled('study_games', user);
if (!areGamesEnabled) {
  return []; // Return empty array, games won't show in UI
}
```

**Note Detail Page:**

```typescript
// Only show Study Mode button if feature is enabled
const isStudyModeEnabled = isFeatureEnabled('study_mode');
const showStudyModeButton = isStudyModeEnabled && (
  isFeatureEnabled('ai_flashcards') || 
  isFeatureEnabled('ai_quiz') || 
  isFeatureEnabled('study_games')
);
```

### 9.5 Default Feature Flag Configuration

**File:** `constants/DefaultFeatureFlags.ts`

**Add to DEFAULT_FEATURE_FLAGS:**

```typescript
study_mode: {
  id: 'study_mode',
  name: 'Study Mode',
  description: 'Enable Study Mode - unified study experience with Flashcards, Quizzes, and Interactive Games',
  enabled: true,
  premiumOnly: false,
  trackingEnabled: true,
  targetEnvironments: ['development', 'staging', 'production'],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
},
study_games: {
  id: 'study_games',
  name: 'Study Games',
  description: 'Enable interactive study games in Study Mode',
  enabled: true,
  premiumOnly: false,
  trackingEnabled: true,
  targetEnvironments: ['development', 'staging', 'production'],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
},
```

### 9.6 Critical Flags List

**Update:** `services/FeatureFlagService.ts` and `hooks/useFeatureFlags.ts`

Add `study_mode` to critical flags list so it defaults to enabled during initialization:

```typescript
const criticalFlags: FeatureFlagKey[] = [
  'voice_recording', 
  'pdf_upload', 
  'ai_quiz', 
  'ai_flashcards',
  'study_mode' // Add this
];
```

### 9.7 Feature Flag Type Definitions

**File:** `types/FeatureFlags.ts`

**Add to FeatureFlagKey type:**

```typescript
export type FeatureFlagKey = 
  | 'advanced_search'
  | 'note_sharing'
  | 'ai_key_details'
  | 'ai_name_generating'
  | 'ai_summaries'
  | 'ai_transcription'
  | 'note_export'
  | 'premium_features'
  | 'voice_recording'
  | 'pdf_upload'
  | 'ai_quiz'
  | 'ai_flashcards'
  | 'ai_chat'
  | 'ai_write_essay'
  | 'rich_text_editor'
  | 'google_sign_in'
  | 'study_mode'      // Add this
  | 'study_games';   // Add this
```

---

## 10. Success Metrics

- Study Mode adoption rate (% of users who use Study Mode)
- Average study sessions per user
- Game engagement (games played per user)
- Study material generation success rate
- User satisfaction with unified study experience
- Feature flag adoption rates (study_mode, study_games)