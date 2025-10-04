import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { Flashcard } from '../types/Flashcards';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface FlashcardCardProps {
  flashcard: Flashcard;
  onNext?: () => void;
  onPrevious?: () => void;
  onFlip?: () => void;
  showNavigation?: boolean;
  showDifficulty?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth * 0.9, 400);
const CARD_HEIGHT = 300;

export const FlashcardCard: React.FC<FlashcardCardProps> = ({
  flashcard,
  onNext,
  onPrevious,
  onFlip,
  showNavigation = true,
  showDifficulty = true,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const primaryColor = useThemeColor({}, 'primary');

  const difficultyColors = {
    easy: '#4CAF50',
    medium: '#FF9800',
    hard: '#F44336',
  };

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    
    Animated.spring(flipAnimation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    setIsFlipped(!isFlipped);
    onFlip?.();
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const renderDifficultyBadge = () => {
    if (!showDifficulty) return null;
    
    return (
      <View
        style={[
          styles.difficultyBadge,
          { backgroundColor: difficultyColors[flashcard.difficulty] },
        ]}
      >
        <ThemedText style={styles.difficultyText}>
          {flashcard.difficulty.toUpperCase()}
        </ThemedText>
      </View>
    );
  };

  const renderCardContent = (isBack: boolean) => {
    if (isBack) {
      return (
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <ThemedText style={[styles.cardLabel, { color: mutedTextColor }]}>
              Answer
            </ThemedText>
            {renderDifficultyBadge()}
          </View>
          
          <ThemedText style={[styles.cardText, { color: textColor }]}>
            {flashcard.answer}
          </ThemedText>
          
          {flashcard.explanation && (
            <View style={styles.explanationContainer}>
              <ThemedText style={[styles.explanationLabel, { color: mutedTextColor }]}>
                Explanation
              </ThemedText>
              <ThemedText style={[styles.explanationText, { color: textColor }]}>
                {flashcard.explanation}
              </ThemedText>
            </View>
          )}
          
          {flashcard.tags && flashcard.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {flashcard.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: primaryColor }]}>
                  <ThemedText style={styles.tagText}>#{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText style={[styles.cardLabel, { color: mutedTextColor }]}>
            Question
          </ThemedText>
          {renderDifficultyBadge()}
        </View>
        
        <ThemedText style={[styles.cardText, { color: textColor }]}>
          {flashcard.question}
        </ThemedText>
        
        {flashcard.category && (
          <View style={styles.categoryContainer}>
            <ThemedText style={[styles.categoryLabel, { color: mutedTextColor }]}>
              Category: {flashcard.category}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Card Container */}
      <View style={styles.cardContainer}>
        {/* Front of Card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            { backgroundColor: cardBackground },
            frontAnimatedStyle,
          ]}
        >
          {renderCardContent(false)}
        </Animated.View>

        {/* Back of Card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: cardBackground },
            backAnimatedStyle,
          ]}
        >
          {renderCardContent(true)}
        </Animated.View>
      </View>

      {/* Flip Button */}
      <TouchableOpacity
        style={[styles.flipButton, { backgroundColor: primaryColor }]}
        onPress={handleFlip}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isFlipped ? 'eye-off' : 'eye'}
          size={20}
          color="#FFFFFF"
        />
        <ThemedText style={styles.flipButtonText}>
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </ThemedText>
      </TouchableOpacity>

      {/* Navigation Controls */}
      {showNavigation && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: mutedTextColor }]}
            onPress={onPrevious}
            disabled={!onPrevious}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navInfo}>
            <ThemedText style={[styles.navText, { color: mutedTextColor }]}>
              {flashcard.category || 'General'}
            </ThemedText>
            <ThemedText style={[styles.navSubtext, { color: mutedTextColor }]}>
              {flashcard.difficulty} • Review #{flashcard.reviewCount}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: mutedTextColor }]}
            onPress={onNext}
            disabled={!onNext}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    zIndex: 1,
  },
  cardBack: {
    zIndex: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
  },
  explanationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'inherit',
  },
  categoryContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CARD_WIDTH,
    marginTop: 24,
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
});
