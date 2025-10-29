import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@wiznote:language';

export const LanguageStorage = {
  async getLanguage(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch (error) {
      console.error('Error getting language preference:', error);
      return null;
    }
  },

  async setLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error setting language preference:', error);
    }
  },

  async clearLanguage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LANGUAGE_KEY);
    } catch (error) {
      console.error('Error clearing language preference:', error);
    }
  },
};

