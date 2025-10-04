import { supabase } from '../lib/supabase';
import {
    MasteryLevel,
    QuizAnswer,
    QuizAnswerSubmission,
    QuizProgressData,
    QuizQuestion,
    QuizResult,
    QuizSession,
    QuizStartOptions
} from '../types/Quizzes';
import { quizService } from './QuizService';

export class QuizSessionService {
  private static instance: QuizSessionService;

  static getInstance(): QuizSessionService {
    if (!QuizSessionService.instance) {
      QuizSessionService.instance = new QuizSessionService();
    }
    return QuizSessionService.instance;
  }

  // Start a new quiz session
  async startQuizSession(options: QuizStartOptions): Promise<QuizSession> {
    try {
      console.log('🚀 QuizSessionService: Starting quiz session for quiz:', options.quizId);

      // Get the quiz to validate it exists and get question count
      const quiz = await quizService.getQuiz(options.quizId, true);
      
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      if (quiz.questions.length === 0) {
        throw new Error('Quiz has no questions');
      }

      // Initialize progress data
      const progressData: QuizProgressData = {
        currentQuestionIndex: 0,
        answeredQuestions: [],
        timePerQuestion: {},
        hintsUsed: {},
        currentScore: 0,
        estimatedTimeRemaining: this.calculateEstimatedTime(quiz.questions.length, options.timeLimit),
      };

      // Create session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          user_id: options.userId,
          quiz_id: options.quizId,
          start_time: new Date().toISOString(),
          total_questions: quiz.questions.length,
          status: 'in_progress',
          progress_data: progressData,
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating quiz session:', sessionError);
        throw new Error(`Failed to start quiz session: ${sessionError.message}`);
      }

      const session = this.mapDatabaseSessionToSession(sessionData);
      
      console.log('✅ QuizSessionService: Quiz session started successfully:', session.id);
      return session;
    } catch (error) {
      console.error('❌ QuizSessionService: Error starting quiz session:', error);
      throw error;
    }
  }

  // Submit an answer for a question
  async submitAnswer(submission: QuizAnswerSubmission): Promise<QuizAnswer> {
    try {
      console.log('📝 QuizSessionService: Submitting answer for question:', submission.questionId);

      // Get the session and question to validate
      const session = await this.getSession(submission.sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      if (session.status !== 'in_progress') {
        throw new Error('Cannot submit answer to completed session');
      }

      // Get the question to check the correct answer
      const quiz = await quizService.getQuiz(session.quizId, true);
      const question = quiz.questions.find(q => q.id === submission.questionId);
      
      if (!question) {
        throw new Error('Question not found');
      }

      // Check if answer is correct
      const isCorrect = this.checkAnswer(question, submission.answer);
      const pointsEarned = isCorrect ? question.points : 0;

      // Create answer record
      const { data: answerData, error: answerError } = await supabase
        .from('quiz_answers')
        .insert({
          session_id: submission.sessionId,
          question_id: submission.questionId,
          user_answer: submission.answer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          time_spent: submission.timeSpent,
        })
        .select()
        .single();

      if (answerError) {
        console.error('Error saving answer:', answerError);
        throw new Error(`Failed to save answer: ${answerError.message}`);
      }

      // Update session progress
      await this.updateSessionProgress(submission.sessionId, submission.questionId, isCorrect, pointsEarned, submission.timeSpent);

      const answer = this.mapDatabaseAnswerToAnswer(answerData);
      
      console.log('✅ QuizSessionService: Answer submitted successfully');
      return answer;
    } catch (error) {
      console.error('❌ QuizSessionService: Error submitting answer:', error);
      throw error;
    }
  }

  // Complete a quiz session
  async completeQuizSession(sessionId: string): Promise<QuizResult> {
    try {
      console.log('🏁 QuizSessionService: Completing quiz session:', sessionId);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      if (session.status === 'completed') {
        throw new Error('Session already completed');
      }

      // Get all answers for the session
      const { data: answersData, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('session_id', sessionId);

      if (answersError) {
        console.error('Error fetching session answers:', answersError);
        throw new Error(`Failed to fetch answers: ${answersError.message}`);
      }

      const answers = answersData.map(this.mapDatabaseAnswerToAnswer);
      
      // Calculate final results
      const totalQuestions = session.totalQuestions;
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalScore = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
      const totalTimeSpent = answers.reduce((sum, a) => sum + a.timeSpent, 0);
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;

      // Calculate difficulty breakdown
      const quiz = await quizService.getQuiz(session.quizId, true);
      const difficultyBreakdown = this.calculateDifficultyBreakdown(quiz.questions, answers);

      // Calculate question type breakdown
      const questionTypeBreakdown = this.calculateQuestionTypeBreakdown(quiz.questions, answers);

      // Update session status
      const { error: updateError } = await supabase
        .from('quiz_sessions')
        .update({
          end_time: new Date().toISOString(),
          score: totalScore,
          correct_answers: correctAnswers,
          time_spent: totalTimeSpent,
          status: 'completed',
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session status:', updateError);
        throw new Error(`Failed to complete session: ${updateError.message}`);
      }

      // Update analytics
      await this.updateQuizAnalytics(session.quizId, session.userId, totalScore, totalTimeSpent);

      const result: QuizResult = {
        sessionId,
        quizId: session.quizId,
        userId: session.userId,
        score: totalScore,
        totalQuestions,
        correctAnswers,
        accuracy,
        timeSpent: totalTimeSpent,
        averageTimePerQuestion,
        difficultyBreakdown,
        questionTypeBreakdown,
        completedAt: new Date(),
      };

      console.log('✅ QuizSessionService: Quiz session completed successfully');
      console.log('📊 QuizSessionService: Final score:', totalScore, '/', totalQuestions);
      console.log('📊 QuizSessionService: Accuracy:', accuracy.toFixed(1) + '%');
      
      return result;
    } catch (error) {
      console.error('❌ QuizSessionService: Error completing quiz session:', error);
      throw error;
    }
  }

  // Get quiz results for a completed session
  async getQuizResults(sessionId: string): Promise<QuizResult> {
    try {
      console.log('📊 QuizSessionService: Getting quiz results for session:', sessionId);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      if (session.status !== 'completed') {
        throw new Error('Session not completed yet');
      }

      // Get all answers for the session
      const { data: answersData, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('session_id', sessionId);

      if (answersError) {
        console.error('Error fetching session answers:', answersError);
        throw new Error(`Failed to fetch answers: ${answersError.message}`);
      }

      const answers = answersData.map(this.mapDatabaseAnswerToAnswer);
      
      // Get quiz details
      const quiz = await quizService.getQuiz(session.quizId, true);
      
      // Calculate results
      const totalQuestions = session.totalQuestions;
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalScore = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
      const totalTimeSpent = answers.reduce((sum, a) => sum + a.timeSpent, 0);
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;

      // Calculate breakdowns
      const difficultyBreakdown = this.calculateDifficultyBreakdown(quiz.questions, answers);
      const questionTypeBreakdown = this.calculateQuestionTypeBreakdown(quiz.questions, answers);

      const result: QuizResult = {
        sessionId,
        quizId: session.quizId,
        userId: session.userId,
        score: totalScore,
        totalQuestions,
        correctAnswers,
        accuracy,
        timeSpent: totalTimeSpent,
        averageTimePerQuestion,
        difficultyBreakdown,
        questionTypeBreakdown,
        completedAt: session.endTime || new Date(),
      };

      return result;
    } catch (error) {
      console.error('❌ QuizSessionService: Error getting quiz results:', error);
      throw error;
    }
  }

  // Get current session
  async getSession(sessionId: string): Promise<QuizSession | null> {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Error fetching session:', sessionError);
        throw new Error(`Failed to fetch session: ${sessionError.message}`);
      }

      return this.mapDatabaseSessionToSession(sessionData);
    } catch (error) {
      console.error('❌ QuizSessionService: Error getting session:', error);
      throw error;
    }
  }

  // Pause a quiz session
  async pauseQuizSession(sessionId: string): Promise<void> {
    try {
      console.log('⏸️ QuizSessionService: Pausing quiz session:', sessionId);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error pausing session:', error);
        throw new Error(`Failed to pause session: ${error.message}`);
      }

      console.log('✅ QuizSessionService: Quiz session paused successfully');
    } catch (error) {
      console.error('❌ QuizSessionService: Error pausing quiz session:', error);
      throw error;
    }
  }

  // Resume a paused quiz session
  async resumeQuizSession(sessionId: string): Promise<void> {
    try {
      console.log('▶️ QuizSessionService: Resuming quiz session:', sessionId);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error resuming session:', error);
        throw new Error(`Failed to resume session: ${error.message}`);
      }

      console.log('✅ QuizSessionService: Quiz session resumed successfully');
    } catch (error) {
      console.error('❌ QuizSessionService: Error resuming quiz session:', error);
      throw error;
    }
  }

  // Abandon a quiz session
  async abandonQuizSession(sessionId: string): Promise<void> {
    try {
      console.log('❌ QuizSessionService: Abandoning quiz session:', sessionId);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'abandoned',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error abandoning session:', error);
        throw new Error(`Failed to abandon session: ${error.message}`);
      }

      console.log('✅ QuizSessionService: Quiz session abandoned successfully');
    } catch (error) {
      console.error('❌ QuizSessionService: Error abandoning quiz session:', error);
      throw error;
    }
  }

  // Get user's active sessions
  async getUserActiveSessions(userId: string): Promise<QuizSession[]> {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['in_progress', 'paused'])
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching user sessions:', sessionsError);
        throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
      }

      return sessionsData.map(this.mapDatabaseSessionToSession);
    } catch (error) {
      console.error('❌ QuizSessionService: Error getting user active sessions:', error);
      throw error;
    }
  }

  // Helper methods
  private checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = question.correctAnswer.trim().toLowerCase();

    switch (question.questionType) {
      case 'multiple_choice':
        return normalizedUserAnswer === normalizedCorrectAnswer;
      case 'true_false':
        return normalizedUserAnswer === normalizedCorrectAnswer;
      case 'short_answer':
        // For short answer, check if the user's answer contains key parts of the correct answer
        const correctWords = normalizedCorrectAnswer.split(' ').filter(word => word.length > 2);
        return correctWords.some(word => normalizedUserAnswer.includes(word));
      case 'fill_blank':
        return normalizedUserAnswer === normalizedCorrectAnswer;
      default:
        return false;
    }
  }

  private calculateEstimatedTime(questionCount: number, timeLimit?: number): number {
    if (timeLimit) {
      return timeLimit * 60; // Convert minutes to seconds
    }
    // Default estimate: 2 minutes per question
    return questionCount * 120;
  }

  private async updateSessionProgress(
    sessionId: string,
    questionId: string,
    isCorrect: boolean,
    pointsEarned: number,
    timeSpent: number
  ): Promise<void> {
    try {
      // Get current session
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('progress_data, score, correct_answers')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session for progress update:', sessionError);
        return;
      }

      // Update progress data
      const progressData = sessionData.progress_data || {};
      progressData.answeredQuestions = [...(progressData.answeredQuestions || []), questionId];
      progressData.timePerQuestion = { ...progressData.timePerQuestion, [questionId]: timeSpent };
      progressData.currentScore = (sessionData.score || 0) + pointsEarned;
      progressData.currentQuestionIndex = (progressData.answeredQuestions || []).length;

      // Update session
      const { error: updateError } = await supabase
        .from('quiz_sessions')
        .update({
          score: progressData.currentScore,
          correct_answers: (sessionData.correct_answers || 0) + (isCorrect ? 1 : 0),
          progress_data: progressData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session progress:', updateError);
      }
    } catch (error) {
      console.error('Error updating session progress:', error);
    }
  }

  private calculateDifficultyBreakdown(questions: QuizQuestion[], answers: QuizAnswer[]): {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  } {
    const breakdown = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    };

    questions.forEach(question => {
      const answer = answers.find(a => a.questionId === question.id);
      breakdown[question.difficulty].total++;
      if (answer && answer.isCorrect) {
        breakdown[question.difficulty].correct++;
      }
    });

    return breakdown;
  }

  private calculateQuestionTypeBreakdown(questions: QuizQuestion[], answers: QuizAnswer[]): {
    [key: string]: { correct: number; total: number };
  } {
    const breakdown: { [key: string]: { correct: number; total: number } } = {};

    questions.forEach(question => {
      if (!breakdown[question.questionType]) {
        breakdown[question.questionType] = { correct: 0, total: 0 };
      }
      
      breakdown[question.questionType].total++;
      
      const answer = answers.find(a => a.questionId === question.id);
      if (answer && answer.isCorrect) {
        breakdown[question.questionType].correct++;
      }
    });

    return breakdown;
  }

  private async updateQuizAnalytics(
    quizId: string,
    userId: string,
    score: number,
    timeSpent: number
  ): Promise<void> {
    try {
      // Get existing analytics or create new
      const { data: existingAnalytics, error: fetchError } = await supabase
        .from('quiz_analytics')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching quiz analytics:', fetchError);
        return;
      }

      if (existingAnalytics) {
        // Update existing analytics
        const totalAttempts = existingAnalytics.total_attempts + 1;
        const bestScore = Math.max(existingAnalytics.best_score, score);
        const totalTimeSpent = existingAnalytics.total_time_spent + timeSpent;
        const averageScore = ((existingAnalytics.average_score * existingAnalytics.total_attempts) + score) / totalAttempts;
        const masteryLevel = this.calculateMasteryLevel(averageScore, totalAttempts);

        const { error: updateError } = await supabase
          .from('quiz_analytics')
          .update({
            total_attempts: totalAttempts,
            best_score: bestScore,
            average_score: averageScore,
            total_time_spent: totalTimeSpent,
            last_attempted: new Date().toISOString(),
            mastery_level: masteryLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAnalytics.id);

        if (updateError) {
          console.error('Error updating quiz analytics:', updateError);
        }
      } else {
        // Create new analytics
        const { error: insertError } = await supabase
          .from('quiz_analytics')
          .insert({
            quiz_id: quizId,
            user_id: userId,
            total_attempts: 1,
            best_score: score,
            average_score: score,
            total_time_spent: timeSpent,
            last_attempted: new Date().toISOString(),
            mastery_level: this.calculateMasteryLevel(score, 1),
          });

        if (insertError) {
          console.error('Error creating quiz analytics:', insertError);
        }
      }
    } catch (error) {
      console.error('Error updating quiz analytics:', error);
    }
  }

  private calculateMasteryLevel(averageScore: number, totalAttempts: number): MasteryLevel {
    if (totalAttempts < 3) return 'beginner';
    if (averageScore >= 90) return 'expert';
    if (averageScore >= 80) return 'advanced';
    if (averageScore >= 70) return 'intermediate';
    return 'beginner';
  }

  // Database mapping helpers
  private mapDatabaseSessionToSession(dbSession: any): QuizSession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      quizId: dbSession.quiz_id,
      startTime: new Date(dbSession.start_time),
      endTime: dbSession.end_time ? new Date(dbSession.end_time) : undefined,
      score: dbSession.score || 0,
      totalQuestions: dbSession.total_questions,
      correctAnswers: dbSession.correct_answers || 0,
      timeSpent: dbSession.time_spent || 0,
      status: dbSession.status,
      progressData: dbSession.progress_data || {},
      answers: [], // Will be populated separately if needed
      createdAt: new Date(dbSession.created_at),
      updatedAt: new Date(dbSession.updated_at),
    };
  }

  private mapDatabaseAnswerToAnswer(dbAnswer: any): QuizAnswer {
    return {
      id: dbAnswer.id,
      sessionId: dbAnswer.session_id,
      questionId: dbAnswer.question_id,
      userAnswer: dbAnswer.user_answer,
      isCorrect: dbAnswer.is_correct,
      pointsEarned: dbAnswer.points_earned || 0,
      timeSpent: dbAnswer.time_spent || 0,
      answeredAt: new Date(dbAnswer.answered_at),
      reviewNotes: dbAnswer.review_notes,
    };
  }
}

// Export singleton instance
export const quizSessionService = QuizSessionService.getInstance();
