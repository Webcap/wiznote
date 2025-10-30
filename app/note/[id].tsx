// Base file for note detail screen
// Platform-specific implementations are in [id].web.tsx and [id].native.tsx
// This file acts as a fallback for Expo Router's file resolution

import { Platform } from 'react-native';
import NoteDetailScreenWeb from './[id].web';
import NoteDetailScreenNative from './[id].native';

// Re-export based on platform
const NoteDetailScreen = Platform.OS === 'web' ? NoteDetailScreenWeb : NoteDetailScreenNative;

export default NoteDetailScreen;
