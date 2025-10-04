import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, AudioRecorder } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { useThemeColor } from '../hooks/useThemeColor';
import { AudioUtils } from '../services/AudioUtils';
import { featureFlagService } from '../services/FeatureFlagService';
import { simpleUsageService } from '../services/SimpleUsageService';

interface VoiceRecorderProps {
  onRecordingComplete?: (audioFile: any) => void;
  onTranscriptionComplete?: (transcription: string) => void;
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
  sound: AudioPlayer | null;
  isPlaying: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onTranscriptionComplete,
  onStopRecording,
  noteId,
  userId,
  onProgress,
}) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { user } = useAuth();
  const { getSessionLimit, canUseFeature } = useFeatureLimits();
  
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
    sound: null,
    isPlaying: false,
  });
  
  // Feature access state
  const [canUse, setCanUse] = useState<{ canUse: boolean; reason?: string }>({ canUse: true });
  const [isLoadingFeatureCheck, setIsLoadingFeatureCheck] = useState(true);
  const [sessionLimit, setSessionLimit] = useState<number | 'unlimited' | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    currentUsage: number;
    monthlyLimit: number;
    remainingMonthly: number;
    sessionLimit: number;
  } | null>(null);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<AudioRecorder | null>(null);
  
  // Load feature access on mount
  useEffect(() => {
    loadFeatureAccess();
    
    // Test permission dialog on component mount (development only)
    if (__DEV__) {
      console.log('[VoiceRecorder] Testing permission dialog on mount...');
      // Delay the test slightly to let component fully mount
      setTimeout(async () => {
        try {
          const permission = await AudioUtils.requestPermissions();
          console.log('[VoiceRecorder] Initial permission check:', permission);
        } catch (error) {
          console.error('[VoiceRecorder] Error in initial permission check:', error);
        }
      }, 1000);
    }
    
    return () => cleanup();
  }, [user]);

  // Reset recording state when component unmounts or user changes
  useEffect(() => {
    return () => {
      resetRecording();
    };
  }, []);

  // Check session limits when recording
  useEffect(() => {
    if (state.isRecording && sessionLimit && typeof sessionLimit === 'number') {
      // Check if we've reached the session limit (convert to seconds)
      const sessionLimitSeconds = sessionLimit * 60;
      if (state.duration >= sessionLimitSeconds) {
        console.log('[VoiceRecorder] Session limit reached, stopping recording');
        stopRecording();
        Alert.alert(
          'Session Limit Reached',
          `Free users are limited to ${sessionLimit} minutes per recording session. Upgrade to Premium for unlimited recording time!`
        );
      }
    }
  }, [state.duration, state.isRecording, sessionLimit]);

  const loadFeatureAccess = async () => {
    try {
      console.log('[VoiceRecorder] Loading feature access for user:', user?.id);
      console.log('[VoiceRecorder] User state details:', {
        user: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        userPremium: user?.premium?.isActive
      });
      setIsLoadingFeatureCheck(true);
      
      // Ensure feature flag service is initialized
      console.log('[VoiceRecorder] Initializing feature flag service...');
      // VoiceRecorder is only used when user is authenticated
      await featureFlagService.initialize(true);
      console.log('[VoiceRecorder] Feature flag service initialized');
      
      // Check if feature is enabled (Feature Flags)
      console.log('[VoiceRecorder] Checking if voice_recording feature is enabled...');
      const isEnabled = featureFlagService.isFeatureEnabled('voice_recording', user);
      console.log('[VoiceRecorder] Voice recording feature enabled:', isEnabled);
      
      if (!isEnabled) {
        console.log('[VoiceRecorder] Voice recording feature is not enabled');
        setCanUse({ canUse: false, reason: 'Feature not enabled' });
        return;
      }

      // Check usage limits (Feature Limits) - use hook for proper fallback handling
      console.log('[VoiceRecorder] Checking usage limits...');
      const limitCheck = await canUseFeature('voice_recording', 1); // 1 minute
      console.log('[VoiceRecorder] Usage limit check result:', limitCheck);
      
      console.log('[VoiceRecorder] Feature access result:', limitCheck);
      setCanUse(limitCheck);

      // Load session limits
      console.log('[VoiceRecorder] Loading session limits...');
      const sessionLimitValue = await getSessionLimit('voice_recording');
      setSessionLimit(sessionLimitValue);
      console.log('[VoiceRecorder] Session limit:', sessionLimitValue);

      // Load usage information
      if (userId) {
        console.log('[VoiceRecorder] Loading usage information for user:', userId);
        const usageCheck = await simpleUsageService.canStartRecordingSession(userId, 5);
        console.log('[VoiceRecorder] Usage check result:', usageCheck);
        setUsageInfo({
          currentUsage: usageCheck.currentUsage,
          monthlyLimit: usageCheck.monthlyLimit,
          remainingMonthly: usageCheck.remainingMonthly,
          sessionLimit: usageCheck.sessionLimit,
        });
        console.log('[VoiceRecorder] Usage info:', usageCheck);
      } else {
        console.log('[VoiceRecorder] No userId available, skipping usage check');
      }
    } catch (error) {
      console.error('[VoiceRecorder] Error loading feature access:', error);
      console.error('[VoiceRecorder] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        user: !!user,
        userId: user?.id
      });
      setCanUse({ canUse: true, reason: 'Error checking access, allowing usage' });
    } finally {
      setIsLoadingFeatureCheck(false);
    }
  };

  const cleanup = () => {
    console.log('[VoiceRecorder] Cleaning up...');
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop recording
    if (recordingRef.current) {
      if (recordingRef.current.isRecording) {
        recordingRef.current.stop().catch(console.error);
      }
      (recordingRef.current as any).remove();
      recordingRef.current = null;
    }
    
    // Remove sound
    if (state.sound) {
      (state.sound as any).remove();
    }
  };

  const resetRecording = () => {
    console.log('[VoiceRecorder] Resetting recording state...');
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop and clean up recording
    if (recordingRef.current) {
      if (recordingRef.current.isRecording) {
        recordingRef.current.stop().catch(console.error);
      }
      (recordingRef.current as any).remove();
      recordingRef.current = null;
    }
    
    // Remove sound
    if (state.sound) {
      (state.sound as any).remove();
    }
    
    // Reset state
    setState(prev => ({
      ...prev,
      isRecording: false,
      isStarting: false,
      duration: 0,
      hasRecording: false,
      recording: null,
      sound: null,
      isPlaying: false,
    }));
  };

  const startTimer = () => {
    console.log('[VoiceRecorder] Starting timer...');
    timerRef.current = setInterval(() => {
      setState(prev => {
        const newDuration = prev.duration + 1;
        console.log('[VoiceRecorder] Timer tick:', newDuration);
        
        // Check session time limit (convert minutes to seconds for comparison)
        if (sessionLimit && sessionLimit !== 'unlimited' && newDuration >= sessionLimit * 60) {
          console.log('[VoiceRecorder] Session time limit reached, auto-stopping');
          stopRecording();
          return prev;
        }
        
        return { ...prev, duration: newDuration };
      });
    }, 1000);
  };

  const stopTimer = () => {
    console.log('[VoiceRecorder] Stopping timer...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log('[VoiceRecorder] Requesting permissions...');
      
      // Check current permission status first
      const currentPermission = await AudioUtils.checkPermissions();
      console.log('[VoiceRecorder] Current permission status:', currentPermission);
      
      if (currentPermission.status === 'granted') {
        console.log('[VoiceRecorder] Permission already granted');
        return true;
      }
      
      console.log('[VoiceRecorder] Permission not granted, requesting...');
      const permission = await AudioUtils.requestPermissions();
      console.log('[VoiceRecorder] New permission status:', permission);
      
      if (permission.status !== 'granted') {
        console.warn('[VoiceRecorder] Permission denied or undetermined:', permission.status);
        Alert.alert('Permission Required', 'Please grant microphone permissions to record audio.');
        return false;
      }
      
      console.log('[VoiceRecorder] Permission granted successfully');
      return true;
    } catch (error) {
      console.error('[VoiceRecorder] Error requesting permissions:', error);
      Alert.alert('Permission Error', 'Failed to request microphone permissions.');
      return false;
    }
  };

  const configureAudio = async () => {
    try {
      console.log('[VoiceRecorder] Configuring audio...');
      await AudioUtils.initializeAudio();
      console.log('[VoiceRecorder] Audio configured successfully');
    } catch (error) {
      console.error('[VoiceRecorder] Error configuring audio:', error);
      throw error;
    }
  };

  const startRecording = async () => {
    console.log('[VoiceRecorder] ===== START RECORDING =====');
    
    try {
      // Prevent multiple starts
      if (state.isRecording || state.isStarting) {
        console.log('[VoiceRecorder] Already recording or starting, ignoring');
        return;
      }

      setState(prev => ({ ...prev, isStarting: true }));
      
      // Check feature access
      if (!canUse.canUse) {
        console.log('[VoiceRecorder] Feature not available:', canUse.reason);
        Alert.alert('Feature Unavailable', canUse.reason || 'Voice recording is not available.');
        setState(prev => ({ ...prev, isStarting: false }));
        return;
      }

      // Check usage limits for free users
      if (userId && !user?.premium?.isActive) {
        try {
          const sessionCheck = await simpleUsageService.canStartRecordingSession(userId, 5);
          if (!sessionCheck.canStart) {
            console.log('[VoiceRecorder] Cannot start recording:', sessionCheck.reason);
            Alert.alert('Recording Limit', sessionCheck.reason || 'Cannot start recording due to usage limits.');
            setState(prev => ({ ...prev, isStarting: false }));
            return;
          }
          
          // Update usage info
          setUsageInfo({
            currentUsage: sessionCheck.currentUsage,
            monthlyLimit: sessionCheck.monthlyLimit,
            remainingMonthly: sessionCheck.remainingMonthly,
            sessionLimit: sessionCheck.sessionLimit,
          });
        } catch (error) {
          console.error('[VoiceRecorder] Error checking usage:', error);
        }
      }

      // Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setState(prev => ({ ...prev, isStarting: false }));
        return;
      }

      // Configure audio
      await configureAudio();

      // Create recording using AudioUtils (includes cleanup)
      console.log('[VoiceRecorder] Creating recording...');
      const { recording } = await AudioUtils.createRecording();
      
      if (!recording) {
        throw new Error('Failed to create recording object');
      }

      // Store recording in ref and state
      recordingRef.current = recording;
      
      // Start recording using AudioUtils
      console.log('[VoiceRecorder] Starting recording...');
      await AudioUtils.startRecording(recording);

      console.log('[VoiceRecorder] Recording started successfully');
      
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
      
      console.log('[VoiceRecorder] ===== RECORDING STARTED =====');
      
    } catch (error) {
      console.error('[VoiceRecorder] Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      setState(prev => ({ ...prev, isStarting: false }));
    }
  };

  const stopRecording = async () => {
    console.log('[VoiceRecorder] ===== STOP RECORDING =====');
    
    try {
      if (!state.isRecording || !recordingRef.current) {
        console.log('[VoiceRecorder] Not recording, ignoring stop request');
        return;
      }

      // Stop timer
      stopTimer();

      // Check minimum duration
      if (state.duration < 1) {
        console.log('[VoiceRecorder] Recording too short, showing warning');
        Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
        setState(prev => ({ ...prev, isRecording: false, recording: null }));
        recordingRef.current = null;
        return;
      }

      // Stop recording using AudioUtils
      console.log('[VoiceRecorder] Stopping recording...');
      const uri = await AudioUtils.stopRecording(recordingRef.current);

      console.log('[VoiceRecorder] Recording stopped, URI:', uri);

      // Create sound for playback using AudioUtils
      const { sound } = await AudioUtils.createSound(uri);
      
      // Record usage (convert seconds to minutes, round up)
      if (userId && state.duration > 0) {
        try {
          const durationInMinutes = Math.ceil(state.duration / 60); // Convert seconds to minutes, round up
          await simpleUsageService.recordUsage(userId, 'voice_recording', durationInMinutes);
          console.log('[VoiceRecorder] Usage recorded:', durationInMinutes, 'minutes');
          
          // Update usage info
          const newUsage = await simpleUsageService.getUsage(userId, 'voice_recording');
          setUsageInfo(prev => prev ? {
            ...prev,
            currentUsage: newUsage,
            remainingMonthly: Math.max(0, prev.monthlyLimit - newUsage),
          } : null);
        } catch (error) {
          console.error('[VoiceRecorder] Error recording usage:', error);
        }
      }

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: false,
        hasRecording: true,
        recording: null,
        sound,
      }));

      recordingRef.current = null;
      
      // Call callbacks
      onStopRecording?.();
      onProgress?.(25);
      
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
      
      console.log('[VoiceRecorder] ===== RECORDING STOPPED =====');
      
    } catch (error) {
      console.error('[VoiceRecorder] Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
      setState(prev => ({ ...prev, isRecording: false, recording: null }));
      recordingRef.current = null;
    }
  };

  const playRecording = async () => {
    try {
      if (!state.sound) {
        Alert.alert('No Recording', 'No audio recording available to play.');
        return;
      }

      if (state.isPlaying) {
        state.sound.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
      } else {
        state.sound.play();
        setState(prev => ({ ...prev, isPlaying: true }));
        
        // Listen for completion
        state.sound.addListener('playbackStatusUpdate', (status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setState(prev => ({ ...prev, isPlaying: false }));
          }
        });
      }
    } catch (error) {
      console.error('[VoiceRecorder] Error playing recording:', error);
      Alert.alert('Playback Error', 'Failed to play recording. Please try again.');
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
            console.log('[VoiceRecorder] Clearing recording...');
            
            // Stop timer
            stopTimer();
            
            // Remove sound
            if (state.sound) {
              (state.sound as any).remove();
            }
            
            // Stop recording if active
            if (recordingRef.current) {
              if (recordingRef.current.isRecording) {
                recordingRef.current.stop().catch(console.error);
              }
              (recordingRef.current as any).remove();
              recordingRef.current = null;
            }
            
            // Reset state
            setState({
              isRecording: false,
              isStarting: false,
              duration: 0,
              hasRecording: false,
              recording: null,
              sound: null,
              isPlaying: false,
            });
          }
        },
      ]
    );
  };

  // Format time display with session limit warning
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    // Add warning indicator if approaching session limit
    if (sessionLimit && typeof sessionLimit === 'number') {
      const sessionLimitSeconds = sessionLimit * 60;
      const warningThreshold = sessionLimitSeconds - 60; // 1 minute warning
      
      if (seconds >= warningThreshold) {
        return `${timeString} ⚠️`;
      }
    }
    
    return timeString;
  };

  // Get remaining session time
  const getRemainingSessionTime = () => {
    if (!sessionLimit || typeof sessionLimit !== 'number') return null;
    const sessionLimitSeconds = sessionLimit * 60;
    return Math.max(0, sessionLimitSeconds - state.duration);
  };

  // Render loading state
  if (isLoadingFeatureCheck) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="hourglass" size={48} color="#999999" />
          <Text style={[styles.loadingText, { color: textColor }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Render disabled state
  if (!isFeatureEnabled('voice_recording')) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="mic-off" size={48} color="#999999" />
          <Text style={[styles.disabledText, { color: textColor }]}>
            Voice recording is disabled
          </Text>
        </View>
      </View>
    );
  }

  // Render access denied state
  if (!canUse.canUse) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={48} color="#FF6B6B" />
          <Text style={[styles.disabledText, { color: textColor }]}>
            {canUse.reason || 'Voice recording not available'}
          </Text>
        </View>
      </View>
    );
  }

  // Render main interface
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Time limit info for free users */}
      {!user?.premium?.isActive && sessionLimit && sessionLimit !== 'unlimited' && (
        <View style={styles.limitInfo}>
          <Text style={[styles.limitText, { color: textColor }]}>
            Limit: {sessionLimit} minutes per recording
          </Text>
        </View>
      )}

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

        {/* Playback controls */}
        {state.hasRecording && !state.isRecording && (
          <View style={styles.playbackContainer}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: buttonBg }]}
              onPress={playRecording}
            >
              <Ionicons
                name={state.isPlaying ? 'stop' : 'play'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.clearButton, { borderColor: textColor }]}
              onPress={clearRecording}
            >
              <Ionicons name="trash" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
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
              console.log('[VoiceRecorder] Testing permission dialog...');
              const permission = await AudioUtils.forceRequestPermissions();
              Alert.alert('Permission Test', `Permission status: ${permission.status}`);
            }}
          >
            <Text style={styles.debugButtonText}>Test Mic Permission</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  disabledText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  limitInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  limitText: {
    fontSize: 14,
    textAlign: 'center',
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
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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