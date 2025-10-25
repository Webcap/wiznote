import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from '@/components/ThemedText';

interface RichTextViewerProps {
  content: string;
  style?: any;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  content,
  style,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // For now, we'll display the content as plain text
  // In the future, we can enhance this to parse and display HTML properly
  const displayContent = content || '';

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor, borderColor }, style]}>
        <div
          style={{
            padding: 16,
            fontSize: 16,
            lineHeight: 24,
            color: textColor,
            fontFamily: 'System',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      </View>
    );
  }

  // For native platforms, strip HTML tags and display as plain text
  const plainText = displayContent.replace(/<[^>]*>/g, '');
  
  return (
    <View style={[styles.container, { backgroundColor, borderColor }, style]}>
      <ThemedText style={styles.text}>
        {plainText}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
  },
  text: {
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});
