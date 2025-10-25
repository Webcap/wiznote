import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { RichTextEditor } from '@/components/web/RichTextEditor.web';

// Convert markdown-style formatting to HTML
const convertMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  let html = markdown;
  
  console.log('🧪 Converting markdown:', html);
  
  // Convert headings first
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Convert bold text (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  console.log('🧪 After bold conversion:', html);
  
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
  
  // Convert newlines to <br> tags
  html = html.replace(/\n/g, '<br>');
  
  // Wrap remaining text in paragraphs
  html = html.replace(/^(?!<[h1-6]|<ul|<li|<br|<p)(.*?)$/gm, '<p>$1</p>');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '<br>');
  
  console.log('🧪 Final HTML:', html);
  return html;
};

// Test function to verify conversion
const testConversion = () => {
  const testMarkdown = '**BOLD TEXT** and *italic* text';
  const result = convertMarkdownToHtml(testMarkdown);
  console.log('🧪 Test conversion:', { input: testMarkdown, output: result });
  return result;
};

// Test function to create a test note with rich text
const testRichTextNote = () => {
  const testContent = '**BOLD TEXT** and *italic* text with `code`';
  const htmlContent = convertMarkdownToHtml(testContent);
  console.log('🧪 Test rich text note:', {
    original: testContent,
    html: htmlContent,
    hasBold: testContent.includes('**'),
    hasItalic: testContent.includes('*'),
    hasCode: testContent.includes('`')
  });
  return { testContent, htmlContent };
};

// Run test on component mount
if (typeof window !== 'undefined') {
  (window as any).testMarkdownConversion = testConversion;
  (window as any).testRichTextNote = testRichTextNote;
}

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
  return (
    <ThemedView style={styles.webSection}>
      <View style={styles.webSectionHeader}>
        <View style={styles.webSectionTitleContainer}>
          <ThemedText style={styles.webSectionTitle}>Content</ThemedText>
          {isRichTextEnabled && (
            <View style={styles.richTextIndicator}>
              <Ionicons name="text" size={14} color="#4CAF50" />
              <ThemedText style={styles.richTextIndicatorText}>Rich Text</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.webSectionBadge}>
          <Ionicons name="create" size={16} color="#6A5ACD" />
          <ThemedText style={styles.webSectionBadgeText}>Required</ThemedText>
        </View>
      </View>


      {isRichTextEnabled ? (
        <RichTextEditor
          value={content}
          onChange={(newContent: string) => {
            setContent(newContent);
            // Convert markdown-style formatting to HTML
            const htmlContent = convertMarkdownToHtml(newContent);
            console.log('🔍 Rich Text Debug:', {
              original: newContent,
              converted: htmlContent,
              hasBold: newContent.includes('**'),
              boldRegex: /\*\*(.*?)\*\*/g.test(newContent)
            });
            setContentHtml(htmlContent);
            // Set content format to HTML when rich text is enabled
            if (setContentFormat) {
              setContentFormat('html');
            }
          }}
          placeholder="Start writing your note content here..."
          style={{ minHeight: 300 }}
        />
      ) : (
        <TextInput
          style={[styles.webTextarea, { backgroundColor: inputBg, color: inputText, borderColor }]}
          value={content}
          onChangeText={setContent}
          placeholder="Start writing your note content here..."
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
  },
});
