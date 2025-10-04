import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { audioStorage } from '../services/AudioStorage';
import { AudioUtils } from '../services/AudioUtils';
import { generateSummaryWithGemini, generateTitleWithGemini, transcribeAudioWithGemini } from '../services/GeminiAI';
import { supabaseNoteStorage } from '../services/SupabaseNoteStorage';

export const AudioTest: React.FC = () => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [noteId, setNoteId] = useState<string | null>(null);

  // Theme colors
  const backgroundColor = useThemeColor({ light: '#F5F6FA', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = '#6A5ACD';
  const buttonBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const buttonActiveBg = useThemeColor({ light: '#FF6B6B', dark: '#FF6B6B' }, 'tint');

  const userId = user?.id || '';

  const startRecording = async () => {
    try {
      setStatus('Starting recording...');
      setIsRecording(true);
      setAudioUri(null);
      setTranscription('');
      setTitle('');
      setSummary('');
      setNoteId(null);

      // Request permissions
      const permission = await AudioUtils.requestPermissions();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permissions to record audio.');
        setIsRecording(false);
        return;
      }

      // Configure audio
      await AudioUtils.initializeAudio();

      // Create recording
      const { recording } = await AudioUtils.createRecording();
      
      // Check if recording is already active (sometimes happens with modern Audio API)
      const status = recording.getStatus();
      if (status.isRecording) {
        console.log('Recording is already active, proceeding...');
        setStatus('Recording... Click stop when done');
        (global as any).testRecording = recording;
        return;
      }
      
      // Start recording
      try {
        await AudioUtils.startRecording(recording);
      } catch (startError) {
        // Check if recording actually started despite the error
        const checkStatus = recording.getStatus();
        if (checkStatus.isRecording) {
          console.log('Recording started successfully despite error message');
        } else {
          throw startError; // Re-throw if recording really didn't start
        }
      }
      
      setStatus('Recording... Click stop when done');
      
      // Store recording for later use
      (global as any).testRecording = recording;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
      setStatus('Recording failed');
    }
  };

  const stopRecording = async () => {
    try {
      setStatus('Stopping recording...');
      setIsRecording(false);
      
      const recording = (global as any).testRecording;
      if (!recording) {
        setStatus('No recording found');
        return;
      }

      // Stop recording
      const uri = await AudioUtils.stopRecording(recording);
      setAudioUri(uri);
      setStatus('Recording stopped. Processing...');
      
      // Clean up
      (global as any).testRecording = null;
      
      // Start processing
      await processAudio(uri);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
      setStatus('Recording failed');
    }
  };

  const processAudio = async (uri: string) => {
    try {
      setIsProcessing(true);
      setStatus('Processing audio...');

      // 1. Create a new note
      setStatus('Creating note...');
      const note = await supabaseNoteStorage.createNote({
        title: 'Audio Test Note',
        content: '',
        tags: ['test', 'audio'],
      });
      setNoteId(note.id);
      console.log('Created note with ID:', note.id);

      // 2. Upload audio to Firebase Storage
      setStatus('Uploading audio...');
      const downloadURL = await audioStorage.uploadAudioFile(uri, userId, note.id);
      console.log('Audio uploaded:', downloadURL);

      // 3. Save audio metadata
      setStatus('Saving metadata...');
      const audioFileData = {
        filename: downloadURL,
        duration: 0, // We'll get this later
        transcription: '',
        transcriptionStatus: 'pending' as const,
        aiTranscription: '',
        userEditedTranscription: '',
      };
      const savedAudioFile = await audioStorage.saveAudioMetadata(note.id, userId, audioFileData);
      console.log('Audio metadata saved');

      // 4. Get audio duration
      const duration = await AudioUtils.getAudioDuration(uri);
      console.log('Audio duration:', duration);

      // 5. Convert to base64 for transcription
      setStatus('Converting audio...');
      const base64Audio = await AudioUtils.getBase64FromUri(uri);
      console.log('Audio converted to base64, length:', base64Audio.length);

      // 6. Transcribe with Gemini
      setStatus('Transcribing audio...');
      const transcript = await transcribeAudioWithGemini(base64Audio);
      setTranscription(transcript);
      console.log('Transcription:', transcript);

      // 7. Generate title
      setStatus('Generating title...');
      const aiTitle = await generateTitleWithGemini(transcript);
      setTitle(aiTitle);
      console.log('Generated title:', aiTitle);

      // 8. Generate summary
      setStatus('Generating summary...');
      const aiSummary = await generateSummaryWithGemini(transcript);
      setSummary(aiSummary);
      console.log('Generated summary:', aiSummary);

      // 9. Update note with all metadata
      setStatus('Updating note...');
      await supabaseNoteStorage.updateNote(note.id, {
        title: aiTitle,
        content: '', // Leave content empty for user to edit
        summary: aiSummary,
        tags: ['test', 'audio', 'transcribed'],
        audioUri: downloadURL,
      }, userId);

      // 10. Update transcription in the audio file
              await supabaseNoteStorage.updateNote(note.id, {
          audioFiles: note.audioFiles.map(file => 
            file.id === savedAudioFile.id 
              ? { ...file, transcription: transcript }
              : file
          )
        });

      setStatus('✅ Complete! Audio recorded, saved, and transcribed successfully.');
      setIsProcessing(false);
      
      Alert.alert(
        'Success!', 
        `Audio processing complete!\n\nTitle: ${aiTitle}\n\nTranscription: ${transcript.substring(0, 100)}...\n\nSummary: ${aiSummary}`
      );

    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
      Alert.alert('Processing Error', 'Failed to process audio. Check console for details.');
    }
  };

  const clearResults = () => {
    setAudioUri(null);
    setTranscription('');
    setTitle('');
    setSummary('');
    setNoteId(null);
    setStatus('');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Audio Processing Test</Text>
      
      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
      </View>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            { 
              backgroundColor: isRecording ? buttonActiveBg : buttonBg,
              opacity: isProcessing ? 0.6 : 1,
            },
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        
        <Text style={[styles.buttonLabel, { color: textColor }]}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </View>

      {/* Results */}
      {audioUri && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Results:</Text>
          
          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, { color: textColor }]}>Audio URI:</Text>
            <Text style={[styles.resultValue, { color: textColor }]} numberOfLines={2}>
              {audioUri}
            </Text>
          </View>

          {noteId && (
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>Note ID:</Text>
              <Text style={[styles.resultValue, { color: textColor }]}>{noteId}</Text>
            </View>
          )}

          {title && (
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>Generated Title:</Text>
              <Text style={[styles.resultValue, { color: textColor }]}>{title}</Text>
            </View>
          )}

          {transcription && (
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>Transcription:</Text>
              <Text style={[styles.resultValue, { color: textColor }]} numberOfLines={4}>
                {transcription}
              </Text>
            </View>
          )}

          {summary && (
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>Summary:</Text>
              <Text style={[styles.resultValue, { color: textColor }]} numberOfLines={3}>
                {summary}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.clearButton, { borderColor: textColor }]}
            onPress={clearResults}
          >
            <Text style={[styles.clearButtonText, { color: textColor }]}>Clear Results</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={[styles.instructionsTitle, { color: textColor }]}>Instructions:</Text>
        <Text style={[styles.instructionsText, { color: textColor }]}>
          1. Click "Start Recording" to begin recording audio{'\n'}
          2. Speak clearly for 5-10 seconds{'\n'}
          3. Click "Stop Recording" to finish{'\n'}
          4. Wait for processing to complete{'\n'}
          5. Check results below
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    minHeight: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 4,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 