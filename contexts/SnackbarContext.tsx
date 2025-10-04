import React, { createContext, useCallback, useContext, useState } from 'react';
import { SnackbarType } from '../components/web/WebSnackbar';

interface SnackbarContextType {
  showSnackbar: (message: string, type?: SnackbarType, duration?: number, action?: { label: string; onPress: () => void }) => void;
  hideSnackbar: () => void;
  snackbar: {
    visible: boolean;
    message: string;
    type: SnackbarType;
    duration: number;
    action?: { label: string; onPress: () => void };
  };
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as SnackbarType,
    duration: 4000,
    action: undefined as { label: string; onPress: () => void } | undefined,
  });

  const showSnackbar = useCallback((
    message: string,
    type: SnackbarType = 'info',
    duration: number = 4000,
    action?: { label: string; onPress: () => void }
  ) => {
    setSnackbar({
      visible: true,
      message,
      type,
      duration,
      action,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const value: SnackbarContextType = {
    showSnackbar,
    hideSnackbar,
    snackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
}; 