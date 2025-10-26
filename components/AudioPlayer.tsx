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
  const statusUpdateInterval = React.useRef<NodeJS.Timeout | null>(null);

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
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
        statusUpdateInterval.current = null;
      }
      if (sound) {
        // The new expo-audio API doesn't have unloadAsync
        // Cleanup is handled differently - just clear the reference
        if (__DEV__) console.log('[AudioPlayer] Cleaning up sound object');
      }
    };
  }, [audioFile]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Validate audioFile before processing
      if (!audioFile || !audioFile.filename) {
        throw new Error('Invalid audio file data');
      }
      
      if (__DEV__) {
        console.log('[AudioPlayer] Loading audio from:', audioFile.filename);
        console.log('[AudioPlayer] Audio file details:', {
          filename: audioFile.filename,
          duration: audioFile.duration,
          type: audioFile.type,
          hasAudioUri: !!audioFile.audioUri
        });
      }
      
      // Create sound object from the audio URI (AudioUtils will handle authentication)
      const { sound: newSound } = await AudioUtils.createSound(audioFile.filename);
      
      // Check if this is HTML5 Audio (web) or expo-audio
      const isWebAudio = typeof HTMLAudioElement !== 'undefined' && newSound instanceof HTMLAudioElement;
      if (__DEV__) console.log('[AudioPlayer] Sound type:', isWebAudio ? 'HTML5 Audio' : 'expo-audio');
      
      if (isWebAudio) {
        const webAudio = newSound as HTMLAudioElement;
        if (__DEV__) console.log('[AudioPlayer] Web audio element created:', {
          src: webAudio.src,
          readyState: webAudio.readyState,
          networkState: webAudio.networkState,
          preload: webAudio.preload
        });
      }
        
      // Note: The new expo-audio AudioPlayer doesn't use setOnPlaybackStatusUpdate
      // Status updates are handled differently - we'll poll for status updates instead
      
      setSound(newSound);
      
      // Don't start polling automatically - only poll when audio is playing
      // startStatusPolling(newSound);
      
      // Enhanced duration and loading verification with better error handling
      let status: any;
      
      if (isWebAudio) {
        // For HTML5 Audio element
        const webAudio = newSound as HTMLAudioElement;
        status = {
          isLoaded: webAudio.readyState >= 2, // HAVE_ENOUGH_DATA
          durationMillis: (webAudio.duration || 0) * 1000,
          duration: webAudio.duration || 0
        };
        
        // Add error handling for web audio
        webAudio.addEventListener('error', (event) => {
          console.error('[AudioPlayer] Web audio error:', webAudio.error);
          const errorCode = webAudio.error?.code;
          let errorMessage = 'Audio playback error';
          
          switch (errorCode) {
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error - check your internet connection';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio format not supported';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio file not accessible';
              break;
            default:
              errorMessage = 'Audio playback failed';
          }
          
          Alert.alert('Playback Error', errorMessage);
        });
        
      } else {
        // For expo-audio
        try {
          status = newSound.currentStatus;
        } catch (error) {
          console.warn('[AudioPlayer] Error getting expo-audio status:', error);
          // Fallback for web audio elements that don't have currentStatus
          if (newSound instanceof HTMLAudioElement) {
            status = {
              isLoaded: newSound.readyState >= 2,
              durationMillis: (newSound.duration || 0) * 1000,
              duration: newSound.duration || 0
            };
          } else {
            status = { isLoaded: false, durationMillis: 0, duration: 0 };
          }
        }
      }
      if (__DEV__) console.log('[AudioPlayer] Sound loaded with status:', status);
      
      if (status.isLoaded) {
        const durationMillis = status.durationMillis || 0;
        setDuration(durationMillis);
        if (__DEV__) console.log('[AudioPlayer] Audio loaded successfully, duration:', durationMillis);
        
        // If duration is NaN or 0, try to get it from the audioFile or wait for it
        if (!durationMillis || isNaN(durationMillis)) {
          if (__DEV__) console.log('[AudioPlayer] Duration not detected, trying fallback approaches...');
          
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
            let retryStatus: any;
            
            // Use the sound state variable instead of newSound
            const currentSound = sound;
            if (!currentSound) {
              console.warn('[AudioPlayer] No sound object available for retry check');
              return false;
            }
            
            if (isWebAudio) {
              // For HTML5 Audio element
              const webAudio = currentSound as HTMLAudioElement;
              retryStatus = {
                isLoaded: webAudio.readyState >= 2,
                durationMillis: (webAudio.duration || 0) * 1000,
                duration: webAudio.duration || 0
              };
            } else {
              // For expo-audio
              try {
                retryStatus = currentSound.currentStatus;
              } catch (error) {
                console.warn('[AudioPlayer] Error getting retry status:', error);
                retryStatus = { isLoaded: false, durationMillis: 0, duration: 0 };
              }
            }
            
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
      
      // Enhanced error handling with more specific messages
      let errorMessage = 'Failed to load audio file';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error - check your internet connection';
        } else if (error.message.includes('signed URL')) {
          errorMessage = 'Audio file access error - please try again';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Audio loading timeout - file may be too large';
        } else if (error.message.includes('format') || error.message.includes('decode')) {
          errorMessage = 'Audio format not supported';
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMessage = 'Audio access blocked - please try refreshing';
        } else if (error.message.includes('404')) {
          errorMessage = 'Audio file not found';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error: Unable to load audio file';
        } else {
          errorMessage = `Audio loading failed: ${error.message}`;
        }
      }
      
      Alert.alert('Audio Loading Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Start status updates using the new expo-audio API (replacement for setOnPlaybackStatusUpdate)
  const startStatusPolling = (audioSound: any) => {
    // Clear any existing interval
    if (statusUpdateInterval.current) {
      clearInterval(statusUpdateInterval.current);
      statusUpdateInterval.current = null;
    }

    try {
      // Check if this is a web Audio element (HTML5 Audio) - HTMLAudioElement only exists in browsers
      const isWebAudio = typeof HTMLAudioElement !== 'undefined' && audioSound instanceof HTMLAudioElement;
      
      if (__DEV__) console.log('[AudioPlayer] Setting up status polling. Is Web Audio:', isWebAudio);
      
      const interval = setInterval(() => {
        try {
          if (!audioSound) return;
          
          let isCurrentlyPlaying = false;
          
          if (isWebAudio) {
            // Handle HTML5 Audio element (web)
            const webAudio = audioSound as HTMLAudioElement;
            isCurrentlyPlaying = !webAudio.paused && !webAudio.ended;
            
            const webStatus = {
              isLoaded: !webAudio.paused || webAudio.readyState >= 2,
              playing: isCurrentlyPlaying,
              currentTime: webAudio.currentTime || 0,
              duration: webAudio.duration || 0,
              didJustFinish: webAudio.ended
            };
            onPlaybackStatusUpdate(webStatus);
          } else {
            // Handle expo-audio AudioPlayer SDK 54
            let status;
            try {
              status = audioSound.currentStatus;
              isCurrentlyPlaying = status?.playing ?? status?.isPlaying ?? false;
            } catch (statusError) {
              // Try alternative status methods
              if (typeof audioSound.getStatus === 'function') {
                status = audioSound.getStatus();
                isCurrentlyPlaying = status?.playing ?? status?.isPlaying ?? false;
              } else if (typeof audioSound.status === 'object') {
                status = audioSound.status;
                isCurrentlyPlaying = status?.playing ?? status?.isPlaying ?? false;
              }
            }
            
            if (status) {
              onPlaybackStatusUpdate(status);
            }
          }
          
          // Stop polling if audio is not playing and not loading
          if (!isCurrentlyPlaying && !isLoading) {
            if (__DEV__) console.log('[AudioPlayer] Audio not playing, stopping status polling');
            clearInterval(statusUpdateInterval.current);
            statusUpdateInterval.current = null;
          }
        } catch (error) {
          console.warn('[AudioPlayer] Error polling status:', error);
        }
      }, 250); // Poll every 250ms for smooth updates
      
      statusUpdateInterval.current = interval;
      if (__DEV__) console.log('[AudioPlayer] Status polling started successfully');
    } catch (error) {
      console.warn('[AudioPlayer] Error setting up status updates:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    // Handle both loaded and unloaded states
    if (status) {
      // SDK 54 uses 'playing' instead of 'isPlaying'
      const isCurrentlyPlaying = status.playing ?? status.isPlaying ?? false;
      const currentPosition = status.currentTime !== undefined 
        ? status.currentTime * 1000  // Convert seconds to milliseconds
        : (status.positionMillis ?? 0);
      const currentDuration = status.duration !== undefined
        ? status.duration * 1000  // Convert seconds to milliseconds
        : (status.durationMillis ?? 0);
      
      // Log full status for debugging
      if (isCurrentlyPlaying) {
        console.log('[AudioPlayer] Status update - PLAYING:', {
          isLoaded: status.isLoaded,
          playing: isCurrentlyPlaying,
          position: currentPosition,
          duration: currentDuration
        });
      }
      
      // Update playing state
      console.log('[AudioPlayer] Updating isPlaying state to:', isCurrentlyPlaying);
      setIsPlaying(isCurrentlyPlaying);
      
      // Update position
      if (currentPosition !== undefined && !isNaN(currentPosition)) {
        setPosition(currentPosition);
      }
      
      // Update duration if available and valid
      if (currentDuration > 0 && !isNaN(currentDuration)) {
        if (duration === 0 || Math.abs(duration - currentDuration) > 100) {
          console.log('[AudioPlayer] Updating duration to:', currentDuration);
          setDuration(currentDuration);
        }
      }
      
      // Handle finish
      if (status.didJustFinish) {
        console.log('[AudioPlayer] Audio finished playing');
        setIsPlaying(false);
        setPosition(0);
      }
      
      // Handle errors
      if (status.error) {
        console.error('[AudioPlayer] Sound error:', status.error);
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (__DEV__) console.log('[AudioPlayer] Play/Pause pressed. Sound exists:', !!sound, 'Is playing:', isPlaying);
      
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
        // Check if this is HTML5 Audio (web) first
        const isWebAudio = typeof HTMLAudioElement !== 'undefined' && sound instanceof HTMLAudioElement;
        
        if (isWebAudio) {
          const webAudio = sound as HTMLAudioElement;
          status = {
            isLoaded: webAudio.readyState >= 2,
            durationMillis: (webAudio.duration || 0) * 1000,
            duration: webAudio.duration || 0
          };
          console.log('[AudioPlayer] Web audio status:', {
            readyState: webAudio.readyState,
            duration: webAudio.duration,
            src: webAudio.src,
            networkState: webAudio.networkState
          });
        } else {
          status = sound.currentStatus;
        }
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

      // Check if this is HTML5 Audio (web) - HTMLAudioElement only exists in browsers
      const isWebAudio = typeof HTMLAudioElement !== 'undefined' && sound instanceof HTMLAudioElement;

      if (isPlaying) {
        if (__DEV__) console.log('[AudioPlayer] Pausing audio...');
        if (isWebAudio) {
          sound.pause();
        } else {
          sound.pause();
        }
        console.log('[AudioPlayer] Audio pause command sent');
        
        // Immediately check status for responsive UI
        setTimeout(() => {
          try {
            if (isWebAudio) {
              const webAudio = sound as HTMLAudioElement;
              onPlaybackStatusUpdate({
                isLoaded: true,
                playing: !webAudio.paused,
                currentTime: webAudio.currentTime,
                duration: webAudio.duration
              });
            } else {
              try {
                const newStatus = sound.currentStatus;
                onPlaybackStatusUpdate(newStatus);
              } catch (error) {
                console.warn('[AudioPlayer] Error getting status after pause:', error);
              }
            }
          } catch (statusError) {
            console.warn('[AudioPlayer] Error getting immediate status:', statusError);
          }
        }, 50);
      } else {
        if (__DEV__) console.log('[AudioPlayer] Playing audio...');
        
        // Restart polling when starting playback
        startStatusPolling(sound);
        
        // Enhanced play logic for web
        try {
          if (isWebAudio) {
            const webAudio = sound as HTMLAudioElement;
            console.log('[AudioPlayer] Attempting to play web audio:', {
              src: webAudio.src,
              readyState: webAudio.readyState,
              networkState: webAudio.networkState,
              paused: webAudio.paused,
              ended: webAudio.ended
            });
            
            const playPromise = sound.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('[AudioPlayer] Web audio play promise resolved');
              }).catch((error: Error) => {
                console.error('[AudioPlayer] Web audio play error:', error);
                console.error('[AudioPlayer] Play error details:', {
                  name: error.name,
                  message: error.message,
                  stack: error.stack
                });
                
                // Handle specific web audio errors
                if (error.name === 'NotAllowedError') {
                  Alert.alert('Audio Playback', 'Please click the play button to start audio playback. Browser requires user interaction.');
                } else if (error.name === 'NotSupportedError') {
                  Alert.alert('Audio Error', 'Audio format not supported by your browser.');
                } else {
                  Alert.alert('Playback Error', `Unable to play audio: ${error.message}`);
                }
              });
            }
          } else {
            sound.play();
          }
          console.log('[AudioPlayer] Audio play command sent successfully');
          
          // Immediately check status for responsive UI
          setTimeout(() => {
            try {
              if (isWebAudio) {
                const webAudio = sound as HTMLAudioElement;
                onPlaybackStatusUpdate({
                  isLoaded: true,
                  playing: !webAudio.paused,
                  currentTime: webAudio.currentTime,
                  duration: webAudio.duration
                });
              } else {
                try {
                  const newStatus = sound.currentStatus;
                  onPlaybackStatusUpdate(newStatus);
                } catch (error) {
                  console.warn('[AudioPlayer] Error getting status after play:', error);
                }
              }
            } catch (statusError) {
              console.warn('[AudioPlayer] Error getting immediate status:', statusError);
            }
          }, 50);
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
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={handlePlayPause}
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
          <View style={[styles.progressBar, isPlaying && styles.progressBarActive]}>
            <View
              style={[
                styles.progressFill,
                isPlaying && styles.progressFillActive,
                { 
                  width: duration > 0 && !isNaN(position) && !isNaN(duration)
                    ? `${Math.min(100, Math.max(0, (position / duration) * 100))}%`
                    : '0%'
                }
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <ThemedText style={[styles.timeText, isPlaying && styles.timeTextActive]}>
              {formatTime(position)}
            </ThemedText>
            <ThemedText style={[styles.timeText, isPlaying && styles.timeTextActive]}>
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
  playButtonActive: {
    backgroundColor: '#8A7AED',
    boxShadow: '0px 2px 4px rgba(106, 90, 205, 0.5)',
    elevation: 4,
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
  progressBarActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressFillActive: {
    backgroundColor: '#8A7AED',
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
  timeTextActive: {
    fontWeight: 'bold',
    color: '#8A7AED',
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