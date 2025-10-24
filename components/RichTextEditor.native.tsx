import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
  toolbarStyle?: any;
  editorStyle?: any;
}

interface ToolbarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  icon, 
  onPress, 
  isActive = false, 
  disabled = false 
}) => (
  <TouchableOpacity
    style={[
      styles.toolbarButton,
      isActive && styles.toolbarButtonActive,
      disabled && styles.toolbarButtonDisabled
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Ionicons 
      name={icon} 
      size={18} 
      color={disabled ? '#999' : isActive ? '#007AFF' : '#666'} 
    />
  </TouchableOpacity>
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  style,
  toolbarStyle,
  editorStyle
}) => {
  const [plainText, setPlainText] = useState(value);

  // Convert plain text to basic HTML
  const convertToHTML = (text: string): string => {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  };

  // Handle text change
  const handleTextChange = (text: string) => {
    setPlainText(text);
    const html = convertToHTML(text);
    onChange(html, text);
  };

  // For mobile, we'll provide a simple text input with basic formatting options
  // This is a simplified version - in a real app, you might want to use a more sophisticated approach
  return (
    <View style={[styles.container, style]}>
      {/* Simple toolbar for mobile */}
      <View style={[styles.toolbar, toolbarStyle]}>
        <Text style={styles.toolbarText}>Rich text editing is available on web</Text>
      </View>
      
      {/* Text input */}
      <TextInput
        style={[styles.textInput, editorStyle]}
        value={plainText}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        editable={!disabled}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
    backgroundColor: '#F8F9FA',
  },
  toolbarText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  toolbarButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  toolbarButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
  },
  textInput: {
    minHeight: 200,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
  },
});

export default RichTextEditor;
