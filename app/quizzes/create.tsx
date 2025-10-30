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
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { WebLayout } from '../../components/web/WebLayout';
import { UserSidebar } from '../../components/web/UserSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { quizGenerationService } from '../../services/QuizGenerationService';
import { ContentSourceType, QuestionType, QuizDifficulty } from '../../types/Quizzes';

export default function QuizCreationScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { noteId, allowNew } = useLocalSearchParams<{ noteId: string; allowNew?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');

  // Quiz configuration state
  const [quizTitle, setQuizTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple_choice']);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [sourceType, setSourceType] = useState<ContentSourceType>('note');

  // Theme colors - following design.json palette
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'textSecondary');
  const primaryColor = useThemeColor({ light: '#6A5ACD', dark: '#8A7AED' }, 'accentPrimary');
  const successColor = useThemeColor({ light: '#3CB371', dark: '#4CD381' }, 'accentSuccess');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#2A2D30' }, 'backgroundTertiary');
  const cardBg = useThemeColor({ light: '#F5F6FA', dark: '#1E2022' }, 'backgroundSecondary');

  useEffect(() => {
    if (!noteId) {
      Alert.alert(t('quizzes.error'), t('quizzes.noNoteIdProvided'));
      router.back();
      return;
    }

    if (!isFeatureEnabled('ai_quiz')) {
      Alert.alert(t('quizzes.featureDisabled'), t('quizzes.aiQuizFeatureDisabled'));
      router.back();
      return;
    }

    // Check for existing quizzes first, then load note content
    if (user?.id) {
      checkExistingQuizzes();
    }
  }, [noteId, user?.id, allowNew]);

  const checkExistingQuizzes = async () => {
    try {
      setIsCheckingExisting(true);

      if (!user?.id || !noteId) {
        throw new Error('User or note ID not available');
      }

      // If allowNew=true, skip the check and proceed to load note content
      if (allowNew) {
        console.log('allowNew=true, skipping existing quiz check - allowing new quiz creation');
        setIsCheckingExisting(false);
        loadNoteContent();
        return;
      }

      // Check if quizzes already exist for this note
      console.log('Checking for existing quizzes for noteId:', noteId);
      const { data: existingQuizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('note_id', noteId)
        .eq('user_id', user.id);

      if (quizzesError) {
        console.error('Error checking for existing quizzes:', quizzesError);
        // Continue to load note even if quiz check fails
        setIsCheckingExisting(false);
        loadNoteContent();
        return;
      }

      if (existingQuizzes && existingQuizzes.length > 0) {
        // Quizzes already exist, redirect to quiz list page immediately
        console.log(`Found ${existingQuizzes.length} existing quizzes, redirecting to quiz list`);
        router.replace(`/notes/${noteId}/quizzes`);
        return;
      }

      // No existing quizzes, proceed to load note content
      console.log('No existing quizzes found, proceeding to create form');
      setIsCheckingExisting(false);
      loadNoteContent();
    } catch (error) {
      console.error('Error checking existing quizzes:', error);
      setIsCheckingExisting(false);
      loadNoteContent(); // Try to load note content anyway
    }
  };

  const loadNoteContent = async () => {
    try {
      if (!user?.id || !noteId) {
        throw new Error('User or note ID not available');
      }

      console.log('Loading note content for noteId:', noteId);
      const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading note:', error);
        throw new Error('Failed to load note from database');
      }

      if (!note) {
        throw new Error('Note not found');
      }

      // Set note content and metadata
      const content = note.content || '';
      const title = note.title || 'Untitled Note';

      if (!content || content.trim().length === 0) {
        Alert.alert(
          t('quizzes.emptyNote'),
          t('quizzes.noteAppearsEmpty'),
          [{ text: t('quizzes.ok'), onPress: () => router.back() }]
        );
        return;
      }

      setNoteContent(content);
      setNoteTitle(title);
      setQuizTitle(`${t('quizzes.createQuiz')}: ${title}`);

      console.log('Note loaded successfully:', { title, contentLength: content.length });
    } catch (error) {
      console.error('Error loading note content:', error);
      Alert.alert(
        t('quizzes.error'),
        t('quizzes.failedToLoadNote'),
        [{ text: t('quizzes.ok'), onPress: () => router.back() }]
      );
    }
  };

  const handleGenerateQuiz = async () => {
    if (!user?.id) {
      Alert.alert(t('quizzes.error'), t('quizzes.userNotAuthenticated'));
      return;
    }

    if (!quizTitle.trim()) {
      Alert.alert(t('quizzes.error'), t('quizzes.pleaseEnterQuizTitle'));
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      Alert.alert(t('quizzes.error'), t('quizzes.questionCountBetween'));
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting quiz generation...');

      // Generate quiz using AI with user's language
      const result = await quizGenerationService.generateFromNoteContent(
        noteContent,
        {
          questionCount,
          difficulty,
          questionTypes,
          includeExplanations,
          language, // Pass user's language
        },
        user.id
      );

      if (!result.success || !result.quiz) {
        throw new Error(result.error || 'Failed to generate quiz');
      }

      console.log('✅ Quiz generated successfully');

      // Save quiz to database
      const savedQuizId = await quizGenerationService.saveGeneratedQuiz(
        result.quiz,
        noteId!,
        user.id
      );

      console.log('💾 Quiz saved to database:', savedQuizId);

      // Navigate to the quizzes list page for this note
      router.push(`/notes/${noteId}/quizzes`);
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      Alert.alert(t('quizzes.error'), t('quizzes.failedToGenerateQuiz') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestionType = (type: QuestionType) => {
    setQuestionTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const renderQuestionTypeToggle = (type: QuestionType, labelKey: string) => {
    const isSelected = questionTypes.includes(type);
    return (
      <TouchableOpacity
        style={[
          styles.typeToggle,
          {
            backgroundColor: isSelected ? primaryColor : 'transparent',
            borderColor: isSelected ? primaryColor : borderColor,
          },
        ]}
        onPress={() => toggleQuestionType(type)}
      >
        {isSelected && (
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        )}
        <ThemedText
          style={[
            styles.typeToggleText,
            {
              color: isSelected ? '#FFFFFF' : textColor,
            },
          ]}
        >
          {t(labelKey)}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  // Show loading state while checking for existing quizzes
  if (isCheckingExisting) {
    const loadingContent = (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
              {t('quizzes.loading')}
            </ThemedText>
          </View>
        </ThemedView>
      </>
    );

    if (Platform.OS === 'web') {
      return (
        <WebLayout
          sidebar={<UserSidebar />}
          title={t('quizzes.createQuiz')}
          scrollable={false}
        >
          {loadingContent}
        </WebLayout>
      );
    }
    return loadingContent;
  }

  if (!isFeatureEnabled('ai_quiz')) {
    const errorContent = (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={primaryColor} />
          <ThemedText style={styles.errorText}>
            {t('quizzes.aiQuizFeatureDisabled')}
          </ThemedText>
          <ThemedText style={[styles.errorSubtext, { color: textSecondary }]}>
            {t('quizzes.contactAdministrator')}
          </ThemedText>
        </ThemedView>
      </>
    );

    if (Platform.OS === 'web') {
      return (
      <WebLayout
        sidebar={<UserSidebar />}
        title={t('quizzes.createQuizError')}
        scrollable={false}
      >
          {errorContent}
        </WebLayout>
      );
    }
    return errorContent;
  }

  const mainContent = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        {/* Web-optimized header following design.json pattern */}
        <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={primaryColor} />
            <ThemedText style={[styles.backButtonText, { color: primaryColor }]}>{t('quizzes.back')}</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.title}>{t('quizzes.createQuiz')}</ThemedText>
          {noteTitle ? (
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              {t('quizzes.from')}: {noteTitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.headerRight} />
      </ThemedView>

      <ThemedView style={styles.content}>
        {/* Quiz Title */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>{t('quizzes.quizTitle')}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
            {t('quizzes.giveQuizDescriptiveTitle')}
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor, color: textColor, backgroundColor }]}
            value={quizTitle}
            onChangeText={setQuizTitle}
            placeholder={t('quizzes.enterQuizTitle')}
            placeholderTextColor={textSecondary}
          />
        </ThemedView>

        {/* Question Count */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>{t('quizzes.numberOfQuestions')}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
            {t('quizzes.selectHowManyQuestions')}
          </ThemedText>
          <View style={styles.countSelector}>
            {[5, 10, 15, 20].map(count => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.countButton,
                  {
                    backgroundColor: questionCount === count ? primaryColor : 'transparent',
                    borderColor: questionCount === count ? primaryColor : borderColor,
                  },
                ]}
                onPress={() => setQuestionCount(count)}
              >
                <ThemedText
                  style={[
                    styles.countButtonText,
                    {
                      color: questionCount === count ? '#FFFFFF' : textColor,
                    },
                  ]}
                >
                  {count}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Difficulty */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>{t('quizzes.difficultyLevel')}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
            {t('quizzes.chooseComplexityOfQuestions')}
          </ThemedText>
          <View style={styles.difficultySelector}>
            {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  {
                    backgroundColor: difficulty === level ? primaryColor : 'transparent',
                    borderColor: difficulty === level ? primaryColor : borderColor,
                  },
                ]}
                onPress={() => setDifficulty(level)}
              >
                <ThemedText
                  style={[
                    styles.difficultyButtonText,
                    {
                      color: difficulty === level ? '#FFFFFF' : textColor,
                    },
                  ]}
                >
                  {t(`quizzes.${level}`)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Question Types */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>{t('quizzes.questionTypes')}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
            {t('quizzes.selectOneOrMoreFormats')}
          </ThemedText>
          <View style={styles.typeSelector}>
            {renderQuestionTypeToggle('multiple_choice', 'quizzes.multipleChoice')}
            {renderQuestionTypeToggle('true_false', 'quizzes.trueFalse')}
            {renderQuestionTypeToggle('short_answer', 'quizzes.shortAnswer')}
            {renderQuestionTypeToggle('fill_blank', 'quizzes.fillInBlank')}
          </View>
        </ThemedView>

        {/* Additional Options */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>{t('quizzes.additionalOptions')}</ThemedText>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIncludeExplanations(!includeExplanations)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: includeExplanations ? primaryColor : 'transparent',
                  borderColor: includeExplanations ? primaryColor : borderColor,
                },
              ]}
            >
              {includeExplanations && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <ThemedText style={styles.checkboxLabel}>
              {t('quizzes.includeExplanations')}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.checkboxHint, { color: textSecondary }]}>
            {t('quizzes.helpsUsersLearn')}
          </ThemedText>
        </ThemedView>

        {/* Source Content Preview */}
        <ThemedView style={[styles.section, styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.contentPreviewHeader}>
            <View>
              <ThemedText style={styles.sectionTitle}>{t('quizzes.sourceContent')}</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: textSecondary }]}>
                {t('quizzes.quizWillBeGenerated')}
              </ThemedText>
            </View>
            {noteContent ? (
              <ThemedText style={[styles.contentStats, { color: textSecondary }]}>
                {noteContent.length} {t('quizzes.characters')}
              </ThemedText>
            ) : null}
          </View>
          <ThemedView style={[styles.contentPreview, { borderColor, backgroundColor }]}>
            <ThemedText style={styles.contentPreviewText} numberOfLines={5}>
              {noteContent || t('quizzes.loadingNoteContent')}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            {
              backgroundColor: isLoading ? borderColor : successColor,
            },
          ]}
          onPress={handleGenerateQuiz}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.generateButtonContent}>
              <ActivityIndicator color="white" size="small" />
              <ThemedText style={[styles.generateButtonText, { marginLeft: 12 }]}>
                {t('quizzes.generating')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.generateButtonContent}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.generateButtonText, { marginLeft: 8 }]}>
                {t('quizzes.generateQuizWithAI')}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
    </>
  );

  // Wrap in WebLayout for web platform
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={<UserSidebar />}
        title={t('quizzes.createQuiz')}
        subtitle={noteTitle || t('quizzes.generateAIQuiz')}
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
  // Error state styles
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Header styles - following design.json three-section pattern
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 40 : 48,
    paddingBottom: Platform.OS === 'web' ? 30 : 20,
    gap: 20,
    borderBottomWidth: 0,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  headerRight: {
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
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '400',
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
    ...(Platform.OS === 'web' ? {
      maxWidth: 900,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  // Card styling
  section: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
  },
  card: {
    padding: Platform.OS === 'web' ? 24 : 20,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    } : {}),
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    fontSize: 16,
    marginTop: 8,
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none' as any,
      transition: 'border-color 0.2s ease' as any,
      ':focus': {
        borderWidth: 2,
      },
    } : {}),
  },
  // Button selectors
  countSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'web' ? 12 : 8,
    marginTop: 8,
  },
  countButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease' as any,
      ':hover': {
        transform: 'translateY(-2px)' as any,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    } : {}),
  },
  countButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  difficultySelector: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 12 : 8,
    marginTop: 8,
  },
  difficultyButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease' as any,
      ':hover': {
        transform: 'translateY(-2px)' as any,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    } : {}),
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.2s ease' as any,
      ':hover': {
        transform: 'translateY(-1px)' as any,
      },
    } : {}),
  },
  typeToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  checkboxHint: {
    fontSize: 13,
    marginLeft: 36,
    marginTop: 4,
  },
  contentPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contentStats: {
    fontSize: 12,
    fontWeight: '500',
  },
  contentPreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    minHeight: 100,
  },
  contentPreviewText: {
    fontSize: 14,
    lineHeight: 22,
  },
  // Generate button
  generateButton: {
    borderRadius: 12,
    paddingVertical: Platform.OS === 'web' ? 20 : 16,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 40 : 24,
    minHeight: 60,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.3s ease' as any,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      ':hover': {
        transform: 'translateY(-3px)' as any,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      ':active': {
        transform: 'translateY(-1px)' as any,
      },
    } : {}),
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
  },
});
