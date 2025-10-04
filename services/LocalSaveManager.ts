import AsyncStorage from '@react-native-async-storage/async-storage';
import { NoteFormData } from '../types/Note';

interface PendingSave {
  id: string;
  noteId: string;
  data: NoteFormData;
  timestamp: number;
  retryCount: number;
}

export class LocalSaveManager {
  private static instance: LocalSaveManager;
  private pendingSaves: Map<string, PendingSave> = new Map();
  private readonly STORAGE_KEY = 'pending_saves';

  static getInstance(): LocalSaveManager {
    if (!LocalSaveManager.instance) {
      LocalSaveManager.instance = new LocalSaveManager();
    }
    return LocalSaveManager.instance;
  }

  // Save note data locally when offline
  async saveLocally(noteId: string, data: NoteFormData): Promise<void> {
    const saveId = `local_${noteId}_${Date.now()}`;
    const pendingSave: PendingSave = {
      id: saveId,
      noteId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.pendingSaves.set(saveId, pendingSave);
    await this.persistPendingSaves();
  }

  // Get all pending saves
  async getPendingSaves(): Promise<PendingSave[]> {
    return Array.from(this.pendingSaves.values());
  }

  // Remove a pending save after successful sync
  async removePendingSave(saveId: string): Promise<void> {
    this.pendingSaves.delete(saveId);
    await this.persistPendingSaves();
  }

  // Clear all pending saves
  async clearPendingSaves(): Promise<void> {
    this.pendingSaves.clear();
    await this.persistPendingSaves();
  }

  // Load pending saves from storage
  async loadPendingSaves(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const saves: PendingSave[] = JSON.parse(stored);
        this.pendingSaves.clear();
        saves.forEach(save => {
          this.pendingSaves.set(save.id, save);
        });
      }
    } catch (error) {
      console.error('Error loading pending saves:', error);
    }
  }

  // Persist pending saves to storage
  private async persistPendingSaves(): Promise<void> {
    try {
      const saves = Array.from(this.pendingSaves.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(saves));
    } catch (error) {
      console.error('Error persisting pending saves:', error);
    }
  }

  // Get pending saves for a specific note
  getPendingSavesForNote(noteId: string): PendingSave[] {
    return Array.from(this.pendingSaves.values()).filter(save => save.noteId === noteId);
  }

  // Check if there are any pending saves
  hasPendingSaves(): boolean {
    return this.pendingSaves.size > 0;
  }
}

export const localSaveManager = LocalSaveManager.getInstance(); 