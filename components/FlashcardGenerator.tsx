import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
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

// Check if FlashcardService is available
let isFlashcardServiceAvailable = false;
try {
  // Test if the service can be instantiated
  const testService = FlashcardService.getInstance();
  isFlashcardServiceAvailable = !!testService;
  console.log('FlashcardService is available:', isFlashcardServiceAvailable);
} catch (error) {
  console.error('FlashcardService not available:', error);
  // On web, try to continue anyway - the service might work at runtime
  if (typeof window !== 'undefined') {
    console.log('Web environment detected, attempting to continue despite initialization error');
    isFlashcardServiceAvailable = true; // Allow web to try anyway
  } else {
    isFlashcardServiceAvailable = false;
  }
}

interface FlashcardGeneratorProps {
  visible: boolean;
  onClose: () => void;
  noteId?: string;
  noteContent?: string;
  note?: any; // Full note object including audioFiles
  userId: string;
  onSuccess?: () => void; // Callback when flashcards are successfully generated
}

export const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({
  visible,
  onClose,
  noteId,
  noteContent,
  note,
  userId,
  onSuccess,
}) => {
  console.log('=== FlashcardGenerator Component Start ===');
  console.log('Platform:', Platform.OS);
  console.log('Props received:', { visible, noteId, userId, noteContentLength: noteContent?.length || 0 });
  console.log('Is web environment:', typeof window !== 'undefined');
  console.log('Component should render with visible =', visible);
  
  // All useState hooks must be at the top level
  const [numCards, setNumCards] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [focusAreas, setFocusAreas] = useState<string>('');
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customContent, setCustomContent] = useState<string>('');
  
  console.log('State variables initialized successfully');
  console.log('FlashcardService is available:', isFlashcardServiceAvailable);

  // Safe theme color access with fallbacks
  let backgroundColor, cardBackground, textColor, mutedTextColor, primaryColor;
  try {
    backgroundColor = useThemeColor('background') || '#FFFFFF';
    cardBackground = useThemeColor('card') || '#F2F2F7';
    textColor = useThemeColor('text') || '#000000';
    mutedTextColor = useThemeColor('mutedText') || '#8E8E93';
    primaryColor = useThemeColor('primary') || '#007AFF';
    console.log('Theme colors loaded successfully');
  } catch (error) {
    console.error('Error loading theme colors:', error);
    // Use fallback colors
    backgroundColor = '#FFFFFF';
    cardBackground = '#F2F2F7';
    textColor = '#000000';
    mutedTextColor = '#8E8E93';
    primaryColor = '#007AFF';
  }

  // Debug logging
  console.log('FlashcardGenerator props:', {
    visible,
    noteId,
    userId,
    noteContentLength: noteContent?.length || 0,
    hasNoteContent: !!noteContent,
    hasNote: !!note,
    audioFilesCount: note?.audioFiles?.length || 0
  });

  // If we're missing critical dependencies, show a simple fallback
  if (!backgroundColor || !cardBackground || !textColor) {
    console.log('Using fallback UI due to missing theme colors');
    return (
      <Modal
        visible={visible}
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={onClose}
        transparent={Platform.OS === 'web' ? true : false}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            padding: 20, 
            borderRadius: 10, 
            margin: 20,
            minWidth: 300
          }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              Flashcard Generator
            </ThemedText>
            <ThemedText style={{ marginBottom: 20 }}>
              Service temporarily unavailable. Please try again later.
            </ThemedText>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#007AFF', 
                padding: 10, 
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={onClose}
            >
              <ThemedText style={{ color: '#FFFFFF' }}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const difficultyOptions: Array<{ value: 'easy' | 'medium' | 'hard'; label: string; color: string }> = [
    { value: 'easy', label: 'Easy', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'hard', label: 'Hard', color: '#F44336' },
  ];

  const handleGenerate = async () => {
    try {
      console.log('=== handleGenerate START ===');
      console.log('Platform:', Platform.OS);
      console.log('FlashcardService available:', isFlashcardServiceAvailable);
      console.log('Content length:', (noteContent || customContent)?.length || 0);
      console.log('Note ID:', noteId);
      console.log('User ID:', userId);
      console.log('Is web environment:', typeof window !== 'undefined');
      
      // Check if FlashcardService is available
      if (!isFlashcardServiceAvailable) {
        console.error('FlashcardService is not available');
        Alert.alert('Service Unavailable', 'Flashcard generation service is not available. Please try again later.');
        return;
      }
      
      // Determine the content to use for generation
      let contentToUse = noteContent || customContent;
      
      // If we have a full note object, include audio transcriptions
      if (note && note.audioFiles && note.audioFiles.length > 0) {
        console.log('Found audio files:', note.audioFiles.length);
        const transcriptions = note.audioFiles
          .filter((audioFile: any) => 
            (audioFile.transcription && audioFile.transcription.trim().length > 0) ||
            (audioFile.aiTranscription && audioFile.aiTranscription.trim().length > 0) ||
            (audioFile.userEditedTranscription && audioFile.userEditedTranscription.trim().length > 0)
          )
          .map((audioFile: any) => 
            audioFile.userEditedTranscription || audioFile.transcription || audioFile.aiTranscription
          );
        
        console.log('Found transcriptions:', transcriptions.length);
        
        if (transcriptions.length > 0) {
          const transcriptionText = transcriptions.join('\n');
          contentToUse = (contentToUse || '') + '\n' + transcriptionText;
          console.log('Combined content length:', contentToUse.length);
        }
      }
      
      console.log('Final content to use length:', contentToUse?.trim().length || 0);
      
      // Check if we have sufficient content (either text content or audio transcriptions)
      const hasTextContent = noteContent && noteContent.trim().length >= 50;
      const hasAudioTranscriptions = note && note.audioFiles && note.audioFiles.some((audioFile: any) => 
        (audioFile.transcription && audioFile.transcription.trim().length >= 50) ||
        (audioFile.aiTranscription && audioFile.aiTranscription.trim().length >= 50) ||
        (audioFile.userEditedTranscription && audioFile.userEditedTranscription.trim().length >= 50)
      );
      
      if (!contentToUse || contentToUse.trim().length < 50) {
        if (hasTextContent || hasAudioTranscriptions) {
          // We have sufficient content in individual sources, but combined might be shorter
          // Allow generation to proceed
          console.log('Sufficient content found in individual sources, proceeding with generation');
        } else {
          Alert.alert(
            'Insufficient Content',
            'Please provide at least 50 characters of content (text or audio transcription) to generate meaningful flashcards.',
            [{ text: 'OK', style: 'cancel' }]
          );
          return;
        }
      }

      console.log('Setting isGenerating to true');
      setIsGenerating(true);
      
      console.log('Getting FlashcardService instance...');
      const flashcardService = FlashcardService.getInstance();
      console.log('FlashcardService instance obtained');
      
      const options: FlashcardGenerationOptions = {
        numCards,
        difficulty,
        focusAreas: focusAreas ? focusAreas.split(',').map(area => area.trim()) : undefined,
        includeExplanations,
      };
      
      console.log('Generation options:', options);
      console.log('Calling generateFlashcards...');
      
      const result = await flashcardService.generateFlashcards(noteId || 'custom', userId, options, contentToUse);
      
      console.log('generateFlashcards result:', result);
      
      if (result.success && result.flashcardSet) {
        Alert.alert(
          'Success!',
          `Generated ${result.flashcardSet.totalCards} flashcards in ${Math.round((result.generationTime || 0) / 1000)}s`,
          [
            {
              text: 'View Flashcards',
              onPress: () => {
                onClose();
                // Call onSuccess callback to refresh the flashcards list
                if (onSuccess) {
                  onSuccess();
                }
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
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      Alert.alert('Error', 'Failed to generate flashcards. Please try again.');
    } finally {
      console.log('Setting isGenerating to false');
      setIsGenerating(false);
      console.log('=== handleGenerate END ===');
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

  try {
    console.log('Attempting to render main FlashcardGenerator UI...');
    return (
      <Modal
        visible={visible}
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={handleClose}
        transparent={Platform.OS === 'web' ? true : false}
      >
        {Platform.OS === 'web' ? (
          // Web-optimized modal overlay
          <View style={styles.webOverlay}>
            <View style={[styles.webModal, { backgroundColor: backgroundColor }]}>
              {/* Web Header */}
              <View style={[styles.webHeader, { backgroundColor: cardBackground }]}>
                <ThemedText style={[styles.webTitle, { color: textColor }]}>
                  Generate Flashcards
                </ThemedText>
                <TouchableOpacity onPress={handleClose} style={styles.webCloseButton}>
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              {/* Web Content */}
              <ScrollView style={styles.webContent} showsVerticalScrollIndicator={false}>
                {/* Content Preview or Custom Input */}
                {noteContent ? (
                  <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                      Note Content Preview
                    </ThemedText>
                    <View style={[styles.webContentPreview, { borderColor: mutedTextColor }]}>
                      <ThemedText style={[styles.webContentText, { color: mutedTextColor }]} numberOfLines={3}>
                        {noteContent}
                      </ThemedText>
                      <ThemedText style={[styles.webContentLength, { color: mutedTextColor }]}>
                        {noteContent.length} characters
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                    <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                      Custom Content
                    </ThemedText>
                    <TextInput
                      style={[styles.webTextInput, { color: textColor, borderColor: mutedTextColor, minHeight: 80 }]}
                      value={customContent}
                      onChangeText={setCustomContent}
                      placeholder="Enter the content you want to create flashcards from (minimum 50 characters)..."
                      placeholderTextColor={mutedTextColor}
                      multiline
                      numberOfLines={3}
                    />
                    <ThemedText style={[styles.webHelperText, { color: mutedTextColor }]}>
                      {customContent.length}/50 characters minimum
                    </ThemedText>
                  </View>
                )}

                {/* Number of Cards */}
                <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                  <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                    Number of Cards
                  </ThemedText>
                  <View style={styles.webNumberInputContainer}>
                    <TouchableOpacity
                      style={[styles.webNumberButton, { backgroundColor: primaryColor }]}
                      onPress={() => setNumCards(Math.max(5, numCards - 1))}
                      disabled={numCards <= 5}
                    >
                      <Ionicons name="remove" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.webNumberInput, { color: textColor, borderColor: mutedTextColor }]}
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
                      style={[styles.webNumberButton, { backgroundColor: primaryColor }]}
                      onPress={() => setNumCards(Math.min(20, numCards + 1))}
                      disabled={numCards >= 20}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={[styles.webHelperText, { color: mutedTextColor }]}>
                    Choose between 5-20 cards
                  </ThemedText>
                </View>

                {/* Difficulty Level */}
                <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                  <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                    Difficulty Level
                  </ThemedText>
                  <View style={styles.webDifficultyContainer}>
                    {difficultyOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.webDifficultyOption,
                          {
                            backgroundColor: difficulty === option.value ? option.color : 'transparent',
                            borderColor: difficulty === option.value ? option.color : mutedTextColor,
                          },
                        ]}
                        onPress={() => setDifficulty(option.value)}
                      >
                        <ThemedText
                          style={[
                            styles.webDifficultyText,
                            {
                              color: difficulty === option.value ? '#FFFFFF' : textColor,
                            },
                          ]}
                        >
                          {option.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Focus Areas */}
                <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                  <ThemedText style={[styles.webSectionTitle, { color: textColor }]}>
                    Focus Areas (Optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.webTextInput, { color: textColor, borderColor: mutedTextColor }]}
                    value={focusAreas}
                    onChangeText={setFocusAreas}
                    placeholder="e.g., key concepts, definitions, examples"
                    placeholderTextColor={mutedTextColor}
                    multiline
                    numberOfLines={2}
                  />
                  <ThemedText style={[styles.webHelperText, { color: mutedTextColor }]}>
                    Separate multiple areas with commas
                  </ThemedText>
                </View>

                {/* Include Explanations */}
                <View style={[styles.webSection, { backgroundColor: cardBackground }]}>
                  <TouchableOpacity
                    style={styles.webCheckboxContainer}
                    onPress={() => setIncludeExplanations(!includeExplanations)}
                  >
                    <View
                      style={[
                        styles.webCheckbox,
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
                    <ThemedText style={[styles.webCheckboxText, { color: textColor }]}>
                      Include explanations for each flashcard
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Web Footer */}
              <View style={[styles.webFooter, { backgroundColor: cardBackground }]}>
                <TouchableOpacity
                 style={[
                   styles.webGenerateButton,
                   {
                     backgroundColor: isGenerating ? mutedTextColor : (isFlashcardServiceAvailable ? '#4CAF50' : '#999999'),
                   },
                 ]}
                 onPress={handleGenerate}
                 disabled={isGenerating || !isFlashcardServiceAvailable}
               >
                 {isGenerating ? (
                   <ActivityIndicator color="#FFFFFF" size="small" />
                 ) : (
                   <Ionicons name="flash" size={20} color="#FFFFFF" />
                 )}
                 <ThemedText style={styles.webGenerateButtonText}>
                   {isGenerating ? 'Generating...' : (isFlashcardServiceAvailable ? `Generate ${numCards} Flashcards` : 'Service Unavailable')}
                 </ThemedText>
               </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // Mobile layout
          <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cardBackground }]}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
              <ThemedText style={[styles.title, { color: textColor }]}>
                Generate Flashcards
              </ThemedText>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Content Preview or Custom Input */}
              {noteContent ? (
                <View style={[styles.section, { backgroundColor: cardBackground }]}>
                  <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
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
                <View style={[styles.section, { backgroundColor: cardBackground }]}>
                  <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                    Custom Content
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: textColor, borderColor: mutedTextColor, minHeight: 80 }]}
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
              <View style={[styles.section, { backgroundColor: cardBackground }]}>
                <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                  Number of Cards
                </ThemedText>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity
                    style={[styles.numberButton, { backgroundColor: primaryColor }]}
                    onPress={() => setNumCards(Math.max(5, numCards - 1))}
                    disabled={numCards <= 5}
                  >
                    <Ionicons name="remove" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.textInput, { color: textColor, borderColor: mutedTextColor }]}
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
                    style={[styles.numberButton, { backgroundColor: primaryColor }]}
                    onPress={() => setNumCards(Math.min(20, numCards + 1))}
                    disabled={numCards >= 20}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.helperText, { color: mutedTextColor }]}>
                  Choose between 5-20 cards
                </ThemedText>
              </View>

              {/* Difficulty Level */}
              <View style={[styles.section, { backgroundColor: cardBackground }]}>
                <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
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
                      ]}
                      onPress={() => setDifficulty(option.value)}
                    >
                      <ThemedText
                        style={[
                          styles.difficultyText,
                          {
                            color: difficulty === option.value ? '#FFFFFF' : textColor,
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Focus Areas */}
              <View style={[styles.section, { backgroundColor: cardBackground }]}>
                <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                  Focus Areas (Optional)
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: mutedTextColor }]}
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
              <View style={[styles.section, { backgroundColor: cardBackground }]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
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
                  <ThemedText style={[styles.checkboxText, { color: textColor }]}>
                    Include explanations for each flashcard
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Generate Button */}
            <View style={[styles.footer, { backgroundColor: cardBackground }]}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: isGenerating ? mutedTextColor : (isFlashcardServiceAvailable ? '#4CAF50' : '#999999'),
                  },
                ]}
                onPress={handleGenerate}
                disabled={isGenerating || !isFlashcardServiceAvailable}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="flash" size={20} color="#FFFFFF" />
                )}
                <ThemedText style={styles.generateButtonText}>
                  {isGenerating ? 'Generating...' : (isFlashcardServiceAvailable ? `Generate ${numCards} Flashcards` : 'Service Unavailable')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
      </Modal>
    );
  } catch (renderError) {
    console.error('Error rendering FlashcardGenerator:', renderError);
    console.error('Render error details:', {
      message: renderError instanceof Error ? renderError.message : 'Unknown render error',
      stack: renderError instanceof Error ? renderError.stack : 'No stack trace',
      name: renderError instanceof Error ? renderError.name : 'Unknown render error type'
    });
    
    // Return a simple error fallback
    return (
      <Modal
        visible={visible}
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={onClose}
        transparent={Platform.OS === 'web' ? true : false}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            padding: 20, 
            borderRadius: 10, 
            margin: 20,
            minWidth: 300
          }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              Flashcard Generator Error
            </ThemedText>
            <ThemedText style={{ marginBottom: 20 }}>
              Something went wrong rendering the flashcard generator. Please try again.
            </ThemedText>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#007AFF', 
                padding: 10, 
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={onClose}
            >
              <ThemedText style={{ color: '#FFFFFF' }}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
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
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  contentPreview: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
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
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    textAlign: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  difficultyOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
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
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Web-optimized styles
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
    } : {
      position: 'absolute',
    }),
  },
  webModal: {
    width: Platform.OS === 'web' ? 600 : '100%',
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'web' ? '#1a1a1a' : undefined,
    boxShadow: Platform.OS === 'web' ? '0 20px 60px rgba(0, 0, 0, 0.3)' : undefined,
    shadowColor: Platform.OS === 'web' ? undefined : '#000',
    shadowOffset: Platform.OS === 'web' ? undefined : { width: 0, height: 20 },
    shadowOpacity: Platform.OS === 'web' ? undefined : 0.3,
    shadowRadius: Platform.OS === 'web' ? undefined : 60,
    elevation: Platform.OS === 'web' ? undefined : 20,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: Platform.OS === 'web' ? '#2a2a2a' : undefined,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  webCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  webContent: {
    flex: 1,
    padding: 24,
    maxHeight: Platform.OS === 'web' ? 500 : undefined,
    backgroundColor: Platform.OS === 'web' ? '#1a1a1a' : undefined,
  },
  webSection: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: Platform.OS === 'web' ? '#2a2a2a' : undefined,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  webContentPreview: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  webContentText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  webContentLength: {
    fontSize: 12,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  webNumberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  webNumberButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  webNumberInput: {
    width: 100,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  webHelperText: {
    fontSize: 13,
    textAlign: 'center',
  },
  webDifficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  webDifficultyOption: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
  },
  webDifficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  webTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  webCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  webCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  webCheckboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  webFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: Platform.OS === 'web' ? '#2a2a2a' : undefined,
  },
  webGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
  },
  webGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
