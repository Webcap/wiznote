import { useEffect } from 'react';
import { Platform } from 'react-native';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    // Validate shortcuts array
    if (!Array.isArray(shortcuts)) {
      console.warn('useKeyboardShortcuts: shortcuts must be an array');
      return;
    }

    // Validate each shortcut object
    shortcuts.forEach((shortcut, index) => {
      if (!shortcut || typeof shortcut !== 'object') {
        console.warn(`useKeyboardShortcuts: shortcut at index ${index} is not an object:`, shortcut);
        return;
      }
      
      if (typeof shortcut.key !== 'string') {
        console.warn(`useKeyboardShortcuts: shortcut at index ${index} has invalid key:`, shortcut.key);
        return;
      }
      
      if (typeof shortcut.action !== 'function') {
        console.warn(`useKeyboardShortcuts: shortcut at index ${index} has invalid action:`, shortcut.action);
        return;
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => {
        // Type guard to ensure key is a string
        if (typeof s.key !== 'string') {
          console.warn('Invalid shortcut key:', s.key);
          return false;
        }
        
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl ? event.ctrlKey : !event.ctrlKey;
        const cmdMatch = s.cmd ? event.metaKey : !event.metaKey;
        const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
        
        return keyMatch && ctrlMatch && cmdMatch && shiftMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

// Common shortcuts for Notez
export const NOTEZ_SHORTCUTS: Record<string, Omit<KeyboardShortcut, 'action'>> = {
  NEW_NOTE: { key: 'n', cmd: true, description: 'Create new note' },
  SAVE: { key: 's', cmd: true, description: 'Save note' },
  SEARCH: { key: 'k', cmd: true, description: 'Search notes' },
  DELETE: { key: 'Delete', description: 'Delete note' },
  ARCHIVE: { key: 'a', cmd: true, description: 'Archive note' },
  BOLD: { key: 'b', cmd: true, description: 'Bold text' },
  ITALIC: { key: 'i', cmd: true, description: 'Italic text' },
  UNDERLINE: { key: 'u', cmd: true, description: 'Underline text' },
}; 