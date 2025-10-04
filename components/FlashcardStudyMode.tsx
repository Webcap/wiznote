import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { FlashcardService } from '../services/FlashcardService';
import { FlashcardSet } from '../types/Flashcards';
import { FlashcardCard } from './FlashcardCard';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface FlashcardStudyModeProps {
  flashcardSet: FlashcardSet;
  onClose: () => void;
  onComplete?: (results: any) => void;
}

export const FlashcardStudyMode: React.FC<FlashcardStudyModeProps> = ({
  flashcardSet,
  onClose,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyResults, setStudyResults] = useState<Array<{
    flashcardId: string;
    isCorrect: boolean;
    timeSpent: number;
    userAnswer?: string;
  }>>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const primaryColor = useThemeColor({}, 'primary');

  const currentFlashcard = flashcardSet.flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcardSet.flashcards.length) * 100;

  useEffect(() => {
    // Reset state when flashcard set changes
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyResults([]);
    setStartTime(new Date());
  }, [flashcardSet.id]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcardSet.flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkCorrect = () => {
    if (!currentFlashcard) return;

    const result = {
      flashcardId: currentFlashcard.id,
      isCorrect: true,
      timeSpent: Date.now() - startTime.getTime(),
    };

    setStudyResults([...studyResults, result]);

    if (currentIndex < flashcardSet.flashcards.length - 1) {
      handleNext();
    } else {
      handleComplete();
    }
  };

  const handleMarkIncorrect = () => {
    if (!currentFlashcard) return;

    const result = {
      flashcardId: currentFlashcard.id,
      isCorrect: false,
      timeSpent: Date.now() - startTime.getTime(),
    };

    setStudyResults([...studyResults, result]);

    if (currentIndex < flashcardSet.flashcards.length - 1) {
      handleNext();
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      const flashcardService = FlashcardService.getInstance();
      
      // Create study session
      const sessionData = {
        flashcardSetId: flashcardSet.id,
        userId: flashcardSet.userId,
        totalCards: flashcardSet.flashcards.length,
        correctAnswers: studyResults.filter(r => r.isCorrect).length,
        incorrectAnswers: studyResults.filter(r => !r.isCorrect).length,
        timeSpent: Math.round((Date.now() - startTime.getTime()) / 1000),
      };

      // TODO: Save study session to database
      console.log('Study session completed:', sessionData);

      if (onComplete) {
        onComplete({
          session: sessionData,
          results: studyResults,
        });
      } else {
        Alert.alert(
          'Study Session Complete!',
          `You completed ${flashcardSet.flashcards.length} flashcards!\n` +
          `Correct: ${studyResults.filter(r => r.isCorrect).length}\n` +
          `Incorrect: ${studyResults.filter(r => !r.isCorrect).length}`,
          [
            {
              text: 'Review Results',
              onPress: () => {
                // TODO: Navigate to results view
              },
            },
            {
              text: 'Close',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error completing study session:', error);
      Alert.alert('Error', 'Failed to save study results');
    }
  };

  const handleExit = () => {
    if (studyResults.length > 0) {
      Alert.alert(
        'Exit Study Session?',
        'Your progress will be lost. Are you sure you want to exit?',
        [
          {
            text: 'Continue Studying',
            style: 'cancel',
          },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: onClose,
          },
        ]
      );
    } else {
      onClose();
    }
  };

  if (!currentFlashcard) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.errorText, { color: textColor }]}>
          No flashcards available
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBackground }]}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {flashcardSet.title}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: mutedTextColor }]}>
            Card {currentIndex + 1} of {flashcardSet.flashcards.length}
          </ThemedText>
        </View>

        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: cardBackground }]}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: primaryColor, width: `${progress}%` },
            ]}
          />
        </View>
        <ThemedText style={[styles.progressText, { color: mutedTextColor }]}>
          {Math.round(progress)}%
        </ThemedText>
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        <FlashcardCard
          flashcard={currentFlashcard}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onFlip={handleFlip}
          showNavigation={false}
        />
      </View>

      {/* Study Controls */}
      <View style={[styles.controlsContainer, { backgroundColor: cardBackground }]}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#F44336' }]}
            onPress={handleMarkIncorrect}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            <ThemedText style={styles.controlButtonText}>Incorrect</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleMarkCorrect}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <ThemedText style={styles.controlButtonText}>Correct</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Navigation Controls */}
        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: currentIndex > 0 ? primaryColor : mutedTextColor },
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navInfo}>
            <ThemedText style={[styles.navText, { color: textColor }]}>
              {currentFlashcard.category || 'General'}
            </ThemedText>
            <ThemedText style={[styles.navSubtext, { color: mutedTextColor }]}>
              {currentFlashcard.difficulty} • Review #{currentFlashcard.reviewCount}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor:
                  currentIndex < flashcardSet.flashcards.length - 1 ? primaryColor : mutedTextColor,
              },
            ]}
            onPress={handleNext}
            disabled={currentIndex === flashcardSet.flashcards.length - 1}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  exitButton: {
    padding: 8,
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  controlsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navInfo: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  navSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});
