import { useTranslation as useI18nextTranslation, UseTranslationResponse } from 'react-i18next';

/**
 * Custom hook that wraps react-i18next's useTranslation
 * to provide easier access to the translation function
 */
export function useTranslation(): UseTranslationResponse<'translation', undefined> {
  return useI18nextTranslation('translation');
}

