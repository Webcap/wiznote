import { Ionicons } from '@expo/vector-icons';
import { AudioRecorder } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { AudioUtils } from '../services/AudioUtils';

interface VoiceRecorderSimpleProps {
  onRecordingComplete?: (audioFile: any) => void;
  onStopRecording?: () => void;
  noteId?: string;
  userId?: string;
  onProgress?: (progress: number) => void;
}

interface RecordingState {
  isRecording: boolean;
  isStarting: boolean;
  duration: number;
  hasRecording: boolean;
  recording: AudioRecorder | null;
}

export const VoiceRecorderSimple: React.FC<VoiceRecorderSimpleProps> = ({
  onRecordingComplete,
  onStopRecording,
  noteId,
  userId,
  onProgress,
}) => {
  const { user } = useAuth();
  
  // Theme colors
  const backgroundColor = useThemeColor({ light: '#F5F6FA', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = '#6A5ACD';
  const buttonBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const buttonActiveBg = useThemeColor({ light: '#FF6B6B', dark: '#FF6B6B' }, 'tint');
  
  // Recording state
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isStarting: false,
    duration: 0,
    hasRecording: false,
    recording: null,
  });
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Global cleanup on component mount
  useEffect(() => {
    AudioUtils.globalCleanup().catch(console.error);
    
    return () => cleanup();
  }, []);

  const cleanup = () => {
    console.log('[VoiceRecorderSimple] Cleaning up...');
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop recording
    if (state.recording) {
      if (state.recording.isRecording) {
        state.recording.stop().catch(console.error);
      }
      (state.recording as any).remove();
    }
  };

  const startTimer = () => {
    console.log('[VoiceRecorderSimple] Starting timer...');
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const stopTimer = () => {
    console.log('[VoiceRecorderSimple] Stopping timer...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    console.log('[VoiceRecorderSimple] ===== START RECORDING =====');
    
    try {
      // Prevent multiple starts
      if (state.isRecording || state.isStarting) {
        console.log('[VoiceRecorderSimple] Already recording or starting, ignoring');
        return;
      }

      setState(prev => ({ ...prev, isStarting: true }));
      
      // First check current permissions
      console.log('[VoiceRecorderSimple] Checking current permissions...');
      const permissionCheck = await AudioUtils.checkPermissions();
      console.log('[VoiceRecorderSimple] Permission check result:', permissionCheck);
      
      // Request permissions if needed
      let permission = permissionCheck;
      if (permissionCheck.status !== 'granted') {
        console.log('[VoiceRecorderSimple] Permission not granted, requesting...');
        permission = await AudioUtils.requestPermissions();
        console.log('[VoiceRecorderSimple] Permission request result:', permission);
      }
      
      if (permission.status !== 'granted') {
        console.log('[VoiceRecorderSimple] Permission denied or undetermined:', permission.status);
        
        let alertMessage = 'Microphone permission is required to record audio.';
        if (permission.status === 'denied') {
          alertMessage = 'Microphone permission was denied. Please enable it in your device settings to record audio.';
        } else if (permission.status === 'undetermined') {
          alertMessage = 'Microphone permission is required. Please grant permission to record audio.';
        }
        
        Alert.alert('Permission Required', alertMessage);
        setState(prev => ({ ...prev, isStarting: false }));
        return;
      }

      console.log('[VoiceRecorderSimple] Permission granted, initializing audio...');
      
      // Initialize audio
      await AudioUtils.initializeAudio();

      // Create recording
      const { recording } = await AudioUtils.createRecording();
      
      // Start recording
      await AudioUtils.startRecording(recording);
      
      console.log('[VoiceRecorderSimple] Recording started successfully');
      
      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        isStarting: false,
        duration: 0,
        recording,
      }));

      // Start timer
      startTimer();
      
      console.log('[VoiceRecorderSimple] ===== RECORDING STARTED =====');
      
    } catch (error) {
      console.error('[VoiceRecorderSimple] Error starting recording:', error);
      
      let errorMessage = 'Failed to start recording. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Microphone permission is required. Please grant permission and try again.';
        } else if (error.message.includes('audio')) {
          errorMessage = 'Audio system error. Please check your device audio settings and try again.';
        }
      }
      
      Alert.alert('Recording Error', errorMessage);
      setState(prev => ({ ...prev, isStarting: false }));
    }
  };

  const stopRecording = async () => {
    console.log('[VoiceRecorderSimple] ===== STOP RECORDING =====');
    
    try {
      if (!state.isRecording || !state.recording) {
        console.log('[VoiceRecorderSimple] Not recording, ignoring stop request');
        return;
      }

      // Stop timer
      stopTimer();

      // Check minimum duration
      if (state.duration < 1) {
        console.log('[VoiceRecorderSimple] Recording too short, showing warning');
        Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
        setState(prev => ({ ...prev, isRecording: false, recording: null }));
        return;
      }

      // Stop recording using AudioUtils
      console.log('[VoiceRecorderSimple] Stopping recording...');
      const uri = await AudioUtils.stopRecording(state.recording);

      console.log('[VoiceRecorderSimple] Recording stopped, URI:', uri);

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: false,
        hasRecording: true,
        recording: null,
      }));
      
      // Call callbacks
      onStopRecording?.();
      onProgress?.(25);
      console.log('[VoiceRecorderSimple] Called onProgress with 25%');
      
      // Create audio file object
      const audioFile = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: uri,
        duration: state.duration,
        transcription: '',
        transcriptionStatus: 'pending' as const,
        aiTranscription: '',
        userEditedTranscription: '',
        createdAt: new Date(),
      };

      // Call completion callback
      onRecordingComplete?.(audioFile);
      
      console.log('[VoiceRecorderSimple] ===== RECORDING STOPPED =====');
      
    } catch (error) {
      console.error('[VoiceRecorderSimple] Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
      setState(prev => ({ ...prev, isRecording: false, recording: null }));
    }
  };

  const clearRecording = () => {
    Alert.alert(
      'Clear Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            console.log('[VoiceRecorderSimple] Clearing recording...');
            
            // Stop timer
            stopTimer();
            
            // Stop recording if active
            if (state.recording) {
              if (state.recording.isRecording) {
                state.recording.stop().catch(console.error);
              }
              (state.recording as any).remove();
            }
            
            // Reset state
            setState({
              isRecording: false,
              isStarting: false,
              duration: 0,
              hasRecording: false,
              recording: null,
            });
          }
        },
      ]
    );
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render main interface
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Recording controls */}
      <View style={styles.controlsContainer}>
        {/* Record button */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            { 
              backgroundColor: state.isRecording ? buttonActiveBg : buttonBg,
              opacity: state.isStarting ? 0.6 : 1,
            },
          ]}
          onPress={state.isRecording ? stopRecording : startRecording}
          disabled={state.isStarting}
        >
          <Ionicons
            name={state.isRecording ? 'stop' : 'mic'}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Duration display */}
        {state.isRecording && (
          <View style={styles.durationContainer}>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: primaryColor }]} />
            </View>
            <Text style={[styles.durationText, { color: textColor }]}>
              {formatTime(state.duration)}
            </Text>
          </View>
        )}

        {/* Clear button */}
        {state.hasRecording && !state.isRecording && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: textColor }]}
            onPress={clearRecording}
          >
            <Ionicons name="trash" size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Debug info in development */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={[styles.debugText, { color: textColor }]}>
            Debug: Recording={state.isRecording}, Duration={state.duration}s
          </Text>
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: buttonBg }]}
            onPress={async () => {
              console.log('[VoiceRecorderSimple] Testing permission system...');
              try {
                const checkResult = await AudioUtils.checkPermissions();
                console.log('[VoiceRecorderSimple] Permission check:', checkResult);
                
                const requestResult = await AudioUtils.requestPermissions();
                console.log('[VoiceRecorderSimple] Permission request:', requestResult);
                
                Alert.alert(
                  'Permission Test', 
                  `Check: ${checkResult.status} (can request: ${checkResult.canRequest})\nRequest: ${requestResult.status}`
                );
              } catch (error) {
                console.error('[VoiceRecorderSimple] Permission test error:', error);
                Alert.alert('Permission Test Error', error instanceof Error ? error.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.debugButtonText}>Test Permissions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    minHeight: 200,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    marginRight: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  debugContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugButton: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
