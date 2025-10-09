import { featureLimitService } from './FeatureLimitService';

// Import expo-audio for web
import {
    createAudioPlayer,
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    type AudioPlayer,
} from 'expo-audio';

console.log('[AudioUtils Web] Web-specific audio utilities loaded');

/**
 * Web-specific AudioUtils service
 * Uses browser APIs for file handling
 */
export class AudioUtils {
  
  /**
   * Initialize audio session (web version)
   */
  static async initializeAudio(): Promise<void> {
    try {
      console.log('[AudioUtils Web] Initializing audio session for web...');
      
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
      
      console.log('[AudioUtils Web] Audio session initialized successfully');
    } catch (error) {
      console.log('[AudioUtils Web] setAudioModeAsync not needed on web, continuing...');
    }
  }

  /**
   * Check microphone permissions (web version)
   */
  static async checkPermissions(): Promise<{ status: string; canRequest: boolean }> {
    try {
      console.log('[AudioUtils Web] Checking microphone permissions...');
      
      // On web, permissions are granted per-request
      // We can always request
      return {
        status: 'undetermined',
        canRequest: true
      };
    } catch (error) {
      console.error('[AudioUtils Web] Error checking permissions:', error);
      return {
        status: 'denied',
        canRequest: false
      };
    }
  }

  /**
   * Request microphone permissions (web version)
   */
  static async requestPermissions(): Promise<{ status: string }> {
    try {
      console.log('[AudioUtils Web] Requesting microphone permissions...');
      
      // On web, this happens automatically when getUserMedia is called
      return { status: 'granted' };
    } catch (error) {
      console.error('[AudioUtils Web] Error requesting permissions:', error);
      return { status: 'denied' };
    }
  }

  /**
   * Create sound object for playback (web version)
   */
  static async createSoundObject(uri: string): Promise<{ sound: AudioPlayer }> {
    try {
      console.log('[AudioUtils Web] Creating sound object for URI:', uri);
      
      const sound = createAudioPlayer(uri);
      console.log('[AudioUtils Web] Sound object created successfully');
      
      return { sound };
    } catch (error) {
      console.error('[AudioUtils Web] Error creating sound object:', error);
      throw new Error(`Failed to create sound object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert audio blob to base64 (web-specific)
   */
  static async getBase64FromUri(uri: string): Promise<string> {
    try {
      console.log('[AudioUtils Web] Converting blob to base64...');
      
      // For web, the URI is a blob URL
      if (uri.startsWith('blob:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            console.log('[AudioUtils Web] Blob converted to base64, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For regular URLs
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            console.log('[AudioUtils Web] File converted to base64, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('[AudioUtils Web] Error converting to base64:', error);
      throw new Error(`Failed to convert audio to base64: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process audio for transcription (web version)
   */
  static async processAudioForTranscription(uri: string): Promise<{
    base64: string;
    mimeType: string;
  }> {
    try {
      console.log('[AudioUtils Web] Processing audio for transcription:', uri);
      
      const base64 = await this.getBase64FromUri(uri);
      const mimeType = 'audio/webm'; // Default for web recordings
      
      console.log('[AudioUtils Web] Audio processed for transcription');
      return {
        base64,
        mimeType
      };
    } catch (error) {
      console.error('[AudioUtils Web] Error processing audio for transcription:', error);
      throw error;
    }
  }

  /**
   * Global cleanup (web version)
   */
  static async globalCleanup(): Promise<void> {
    console.log('[AudioUtils Web] Global cleanup (web - no-op)');
    // Web doesn't need special cleanup
  }

  /**
   * Check if recording limit reached (web version)
   */
  static async checkRecordingLimit(userId: string): Promise<{
    allowed: boolean;
    currentCount?: number;
    limit?: number | 'unlimited';
  }> {
    try {
      const canRecord = await featureLimitService.checkFeatureLimit('voice_recording', userId);
      const usage = await featureLimitService.getFeatureUsage('voice_recording', userId);
      
      return {
        allowed: canRecord,
        currentCount: usage?.currentPeriod?.usage || 0,
        limit: usage?.currentPeriod?.limit || 'unlimited'
      };
    } catch (error) {
      console.error('[AudioUtils Web] Error checking recording limit:', error);
      return { allowed: true };
    }
  }

  /**
   * Validate audio file (web version)
   */
  static async validateAudioFile(uri: string): Promise<boolean> {
    try {
      if (uri.startsWith('blob:')) {
        const response = await fetch(uri);
        return response.ok;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get audio file size (web version)
   */
  static async getFileSize(uri: string): Promise<number | null> {
    try {
      if (uri.startsWith('blob:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size;
      }
      return null;
    } catch (error) {
      console.error('[AudioUtils Web] Error getting file size:', error);
      return null;
    }
  }
}

