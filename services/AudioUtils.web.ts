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
      
      console.warn('[AudioUtils Web] Could not extract file path from URL:', url);
      return null;
    } catch (error) {
      console.error('[AudioUtils Web] Error extracting file path:', error);
      return null;
    }
  }

  /**
   * Create HTML5 Audio element for web playback with enhanced error handling
   */
  private static createWebAudioHandler(uri: string): Promise<{ sound: any }> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[AudioUtils Web] Creating HTML5 Audio element for:', uri);
        
        const audio = new Audio();
        
        // Enhanced cross-origin handling
        if (uri.includes('supabase.co')) {
          // For Supabase URLs, don't set crossOrigin to avoid CORS issues
          console.log('[AudioUtils Web] Supabase URL detected, skipping crossOrigin');
        } else if (uri.startsWith('blob:')) {
          // For blob URLs, no crossOrigin needed
          console.log('[AudioUtils Web] Blob URL detected, skipping crossOrigin');
        } else {
          // For other remote URLs, set crossOrigin
          audio.crossOrigin = 'anonymous';
          console.log('[AudioUtils Web] Remote URL detected, setting crossOrigin');
        }
        
        // Set preload to auto for better compatibility
        audio.preload = 'auto';
        
        let hasResolved = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        
        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('canplaythrough', onCanPlayThrough);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('loadstart', onLoadStart);
        };
        
        const onLoadedMetadata = () => {
          if (hasResolved) return;
          hasResolved = true;
          console.log('[AudioUtils Web] HTML5 Audio loaded successfully');
          console.log('[AudioUtils Web] Duration:', audio.duration, 'seconds');
          console.log('[AudioUtils Web] Ready state:', audio.readyState);
          
          cleanup();
          resolve({ sound: audio });
        };
        
        const onCanPlay = () => {
          if (hasResolved) return;
          console.log('[AudioUtils Web] Audio can play, ready state:', audio.readyState);
          if (audio.readyState >= 2) {
            onLoadedMetadata();
          }
        };
        
        const onCanPlayThrough = () => {
          if (hasResolved) return;
          console.log('[AudioUtils Web] Audio can play through, ready state:', audio.readyState);
          if (audio.readyState >= 3) {
            onLoadedMetadata();
          }
        };
        
        const onLoadStart = () => {
          console.log('[AudioUtils Web] Audio loading started');
        };
        
        const onError = (event: Event | string) => {
          if (hasResolved) return;
          hasResolved = true;
          
          cleanup();
          
          const errorDetails = audio.error;
          let errorMessage = 'Failed to load audio';
          let errorCode = 'UNKNOWN_ERROR';
          
          if (errorDetails) {
            switch (errorDetails.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio loading was aborted';
                errorCode = 'ABORTED';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error while loading audio - check your internet connection';
                errorCode = 'NETWORK_ERROR';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio decoding error - the file format may not be supported';
                errorCode = 'DECODE_ERROR';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio source not supported - file may be inaccessible or corrupted';
                errorCode = 'SRC_NOT_SUPPORTED';
                break;
              default:
                errorMessage = errorDetails.message || 'Unknown audio error';
                errorCode = 'UNKNOWN_ERROR';
            }
          } else if (typeof event === 'string') {
            errorMessage = event;
            errorCode = 'TIMEOUT';
          }
          
          console.error('[AudioUtils Web] HTML5 Audio error:', {
            message: errorMessage,
            code: errorCode,
            details: errorDetails,
            uri: uri,
            readyState: audio.readyState,
            networkState: audio.networkState
          });
          
          reject(new Error(`${errorMessage} (${errorCode})`));
        };
        
        // Add multiple event listeners for better compatibility
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('canplaythrough', onCanPlayThrough);
        audio.addEventListener('error', onError);
        audio.addEventListener('loadstart', onLoadStart);
        
        // Increased timeout to 15 seconds for better reliability
        timeoutId = setTimeout(() => {
          if (!hasResolved) {
            console.error('[AudioUtils Web] Audio loading timeout after 15 seconds');
            onError('Audio loading timeout - the file may be too large or the connection too slow');
          }
        }, 15000);
        
        // Set source and load
        console.log('[AudioUtils Web] Setting audio source:', uri);
        audio.src = uri;
        audio.load();
        
      } catch (error) {
        console.error('[AudioUtils Web] Error creating HTML5 Audio:', error);
        reject(new Error(`Failed to create audio element: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Create sound object for playback (web version)
   * Alias for createSound to maintain compatibility
   */
  static async createSound(uri: string): Promise<{ sound: AudioPlayer | any }> {
    return this.createSoundObject(uri);
  }

  /**
   * Create sound object for playback (web version) with fresh signed URLs
   */
  static async createSoundObject(uri: string): Promise<{ sound: AudioPlayer | any }> {
    try {
      console.log('[AudioUtils Web] Creating sound object for URI:', uri);
      
      let finalUri = uri;
      
      // If it's a Supabase URL, get a fresh signed URL with retry logic
      if (uri.includes('supabase.co')) {
        try {
          console.log('[AudioUtils Web] Generating fresh signed URL for playback...');
          
          const { supabase } = await import('../lib/supabase');
          
          // Extract the file path from the URL
          const filePath = this.extractSupabaseFilePath(uri);
          
          if (!filePath) {
            throw new Error('Could not extract file path from Supabase URL');
          }
          
          console.log('[AudioUtils Web] Extracted file path:', filePath);
          
          // Retry logic for signed URL generation
          let signedUrlData: any = null;
          let signedUrlError: any = null;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[AudioUtils Web] Signed URL attempt ${attempt}/${maxRetries}`);
            
            const result = await supabase.storage
              .from('audio-files')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            signedUrlData = result.data;
            signedUrlError = result.error;
            
            if (!signedUrlError && signedUrlData?.signedUrl) {
              console.log(`[AudioUtils Web] Got fresh signed URL on attempt ${attempt}`);
              break;
            } else {
              console.warn(`[AudioUtils Web] Signed URL attempt ${attempt} failed:`, signedUrlError);
              if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              }
            }
          }
          
          if (signedUrlError) {
            console.error('[AudioUtils Web] All signed URL attempts failed:', signedUrlError);
            console.warn('[AudioUtils Web] Falling back to original URI for playback');
            // Don't throw error, try with original URI
            finalUri = uri;
          } else if (signedUrlData?.signedUrl) {
            console.log('[AudioUtils Web] Using fresh signed URL for playback');
            finalUri = signedUrlData.signedUrl;
          } else {
            console.warn('[AudioUtils Web] No signed URL received, using original URI');
            finalUri = uri;
          }
          
        } catch (error) {
          console.error('[AudioUtils Web] Error handling Supabase URL:', error);
          console.warn('[AudioUtils Web] Continuing with original URI despite error');
          finalUri = uri;
        }
      }
      
      // Use HTML5 Audio for web playback (better compatibility with Supabase signed URLs)
      console.log('[AudioUtils Web] Using HTML5 Audio for web playback');
      return await this.createWebAudioHandler(finalUri);
      
    } catch (error) {
      console.error('[AudioUtils Web] Error creating sound object:', error);
      throw new Error(`Failed to create sound object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert audio blob to base64 (web-specific)
   */
  static async getBase64FromUri(uri: string, blob?: Blob): Promise<string> {
    try {
      console.log('[AudioUtils Web] Converting to base64 from URI:', uri);
      console.log('[AudioUtils Web] Has blob?', !!blob);
      
      // If blob is provided directly, use it (most reliable for fresh recordings)
      if (blob) {
        console.log('[AudioUtils Web] Using provided blob, size:', blob.size, 'type:', blob.type);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            console.log('[AudioUtils Web] Blob converted to base64, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = (error) => {
            console.error('[AudioUtils Web] FileReader error:', error);
            reject(error);
          };
          reader.readAsDataURL(blob);
        });
      }
      
      // For web, the URI could be a blob URL or a remote URL
      if (uri.startsWith('blob:')) {
        console.log('[AudioUtils Web] Fetching from blob URL...');
        try {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
          }
          const fetchedBlob = await response.blob();
          console.log('[AudioUtils Web] Blob fetched from URL, size:', fetchedBlob.size);
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              console.log('[AudioUtils Web] Blob URL converted to base64, length:', base64.length);
              resolve(base64);
            };
            reader.onerror = (error) => {
              console.error('[AudioUtils Web] FileReader error:', error);
              reject(error);
            };
            reader.readAsDataURL(fetchedBlob);
          });
        } catch (blobError) {
          console.error('[AudioUtils Web] Error fetching blob URL:', blobError);
          throw new Error(`Blob URL no longer accessible. Recording may have been cleared. ${blobError instanceof Error ? blobError.message : ''}`);
        }
      } else {
        // For remote URLs (Supabase storage), get fresh signed URL and fetch
        console.log('[AudioUtils Web] Processing remote audio URL...');
        
        // If it's a Supabase URL, get a fresh signed URL
        if (uri.includes('supabase.co')) {
          try {
            console.log('[AudioUtils Web] Getting fresh signed URL for download...');
            
            const { supabase } = await import('../lib/supabase');
            
            // Extract the file path from the URL
            const filePath = this.extractSupabaseFilePath(uri);
            
            if (!filePath) {
              throw new Error('Could not extract file path from Supabase URL');
            }
            
            console.log('[AudioUtils Web] Extracted file path:', filePath);
            
            // Get a fresh signed URL with 1 hour expiry
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('audio-files')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (signedUrlError) {
              console.error('[AudioUtils Web] Error getting signed URL:', signedUrlError);
              throw new Error(`Failed to get signed URL: ${signedUrlError.message}`);
            }
            
            if (!signedUrlData?.signedUrl) {
              throw new Error('No signed URL received from Supabase');
            }
            
            console.log('[AudioUtils Web] Got fresh signed URL for download');
            uri = signedUrlData.signedUrl; // Use the fresh signed URL
          } catch (supabaseError) {
            console.error('[AudioUtils Web] Error handling Supabase URL:', supabaseError);
            throw new Error(`Failed to process Supabase URL: ${supabaseError instanceof Error ? supabaseError.message : String(supabaseError)}`);
          }
        }
        
        // Fetch remote URL with retries
        let lastError: Error | null = null;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[AudioUtils Web] Fetch attempt ${attempt}/${maxRetries}...`);
            
            const response = await fetch(uri, {
              method: 'GET',
              headers: {
                'Accept': 'audio/*,*/*',
              },
              // Include credentials for CORS if needed
              credentials: 'omit',
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unable to read error');
              console.error('[AudioUtils Web] Fetch failed:', response.status, response.statusText, errorText);
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const fetchedBlob = await response.blob();
            console.log('[AudioUtils Web] Remote file fetched, size:', fetchedBlob.size, 'type:', fetchedBlob.type);
            
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                console.log('[AudioUtils Web] File converted to base64, length:', base64.length);
                resolve(base64);
              };
              reader.onerror = (error) => {
                console.error('[AudioUtils Web] FileReader error:', error);
                reject(error);
              };
              reader.readAsDataURL(fetchedBlob);
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
    onProgress?: (message: string, progress: number) => void,
    audioBlob?: Blob
  ): Promise<{
    success: boolean;
    transcription?: string;
    summary?: string;
    title?: string;
    keyDetails?: string[];
    error?: string;
  }> {
    console.log('[AudioUtils Web] ===== PROCESSING AUDIO FOR TRANSCRIPTION STARTED =====');
    console.log('[AudioUtils Web] Input parameters:', {
      audioUrl,
      userId,
      noteId,
      hasBlob: !!audioBlob,
      blobSize: audioBlob?.size,
      blobType: audioBlob?.type,
      hasProgressCallback: !!onProgress
    });
    
    try {
      console.log('[AudioUtils Web] Processing audio for transcription:', audioUrl);
      console.log('[AudioUtils Web] Has blob?', !!audioBlob);
      
      onProgress?.('Converting audio to base64...', 20);
      
      // Get base64 audio data (pass blob if available for better reliability)
      const base64Audio = await this.getBase64FromUri(audioUrl, audioBlob);
      
      // Import the AI functions
      const { 
        transcribeAudioWithGemini, 
        generateSummaryWithGemini, 
        extractKeyDetailsWithGemini,
        generateTitleWithGemini 
      } = await import('./GeminiAI');
      
      const { featureLimitService } = await import('./FeatureLimitService');
      await featureLimitService.initialize();
      
      // Initialize feature flag service to ensure flags are loaded
      const { featureFlagService } = await import('./FeatureFlagService');
      // Check if user is authenticated (feature flags might need user context)
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AudioUtils Web] Initializing feature flag service, user authenticated:', !!session?.user);
      if (session?.user) {
        await featureFlagService.initialize(true);
      } else {
        await featureFlagService.initialize(false);
      }
      
      // Load user profile for feature flag check - prioritize BetterAuthService, then Supabase
      let userForFeatureFlag: any = undefined;
      if (userId) {
        try {
          // Try BetterAuthService first (has cached role and premium)
          const { betterAuthService } = await import('./BetterAuthService');
          const currentUser = await betterAuthService.getCurrentUser();
          
          if (currentUser && currentUser.id && currentUser.id === userId) {
            console.log('[AudioUtils Web] Loaded user from BetterAuthService for feature flag check:', {
              id: currentUser.id,
              role: currentUser.role,
              premiumActive: currentUser.premium?.isActive,
            });
            userForFeatureFlag = {
              id: currentUser.id,
              role: currentUser.role || 'user',
              premium: currentUser.premium || {},
            };
          } else {
            // Fallback to Supabase user profile
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('id, role, premium')
              .eq('id', userId)
              .maybeSingle();
            
            if (userProfile) {
              // Handle case where .maybeSingle() might return an array
              const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;
              if (profile && profile.id) {
                userForFeatureFlag = {
                  id: profile.id,
                  role: profile.role || 'user',
                  premium: profile.premium || {},
                };
                console.log('[AudioUtils Web] Loaded user profile from Supabase for feature flag check:', {
                  id: userForFeatureFlag.id,
                  role: userForFeatureFlag.role,
                  premiumActive: userForFeatureFlag.premium?.isActive,
                });
              }
            }
          }
        } catch (profileError) {
          console.warn('[AudioUtils Web] Failed to load user profile for feature flag check:', profileError);
        }
      }
      
      // Check feature flag status before attempting transcription
      const isTranscriptionEnabled = featureFlagService.isFeatureEnabled('ai_transcription', userForFeatureFlag);
      console.log('[AudioUtils Web] AI transcription feature flag enabled:', isTranscriptionEnabled, 'for user:', userId);
      
      // Transcribe the audio (GeminiAI will check feature flags internally)
      let transcription: string = '';
      try {
        onProgress?.('AI is transcribing your audio...', 40);
        console.log('[AudioUtils Web] Calling transcribeAudioWithGemini with base64 length:', base64Audio.length);
        // Pass user object to transcribeAudioWithGemini for proper feature flag check
        transcription = await transcribeAudioWithGemini(base64Audio, userForFeatureFlag);
        console.log('[AudioUtils Web] Transcription completed, length:', transcription.length);
        
        // Track AI transcription usage
        try {
          await featureLimitService.recordFeatureUsage(userId, 'ai_transcription', 1, false, 'count');
          console.log('[AudioUtils Web] AI transcription usage recorded');
        } catch (usageError) {
          console.warn('[AudioUtils Web] Failed to record AI transcription usage:', usageError);
        }
      } catch (transcriptionError) {
        console.error('[AudioUtils Web] Error processing audio for transcription:', transcriptionError);
        // If transcription fails (e.g., feature disabled), continue without transcription
        // This allows the note to be created even if AI features aren't available
        const errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Failed to transcribe audio';
        
        // Check if it's a feature disabled error - if so, return success but without transcription
        if (errorMessage.includes('currently disabled')) {
          console.warn('[AudioUtils Web] AI transcription is disabled, continuing without transcription');
          return {
            success: true, // Return success so note updates can continue
            transcription: undefined,
            summary: undefined,
            title: undefined,
            keyDetails: undefined,
            error: errorMessage,
          };
        }
        
        // For other errors, also return success but without transcription
        // This ensures the note is created even if transcription fails
        return {
          success: true,
          transcription: undefined,
          summary: undefined,
          title: undefined,
          keyDetails: undefined,
          error: errorMessage,
        };
      }
      
      // Generate title from transcription
      let title: string = '';
      try {
        onProgress?.('AI is generating a title...', 60);
        // Pass user object for proper feature flag check
        title = await generateTitleWithGemini(transcription, userForFeatureFlag);
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
      let summary: string = '';
      try {
        onProgress?.('AI is creating a summary...', 80);
        // Pass user object for proper feature flag check
        summary = await generateSummaryWithGemini(transcription, userForFeatureFlag);
        console.log('[AudioUtils Web] Summary generated, length:', summary.length);
        
        // Track AI summary usage
        try {
          await featureLimitService.recordFeatureUsage(userId, 'ai_summaries', 1, false, 'count');
          console.log('[AudioUtils Web] AI summary usage recorded');
        } catch (usageError) {
          console.warn('[AudioUtils Web] Failed to record AI summary usage:', usageError);
        }
      } catch (summaryError) {
        console.warn('[AudioUtils Web] Failed to generate summary:', summaryError);
        summary = ''; // Continue without summary
      }
      
      // Generate key details from transcription
      let keyDetails: string[] = [];
      try {
        const canUseKeyDetails = await featureLimitService.canUseFeature(userId, 'ai_key_details', 1, false);
        
        if (canUseKeyDetails.canUse) {
          onProgress?.('AI is extracting key details...', 90);
          // Pass user object for proper feature flag check
          keyDetails = await extractKeyDetailsWithGemini(transcription, userForFeatureFlag);
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
      
      console.log('[AudioUtils Web] ===== AUDIO PROCESSING COMPLETED SUCCESSFULLY =====');
      console.log('[AudioUtils Web] Results:', {
        hasTranscription: !!transcription,
        transcriptionLength: transcription?.length,
        hasTitle: !!title,
        hasSummary: !!summary,
        summaryLength: summary?.length,
        hasKeyDetails: !!keyDetails?.length,
        keyDetailsCount: keyDetails?.length
      });
      
      return {
        success: true,
        transcription,
        summary,
        title,
        keyDetails,
      };
    } catch (error) {
      console.error('[AudioUtils Web] ===== ERROR PROCESSING AUDIO =====');
      console.error('[AudioUtils Web] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
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

