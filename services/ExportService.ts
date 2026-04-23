import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { documentDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system';
import { supabaseNoteStorage } from './SupabaseNoteStorage';
import { Note } from '../types/Note';
import { betterAuthService } from './BetterAuthService';
import { FlashcardService } from './FlashcardService';
import { quizService } from './QuizService';
import { supabase } from '../lib/supabase';

export class ExportService {
  /**
   * Exports all data for the current user (Notes, Quizzes, Flashcards).
   */
  async exportAllData(): Promise<boolean> {
    try {
      console.log('ExportService: Starting full data export...');
      
      const user = await betterAuthService.getCurrentUser();
      if (!user) {
        throw new Error('You must be signed in to export your data.');
      }
      const userId = user.id;

      // 1. Fetch Notes
      const notes = await supabaseNoteStorage.getNotes() || [];
      
      // 2. Fetch Flashcards
      let flashcardSets = [];
      try {
        flashcardSets = await FlashcardService.getInstance().getFlashcardSetsByUser(userId);
      } catch (e) {
        console.warn('ExportService: Failed to fetch flashcards:', e);
      }

      // 3. Fetch Quizzes
      let quizzes = [];
      try {
        const quizList = await quizService.getUserQuizzes(userId, {}, 1000, 0);
        // Get full data for each quiz (including questions)
        quizzes = await Promise.all(
          (quizList.quizzes || []).map(q => quizService.getQuiz(q.id).catch(() => q))
        );
      } catch (e) {
        console.warn('ExportService: Failed to fetch quizzes:', e);
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          email: user.email,
          displayName: user.displayName,
        },
        stats: {
          totalNotes: notes.length,
          totalFlashcardSets: flashcardSets.length,
          totalQuizzes: quizzes.length,
        },
        notes: await Promise.all(notes.map(n => this.formatNoteForExport(n))),
        flashcards: flashcardSets,
        quizzes: quizzes
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const filename = `wiznote_full_export_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        return this.downloadWeb(jsonString, filename);
      } else {
        return this.downloadMobile(jsonString, filename);
      }
    } catch (error) {
      console.error('ExportService: Full export failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async exportAllNotes(): Promise<boolean> {
    return this.exportAllData();
  }

  private async formatNoteForExport(note: Note) {
    // Generate signed URLs for audio files if possible
    const audioWithUrls = await Promise.all((note.audioFiles || []).map(async (af) => {
      let downloadUrl = null;
      try {
        // Try to get a signed URL for the audio file (valid for 24 hours)
        const { data, error } = await supabase.storage
          .from('audio-files')
          .createSignedUrl(af.filename, 86400);
        
        if (!error && data) {
          downloadUrl = data.signedUrl;
        }
      } catch (e) {
        console.warn(`ExportService: Failed to get signed URL for ${af.filename}`, e);
      }

      return {
        filename: af.filename,
        duration: af.duration,
        transcription: af.transcription,
        aiTranscription: af.aiTranscription,
        userEditedTranscription: af.userEditedTranscription,
        transcriptionStatus: af.transcriptionStatus,
        createdAt: af.createdAt,
        downloadUrl: downloadUrl
      };
    }));

    return {
      title: note.title,
      content: note.content,
      tags: note.tags,
      type: note.type,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isFavorite: note.isFavorite,
      summary: note.summary,
      keyDetails: note.keyDetails,
      audioFiles: audioWithUrls,
      pdfFiles: note.pdfFiles?.map(pf => ({
        filename: pf.filename,
        pageCount: pf.pageCount,
        fileSize: pf.fileSize,
        createdAt: pf.createdAt
      }))
    };
  }

  private async downloadWeb(data: string, filename: string): Promise<boolean> {
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('ExportService: Web download failed:', error);
      return false;
    }
  }

  private async downloadMobile(data: string, filename: string): Promise<boolean> {
    try {
      const fileUri = documentDirectory + filename;
      await writeAsStringAsync(fileUri, data, {
        encoding: EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export WizNote Data',
          UTI: 'public.json',
        });
        return true;
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('ExportService: Mobile download failed:', error);
      return false;
    }
  }
}

export const exportService = new ExportService();
