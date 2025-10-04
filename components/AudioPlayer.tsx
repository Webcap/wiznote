import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { AudioUtils } from '../services/AudioUtils';
import { transcribeAudioWithGemini } from '../services/GeminiAI';
import { AudioFile } from '../types/Note';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';

interface AudioPlayerProps {
  audioFile: AudioFile;
  onTranscriptionUpdate?: (transcription: string) => void;
  onTranscriptionStatusUpdate?: (status: 'pending' | 'processing' | 'completed' | 'failed') => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioFile,
  onTranscriptionUpdate,
  onTranscriptionStatusUpdate,
}) => {
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isRetryingTranscription, setIsRetryingTranscription] = useState(false);
  const [statusUpdateInterval, setStatusUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  const containerBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#687076', dark: '#A0A0A0' }, 'textMuted');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const successColor = useThemeColor({}, 'accentSuccess');
  const warningColor = useThemeColor({}, 'accentWarning');
  const dangerColor = useThemeColor({}, 'accentDanger');

  useEffect(() => {
    loadAudio();
    return () => {
      // Clear status update interval
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        setStatusUpdateInterval(null);
      }
      if (sound) {
        // The new expo-audio API doesn't have unloadAsync
        // Cleanup is handled differently - just clear the reference
        console.log('[AudioPlayer] Cleaning up sound object');
      }
    };
  }, [audioFile, statusUpdateInterval]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Validate audioFile before processing
      if (!audioFile || !audioFile.filename) {
        throw new Error('Invalid audio file data');
      }
      
      console.log('[AudioPlayer] Loading audio from:', audioFile.filename);
      
      // Create sound object from the audio URI (AudioUtils will handle authentication)
      const { sound: newSound } = await AudioUtils.createSound(audioFile.filename);
      
      // All sound objects from AudioUtils.createSound() are expo-audio Audio.Sound objects
      console.log('[AudioPlayer] Using expo-audio for audio playback');
        
      // Note: The new expo-audio AudioPlayer doesn't use setOnPlaybackStatusUpdate
      // Status updates are handled differently - we'll poll for status updates instead
      
      setSound(newSound);
      
      // Start polling for status updates
      startStatusPolling(newSound);
      
      // Enhanced duration and loading verification for web
      const status = newSound.currentStatus;
      console.log('[AudioPlayer] Sound loaded with status:', status);
      
      if (status.isLoaded) {
        const durationMillis = status.durationMillis || 0;
        setDuration(durationMillis);
        console.log('[AudioPlayer] Audio loaded successfully, duration:', durationMillis);
        
        // If duration is NaN or 0, try to get it from the audioFile or wait for it
        if (!durationMillis || isNaN(durationMillis)) {
          console.log('[AudioPlayer] Duration not detected, trying fallback approaches...');
          
          // Try to get duration from audioFile first
          if (audioFile?.duration) {
            const fallbackDuration = audioFile.duration * 1000; // Convert seconds to milliseconds
            setDuration(fallbackDuration);
            console.log('[AudioPlayer] Using fallback duration from audioFile:', fallbackDuration);
          } else {
            // Try to detect duration by playing a tiny bit and checking
            try {
              console.log('[AudioPlayer] Attempting to detect duration by playing...');
              newSound.play();
              await new Promise(resolve => setTimeout(resolve, 100)); // Play for 100ms
              newSound.pause();
              // Note: setPositionAsync might not exist in new API, skip for now
              
              // Check status again after playing
              const playStatus = newSound.currentStatus;
              if (playStatus.durationMillis && !isNaN(playStatus.durationMillis)) {
                setDuration(playStatus.durationMillis);
                console.log('[AudioPlayer] Duration detected after playing:', playStatus.durationMillis);
              } else {
                console.warn('[AudioPlayer] Duration still not detected after playing');
                
                // Try web-specific duration detection as last resort
                if (typeof window !== 'undefined') {
                  console.log('[AudioPlayer] Trying web-specific duration detection...');
                  try {
                    const webDuration = await AudioUtils.detectWebAudioDuration(audioFile?.filename || '');
                    if (webDuration > 0) {
                      setDuration(webDuration);
                      console.log('[AudioPlayer] Web-specific duration detected:', webDuration);
                    }
                  } catch (webError) {
                    console.warn('[AudioPlayer] Web-specific duration detection failed:', webError);
                  }
                } else {
                  console.log('[AudioPlayer] Web-specific duration detection not available on this platform');
                }
              }
            } catch (playError) {
              console.warn('[AudioPlayer] Error trying to detect duration by playing:', playError);
            }
          }
        }
      } else {
        console.warn('[AudioPlayer] Sound created but not fully loaded - web may need more time');
        
        // Enhanced retry logic for web
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second between retries
        
        const checkLoading = async () => {
          try {
            const retryStatus = newSound.currentStatus;
            console.log(`[AudioPlayer] Retry ${retryCount + 1} status:`, retryStatus);
            
            if (retryStatus.isLoaded) {
              const durationMillis = retryStatus.durationMillis || 0;
              setDuration(durationMillis);
              console.log('[AudioPlayer] Audio loaded successfully after retry, duration:', durationMillis);
              return true;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
              setTimeout(checkLoading, retryDelay);
            } else {
              console.warn('[AudioPlayer] Audio not fully loaded after all retries, but may still work');
              // Set a fallback duration from audioFile if available
              if (audioFile?.duration) {
                setDuration(audioFile.duration * 1000); // Convert seconds to milliseconds
                console.log('[AudioPlayer] Using fallback duration from audioFile:', audioFile.duration);
              }
            }
          } catch (retryError) {
            console.error('[AudioPlayer] Error checking retry status:', retryError);
          }
          return false;
        };
        
        // Start the retry process
        setTimeout(checkLoading, retryDelay);
      }
    } catch (error) {
      console.error('[AudioPlayer] Error loading audio:', error);
      
      // Enhanced error handling for web
      let errorMessage = 'Failed to load audio file';
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'Audio file cannot be loaded due to browser restrictions';
        } else if (error.message.includes('404')) {
          errorMessage = 'Audio file not found';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error: Unable to load audio file';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Start status updates using the new expo-audio API (replacement for setOnPlaybackStatusUpdate)
  const startStatusPolling = (audioSound: any) => {
    // Clear any existing interval
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }

    try {
      // Use the new expo-audio event listener approach
      if (audioSound && audioSound.addListener) {
        audioSound.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
        console.log('[AudioPlayer] Added playback status listener');
      } else {
        // Fallback to polling if addListener is not available
        console.log('[AudioPlayer] addListener not available, falling back to polling');
        const interval = setInterval(() => {
          try {
            if (audioSound) {
              const status = audioSound.currentStatus;
              onPlaybackStatusUpdate(status);
            }
          } catch (error) {
            console.warn('[AudioPlayer] Error polling status:', error);
          }
        }, 250); // Poll every 250ms for smooth updates
        setStatusUpdateInterval(interval);
      }
    } catch (error) {
      console.warn('[AudioPlayer] Error setting up status updates:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    console.log('[AudioPlayer] Playback status update:', status);
    
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else {
      // Handle case where sound becomes unloaded
      console.warn('[AudioPlayer] Sound became unloaded, this may be normal for web audio');
      // Don't reset isPlaying here as it might be a temporary state
      // Only reset if we're sure the sound is completely gone
      if (status.error) {
        console.error('[AudioPlayer] Sound error:', status.error);
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      console.log('[AudioPlayer] Play/Pause pressed. Sound exists:', !!sound, 'Is playing:', isPlaying);
      
      if (!sound) {
        console.warn('[AudioPlayer] No sound object available');
        return;
      }

      // All sound objects from AudioUtils.createSound() are expo-audio Audio.Sound objects
      // The web audio fallback is handled within AudioUtils.createSound()
      console.log('[AudioPlayer] Using expo-audio for playback');
      
      // Enhanced status checking for web
      let status;
      try {
        status = sound.currentStatus;
        console.log('[AudioPlayer] Current sound status:', status);
      } catch (statusError) {
        console.warn('[AudioPlayer] Error getting sound status:', statusError);
        status = { isLoaded: false };
      }
      
      if (!status.isLoaded) {
        console.warn('[AudioPlayer] Sound is not loaded, attempting to reload...');
        // Try to reload the audio
        await loadAudio();
        // Wait a moment for the new sound to be set
        setTimeout(() => {
          try {
            if (sound && isPlaying === false) {
              sound.play();
              console.log('[AudioPlayer] Audio play after reload successful');
            }
          } catch (retryError) {
            console.error('[AudioPlayer] Play after reload failed:', retryError);
          }
        }, 500);
        return;
      }

      if (isPlaying) {
        console.log('[AudioPlayer] Pausing audio...');
        sound.pause();
        console.log('[AudioPlayer] Audio paused successfully');
      } else {
        console.log('[AudioPlayer] Playing audio...');
        
        // Enhanced play logic for web
        try {
          sound.play();
          console.log('[AudioPlayer] Audio play command sent successfully');
        } catch (playError) {
          console.error('[AudioPlayer] Play error:', playError);
          
          // Web-specific play error handling
          if (playError instanceof Error) {
            if (playError.message.includes('not loaded')) {
              console.log('[AudioPlayer] Sound not loaded, attempting to reload and retry...');
              await loadAudio();
              // Try playing again after reload
              setTimeout(() => {
                try {
                  sound?.play();
                  console.log('[AudioPlayer] Audio play retry successful');
                } catch (retryError) {
                  console.error('[AudioPlayer] Play retry failed:', retryError);
                  Alert.alert('Error', 'Unable to play audio. Please try again.');
                }
              }, 1000);
              return;
            } else if (playError.message.includes('user gesture')) {
              Alert.alert('Playback Error', 'Audio playback requires user interaction. Please try clicking play again.');
              return;
            }
          }
          
          throw playError; // Re-throw if not handled
        }
      }
    } catch (error) {
      console.error('[AudioPlayer] Error playing/pausing audio:', error);
      
      // Enhanced error handling for web
      if (error instanceof Error) {
        if (error.message.includes('not loaded')) {
          console.log('[AudioPlayer] Sound not loaded, attempting to reload...');
          await loadAudio();
        } else if (error.message.includes('user gesture')) {
          Alert.alert('Playback Error', 'Audio playback requires user interaction. Please try clicking play again.');
        } else if (error.message.includes('CORS')) {
          Alert.alert('Playback Error', 'Audio cannot be played due to browser restrictions.');
        } else {
          Alert.alert('Error', 'Failed to play audio. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to play audio');
      }
    }
  };

  const handleStop = async () => {
    try {
      if (!sound) return;
      
      // All sound objects from AudioUtils.createSound() are expo-audio Audio.Sound objects
      console.log('[AudioPlayer] Stopping expo-audio audio...');
      sound.stop();
      // Note: setPositionAsync might not exist in new API, skip for now
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    if (!milliseconds || isNaN(milliseconds)) return '0:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRetryTranscription = async () => {
    try {
      setIsRetryingTranscription(true);
      
      // Update status to processing
      onTranscriptionStatusUpdate?.('processing');
      
      // Get the audio file as base64
      const base64Audio = await AudioUtils.getBase64FromUri(audioFile.filename);
      
      // Retry transcription
      const transcription = await transcribeAudioWithGemini(base64Audio);
      
      // Update the transcription
      onTranscriptionUpdate?.(transcription);
      onTranscriptionStatusUpdate?.('completed');
      
      Alert.alert('Success', 'Transcription completed successfully!');
    } catch (error) {
      console.error('Error retrying transcription:', error);
      onTranscriptionStatusUpdate?.('failed');
      Alert.alert('Error', 'Failed to retry transcription. Please try again.');
    } finally {
      setIsRetryingTranscription(false);
    }
  };

  const getTranscriptionStatusDisplay = () => {
    switch (audioFile.transcriptionStatus) {
      case 'pending':
        return {
          icon: 'time-outline',
          color: subTextColor,
          text: 'Transcription pending',
          showRetry: false
        };
      case 'processing':
        return {
          icon: 'sync-outline',
          color: accentColor,
          text: 'Transcribing...',
          showRetry: false
        };
      case 'completed':
        return {
          icon: 'checkmark-circle',
          color: successColor,
          text: 'Transcription completed',
          showRetry: false
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: dangerColor,
          text: 'Transcription failed',
          showRetry: true
        };
      default:
        return {
          icon: 'help-circle-outline',
          color: subTextColor,
          text: 'Transcription status unknown',
          showRetry: false
        };
    }
  };

  const transcriptionStatus = getTranscriptionStatusDisplay();

  return (
    <View style={[styles.container, { backgroundColor: containerBg }] }>
      <View style={styles.header}>
        <Ionicons name="musical-notes" size={20} color="#6A5ACD" />
        <ThemedText style={[styles.title, { color: textColor }]}>Audio Recording</ThemedText>
      </View>

      {/* Audio Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={isPlaying ? handleStop : handlePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingSpinner size={20} color="#FFFFFF" />
          ) : isPlaying ? (
            <Ionicons name="pause" size={24} color="#FFFFFF" />
          ) : (
            <Ionicons name="play" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(position / duration) * 100}%` }
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <ThemedText style={styles.timeText}>
              {formatTime(position)}
            </ThemedText>
            <ThemedText style={styles.timeText}>
              {formatTime(duration)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Retry Button - Only show when transcription failed */}
      {audioFile.transcriptionStatus === 'failed' && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetryTranscription}
          disabled={isRetryingTranscription}
        >
          {isRetryingTranscription ? (
            <LoadingSpinner size={16} color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
          )}
          <ThemedText style={styles.retryButtonText}>
            Retry Transcription
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6A5ACD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 