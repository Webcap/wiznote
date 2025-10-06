import * as FileSystem from 'expo-file-system';
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
  async uploadAudioFile(audioUri: string, userId: string, noteId: string): Promise<string> {
    try {
      console.log('AudioStorage: Uploading audio file:', audioUri);
      
      // Validate input parameters
      if (!audioUri) {
        throw new Error('Audio URI is required for upload');
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
      let fileExtension = 'm4a'; // Default extension
      
      if (Platform.OS === 'web') {
        // For web, we'll use m4a as default since blob URLs don't have extensions
        // The actual format will be determined by the browser's MediaRecorder
        fileExtension = 'm4a';
      } else {
        // For native platforms, try to extract from URI
        fileExtension = audioUri.split('.').pop() || 'm4a';
      }
      
      const fileName = `${userId}/${noteId}/audio_${timestamp}.${fileExtension}`;

      let audioData: Uint8Array;

      if (Platform.OS === 'web') {
        // For web, fetch the blob data directly
        const response = await fetch(audioUri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        audioData = new Uint8Array(arrayBuffer);
      } else {
        // For native platforms, use FileSystem
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64' as any,
        });
        audioData = this.base64ToUint8Array(base64Audio);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, audioData, {
          contentType: Platform.OS === 'web' ? 'audio/mp4' : `audio/${fileExtension}`,
          upsert: false,
        });

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

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      console.log('AudioStorage: Audio file uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
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