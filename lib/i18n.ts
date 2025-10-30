import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en/translations.json';
import esTranslations from '../locales/es/translations.json';

// Safely import expo-localization (may not be available during initialization)
let Localization: typeof import('expo-localization') | null = null;
try {
  Localization = require('expo-localization');
} catch (error) {
  // expo-localization may not be available yet, that's okay
  // LanguageProvider will handle locale detection
}

let isInitialized = false;

// Initialize i18next with default config
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: enTranslations },
    es: { translation: esTranslations },
  },
  lng: 'en', // Will be updated by LanguageProvider
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

