import { supabase } from '../lib/supabase';
import {
    DifficultyLevel,
    Flashcard,
    FlashcardBulkOperation,
    FlashcardGenerationOptions,
    FlashcardGenerationResult,
    FlashcardRow,
    FlashcardSearchFilters,
    FlashcardSession,
    FlashcardSessionRow,
    FlashcardSet,
    FlashcardSetRow,
    FlashcardStats
} from '../types/Flashcards';
import { featureFlagService } from './FeatureFlagService';
import { generateFlashcardsWithGemini } from './GeminiAI';
import { featureLimitService } from './FeatureLimitService';
import { SupabaseNoteStorage } from './SupabaseNoteStorage';

export class FlashcardService {
  private static instance: FlashcardService;

  static getInstance(): FlashcardService {
    if (!FlashcardService.instance) {
      FlashcardService.instance = new FlashcardService();
    }
    return FlashcardService.instance;
  }

  // Check if user can use AI flashcards
  async canUseAIFlashcards(userId: string): Promise<{
    canUse: boolean;
    reason?: string;
    usageLeft?: number;
    limit?: number;
    isPremium?: boolean;
  }> {
    try {
      // Check if feature is enabled
      const isEnabled = featureFlagService.isFeatureEnabled('ai_flashcards');
      if (!isEnabled) {
        return {
          canUse: false,
          reason: 'AI Flashcards feature is currently disabled',
        };
      }

      // Get user's premium status and limit
      const { isPremium, limit } = await this.getUserFlashcardLimit(userId);
      
      // Premium users have unlimited access
      if (isPremium) {
        return {
          canUse: true,
          usageLeft: -1, // -1 indicates unlimited
          limit: -1,
          isPremium: true,
        };
      }

      // Check usage limits for free users
      const usage = await featureLimitService.getUserFeatureUsage(userId, 'ai_flashcards', false);
      const currentUsage = usage?.currentPeriod.usage || 0;
      
      console.log(`[FlashcardService] User ${userId} flashcard usage: ${currentUsage}/${limit}`);
      
      if (currentUsage >= limit) {
        return {
          canUse: false,
          reason: `Flashcard generation limit reached (${currentUsage}/${limit}). Upgrade to Premium for unlimited flashcards!`,
          usageLeft: 0,
          limit,
          isPremium: false,
        };
      }

      return {
        canUse: true,
        usageLeft: limit - currentUsage,
        limit,
        isPremium: false,
      };
    } catch (error) {
      console.error('[FlashcardService] Error checking AI flashcards capability:', error);
      return {
        canUse: false,
        reason: 'Unable to check feature availability',
      };
    }
  }

  // Get user's flashcard generation limit based on their plan
  private async getUserFlashcardLimit(userId: string): Promise<{ isPremium: boolean; limit: number }> {
    try {
      // Check if user has premium
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('premium')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[FlashcardService] Error fetching user profile:', error);
        return { isPremium: false, limit: 8 }; // Default free limit
      }

      const premium = profile?.premium as any;
      const isPremium = premium?.isActive === true;

      // Get limit from unified feature limits
      const limit = isPremium ? -1 : 8; // Premium = unlimited, Free = 8/month

      console.log(`[FlashcardService] User ${userId} - Premium: ${isPremium}, Limit: ${limit}`);

      return { isPremium, limit };
    } catch (error) {
      console.error('[FlashcardService] Error getting user flashcard limit:', error);
      return { isPremium: false, limit: 8 }; // Fallback to free limit
    }
  }

  // Generate flashcards from note content using AI
  async generateFlashcards(
    noteId: string,
    userId: string,
    options: FlashcardGenerationOptions,
    noteContent?: string,
    language: string = 'en'
  ): Promise<FlashcardGenerationResult> {
    try {
      console.log('🚀 FlashcardService: Starting flashcard generation');
      console.log('🚀 FlashcardService: noteId:', noteId);
      console.log('🚀 FlashcardService: userId:', userId);
      console.log('🚀 FlashcardService: options:', options);
      console.log('🚀 FlashcardService: noteContent length:', noteContent?.length || 0);
      
      const startTime = Date.now();
      
      // Check if user can use AI flashcards
      console.log('🚀 FlashcardService: Checking if user can use AI flashcards...');
      const canUse = await this.canUseAIFlashcards(userId);
      console.log('🚀 FlashcardService: canUse result:', canUse);
      
      if (!canUse.canUse) {
        console.log('🚀 FlashcardService: User cannot use AI flashcards:', canUse.reason);
        return {
          success: false,
          error: canUse.reason || 'Feature not available',
        };
      }

      // Determine the correct user ID for flashcard creation
      // For shared notes, we need to use the original note owner's ID
      let flashcardOwnerId = userId;
      
      if (noteId !== 'custom') {
        try {
          const { data: note, error: noteError } = await supabase
            .from('notes')
            .select('user_id')
            .eq('id', noteId)
            .single();

          if (!noteError && note) {
            // Check if this is a shared note
            if (note.user_id !== userId) {
              const { data: share, error: shareError } = await supabase
                .from('note_shares')
                .select('id, permission_level')
                .eq('note_id', noteId)
                .eq('shared_with_user_id', userId)
                .eq('is_active', true)
                .single();

              if (!shareError && share) {
                // This is a shared note, use the original owner's ID for flashcard creation
                flashcardOwnerId = note.user_id;
                console.log('🚀 FlashcardService: Using original owner ID for shared note:', flashcardOwnerId);
              }
            }
          }
        } catch (error) {
          console.warn('🚀 FlashcardService: Could not determine note ownership, using current user ID');
        }
      }

      // Validate options
      if (options.numCards < 5 || options.numCards > 20) {
        return {
          success: false,
          error: 'Number of cards must be between 5 and 20',
        };
      }

      // Use provided note content or get from note service
      let contentToUse = noteContent;
      if (!contentToUse && noteId !== 'custom') {
        try {
          // Get actual note content from SupabaseNoteStorage
          const noteStorage = new SupabaseNoteStorage();
          noteStorage.setCurrentUser(userId);
          const note = await noteStorage.getNote(noteId);
          if (note && note.content) {
            contentToUse = note.content;
          } else if (note && note.summary) {
            contentToUse = note.summary;
          } else {
            throw new Error('Note not found or has no content');
          }
        } catch (error) {
          console.error('Error getting note content:', error);
          return {
            success: false,
            error: 'Failed to retrieve note content for flashcard generation',
          };
        }
      }
      
      if (!contentToUse || contentToUse.trim().length < 50) {
        return {
          success: false,
          error: 'Note content must be at least 50 characters long',
        };
      }
      
      // Generate flashcards using AI
      console.log('🚀 FlashcardService: About to call Gemini AI for flashcard generation...');
      console.log('🚀 FlashcardService: Content to use length:', contentToUse.length);
      
      const aiResult = await generateFlashcardsWithGemini(contentToUse, {
        numCards: options.numCards,
        difficulty: options.difficulty,
        focusAreas: options.focusAreas,
        includeExplanations: options.includeExplanations,
        language: language,
      });

      console.log('🚀 FlashcardService: AI generation result:', aiResult);

      if (!aiResult.success || !aiResult.flashcards || aiResult.flashcards.length === 0) {
        console.log('🚀 FlashcardService: AI generation failed:', aiResult.error);
        return {
          success: false,
          error: aiResult.error || 'Failed to generate flashcards with AI',
        };
      }

      try {
        // Try to create database records using the correct owner ID
        const flashcardSet = await this.createFlashcardSet(noteId, flashcardOwnerId, {
          title: `AI Flashcards (${options.numCards} cards)`,
          description: `AI-generated flashcards with ${options.difficulty} difficulty level`,
        });

        // Create individual flashcards using the correct owner ID
        const flashcards: Flashcard[] = [];
        for (const aiCard of aiResult.flashcards) {
          const flashcard = await this.createFlashcard(flashcardSet.id, flashcardOwnerId, {
            question: aiCard.question,
            answer: aiCard.answer,
            explanation: aiCard.explanation,
            difficulty: aiCard.difficulty,
            category: aiCard.category,
            tags: aiCard.tags,
          });
          flashcards.push(flashcard);
        }

        // Update flashcard set with generated cards using the correct owner ID
        const updatedSet = await this.getFlashcardSet(flashcardSet.id, flashcardOwnerId);
        
        // Record usage for the current user (not the owner)
        await featureLimitService.recordFeatureUsage(userId, 'ai_flashcards', 1, false, 'count');

        const generationTime = Date.now() - startTime;
        
        return {
          success: true,
          flashcardSet: updatedSet,
          generationTime,
        };
      } catch (dbError) {
        console.warn('Database operations failed, returning AI-generated flashcards without saving:', dbError);
        
        // Return the AI-generated flashcards without saving to database
        const mockFlashcardSet: FlashcardSet = {
          id: `temp_${Date.now()}`,
          noteId: noteId,
          userId: flashcardOwnerId, // Use the correct owner ID
          title: `AI Flashcards (${options.numCards} cards)`,
          description: `AI-generated flashcards with ${options.difficulty} difficulty level`,
          totalCards: aiResult.flashcards.length,
          masteredCards: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          flashcards: aiResult.flashcards.map((aiCard, index) => ({
            id: `temp_${Date.now()}_${index}`,
            flashcardSetId: `temp_${Date.now()}`,
            noteId: noteId,
            userId: flashcardOwnerId, // Use the correct owner ID
            question: aiCard.question,
            answer: aiCard.answer,
            explanation: aiCard.explanation,
            difficulty: aiCard.difficulty,
            category: aiCard.category,
            tags: aiCard.tags,
            isCorrect: undefined,
            lastReviewed: undefined,
            reviewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        };

        const generationTime = Date.now() - startTime;
        
        return {
          success: true,
          flashcardSet: mockFlashcardSet,
          generationTime,
        };
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Create a new flashcard set
  async createFlashcardSet(
    noteId: string,
    userId: string,
    data: { title: string; description?: string }
  ): Promise<FlashcardSet> {
    try {
      const { data: row, error } = await supabase
        .from('flashcard_sets')
        .insert({
          note_id: noteId,
          user_id: userId,
          title: data.title,
          description: data.description,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapFlashcardSetRow(row);
    } catch (error) {
      console.error('Error creating flashcard set:', error);
      throw error;
    }
  }

  // Get a flashcard set by ID
  async getFlashcardSet(setId: string, userId: string): Promise<FlashcardSet> {
    try {
      const { data: setRow, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', setId)
        .eq('user_id', userId)
        .single();

      if (setError) throw setError;

      const { data: flashcardRows, error: flashcardError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('flashcard_set_id', setId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (flashcardError) throw flashcardError;

      const flashcards = flashcardRows.map(row => this.mapFlashcardRow(row));
      
      return {
        ...this.mapFlashcardSetRow(setRow),
        flashcards,
      };
    } catch (error) {
      console.error('Error getting flashcard set:', error);
      throw error;
    }
  }

  // Get all flashcard sets for a note
  async getFlashcardSetsForNote(noteId: string, userId: string): Promise<FlashcardSet[]> {
    try {
      // First, check if the user owns the note or has access to it as a shared note
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('user_id, id')
        .eq('id', noteId)
        .single();

      if (noteError) {
        console.error('Error fetching note for flashcard access:', noteError);
        throw noteError;
      }

      let ownerUserId = note.user_id;
      let hasAccess = false;

      // Check if user owns the note
      if (note.user_id === userId) {
        hasAccess = true;
      } else {
        // Check if note is shared with the user
        const { data: share, error: shareError } = await supabase
          .from('note_shares')
          .select('id, permission_level')
          .eq('note_id', noteId)
          .eq('shared_with_user_id', userId)
          .eq('is_active', true)
          .single();

        if (!shareError && share) {
          hasAccess = true;
          // For shared notes, we need to get flashcards created by the original owner
          // but we'll still use the current user's ID for the query to respect RLS policies
        }
      }

      if (!hasAccess) {
        console.log('User does not have access to note for flashcards');
        return [];
      }

      // Get flashcard sets - for owned notes, use the owner's ID; for shared notes, 
      // we need to get sets created by the original owner but accessible to the current user
      const { data: setRows, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('note_id', noteId)
        .eq('user_id', ownerUserId) // Use the original owner's ID
        .order('created_at', { ascending: false });

      if (setError) throw setError;

      const sets: FlashcardSet[] = [];
      for (const setRow of setRows) {
        const { data: flashcardRows, error: flashcardError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('flashcard_set_id', setRow.id)
          .eq('user_id', ownerUserId) // Use the original owner's ID
          .order('created_at', { ascending: true });

        if (flashcardError) throw flashcardError;

        const flashcards = flashcardRows.map(row => this.mapFlashcardRow(row));
        sets.push({
          ...this.mapFlashcardSetRow(setRow),
          flashcards,
        });
      }

      return sets;
    } catch (error) {
      console.error('Error getting flashcard sets for note:', error);
      throw error;
    }
  }

  // Get all flashcard sets for a user
  async getFlashcardSetsByUser(userId: string): Promise<FlashcardSet[]> {
    try {
      console.log('🔍 FlashcardService: Getting flashcard sets for user:', userId);
      
      const { data: setRows, error: setError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (setError) {
        console.error('❌ FlashcardService: Error fetching flashcard sets:', setError);
        throw setError;
      }

      console.log('🔍 FlashcardService: Found flashcard sets:', setRows);

      const sets: FlashcardSet[] = [];
      for (const setRow of setRows) {
        console.log('🔍 FlashcardService: Processing set:', setRow.id);
        
        const { data: flashcardRows, error: flashcardError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('flashcard_set_id', setRow.id)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (flashcardError) {
          console.error('❌ FlashcardService: Error fetching flashcards for set:', setRow.id, flashcardError);
          throw flashcardError;
        }

        console.log('🔍 FlashcardService: Found flashcards for set:', setRow.id, flashcardRows);

        const flashcards = flashcardRows.map(row => this.mapFlashcardRow(row));
        sets.push({
          ...this.mapFlashcardSetRow(setRow),
          flashcards,
        });
      }

      console.log('🔍 FlashcardService: Returning processed sets:', sets);
      return sets;
    } catch (error) {
      console.error('❌ FlashcardService: Error getting flashcard sets by user:', error);
      throw error;
    }
  }

  // Create a new flashcard
  async createFlashcard(
    setId: string,
    userId: string,
    data: {
      question: string;
      answer: string;
      explanation?: string;
      difficulty: DifficultyLevel;
      category?: string;
      tags?: string[];
    }
  ): Promise<Flashcard> {
    try {
      const { data: row, error } = await supabase
        .from('flashcards')
        .insert({
          flashcard_set_id: setId,
          note_id: (await this.getFlashcardSet(setId, userId)).noteId,
          user_id: userId,
          question: data.question,
          answer: data.answer,
          explanation: data.explanation,
          difficulty: data.difficulty,
          category: data.category,
          tags: data.tags,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapFlashcardRow(row);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }
  }

  // Update a flashcard
  async updateFlashcard(
    flashcardId: string,
    userId: string,
    updates: Partial<Flashcard>
  ): Promise<Flashcard> {
    try {
      const { data: row, error } = await supabase
        .from('flashcards')
        .update({
          question: updates.question,
          answer: updates.answer,
          explanation: updates.explanation,
          difficulty: updates.difficulty,
          category: updates.category,
          tags: updates.tags,
        })
        .eq('id', flashcardId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapFlashcardRow(row);
    } catch (error) {
      console.error('Error updating flashcard:', error);
      throw error;
    }
  }

  // Delete a flashcard
  async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', flashcardId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      throw error;
    }
  }

  // Start a study session
  async startStudySession(setId: string, userId: string): Promise<FlashcardSession> {
    try {
      const flashcardSet = await this.getFlashcardSet(setId, userId);
      
      const { data: row, error } = await supabase
        .from('flashcard_sessions')
        .insert({
          user_id: userId,
          flashcard_set_id: setId,
          total_cards: flashcardSet.totalCards,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapFlashcardSessionRow(row);
    } catch (error) {
      console.error('Error starting study session:', error);
      throw error;
    }
  }

  // End a study session
  async endStudySession(
    sessionId: string,
    userId: string,
    results: {
      correctAnswers: number;
      incorrectAnswers: number;
      timeSpent: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('flashcard_sessions')
        .update({
          end_time: new Date().toISOString(),
          correct_answers: results.correctAnswers,
          incorrect_answers: results.incorrectAnswers,
          time_spent: results.timeSpent,
        })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error ending study session:', error);
      throw error;
    }
  }

  // Update flashcard review status
  async updateFlashcardReview(
    flashcardId: string,
    userId: string,
    isCorrect: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          is_correct: isCorrect,
          last_reviewed: new Date().toISOString(),
          review_count: supabase.rpc('increment', { row_id: flashcardId, column_name: 'review_count' }),
        })
        .eq('id', flashcardId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating flashcard review:', error);
      throw error;
    }
  }

  // Get study statistics for a user
  async getStudyStats(userId: string): Promise<FlashcardStats> {
    try {
      // Get total sets
      const { count: totalSets } = await supabase
        .from('flashcard_sets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get total cards
      const { count: totalCards } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get mastered cards
      const { count: masteredCards } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('review_count', 3)
        .eq('is_correct', true);

      // Get study sessions
      const { count: totalStudySessions } = await supabase
        .from('flashcard_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get total study time and accuracy
      const { data: sessions } = await supabase
        .from('flashcard_sessions')
        .select('time_spent, correct_answers, incorrect_answers')
        .eq('user_id', userId);

      let totalStudyTime = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;

      sessions?.forEach(session => {
        totalStudyTime += session.time_spent || 0;
        totalCorrect += session.correct_answers || 0;
        totalIncorrect += session.incorrect_answers || 0;
      });

      const averageAccuracy = totalCorrect + totalIncorrect > 0 
        ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 
        : 0;

      // Calculate study streak (simplified - can be enhanced later)
      const { data: recentSessions } = await supabase
        .from('flashcard_sessions')
        .select('start_time')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(30);

      let studyStreak = 0;
      if (recentSessions && recentSessions.length > 0) {
        // Simple streak calculation - can be enhanced
        studyStreak = Math.min(recentSessions.length, 7); // Placeholder
      }

      const lastStudied = recentSessions?.[0]?.start_time 
        ? new Date(recentSessions[0].start_time)
        : undefined;

      return {
        totalSets: totalSets || 0,
        totalCards: totalCards || 0,
        masteredCards: masteredCards || 0,
        totalStudySessions: totalStudySessions || 0,
        totalStudyTime: Math.round(totalStudyTime / 60), // Convert to minutes
        averageAccuracy: Math.round(averageAccuracy * 100) / 100, // Round to 2 decimal places
        studyStreak,
        lastStudied,
      };
    } catch (error) {
      console.error('Error getting study stats:', error);
      throw error;
    }
  }

  // Search flashcards with filters
  async searchFlashcards(
    userId: string,
    filters: FlashcardSearchFilters
  ): Promise<Flashcard[]> {
    try {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId);

      if (filters.query) {
        query = query.or(`question.ilike.%${filters.query}%,answer.ilike.%${filters.query}%`);
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.mastered !== undefined) {
        if (filters.mastered) {
          query = query.gte('review_count', 3).eq('is_correct', true);
        } else {
          query = query.or('review_count.lt.3,is_correct.is.null');
        }
      }

      if (filters.lastReviewedAfter) {
        query = query.gte('last_reviewed', filters.lastReviewedAfter.toISOString());
      }

      if (filters.lastReviewedBefore) {
        query = query.lte('last_reviewed', filters.lastReviewedBefore.toISOString());
      }

      const { data: rows, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return rows.map(row => this.mapFlashcardRow(row));
    } catch (error) {
      console.error('Error searching flashcards:', error);
      throw error;
    }
  }

  // Bulk operations on flashcards
  async bulkOperation(
    userId: string,
    operation: FlashcardBulkOperation
  ): Promise<void> {
    try {
      switch (operation.operation) {
        case 'delete':
          await supabase
            .from('flashcards')
            .delete()
            .in('id', operation.flashcardIds)
            .eq('user_id', userId);
          break;

        case 'update':
          if (operation.updates) {
            await supabase
              .from('flashcards')
              .update(operation.updates)
              .in('id', operation.flashcardIds)
              .eq('user_id', userId);
          }
          break;

        case 'move':
          if (operation.targetSetId) {
            await supabase
              .from('flashcards')
              .update({ flashcard_set_id: operation.targetSetId })
              .in('id', operation.flashcardIds)
              .eq('user_id', userId);
          }
          break;

        case 'duplicate':
          // Implementation for duplication
          for (const flashcardId of operation.flashcardIds) {
            const flashcard = await this.getFlashcardById(flashcardId, userId);
            if (flashcard) {
              await this.createFlashcard(flashcard.flashcardSetId, userId, {
                question: flashcard.question,
                answer: flashcard.answer,
                explanation: flashcard.explanation,
                difficulty: flashcard.difficulty,
                category: flashcard.category,
                tags: flashcard.tags,
              });
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw error;
    }
  }

  // Helper method to get flashcard by ID
  private async getFlashcardById(flashcardId: string, userId: string): Promise<Flashcard | null> {
    try {
      const { data: row, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .eq('user_id', userId)
        .single();

      if (error) return null;

      return this.mapFlashcardRow(row);
    } catch (error) {
      return null;
    }
  }

  // Helper methods to map database rows to TypeScript interfaces
  private mapFlashcardSetRow(row: FlashcardSetRow): FlashcardSet {
    return {
      id: row.id,
      noteId: row.note_id,
      userId: row.user_id,
      title: row.title,
      description: row.description || undefined,
      flashcards: [], // Will be populated separately
      totalCards: row.total_cards,
      masteredCards: row.mastered_cards,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapFlashcardRow(row: FlashcardRow): Flashcard {
    return {
      id: row.id,
      flashcardSetId: row.flashcard_set_id,
      noteId: row.note_id,
      userId: row.user_id,
      question: row.question,
      answer: row.answer,
      explanation: row.explanation || undefined,
      difficulty: row.difficulty as DifficultyLevel,
      category: row.category || undefined,
      tags: row.tags || undefined,
      isCorrect: row.is_correct || undefined,
      lastReviewed: row.last_reviewed ? new Date(row.last_reviewed) : undefined,
      reviewCount: row.review_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapFlashcardSessionRow(row: FlashcardSessionRow): FlashcardSession {
    return {
      id: row.id,
      userId: row.user_id,
      flashcardSetId: row.flashcard_set_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      totalCards: row.total_cards,
      correctAnswers: row.correct_answers,
      incorrectAnswers: row.incorrect_answers,
      timeSpent: row.time_spent,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const flashcardService = FlashcardService.getInstance();
