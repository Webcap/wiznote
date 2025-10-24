import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const plainText = editorRef.current.textContent || '';
      onChange(html, plainText);
    }
  }, [onChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Save selection for toolbar operations
    if (window.getSelection) {
      setSelection(window.getSelection());
    }
  }, []);

  // Execute command helper
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  // Check if command is active
  const isCommandActive = useCallback((command: string): boolean => {
    return document.queryCommandState(command);
  }, []);

  // Toolbar buttons
  const toolbarButtons = [
    {
      icon: 'text' as const,
      command: 'bold',
      label: 'Bold'
    },
    {
      icon: 'text' as const,
      command: 'italic',
      label: 'Italic'
    },
    {
      icon: 'text' as const,
      command: 'underline',
      label: 'Underline'
    },
    {
      icon: 'list' as const,
      command: 'insertUnorderedList',
      label: 'Bullet List'
    },
    {
      icon: 'list' as const,
      command: 'insertOrderedList',
      label: 'Numbered List'
    },
    {
      icon: 'link' as const,
      command: 'createLink',
      label: 'Link'
    }
  ];

  // Handle link creation
  const handleCreateLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Handle heading
  const handleHeading = useCallback((level: number) => {
    execCommand('formatBlock', `h${level}`);
  }, [execCommand]);

  // Handle quote
  const handleQuote = useCallback(() => {
    execCommand('formatBlock', 'blockquote');
  }, [execCommand]);

  // Handle code
  const handleCode = useCallback(() => {
    execCommand('formatBlock', 'pre');
  }, [execCommand]);

  // Clear formatting
  const handleClearFormatting = useCallback(() => {
    execCommand('removeFormat');
  }, [execCommand]);

  // Render toolbar
  const renderToolbar = () => (
    <View style={[styles.toolbar, toolbarStyle]}>
      {/* Text formatting */}
      <View style={styles.toolbarGroup}>
        <ToolbarButton
          icon="text"
          onPress={() => execCommand('bold')}
          isActive={isCommandActive('bold')}
          disabled={disabled}
        />
        <ToolbarButton
          icon="text"
          onPress={() => execCommand('italic')}
          isActive={isCommandActive('italic')}
          disabled={disabled}
        />
        <ToolbarButton
          icon="text"
          onPress={() => execCommand('underline')}
          isActive={isCommandActive('underline')}
          disabled={disabled}
        />
      </View>

      {/* Lists */}
      <View style={styles.toolbarGroup}>
        <ToolbarButton
          icon="list"
          onPress={() => execCommand('insertUnorderedList')}
          isActive={isCommandActive('insertUnorderedList')}
          disabled={disabled}
        />
        <ToolbarButton
          icon="list"
          onPress={() => execCommand('insertOrderedList')}
          isActive={isCommandActive('insertOrderedList')}
          disabled={disabled}
        />
      </View>

      {/* Headings */}
      <View style={styles.toolbarGroup}>
        <ToolbarButton
          icon="text"
          onPress={() => handleHeading(1)}
          disabled={disabled}
        />
        <ToolbarButton
          icon="text"
          onPress={() => handleHeading(2)}
          disabled={disabled}
        />
        <ToolbarButton
          icon="text"
          onPress={() => handleHeading(3)}
          disabled={disabled}
        />
      </View>

      {/* Other formatting */}
      <View style={styles.toolbarGroup}>
        <ToolbarButton
          icon="link"
          onPress={handleCreateLink}
          disabled={disabled}
        />
        <ToolbarButton
          icon="text"
          onPress={handleQuote}
          disabled={disabled}
        />
        <ToolbarButton
          icon="code"
          onPress={handleCode}
          disabled={disabled}
        />
        <ToolbarButton
          icon="refresh"
          onPress={handleClearFormatting}
          disabled={disabled}
        />
      </View>
    </View>
  );

  // For web platform, render the actual rich text editor
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {renderToolbar()}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            ...styles.editor,
            ...editorStyle,
            borderColor: isFocused ? '#007AFF' : '#E1E1E1',
            backgroundColor: disabled ? '#F5F5F5' : '#FFFFFF'
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
      </View>
    );
  }

  // For native platforms, fall back to regular text input
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.nativeFallback}>
        Rich text editing is not available on mobile. Use the web version for rich text features.
      </Text>
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
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
    backgroundColor: '#F8F9FA',
    flexWrap: 'wrap',
  },
  toolbarGroup: {
    flexDirection: 'row',
    marginRight: 16,
    alignItems: 'center',
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
  editor: {
    minHeight: 200,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    outline: 'none',
    fontFamily: 'System',
  },
  nativeFallback: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default RichTextEditor;
