import * as FileSystem from 'expo-file-system/legacy';
import { featureLimitService } from './FeatureLimitService';

// Import expo-audio for SDK 54 - use the new API
import {
    AudioModule,
    createAudioPlayer,
    getRecordingPermissionsAsync,
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    type AudioPlayer,
    type AudioRecorder,
    type RecordingOptions
} from 'expo-audio';

console.log('[AudioUtils] expo-audio SDK 54 API loaded successfully');

/**
 * Global recording manager to prevent multiple recording instances
 */
class RecordingManager {
  private static currentRecording: AudioRecorder | null = null;

  static async cleanupCurrentRecording(): Promise<void> {
    if (this.currentRecording) {
      try {
        console.log('[RecordingManager] Cleaning up current recording...');
        if (this.currentRecording.isRecording) {
          await this.currentRecording.stop();
        }
        // AudioRecorder extends SharedObject which has remove method
        (this.currentRecording as any).remove();
        console.log('[RecordingManager] Current recording cleaned up successfully');
      } catch (error) {
        console.log('[RecordingManager] Error cleaning up current recording:', error);
      } finally {
        this.currentRecording = null;
      }
    }
  }

  static setCurrentRecording(recording: AudioRecorder): void {
    this.currentRecording = recording;
  }

  static clearCurrentRecording(): void {
    this.currentRecording = null;
  }
}

/**
 * Modern AudioUtils service using the new expo-audio Audio API
 * Provides better performance and stability
 */
export class AudioUtils {
  
  /**
   * Initialize audio session with proper configuration
   */
  static async initializeAudio(): Promise<void> {
    try {
      console.log('[AudioUtils] Initializing audio session...');
      
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionModeAndroid: 'duckOthers',
        interruptionMode: 'mixWithOthers'
      });
      
      console.log('[AudioUtils] Audio session initialized successfully');
    } catch (error) {
      console.error('[AudioUtils] Error initializing audio session:', error);
      throw new Error(`Failed to initialize audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Force request microphone permissions (always shows dialog)
   */
  static async forceRequestPermissions(): Promise<{ status: string }> {
    try {
      console.log('[AudioUtils] Force requesting microphone permissions...');
      
      // Force request permission - this should trigger the dialog even if previously denied
      const permission = await requestRecordingPermissionsAsync();
      console.log('[AudioUtils] Force permission result:', permission);
      
      // Provide detailed feedback
      switch (permission.status) {
        case 'granted':
          console.log('[AudioUtils] Force request: Permission granted');
          break;
        case 'denied':
          console.warn('[AudioUtils] Force request: Permission denied');
          break;
        case 'undetermined':
          console.warn('[AudioUtils] Force request: Permission undetermined');
          break;
        default:
          console.warn('[AudioUtils] Force request: Unknown status:', permission.status);
          break;
      }
      
      return permission;
    } catch (error) {
      console.error('[AudioUtils] Error force requesting permissions:', error);
      console.error('[AudioUtils] Force request error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { status: 'denied' };
    }
  }

  /**
   * Check microphone permissions without requesting them
   */
  static async checkPermissions(): Promise<{ status: string; canRequest: boolean }> {
    try {
      console.log('[AudioUtils] Checking microphone permissions (read-only)...');
      
      const permission = await getRecordingPermissionsAsync();
      console.log('[AudioUtils] Permission check result:', permission);
      
      // Determine if we can request permissions
      const canRequest = permission.status === 'undetermined' || permission.status === 'denied';
      
      console.log('[AudioUtils] Can request permission:', canRequest);
      
      return {
        status: permission.status,
        canRequest
      };
    } catch (error) {
      console.error('[AudioUtils] Error checking permissions:', error);
      return {
        status: 'denied',
        canRequest: false
      };
    }
  }

  /**
   * Request microphone permissions with improved logic
   */
  static async requestPermissions(): Promise<{ status: string }> {
    try {
      console.log('[AudioUtils] Checking microphone permissions...');
      
      // First, check current permission status
      const currentPermission = await getRecordingPermissionsAsync();
      console.log('[AudioUtils] Current permission status:', currentPermission);
      
      // Handle different permission states
      switch (currentPermission.status) {
        case 'granted':
          console.log('[AudioUtils] Permission already granted');
          return currentPermission;
          
        case 'denied':
          console.log('[AudioUtils] Permission was previously denied');
          // For denied permissions, we should still try to request again
          // as the user might have changed their mind
          break;
          
        case 'undetermined':
          console.log('[AudioUtils] Permission status undetermined, requesting...');
          break;
          
        default:
          console.log('[AudioUtils] Unknown permission status:', currentPermission.status);
          break;
      }
      
      // Request permission - this should trigger the dialog if needed
      console.log('[AudioUtils] Requesting microphone permission...');
      const newPermission = await requestRecordingPermissionsAsync();
      console.log('[AudioUtils] New permission status:', newPermission);
      
      // Provide feedback based on the result
      switch (newPermission.status) {
        case 'granted':
          console.log('[AudioUtils] Permission granted successfully');
          break;
        case 'denied':
          console.warn('[AudioUtils] Microphone permission denied by user');
          break;
        case 'undetermined':
          console.warn('[AudioUtils] Microphone permission status is undetermined');
          break;
        default:
          console.warn('[AudioUtils] Unknown permission result:', newPermission.status);
          break;
      }
      
      return newPermission;
    } catch (error) {
      console.error('[AudioUtils] Error requesting permissions:', error);
      console.error('[AudioUtils] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { status: 'denied' };
    }
  }

  /**
   * Create a new recording using the modern Audio API - updated for SDK 54
   * Note: SDK 54 uses AudioRecorder class directly
   */
  static async createRecording(): Promise<{ recording: AudioRecorder }> {
    try {
      console.log('[AudioUtils] Creating new recording with SDK 54 Audio API...');
      
      // Clean up any existing recording first
      await RecordingManager.cleanupCurrentRecording();
      
      // Initialize audio first
      await this.initializeAudio();
      
      // Wait a moment for audio session to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // SDK 54: Create AudioRecorder using AudioModule
      let recorder: AudioRecorder;
      
      // Try using RecordingPresets first (simpler approach)
      if (RecordingPresets && RecordingPresets.HIGH_QUALITY) {
        console.log('[AudioUtils] Using HIGH_QUALITY recording preset');
        recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      } else {
        // Fallback to manual configuration if presets not available
        console.log('[AudioUtils] Using manual recording configuration');
        const recordingOptions: Partial<RecordingOptions> = {
          android: {
            extension: '.m4a',
            outputFormat: 'mpeg4',
            audioEncoder: 'aac',
            sampleRate: 44100,
          },
          ios: {
            extension: '.m4a',
            audioQuality: 96, // HIGH quality
            sampleRate: 44100,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        };
        recorder = new AudioModule.AudioRecorder(recordingOptions);
      }
      
      if (!recorder) {
        throw new Error('Failed to create recording object');
      }
      
      // Prepare the recorder
      await recorder.prepareToRecordAsync();
      
      // Verify the recording object is valid
      try {
        const status = recorder.getStatus();
        console.log('[AudioUtils] Recording status after creation:', status);
      } catch (statusError) {
        console.warn('[AudioUtils] Could not get recording status:', statusError);
        // Continue even if status check fails
      }
      
      // Set as current recording
      RecordingManager.setCurrentRecording(recorder);
      
      console.log('[AudioUtils] Recording created successfully with SDK 54 API');
      return { recording: recorder };
      
    } catch (error) {
      console.error('[AudioUtils] Error creating recording:', error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Microphone permission denied. Please grant microphone access in your device settings.');
        } else if (error.message.includes('audio')) {
          throw new Error('Audio system error. Please check your device audio settings and try again.');
        } else if (error.message.includes('recording')) {
          throw new Error('Recording system error. Please try again.');
        } else if (error.message.includes('Only one Recording object')) {
          throw new Error('Another recording is in progress. Please stop the current recording first.');
        }
      }
      
      throw new Error(`Failed to create recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start recording with validation and retry logic
   */
  static async startRecording(recording: AudioRecorder): Promise<void> {
    try {
      console.log('[AudioUtils] Starting recording...');
      
      // Check if recording object is valid
      if (!recording) {
        throw new Error('Recording object is null or undefined');
      }
      
      // Get initial status
      const initialStatus = recording.getStatus();
      console.log('[AudioUtils] Initial recording status:', initialStatus);
      
      // Check if recording is already active
      if (initialStatus.isRecording) {
        console.log('[AudioUtils] Recording is already active, skipping start');
        return;
      }
      
      // Start the recording
      recording.record();
      
      // Wait a moment for the recording to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify recording started with retry logic
      let status;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        status = recording.getStatus();
        console.log(`[AudioUtils] Recording status after start (attempt ${retryCount + 1}):`, status);
        
        if (status.isRecording) {
          console.log('[AudioUtils] Recording started successfully');
          return;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`[AudioUtils] Recording not started, retrying in 200ms... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // If we get here, recording failed to start after all retries
      throw new Error(`Recording failed to start after ${maxRetries} attempts. Final status: ${JSON.stringify(status)}`);
      
    } catch (error) {
      console.error('[AudioUtils] Error starting recording:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('recording not started')) {
          // Check if recording is actually already active
          try {
            const status = recording.getStatus();
            if (status.isRecording) {
              console.log('[AudioUtils] Recording is actually active despite error message');
              return; // Recording is working, just ignore the misleading error
            }
          } catch (statusError) {
            console.error('[AudioUtils] Error checking recording status:', statusError);
          }
          throw new Error('Recording failed to initialize. Please try again.');
        } else if (error.message.includes('permission')) {
          throw new Error('Microphone permission denied. Please grant microphone access.');
        } else if (error.message.includes('audio')) {
          throw new Error('Audio system error. Please check your device audio settings.');
        }
      }
      
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and get URI
   */
  static async stopRecording(recording: AudioRecorder): Promise<string> {
    try {
      console.log('[AudioUtils] Stopping recording...');
      
      // Check recording status
      const status = recording.getStatus();
      console.log('[AudioUtils] Recording status before stop:', status);
      
      if (!status.isRecording) {
        console.warn('[AudioUtils] Recording was not active when trying to stop');
      }
      
      // Stop recording
      await recording.stop();
      
      // Get the URI
      const uri = recording.uri;
      if (!uri) {
        throw new Error('No recording URI available');
      }
      
      // Clear from manager
      RecordingManager.clearCurrentRecording();
      
      console.log('[AudioUtils] Recording stopped successfully, URI:', uri);
      return uri;
    } catch (error) {
      console.error('[AudioUtils] Error stopping recording:', error);
      
      // Clear from manager even on error
      RecordingManager.clearCurrentRecording();
      
      // Handle specific error cases
      if (error instanceof Error && error.message.includes('no valid audio data')) {
        throw new Error('Recording was too short or had no audio data. Please try recording for at least a few seconds.');
      }
      
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Web-specific audio handler using HTML5 Audio API
   * Fallback for when expo-audio doesn't work properly on web
   */
  private static createWebAudioHandler(uri: string): Promise<{ sound: any }> {
    return new Promise((resolve, reject) => {
      try {
        // Only use Web Audio API on web platform
        if (typeof window === 'undefined' || typeof Audio === 'undefined') {
          reject(new Error('Web Audio API not available on this platform'));
          return;
        }

        console.log('[AudioUtils] Creating HTML5 Audio element for:', uri);
        
        // Create audio element for web
        const audio = new (typeof window !== 'undefined' && window.Audio ? window.Audio : globalThis.Audio)();
        
        // Important: Don't set crossOrigin for Supabase signed URLs as they handle CORS properly
        // Setting crossOrigin can actually cause issues with signed URLs
        if (!uri.includes('supabase.co')) {
          audio.crossOrigin = 'anonymous';
        }
        
        audio.preload = 'metadata';
        
        let hasResolved = false;
        
        // Set up event handlers
        const onLoadedMetadata = () => {
          if (hasResolved) return;
          hasResolved = true;
          console.log('[AudioUtils] Web audio loaded successfully');
          console.log('[AudioUtils] Web audio duration:', audio.duration, 'seconds');
          console.log('[AudioUtils] Web audio ready state:', audio.readyState);
          
          // Clean up listeners
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          
          resolve({ sound: audio });
        };
        
        const onCanPlay = () => {
          if (hasResolved) return;
          console.log('[AudioUtils] Web audio can play, ready state:', audio.readyState);
          // If metadata hasn't loaded yet but we can play, resolve anyway
          if (audio.readyState >= 2) { // HAVE_ENOUGH_DATA
            onLoadedMetadata();
          }
        };
        
        const onError = (event: Event | string) => {
          if (hasResolved) return;
          hasResolved = true;
          
          // Clean up listeners
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          
          // Get detailed error information
          const errorDetails = audio.error;
          let errorMessage = 'Failed to load audio';
          
          if (errorDetails) {
            switch (errorDetails.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio loading aborted';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error while loading audio';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio decoding error - format may not be supported';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio source not supported - file may be inaccessible or in unsupported format';
                break;
              default:
                errorMessage = errorDetails.message || 'Unknown audio error';
            }
          }
          
          console.error('[AudioUtils] Web audio error:', errorMessage, errorDetails);
          reject(new Error(errorMessage));
        };
        
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('error', onError);
        
        // Set timeout in case audio never loads
        setTimeout(() => {
          if (!hasResolved) {
            console.error('[AudioUtils] Web audio loading timeout');
            onError('Timeout loading audio');
          }
        }, 10000); // 10 second timeout
        
        // Set the source and start loading
        console.log('[AudioUtils] Setting audio source:', uri);
        audio.src = uri;
        audio.load();
        
      } catch (error) {
        console.error('[AudioUtils] Error creating web audio handler:', error);
        reject(error);
      }
    });
  }

  /**
   * Extract file path from Supabase signed or public URL
   */
  private static extractSupabaseFilePath(url: string): string | null {
    try {
      // Handle signed URLs: /storage/v1/object/sign/audio-files/path/to/file?token=...
      const signedMatch = url.match(/\/storage\/v1\/object\/sign\/audio-files\/(.+?)(\?|$)/);
      if (signedMatch && signedMatch[1]) {
        return signedMatch[1].split('?')[0]; // Remove query params
      }
      
      // Handle public URLs: /storage/v1/object/public/audio-files/path/to/file
      const publicMatch = url.match(/\/storage\/v1\/object\/public\/audio-files\/(.+?)$/);
      if (publicMatch && publicMatch[1]) {
        return publicMatch[1];
      }
      
      console.warn('[AudioUtils] Could not extract file path from URL:', url);
      return null;
    } catch (error) {
      console.error('[AudioUtils] Error extracting file path:', error);
      return null;
    }
  }

  /**
   * Create sound object for playback using modern Audio API
   * Handles both local files and remote URLs (including authenticated URLs)
   * Enhanced for web compatibility with fallback to Web Audio API
   */
  static async createSound(uri: string): Promise<{ sound: AudioPlayer | any }> {
    try {
      console.log('[AudioUtils] Creating sound object for URI:', uri);
      
      let finalUri = uri;
      
      // If it's a remote URL (starts with http/https), we need to handle authentication
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        console.log('[AudioUtils] Detected remote URL, handling authentication...');
        
        // For Supabase URLs, we need to get a fresh signed URL
        if (uri.includes('supabase.co')) {
          try {
            // Always get a fresh signed URL for audio playback
            // This ensures the URL is valid and not expired
            console.log('[AudioUtils] Generating fresh signed URL for audio playback...');
            
            // Import Supabase client
            const { supabase } = await import('../lib/supabase');
            
            // Extract the file path from the URL (works for both signed and public URLs)
            const filePath = this.extractSupabaseFilePath(uri);
            
            if (!filePath) {
              throw new Error('Could not extract file path from Supabase URL');
            }
            
            console.log('[AudioUtils] Extracted file path:', filePath);
            
            // Get a fresh signed URL with 1 hour expiry
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('audio-files')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (signedUrlError) {
              console.error('[AudioUtils] Error getting signed URL:', signedUrlError);
              throw new Error(`Failed to get signed URL: ${signedUrlError.message}`);
            }
            
            if (signedUrlData?.signedUrl) {
              console.log('[AudioUtils] Got fresh signed URL for playback');
              finalUri = signedUrlData.signedUrl;
            } else {
              throw new Error('No signed URL received from Supabase');
            }
            
          } catch (error) {
            console.error('[AudioUtils] Error handling Supabase URL:', error);
            throw new Error(`Failed to process audio file: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Check if we're on web platform
      const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
      
      if (isWeb) {
        console.log('[AudioUtils] Detected web platform, using HTML5 Audio for better compatibility');
        
        // For web, use HTML5 Audio directly for better compatibility with Supabase signed URLs
        // expo-audio can have issues with signed URLs and CORS on web
        try {
          console.log('[AudioUtils] Using HTML5 Audio API for web playback');
          return await this.createWebAudioHandler(finalUri);
        } catch (webError) {
          console.error('[AudioUtils] HTML5 Audio failed, trying expo-audio as fallback:', webError);
          
          // If HTML5 Audio fails, try expo-audio as a last resort
          try {
            // Initialize audio session for web
            try {
              await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                interruptionModeAndroid: 'duckOthers',
                interruptionMode: 'mixWithOthers',
              });
              console.log('[AudioUtils] Audio session initialized for expo-audio fallback');
            } catch (audioModeError) {
              console.warn('[AudioUtils] Audio mode initialization failed (non-critical):', audioModeError);
            }
            
            // Create sound object from the final URI
            console.log('[AudioUtils] Creating expo-audio AudioPlayer as fallback');
            const sound = createAudioPlayer(finalUri);
            
            // Wait for sound to load
            let status = sound.currentStatus;
            let retryCount = 0;
            const maxRetries = 3;
            const retryDelay = 500;
            
            while (!status.isLoaded && retryCount < maxRetries) {
              retryCount++;
              console.log(`[AudioUtils] Fallback retry ${retryCount}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              try {
                status = sound.currentStatus;
              } catch (retryError) {
                console.warn(`[AudioUtils] Error checking status:`, retryError);
              }
            }
            
            if (!status.isLoaded) {
              throw new Error('expo-audio failed to load sound');
            }
            
            console.log('[AudioUtils] expo-audio fallback successful');
            return { sound };
            
          } catch (expoError) {
            console.error('[AudioUtils] All audio loading methods failed:', expoError);
            throw new Error(`Failed to load audio: ${webError instanceof Error ? webError.message : String(webError)}`);
          }
        }
      } else {
        // Mobile platform - use standard expo-audio
        console.log('[AudioUtils] Mobile platform detected, using standard expo-audio');
        
        // Use createAudioPlayer for SDK 54 mobile
        const sound = createAudioPlayer(finalUri);
        console.log('[AudioUtils] Mobile sound object created successfully');
        return { sound };
      }
      
    } catch (error) {
      console.error('[AudioUtils] Error creating sound object:', error);
      
      // Enhanced error messages for web debugging
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          throw new Error('CORS error: Audio file cannot be loaded due to cross-origin restrictions');
        } else if (error.message.includes('404')) {
          throw new Error('Audio file not found: The file may have been deleted or moved');
        } else if (error.message.includes('network')) {
          throw new Error('Network error: Unable to load audio file. Please check your connection');
        }
      }
      
      throw new Error(`Failed to create sound object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert audio file to base64 for AI processing
   */
  static async getBase64FromUri(uri: string): Promise<string> {
    try {
      console.log('[AudioUtils] Converting audio to base64...');
      
      // Web-specific implementation using browser APIs
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        console.log('[AudioUtils] Using web-specific base64 conversion for:', uri);
        
        if (uri.startsWith('blob:')) {
          const response = await fetch(uri);
          const blob = await response.blob();
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              console.log('[AudioUtils] Blob converted to base64 (web), length:', base64.length);
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
      
      // Native implementation using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: 'base64' as any
      });
      
      console.log('[AudioUtils] Audio converted to base64 (native), length:', base64.length);
      return base64;
    } catch (error) {
      console.error('[AudioUtils] Error converting audio to base64:', error);
      throw new Error(`Failed to convert audio to base64: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get recording status for debugging
   */
  static async getRecordingStatus(recording: AudioRecorder): Promise<any> {
    try {
      const status = recording.getStatus();
      console.log('[AudioUtils] Recording status:', status);
      return status;
    } catch (error) {
      console.error('[AudioUtils] Error getting recording status:', error);
      return null;
    }
  }

  /**
   * Validate audio file exists
   */
  static async validateAudioFile(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const exists = fileInfo.exists && fileInfo.size > 0;
      console.log('[AudioUtils] Audio file validation:', { uri, exists, size: 'size' in fileInfo ? fileInfo.size : 'unknown' });
      return exists;
    } catch (error) {
      console.error('[AudioUtils] Error validating audio file:', error);
      return false;
    }
  }

  /**
   * Get audio file size
   */
  static async getAudioFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return 'size' in fileInfo ? fileInfo.size || 0 : 0;
    } catch (error) {
      console.error('[AudioUtils] Error getting audio file size:', error);
      return 0;
    }
  }

  /**
   * Global cleanup - call this when app starts or when switching between recording components
   */
  static async globalCleanup(): Promise<void> {
    try {
      console.log('[AudioUtils] Performing global cleanup...');
      await RecordingManager.cleanupCurrentRecording();
      console.log('[AudioUtils] Global cleanup completed');
    } catch (error) {
      console.error('[AudioUtils] Error during global cleanup:', error);
    }
  }

  /**
   * Get audio duration from file
   */
  static async getAudioDuration(uri: string): Promise<number> {
    try {
      console.log('[AudioUtils] Getting audio duration for:', uri);
      
      // Use createAudioPlayer for SDK 54
      const sound = createAudioPlayer(uri);
      const status = sound.currentStatus;
      
      if (status.isLoaded) {
        const duration = status.duration || 0;
        console.log('[AudioUtils] Audio duration:', duration, 'seconds');
        
        // Remove the sound to free memory
        sound.remove();
        
        return duration;
      }
      
      return 0;
    } catch (error) {
      console.error('[AudioUtils] Error getting audio duration:', error);
      return 0;
    }
  }

  /**
   * Check if audio format is supported
   */
  static isAudioFormatSupported(uri: string): boolean {
    const supportedFormats = ['.m4a', '.mp3', '.wav', '.aac', '.webm'];
    const extension = uri.toLowerCase().split('.').pop();
    return extension ? supportedFormats.includes(`.${extension}`) : false;
  }

  /**
   * Process audio for transcription and summary generation
   */
  static async processAudioForTranscription(
    audioUrl: string,
    userId: string,
    noteId: string,
    onProgress?: (message: string, progress: number) => void,
    audioBlob?: any
  ): Promise<{
    success: boolean;
    transcription?: string;
    summary?: string;
    title?: string;
    keyDetails?: string[];
    error?: string;
  }> {
    try {
      console.log('[AudioUtils] Processing audio for transcription:', audioUrl);
      
      onProgress?.('Converting audio to base64...', 20);
      
      // Get base64 audio data - handle both local files and remote URLs
      const base64Audio = await this.getBase64FromUrl(audioUrl);
      
      // Import the transcription function dynamically to avoid circular dependencies
      const { 
        transcribeAudioWithGemini, 
        generateSummaryWithGemini, 
        extractKeyDetailsWithGemini,
        generateTitleWithGemini 
      } = await import('./GeminiAI');
      
      // Transcribe the audio
      onProgress?.('AI is transcribing your audio...', 40);
      const transcription = await transcribeAudioWithGemini(base64Audio);
      
      // Track AI transcription usage
      try {
        await featureLimitService.recordFeatureUsage(userId, 'ai_transcription', 1, false, 'count');
        console.log('[AudioUtils] AI transcription usage recorded');
      } catch (usageError) {
        console.warn('[AudioUtils] Failed to record AI transcription usage:', usageError);
      }
      
      // Generate title from transcription
      let title: string = '';
      try {
        onProgress?.('AI is generating a title...', 60);
        title = await generateTitleWithGemini(transcription);
        console.log('[AudioUtils] AI title generated successfully:', title);
        
        // Track AI title generation usage
        try {
          await featureLimitService.recordFeatureUsage(userId, 'ai_name_generating', 1, false, 'count');
          console.log('[AudioUtils] AI title generation usage recorded');
        } catch (usageError) {
          console.warn('[AudioUtils] Failed to record AI title generation usage:', usageError);
        }
      } catch (titleError) {
        console.warn('[AudioUtils] Failed to generate title:', titleError);
        // Don't fail the entire process if title generation fails
        title = 'Audio Note'; // Fallback title
      }
      
      // Generate summary from transcription
      onProgress?.('AI is creating a summary...', 80);
      const summary = await generateSummaryWithGemini(transcription);
      
      // Track AI summary usage
      try {
        await featureLimitService.recordFeatureUsage(userId, 'ai_summaries', 1, false, 'count');
        console.log('[AudioUtils] AI summary usage recorded');
      } catch (usageError) {
        console.warn('[AudioUtils] Failed to record AI summary usage:', usageError);
      }
      
      // Generate key details from transcription (with limit check)
      let keyDetails: string[] = [];
      try {
        // Check if user can generate key details
        const canUseKeyDetails = await featureLimitService.canUseFeature(userId, 'ai_key_details', 1, false);
        
        if (canUseKeyDetails.canUse) {
          onProgress?.('AI is extracting key details...', 90);
          keyDetails = await extractKeyDetailsWithGemini(transcription);
          console.log('[AudioUtils] Key details generated successfully');
          
          // Track AI key details usage
          try {
            await featureLimitService.recordFeatureUsage(userId, 'ai_key_details', 1, false, 'count');
            console.log('[AudioUtils] AI key details usage recorded');
          } catch (usageError) {
            console.warn('[AudioUtils] Failed to record AI key details usage:', usageError);
          }
        } else {
          console.log('[AudioUtils] Key details generation blocked:', canUseKeyDetails.reason);
          onProgress?.('Key details limit reached, skipping...', 90);
        }
      } catch (keyDetailsError) {
        console.warn('[AudioUtils] Failed to generate key details:', keyDetailsError);
        // Don't fail the entire process if key details generation fails
      }
      
      console.log('[AudioUtils] Audio processing completed successfully');
      
      return {
        success: true,
        transcription,
        summary,
        title,
        keyDetails,
      };
    } catch (error) {
      console.error('[AudioUtils] Error processing audio for transcription:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Convert audio file to base64 from either local URI or remote URL
   */
  static async getBase64FromUrl(url: string): Promise<string> {
    try {
      console.log('[AudioUtils] Converting audio to base64 from URL:', url);
      
      // Check if it's a remote URL (starts with http/https)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('[AudioUtils] Detected remote URL, fetching audio data...');
        
        // Get Supabase auth token for authenticated requests (for private buckets)
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'Accept': 'audio/*,*/*',
        };
        
        // Add auth header if we have a session (for private buckets)
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('[AudioUtils] Using authenticated request for private bucket');
        } else {
          console.log('[AudioUtils] Using anonymous request (public bucket)');
        }
        
        // Fetch the audio file from the remote URL
        const response = await fetch(url, { headers });
        if (!response.ok) {
          if (response.status === 400) {
            throw new Error(`Access denied to audio file. This may be due to missing RLS policies. Please ensure storage policies are configured in your Supabase dashboard. Status: ${response.status}`);
          } else if (response.status === 404) {
            throw new Error(`Audio file not found. The file may not exist or may have been deleted. Status: ${response.status}`);
          } else {
            throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
          }
        }
        
        // Convert the response to an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert ArrayBuffer to base64
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64 = this.arrayBufferToBase64(uint8Array);
        
        console.log('[AudioUtils] Remote audio converted to base64, length:', base64.length);
        return base64;
      } else {
        // It's a local file, use the existing method
        console.log('[AudioUtils] Detected local file, using FileSystem...');
        return await this.getBase64FromUri(url);
      }
    } catch (error) {
      console.error('[AudioUtils] Error converting audio to base64 from URL:', error);
      throw new Error(`Failed to convert audio to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private static arrayBufferToBase64(uint8Array: Uint8Array): string {
    const bytes = new Uint8Array(uint8Array);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Web-specific duration detection using Web Audio API
   * Fallback for when expo-audio doesn't detect duration
   */
  static async detectWebAudioDuration(uri: string): Promise<number> {
    return new Promise((resolve) => {
      try {
        // Only use Web Audio API on web platform
        if (typeof window === 'undefined' || typeof Audio === 'undefined') {
          console.log('[AudioUtils] Web Audio API not available on this platform');
          resolve(0);
          return;
        }

        console.log('[AudioUtils] Attempting web-specific duration detection for:', uri);
        
        const audio = new (typeof window !== 'undefined' && window.Audio ? window.Audio : globalThis.Audio)();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'metadata';
        
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration;
          console.log('[AudioUtils] Web Audio API detected duration:', duration, 'seconds');
          resolve(duration * 1000); // Convert to milliseconds
        });
        
        audio.addEventListener('error', () => {
          console.warn('[AudioUtils] Web Audio API duration detection failed');
          resolve(0);
        });
        
        // Set a timeout in case the audio doesn't load
        setTimeout(() => {
          console.warn('[AudioUtils] Web Audio API duration detection timed out');
          resolve(0);
        }, 5000);
        
        audio.src = uri;
        audio.load();
        
      } catch (error) {
        console.error('[AudioUtils] Error in web-specific duration detection:', error);
        resolve(0);
      }
    });
  }
}