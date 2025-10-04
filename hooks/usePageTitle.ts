import { useEffect } from 'react';
import { Platform } from 'react-native';

interface UsePageTitleOptions {
  title?: string;
  subtitle?: string;
  showAppName?: boolean;
}

export function usePageTitle({ 
  title, 
  subtitle, 
  showAppName = true 
}: UsePageTitleOptions = {}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Always set title to "WizNote" regardless of parameters
    document.title = 'WizNote';

    // Cleanup function to reset title when component unmounts
    return () => {
      if (Platform.OS === 'web') {
        document.title = 'WizNote';
      }
    };
  }, []); // Remove dependencies since title is always 'WizNote'
} 