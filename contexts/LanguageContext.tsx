import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import * as Localization from 'expo-localization';
import { LanguageStorage } from '../lib/i18nStorage';
import i18n from '../lib/i18n';
import { betterAuthService } from '../services/BetterAuthService';

interface LanguageContextType {
  language: string;
  changeLanguage: (language: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  changeLanguage: async () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<string>('en');

  const handleLanguageChange = useCallback((lng: string) => {
    setLanguage(lng);
  }, []);

      const changeLanguage = useCallback(async (newLanguage: string) => {
        if (['en', 'es'].includes(newLanguage)) {
          try {
            await LanguageStorage.setLanguage(newLanguage);
            await i18n.changeLanguage(newLanguage);
            setLanguage(newLanguage);
            
            // Update backend preferences if user is logged in
            try {
              const currentUser = await betterAuthService.getCurrentUser();
              if (currentUser?.id) {
                await betterAuthService.updatePreferences({ language: newLanguage });
              }
            } catch (userError) {
              // User might not be logged in, that's okay
              console.log('Not updating backend language preference - user not logged in');
            }
          } catch (error) {
            console.error('Error changing language:', error);
          }
        }
      }, []);

  // Load initial language once on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        let savedLanguage = null;
        
        // Try to get current user from backend
        try {
          const currentUser = await betterAuthService.getCurrentUser();
          // Check backend preferences first (most authoritative)
          if (currentUser?.preferences?.language) {
            savedLanguage = currentUser.preferences.language;
            // Sync with AsyncStorage
            await LanguageStorage.setLanguage(savedLanguage);
          }
        } catch (userError) {
          // User might not be logged in, continue to fallback
        }
        
        // If no saved language from backend, check AsyncStorage
        if (!savedLanguage) {
          savedLanguage = await LanguageStorage.getLanguage();
        }
        
        // If no saved language, detect from device locale
        if (!savedLanguage) {
          const locales = Localization.getLocales();
          const detectedLanguage = locales[0]?.languageCode || 'en';
          // Only use detected language if it's supported
          if (['en', 'es'].includes(detectedLanguage)) {
            savedLanguage = detectedLanguage;
            await LanguageStorage.setLanguage(detectedLanguage);
          } else {
            // Default to English if not supported
            savedLanguage = 'en';
            await LanguageStorage.setLanguage('en');
          }
        }

        const finalLanguage = savedLanguage || 'en';
        setLanguage(finalLanguage);
        i18n.changeLanguage(finalLanguage);
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };

    loadLanguage();
  }, []); // Run once on mount only

  // Listen for i18n language changes
  useEffect(() => {
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [handleLanguageChange]);

  const value = useMemo(() => ({ language, changeLanguage }), [language, changeLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

