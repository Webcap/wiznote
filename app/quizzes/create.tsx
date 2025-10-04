import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useThemeColor } from '../../hooks/useThemeColor';
import { quizGenerationService } from '../../services/QuizGenerationService';
import { ContentSourceType, QuestionType, QuizDifficulty } from '../../types/Quizzes';

export default function QuizCreationScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [isLoading, setIsLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');

  // Quiz configuration state
  const [quizTitle, setQuizTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple_choice']);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [sourceType, setSourceType] = useState<ContentSourceType>('note');

  // Theme colors
  const backgroundColor = useThemeColor('background');
  const textColor = useThemeColor('text');
  const primaryColor = useThemeColor('primary');
  const borderColor = useThemeColor('border');

  useEffect(() => {
    if (!noteId) {
      Alert.alert('Error', 'No note ID provided');
      router.back();
      return;
    }

    if (!isFeatureEnabled('ai_quiz')) {
      Alert.alert('Feature Disabled', 'AI Quiz feature is currently disabled');
      router.back();
      return;
    }

    // Load note content
    loadNoteContent();
  }, [noteId]);

  const loadNoteContent = async () => {
    try {
      // This would typically load from your note service
      // For now, we'll use placeholder content
      setNoteContent('This is a sample note content that will be used to generate the quiz. In a real implementation, this would load the actual note content from your database.');
      setNoteTitle('Sample Note');
      setQuizTitle(`Quiz on ${noteTitle || 'Note Content'}`);
    } catch (error) {
      console.error('Error loading note content:', error);
      Alert.alert('Error', 'Failed to load note content');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!quizTitle.trim()) {
      Alert.alert('Error', 'Please enter a quiz title');
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      Alert.alert('Error', 'Question count must be between 1 and 50');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting quiz generation...');

      // Generate quiz using AI
      const result = await quizGenerationService.generateFromNoteContent(
        noteContent,
        {
          questionCount,
          difficulty,
          questionTypes,
          includeExplanations,
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

      Alert.alert(
        'Success!',
        `Quiz generated with ${result.questionsGenerated} questions in ${result.generationTime}ms`,
        [
          {
            text: 'Take Quiz',
            onPress: () => router.push(`/quizzes/${savedQuizId}/take`),
          },
          {
            text: 'View Quiz',
            onPress: () => router.push(`/quizzes/${savedQuizId}`),
          },
          {
            text: 'Create Another',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      Alert.alert('Error', `Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const renderQuestionTypeToggle = (type: QuestionType, label: string) => (
    <TouchableOpacity
      style={[
        styles.typeToggle,
        {
          backgroundColor: questionTypes.includes(type) ? primaryColor : 'transparent',
          borderColor: questionTypes.includes(type) ? primaryColor : borderColor,
        },
      ]}
      onPress={() => toggleQuestionType(type)}
    >
      <Text
        style={[
          styles.typeToggleText,
          {
            color: questionTypes.includes(type) ? 'white' : textColor,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!isFeatureEnabled('ai_quiz')) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          AI Quiz feature is currently disabled
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: primaryColor }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Create Quiz</Text>
      </View>

      <View style={styles.content}>
        {/* Quiz Title */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Quiz Title</Text>
          <TextInput
            style={[styles.input, { borderColor, color: textColor }]}
            value={quizTitle}
            onChangeText={setQuizTitle}
            placeholder="Enter quiz title..."
            placeholderTextColor={borderColor}
          />
        </View>

        {/* Question Count */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Number of Questions</Text>
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
                <Text
                  style={[
                    styles.countButtonText,
                    {
                      color: questionCount === count ? 'white' : textColor,
                    },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Difficulty Level</Text>
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
                <Text
                  style={[
                    styles.difficultyButtonText,
                    {
                      color: difficulty === level ? 'white' : textColor,
                    },
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Question Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Question Types</Text>
          <View style={styles.typeSelector}>
            {renderQuestionTypeToggle('multiple_choice', 'Multiple Choice')}
            {renderQuestionTypeToggle('true_false', 'True/False')}
            {renderQuestionTypeToggle('short_answer', 'Short Answer')}
            {renderQuestionTypeToggle('fill_blank', 'Fill in Blank')}
          </View>
        </View>

        {/* Explanations */}
        <View style={styles.section}>
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
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: textColor }]}>
              Include explanations for correct answers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Source Content Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Source Content</Text>
          <View style={[styles.contentPreview, { borderColor }]}>
            <Text style={[styles.contentPreviewText, { color: textColor }]} numberOfLines={3}>
              {noteContent || 'Loading note content...'}
            </Text>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            {
              backgroundColor: isLoading ? borderColor : primaryColor,
            },
          ]}
          onPress={handleGenerateQuiz}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Quiz</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  countSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  countButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeToggle: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  contentPreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  contentPreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  generateButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});
