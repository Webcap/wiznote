import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { AudioFile } from '../types/Note';

import { systemSettingsService } from './SystemSettingsService';

export class AudioStorage {
  private bucketName = 'audio-files';

  // Check if the storage bucket exists (bucket creation is handled by database migration)
  private async checkBucketExists(): Promise<boolean> {
    try {
      // First try to list buckets
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        console.warn('AudioStorage: Error listing buckets:', error);
        // If listing fails, try direct access
        return await this.checkBucketDirectAccess();
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      if (bucketExists) {
        console.log('AudioStorage: audio-files bucket found in list');
        return true;
      }
      
      // If not found in list, try direct access (bucket might exist but not be listable)
      console.log('AudioStorage: audio-files bucket not found in list, trying direct access...');
      return await this.checkBucketDirectAccess();
      
    } catch (error) {
      console.error('AudioStorage: Error checking bucket exists:', error);
      return await this.checkBucketDirectAccess();
    }
  }

  // Try to access the bucket directly
  private async checkBucketDirectAccess(): Promise<boolean> {
    try {
      // Try to list files in the bucket (this will fail if bucket doesn't exist)
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });
      
      if (error) {
        if (error.message?.includes('Bucket not found')) {
          console.warn('AudioStorage: audio-files bucket does not exist. Please run the database migration.');
          return false;
        } else if (error.message?.includes('row-level security policy')) {
          // Bucket exists but RLS policies are blocking access
          console.log('AudioStorage: audio-files bucket exists but RLS policies need to be configured');
          return true; // Bucket exists, just needs policies
        } else {
          console.warn('AudioStorage: Error accessing bucket:', error);
          return false;
        }
      }
      
      console.log('AudioStorage: audio-files bucket accessible');
      return true;
    } catch (error) {
      console.error('AudioStorage: Error in direct bucket access:', error);
      return false;
    }
  }

  // Upload audio file to Supabase Storage
  async uploadAudioFile(audioUri: string, userId: string, noteId: string, audioBlob?: Blob): Promise<string> {
    // Check if Sunset Mode is enabled
    const settings = systemSettingsService.getSettingsSync();
    if (settings?.sunsetModeEnabled) {
      throw new Error('New uploads are disabled as the platform is being decommissioned. You can still export your existing data from Settings.');
    }

    try {
      console.log('AudioStorage: Uploading audio file:', audioUri);
      console.log('AudioStorage: Has blob?', !!audioBlob);
      
      // Validate input parameters
      if (!audioUri && !audioBlob) {
        throw new Error('Audio URI or Blob is required for upload');
      }
      if (!userId) {
        throw new Error('User ID is required for upload');
      }
      if (!noteId) {
        throw new Error('Note ID is required for upload');
      }
      
      // Check if bucket exists
      const bucketExists = await this.checkBucketExists();
      if (!bucketExists) {
        throw new Error('Audio storage bucket not configured. Please contact support.');
      }

      // Generate unique filename
      const timestamp = Date.now();
      let fileExtension = 'webm'; // Default extension for web
      let contentType = 'audio/webm'; // Default for web

      let fileBody: Blob | Uint8Array;

      if (Platform.OS === 'web') {
        // For web, prefer the blob if provided (more reliable than fetching blob URL)
        let blob: Blob;
        
        if (audioBlob) {
          console.log('AudioStorage: Using provided blob');
          blob = audioBlob;
        } else if (audioUri) {
          console.log('AudioStorage: Fetching from blob URL (fallback)');
        const response = await fetch(audioUri);
          blob = await response.blob();
        } else {
          throw new Error('No audio data available for upload');
        }
        
        // Get the actual mime type from the blob
        const originalContentType = blob.type || 'audio/webm';
        console.log('AudioStorage: Original blob mime type:', originalContentType, 'size:', blob.size, 'bytes');
        
        // Convert webm to a more universally supported format
        // Create a new blob with a different MIME type to force Supabase to accept it
        if (originalContentType.includes('webm')) {
          // Create a new blob with audio/mpeg MIME type (most universally supported)
          blob = new Blob([blob], { type: 'audio/mpeg' });
          fileExtension = 'mp3';
          contentType = 'audio/mpeg';
          console.log('AudioStorage: Converted webm blob to MP3 format for compatibility');
        } else if (originalContentType.includes('ogg')) {
          fileExtension = 'ogg';
          contentType = 'audio/ogg';
        } else if (originalContentType.includes('mp4') || originalContentType.includes('m4a')) {
          fileExtension = 'mp4';
          contentType = 'audio/mp4';
        } else if (originalContentType.includes('mpeg') || originalContentType.includes('mp3')) {
          fileExtension = 'mp3';
          contentType = 'audio/mpeg';
        } else {
          console.warn('AudioStorage: Unknown mime type, converting to MP3:', originalContentType);
          blob = new Blob([blob], { type: 'audio/mpeg' });
          fileExtension = 'mp3';
          contentType = 'audio/mpeg';
        }
        
        console.log('AudioStorage: Final file extension:', fileExtension, 'Content type:', contentType);
        
        // Use the converted blob
        fileBody = blob;
        console.log('AudioStorage: Prepared Blob for upload, size:', blob.size, 'bytes');
      } else {
        // For native platforms, use FileSystem
        fileExtension = audioUri.split('.').pop() || 'm4a';
        console.log('AudioStorage: Reading file from URI for native platform:', audioUri);
        
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          throw new Error(`Audio file not found at: ${audioUri}`);
        }
        console.log('AudioStorage: File exists, size:', fileInfo.size, 'bytes');
        
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64' as any,
        });
        console.log('AudioStorage: File read as base64, length:', base64Audio.length);
        
        const audioData = this.base64ToUint8Array(base64Audio);
        fileBody = audioData;
        contentType = `audio/${fileExtension}`;
        console.log('AudioStorage: Converted to Uint8Array, length:', audioData.length);
      }

      const fileName = `${userId}/${noteId}/audio_${timestamp}.${fileExtension}`;

      // Use the content type as-is since we've normalized it
      const normalizedContentType = contentType;
      console.log('AudioStorage: Using content type:', normalizedContentType);

      // Prepare upload options
      const uploadOptions: any = { 
        upsert: false,
        contentType: normalizedContentType
      };

      // Try manual upload first for better control over headers
      let uploadSuccess = false;
      let data: any = null;
      let error: any = null;

      if (Platform.OS === 'web' && fileBody instanceof Blob) {
        try {
          console.log('AudioStorage: Attempting manual upload with explicit headers');
          
          // Get signed upload URL
          const { data: signedUpload, error: signedErr } = await supabase.storage
        .from(this.bucketName)
            .createSignedUploadUrl(fileName);
          
          if (!signedErr && signedUpload?.token) {
            // Manual PUT request with explicit Content-Type
            const signedUrl = (signedUpload as any).signedUrl || `https://kmzubtegijexwguadyfw.supabase.co/storage/v1/object/upload/sign/${this.bucketName}/${fileName}?token=${signedUpload.token}`;
            const response = await fetch(signedUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': normalizedContentType,
                'Content-Length': fileBody.size.toString(),
              },
              body: fileBody,
            });

            if (response.ok) {
              console.log('AudioStorage: Manual upload succeeded');
              uploadSuccess = true;
              data = { path: fileName };
            } else {
              const errorText = await response.text();
              console.warn('AudioStorage: Manual upload failed:', response.status, errorText);
              error = new Error(`Manual upload failed: ${response.status} ${errorText}`);
            }
          } else {
            console.warn('AudioStorage: Failed to create signed upload URL', signedErr);
            error = signedErr;
          }
        } catch (manualError) {
          console.warn('AudioStorage: Manual upload error:', manualError);
          error = manualError;
        }
      }

      // Fallback to Supabase client upload
      if (!uploadSuccess) {
        console.log('AudioStorage: Trying Supabase client upload as fallback');
        
        // For native platforms, add retry logic for network issues
        let retryCount = 0;
        const maxRetries = 3;
        
        console.log('AudioStorage: Starting upload with options:', uploadOptions);
        console.log('AudioStorage: File body type:', typeof fileBody, 'size:', fileBody instanceof Uint8Array ? fileBody.length : 'unknown');
        console.log('AudioStorage: Platform:', Platform.OS, 'Version:', Platform.Version);
        console.log('AudioStorage: Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('AudioStorage: Supabase Key present:', !!(process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY));
        
        // Check authentication status
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log('AudioStorage: Current session:', session ? 'Present' : 'None');
          console.log('AudioStorage: Session user:', session?.user?.id || 'None');
          if (sessionError) {
            console.warn('AudioStorage: Session error:', sessionError);
          }
        } catch (authError) {
          console.warn('AudioStorage: Auth check failed:', authError);
        }
        
        // Test basic network connectivity first (Android-compatible timeout)
        try {
          console.log('AudioStorage: Testing network connectivity...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const testResponse = await fetch('https://httpbin.org/get', {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log('AudioStorage: Network test result:', testResponse.ok ? 'SUCCESS' : 'FAILED');
        } catch (networkError) {
          console.warn('AudioStorage: Network connectivity test failed:', networkError);
        }
        
        // Test Supabase connectivity specifically (Android-compatible timeout)
        try {
          console.log('AudioStorage: Testing Supabase connectivity...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const supabaseTestUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`;
          const supabaseResponse = await fetch(supabaseTestUrl, {
            method: 'GET',
            headers: {
              'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log('AudioStorage: Supabase test result:', supabaseResponse.status, supabaseResponse.statusText);
        } catch (supabaseError) {
          console.warn('AudioStorage: Supabase connectivity test failed:', supabaseError);
        }
        
        // Test Supabase Storage endpoint specifically
        try {
          console.log('AudioStorage: Testing Supabase Storage endpoint...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const storageTestUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/bucket`;
          const storageResponse = await fetch(storageTestUrl, {
            method: 'GET',
            headers: {
              'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log('AudioStorage: Storage endpoint test result:', storageResponse.status, storageResponse.statusText);
        } catch (storageError) {
          console.warn('AudioStorage: Storage endpoint test failed:', storageError);
        }
        
        // Test authenticated storage access
        try {
          console.log('AudioStorage: Testing authenticated storage access...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const authStorageUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/bucket`;
            const authStorageResponse = await fetch(authStorageUrl, {
              method: 'GET',
              headers: {
                'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${session.access_token}`,
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            console.log('AudioStorage: Authenticated storage test result:', authStorageResponse.status, authStorageResponse.statusText);
          } else {
            console.log('AudioStorage: No access token available for authenticated test');
          }
        } catch (authStorageError) {
          console.warn('AudioStorage: Authenticated storage test failed:', authStorageError);
        }
        
        // Try manual authenticated upload first (since we know authentication works)
        // Only on web platform where Blobs work properly
        if (Platform.OS === 'web') {
          try {
            console.log('AudioStorage: Attempting manual authenticated upload...');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token && fileBody instanceof Blob) {
              const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${this.bucketName}/${fileName}`;
              
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for upload
              
              const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                  'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': normalizedContentType,
                  'Content-Length': fileBody.size.toString(),
                },
                body: fileBody,
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              if (uploadResponse.ok) {
                console.log('AudioStorage: Manual authenticated upload succeeded!');
                data = { path: fileName };
                error = null;
                uploadSuccess = true;
              } else {
                const errorText = await uploadResponse.text();
                console.warn('AudioStorage: Manual upload failed:', uploadResponse.status, errorText);
                error = new Error(`Manual upload failed: ${uploadResponse.status} ${errorText}`);
              }
            } else {
              console.log('AudioStorage: Skipping manual upload (not web or no blob)');
            }
          } catch (manualError) {
            console.warn('AudioStorage: Manual upload error:', manualError);
            error = manualError;
          }
        } else {
          console.log('AudioStorage: Skipping manual upload on native platform, using Supabase client');
        }
        
        // Fallback to Supabase client upload if manual upload failed
        if (!uploadSuccess) {
          console.log('AudioStorage: Manual upload failed, trying Supabase client...');
          
          // For native platforms, try manual fetch upload first (more reliable than Supabase client)
          // Note: Supabase Storage API expects raw binary data in the body, not FormData
          if (Platform.OS !== 'web' && fileBody instanceof Uint8Array) {
            try {
              console.log('AudioStorage: Attempting manual fetch upload for native platform...');
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.access_token) {
                const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${this.bucketName}/${fileName}`;
                
                console.log('AudioStorage: Uploading via fetch to:', uploadUrl);
                console.log('AudioStorage: File size:', fileBody.length, 'bytes');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for upload
                
                // Send Uint8Array directly in the body (React Native fetch supports this)
                const uploadResponse = await fetch(uploadUrl, {
                  method: 'POST',
                  headers: {
                    'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': normalizedContentType,
                    'Content-Length': fileBody.length.toString(),
                  },
                  body: fileBody, // React Native fetch can handle Uint8Array directly
                  signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                
                if (uploadResponse.ok) {
                  console.log('AudioStorage: Manual fetch upload succeeded!');
                  data = { path: fileName };
                  error = null;
                  uploadSuccess = true;
                } else {
                  const errorText = await uploadResponse.text();
                  console.warn('AudioStorage: Manual fetch upload failed:', uploadResponse.status, errorText);
                  error = new Error(`Manual fetch upload failed: ${uploadResponse.status} ${errorText}`);
                }
              } else {
                console.log('AudioStorage: No access token for manual fetch upload');
              }
            } catch (manualFetchError) {
              console.warn('AudioStorage: Manual fetch upload error:', manualFetchError);
              error = manualFetchError;
            }
          }
          
          // Fallback to Supabase client if manual fetch didn't work
          if (!uploadSuccess) {
            console.log('AudioStorage: Trying Supabase client upload...');
            
            while (retryCount < maxRetries) {
              try {
                console.log(`AudioStorage: Upload attempt ${retryCount + 1}/${maxRetries}`);
                console.log(`AudioStorage: Uploading to bucket: ${this.bucketName}, file: ${fileName}`);
                console.log(`AudioStorage: File body type: ${fileBody instanceof Uint8Array ? 'Uint8Array' : fileBody instanceof Blob ? 'Blob' : typeof fileBody}, size: ${fileBody instanceof Uint8Array ? fileBody.length : fileBody instanceof Blob ? fileBody.size : 'unknown'}`);
                
                // Pass fileBody directly - Supabase storage accepts Uint8Array on native (same as PDFStorage)
                const uploadResult = await supabase.storage
                  .from(this.bucketName)
                  .upload(fileName, fileBody as any, uploadOptions);
                
                if (!uploadResult.error) {
                  console.log(`AudioStorage: Upload succeeded on attempt ${retryCount + 1}`);
                  data = uploadResult.data;
                  error = null;
                  break;
                } else {
                  console.warn(`AudioStorage: Upload attempt ${retryCount + 1} failed:`, uploadResult.error);
                  console.warn(`AudioStorage: Error message: ${uploadResult.error.message}`);
                  console.warn(`AudioStorage: Error status code: ${uploadResult.error.statusCode || 'none'}`);
                  error = uploadResult.error;
                  
                  // If it's a network error, retry
                  if (uploadResult.error.message?.includes('Network request failed') || 
                      uploadResult.error.message?.includes('network') ||
                      uploadResult.error.message?.includes('timeout') ||
                      uploadResult.error.message?.includes('NetworkError')) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                      console.log(`AudioStorage: Network error detected, retrying upload in ${retryCount * 1000}ms...`);
                      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                      continue;
                    }
                  }
                  break;
                }
              } catch (uploadError) {
                console.warn(`AudioStorage: Upload attempt ${retryCount + 1} threw error:`, uploadError);
                console.warn(`AudioStorage: Error type: ${uploadError instanceof Error ? uploadError.name : typeof uploadError}`);
                console.warn(`AudioStorage: Error message: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
                error = uploadError;
                
                // If it's a network error, retry
                if (uploadError instanceof Error && (
                  uploadError.message?.includes('Network request failed') || 
                  uploadError.message?.includes('network') ||
                  uploadError.message?.includes('timeout') ||
                  uploadError.message?.includes('NetworkError') ||
                  uploadError.name === 'NetworkError'
                )) {
                  retryCount++;
                  if (retryCount < maxRetries) {
                    console.log(`AudioStorage: Network error detected, retrying upload in ${retryCount * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                    continue;
                  }
                }
                break;
              }
            }
          }
        }
        
        if (retryCount >= maxRetries) {
          console.error(`AudioStorage: Upload failed after ${maxRetries} attempts`);
        }
      }

      if (error) {
        // Handle specific RLS policy errors
        if (error.message?.includes('row-level security policy')) {
          console.error('AudioStorage: RLS policy violation - user may not be authenticated or lacks permissions');
          throw new Error('Audio storage permissions not configured. Please contact support to set up storage policies.');
        } else if (error.message?.includes('Bucket not found')) {
          console.error('AudioStorage: Bucket not found - bucket may not exist');
          throw new Error('Audio storage bucket not configured. Please contact support.');
        } else if (error.message?.includes('Network request failed')) {
          console.error('AudioStorage: Network request failed - check internet connection');
          throw new Error('Network connection issue. Please check your internet connection and try again.');
        } else if (error.message?.includes('timeout')) {
          console.error('AudioStorage: Upload timeout - connection may be slow');
          throw new Error('Upload timeout. Please check your internet connection and try again.');
        }
        throw error;
      }

      // Return the storage path (userId/noteId/audio_xxx.mp3) - NOT a signed URL
      // The app generates fresh signed URLs when needed for playback (avoids blob:localhost fallback)
      // Storing the path ensures we always load from Supabase, not from blob URLs
      console.log('AudioStorage: Audio file uploaded successfully, returning storage path:', fileName);
      return fileName;
    } catch (error) {
      console.error('AudioStorage: Error uploading audio file:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          throw error; // Re-throw permission errors as-is
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          throw new Error('Network connection issue. Please check your internet connection and try again.');
        } else if (error.message.includes('file not found')) {
          throw new Error('Audio file not found. Please try recording again.');
        }
      }
      
      throw new Error('Failed to upload audio file. Please try again.');
    }
  }

  // Convert base64 to Uint8Array for React Native compatibility
  private base64ToUint8Array(base64: string): Uint8Array {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Uint8Array(byteNumbers);
  }

  // Convert Uint8Array to base64 for React Native fetch uploads
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  // Delete audio file from Supabase Storage
  async deleteAudioFile(storageUrl: string): Promise<void> {
    try {
      console.log('AudioStorage: Deleting audio file:', storageUrl);
      
      // Extract file path from URL
      const urlParts = storageUrl.split('/');
      const fileName = urlParts.slice(-3).join('/'); // userId/noteId/filename

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) throw error;
      
      console.log('AudioStorage: Audio file deleted successfully');
    } catch (error) {
      console.error('AudioStorage: Error deleting audio file:', error);
      throw error;
    }
  }

  // Save audio metadata to the notes table
  async saveAudioMetadata(
    noteId: string, 
    userId: string, 
    audioFile: Omit<AudioFile, 'id' | 'createdAt'>
  ): Promise<AudioFile> {
    try {
      console.log('AudioStorage: Saving audio metadata for note:', noteId);
      
      // Get current note
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('audio_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Create new audio file object
      const newAudioFile: AudioFile = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: audioFile.filename,
        duration: audioFile.duration,
        transcription: audioFile.transcription || '',
        transcriptionStatus: audioFile.transcriptionStatus || 'pending',
        aiTranscription: audioFile.aiTranscription || '',
        userEditedTranscription: audioFile.userEditedTranscription || '',
        createdAt: new Date(),
      };

      // Update note with new audio file
      const currentAudioFiles = note.audio_files || [];
      const updatedAudioFiles = [...currentAudioFiles, newAudioFile];

      const { error: updateError } = await supabase
        .from('notes')
        .update({
          audio_files: updatedAudioFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('AudioStorage: Audio metadata saved successfully');
      return newAudioFile;
    } catch (error) {
      console.error('AudioStorage: Error saving audio metadata:', error);
      throw error;
    }
  }

  // Update transcription for an audio file
  async updateTranscription(
    noteId: string,
    userId: string,
    audioFileId: string,
    transcription: string
  ): Promise<void> {
    try {
      console.log('AudioStorage: Updating transcription for audio file:', audioFileId);
      
      // Get current note
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('audio_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific audio file
      const currentAudioFiles = note.audio_files || [];
      const updatedAudioFiles = currentAudioFiles.map((audioFile: AudioFile) => {
        if (audioFile.id === audioFileId) {
          return {
            ...audioFile,
            transcription,
            transcriptionStatus: 'completed' as const,
          };
        }
        return audioFile;
      });

      // Update note
      const { error: updateError } = await supabase
        .from('notes')
        .update({
          audio_files: updatedAudioFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('AudioStorage: Transcription updated successfully');
    } catch (error) {
      console.error('AudioStorage: Error updating transcription:', error);
      throw error;
    }
  }

  // Get audio file metadata
  async getAudioFile(noteId: string, userId: string, audioFileId: string): Promise<AudioFile | null> {
    try {
      const { data: note, error } = await supabase
        .from('notes')
        .select('audio_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const audioFiles = note.audio_files || [];
      return audioFiles.find((audio: AudioFile) => audio.id === audioFileId) || null;
    } catch (error) {
      console.error('AudioStorage: Error getting audio file:', error);
      return null;
    }
  }

  // Delete audio file and its metadata
  async deleteAudioFileAndMetadata(
    noteId: string,
    userId: string,
    audioFileId: string
  ): Promise<void> {
    try {
      console.log('AudioStorage: Deleting audio file and metadata:', audioFileId);
      
      // Get the audio file to get the storage URL
      const audioFile = await this.getAudioFile(noteId, userId, audioFileId);
      if (!audioFile) {
        throw new Error('Audio file not found');
      }

      // Delete from storage
      await this.deleteAudioFile(audioFile.filename);

      // Remove from note metadata
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('audio_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentAudioFiles = note.audio_files || [];
      const updatedAudioFiles = currentAudioFiles.filter((audio: AudioFile) => audio.id !== audioFileId);

      const { error: updateError } = await supabase
        .from('notes')
        .update({
          audio_files: updatedAudioFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('AudioStorage: Audio file and metadata deleted successfully');
    } catch (error) {
      console.error('AudioStorage: Error deleting audio file and metadata:', error);
      throw error;
    }
  }
}

export const audioStorage = new AudioStorage(); 