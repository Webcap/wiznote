import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/useTranslation';

interface NoteTitleInputProps {
  title: string;
  setTitle: (title: string) => void;
  inputBg: string;
  inputText: string;
  borderColor: string;
  placeholderColor: string;
}

export const NoteTitleInput: React.FC<NoteTitleInputProps> = ({
  title,
  setTitle,
  inputBg,
  inputText,
  borderColor,
  placeholderColor,
}) => {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.webSection}>
      <View style={styles.webSectionHeader}>
        <ThemedText style={styles.webSectionTitle}>{t('createNote.title')}</ThemedText>
        <View style={styles.webSectionBadge}>
          <Ionicons name="document-text" size={16} color="#6A5ACD" />
          <ThemedText style={styles.webSectionBadgeText}>{t('createNote.required')}</ThemedText>
        </View>
      </View>
      <TextInput
        style={[styles.webInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
        value={title}
        onChangeText={setTitle}
        placeholder={t('createNote.enterDescriptiveTitle')}
        placeholderTextColor={placeholderColor}
        multiline
        maxLength={200}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  webSection: {
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 16,
        marginBottom: 20,
        borderRadius: 12,
      },
      '@media (max-width: 480px)': {
        padding: 12,
        marginBottom: 16,
      },
    } : {}),
  },
  webSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  webSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  webSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webSectionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#6A5ACD',
  },
  webInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 12,
        height: 50,
        fontSize: 16,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 10,
        height: 48,
        fontSize: 16,
      },
    } : {}),
  },
});
