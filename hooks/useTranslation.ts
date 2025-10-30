import { useTranslation as useI18nextTranslation } from 'react-i18next';

/**
 * Custom hook that wraps react-i18next's useTranslation
 * to provide easier access to the translation function
 */
export function useTranslation() {
  return useI18nextTranslation();
}

