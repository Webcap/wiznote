import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { WebLayout } from '../../components/web/WebLayout';
import { UserSidebar } from '../../components/web/UserSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';
import { Quiz, QuizQuestion } from '../../types/Quizzes';

export default function QuizDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'textSecondary');
  const primaryColor = useThemeColor({ light: '#6A5ACD', dark: '#8A7AED' }, 'accentPrimary');
  const successColor = useThemeColor({ light: '#3CB371', dark: '#4CD381' }, 'accentSuccess');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#2A2D30' }, 'backgroundTertiary');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#1E2022' }, 'backgroundSecondary');

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'No quiz ID provided');
      router.back();
      return;
    }

    loadQuizDetails();
  }, [id]);

  const loadQuizDetails = async () => {
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

      // Map database data to Quiz type
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
      Alert.alert('Error', 'Failed to load quiz details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeQuiz = () => {
    router.push(`/quizzes/${id}/take`);
  };

  const handleDeleteQuiz = () => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete this quiz? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Quiz deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz');
            }
          },
        },
      ]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#3CB371';
      case 'medium':
        return '#FFA500';
      case 'hard':
        return '#DC3545';
      default:
        return textSecondary;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'short_answer':
        return 'Short Answer';
      case 'fill_blank':
        return 'Fill in Blank';
      default:
        return type;
    }
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

  if (!quiz) {
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

  const mainContent = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={primaryColor} />
              <ThemedText style={[styles.backButtonText, { color: primaryColor }]}>Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        <ThemedView style={styles.content}>
          {/* Quiz Header Card */}
          <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.quizHeader}>
              <View style={styles.quizHeaderLeft}>
                <ThemedText style={styles.quizTitle}>{quiz.title}</ThemedText>
                {quiz.description && (
                  <ThemedText style={[styles.quizDescription, { color: textSecondary }]}>
                    {quiz.description}
                  </ThemedText>
                )}
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(quiz.difficulty) + '20' }]}>
                <ThemedText style={[styles.difficultyText, { color: getDifficultyColor(quiz.difficulty) }]}>
                  {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                </ThemedText>
              </View>
            </View>

            {/* Quiz Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="help-circle" size={20} color={textSecondary} />
                <ThemedText style={[styles.statText, { color: textSecondary }]}>
                  {quiz.questionCount} Questions
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="list" size={20} color={textSecondary} />
                <ThemedText style={[styles.statText, { color: textSecondary }]}>
                  {quiz.questionTypes.length} Types
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="document-text" size={20} color={textSecondary} />
                <ThemedText style={[styles.statText, { color: textSecondary }]}>
                  {quiz.sourceType.charAt(0).toUpperCase() + quiz.sourceType.slice(1)}
                </ThemedText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: successColor }]}
                onPress={handleTakeQuiz}
              >
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>Take Quiz</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor }]}
                onPress={handleDeleteQuiz}
              >
                <Ionicons name="trash-outline" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Questions Preview */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Questions Preview</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
              {questions.length} questions in this quiz
            </ThemedText>

            {questions.map((question, index) => (
              <ThemedView key={question.id} style={[styles.questionCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <ThemedText style={[styles.questionNumberText, { color: primaryColor }]}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.questionMeta}>
                    <ThemedText style={[styles.questionType, { color: textSecondary }]}>
                      {getQuestionTypeLabel(question.questionType)}
                    </ThemedText>
                    <View style={[styles.questionDifficulty, { backgroundColor: getDifficultyColor(question.difficulty) + '20' }]}>
                      <ThemedText style={[styles.questionDifficultyText, { color: getDifficultyColor(question.difficulty) }]}>
                        {question.difficulty}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText style={styles.questionText}>{question.questionText}</ThemedText>
                {question.questionType === 'multiple_choice' && question.options && (
                  <View style={styles.optionsPreview}>
                    {Object.entries(question.options).map(([key, value]) => (
                      <View key={key} style={[styles.optionItem, { borderColor }]}>
                        <ThemedText style={[styles.optionKey, { color: textSecondary }]}>{key}.</ThemedText>
                        <ThemedText style={styles.optionText}>{value}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={<UserSidebar />}
        title={quiz.title}
        subtitle={t('quizzes.quizDetails')}
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
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 40 : 48,
    paddingBottom: Platform.OS === 'web' ? 30 : 20,
  },
  headerLeft: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
    } : {}),
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
    ...(Platform.OS === 'web' ? {
      maxWidth: 900,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  card: {
    padding: Platform.OS === 'web' ? 24 : 20,
    borderRadius: 12,
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    } : {}),
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  quizHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  quizTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quizDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
    } : {}),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
    } : {}),
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  questionCard: {
    padding: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6A5ACD20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  questionType: {
    fontSize: 13,
  },
  questionDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  questionDifficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  optionsPreview: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionKey: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
});

