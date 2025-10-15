import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioUploadState {
  fileName: string;
  fileSize: string;
  duration: number;
  audioUrl: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  statusMessage: string;
  title?: string;
  tags?: string[];
}

interface AudioUploadContextType {
  uploadingAudio: AudioUploadState | null;
  setUploadingAudio: (state: AudioUploadState | null) => void;
  updateUploadProgress: (progress: number, statusMessage?: string) => void;
  updateUploadStatus: (status: AudioUploadState['status'], statusMessage?: string) => void;
  onUploadComplete: (() => void) | null;
  setOnUploadComplete: (callback: (() => void) | null) => void;
}

const AudioUploadContext = createContext<AudioUploadContextType | undefined>(undefined);

export function AudioUploadProvider({ children }: { children: ReactNode }) {
  const [uploadingAudio, setUploadingAudio] = useState<AudioUploadState | null>(null);
  const [onUploadComplete, setOnUploadComplete] = useState<(() => void) | null>(null);

  const updateUploadProgress = (progress: number, statusMessage?: string) => {
    setUploadingAudio(prev => prev ? { 
      ...prev, 
      progress,
      statusMessage: statusMessage || prev.statusMessage
    } : null);
  };

  const updateUploadStatus = (status: AudioUploadState['status'], statusMessage?: string) => {
    setUploadingAudio(prev => prev ? { 
      ...prev, 
      status,
      statusMessage: statusMessage || prev.statusMessage
    } : null);
  };

  return (
    <AudioUploadContext.Provider value={{ 
      uploadingAudio, 
      setUploadingAudio,
      updateUploadProgress,
      updateUploadStatus,
      onUploadComplete,
      setOnUploadComplete,
    }}>
      {children}
    </AudioUploadContext.Provider>
  );
}

export function useAudioUpload() {
  const context = useContext(AudioUploadContext);
  if (context === undefined) {
    // Return a safe fallback instead of throwing during development
    console.warn('useAudioUpload called outside AudioUploadProvider - using fallback');
    return {
      uploadingAudio: null,
      setUploadingAudio: () => {},
      updateUploadProgress: () => {},
      updateUploadStatus: () => {},
      onUploadComplete: null,
      setOnUploadComplete: () => {},
    };
  }
  return context;
}

