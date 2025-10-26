import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '../../hooks/useThemeColor';

interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  style,
  disabled = false,
}) => {
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (__DEV__) {
      console.log('🔍 RichTextEditor handleKeyDown:', {
        key: e.key,
        value: value,
        selectionStart: e.currentTarget.selectionStart,
        selectionEnd: e.currentTarget.selectionEnd
      });
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      const newValue =
        value.substring(0, selectionStart) +
        '  ' + // Two spaces for indentation
        value.substring(selectionEnd);
      
      onChange(newValue);

      // This is a trick to move the cursor after the inserted spaces
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  };

  const applyFormatting = (format: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newValue = '';
    let newCursorPos = start;
    
    switch (format) {
      case 'bold':
        newValue = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
        newCursorPos = selectedText ? start + 2 : start + 2;
        break;
      case 'italic':
        newValue = value.substring(0, start) + `*${selectedText}*` + value.substring(end);
        newCursorPos = selectedText ? start + 1 : start + 1;
        break;
      case 'underline':
        newValue = value.substring(0, start) + `__${selectedText}__` + value.substring(end);
        newCursorPos = selectedText ? start + 2 : start + 2;
        break;
      case 'heading1':
        newValue = value.substring(0, start) + `# ${selectedText}` + value.substring(end);
        newCursorPos = start + 2;
        break;
      case 'heading2':
        newValue = value.substring(0, start) + `## ${selectedText}` + value.substring(end);
        newCursorPos = start + 3;
        break;
      case 'heading3':
        newValue = value.substring(0, start) + `### ${selectedText}` + value.substring(end);
        newCursorPos = start + 4;
        break;
      case 'bullet':
        newValue = value.substring(0, start) + `• ${selectedText}` + value.substring(end);
        newCursorPos = start + 2;
        break;
      case 'number':
        newValue = value.substring(0, start) + `1. ${selectedText}` + value.substring(end);
        newCursorPos = start + 3;
        break;
      case 'code':
        newValue = value.substring(0, start) + `\`${selectedText}\`` + value.substring(end);
        newCursorPos = selectedText ? start + 1 : start + 1;
        break;
      case 'link':
        newValue = value.substring(0, start) + `[${selectedText || 'link text'}](url)` + value.substring(end);
        newCursorPos = start + (selectedText ? selectedText.length + 3 : 10);
        break;
    }
    
    onChange(newValue);
    
    // Set cursor position after formatting
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor, borderColor }]}>
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('bold')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>B</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('italic')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>I</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('underline')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>U</ThemedText>
        </TouchableOpacity>
        
        <View style={[styles.toolbarSeparator, { backgroundColor: borderColor }]} />
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('heading1')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>H1</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('heading2')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>H2</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('heading3')}
        >
          <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>H3</ThemedText>
        </TouchableOpacity>
        
        <View style={[styles.toolbarSeparator, { backgroundColor: borderColor }]} />
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('bullet')}
        >
          <Ionicons name="list" size={16} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('number')}
        >
          <Ionicons name="list-outline" size={16} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('code')}
        >
          <Ionicons name="code" size={16} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor }]}
          onPress={() => applyFormatting('link')}
        >
          <Ionicons name="link" size={16} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* Text Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          if (__DEV__) {
            console.log('🔍 RichTextEditor onChange:', {
              oldValue: value,
              newValue: newValue,
              length: newValue.length
            });
          }
          onChange(newValue);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          ...styles.editor,
          backgroundColor,
          color: textColor,
          borderColor,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    gap: 4,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 8,
        paddingVertical: 10,
        gap: 6,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      },
    } : {}),
  },
  toolbarButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: 10,
        paddingVertical: 8,
      },
    } : {}),
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toolbarSeparator: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  editor: {
    width: '100%',
    minHeight: 300,
    padding: 16,
    border: 'none',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    fontFamily: 'sans-serif',
    fontSize: 16,
    lineHeight: 1.5,
    outline: 'none',
    resize: 'vertical',
    backgroundColor: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    verticalAlign: 'top',
    boxSizing: 'border-box',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 16,
        minHeight: 250,
        padding: 12,
      },
      '@media (max-width: 480px)': {
        minHeight: 200,
        padding: 10,
      },
    } : {}),
  },
});
