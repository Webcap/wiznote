import { supabase } from '../lib/supabase';
import {
    QuestionType,
    Quiz,
    QUIZ_CONSTRAINTS,
    QuizCreationOptions,
    QuizDifficulty,
    QuizListResponse,
    QuizQuestion,
    QuizQuestionWithoutQuiz,
    QuizSearchFilters,
    QuizWithoutQuestions
} from '../types/Quizzes';
import { featureFlagService } from './FeatureFlagService';
import { simpleUsageService } from './SimpleUsageService';

export class QuizService {
  private static instance: QuizService;

  static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService();
    }
    return QuizService.instance;
  }

  // Check if user can use AI quizzes
  async canUseAIQuizzes(userId: string): Promise<{
    canUse: boolean;
    reason?: string;
    usageLeft?: number;
  }> {
    try {
      // Check if feature is enabled
      const isEnabled = featureFlagService.isFeatureEnabled('ai_quiz');
      if (!isEnabled) {
        return {
          canUse: false,
          reason: 'AI Quiz feature is currently disabled',
        };
      }

      // Check usage limits
      const currentUsage = await simpleUsageService.getUsage(userId, 'ai_quiz');
      const limit = await this.getUserQuizLimit(userId);
      
      if (currentUsage >= limit) {
        return {
          canUse: false,
          reason: 'Quiz generation limit reached',
          usageLeft: 0,
        };
      }

      return {
        canUse: true,
        usageLeft: limit - currentUsage,
      };
    } catch (error) {
      console.error('Error checking AI quiz capability:', error);
      return {
        canUse: false,
        reason: 'Unable to check feature availability',
      };
    }
  }

  // Get user's quiz generation limit based on their plan
  private async getUserQuizLimit(userId: string): Promise<number> {
    try {
      // This would integrate with your plan management system
      // For now, return a default limit
      return 10; // Default limit, will be refined with plan integration
    } catch (error) {
      console.error('Error getting user quiz limit:', error);
      return 5; // Fallback limit
    }
  }

  // Create a new quiz
  async createQuiz(options: QuizCreationOptions): Promise<Quiz> {
    try {
      console.log('🚀 QuizService: Creating quiz with options:', options);

      // Validate input
      this.validateQuizCreationOptions(options);

      // Check if user can create quizzes
      const canUse = await this.canUseAIQuizzes(options.userId);
      if (!canUse.canUse) {
        throw new Error(canUse.reason || 'Cannot create quiz');
      }

      // Create quiz record
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          note_id: options.noteId,
          user_id: options.userId,
          title: options.title,
          description: options.description,
          difficulty: options.generationOptions.difficulty,
          question_count: options.generationOptions.questionCount,
          question_types: options.generationOptions.questionTypes,
          source_type: options.generationOptions.sourceType,
          source_content: options.generationOptions.sourceContent,
          generation_options: options.generationOptions,
          status: 'active',
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error creating quiz:', quizError);
        throw new Error(`Failed to create quiz: ${quizError.message}`);
      }

      // Create quiz tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.createQuizTags(quizData.id, options.tags);
      }

      // Track usage
      await simpleUsageService.recordUsage(options.userId, 'ai_quiz', 1);

      console.log('✅ QuizService: Quiz created successfully:', quizData.id);
      
      // Return quiz with empty questions array (questions will be added separately)
      return {
        ...this.mapDatabaseQuizToQuiz(quizData),
        questions: [],
        tags: options.tags || [],
      };
    } catch (error) {
      console.error('❌ QuizService: Error creating quiz:', error);
      throw error;
    }
  }

  // Get quiz by ID with questions
  async getQuiz(quizId: string, includeQuestions: boolean = true): Promise<Quiz> {
    try {
      console.log('🔍 QuizService: Getting quiz:', quizId);

      // Get quiz data
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) {
        console.error('Error fetching quiz:', quizError);
        throw new Error(`Quiz not found: ${quizError.message}`);
      }

      let questions: QuizQuestion[] = [];
      let tags: string[] = [];

      if (includeQuestions) {
        // Get questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index');

        if (questionsError) {
          console.error('Error fetching quiz questions:', questionsError);
          throw new Error(`Failed to fetch questions: ${questionsError.message}`);
        }

        questions = questionsData.map(q => this.mapDatabaseQuestionToQuestion(q, quizId));

        // Get tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('quiz_tags')
          .select('tag')
          .eq('quiz_id', quizId);

        if (tagsError) {
          console.error('Error fetching quiz tags:', tagsError);
        } else {
          tags = tagsData.map(tag => tag.tag);
        }
      }

      const quiz = this.mapDatabaseQuizToQuiz(quizData);
      return {
        ...quiz,
        questions,
        tags,
      };
    } catch (error) {
      console.error('❌ QuizService: Error getting quiz:', error);
      throw error;
    }
  }

  // Get user's quizzes with optional filtering
  async getUserQuizzes(
    userId: string,
    filters: QuizSearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<QuizListResponse> {
    try {
      console.log('🔍 QuizService: Getting user quizzes for:', userId);

      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      // Apply filters
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters.questionTypes && filters.questionTypes.length > 0) {
        query = query.overlaps('question_types', filters.questionTypes);
      }
      if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter.toISOString());
      }
      if (filters.createdBefore) {
        query = query.lte('created_at', filters.createdBefore.toISOString());
      }

      // Get paginated results
      const { data: quizzesData, error: quizzesError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (quizzesError) {
        console.error('Error fetching quizzes:', quizzesError);
        throw new Error(`Failed to fetch quizzes: ${quizzesError.message}`);
      }

      // Get total count separately
      const { count, error: countError } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting quizzes:', countError);
      }

      const quizzes = quizzesData.map((quizData: any) => ({
        ...this.mapDatabaseQuizToQuiz(quizData),
        questions: [], // Questions are loaded separately when needed
        tags: [], // Tags are loaded separately when needed
      }));
      const hasMore = offset + limit < (count || 0);

      return {
        quizzes,
        total: count || 0,
        hasMore,
        filters,
      };
    } catch (error) {
      console.error('❌ QuizService: Error getting user quizzes:', error);
      throw error;
    }
  }

  // Update quiz
  async updateQuiz(quizId: string, updates: Partial<QuizWithoutQuestions>): Promise<Quiz> {
    try {
      console.log('🔄 QuizService: Updating quiz:', quizId);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .update({
          title: updates.title,
          description: updates.description,
          difficulty: updates.difficulty,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quizId)
        .select()
        .single();

      if (quizError) {
        console.error('Error updating quiz:', quizError);
        throw new Error(`Failed to update quiz: ${quizError.message}`);
      }

      // Update tags if provided
      if (updates.tags) {
        await this.updateQuizTags(quizId, updates.tags);
      }

      const quiz = this.mapDatabaseQuizToQuiz(quizData);
      return {
        ...quiz,
        questions: [], // Questions are managed separately
        tags: updates.tags || [],
      };
    } catch (error) {
      console.error('❌ QuizService: Error updating quiz:', error);
      throw error;
    }
  }

  // Delete quiz (soft delete)
  async deleteQuiz(quizId: string, userId: string): Promise<void> {
    try {
      console.log('🗑️ QuizService: Deleting quiz:', quizId);

      // Verify ownership
      const quiz = await this.getQuiz(quizId, false);
      if (quiz.userId !== userId) {
        throw new Error('Unauthorized to delete this quiz');
      }

      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', quizId);

      if (error) {
        console.error('Error deleting quiz:', error);
        throw new Error(`Failed to delete quiz: ${error.message}`);
      }

      console.log('✅ QuizService: Quiz deleted successfully');
    } catch (error) {
      console.error('❌ QuizService: Error deleting quiz:', error);
      throw error;
    }
  }

  // Archive quiz
  async archiveQuiz(quizId: string, userId: string): Promise<void> {
    try {
      console.log('📦 QuizService: Archiving quiz:', quizId);

      // Verify ownership
      const quiz = await this.getQuiz(quizId, false);
      if (quiz.userId !== userId) {
        throw new Error('Unauthorized to archive this quiz');
      }

      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', quizId);

      if (error) {
        console.error('Error archiving quiz:', error);
        throw new Error(`Failed to archive quiz: ${error.message}`);
      }

      console.log('✅ QuizService: Quiz archived successfully');
    } catch (error) {
      console.error('❌ QuizService: Error archiving quiz:', error);
      throw error;
    }
  }

  // Create quiz tags
  private async createQuizTags(quizId: string, tags: string[]): Promise<void> {
    try {
      if (tags.length === 0) return;

      const tagRecords = tags.map(tag => ({
        quiz_id: quizId,
        tag: tag.trim(),
      }));

      const { error } = await supabase
        .from('quiz_tags')
        .insert(tagRecords);

      if (error) {
        console.error('Error creating quiz tags:', error);
        throw new Error(`Failed to create tags: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating quiz tags:', error);
      throw error;
    }
  }

  // Update quiz tags
  private async updateQuizTags(quizId: string, newTags: string[]): Promise<void> {
    try {
      // Delete existing tags
      const { error: deleteError } = await supabase
        .from('quiz_tags')
        .delete()
        .eq('quiz_id', quizId);

      if (deleteError) {
        console.error('Error deleting existing tags:', deleteError);
        throw new Error(`Failed to delete existing tags: ${deleteError.message}`);
      }

      // Create new tags
      if (newTags.length > 0) {
        await this.createQuizTags(quizId, newTags);
      }
    } catch (error) {
      console.error('Error updating quiz tags:', error);
      throw error;
    }
  }

  // Validate quiz creation options
  private validateQuizCreationOptions(options: QuizCreationOptions): void {
    if (!options.title || options.title.length < QUIZ_CONSTRAINTS.MIN_TITLE_LENGTH) {
      throw new Error(`Title must be at least ${QUIZ_CONSTRAINTS.MIN_TITLE_LENGTH} characters long`);
    }

    if (options.title.length > QUIZ_CONSTRAINTS.MAX_TITLE_LENGTH) {
      throw new Error(`Title must be no more than ${QUIZ_CONSTRAINTS.MAX_TITLE_LENGTH} characters long`);
    }

    if (options.description && options.description.length > QUIZ_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must be no more than ${QUIZ_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters long`);
    }

    if (options.generationOptions.questionCount < QUIZ_CONSTRAINTS.MIN_QUESTIONS || 
        options.generationOptions.questionCount > QUIZ_CONSTRAINTS.MAX_QUESTIONS) {
      throw new Error(`Question count must be between ${QUIZ_CONSTRAINTS.MIN_QUESTIONS} and ${QUIZ_CONSTRAINTS.MAX_QUESTIONS}`);
    }

    if (options.tags && options.tags.length > QUIZ_CONSTRAINTS.MAX_TAGS) {
      throw new Error(`Maximum ${QUIZ_CONSTRAINTS.MAX_TAGS} tags allowed`);
    }

    if (options.tags) {
      for (const tag of options.tags) {
        if (tag.length > QUIZ_CONSTRAINTS.MAX_TAG_LENGTH) {
          throw new Error(`Tag "${tag}" is too long. Maximum ${QUIZ_CONSTRAINTS.MAX_TAG_LENGTH} characters allowed`);
        }
      }
    }
  }

  // Database mapping helpers
  private mapDatabaseQuizToQuiz(dbQuiz: any): QuizWithoutQuestions {
    return {
      id: dbQuiz.id,
      noteId: dbQuiz.note_id,
      userId: dbQuiz.user_id,
      title: dbQuiz.title,
      description: dbQuiz.description,
      difficulty: dbQuiz.difficulty,
      questionCount: dbQuiz.question_count,
      questionTypes: dbQuiz.question_types,
      sourceType: dbQuiz.source_type,
      sourceContent: dbQuiz.source_content,
      generationOptions: dbQuiz.generation_options,
      status: dbQuiz.status,
      tags: [], // Tags are loaded separately
      createdAt: new Date(dbQuiz.created_at),
      updatedAt: new Date(dbQuiz.updated_at),
    };
  }

  private mapDatabaseQuestionToQuestion(dbQuestion: any, quizId?: string): QuizQuestion {
    return {
      id: dbQuestion.id,
      quizId: quizId || dbQuestion.quiz_id,
      questionText: dbQuestion.question_text,
      questionType: dbQuestion.question_type,
      correctAnswer: dbQuestion.correct_answer,
      explanation: dbQuestion.explanation,
      difficulty: dbQuestion.difficulty,
      options: dbQuestion.options,
      orderIndex: dbQuestion.order_index,
      points: dbQuestion.points,
      createdAt: new Date(dbQuestion.created_at),
      updatedAt: new Date(dbQuestion.updated_at),
    };
  }

  // Get quiz statistics for a user
  async getUserQuizStatistics(userId: string): Promise<{
    totalQuizzes: number;
    totalQuestions: number;
    averageQuestionsPerQuiz: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    questionTypeDistribution: { [key in QuestionType]: number };
  }> {
    try {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('question_count, difficulty, question_types, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching quiz statistics:', error);
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }

      const totalQuizzes = quizzes.length;
      const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.question_count, 0);
      const averageQuestionsPerQuiz = totalQuizzes > 0 ? totalQuestions / totalQuizzes : 0;

      const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
      const questionTypeDistribution = {
        multiple_choice: 0,
        true_false: 0,
        short_answer: 0,
        fill_blank: 0,
      };

      quizzes.forEach(quiz => {
        difficultyDistribution[quiz.difficulty as QuizDifficulty]++;
        quiz.question_types.forEach((type: QuestionType) => {
          questionTypeDistribution[type]++;
        });
      });

      return {
        totalQuizzes,
        totalQuestions,
        averageQuestionsPerQuiz,
        difficultyDistribution,
        questionTypeDistribution,
      };
    } catch (error) {
      console.error('❌ QuizService: Error getting user statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const quizService = QuizService.getInstance();
