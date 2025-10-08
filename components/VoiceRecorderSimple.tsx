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
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { useThemeColor } from '../hooks/useThemeColor';
import { AudioUtils } from '../services/AudioUtils';

interface VoiceRecorderSimpleProps {
  onRecordingComplete?: (audioFile: any) => void;
  onStopRecording?: () => void;
  noteId?: string;
  userId?: string;
  onProgress?: (progress: number) => void;
  disabled?: boolean;
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
  disabled = false,
}) => {
  const { user } = useAuth();
  const { getSessionLimit } = useFeatureLimits();
  
  // Theme colors
  const backgroundColor = useThemeColor({ light: '#F5F6FA', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = '#6A5ACD';
  const buttonBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const buttonActiveBg = useThemeColor({ light: '#FF6B6B', dark: '#FF6B6B' }, 'tint');
  
  // Session limits from database (dynamic)
  const isPremium = Boolean(user?.premium?.isActive);
  const [sessionLimit, setSessionLimit] = useState<number | 'unlimited'>(isPremium ? 'unlimited' : 5 * 60);
  
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
  const hasShownWarningRef = useRef<boolean>(false);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  
  // Load session limit from database
  useEffect(() => {
    const loadSessionLimit = async () => {
      try {
        const limit = await getSessionLimit('voice_recording');
        if (limit !== null) {
          // Convert minutes to seconds if it's a number
          const limitInSeconds = typeof limit === 'number' ? limit * 60 : limit;
          setSessionLimit(limitInSeconds);
          console.log('[VoiceRecorderSimple] Loaded session limit from database:', limitInSeconds);
        } else {
          // Fallback to default
          const fallback = isPremium ? 'unlimited' : 5 * 60;
          setSessionLimit(fallback);
          console.log('[VoiceRecorderSimple] Using fallback session limit:', fallback);
        }
      } catch (error) {
        console.error('[VoiceRecorderSimple] Error loading session limit:', error);
        // Use fallback on error
        const fallback = isPremium ? 'unlimited' : 5 * 60;
        setSessionLimit(fallback);
      }
    };
    
    loadSessionLimit();
  }, [isPremium, getSessionLimit]);
  
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
      setState(prev => {
        const newDuration = prev.duration + 1;
        
        // Check session limit for free users
        if (!isPremium && sessionLimit !== 'unlimited' && typeof sessionLimit === 'number') {
          // Show warning at 80% of limit (4 minutes for 5 minute limit)
          if (newDuration >= sessionLimit * 0.8 && !hasShownWarningRef.current) {
            const remainingSeconds = sessionLimit - newDuration;
            const remainingMinutes = Math.ceil(remainingSeconds / 60);
            Alert.alert(
              'Session Limit Warning',
              `You have ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} remaining in this recording session. Free users are limited to ${sessionLimit / 60} minutes per session.`,
              [{ text: 'OK' }]
            );
            hasShownWarningRef.current = true;
          }
          
          // Auto-stop at session limit
          if (newDuration >= sessionLimit && isRecordingRef.current && recordingRef.current) {
            console.log('[VoiceRecorderSimple] Session limit reached, auto-stopping recording');
            
            // Stop the timer immediately
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Stop the recording directly using refs
            const currentRecording = recordingRef.current;
            const finalDuration = newDuration;
            
            isRecordingRef.current = false;
            
            // Stop the recording asynchronously
            (async () => {
              try {
                console.log('[VoiceRecorderSimple] Auto-stopping recording at limit...');
                const uri = await AudioUtils.stopRecording(currentRecording);
                console.log('[VoiceRecorderSimple] Recording stopped at limit, URI:', uri);
                
                // Create audio file object
                const audioFile = {
                  id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  filename: uri,
                  duration: finalDuration,
                  transcription: '',
                  transcriptionStatus: 'pending' as const,
                  aiTranscription: '',
                  userEditedTranscription: '',
                  createdAt: new Date(),
                };
                
                // Update state to stopped
                setState({
                  isRecording: false,
                  isStarting: false,
                  duration: finalDuration,
                  hasRecording: true,
                  recording: null,
                });
                
                recordingRef.current = null;
                
                // Call callbacks
                onStopRecording?.();
                onProgress?.(25);
                onRecordingComplete?.(audioFile);
                
                console.log('[VoiceRecorderSimple] Recording saved successfully at session limit');
                
                // Show limit reached message after a delay
                setTimeout(() => {
                  Alert.alert(
                    'Session Limit Reached',
                    `You've reached the ${sessionLimit / 60}-minute session limit for free users. Your recording has been saved. Upgrade to Premium for unlimited recording sessions!`,
                    [{ text: 'OK' }]
                  );
                }, 300);
              } catch (error) {
                console.error('[VoiceRecorderSimple] Error auto-stopping recording:', error);
                setState({
                  isRecording: false,
                  isStarting: false,
                  duration: finalDuration,
                  hasRecording: false,
                  recording: null,
                });
                recordingRef.current = null;
                Alert.alert('Recording Error', 'Failed to save recording at session limit.');
              }
            })();
            
            // Return stopped state immediately
            return {
              ...prev,
              isRecording: false,
              duration: finalDuration,
            };
          }
        }
        
        return { ...prev, duration: newDuration };
      });
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
      // Reset warning flag for new recording
      hasShownWarningRef.current = false;
      
      // Check if recording is disabled (e.g., over usage limit)
      if (disabled) {
        Alert.alert(
          'Recording Disabled',
          'You have reached your monthly recording limit. Please upgrade to premium for unlimited recording.',
          [{ text: 'OK' }]
        );
        return;
      }
      
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
      let permissionResult = permissionCheck;
      if (permissionCheck.status !== 'granted') {
        console.log('[VoiceRecorderSimple] Permission not granted, requesting...');
        const requestResult = await AudioUtils.requestPermissions();
        console.log('[VoiceRecorderSimple] Permission request result:', requestResult);
        
        // requestPermissions only returns status, so we need to preserve canRequest from the initial check
        permissionResult = {
          status: requestResult.status,
          canRequest: permissionCheck.canRequest
        };
      }
      
      if (permissionResult.status !== 'granted') {
        console.log('[VoiceRecorderSimple] Permission denied or undetermined:', permissionResult.status);
        
        let alertMessage = 'Microphone permission is required to record audio.';
        if (permissionResult.status === 'denied') {
          alertMessage = 'Microphone permission was denied. Please enable it in your device settings to record audio.';
        } else if (permissionResult.status === 'undetermined') {
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
      
      // Update state and refs
      setState(prev => ({
        ...prev,
        isRecording: true,
        isStarting: false,
        duration: 0,
        recording,
      }));
      
      recordingRef.current = recording;
      isRecordingRef.current = true;

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

      // Update state and refs
      setState(prev => ({
        ...prev,
        isRecording: false,
        hasRecording: true,
        recording: null,
      }));
      
      recordingRef.current = null;
      isRecordingRef.current = false;
      
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
      console.log('[VoiceRecorderSimple] Calling onRecordingComplete with audioFile:', audioFile);
      onRecordingComplete?.(audioFile);
      console.log('[VoiceRecorderSimple] onRecordingComplete callback called');
      
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
              opacity: (state.isStarting || disabled) ? 0.6 : 1,
            },
          ]}
          onPress={state.isRecording ? stopRecording : startRecording}
          disabled={state.isStarting || disabled}
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
              {!isPremium && sessionLimit !== 'unlimited' && (
                <Text style={[styles.limitText, { color: textColor, opacity: 0.6 }]}>
                  {' '}/ {formatTime(sessionLimit)}
                </Text>
              )}
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
  limitText: {
    fontSize: 14,
    fontWeight: '400',
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
