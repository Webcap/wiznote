import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { RichTextEditor } from './RichTextEditor.web';

// Test component to verify rich text editor positioning
export const RichTextEditorTest: React.FC = () => {
  const [content, setContent] = useState('');
  const [contentHtml, setContentHtml] = useState('');

  const handleChange = (html: string, plainText: string) => {
    setContentHtml(html);
    setContent(plainText);
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <p>Rich text editor test is only available on web</p>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <h2>Rich Text Editor Test</h2>
      <p>Text should start at the first line when you click in the editor.</p>
      
      <RichTextEditor
        value={contentHtml || content}
        onChange={handleChange}
        placeholder="Click here and start typing - text should appear at the first line"
        style={styles.editor}
      />
      
      <div style={styles.debug}>
        <h3>Debug Info:</h3>
        <p><strong>Plain Text:</strong> {content || '(empty)'}</p>
        <p><strong>HTML:</strong> {contentHtml || '(empty)'}</p>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    maxWidth: 800,
    margin: '0 auto',
  },
  editor: {
    marginVertical: 20,
  },
  debug: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    fontFamily: 'monospace',
  },
});

export default RichTextEditorTest;
