import { supabase } from '../lib/supabase';
import {
    ContentSourceType,
    QuestionOptions,
    QuestionType,
    Quiz,
    QuizGenerationOptions,
    QuizGenerationResult,
    QuizQuestion
} from '../types/Quizzes';
import { featureFlagService } from './FeatureFlagService';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export class QuizGenerationService {
  private static instance: QuizGenerationService;

  static getInstance(): QuizGenerationService {
    if (!QuizGenerationService.instance) {
      QuizGenerationService.instance = new QuizGenerationService();
    }
    return QuizGenerationService.instance;
  }

  // Generate quiz from note content using AI
  async generateQuizFromContent(
    options: QuizGenerationOptions,
    userId: string
  ): Promise<QuizGenerationResult> {
    try {
      console.log('🚀 QuizGenerationService: Starting quiz generation');
      console.log('🚀 QuizGenerationService: options:', options);
      console.log('🚀 QuizGenerationService: userId:', userId);

      const startTime = Date.now();

      // Get user profile for feature flag check (needs premium status and role)
      let userForFeatureFlag: any = undefined;
      try {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, role, premium')
          .eq('id', userId)
          .single();
        
        if (userProfile) {
          userForFeatureFlag = {
            id: userProfile.id,
            role: userProfile.role,
            premium: userProfile.premium || {}
          };
          console.log('[QuizGenerationService] Loaded user profile for feature flag check:', {
            id: userForFeatureFlag.id,
            role: userForFeatureFlag.role,
            premiumActive: userForFeatureFlag.premium?.isActive
          });
        }
      } catch (profileError) {
        console.warn('[QuizGenerationService] Failed to load user profile for feature flag check:', profileError);
      }

      // Check if AI quiz generation is enabled (with user context for proper evaluation)
      const isEnabled = featureFlagService.isFeatureEnabled('ai_quiz', userForFeatureFlag);
      console.log('[QuizGenerationService] AI quiz feature flag enabled:', isEnabled, 'for user:', userId);
      
      if (!isEnabled) {
        throw new Error('AI Quiz feature is currently disabled');
      }

      // Check if API key is available
      if (!GEMINI_API_KEY) {
        console.error('QuizGenerationService: API key not found');
        throw new Error('Gemini API key not configured');
      }

      // Generate quiz using AI
      const aiGeneratedQuiz = await this.generateQuizWithAI(options);
      
      if (!aiGeneratedQuiz.success || !aiGeneratedQuiz.quiz) {
        throw new Error(aiGeneratedQuiz.error || 'Failed to generate quiz with AI');
      }

      const generationTime = Date.now() - startTime;

      console.log('✅ QuizGenerationService: Quiz generated successfully');
      console.log('✅ QuizGenerationService: Generation time:', generationTime, 'ms');
      console.log('✅ QuizGenerationService: Questions generated:', aiGeneratedQuiz.questionsGenerated);

      return {
        success: true,
        quiz: aiGeneratedQuiz.quiz,
        generationTime,
        questionsGenerated: aiGeneratedQuiz.questionsGenerated,
      };
    } catch (error) {
      console.error('❌ QuizGenerationService: Error generating quiz:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        questionsGenerated: 0,
      };
    }
  }

  // Generate quiz using Gemini AI
  private async generateQuizWithAI(options: QuizGenerationOptions): Promise<{
    success: boolean;
    quiz?: Quiz;
    error?: string;
    questionsGenerated: number;
  }> {
    try {
      const prompt = this.buildQuizGenerationPrompt(options);
      
      console.log('🤖 QuizGenerationService: Sending prompt to Gemini AI');
      console.log('🤖 QuizGenerationService: Prompt length:', prompt.length);

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }] }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('QuizGenerationService: API request failed:', response.status, errorText);
        throw new Error(`Gemini API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Check for API errors in response
      if (data.error) {
        console.error('QuizGenerationService: API error:', data.error);
        throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`);
      }

      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!responseText) {
        throw new Error('No response received from AI');
      }

      console.log('🤖 QuizGenerationService: AI response received, length:', responseText.length);

      // Parse AI response
      const parsedQuiz = this.parseAIQuizResponse(responseText, options);
      
      if (!parsedQuiz) {
        throw new Error('Failed to parse AI quiz response');
      }

      return {
        success: true,
        quiz: parsedQuiz,
        questionsGenerated: parsedQuiz.questions.length,
      };
    } catch (error) {
      console.error('QuizGenerationService: Error in AI generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI generation failed',
        questionsGenerated: 0,
      };
    }
  }

  // Build the prompt for quiz generation
  private buildQuizGenerationPrompt(options: QuizGenerationOptions): string {
    const { questionCount, difficulty, questionTypes, focusAreas, includeExplanations, sourceContent, sourceType, language } = options;

    const questionTypesText = questionTypes.join(', ');
    const focusAreasText = focusAreas && focusAreas.length > 0 
      ? `\nFocus Areas: ${focusAreas.join(', ')}`
      : '';

    const sourceTypeText = this.getSourceTypeDescription(sourceType);
    
    // Determine language instruction
    const languageInstruction = language && language !== 'en' 
      ? `\nIMPORTANT: Generate all quiz content (questions, answers, explanations) in ${language === 'es' ? 'Spanish' : language} language. All text must be in the user's language.`
      : '';
    
    const prompt = `Generate a ${difficulty} level quiz with ${questionCount} questions based on this ${sourceTypeText} content:${languageInstruction} 

${sourceContent}

Requirements:
- Questions should test understanding, not just memorization
- Include ${questionTypesText} question types
- Provide clear, unambiguous answers
- ${includeExplanations ? 'Include explanations for correct answers' : 'Do not include explanations'}
- Ensure questions cover key concepts from the content
- Difficulty should match the specified level (${difficulty})
- Questions should be engaging and educational
- Avoid overly simple or overly complex questions for the difficulty level
${focusAreasText}

Format the response as JSON with this exact structure:
{
  "quiz": {
    "title": "Quiz Title",
    "description": "Brief description of the quiz content and purpose",
    "questions": [
      {
        "question": "Question text",
        "type": "multiple_choice",
        "options": {"A": "option text", "B": "option text", "C": "option text", "D": "option text"},
        "correctAnswer": "A",
        "explanation": "Why this is correct",
        "difficulty": "medium",
        "points": 1
      }
    ]
  }
}

Important:
- Return ONLY valid JSON, no additional text
- Use the exact field names shown above
- For multiple choice questions, use A, B, C, D as keys
- For true/false questions, use "true" or "false" as correctAnswer
- For short answer questions, provide a sample correct answer
- For fill in the blank questions, provide the word/phrase that goes in the blank
- Ensure all questions have appropriate difficulty levels
- Make explanations educational and helpful`;

    return prompt;
  }

  // Get source type description for the prompt
  private getSourceTypeDescription(sourceType: ContentSourceType): string {
    switch (sourceType) {
      case 'note':
        return 'note';
      case 'audio':
        return 'audio transcription';
      case 'mixed':
        return 'mixed content (notes and audio)';
      default:
        return 'content';
    }
  }

  // Parse AI response into quiz structure
  private parseAIQuizResponse(responseText: string, options: QuizGenerationOptions): Quiz | null {
    try {
      console.log('🔍 QuizGenerationService: Parsing AI response');

      // Clean the response text (remove markdown formatting if present)
      let cleanResponse = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```\n?$/, '');
      }

      // Parse JSON
      const parsedData = JSON.parse(cleanResponse);
      
      if (!parsedData.quiz || !parsedData.quiz.questions) {
        throw new Error('Invalid quiz structure in AI response');
      }

      const aiQuiz = parsedData.quiz;
      const questions = aiQuiz.questions.map((q: any, index: number) => 
        this.mapAIQuestionToQuizQuestion(q, index)
      );

      // Validate questions
      if (questions.length !== options.questionCount) {
        console.warn(`QuizGenerationService: Expected ${options.questionCount} questions, got ${questions.length}`);
      }

      // Create quiz object
      const quiz: Quiz = {
        id: '', // Will be set when saved to database
        noteId: '', // Will be set when saved to database
        userId: '', // Will be set when saved to database
        title: aiQuiz.title || `Quiz on ${options.sourceType} content`,
        description: aiQuiz.description || `AI-generated quiz with ${questions.length} questions`,
        difficulty: options.difficulty,
        questionCount: questions.length,
        questionTypes: options.questionTypes,
        sourceType: options.sourceType,
        sourceContent: options.sourceContent,
        generationOptions: options,
        status: 'active',
        questions,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('✅ QuizGenerationService: Successfully parsed AI response');
      return quiz;
    } catch (error) {
      console.error('QuizGenerationService: Error parsing AI response:', error);
      console.error('Response text:', responseText);
      return null;
    }
  }

  // Map AI question to quiz question structure
  private mapAIQuestionToQuizQuestion(aiQuestion: any, index: number): QuizQuestion {
    // Validate required fields
    if (!aiQuestion.question || !aiQuestion.type || !aiQuestion.correctAnswer) {
      throw new Error(`Invalid question structure at index ${index}`);
    }

    // Map question type
    let questionType: QuestionType;
    switch (aiQuestion.type.toLowerCase()) {
      case 'multiple_choice':
        questionType = 'multiple_choice';
        break;
      case 'true_false':
        questionType = 'true_false';
        break;
      case 'short_answer':
        questionType = 'short_answer';
        break;
      case 'fill_blank':
        questionType = 'fill_blank';
        break;
      default:
        questionType = 'multiple_choice'; // Default fallback
    }

    // Process options for multiple choice questions
    let options: QuestionOptions | undefined;
    if (questionType === 'multiple_choice' && aiQuestion.options) {
      options = aiQuestion.options;
    }

    // Validate multiple choice options
    if (questionType === 'multiple_choice' && (!options || Object.keys(options).length < 2)) {
      throw new Error(`Multiple choice question at index ${index} must have at least 2 options`);
    }

    return {
      id: '', // Will be set when saved to database
      quizId: '', // Will be set when saved to database
      questionText: aiQuestion.question,
      questionType,
      correctAnswer: aiQuestion.correctAnswer.toString(),
      explanation: aiQuestion.explanation || undefined,
      difficulty: aiQuestion.difficulty || 'medium',
      options,
      orderIndex: index,
      points: aiQuestion.points || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Generate quiz from note content
  async generateFromNoteContent(
    noteContent: string,
    options: Omit<QuizGenerationOptions, 'sourceContent' | 'sourceType'>,
    userId: string
  ): Promise<QuizGenerationResult> {
    const generationOptions: QuizGenerationOptions = {
      ...options,
      sourceContent: noteContent,
      sourceType: 'note',
    };

    return this.generateQuizFromContent(generationOptions, userId);
  }

  // Generate quiz from audio transcription
  async generateFromAudioTranscription(
    transcription: string,
    options: Omit<QuizGenerationOptions, 'sourceContent' | 'sourceType'>,
    userId: string
  ): Promise<QuizGenerationResult> {
    const generationOptions: QuizGenerationOptions = {
      ...options,
      sourceContent: transcription,
      sourceType: 'audio',
    };

    return this.generateQuizFromContent(generationOptions, userId);
  }

  // Generate quiz from mixed content (notes + audio)
  async generateFromMixedContent(
    noteContent: string,
    transcription: string,
    options: Omit<QuizGenerationOptions, 'sourceContent' | 'sourceType'>,
    userId: string
  ): Promise<QuizGenerationResult> {
    const combinedContent = `Note Content:\n${noteContent}\n\nAudio Transcription:\n${transcription}`;
    
    const generationOptions: QuizGenerationOptions = {
      ...options,
      sourceContent: combinedContent,
      sourceType: 'mixed',
    };

    return this.generateQuizFromContent(generationOptions, userId);
  }

  // Save generated quiz to database
  async saveGeneratedQuiz(quiz: Quiz, noteId: string, userId: string): Promise<string> {
    try {
      console.log('💾 QuizGenerationService: Saving generated quiz to database');

      // Create quiz record
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          note_id: noteId,
          user_id: userId,
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          question_count: quiz.questionCount,
          question_types: quiz.questionTypes,
          source_type: quiz.sourceType,
          source_content: quiz.sourceContent,
          generation_options: quiz.generationOptions,
          status: 'active',
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error saving quiz:', quizError);
        const errorMessage = quizError.message || quizError.details || quizError.hint || JSON.stringify(quizError);
        throw new Error(`Failed to save quiz: ${errorMessage}`);
      }

      const savedQuizId = quizData.id;

      // Save questions
      await this.saveQuizQuestions(savedQuizId, quiz.questions);

      // Save tags if any
      if (quiz.tags && quiz.tags.length > 0) {
        await this.saveQuizTags(savedQuizId, quiz.tags);
      }

      console.log('✅ QuizGenerationService: Quiz saved successfully with ID:', savedQuizId);
      return savedQuizId;
    } catch (error) {
      console.error('❌ QuizGenerationService: Error saving quiz:', error);
      throw error;
    }
  }

  // Save quiz questions to database
  private async saveQuizQuestions(quizId: string, questions: QuizQuestion[]): Promise<void> {
    try {
      if (questions.length === 0) return;

      const questionRecords = questions.map(q => ({
        quiz_id: quizId,
        question_text: q.questionText,
        question_type: q.questionType,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        options: q.options,
        order_index: q.orderIndex,
        points: q.points,
      }));

      const { error } = await supabase
        .from('quiz_questions')
        .insert(questionRecords);

      if (error) {
        console.error('Error saving quiz questions:', error);
        throw new Error(`Failed to save questions: ${error.message}`);
      }

      console.log('✅ QuizGenerationService: Questions saved successfully');
    } catch (error) {
      console.error('❌ QuizGenerationService: Error saving questions:', error);
      throw error;
    }
  }

  // Save quiz tags to database
  private async saveQuizTags(quizId: string, tags: string[]): Promise<void> {
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
        console.error('Error saving quiz tags:', error);
        throw new Error(`Failed to save tags: ${error.message}`);
      }

      console.log('✅ QuizGenerationService: Tags saved successfully');
    } catch (error) {
      console.error('❌ QuizGenerationService: Error saving tags:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const quizGenerationService = QuizGenerationService.getInstance();
