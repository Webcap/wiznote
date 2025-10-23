import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { AudioFile } from '../types/Note';

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
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64' as any,
        });
        const audioData = this.base64ToUint8Array(base64Audio);
        fileBody = audioData;
        contentType = `audio/${fileExtension}`;
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
        const uploadResult = await supabase.storage
          .from(this.bucketName)
          .upload(fileName, fileBody as any, uploadOptions);
        
        data = uploadResult.data;
        error = uploadResult.error;
      }

      if (error) {
        // Handle specific RLS policy errors
        if (error.message?.includes('row-level security policy')) {
          console.error('AudioStorage: RLS policy violation - user may not be authenticated or lacks permissions');
          throw new Error('Audio storage permissions not configured. Please contact support to set up storage policies.');
        } else if (error.message?.includes('Bucket not found')) {
          console.error('AudioStorage: Bucket not found - bucket may not exist');
          throw new Error('Audio storage bucket not configured. Please contact support.');
        }
        throw error;
      }

      // For private buckets, we use the storage path directly
      // The app will generate signed URLs when needed for downloads
      const storagePath = `${this.bucketName}/${fileName}`;
      
      // Create a signed URL that expires in 1 year (for long-term access)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year in seconds

      if (signedUrlError) {
        console.error('AudioStorage: Error creating signed URL:', signedUrlError);
        // Fallback: return public URL (may not work for private buckets but better than nothing)
        const { data: publicUrlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);
        console.log('AudioStorage: Using public URL as fallback:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }

      console.log('AudioStorage: Audio file uploaded successfully with signed URL');
      return signedUrlData.signedUrl;
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