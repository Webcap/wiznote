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
   * Alias for createSound to maintain compatibility
   */
  static async createSound(uri: string): Promise<{ sound: AudioPlayer }> {
    return this.createSoundObject(uri);
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
      console.log('[AudioUtils Web] Converting to base64 from URI:', uri);
      
      // For web, the URI could be a blob URL or a remote URL
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
        // For remote URLs (Supabase storage), retry with delays
        console.log('[AudioUtils Web] Fetching remote audio file...');
        
        let lastError: Error | null = null;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[AudioUtils Web] Fetch attempt ${attempt}/${maxRetries}...`);
            
            // Get Supabase auth token if available
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            const headers: Record<string, string> = {
              'Accept': 'audio/*,*/*',
            };
            
            // Add auth header if we have a session
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
              console.log('[AudioUtils Web] Using authenticated request');
            } else {
              console.log('[AudioUtils Web] Using anonymous request (public bucket)');
            }
            
            const response = await fetch(uri, {
              method: 'GET',
              headers,
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unable to read error');
              console.error('[AudioUtils Web] Fetch failed:', response.status, response.statusText, errorText);
              throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const blob = await response.blob();
            console.log('[AudioUtils Web] Remote file fetched, size:', blob.size, 'type:', blob.type);
            
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
          } catch (fetchError) {
            lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
            console.warn(`[AudioUtils Web] Fetch attempt ${attempt} failed:`, lastError.message);
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              console.log(`[AudioUtils Web] Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // All retries failed
        throw new Error(`Failed to fetch audio after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[AudioUtils Web] Error converting to base64:', error);
      throw new Error(`Failed to convert audio to base64: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process audio for transcription (web version with full AI processing)
   */
  static async processAudioForTranscription(
    audioUrl: string,
    userId: string,
    noteId: string,
    onProgress?: (message: string, progress: number) => void
  ): Promise<{
    success: boolean;
    transcription?: string;
    summary?: string;
    title?: string;
    keyDetails?: string[];
    error?: string;
  }> {
    try {
      console.log('[AudioUtils Web] Processing audio for transcription:', audioUrl);
      
      onProgress?.('Converting audio to base64...', 20);
      
      // Get base64 audio data
      const base64Audio = await this.getBase64FromUri(audioUrl);
      
      // Import the AI functions
      const { 
        transcribeAudioWithGemini, 
        generateSummaryWithGemini, 
        extractKeyDetailsWithGemini,
        generateTitleWithGemini 
      } = await import('./GeminiAI');
      
      const { featureLimitService } = await import('./FeatureLimitService');
      await featureLimitService.initialize();
      
      // Transcribe the audio
      onProgress?.('AI is transcribing your audio...', 40);
      const transcription = await transcribeAudioWithGemini(base64Audio);
      console.log('[AudioUtils Web] Transcription completed, length:', transcription.length);
      
      // Track AI transcription usage
      try {
        await featureLimitService.recordFeatureUsage(userId, 'ai_transcription', 1, false, 'count');
        console.log('[AudioUtils Web] AI transcription usage recorded');
      } catch (usageError) {
        console.warn('[AudioUtils Web] Failed to record AI transcription usage:', usageError);
      }
      
      // Generate title from transcription
      let title: string = '';
      try {
        onProgress?.('AI is generating a title...', 60);
        title = await generateTitleWithGemini(transcription);
        console.log('[AudioUtils Web] AI title generated successfully:', title);
        
        // Track AI title generation usage
        try {
          await featureLimitService.recordFeatureUsage(userId, 'ai_name_generating', 1, false, 'count');
          console.log('[AudioUtils Web] AI title generation usage recorded');
        } catch (usageError) {
          console.warn('[AudioUtils Web] Failed to record AI title generation usage:', usageError);
        }
      } catch (titleError) {
        console.warn('[AudioUtils Web] Failed to generate title:', titleError);
        title = 'Audio Note'; // Fallback title
      }
      
      // Generate summary from transcription
      onProgress?.('AI is creating a summary...', 80);
      const summary = await generateSummaryWithGemini(transcription);
      console.log('[AudioUtils Web] Summary generated, length:', summary.length);
      
      // Track AI summary usage
      try {
        await featureLimitService.recordFeatureUsage(userId, 'ai_summaries', 1, false, 'count');
        console.log('[AudioUtils Web] AI summary usage recorded');
      } catch (usageError) {
        console.warn('[AudioUtils Web] Failed to record AI summary usage:', usageError);
      }
      
      // Generate key details from transcription
      let keyDetails: string[] = [];
      try {
        const canUseKeyDetails = await featureLimitService.canUseFeature(userId, 'ai_key_details', 1, false);
        
        if (canUseKeyDetails.canUse) {
          onProgress?.('AI is extracting key details...', 90);
          keyDetails = await extractKeyDetailsWithGemini(transcription);
          console.log('[AudioUtils Web] Key details generated successfully');
          
          // Track AI key details usage
          try {
            await featureLimitService.recordFeatureUsage(userId, 'ai_key_details', 1, false, 'count');
            console.log('[AudioUtils Web] AI key details usage recorded');
          } catch (usageError) {
            console.warn('[AudioUtils Web] Failed to record AI key details usage:', usageError);
          }
        } else {
          console.log('[AudioUtils Web] Key details generation blocked:', canUseKeyDetails.reason);
          onProgress?.('Key details limit reached, skipping...', 90);
        }
      } catch (keyDetailsError) {
        console.warn('[AudioUtils Web] Failed to generate key details:', keyDetailsError);
      }
      
      console.log('[AudioUtils Web] Audio processing completed successfully');
      
      return {
        success: true,
        transcription,
        summary,
        title,
        keyDetails,
      };
    } catch (error) {
      console.error('[AudioUtils Web] Error processing audio for transcription:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
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
      const canRecordResult = await featureLimitService.canUseFeature(userId, 'voice_recording', 1, false);
      const usage = await featureLimitService.getUserFeatureUsage(userId, 'voice_recording', false);
      
      return {
        allowed: canRecordResult.canUse,
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

  /**
   * Detect audio duration using HTML5 Audio element (web-specific)
   */
  static async detectWebAudioDuration(uri: string): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(uri);
        
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration;
          console.log('[AudioUtils Web] Detected duration via HTML5 Audio:', duration);
          resolve(isFinite(duration) ? duration : null);
        });
        
        audio.addEventListener('error', (e) => {
          console.error('[AudioUtils Web] Error loading audio for duration detection:', e);
          resolve(null);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          console.warn('[AudioUtils Web] Duration detection timeout');
          resolve(null);
        }, 5000);
        
      } catch (error) {
        console.error('[AudioUtils Web] Error in detectWebAudioDuration:', error);
        resolve(null);
      }
    });
  }
}

