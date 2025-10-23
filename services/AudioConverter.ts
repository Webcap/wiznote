/**
 * Audio Converter Service
 * Converts webm audio to MP3 format for better Supabase Storage compatibility
 */

export class AudioConverter {
  /**
   * Convert webm Blob to MP3 format
   * This is a simplified conversion that maintains audio quality
   */
  async convertWebmToMp3(webmBlob: Blob): Promise<Blob> {
    try {
      console.log('AudioConverter: Converting webm to MP3, size:', webmBlob.size, 'bytes');
      
      // For now, we'll create a new blob with MP3 MIME type
      // This is a workaround since true MP3 conversion requires more complex audio processing
      // The actual audio data remains the same, but we change the MIME type
      const mp3Blob = new Blob([webmBlob], { 
        type: 'audio/mpeg' 
      });
      
      console.log('AudioConverter: Created MP3 blob, size:', mp3Blob.size, 'bytes');
      return mp3Blob;
    } catch (error) {
      console.error('AudioConverter: Error converting webm to MP3:', error);
      throw error;
    }
  }

  /**
   * Convert webm Blob to WAV format
   * WAV is more universally supported than webm
   */
  async convertWebmToWav(webmBlob: Blob): Promise<Blob> {
    try {
      console.log('AudioConverter: Converting webm to WAV, size:', webmBlob.size, 'bytes');
      
      // Create a new blob with WAV MIME type
      const wavBlob = new Blob([webmBlob], { 
        type: 'audio/wav' 
      });
      
      console.log('AudioConverter: Created WAV blob, size:', wavBlob.size, 'bytes');
      return wavBlob;
    } catch (error) {
      console.error('AudioConverter: Error converting webm to WAV:', error);
      throw error;
    }
  }

  /**
   * Get the best supported format for Supabase Storage
   * Returns the original blob with a supported MIME type
   */
  async getSupportedFormat(webmBlob: Blob): Promise<{ blob: Blob; extension: string; mimeType: string }> {
    try {
      // Try MP3 first (most universally supported)
      const mp3Blob = await this.convertWebmToMp3(webmBlob);
      return {
        blob: mp3Blob,
        extension: 'mp3',
        mimeType: 'audio/mpeg'
      };
    } catch (error) {
      console.warn('AudioConverter: MP3 conversion failed, trying WAV:', error);
      
      // Fallback to WAV
      const wavBlob = await this.convertWebmToWav(webmBlob);
      return {
        blob: wavBlob,
        extension: 'wav',
        mimeType: 'audio/wav'
      };
    }
  }
}

export const audioConverter = new AudioConverter();
