import React, { useMemo, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { RichTextEditor } from '@/components/web/RichTextEditor.web';
import { useTranslation } from '@/hooks/useTranslation';

// Convert markdown-style formatting to HTML
const convertMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  let html = markdown;
  
  if (__DEV__) console.log('🧪 Converting markdown:', html);
  
  // Convert headings first
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Convert bold text (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (__DEV__) console.log('🧪 After bold conversion:', html);
  
  // Convert italic text (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert underline (__text__)
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  
  // Convert bullet lists (• text)
  html = html.replace(/^• (.*?)$/gm, '<li>$1</li>');
  
  // Convert numbered lists (1. text)
  html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> elements in <ul> tags
  html = html.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/g, (match) => {
    return `<ul>${match}</ul>`;
  });
  
  // Convert inline code (`code`)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Convert links ([text](url))
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Turn intentional blank lines into compact spacers
  html = html.replace(/\n\s*\n+/g, '\n<div class="rtv-spacer"></div>\n');

  // Wrap plain text lines into paragraphs (no margins via CSS)
  // Do NOT wrap lines that already start with known block tags
  html = html.replace(/^(?!<h[1-6]|<ul|<ol|<li|<p|<blockquote|<pre|<code|<div)(.+)$/gm, '<p>$1</p>');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '<br>');
  
  if (__DEV__) console.log('🧪 Final HTML:', html);
  return html;
};

interface NoteContentEditorProps {
  isRichTextEnabled: boolean;
  content: string;
  setContent: (content: string) => void;
  setContentHtml: (html: string) => void;
  setContentFormat?: (format: 'plain' | 'html') => void;
  inputBg: string;
  inputText: string;
  borderColor: string;
  placeholderColor: string;
}

export const NoteContentEditor: React.FC<NoteContentEditorProps> = ({
  isRichTextEnabled,
  content,
  setContent,
  setContentHtml,
  setContentFormat,
  inputBg,
  inputText,
  borderColor,
  placeholderColor,
}) => {
  // Memoize HTML conversion to prevent unnecessary re-computation
  const htmlContent = useMemo(() => {
    if (!isRichTextEnabled || !content) return '';
    return convertMarkdownToHtml(content);
  }, [content, isRichTextEnabled]);

  // Update HTML content when memoized value changes
  useEffect(() => {
    if (isRichTextEnabled && htmlContent) {
      setContentHtml(htmlContent);
    }
  }, [htmlContent, isRichTextEnabled, setContentHtml]);
  
  const { t } = useTranslation();
  
  return (
    <ThemedView style={styles.webSection}>
      <View style={styles.webSectionHeader}>
        <View style={styles.webSectionTitleContainer}>
          <ThemedText style={styles.webSectionTitle}>{t('createNote.content')}</ThemedText>
          {isRichTextEnabled && (
            <View style={styles.richTextIndicator}>
              <Ionicons name="text" size={14} color="#4CAF50" />
              <ThemedText style={styles.richTextIndicatorText}>{t('createNote.richText')}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.webSectionBadge}>
          <Ionicons name="create" size={16} color="#6A5ACD" />
          <ThemedText style={styles.webSectionBadgeText}>{t('createNote.required')}</ThemedText>
        </View>
      </View>


      {isRichTextEnabled ? (
        <RichTextEditor
          value={content}
          onChange={(newContent: string) => {
            setContent(newContent);
            // HTML conversion is now handled by useMemo above
            // Set content format to HTML when rich text is enabled
            if (setContentFormat) {
              setContentFormat('html');
            }
          }}
          placeholder={t('createNote.startWritingContent')}
          style={{ minHeight: 300 }}
        />
      ) : (
        <TextInput
          style={[styles.webTextarea, { backgroundColor: inputBg, color: inputText, borderColor }]}
          value={content}
          onChangeText={setContent}
          placeholder={t('createNote.startWritingContent')}
          placeholderTextColor={placeholderColor}
          multiline
          textAlignVertical="top"
        />
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
  webSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  richTextIndicator: {
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
  richTextIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
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
  webTextarea: {
    minHeight: 300,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    lineHeight: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 12,
        paddingTop: 12,
        fontSize: 16,
        minHeight: 250,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 10,
        paddingTop: 10,
        fontSize: 16,
        minHeight: 200,
      },
    } : {}),
  },
});
