import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/useTranslation';

interface NoteTagsInputProps {
  tags: string[];
  newTag: string;
  setNewTag: (tag: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  inputBg: string;
  inputText: string;
  borderColor: string;
  placeholderColor: string;
}

export const NoteTagsInput: React.FC<NoteTagsInputProps> = ({
  tags,
  newTag,
  setNewTag,
  addTag,
  removeTag,
  inputBg,
  inputText,
  borderColor,
  placeholderColor,
}) => {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.webSection}>
      <View style={styles.webSectionHeader}>
        <ThemedText style={styles.webSectionTitle}>{t('createNote.tags')}</ThemedText>
        <View style={styles.webSectionBadge}>
          <Ionicons name="pricetag" size={16} color="#6A5ACD" />
          <ThemedText style={styles.webSectionBadgeText}>{t('createNote.optional')}</ThemedText>
        </View>
      </View>
      <View style={styles.webTagInputContainer}>
        <TextInput
          style={[styles.webTagInput, { backgroundColor: inputBg, color: inputText, borderColor }]}
          value={newTag}
          onChangeText={setNewTag}
          placeholder={t('createNote.addTagEnter')}
          placeholderTextColor={placeholderColor}
          onSubmitEditing={addTag}
        />
        <TouchableOpacity
          style={[styles.webAddTagButton, { backgroundColor: '#6A5ACD' }]}
          onPress={addTag}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {tags.length > 0 && (
        <View style={styles.webTagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={[styles.webTag, { backgroundColor: '#6A5ACD' }]}>
              <ThemedText style={styles.webTagText}>{tag}</ThemedText>
              <TouchableOpacity style={styles.webTagRemove} onPress={() => removeTag(tag)}>
                <ThemedText style={styles.webTagRemoveText}>×</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
  webTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  webTagInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 12,
  },
  webAddTagButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  webTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  webTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  webTagRemove: {
    marginLeft: 8,
    padding: 2,
  },
  webTagRemoveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
