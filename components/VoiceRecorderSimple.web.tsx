import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAuth } from '../hooks/useAuth';
import { useFeatureLimits } from '../hooks/useFeatureLimits';
import { useThemeColor } from '../hooks/useThemeColor';

interface VoiceRecorderSimpleProps {
  onRecordingComplete?: (audioFile: any) => void;
  onStopRecording?: () => void;
  noteId?: string;
  userId?: string;
  onProgress?: (progress: number) => void;
  disabled?: boolean;
}

export const VoiceRecorderSimple: React.FC<VoiceRecorderSimpleProps> = ({
  onRecordingComplete,
  onStopRecording,
  noteId,
  userId,
  onProgress,
  disabled = false,
}) => {
  console.log('[VoiceRecorderWeb] Component mounted - Web version loaded successfully!');
  const { user } = useAuth();
  const { getSessionLimit } = useFeatureLimits();
  
  // Theme colors
  const backgroundColor = useThemeColor({ light: '#F5F6FA', dark: '#1A1A1A' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = '#6A5ACD';
  const buttonBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const buttonActiveBg = useThemeColor({ light: '#FF6B6B', dark: '#FF6B6B' }, 'tint');
  
  const isPremium = Boolean(user?.premium?.isActive);
  const [sessionLimit, setSessionLimit] = useState<number | 'unlimited'>(isPremium ? 'unlimited' : 5 * 60);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasShownWarningRef = useRef(false);
  const durationRef = useRef(0); // Track duration for closures
  const recordedBlobRef = useRef<Blob | null>(null); // Store the actual blob
  
  // Load session limit
  useEffect(() => {
    const loadSessionLimit = async () => {
      try {
        const limit = await getSessionLimit('voice_recording');
        if (limit !== null) {
          const limitInSeconds = typeof limit === 'number' ? limit * 60 : limit;
          setSessionLimit(limitInSeconds);
          console.log('[VoiceRecorderWeb] Loaded session limit:', limitInSeconds);
        } else {
          const fallback = isPremium ? 'unlimited' : 5 * 60;
          setSessionLimit(fallback);
        }
      } catch (error) {
        console.error('[VoiceRecorderWeb] Error loading session limit:', error);
        setSessionLimit(isPremium ? 'unlimited' : 5 * 60);
      }
    };
    
    loadSessionLimit();
  }, [isPremium, getSessionLimit]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    console.log('[VoiceRecorderWeb] Cleaning up...');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.warn('[VoiceRecorderWeb] Error stopping media recorder:', error);
      }
    }
    mediaRecorderRef.current = null;
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VoiceRecorderWeb] Stopped audio track:', track.label);
      });
      streamRef.current = null;
    }
    
    // Clear audio chunks
    audioChunksRef.current = [];
    
    // Note: Don't clear recordedBlobRef here as it may be needed for upload
  };

  const startTimer = () => {
    console.log('[VoiceRecorderWeb] Starting timer...');
    timerRef.current = window.setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1;
        durationRef.current = newDuration; // Update ref for closures
        
        // Check session limit for free users
        if (!isPremium && sessionLimit !== 'unlimited' && typeof sessionLimit === 'number') {
          // Show warning at 80% of limit
          if (newDuration >= sessionLimit * 0.8 && !hasShownWarningRef.current) {
            const remainingSeconds = sessionLimit - newDuration;
            const remainingMinutes = Math.ceil(remainingSeconds / 60);
            alert(`You have ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} remaining in this recording session.`);
            hasShownWarningRef.current = true;
          }
          
          // Auto-stop at session limit
          if (newDuration >= sessionLimit) {
            console.log('[VoiceRecorderWeb] Session limit reached, auto-stopping');
            stopRecording();
            alert(`Session limit reached. Your recording has been saved. Upgrade to Premium for unlimited recording!`);
            return sessionLimit;
          }
        }
        
        return newDuration;
      });
    }, 1000);
  };

  const stopTimer = () => {
    console.log('[VoiceRecorderWeb] Stopping timer...');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    console.log('[VoiceRecorderWeb] ===== START RECORDING =====');
    
    try {
      hasShownWarningRef.current = false;
      
      if (disabled) {
        alert('You have reached your monthly recording limit. Please upgrade to premium.');
        return;
      }
      
      if (isRecording || isStarting) {
        console.log('[VoiceRecorderWeb] Already recording, ignoring');
        return;
      }

      setIsStarting(true);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported. Please use a modern browser with HTTPS.');
      }
      
      // Request microphone permission
      console.log('[VoiceRecorderWeb] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log('[VoiceRecorderWeb] Microphone access granted');
      streamRef.current = stream;
      
      // Determine the best supported mime type for recording
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.log('[VoiceRecorderWeb] opus codec not supported, trying webm');
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.log('[VoiceRecorderWeb] webm not supported, trying mp4');
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.log('[VoiceRecorderWeb] mp4 not supported, using default');
            mimeType = '';
          }
        }
      }
      
      console.log('[VoiceRecorderWeb] Using mime type:', mimeType || 'default');
      
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle data available - collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log('[VoiceRecorderWeb] Received audio chunk:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle stop - process the final recording
      mediaRecorder.onstop = () => {
        console.log('[VoiceRecorderWeb] MediaRecorder stopped');
        console.log('[VoiceRecorderWeb] Total chunks collected:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          console.error('[VoiceRecorderWeb] No audio chunks recorded!');
          alert('Recording failed: No audio data was captured. Please try again.');
          return;
        }
        
        // Create blob from all chunks
        const recordedMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        console.log('[VoiceRecorderWeb] Created blob:', blob.size, 'bytes, type:', blob.type);
        
        // Store blob in ref for upload
        recordedBlobRef.current = blob;
        
        // Create object URL for immediate playback (temporary)
        const url = URL.createObjectURL(blob);
        
        // Use ref to get current duration (avoids closure issue)
        const finalDuration = durationRef.current;
        console.log('[VoiceRecorderWeb] Recording duration:', finalDuration, 'seconds');
        
        // Create audio file object with blob
        const audioFile = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: url, // Temporary blob URL for preview
          blob: blob, // The actual blob data for upload
          duration: finalDuration,
          transcription: '',
          transcriptionStatus: 'pending' as const,
          aiTranscription: '',
          userEditedTranscription: '',
          createdAt: new Date(),
        };
        
        console.log('[VoiceRecorderWeb] Calling onRecordingComplete with audio file:', {
          id: audioFile.id,
          blobSize: blob.size,
          duration: finalDuration,
          mimeType: blob.type
        });
        
        onRecordingComplete?.(audioFile);
        setHasRecording(true);
      };
      
      // Start recording
      mediaRecorder.start();
      console.log('[VoiceRecorderWeb] MediaRecorder started');
      
      setIsRecording(true);
      setIsStarting(false);
      setDuration(0);
      durationRef.current = 0; // Reset duration ref
      startTimer();
      
      console.log('[VoiceRecorderWeb] ===== RECORDING STARTED =====');
      
    } catch (error) {
      console.error('[VoiceRecorderWeb] Error starting recording:', error);
      
      let errorMessage = 'Failed to start recording. Please try again.';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorDetails = error.message;
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Microphone is already in use by another application.';
        } else if (error.name === 'NotSupportedError' || error.message.includes('HTTPS')) {
          errorMessage = 'Audio recording requires HTTPS. Please use https:// or run on localhost.';
        } else if (error.message.includes('MediaDevices')) {
          errorMessage = 'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.';
        }
      }
      
      console.error('[VoiceRecorderWeb] Error details:', errorDetails);
      alert(`${errorMessage}\n\nTechnical details: ${errorDetails}`);
      setIsStarting(false);
      cleanup();
    }
  };

  const stopRecording = async () => {
    console.log('[VoiceRecorderWeb] ===== STOP RECORDING =====');
    
    try {
      if (!isRecording || !mediaRecorderRef.current) {
        console.log('[VoiceRecorderWeb] Not recording, ignoring stop request');
        return;
      }

      // Stop timer
      stopTimer();

      // Check minimum duration
      if (duration < 1) {
        console.log('[VoiceRecorderWeb] Recording too short');
        alert('Please record for at least 1 second.');
        setIsRecording(false);
        cleanup();
        return;
      }

      // Stop recording
      console.log('[VoiceRecorderWeb] Stopping MediaRecorder...');
      setIsRecording(false);
      
      // Stop the media recorder (will trigger onstop event)
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Call callback
      onStopRecording?.();
      onProgress?.(25);
      
      console.log('[VoiceRecorderWeb] ===== RECORDING STOPPED =====');
      
    } catch (error) {
      console.error('[VoiceRecorderWeb] Error stopping recording:', error);
      alert('Failed to stop recording. Please try again.');
      setIsRecording(false);
      cleanup();
    }
  };

  const clearRecording = () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      console.log('[VoiceRecorderWeb] Clearing recording...');
      cleanup();
      setIsRecording(false);
      setDuration(0);
      durationRef.current = 0;
      setHasRecording(false);
      audioChunksRef.current = [];
      recordedBlobRef.current = null; // Clear the recorded blob
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.controlsContainer}>
        {/* Record button */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            { 
              backgroundColor: isRecording ? buttonActiveBg : buttonBg,
              opacity: (isStarting || disabled) ? 0.6 : 1,
              cursor: 'pointer' as any,
            },
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isStarting || disabled}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Duration display */}
        {isRecording && (
          <View style={styles.durationContainer}>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: primaryColor }]} />
            </View>
            <ThemedText style={styles.durationText}>
              {formatTime(duration)}
              {!isPremium && sessionLimit !== 'unlimited' && (
                <ThemedText style={[styles.limitText, { opacity: 0.6 }]}>
                  {' '}/ {formatTime(sessionLimit as number)}
                </ThemedText>
              )}
            </ThemedText>
          </View>
        )}

        {/* Clear button */}
        {hasRecording && !isRecording && (
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: textColor, cursor: 'pointer' as any }]}
            onPress={clearRecording}
          >
            <Ionicons name="trash" size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
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
    transition: 'all 0.2s ease',
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
});

