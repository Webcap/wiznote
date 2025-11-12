import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface PDFUploadState {
  fileName: string;
  fileSize: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  statusMessage: string;
}

interface PDFUploadContextType {
  uploadingPDF: PDFUploadState | null;
  setUploadingPDF: Dispatch<SetStateAction<PDFUploadState | null>>;
  updateUploadProgress: (progress: number, statusMessage?: string) => void;
  updateUploadStatus: (status: PDFUploadState['status'], statusMessage?: string) => void;
  onUploadComplete: (() => void) | null;
  setOnUploadComplete: (callback: (() => void) | null) => void;
}

const PDFUploadContext = createContext<PDFUploadContextType | undefined>(undefined);

export function PDFUploadProvider({ children }: { children: ReactNode }) {
  const [uploadingPDF, setUploadingPDF] = useState<PDFUploadState | null>(null);
  const [onUploadComplete, setOnUploadComplete] = useState<(() => void) | null>(null);

  const updateUploadProgress = (progress: number, statusMessage?: string) => {
    setUploadingPDF(prev => prev ? { 
      ...prev, 
      progress,
      statusMessage: statusMessage || prev.statusMessage
    } : null);
  };

  const updateUploadStatus = (status: PDFUploadState['status'], statusMessage?: string) => {
    setUploadingPDF(prev => prev ? { 
      ...prev, 
      status,
      statusMessage: statusMessage || prev.statusMessage
    } : null);
  };

  return (
    <PDFUploadContext.Provider value={{ 
      uploadingPDF, 
      setUploadingPDF,
      updateUploadProgress,
      updateUploadStatus,
      onUploadComplete,
      setOnUploadComplete,
    }}>
      {children}
    </PDFUploadContext.Provider>
  );
}

export function usePDFUpload() {
  const context = useContext(PDFUploadContext);
  if (context === undefined) {
    // Return a safe fallback instead of throwing during development
    console.warn('usePDFUpload called outside PDFUploadProvider - using fallback');
    return {
      uploadingPDF: null,
      setUploadingPDF: (() => {}) as Dispatch<SetStateAction<PDFUploadState | null>>,
      updateUploadProgress: () => {},
      updateUploadStatus: () => {},
      onUploadComplete: null,
      setOnUploadComplete: () => {},
    };
  }
  return context;
}

