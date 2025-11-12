import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { FlashcardGenerator } from '../components/FlashcardGenerator';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { UserSidebar } from '../components/web/UserSidebar';
import { WebLayout } from '../components/web/WebLayout';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useNotes } from '../hooks/useNotes';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { FlashcardService } from '../services/FlashcardService';
import { FlashcardSet } from '../types/Flashcards';
import { AudioFile } from '../types/Note';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  noteId: string;
  createdAt: Date;
  lastReviewed?: Date;
  reviewCount: number;
}

export default function FlashcardsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const { user } = useAuth();
  const { notes, updateNote } = useNotes(user?.id || '', user?.email || null);
  const { isFeatureEnabled } = useFeatureFlags();
  const [note, setNote] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showFlashcardGenerator, setShowFlashcardGenerator] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // State change logging for development
  useEffect(() => {
    if (__DEV__) {
      console.log('showFlashcardGenerator state changed to:', showFlashcardGenerator);
    }
  }, [showFlashcardGenerator]);

  useEffect(() => {
    if (__DEV__) {
      console.log('showCreateWizard state changed to:', showCreateWizard);
    }
  }, [showCreateWizard]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accentPrimary');

  // Load flashcards from the database
  const loadFlashcards = useCallback(async () => {
    if (!user?.id || !note?.id) {
      if (__DEV__) {
        console.log('Missing user ID or note ID, skipping flashcard load');
      }
      return;
    }

    try {
      if (__DEV__) {
        console.log('Loading flashcards for note:', note.id, 'user:', user.id);
      }
      
      const flashcardService = FlashcardService.getInstance();
      const flashcardSets = await flashcardService.getFlashcardSetsForNote(note.id, user.id);
      
      if (__DEV__) {
        console.log('Loaded flashcard sets:', flashcardSets.length);
      }
      
      setFlashcardSets(flashcardSets);
      
      // Flatten all flashcards from all sets
      const allFlashcards = flashcardSets.flatMap(set => 
        (set.flashcards || []).map(card => ({
          id: card.id,
          front: card.question,
          back: card.answer,
          noteId: set.noteId,
          createdAt: new Date(card.createdAt),
          lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined,
          reviewCount: card.reviewCount || 0
        }))
      );
      
      if (__DEV__) {
        console.log('Total flashcards loaded:', allFlashcards.length);
        console.log('Flashcards data:', allFlashcards);
      }
      
      setFlashcards(allFlashcards);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  }, [user, note]);

  useEffect(() => {
    if (noteId && notes.length > 0) {
      const foundNote = notes.find(n => n.id === noteId);
      setNote(foundNote || null);
      
      // Load flashcards from database instead of note.flashcards
      if (foundNote && user?.id) {
        loadFlashcards();
      }
      
      setLoading(false);
    } else if (notes.length === 0 && !loading) {
      setLoading(false);
    }
  }, [noteId, notes, loading, user?.id, loadFlashcards]);

  // Reload flashcards when user changes
  useEffect(() => {
    if (user?.id && noteId) {
      loadFlashcards();
    }
  }, [user?.id, noteId, loadFlashcards]);

  // Feature flags and user status logging for development
  useEffect(() => {
    if (__DEV__) {
      console.log('useNotes: Notes details:', notes);
      console.log('useAuth: Initializing auth...');
      console.log('BetterAuthService: Getting current user...');
      console.log('BetterAuthService: Returning cached current user');
      console.log('Loading flashcards for note:', note?.id, 'user:', user?.id);
      console.log('useAuth: Auth initialization complete');
      console.log('useNotes: Setting up real-time sync for user:', user?.id);
      console.log('useNotes: Real-time sync is handled automatically by Supabase');
      console.log('useNotes: Real-time sync subscription established');
      console.log('Flashcards component debug info:');
      console.log('User:', user);
      console.log('User premium status:', user?.premium);
      console.log('AI flashcards feature enabled:', isFeatureEnabled('ai_flashcards'));
      console.log('Note:', note);
      console.log('Flashcard sets loaded:', flashcardSets.length);
      console.log('Total flashcards:', flashcards.length);
    }
  }, [user, note, isFeatureEnabled, flashcardSets, flashcards]);

  // Safe state setter to prevent crashes
  const safeSetShowFlashcardGenerator = (value: boolean) => {
    try {
      if (__DEV__) {
        console.log('safeSetShowFlashcardGenerator called with:', value);
      }
      setShowFlashcardGenerator(value);
      if (__DEV__) {
        console.log('State updated successfully');
      }
    } catch (error) {
      console.error('Error setting showFlashcardGenerator state:', error);
    }
  };

  const handleCreateFlashcards = () => {
    try {
      if (__DEV__) {
        console.log('=== handleCreateFlashcards START ===');
      }
      
      if (!note) {
        if (__DEV__) {
          console.log('No note available, returning early');
        }
        return;
      }
      
      if (__DEV__) {
        console.log('Note object structure:', {
          id: note.id,
          title: note.title,
          hasContent: !!note.content,
          contentLength: note.content?.length || 0,
          hasAudioFiles: !!note.audioFiles,
          audioFilesCount: note.audioFiles?.length || 0,
          audioFilesStructure: note.audioFiles?.map((f: AudioFile) => ({
            id: f.id,
            hasTranscription: !!f.transcription,
            transcriptionLength: f.transcription?.length || 0,
            hasAiTranscription: !!f.aiTranscription,
            aiTranscriptionLength: f.aiTranscription?.length || 0,
            hasUserEditedTranscription: !!f.userEditedTranscription,
            userEditedTranscriptionLength: f.userEditedTranscription?.length || 0,
            transcriptionStatus: f.transcriptionStatus
          })) || []
        });
      }
      
      if (!user?.id) {
        if (__DEV__) {
          console.log('No user ID available, returning early');
        }
        return;
      }
      
      // Development logging
      if (__DEV__) {
        console.log('handleCreateFlashcards called');
        console.log('User premium status:', user?.premium);
        console.log('AI flashcards feature enabled:', isFeatureEnabled('ai_flashcards'));
        console.log('Note content available:', {
          hasContent: note.content && note.content.trim().length > 0,
          hasAudioFilesWithTranscription: note.audioFiles && note.audioFiles.some((audioFile: AudioFile) => 
            audioFile.transcription && audioFile.transcription.trim().length > 0
          )
        });
      }
      
      // Check if note has content to generate flashcards from
      const hasContent = note.content && note.content.trim().length > 0;
      const hasAudioFilesWithTranscription = note.audioFiles && note.audioFiles.some((audioFile: AudioFile) => 
        (audioFile.transcription && audioFile.transcription.trim().length > 0) ||
        (audioFile.aiTranscription && audioFile.aiTranscription.trim().length > 0) ||
        (audioFile.userEditedTranscription && audioFile.userEditedTranscription.trim().length > 0)
      );
      
      if (__DEV__) {
        console.log('Content validation:', {
          hasContent,
          hasAudioFilesWithTranscription,
          contentLength: note.content?.trim().length || 0,
          audioFilesCount: note.audioFiles?.length || 0,
          transcriptions: note.audioFiles?.map((f: AudioFile) => ({
            transcription: f.transcription?.trim().length || 0,
            aiTranscription: f.aiTranscription?.trim().length || 0,
            userEditedTranscription: f.userEditedTranscription?.trim().length || 0
          })) || [],
          noteStructure: {
            hasContent: !!note.content,
            hasAudioFiles: !!note.audioFiles,
            audioFilesType: typeof note.audioFiles,
            audioFilesIsArray: Array.isArray(note.audioFiles)
          }
        });
      }
      
      if (!hasContent && !hasAudioFilesWithTranscription) {
        Alert.alert(
          t('flashcards.noContentAvailable'),
          t('flashcards.noContentAvailableMessage'),
          [{ text: t('noteDetail.ok') }]
        );
        return;
      }
      
      // On mobile, directly show the FlashcardGenerator modal
      // On web, show the inline wizard first
      if (Platform.OS === 'web') {
        if (__DEV__) {
          console.log('Web platform: setting showCreateWizard to true');
          console.log('Current showCreateWizard state:', showCreateWizard);
        }
        setShowCreateWizard(true);
        if (__DEV__) {
          console.log('setShowCreateWizard(true) called');
        }
      } else {
        // Mobile: directly show the FlashcardGenerator modal
        if (__DEV__) {
          console.log('Mobile platform: directly showing FlashcardGenerator modal');
          console.log('Setting showFlashcardGenerator to true');
          console.log('Current showFlashcardGenerator state:', showFlashcardGenerator);
        }
        safeSetShowFlashcardGenerator(true);
        if (__DEV__) {
          console.log('showFlashcardGenerator set to true');
        }
      }
      
      if (__DEV__) {
        console.log('=== handleCreateFlashcards END ===');
      }
    } catch (error) {
      console.error('Error in handleCreateFlashcards:', error);
      Alert.alert(t('flashcards.error'), t('flashcards.somethingWentWrongTryAgain'));
    }
  };

  const handleGenerateFlashcards = () => {
    if (__DEV__) {
      console.log('handleGenerateFlashcards called');
      console.log('Note:', note);
      console.log('Current showCreateWizard state:', showCreateWizard);
    }
    
    if (!note) {
      if (__DEV__) {
        console.log('No note available, returning early');
      }
      return;
    }
    
    // This function is called from the mobile inline wizard
    // It should open the FlashcardGenerator modal
    if (__DEV__) {
      console.log('Setting showFlashcardGenerator to true');
    }
    setShowCreateWizard(false); // Hide the inline wizard
    setShowFlashcardGenerator(true); // Show the actual modal
    if (__DEV__) {
      console.log('showFlashcardGenerator state should now be true');
    }
  };

  const handleReviewCard = (quality: 'easy' | 'medium' | 'hard') => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Finished reviewing all cards
      setCurrentCardIndex(0);
      setShowAnswer(false);
      Alert.alert(t('flashcards.reviewComplete'), t('flashcards.reviewedAllFlashcards'));
    }
  };

  const handleFlipCard = () => {
    setShowAnswer(!showAnswer);
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <LoadingSpinner size={50} />
        <ThemedText style={{ marginTop: 16, color: textColor }}>{t('flashcards.loadingFlashcards')}</ThemedText>
      </ThemedView>
    );
  }

  if (!note) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <Ionicons name="document-outline" size={64} color={accentColor} />
        <ThemedText style={{ marginTop: 16, color: textColor }}>{t('flashcards.noteNotFound')}</ThemedText>
        <TouchableOpacity 
          style={{ marginTop: 16, padding: 12, backgroundColor: accentColor, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <ThemedText style={{ color: '#FFFFFF' }}>{t('flashcards.goBack')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        sidebar={
          <UserSidebar activePage="note" />
        }
        header={
          <View style={{ 
            padding: 16, 
            borderBottomWidth: 1, 
            borderBottomColor: borderColor,
            backgroundColor: cardBackground,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                padding: 8,
                borderRadius: 8,
                backgroundColor: backgroundColor
              }}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={textColor} />
              <ThemedText style={{ marginLeft: 8, color: textColor }}>{t('flashcards.backToNote')}</ThemedText>
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>
                {t('flashcards.flashcardsTitle', { title: note.title || t('flashcards.untitledNote') })}
              </ThemedText>
              
            </View>
            
            <View style={{ width: 100 }} />
          </View>
        }
      >
        <ScrollView style={{ flex: 1, padding: 24 }}>
          
          {/* Show Create Wizard when showCreateWizard is true */}
          {showCreateWizard ? (
            <View style={{ 
              alignItems: 'center', 
              padding: 48,
              backgroundColor: cardBackground,
              borderRadius: 16,
              marginBottom: 24
            }}>
              <Ionicons name="school-outline" size={64} color={accentColor} />
              <ThemedText style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                marginTop: 16, 
                marginBottom: 8,
                color: textColor 
              }}>
                {t('flashcards.generateFlashcards')}
              </ThemedText>
              <ThemedText style={{ 
                textAlign: 'center', 
                marginBottom: 24,
                color: textColor,
                opacity: 0.8
              }}>
                {t('flashcards.aiAnalyzeNote')}
              </ThemedText>
              
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#6B7280',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8
                  }}
                  onPress={() => {
                    if (__DEV__) {
                      console.log('Cancel button pressed, setting showCreateWizard to false');
                    }
                    setShowCreateWizard(false);
                  }}
                >
                  <ThemedText style={{ color: '#FFFFFF' }}>{t('flashcards.cancel')}</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: accentColor,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8
                  }}
                  onPress={() => {
                    if (__DEV__) {
                      console.log('Generate button pressed - opening FlashcardGenerator modal');
                      console.log('Before state change - showCreateWizard:', showCreateWizard, 'showFlashcardGenerator:', showFlashcardGenerator);
                    }
                    setShowCreateWizard(false); // Hide the inline wizard
                    setShowFlashcardGenerator(true); // Show the FlashcardGenerator modal
                    if (__DEV__) {
                      console.log('After state change - showCreateWizard should be false, showFlashcardGenerator should be true');
                    }
                  }}
                >
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    {t('flashcards.generate')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Show normal content when showCreateWizard is false
            <>
              {flashcards.length === 0 ? (
                // No flashcards - show create wizard
                <View style={{ 
                  alignItems: 'center', 
                  padding: 48,
                  backgroundColor: cardBackground,
                  borderRadius: 16,
                  marginBottom: 24
                }}>
                  <Ionicons name="school-outline" size={64} color={accentColor} />
                  <ThemedText style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold', 
                    marginTop: 16, 
                    marginBottom: 8,
                    color: textColor 
                  }}>
                    {t('flashcards.noFlashcardsYet')}
                  </ThemedText>
                             <ThemedText style={{ 
                   textAlign: 'center', 
                   marginBottom: 24,
                   color: textColor,
                   opacity: 0.8
                 }}>
                   {isFeatureEnabled('ai_flashcards')
                     ? t('flashcards.createFlashcardsDescription')
                     : t('flashcards.upgradeDescription')
                   }
                 </ThemedText>
                 
                 {isFeatureEnabled('ai_flashcards') ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: accentColor,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={handleCreateFlashcards}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <ThemedText style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
                      {t('flashcards.createFlashcards')}
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FF6B35',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => router.push('/join-premium')}
                  >
                    <Ionicons name="star" size={20} color="#FFFFFF" />
                    <ThemedText style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
                      {t('flashcards.upgradeToPremium')}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // Show flashcards
              <View>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 24
                }}>
                  <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: textColor }}>
                    {t('flashcards.flashcardsCount', { count: flashcards.length })}
                  </ThemedText>
                  
                  {isFeatureEnabled('ai_flashcards') ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: accentColor,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                      onPress={() => setShowCreateWizard(true)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <ThemedText style={{ marginLeft: 4, color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                        {t('flashcards.addMore')}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Flashcard Study Interface */}
                {flashcards.length > 0 && (
                  <View style={{ 
                    backgroundColor: cardBackground, 
                    borderRadius: 16, 
                    padding: 24,
                    marginBottom: 24
                  }}>
                    {/* Progress Bar */}
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 20
                    }}>
                      <ThemedText style={{ fontSize: 16, color: textColor, opacity: 0.8 }}>
                        {t('flashcards.cardOf', { current: currentCardIndex + 1, total: flashcards.length })}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 14, color: textColor, opacity: 0.6 }}>
                        {t('flashcards.complete', { percent: Math.round(((currentCardIndex + 1) / flashcards.length) * 100) })}
                      </ThemedText>
                    </View>
                    
                    <View style={{ 
                      height: 4, 
                      backgroundColor: backgroundColor, 
                      borderRadius: 2,
                      marginBottom: 20
                    }}>
                      <View style={{ 
                        height: 4, 
                        backgroundColor: accentColor, 
                        borderRadius: 2,
                        width: `${((currentCardIndex + 1) / flashcards.length) * 100}%`
                      }} />
                    </View>

                    {/* Current Flashcard */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: backgroundColor,
                        borderRadius: 16,
                        padding: 32,
                        minHeight: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 3
                      }}
                      onPress={handleFlipCard}
                      activeOpacity={0.9}
                    >
                      <ThemedText style={{ 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: textColor,
                        textAlign: 'center',
                        lineHeight: 26
                      }}>
                        {showAnswer ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
                      </ThemedText>
                      
                      {!showAnswer && (
                        <View style={{ 
                          position: 'absolute', 
                          bottom: 16, 
                          right: 16,
                          backgroundColor: accentColor,
                          borderRadius: 20,
                          padding: 8
                        }}>
                          <Ionicons name="eye" size={16} color="#FFFFFF" />
                        </View>
                      )}
                      
                      {showAnswer && (
                        <View style={{ 
                          position: 'absolute', 
                          bottom: 16, 
                          right: 16,
                          backgroundColor: '#10B981',
                          borderRadius: 20,
                          padding: 8
                        }}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Flip Hint */}
                    <ThemedText style={{ 
                      textAlign: 'center', 
                      fontSize: 14, 
                      color: textColor, 
                      opacity: 0.6,
                      marginBottom: 24
                    }}>
                      {showAnswer ? t('flashcards.tapToSeeQuestionAgain') : t('flashcards.tapToRevealAnswer')}
                    </ThemedText>

                    {/* Review Buttons - Only show when answer is visible */}
                    {showAnswer && (
                      <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between',
                        gap: 12
                      }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#EF4444',
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center'
                          }}
                          onPress={() => handleReviewCard('hard')}
                        >
                          <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                          <ThemedText style={{ 
                            color: '#FFFFFF', 
                            fontWeight: '600', 
                            marginTop: 4,
                            fontSize: 14
                          }}>
                            {t('flashcards.hard')}
                          </ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#F59E0B',
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center'
                          }}
                          onPress={() => handleReviewCard('medium')}
                        >
                          <Ionicons name="remove-circle" size={24} color="#FFFFFF" />
                          <ThemedText style={{ 
                            color: '#FFFFFF', 
                            fontWeight: '600', 
                            marginTop: 4,
                            fontSize: 14
                          }}>
                            {t('flashcards.medium')}
                          </ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#10B981',
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center'
                          }}
                          onPress={() => handleReviewCard('easy')}
                        >
                          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                          <ThemedText style={{ 
                            color: '#FFFFFF', 
                            fontWeight: '600', 
                            marginTop: 4,
                            fontSize: 14
                          }}>
                            {t('flashcards.easy')}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Navigation Buttons */}
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      marginTop: 24
                    }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: backgroundColor,
                          paddingHorizontal: 20,
                          paddingVertical: 12,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          opacity: currentCardIndex === 0 ? 0.5 : 1
                        }}
                        onPress={() => {
                          if (currentCardIndex > 0) {
                            setCurrentCardIndex(currentCardIndex - 1);
                            setShowAnswer(false);
                          }
                        }}
                        disabled={currentCardIndex === 0}
                      >
                        <Ionicons name="chevron-back" size={20} color={textColor} />
                        <ThemedText style={{ marginLeft: 4, color: textColor, fontWeight: '600' }}>
                          {t('flashcards.previous')}
                        </ThemedText>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{
                          backgroundColor: backgroundColor,
                          paddingHorizontal: 20,
                          paddingVertical: 12,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          opacity: currentCardIndex === flashcards.length - 1 ? 0.5 : 1
                        }}
                        onPress={() => {
                          if (currentCardIndex < flashcards.length - 1) {
                            setCurrentCardIndex(currentCardIndex + 1);
                            setShowAnswer(false);
                          }
                        }}
                        disabled={currentCardIndex === flashcards.length - 1}
                      >
                        <ThemedText style={{ marginRight: 4, color: textColor, fontWeight: '600' }}>
                          {t('flashcards.next')}
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={20} color={textColor} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* All Flashcards List (Collapsible) */}
                <View style={{ 
                  backgroundColor: cardBackground, 
                  borderRadius: 16, 
                  padding: 20
                }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}
                    onPress={() => setShowAllCards(!showAllCards)}
                  >
                    <ThemedText style={{ 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      color: textColor 
                    }}>
                      {t('flashcards.allFlashcards', { count: flashcards.length })}
                    </ThemedText>
                    <Ionicons 
                      name={showAllCards ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={textColor} 
                    />
                  </TouchableOpacity>
                  
                  {showAllCards && (
                    <>
                      {flashcards.length === 0 ? (
                        <View style={{ 
                          padding: 20, 
                          alignItems: 'center',
                          backgroundColor: backgroundColor,
                          borderRadius: 8
                        }}>
                          <ThemedText style={{ 
                            fontSize: 16, 
                            color: textColor,
                            textAlign: 'center',
                            marginBottom: 8
                          }}>
                            {t('flashcards.noFlashcardsCreatedYet')}
                          </ThemedText>
                          <ThemedText style={{ 
                            fontSize: 14, 
                            color: textColor,
                            opacity: 0.7,
                            textAlign: 'center'
                          }}>
                            {t('flashcards.createFirstSet')}
                          </ThemedText>
                        </View>
                      ) : (
                        flashcards.map((card, index) => (
                          <View 
                            key={card.id} 
                            style={{
                              padding: 16,
                              borderBottomWidth: index < flashcards.length - 1 ? 1 : 0,
                              borderBottomColor: borderColor,
                              backgroundColor: index === currentCardIndex ? backgroundColor : 'transparent',
                              borderRadius: 8
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                <ThemedText style={{ 
                                  fontSize: 16, 
                                  fontWeight: '600', 
                                  marginBottom: 8,
                                  color: textColor 
                                }}>
                                  {t('flashcards.front')} {card.front}
                                </ThemedText>
                                <ThemedText style={{ 
                                  fontSize: 14, 
                                  color: textColor,
                                  opacity: 0.8 
                                }}>
                                  {t('flashcards.back')} {card.back}
                                </ThemedText>
                              </View>
                              
                              <View style={{ 
                                backgroundColor: backgroundColor, 
                                paddingHorizontal: 8, 
                                paddingVertical: 4, 
                                borderRadius: 12 
                              }}>
                                <ThemedText style={{ fontSize: 12, color: textColor }}>
                                  {t('flashcards.reviews', { count: card.reviewCount })}
                                </ThemedText>
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                    </>
                  )}
                </View>
              </View>
            )}
          </>
         )}
         </ScrollView>
         
         {/* Flashcard Generator Modal for Web */}
         {showFlashcardGenerator && (
           <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
             <FlashcardGenerator
               visible={showFlashcardGenerator}
               onClose={() => {
                 try {
                   if (__DEV__) {
                     console.log('Closing FlashcardGenerator modal on web');
                   }
                   safeSetShowFlashcardGenerator(false);
                 } catch (error) {
                   console.error('Error closing modal on web:', error);
                   // Force close if there's an error
                   setShowFlashcardGenerator(false);
                 }
               }}
               noteId={note?.id || ''}
               noteContent={note?.content || ''}
               userId={user?.id || ''}
               language={language || 'en'}
              onSuccess={async () => {
                if (__DEV__) {
                  console.log('Flashcards generated successfully on web, refreshing list...');
                }
                await loadFlashcards();
              }}
             />
           </View>
         )}
       </WebLayout>
     );
   }

  // Mobile layout
  try {
    return (
      <ThemedView style={{ flex: 1, backgroundColor }}>
        {/* Header */}
        <View style={{ 
          padding: 16, 
          paddingTop: Platform.OS === 'ios' ? 100 : 80, // Much more top padding for status bar
          borderBottomWidth: 1, 
          borderBottomColor: borderColor,
          backgroundColor: cardBackground,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <TouchableOpacity 
            style={{ marginRight: 16 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>
            {t('flashcards.flashcardsTitle', { title: note.title || t('flashcards.untitledNote') })}
          </ThemedText>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {flashcards.length === 0 ? (
            // No flashcards - show create wizard
            <View style={{ 
              alignItems: 'center', 
              padding: 32,
              backgroundColor: cardBackground,
              borderRadius: 16,
              marginBottom: 24
            }}>
              <Ionicons name="school-outline" size={64} color={accentColor} />
              <ThemedText style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                marginTop: 16, 
                marginBottom: 8,
                color: textColor 
              }}>
                {t('flashcards.noFlashcardsYet')}
              </ThemedText>
              <ThemedText style={{ 
                textAlign: 'center', 
                marginBottom: 24,
                color: textColor,
                opacity: 0.8
              }}>
                {isFeatureEnabled('ai_flashcards')
                  ? t('flashcards.createFlashcardsDescriptionShort')
                  : t('flashcards.upgradeDescription')
                }
              </ThemedText>
              
              {isFeatureEnabled('ai_flashcards') ? (
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: accentColor,
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8
                    }}
                    onPress={handleCreateFlashcards}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <ThemedText style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
                      {t('flashcards.createFlashcards')}
                    </ThemedText>
                  </TouchableOpacity>
                  
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FF6B35',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                                      onPress={() => router.push('/join-premium')}
                >
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <ThemedText style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
                    {t('flashcards.upgradeToPremium')}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Show flashcards
            <View>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24
              }}>
                <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>
                  {t('flashcards.flashcardsCount', { count: flashcards.length })}
                </ThemedText>
                
                {isFeatureEnabled('ai_flashcards') ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: accentColor,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => setShowFlashcardGenerator(true)}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <ThemedText style={{ marginLeft: 4, color: '#FFFFFF', fontSize: 14 }}>
                      {t('flashcards.addMore')}
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FF6B35',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => router.push('/join-premium')}
                  >
                    <Ionicons name="information-circle" size={16} color="#FFFFFF" />
                    <ThemedText style={{ marginLeft: 4, color: '#FFFFFF', fontSize: 14 }}>
                      {t('flashcards.upgrade')}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Flashcard Study Interface */}
              {flashcards.length > 0 && (
                <View style={{ 
                  backgroundColor: cardBackground, 
                  borderRadius: 16, 
                  padding: 20,
                  marginBottom: 24
                }}>
                {/* Progress Bar */}
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <ThemedText style={{ fontSize: 14, color: textColor, opacity: 0.8 }}>
                    {t('flashcards.cardOf', { current: currentCardIndex + 1, total: flashcards.length })}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: textColor, opacity: 0.6 }}>
                    {t('flashcards.complete', { percent: Math.round(((currentCardIndex + 1) / flashcards.length) * 100) })}
                  </ThemedText>
                </View>
                
                <View style={{ 
                  height: 3, 
                  backgroundColor: backgroundColor, 
                  borderRadius: 2,
                  marginBottom: 16
                }}>
                  <View style={{ 
                    height: 3, 
                    backgroundColor: accentColor, 
                    borderRadius: 2,
                    width: `${((currentCardIndex + 1) / flashcards.length) * 100}%`
                  }} />
                </View>

                {/* Current Flashcard */}
                <TouchableOpacity
                  style={{
                    backgroundColor: backgroundColor,
                    borderRadius: 12,
                    padding: 24,
                    minHeight: 160,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3
                  }}
                  onPress={handleFlipCard}
                  activeOpacity={0.9}
                >
                  <ThemedText style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: textColor,
                    textAlign: 'center',
                    lineHeight: 22
                  }}>
                    {showAnswer ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
                  </ThemedText>
                  
                  {!showAnswer && (
                    <View style={{ 
                      position: 'absolute', 
                      bottom: 12, 
                      right: 12,
                      backgroundColor: accentColor,
                      borderRadius: 16,
                      padding: 6
                    }}>
                      <Ionicons name="eye" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  
                  {showAnswer && (
                    <View style={{ 
                      position: 'absolute', 
                      bottom: 12, 
                      right: 12,
                      backgroundColor: '#10B981',
                      borderRadius: 16,
                      padding: 6
                    }}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Flip Hint */}
                <ThemedText style={{ 
                  textAlign: 'center', 
                  fontSize: 12, 
                  color: textColor, 
                  opacity: 0.6,
                  marginBottom: 20
                }}>
                  {showAnswer ? t('flashcards.tapToSeeQuestionAgain') : t('flashcards.tapToRevealAnswer')}
                </ThemedText>

                {/* Review Buttons - Only show when answer is visible */}
                {showAnswer && (
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    gap: 8
                  }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#EF4444',
                        paddingVertical: 14,
                        borderRadius: 10,
                        alignItems: 'center'
                      }}
                      onPress={() => handleReviewCard('hard')}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                      <ThemedText style={{ 
                        color: '#FFFFFF', 
                        fontWeight: '600', 
                        marginTop: 2,
                        fontSize: 12
                      }}>
                        {t('flashcards.hard')}
                      </ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#F59E0B',
                        paddingVertical: 14,
                        borderRadius: 10,
                        alignItems: 'center'
                      }}
                      onPress={() => handleReviewCard('medium')}
                    >
                      <Ionicons name="remove-circle" size={20} color="#FFFFFF" />
                      <ThemedText style={{ 
                        color: '#FFFFFF', 
                        fontWeight: '600', 
                        marginTop: 2,
                        fontSize: 12
                      }}>
                        {t('flashcards.medium')}
                      </ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#10B981',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center'
                      }}
                      onPress={() => handleReviewCard('easy')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <ThemedText style={{ 
                        color: '#FFFFFF', 
                        fontWeight: '600', 
                        marginTop: 2,
                        fontSize: 12
                      }}>
                        {t('flashcards.easy')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Navigation Buttons */}
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  marginTop: 20
                }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: backgroundColor,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: currentCardIndex === 0 ? 0.5 : 1
                    }}
                    onPress={() => {
                      if (currentCardIndex > 0) {
                        setCurrentCardIndex(currentCardIndex - 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentCardIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={18} color={textColor} />
                    <ThemedText style={{ marginLeft: 2, color: textColor, fontWeight: '600', fontSize: 14 }}>
                      {t('flashcards.previous')}
                    </ThemedText>
                  </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={{
                        backgroundColor: backgroundColor,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        opacity: currentCardIndex === flashcards.length - 1 ? 0.5 : 1
                      }}
                      onPress={() => {
                        if (currentCardIndex < flashcards.length - 1) {
                          setCurrentCardIndex(currentCardIndex + 1);
                          setShowAnswer(false);
                        }
                      }}
                      disabled={currentCardIndex === flashcards.length - 1}
                    >
                      <ThemedText style={{ marginRight: 2, color: textColor, fontWeight: '600', fontSize: 14 }}>
                        {t('flashcards.next')}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={18} color={textColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* All Flashcards List (Collapsible) */}
              <View style={{ backgroundColor: cardBackground, borderRadius: 12, padding: 16 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                  }}
                  onPress={() => setShowAllCards(!showAllCards)}
                >
                  <ThemedText style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: textColor 
                  }}>
                    {t('flashcards.allFlashcards', { count: flashcards.length })}
                  </ThemedText>
                  <Ionicons 
                    name={showAllCards ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={textColor} 
                  />
                </TouchableOpacity>
                
                {showAllCards && (
                  <>
                    {flashcards.length === 0 ? (
                      <View style={{ 
                        padding: 16, 
                        alignItems: 'center',
                        backgroundColor: backgroundColor,
                        borderRadius: 8
                      }}>
                        <ThemedText style={{ 
                          fontSize: 14, 
                          color: textColor,
                          textAlign: 'center',
                          marginBottom: 6
                        }}>
                          {t('flashcards.noFlashcardsCreatedYet')}
                        </ThemedText>
                        <ThemedText style={{ 
                          fontSize: 12, 
                          color: textColor,
                          opacity: 0.7,
                          textAlign: 'center'
                        }}>
                          {t('flashcards.createFirstSet')}
                        </ThemedText>
                      </View>
                    ) : (
                      flashcards.map((card, index) => (
                        <View 
                          key={card.id} 
                          style={{
                            padding: 12,
                            borderBottomWidth: index < flashcards.length - 1 ? 1 : 0,
                            borderBottomColor: borderColor,
                            backgroundColor: index === currentCardIndex ? backgroundColor : 'transparent',
                            borderRadius: 8
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                              <ThemedText style={{ 
                                fontSize: 14, 
                                fontWeight: '600', 
                                marginBottom: 6,
                                color: textColor 
                              }}>
                                {t('flashcards.front')} {card.front}
                              </ThemedText>
                              <ThemedText style={{ 
                                fontSize: 13, 
                                color: textColor,
                                opacity: 0.8 
                              }}>
                                {t('flashcards.back')} {card.back}
                              </ThemedText>
                            </View>
                            
                            <View style={{ 
                              backgroundColor: backgroundColor, 
                              paddingHorizontal: 6, 
                              paddingVertical: 2, 
                              borderRadius: 10 
                            }}>
                              <ThemedText style={{ fontSize: 11, color: textColor }}>
                                {t('flashcards.reviews', { count: card.reviewCount })}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                    </>
                  )}
                </View>
            </View>
          )}
        </ScrollView>

        {/* Flashcard Generator Modal */}
        {showFlashcardGenerator && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
            <FlashcardGenerator
              visible={showFlashcardGenerator}
              onClose={() => {
                try {
                  if (__DEV__) {
                    console.log('Closing FlashcardGenerator modal');
                  }
                  safeSetShowFlashcardGenerator(false);
                } catch (error) {
                  console.error('Error closing modal:', error);
                  // Force close if there's an error
                  setShowFlashcardGenerator(false);
                }
              }}
              noteId={note?.id || ''}
              noteContent={note?.content || ''}
              note={note}
              userId={user?.id || ''}
              language={language || 'en'}
              onSuccess={async () => {
                if (__DEV__) {
                  console.log('Flashcards generated successfully, refreshing list...');
                }
                await loadFlashcards();
              }}
            />
          </View>
        )}
      </ThemedView>
    );
  } catch (error) {
    console.error('Error rendering mobile flashcards:', error);
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Ionicons name="alert-circle" size={64} color="#FF0000" />
        <ThemedText style={{ marginTop: 16, color: '#000000', textAlign: 'center' }}>
          {t('flashcards.somethingWentWrong')}
        </ThemedText>
        <TouchableOpacity 
          style={{ marginTop: 16, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <ThemedText style={{ color: '#FFFFFF' }}>{t('flashcards.goBack')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
}
