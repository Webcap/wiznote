import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, Platform, Image } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { useThemeColor } from '../hooks/useThemeColor';

interface Language {
  code: string;
  name: string;
  flagUrl: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flagUrl: 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/us.svg' },
  { code: 'es', name: 'Español', flagUrl: 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/es.svg' },
];

export function LanguageSelector({ isCompact = false }: { isCompact?: boolean }) {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'backgroundTertiary');

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const handleLanguageChange = async (newLang: string) => {
    await changeLanguage(newLang);
    setShowPicker(false);
  };

  if (isCompact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => setShowPicker(true)}
        >
          <Image source={{ uri: currentLanguage.flagUrl }} style={styles.flagIcon} />
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <ThemedView style={[styles.modalContent, { backgroundColor }]}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>Select Language</ThemedText>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    { backgroundColor: backgroundSecondary },
                    language === lang.code && [styles.languageOptionActive, { borderColor: accentPrimary }]
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Image source={{ uri: lang.flagUrl }} style={styles.flagIcon} />
                  <ThemedText style={[styles.languageName, { color: textColor }]}>{lang.name}</ThemedText>
                  {language === lang.code && (
                    <ThemedText style={[styles.checkmark, { color: accentPrimary }]}>✓</ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </ThemedView>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.fullButton}
        onPress={() => setShowPicker(true)}
      >
        <Image source={{ uri: currentLanguage.flagUrl }} style={styles.flagIcon} />
        <ThemedText style={[styles.languageNameSmall, { color: textSecondaryColor }]}>{currentLanguage.name}</ThemedText>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <ThemedView style={[styles.modalContent, { backgroundColor }]}>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>{t('landing.selectLanguage')}</ThemedText>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  { backgroundColor: backgroundSecondary },
                  language === lang.code && [styles.languageOptionActive, { borderColor: accentPrimary }]
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Image source={{ uri: lang.flagUrl }} style={styles.flagIcon} />
                <ThemedText style={[styles.languageName, { color: textColor }]}>{lang.name}</ThemedText>
                {language === lang.code && (
                  <ThemedText style={[styles.checkmark, { color: accentPrimary }]}>✓</ThemedText>
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  flagIcon: {
    width: 24,
    height: 18,
    borderRadius: 2,
    ...(Platform.OS === 'web' ? {
      width: 20,
      height: 15,
    } : {}),
  },
  languageNameSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  languageOptionActive: {
    borderWidth: 2,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
