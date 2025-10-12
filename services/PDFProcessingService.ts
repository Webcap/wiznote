import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { processPDFWithGemini, extractTextFromPDFWithGemini } from './GeminiAI';

/**
 * PDF Processing Service
 * Handles PDF text extraction and AI processing for both web and mobile platforms
 */
export class PDFProcessingService {
  
  /**
   * Convert File/Blob to base64 (web)
   */
  private async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (data:application/pdf;base64,)
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Read PDF file from mobile URI and convert to base64
   */
  private async uriToBase64(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  }
  
  /**
   * Process PDF with full AI analysis
   * Extracts text, generates title, summary, and key details
   */
  async processPDF(
    fileOrUri: File | Blob | string,
    options: {
      generateTitle?: boolean;
      generateSummary?: boolean;
      extractKeyDetails?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    extractedText: string;
    title?: string;
    summary?: string;
    keyDetails?: string[];
    error?: string;
  }> {
    try {
      console.log('PDFProcessingService: Starting PDF processing...');
      console.log('PDFProcessingService: Options:', options);
      
      // Convert to base64
      let base64PDF: string;
      if (typeof fileOrUri === 'string') {
        // Mobile: URI string
        console.log('PDFProcessingService: Converting mobile URI to base64');
        base64PDF = await this.uriToBase64(fileOrUri);
      } else {
        // Web: File or Blob
        console.log('PDFProcessingService: Converting web File/Blob to base64');
        base64PDF = await this.fileToBase64(fileOrUri);
      }
      
      console.log('PDFProcessingService: Base64 conversion complete, length:', base64PDF.length);
      
      // Process with Gemini AI
      const result = await processPDFWithGemini(base64PDF, {
        extractText: true,
        generateTitle: options.generateTitle !== false, // Default true
        generateSummary: options.generateSummary !== false, // Default true
        extractKeyDetails: options.extractKeyDetails !== false, // Default true
      });
      
      if (!result.success) {
        console.error('PDFProcessingService: Processing failed:', result.error);
        return {
          success: false,
          extractedText: '',
          error: result.error || 'PDF processing failed'
        };
      }
      
      console.log('PDFProcessingService: Processing complete');
      console.log('PDFProcessingService: - Extracted text length:', result.extractedText?.length || 0);
      console.log('PDFProcessingService: - Title generated:', !!result.title);
      console.log('PDFProcessingService: - Summary generated:', !!result.summary);
      console.log('PDFProcessingService: - Key details count:', result.keyDetails?.length || 0);
      
      return {
        success: true,
        extractedText: result.extractedText || '',
        title: result.title,
        summary: result.summary,
        keyDetails: result.keyDetails,
      };
      
    } catch (error) {
      console.error('PDFProcessingService: Error processing PDF:', error);
      return {
        success: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Extract text only from PDF (no AI processing)
   * Faster than full processing, but uses AI for text extraction
   */
  async extractText(fileOrUri: File | Blob | string): Promise<{
    success: boolean;
    text: string;
    error?: string;
  }> {
    try {
      console.log('PDFProcessingService: Extracting text from PDF...');
      
      // Convert to base64
      let base64PDF: string;
      if (typeof fileOrUri === 'string') {
        console.log('PDFProcessingService: Converting mobile URI to base64');
        base64PDF = await this.uriToBase64(fileOrUri);
      } else {
        console.log('PDFProcessingService: Converting web File/Blob to base64');
        base64PDF = await this.fileToBase64(fileOrUri);
      }
      
      console.log('PDFProcessingService: Base64 conversion complete');
      
      // Extract text using Gemini
      const result = await extractTextFromPDFWithGemini(base64PDF);
      
      if (!result.success) {
        console.error('PDFProcessingService: Text extraction failed:', result.error);
        return result;
      }
      
      console.log('PDFProcessingService: Text extraction complete, length:', result.text.length);
      return result;
      
    } catch (error) {
      console.error('PDFProcessingService: Error extracting text:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Get PDF metadata (file size, estimated page count, etc.)
   */
  async getPDFMetadata(fileOrUri: File | Blob | string): Promise<{
    fileSize: number;
    estimatedPages?: number;
  }> {
    try {
      if (typeof fileOrUri === 'string') {
        // Mobile: Get file info
        const fileInfo = await FileSystem.getInfoAsync(fileOrUri);
        return {
          fileSize: fileInfo.size || 0,
          estimatedPages: Math.ceil((fileInfo.size || 0) / 50000), // Rough estimate: 50KB per page
        };
      } else {
        // Web: Get from File/Blob
        return {
          fileSize: fileOrUri.size,
          estimatedPages: Math.ceil(fileOrUri.size / 50000), // Rough estimate: 50KB per page
        };
      }
    } catch (error) {
      console.error('PDFProcessingService: Error getting metadata:', error);
      return {
        fileSize: 0,
        estimatedPages: 1,
      };
    }
  }
}

export const pdfProcessingService = new PDFProcessingService();

