import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import { WebLayout } from '../../../components/web/WebLayout';
import { UserSidebar } from '../../../components/web/UserSidebar';
import { useAuth } from '../../../hooks/useAuth';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { supabase } from '../../../lib/supabase';
import { Quiz, QuizQuestion } from '../../../types/Quizzes';

interface UserAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
}

export default function TakeQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'textSecondary');
  const primaryColor = useThemeColor({ light: '#6A5ACD', dark: '#8A7AED' }, 'accentPrimary');
  const successColor = useThemeColor({ light: '#3CB371', dark: '#4CD381' }, 'accentSuccess');
  const errorColor = useThemeColor({ light: '#DC3545', dark: '#F85149' }, 'accentError');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#2A2D30' }, 'backgroundTertiary');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#1E2022' }, 'backgroundSecondary');

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'No quiz ID provided');
      router.back();
      return;
    }

    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);

      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (quizError) throw quizError;
      if (!quizData) throw new Error('Quiz not found');

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      const mappedQuiz: Quiz = {
        id: quizData.id,
        noteId: quizData.note_id,
        userId: quizData.user_id,
        title: quizData.title,
        description: quizData.description,
        difficulty: quizData.difficulty,
        questionCount: quizData.question_count,
        questionTypes: quizData.question_types,
        sourceType: quizData.source_type,
        sourceContent: quizData.source_content,
        generationOptions: quizData.generation_options,
        status: quizData.status,
        questions: [],
        tags: quizData.tags || [],
        createdAt: new Date(quizData.created_at),
        updatedAt: new Date(quizData.updated_at),
      };

      const mappedQuestions: QuizQuestion[] = (questionsData || []).map(q => ({
        id: q.id,
        quizId: q.quiz_id,
        questionText: q.question_text,
        questionType: q.question_type,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        options: q.options,
        orderIndex: q.order_index,
        points: q.points,
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
      }));

      setQuiz(mappedQuiz);
      setQuestions(mappedQuestions);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = new Map(userAnswers);
    newAnswers.set(questionId, { questionId, answer });
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredCount = questions.length - userAnswers.size;
    if (unansweredCount > 0) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Do you want to submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitQuiz() },
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      setIsSubmitting(true);

      // Calculate score
      let correctCount = 0;
      const updatedAnswers = new Map(userAnswers);

      questions.forEach(question => {
        const userAnswer = updatedAnswers.get(question.id);
        if (userAnswer) {
          const isCorrect = userAnswer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
          userAnswer.isCorrect = isCorrect;
          if (isCorrect) correctCount++;
          updatedAnswers.set(question.id, userAnswer);
        }
      });

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = questions.reduce((sum, q) => {
        const answer = updatedAnswers.get(q.id);
        return sum + (answer?.isCorrect ? q.points : 0);
      }, 0);
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      setUserAnswers(updatedAnswers);
      setScore(percentage);

      // Save attempt to database
      if (user?.id) {
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        
        await supabase.from('quiz_attempts').insert({
          quiz_id: id,
          user_id: user.id,
          score: earnedPoints,
          max_score: totalPoints,
          percentage: percentage,
          time_taken_seconds: timeTaken,
          answers: Array.from(updatedAnswers.values()),
        });
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setUserAnswers(new Map());
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
  };

  if (isLoading) {
    const loadingContent = (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
            Loading quiz...
          </ThemedText>
        </ThemedView>
      </>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout
          sidebar={<UserSidebar />}
          title="Loading..."
          scrollable={false}
        >
          {loadingContent}
        </WebLayout>
      );
    }
    return loadingContent;
  }

  if (!quiz || questions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={primaryColor} />
          <ThemedText style={styles.errorText}>Quiz not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  // Results View
  if (showResults) {
    const correctAnswers = Array.from(userAnswers.values()).filter(a => a.isCorrect).length;
    const resultsContent = (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={styles.container}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={primaryColor} />
              <ThemedText style={[styles.backButtonText, { color: primaryColor }]}>Back</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.content}>
            {/* Score Card */}
            <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
              <View style={styles.scoreHeader}>
                <Ionicons 
                  name={score >= 70 ? "checkmark-circle" : "close-circle"} 
                  size={64} 
                  color={score >= 70 ? successColor : errorColor} 
                />
                <ThemedText style={styles.scoreTitle}>
                  {score >= 70 ? 'Great Job!' : 'Keep Practicing!'}
                </ThemedText>
                <ThemedText style={[styles.scorePercentage, { color: score >= 70 ? successColor : errorColor }]}>
                  {score.toFixed(1)}%
                </ThemedText>
                <ThemedText style={[styles.scoreSubtext, { color: textSecondary }]}>
                  {correctAnswers} out of {questions.length} correct
                </ThemedText>
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                  onPress={handleRetake}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.primaryButtonText}>Retake Quiz</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor }]}
                  onPress={() => router.push(`/quizzes/${id}`)}
                >
                  <ThemedText style={styles.secondaryButtonText}>View Details</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>

            {/* Review Answers */}
            <ThemedText style={styles.sectionTitle}>Review Answers</ThemedText>
            {questions.map((question, index) => {
              const userAnswer = userAnswers.get(question.id);
              const isCorrect = userAnswer?.isCorrect;
              
              return (
                <ThemedView key={question.id} style={[styles.reviewCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewNumber}>
                      <ThemedText style={[styles.reviewNumberText, { color: primaryColor }]}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <Ionicons 
                      name={isCorrect ? "checkmark-circle" : "close-circle"} 
                      size={24} 
                      color={isCorrect ? successColor : errorColor} 
                    />
                  </View>
                  <ThemedText style={styles.reviewQuestion}>{question.questionText}</ThemedText>
                  
                  {userAnswer && (
                    <View style={[styles.answerBox, { 
                      backgroundColor: isCorrect ? successColor + '10' : errorColor + '10',
                      borderColor: isCorrect ? successColor : errorColor 
                    }]}>
                      <ThemedText style={[styles.answerLabel, { color: textSecondary }]}>Your answer:</ThemedText>
                      <ThemedText style={styles.answerText}>{userAnswer.answer}</ThemedText>
                    </View>
                  )}
                  
                  {!isCorrect && (
                    <View style={[styles.correctBox, { backgroundColor: successColor + '10', borderColor: successColor }]}>
                      <ThemedText style={[styles.answerLabel, { color: textSecondary }]}>Correct answer:</ThemedText>
                      <ThemedText style={styles.answerText}>{question.correctAnswer}</ThemedText>
                    </View>
                  )}
                  
                  {question.explanation && (
                    <View style={[styles.explanationBox, { backgroundColor: borderColor }]}>
                      <Ionicons name="information-circle" size={16} color={textSecondary} />
                      <ThemedText style={[styles.explanationText, { color: textSecondary }]}>
                        {question.explanation}
                      </ThemedText>
                    </View>
                  )}
                </ThemedView>
              );
            })}
          </ThemedView>
        </ScrollView>
      </>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout
          sidebar={<UserSidebar />}
          title="Quiz Results"
          subtitle={quiz.title}
          scrollable={false}
        >
          {resultsContent}
        </WebLayout>
      );
    }
    return resultsContent;
  }

  // Quiz Taking View
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = userAnswers.get(currentQuestion.id)?.answer || '';

  const mainContent = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        {/* Header with Progress */}
        <ThemedView style={styles.quizHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={28} color={primaryColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.progressText, { color: textSecondary }]}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </ThemedText>
            <View style={{ width: 28 }} />
          </View>
          
          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
            <View 
              style={[
                styles.progressFill, 
                { backgroundColor: primaryColor, width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
              ]} 
            />
          </View>
        </ThemedView>

        <ScrollView style={styles.questionContainer}>
          <ThemedView style={styles.questionContent}>
            {/* Question */}
            <ThemedText style={styles.questionTitle}>{currentQuestion.questionText}</ThemedText>

            {/* Answer Input Based on Type */}
            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
              <View style={styles.optionsContainer}>
                {Object.entries(currentQuestion.options).map(([key, value]) => {
                  const isSelected = currentAnswer === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isSelected ? primaryColor + '20' : cardBg,
                          borderColor: isSelected ? primaryColor : borderColor,
                        },
                      ]}
                      onPress={() => handleAnswerChange(currentQuestion.id, key)}
                    >
                      <View style={[
                        styles.optionRadio,
                        {
                          borderColor: isSelected ? primaryColor : borderColor,
                          backgroundColor: isSelected ? primaryColor : 'transparent',
                        },
                      ]}>
                        {isSelected && <View style={styles.optionRadioInner} />}
                      </View>
                      <View style={styles.optionContent}>
                        <ThemedText style={[styles.optionKey, { color: textSecondary }]}>{key}</ThemedText>
                        <ThemedText style={styles.optionValue}>{value}</ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {currentQuestion.questionType === 'true_false' && (
              <View style={styles.optionsContainer}>
                {['True', 'False'].map((option) => {
                  const isSelected = currentAnswer.toLowerCase() === option.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.tfButton,
                        {
                          backgroundColor: isSelected ? primaryColor : cardBg,
                          borderColor: isSelected ? primaryColor : borderColor,
                        },
                      ]}
                      onPress={() => handleAnswerChange(currentQuestion.id, option)}
                    >
                      <ThemedText style={[styles.tfText, { color: isSelected ? '#FFFFFF' : textColor }]}>
                        {option}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {(currentQuestion.questionType === 'short_answer' || currentQuestion.questionType === 'fill_blank') && (
              <TextInput
                style={[styles.textInput, { borderColor, color: textColor, backgroundColor: cardBg }]}
                value={currentAnswer}
                onChangeText={(text) => handleAnswerChange(currentQuestion.id, text)}
                placeholder="Type your answer here..."
                placeholderTextColor={textSecondary}
                multiline
              />
            )}
          </ThemedView>
        </ScrollView>

        {/* Navigation Footer */}
        <ThemedView style={[styles.footer, { borderColor }]}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.navButton, { opacity: currentQuestionIndex === 0 ? 0.5 : 1 }]}
              onPress={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <Ionicons name="chevron-back" size={20} color={textColor} />
              <ThemedText style={styles.navButtonText}>Previous</ThemedText>
            </TouchableOpacity>

            {currentQuestionIndex === questions.length - 1 ? (
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: successColor }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText style={styles.submitButtonText}>Submit Quiz</ThemedText>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: primaryColor }]}
                onPress={handleNext}
              >
                <ThemedText style={[styles.navButtonText, { color: '#FFFFFF' }]}>Next</ThemedText>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>
      </ThemedView>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={<UserSidebar />}
        title={quiz.title}
        subtitle="Take Quiz"
        scrollable={false}
      >
        {mainContent}
      </WebLayout>
    );
  }

  return mainContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  header: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 40 : 48,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: 40,
    ...(Platform.OS === 'web' ? {
      maxWidth: 900,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  card: {
    padding: Platform.OS === 'web' ? 32 : 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreSubtext: {
    fontSize: 16,
    marginTop: 8,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6A5ACD20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  answerBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  correctBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  explanationBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  quizHeader: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 40 : 48,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
  },
  questionContent: {
    padding: Platform.OS === 'web' ? 32 : 20,
    ...(Platform.OS === 'web' ? {
      maxWidth: 800,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  optionKey: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
  },
  optionValue: {
    fontSize: 16,
    flex: 1,
  },
  tfButton: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  tfText: {
    fontSize: 18,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingVertical: 16,
    ...(Platform.OS === 'web' ? {
      maxWidth: 800,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

