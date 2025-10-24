import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { sanitizeNoteContent } from '../utils/sanitization';

interface RichTextViewerProps {
  content: string;
  contentFormat?: 'plain' | 'html';
  style?: any;
  textStyle?: any;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  content,
  contentFormat = 'plain',
  style,
  textStyle
}) => {
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    
    // If content format is plain, return as is
    if (contentFormat === 'plain') {
      return content;
    }
    
    // For HTML content, use the robust sanitization utility
    return sanitizeNoteContent(content);
  }, [content, contentFormat]);

  // For web platform, render HTML content
  if (Platform.OS === 'web' && contentFormat === 'html') {
    return (
      <View style={[styles.container, style]}>
        <div
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          style={{
            ...styles.htmlContent,
            ...textStyle
          }}
        />
      </View>
    );
  }

  // For native platforms or plain text, render as regular text
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.textContent, textStyle]}>
        {contentFormat === 'html' ? sanitizedContent.replace(/<[^>]*>/g, '') : content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  htmlContent: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
    color: '#333',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

export default RichTextViewer;
