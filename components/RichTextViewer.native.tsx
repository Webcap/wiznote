import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

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
  // For mobile, we'll strip HTML tags and display as plain text
  const displayText = contentFormat === 'html' 
    ? content.replace(/<[^>]*>/g, '') // Strip HTML tags
    : content;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.textContent, textStyle]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

export default RichTextViewer;
