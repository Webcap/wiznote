import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { PDFFile } from '../types/Note';
import { PDF_CONFIG } from '../constants/PDFConfig';
import { safeValidateFile, sanitizeFilename, isAllowedMimeType } from '../schemas/FileSchema';

export class PDFStorage {
  private bucketName = PDF_CONFIG.BUCKET_NAME;

  // Check if the storage bucket exists
  private async checkBucketExists(): Promise<boolean> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        console.warn('PDFStorage: Error listing buckets:', error);
        return await this.checkBucketDirectAccess();
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      if (bucketExists) {
        console.log('PDFStorage: pdf-files bucket found in list');
        return true;
      }
      
      console.log('PDFStorage: pdf-files bucket not found in list, trying direct access...');
      return await this.checkBucketDirectAccess();
      
    } catch (error) {
      console.error('PDFStorage: Error checking bucket exists:', error);
      return await this.checkBucketDirectAccess();
    }
  }

  // Try to access the bucket directly
  private async checkBucketDirectAccess(): Promise<boolean> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });
      
      if (error) {
        if (error.message?.includes('Bucket not found')) {
          console.warn('PDFStorage: pdf-files bucket does not exist. Creating bucket...');
          return await this.createBucket();
        } else if (error.message?.includes('row-level security policy')) {
          console.log('PDFStorage: pdf-files bucket exists but RLS policies need to be configured');
          return true;
        } else {
          console.warn('PDFStorage: Error accessing bucket:', error);
          return false;
        }
      }
      
      console.log('PDFStorage: pdf-files bucket accessible');
      return true;
    } catch (error) {
      console.error('PDFStorage: Error in direct bucket access:', error);
      return false;
    }
  }

  // Create the PDF storage bucket
  private async createBucket(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.createBucket(this.bucketName, {
        public: PDF_CONFIG.BUCKET_PUBLIC,
        fileSizeLimit: PDF_CONFIG.MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: PDF_CONFIG.ALLOWED_MIME_TYPES
      });

      if (error) {
        console.error('PDFStorage: Error creating bucket:', error);
        return false;
      }

      console.log('PDFStorage: pdf-files bucket created successfully');
      return true;
    } catch (error) {
      console.error('PDFStorage: Error creating bucket:', error);
      return false;
    }
  }

  // Upload PDF file to Supabase Storage
  async uploadPDFFile(fileOrUri: File | Blob | string, userId: string, noteId: string, originalFilename?: string): Promise<string> {
    try {
      console.log('PDFStorage: Uploading PDF file');
      
      // Validate input parameters
      if (!fileOrUri) {
        throw new Error('PDF file is required for upload');
      }
      if (!userId) {
        throw new Error('User ID is required for upload');
      }
      if (!noteId) {
        throw new Error('Note ID is required for upload');
      }
      
      // ✅ STEP 1: Validate file based on platform
      if (typeof fileOrUri !== 'string') {
        // Web: Validate File/Blob object
        const file = fileOrUri instanceof File ? fileOrUri : null;
        if (file) {
          console.log('Validating PDF file...');
          const validationResult = safeValidateFile({
            name: file.name,
            size: file.size,
            type: file.type,
          }, 'pdf');
          
          if (!validationResult.success) {
            throw new Error(`Invalid PDF file: ${validationResult.error}`);
          }
          console.log('✅ PDF file validation passed');
        } else {
          // Blob - check size at least
          if (fileOrUri.size > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
            throw new Error(`PDF file too large. Maximum size is ${PDF_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
          }
        }
      }
      
      // Check if bucket exists
      const bucketExists = await this.checkBucketExists();
      if (!bucketExists) {
        throw new Error('PDF storage bucket not configured. Please contact support.');
      }

      // Generate unique filename
      const timestamp = Date.now();
      let filename: string;
      let pdfData: Uint8Array;
      
      if (typeof fileOrUri === 'string') {
        // Mobile: fileOrUri is a URI string
        console.log('PDFStorage: Processing mobile file URI');
        
        // ✅ Validate and sanitize filename
        const uriFilename = originalFilename || fileOrUri.split('/').pop() || 'document.pdf';
        
        // Check file extension
        if (!uriFilename.toLowerCase().endsWith('.pdf')) {
          throw new Error('File must be a PDF (.pdf extension required)');
        }
        
        const cleanFilename = sanitizeFilename(uriFilename);
        filename = `${userId}/${noteId}/pdf_${timestamp}_${cleanFilename}`;
        
        // Read file from mobile filesystem
        const base64Data = await FileSystem.readAsStringAsync(fileOrUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // ✅ Validate file size on mobile
        const fileSize = (base64Data.length * 3) / 4; // Approximate size from base64
        if (fileSize > PDF_CONFIG.MAX_FILE_SIZE_BYTES) {
          throw new Error(`PDF file too large. Maximum size is ${PDF_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
        }
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        pdfData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pdfData[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Web: fileOrUri is a File or Blob object
        console.log('PDFStorage: Processing web file object');
        
        // ✅ Sanitize filename
        const webFilename = fileOrUri instanceof File ? fileOrUri.name : 'document.pdf';
        const cleanFilename = sanitizeFilename(webFilename);
        filename = `${userId}/${noteId}/pdf_${timestamp}_${cleanFilename}`;
        
        // Read file data
        const arrayBuffer = await fileOrUri.arrayBuffer();
        pdfData = new Uint8Array(arrayBuffer);
      }

      console.log('PDFStorage: Uploading to path:', filename);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filename, pdfData, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        if (error.message?.includes('row-level security policy')) {
          console.error('PDFStorage: RLS policy violation - user may not be authenticated or lacks permissions');
          throw new Error('PDF storage permissions not configured. Please contact support to set up storage policies.');
        } else if (error.message?.includes('Bucket not found')) {
          console.error('PDFStorage: Bucket not found - bucket may not exist');
          throw new Error('PDF storage bucket not configured. Please contact support.');
        }
        throw error;
      }

      // Create a signed URL that expires in 1 year
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filename, 365 * 24 * 60 * 60); // 1 year in seconds

      if (signedUrlError) {
        console.error('PDFStorage: Error creating signed URL:', signedUrlError);
        const { data: publicUrlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(filename);
        console.log('PDFStorage: Using public URL as fallback:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }

      console.log('PDFStorage: PDF file uploaded successfully with signed URL');
      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('PDFStorage: Error uploading PDF file:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          throw error;
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          throw new Error('Network connection issue. Please check your internet connection and try again.');
        } else if (error.message.includes('file size')) {
          throw new Error('PDF file is too large. Maximum size is 50MB.');
        }
      }
      
      throw new Error('Failed to upload PDF file. Please try again.');
    }
  }

  // Delete PDF file from Supabase Storage
  async deletePDFFile(storageUrl: string): Promise<void> {
    try {
      console.log('PDFStorage: Deleting PDF file:', storageUrl);
      
      // Extract file path from URL
      const urlParts = storageUrl.split('/');
      const fileName = urlParts.slice(-3).join('/'); // userId/noteId/filename

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) throw error;
      
      console.log('PDFStorage: PDF file deleted successfully');
    } catch (error) {
      console.error('PDFStorage: Error deleting PDF file:', error);
      throw error;
    }
  }

  // Save PDF metadata to the notes table
  async savePDFMetadata(
    noteId: string, 
    userId: string, 
    pdfFile: Omit<PDFFile, 'id' | 'createdAt'>
  ): Promise<PDFFile> {
    try {
      console.log('PDFStorage: Saving PDF metadata for note:', noteId);
      
      // Get current note
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('pdf_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Create new PDF file object
      const newPDFFile: PDFFile = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: pdfFile.filename,
        storageUrl: pdfFile.storageUrl,
        extractedText: pdfFile.extractedText || '',
        extractionStatus: pdfFile.extractionStatus || 'pending',
        pageCount: pdfFile.pageCount,
        fileSize: pdfFile.fileSize,
        createdAt: new Date(),
      };

      // Update note with new PDF file
      const currentPDFFiles = note.pdf_files || [];
      const updatedPDFFiles = [...currentPDFFiles, newPDFFile];

      const { error: updateError } = await supabase
        .from('notes')
        .update({
          pdf_files: updatedPDFFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('PDFStorage: PDF metadata saved successfully');
      return newPDFFile;
    } catch (error) {
      console.error('PDFStorage: Error saving PDF metadata:', error);
      throw error;
    }
  }

  // Update extracted text for a PDF file
  async updateExtractedText(
    noteId: string,
    userId: string,
    pdfFileId: string,
    extractedText: string,
    pageCount?: number
  ): Promise<void> {
    try {
      console.log('PDFStorage: Updating extracted text for PDF file:', pdfFileId);
      
      // Get current note
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('pdf_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific PDF file
      const currentPDFFiles = note.pdf_files || [];
      const updatedPDFFiles = currentPDFFiles.map((pdfFile: PDFFile) => {
        if (pdfFile.id === pdfFileId) {
          return {
            ...pdfFile,
            extractedText,
            extractionStatus: 'completed' as const,
            pageCount: pageCount || pdfFile.pageCount,
          };
        }
        return pdfFile;
      });

      // Update note
      const { error: updateError } = await supabase
        .from('notes')
        .update({
          pdf_files: updatedPDFFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('PDFStorage: Extracted text updated successfully');
    } catch (error) {
      console.error('PDFStorage: Error updating extracted text:', error);
      throw error;
    }
  }

  // Get PDF file metadata
  async getPDFFile(noteId: string, userId: string, pdfFileId: string): Promise<PDFFile | null> {
    try {
      const { data: note, error } = await supabase
        .from('notes')
        .select('pdf_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const pdfFiles = note.pdf_files || [];
      return pdfFiles.find((pdf: PDFFile) => pdf.id === pdfFileId) || null;
    } catch (error) {
      console.error('PDFStorage: Error getting PDF file:', error);
      return null;
    }
  }

  // Delete PDF file and its metadata
  async deletePDFFileAndMetadata(
    noteId: string,
    userId: string,
    pdfFileId: string
  ): Promise<void> {
    try {
      console.log('PDFStorage: Deleting PDF file and metadata:', pdfFileId);
      
      // Get the PDF file to get the storage URL
      const pdfFile = await this.getPDFFile(noteId, userId, pdfFileId);
      if (!pdfFile) {
        throw new Error('PDF file not found');
      }

      // Delete from storage
      await this.deletePDFFile(pdfFile.storageUrl);

      // Remove from note metadata
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('pdf_files')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPDFFiles = note.pdf_files || [];
      const updatedPDFFiles = currentPDFFiles.filter((pdf: PDFFile) => pdf.id !== pdfFileId);

      const { error: updateError } = await supabase
        .from('notes')
        .update({
          pdf_files: updatedPDFFiles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('PDFStorage: PDF file and metadata deleted successfully');
    } catch (error) {
      console.error('PDFStorage: Error deleting PDF file and metadata:', error);
      throw error;
    }
  }

  // Extract text from PDF using AI
  async extractTextFromPDF(fileOrUri: File | Blob | string): Promise<{ text: string; pageCount: number }> {
    try {
      console.log('PDFStorage: Extracting text from PDF using AI');
      
      // Import PDF processing service
      const { pdfProcessingService } = await import('./PDFProcessingService');
      
      // Extract text using AI
      const result = await pdfProcessingService.extractText(fileOrUri);
      
      if (!result.success) {
        console.warn('PDFStorage: Text extraction failed, returning placeholder');
        return {
          text: 'PDF text extraction failed. The file has been uploaded successfully, but text extraction is pending.',
          pageCount: 1
        };
      }
      
      console.log('PDFStorage: Text extraction complete, length:', result.text.length);
      
      // Get metadata for page count estimate
      const metadata = await pdfProcessingService.getPDFMetadata(fileOrUri);
      
      return {
        text: result.text,
        pageCount: metadata.estimatedPages || 1
      };
    } catch (error) {
      console.error('PDFStorage: Error extracting text from PDF:', error);
      // Return a graceful fallback instead of throwing
      return {
        text: 'PDF uploaded successfully. Text extraction is pending.',
        pageCount: 1
      };
    }
  }
  
  // Process PDF with full AI analysis (text extraction + title + summary + key details)
  async processPDFWithAI(
    fileOrUri: File | Blob | string,
    options?: {
      generateTitle?: boolean;
      generateSummary?: boolean;
      extractKeyDetails?: boolean;
    }
  ): Promise<{
    success: boolean;
    extractedText: string;
    title?: string;
    summary?: string;
    keyDetails?: string[];
    pageCount?: number;
    error?: string;
  }> {
    try {
      console.log('PDFStorage: Processing PDF with full AI analysis');
      
      // Import PDF processing service
      const { pdfProcessingService } = await import('./PDFProcessingService');
      
      // Process with AI
      const result = await pdfProcessingService.processPDF(fileOrUri, options);
      
      if (!result.success) {
        console.error('PDFStorage: AI processing failed:', result.error);
        return result;
      }
      
      // Get metadata for page count
      const metadata = await pdfProcessingService.getPDFMetadata(fileOrUri);
      
      console.log('PDFStorage: AI processing complete');
      return {
        ...result,
        pageCount: metadata.estimatedPages,
      };
    } catch (error) {
      console.error('PDFStorage: Error processing PDF with AI:', error);
      return {
        success: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const pdfStorage = new PDFStorage();

