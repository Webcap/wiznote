import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedSaveStatus } from '@/components/EnhancedSaveStatus';

interface CreateNoteHeaderProps {
  isEditMode: boolean;
  isRichTextEnabled: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: string | null;
  error: string | null;
  handleSave: () => void;
  handleDiscard: () => void;
  renderSaveStatus: () => React.ReactNode;
  inputText: string;
}

export const CreateNoteHeader: React.FC<CreateNoteHeaderProps> = ({
  isEditMode,
  isRichTextEnabled,
  isSaveDisabled,
  isSaving,
  handleSave,
  handleDiscard,
  renderSaveStatus,
  inputText,
}) => {
  return (
    <ThemedView style={styles.webHeader}>
      <View style={styles.webHeaderLeft}>
        <TouchableOpacity 
          style={[styles.webBackButton, isSaving && styles.webBackButtonDisabled]} 
          onPress={handleDiscard}
          disabled={isSaving}
        >
          <Ionicons name="arrow-back" size={20} color={isSaving ? '#999' : inputText} />
          <ThemedText style={[styles.webBackText, isSaving && styles.webBackTextDisabled]}>
            Back
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.webHeaderCenter}>
        <View style={styles.webHeaderTitleContainer}>
          <ThemedText style={styles.webHeaderTitle}>
            {isEditMode ? 'Edit Note' : 'Create a Note'}
          </ThemedText>
          {isRichTextEnabled && (
            <View style={styles.webRichTextBadge}>
              <Ionicons name="text" size={12} color="#4CAF50" />
              <ThemedText style={styles.webRichTextBadgeText}>Rich Text</ThemedText>
            </View>
          )}
        </View>
        {renderSaveStatus()}
      </View>

      <View style={styles.webHeaderRight}>
        <TouchableOpacity
          style={[
            styles.webSaveButton,
            {
              backgroundColor: isSaveDisabled ? '#9CA3AF' : '#6A5ACD',
              opacity: isSaveDisabled ? 0.5 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isSaveDisabled}
        >
          <ThemedText style={[styles.webSaveButtonText, { color: '#FFFFFF' }]}>
            {isSaving ? 'Saving...' : 'Save Note'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 16,
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 16,
      },
    } : {}),
  },
  webHeaderLeft: {
    flex: 1,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
  },
  webBackText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  webBackButtonDisabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  webBackTextDisabled: {
    color: '#999',
  },
  webHeaderCenter: {
    flex: 2,
    alignItems: 'center',
  },
  webHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  webRichTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  webRichTextBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  webHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  webSaveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
