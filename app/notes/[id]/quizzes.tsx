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
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import { WebLayout } from '../../../components/web/WebLayout';
import { UserSidebar } from '../../../components/web/UserSidebar';
import { useAuth } from '../../../hooks/useAuth';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { supabase } from '../../../lib/supabase';
import { Quiz } from '../../../types/Quizzes';

export default function NoteQuizzesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [noteTitle, setNoteTitle] = useState('');

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
      Alert.alert('Error', 'No note ID provided');
      router.back();
      return;
    }

    loadQuizzes();
  }, [id]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);

      // Load quizzes for this note
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('note_id', id)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      // Map to Quiz type
      const mappedQuizzes: Quiz[] = (quizzesData || []).map(q => ({
        id: q.id,
        noteId: q.note_id,
        userId: q.user_id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        questionCount: q.question_count,
        questionTypes: q.question_types,
        sourceType: q.source_type,
        sourceContent: q.source_content,
        generationOptions: q.generation_options,
        status: q.status,
        questions: [],
        tags: q.tags || [],
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
      }));

      setQuizzes(mappedQuizzes);
      
      // TODO: Load actual note title from your notes table
      setNoteTitle('Note');
    } catch (error) {
      console.error('Error loading quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    router.push(`/quizzes/create?noteId=${id}`);
  };

  const handleQuizPress = (quizId: string) => {
    router.push(`/quizzes/${quizId}`);
  };

  const handleTakeQuiz = (quizId: string) => {
    router.push(`/quizzes/${quizId}/take`);
  };

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
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
                .eq('id', quizId);

              if (error) throw error;

              // Reload quizzes
              loadQuizzes();
              Alert.alert('Success', 'Quiz deleted successfully');
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    const loadingContent = (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
            Loading quizzes...
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
          <View style={styles.headerCenter}>
            <ThemedText style={styles.title}>Quizzes</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} for this note
            </ThemedText>
          </View>
          <View style={styles.headerRight} />
        </ThemedView>

        <ThemedView style={styles.content}>
          {/* Create New Quiz Button */}
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: primaryColor }]}
            onPress={handleCreateQuiz}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>Create New Quiz</ThemedText>
          </TouchableOpacity>

          {/* Quizzes List */}
          {quizzes.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Quizzes Yet</ThemedText>
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                Create your first AI-generated quiz from this note
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.quizzesList}>
              {quizzes.map((quiz) => (
                <ThemedView key={quiz.id} style={[styles.quizCard, { backgroundColor: cardBg }]}>
                  <TouchableOpacity
                    style={styles.quizCardContent}
                    onPress={() => handleQuizPress(quiz.id)}
                  >
                    <View style={styles.quizCardHeader}>
                      <View style={styles.quizCardLeft}>
                        <ThemedText style={styles.quizCardTitle}>{quiz.title}</ThemedText>
                        {quiz.description && (
                          <ThemedText
                            style={[styles.quizCardDescription, { color: textSecondary }]}
                            numberOfLines={2}
                          >
                            {quiz.description}
                          </ThemedText>
                        )}
                      </View>
                      <View
                        style={[
                          styles.difficultyBadge,
                          { backgroundColor: getDifficultyColor(quiz.difficulty) + '20' },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.difficultyText,
                            { color: getDifficultyColor(quiz.difficulty) },
                          ]}
                        >
                          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.quizCardMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="help-circle-outline" size={16} color={textSecondary} />
                        <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                          {quiz.questionCount} questions
                        </ThemedText>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={textSecondary} />
                        <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                          {formatDate(quiz.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.quizCardActions, { borderColor }]}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.takeButton, { backgroundColor: successColor }]}
                      onPress={() => handleTakeQuiz(quiz.id)}
                    >
                      <Ionicons name="play" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.actionButtonText}>Take Quiz</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewButton, { borderColor }]}
                      onPress={() => handleQuizPress(quiz.id)}
                    >
                      <Ionicons name="eye-outline" size={18} color={textColor} />
                      <ThemedText style={[styles.viewButtonText, { color: textColor }]}>View</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { borderColor }]}
                      onPress={() => handleDeleteQuiz(quiz.id, quiz.title)}
                    >
                      <Ionicons name="trash-outline" size={18} color={textColor} />
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={<UserSidebar />}
        title="Quizzes"
        subtitle={noteTitle}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
    paddingBottom: Platform.OS === 'web' ? 30 : 20,
    gap: 20,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
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
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 900,
          marginHorizontal: 'auto' as any,
          width: '100%',
        }
      : {}),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: Platform.OS === 'web' ? 18 : 16,
    borderRadius: 12,
    marginBottom: 32,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer' as any,
          transition: 'all 0.2s ease' as any,
        }
      : {}),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
  },
  quizzesList: {
    gap: 16,
  },
  quizCard: {
    borderRadius: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }
      : {}),
  },
  quizCardContent: {
    padding: Platform.OS === 'web' ? 24 : 20,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  quizCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  quizCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  quizCardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quizCardMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  quizCardActions: {
    flexDirection: 'row',
    gap: 12,
    padding: Platform.OS === 'web' ? 16 : 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  takeButton: {},
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  viewButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

