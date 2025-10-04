import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { FlashcardService } from '../services/FlashcardService';
import { FlashcardGenerationOptions } from '../types/Flashcards';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface FlashcardGeneratorPageProps {
  onClose: () => void;
  noteId?: string;
  noteContent?: string;
  userId: string;
}

export const FlashcardGeneratorPage: React.FC<FlashcardGeneratorPageProps> = ({
  onClose,
  noteId,
  noteContent,
  userId,
}) => {
  const [numCards, setNumCards] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [focusAreas, setFocusAreas] = useState<string>('');
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customContent, setCustomContent] = useState<string>('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const primaryColor = useThemeColor({}, 'primary');

  const difficultyOptions: Array<{ value: 'easy' | 'medium' | 'hard'; label: string; color: string }> = [
    { value: 'easy', label: 'Easy', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'hard', label: 'Hard', color: '#F44336' },
  ];

  const handleGenerate = async () => {
    // Determine the content to use for generation
    const contentToUse = noteContent || customContent;
    
    if (!contentToUse || contentToUse.trim().length < 50) {
      Alert.alert(
        'Insufficient Content',
        'Please provide at least 50 characters of content to generate meaningful flashcards.',
        [
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    setIsGenerating(true);
    try {
      const flashcardService = FlashcardService.getInstance();
      
      const options: FlashcardGenerationOptions = {
        numCards,
        difficulty,
        focusAreas: focusAreas ? focusAreas.split(',').map(area => area.trim()) : undefined,
        includeExplanations,
      };

      const result = await flashcardService.generateFlashcards(noteId || 'custom', userId, options, contentToUse);
      
      if (result.success && result.flashcardSet) {
        Alert.alert(
          'Success!',
          `Generated ${result.flashcardSet.totalCards} flashcards in ${Math.round((result.generationTime || 0) / 1000)}s`,
          [
            {
              text: 'View Flashcards',
              onPress: () => {
                onClose();
              },
            },
            {
              text: 'Close',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Generation Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Flashcard generation error:', error);
      Alert.alert('Error', 'Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (isGenerating) {
      Alert.alert(
        'Generation in Progress',
        'Please wait for the current generation to complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    onClose();
  };

  return (
    <ThemedView style={[
      styles.container,
      ...(Platform.OS === 'web' && {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
      })
    ]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { backgroundColor: cardBackground },
        ...(Platform.OS === 'web' && {
          paddingHorizontal: 32,
          paddingVertical: 28
        })
      ]}>
        <ThemedText style={[
          styles.title, 
          { color: textColor },
          ...(Platform.OS === 'web' && {
            fontSize: 28
          })
        ]}>
          Generate Flashcards
        </ThemedText>
        <TouchableOpacity 
          onPress={handleClose} 
          style={[
            styles.closeButton,
            ...(Platform.OS === 'web' && {
              padding: 8,
              borderRadius: 8,
              transition: 'background-color 0.2s ease'
            })
          ]}
          {...(Platform.OS === 'web' && {
            onMouseEnter: (e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          })}
        >
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[
        styles.content, 
        ...(Platform.OS === 'web' && {
          paddingHorizontal: 32
        })
      ]} showsVerticalScrollIndicator={false}>
        {/* Content Preview or Custom Input */}
        {noteContent ? (
          <View style={[
            styles.section, 
            { backgroundColor: cardBackground },
            ...(Platform.OS === 'web' && {
              padding: 24,
              marginBottom: 24
            })
          ]}>
            <ThemedText style={[
              styles.sectionTitle, 
              { color: textColor },
              ...(Platform.OS === 'web' && {
                fontSize: 20
              })
            ]}>
              Note Content Preview
            </ThemedText>
            <View style={[styles.contentPreview, { borderColor: mutedTextColor }]}>
              <ThemedText style={[styles.contentText, { color: mutedTextColor }]} numberOfLines={3}>
                {noteContent}
              </ThemedText>
              <ThemedText style={[styles.contentLength, { color: mutedTextColor }]}>
                {noteContent.length} characters
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[
            styles.section, 
            { backgroundColor: cardBackground },
            ...(Platform.OS === 'web' && {
              padding: 24,
              marginBottom: 24
            })
          ]}>
            <ThemedText style={[
              styles.sectionTitle, 
              { color: textColor },
              ...(Platform.OS === 'web' && {
                fontSize: 20
              })
            ]}>
              Custom Content
            </ThemedText>
            <TextInput
              style={[
                styles.textInput, 
                { color: textColor, borderColor: mutedTextColor, minHeight: 80 },
                ...(Platform.OS === 'web' && {
                  fontSize: 16,
                  padding: 16
                })
              ]}
              value={customContent}
              onChangeText={setCustomContent}
              placeholder="Enter the content you want to create flashcards from (minimum 50 characters)..."
              placeholderTextColor={mutedTextColor}
              multiline
              numberOfLines={3}
            />
            <ThemedText style={[styles.helperText, { color: mutedTextColor }]}>
              {customContent.length}/50 characters minimum
            </ThemedText>
          </View>
        )}

        {/* Number of Cards */}
        <View style={[
          styles.section, 
          { backgroundColor: cardBackground },
          ...(Platform.OS === 'web' && {
            padding: 24,
            marginBottom: 24
          })
        ]}>
          <ThemedText style={[
            styles.sectionTitle, 
            { color: textColor },
            ...(Platform.OS === 'web' && {
              fontSize: 20
            })
          ]}>
            Number of Cards
          </ThemedText>
          <View style={styles.numberInputContainer}>
            <TouchableOpacity
              style={[
                styles.numberButton, 
                { backgroundColor: primaryColor },
                ...(Platform.OS === 'web' && {
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                })
              ]}
              onPress={() => setNumCards(Math.max(5, numCards - 1))}
              disabled={numCards <= 5}
              {...(Platform.OS === 'web' && {
                onMouseEnter: (e) => {
                  if (numCards > 5) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              })}
            >
              <Ionicons name="remove" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.numberInput, 
                { color: textColor, borderColor: mutedTextColor },
                ...(Platform.OS === 'web' && {
                  fontSize: 18,
                  padding: 12
                })
              ]}
              value={numCards.toString()}
              onChangeText={(text) => {
                const num = parseInt(text);
                if (!isNaN(num) && num >= 5 && num <= 20) {
                  setNumCards(num);
                }
              }}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity
              style={[
                styles.numberButton, 
                { backgroundColor: primaryColor },
                ...(Platform.OS === 'web' && {
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                })
              ]}
              onPress={() => setNumCards(Math.min(20, numCards + 1))}
              disabled={numCards >= 20}
              {...(Platform.OS === 'web' && {
                onMouseEnter: (e) => {
                  if (numCards < 20) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              })}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.helperText, { color: mutedTextColor }]}>
            Choose between 5-20 cards
          </ThemedText>
        </View>

        {/* Difficulty Level */}
        <View style={[
          styles.section, 
          { backgroundColor: cardBackground },
          ...(Platform.OS === 'web' && {
            padding: 24,
            marginBottom: 24
          })
        ]}>
          <ThemedText style={[
            styles.sectionTitle, 
            { color: textColor },
            ...(Platform.OS === 'web' && {
              fontSize: 20
            })
          ]}>
            Difficulty Level
          </ThemedText>
          <View style={styles.difficultyContainer}>
            {difficultyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.difficultyOption,
                  {
                    backgroundColor: difficulty === option.value ? option.color : 'transparent',
                    borderColor: difficulty === option.value ? option.color : mutedTextColor,
                  },
                  ...(Platform.OS === 'web' && {
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  })
                ]}
                onPress={() => setDifficulty(option.value)}
                {...(Platform.OS === 'web' && {
                  onMouseEnter: (e) => {
                    if (difficulty !== option.value) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  },
                  onMouseLeave: (e) => {
                    if (difficulty !== option.value) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }
                })}
              >
                <ThemedText
                  style={[
                    styles.difficultyText,
                    {
                      color: difficulty === option.value ? '#FFFFFF' : textColor,
                    },
                    ...(Platform.OS === 'web' && {
                      fontSize: 16
                    })
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Focus Areas */}
        <View style={[
          styles.section, 
          { backgroundColor: cardBackground },
          ...(Platform.OS === 'web' && {
            padding: 24,
            marginBottom: 24
          })
        ]}>
          <ThemedText style={[
            styles.sectionTitle, 
            { color: textColor },
            ...(Platform.OS === 'web' && {
              fontSize: 20
            })
          ]}>
            Focus Areas (Optional)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput, 
              { color: textColor, borderColor: mutedTextColor },
              ...(Platform.OS === 'web' && {
                fontSize: 16,
                padding: 16
              })
            ]}
            value={focusAreas}
            onChangeText={setFocusAreas}
            placeholder="e.g., key concepts, definitions, examples"
            placeholderTextColor={mutedTextColor}
            multiline
            numberOfLines={2}
          />
          <ThemedText style={[styles.helperText, { color: mutedTextColor }]}>
            Separate multiple areas with commas
          </ThemedText>
        </View>

        {/* Include Explanations */}
        <View style={[
          styles.section, 
          { backgroundColor: cardBackground },
          ...(Platform.OS === 'web' && {
            padding: 24,
            marginBottom: 24
          })
        ]}>
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              ...(Platform.OS === 'web' && {
                cursor: 'pointer'
              })
            ]}
            onPress={() => setIncludeExplanations(!includeExplanations)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: includeExplanations ? primaryColor : 'transparent',
                  borderColor: includeExplanations ? primaryColor : mutedTextColor,
                },
              ]}
            >
              {includeExplanations && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <ThemedText style={[
              styles.checkboxLabel, 
              { color: textColor },
              ...(Platform.OS === 'web' && {
                fontSize: 16
              })
            ]}>
              Include explanations for answers
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Generate Button */}
      <View style={[
        styles.footer, 
        { backgroundColor: cardBackground },
        ...(Platform.OS === 'web' && {
          paddingHorizontal: 32,
          paddingVertical: 24
        })
      ]}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            {
              backgroundColor: isGenerating ? mutedTextColor : '#4CAF50',
            },
            ...(Platform.OS === 'web' && {
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            })
          ]}
          onPress={handleGenerate}
          disabled={isGenerating}
          {...(Platform.OS === 'web' && {
            onMouseEnter: (e) => {
              if (!isGenerating) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
              }
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          })}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="flash" size={20} color="#FFFFFF" />
          )}
          <ThemedText style={[
            styles.generateButtonText,
            ...(Platform.OS === 'web' && {
              fontSize: 18
            })
          ]}>
            {isGenerating ? 'Generating...' : `Generate ${numCards} Flashcards`}
          </ThemedText>
        </TouchableOpacity>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    ...(Platform.OS === 'web' && {
      marginBottom: 24,
      padding: 24,
      borderRadius: 12,
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  contentPreview: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#F5F5F5',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  contentLength: {
    fontSize: 12,
    textAlign: 'right',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'web' && {
      marginBottom: 12,
    }),
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      width: 48,
      height: 48,
      borderRadius: 24,
    }),
  },
  numberInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' && {
      width: 80,
      height: 48,
      fontSize: 18,
      marginHorizontal: 16,
    }),
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...(Platform.OS === 'web' && {
      gap: 16,
    }),
  },
  difficultyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 20,
      paddingVertical: 12,
      minWidth: 100,
    }),
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' && {
      fontSize: 16,
    }),
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    ...(Platform.OS === 'web' && {
      paddingVertical: 20,
      borderRadius: 12,
      gap: 12,
    }),
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' && {
      fontSize: 18,
    }),
  },
});
