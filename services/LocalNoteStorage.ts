import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types/Note';

const NOTES_STORAGE_KEY = 'local_notes';
const NOTES_TIMESTAMP_KEY = 'local_notes_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class LocalNoteStorage {
  private static instance: LocalNoteStorage;
  private cache: Map<string, Note[]> = new Map();
  private timestamps: Map<string, number> = new Map();

  static getInstance(): LocalNoteStorage {
    if (!LocalNoteStorage.instance) {
      LocalNoteStorage.instance = new LocalNoteStorage();
    }
    return LocalNoteStorage.instance;
  }

  // Get notes from local storage for a specific user
  async getNotes(userId: string): Promise<Note[]> {
    try {
      // Check if we have cached data in memory
      if (this.cache.has(userId)) {
        const timestamp = this.timestamps.get(userId) || 0;
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('LocalNoteStorage: Returning cached notes for user:', userId);
          return this.cache.get(userId) || [];
        }
      }

      // Load from AsyncStorage
      const notesKey = `${NOTES_STORAGE_KEY}_${userId}`;
      const timestampKey = `${NOTES_TIMESTAMP_KEY}_${userId}`;
      
      const [notesJson, timestampJson] = await Promise.all([
        AsyncStorage.getItem(notesKey),
        AsyncStorage.getItem(timestampKey)
      ]);

      if (notesJson && timestampJson) {
        const parsedNotes = JSON.parse(notesJson);
        const timestamp = parseInt(timestampJson, 10);
        
        // Convert date strings back to Date objects
        const notes: Note[] = parsedNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
          audioFiles: note.audioFiles?.map((audio: any) => ({
            ...audio,
            createdAt: new Date(audio.createdAt),
          })) || [],
        }));
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('LocalNoteStorage: Loaded notes from AsyncStorage for user:', userId);
          this.cache.set(userId, notes);
          this.timestamps.set(userId, timestamp);
          return notes;
        }
      }

      console.log('LocalNoteStorage: No valid cached notes found for user:', userId);
      return [];
    } catch (error) {
      console.error('LocalNoteStorage: Error loading notes from local storage:', error);
      return [];
    }
  }

  // Save notes to local storage
  async saveNotes(userId: string, notes: Note[]): Promise<void> {
    try {
      const notesKey = `${NOTES_STORAGE_KEY}_${userId}`;
      const timestampKey = `${NOTES_TIMESTAMP_KEY}_${userId}`;
      const timestamp = Date.now();

      // Save to memory cache
      this.cache.set(userId, notes);
      this.timestamps.set(userId, timestamp);

      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(notesKey, JSON.stringify(notes)),
        AsyncStorage.setItem(timestampKey, timestamp.toString())
      ]);

      console.log('LocalNoteStorage: Saved notes to local storage for user:', userId);
    } catch (error) {
      console.error('LocalNoteStorage: Error saving notes to local storage:', error);
    }
  }

  // Add a single note to local storage
  async addNote(userId: string, note: Note): Promise<void> {
    try {
      const currentNotes = await this.getNotes(userId);
      const updatedNotes = [note, ...currentNotes];
      await this.saveNotes(userId, updatedNotes);
    } catch (error) {
      console.error('LocalNoteStorage: Error adding note to local storage:', error);
    }
  }

  // Update a note in local storage
  async updateNote(userId: string, noteId: string, updates: Partial<Note>): Promise<void> {
    try {
      const currentNotes = await this.getNotes(userId);
      const updatedNotes = currentNotes.map(note => 
        note.id === noteId ? { ...note, ...updates, updatedAt: new Date() } : note
      );
      await this.saveNotes(userId, updatedNotes);
    } catch (error) {
      console.error('LocalNoteStorage: Error updating note in local storage:', error);
    }
  }

  // Delete a note from local storage
  async deleteNote(userId: string, noteId: string): Promise<void> {
    try {
      const currentNotes = await this.getNotes(userId);
      const updatedNotes = currentNotes.filter(note => note.id !== noteId);
      await this.saveNotes(userId, updatedNotes);
    } catch (error) {
      console.error('LocalNoteStorage: Error deleting note from local storage:', error);
    }
  }

  // Clear all cached data for a user
  async clearUserData(userId: string): Promise<void> {
    try {
      const notesKey = `${NOTES_STORAGE_KEY}_${userId}`;
      const timestampKey = `${NOTES_TIMESTAMP_KEY}_${userId}`;
      
      await Promise.all([
        AsyncStorage.removeItem(notesKey),
        AsyncStorage.removeItem(timestampKey)
      ]);

      this.cache.delete(userId);
      this.timestamps.delete(userId);

      console.log('LocalNoteStorage: Cleared local data for user:', userId);
    } catch (error) {
      console.error('LocalNoteStorage: Error clearing user data:', error);
    }
  }

  // Check if we have valid cached data for a user
  async hasValidCache(userId: string): Promise<boolean> {
    try {
      // First check memory cache
      const timestamp = this.timestamps.get(userId);
      if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
        return true;
      }

      // Then check AsyncStorage
      const timestampKey = `${NOTES_TIMESTAMP_KEY}_${userId}`;
      const timestampJson = await AsyncStorage.getItem(timestampKey);
      
      if (timestampJson) {
        const storedTimestamp = parseInt(timestampJson, 10);
        const isValid = Date.now() - storedTimestamp < CACHE_DURATION;
        
        // Update memory cache if valid
        if (isValid) {
          this.timestamps.set(userId, storedTimestamp);
        }
        
        return isValid;
      }

      return false;
    } catch (error) {
      console.error('LocalNoteStorage: Error checking cache validity:', error);
      return false;
    }
  }

  // Get cache age in milliseconds
  getCacheAge(userId: string): number {
    const timestamp = this.timestamps.get(userId) || 0;
    return Date.now() - timestamp;
  }

  // Clear all cached data (for testing or cleanup)
  async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys && Array.isArray(keys)) {
        const noteKeys = keys.filter(key => 
          key.startsWith(NOTES_STORAGE_KEY) || key.startsWith(NOTES_TIMESTAMP_KEY)
        );
        
        if (noteKeys.length > 0) {
          await AsyncStorage.multiRemove(noteKeys);
        }
      }

      this.cache.clear();
      this.timestamps.clear();

      console.log('LocalNoteStorage: Cleared all cached data');
    } catch (error) {
      console.error('LocalNoteStorage: Error clearing all data:', error);
    }
  }
}

// Export singleton instance
export const localNoteStorage = LocalNoteStorage.getInstance(); 