import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { EnrichedTextInput, EnrichedTextInputInstance, OnChangeStateEvent } from 'react-native-enriched';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from '@/components/ThemedText';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
}

interface ToolbarButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  isActive?: boolean;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  icon, 
  label, 
  onPress, 
  isActive = false,
  textColor = '#000000',
  backgroundColor = '#FFFFFF',
  borderColor = '#E1E1E1'
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.toolbarButton, 
        { 
          backgroundColor: isActive ? '#E3F2FD' : backgroundColor,
          borderColor: isActive ? '#2196F3' : borderColor,
          borderWidth: 1,
        }
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={isActive ? '#2196F3' : textColor} />}
      {label && <ThemedText style={[styles.toolbarButtonText, { color: isActive ? '#2196F3' : textColor }]}>{label}</ThemedText>}
    </TouchableOpacity>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  style,
}) => {
  const editorRef = useRef<EnrichedTextInputInstance>(null);
  const [stylesState, setStylesState] = useState<OnChangeStateEvent | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'tint');

  // Handle text changes
  const handleChangeText = useCallback((text: string) => {
    onChange?.(text, text); // For now, we'll use the same text for both HTML and plain text
  }, [onChange]);

  // Handle HTML changes
  const handleChangeHtml = useCallback((html: string) => {
    onChange?.(html, html); // We'll extract plain text from HTML if needed
  }, [onChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Handle state changes (for toolbar button states)
  const handleChangeState = useCallback((event: { nativeEvent: OnChangeStateEvent }) => {
    setStylesState(event.nativeEvent);
  }, []);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value) {
      // Set initial content if needed
      // Note: react-native-enriched might handle this automatically
    }
  }, [value]);

  // Inject CSS to force text alignment on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        /* Target react-native-enriched specific classes and force top alignment */
        [data-testid="enriched-text-input"],
        .enriched-text-input,
        div[contenteditable="true"],
        div[contenteditable="true"] > div,
        div[contenteditable="true"] > p,
        div[contenteditable="true"] > span,
        div[contenteditable="true"] > * {
          display: block !important;
          text-align: left !important;
          vertical-align: top !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 24px !important;
          min-height: auto !important;
          height: auto !important;
          position: relative !important;
          top: 0 !important;
          transform: none !important;
        }
        
        /* Force the container to start content at the very top */
        div[contenteditable="true"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
          padding: 16px !important;
          min-height: 200px !important;
          height: auto !important;
          overflow: visible !important;
          position: relative !important;
        }
        
        /* Ensure first child starts at the very top with no margins */
        div[contenteditable="true"] > *:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        
        /* Remove all default paragraph margins and positioning */
        div[contenteditable="true"] p {
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          position: static !important;
          top: auto !important;
          bottom: auto !important;
          transform: none !important;
        }
        
        /* Force all text elements to behave normally */
        div[contenteditable="true"] * {
          position: static !important;
          top: auto !important;
          bottom: auto !important;
          left: auto !important;
          right: auto !important;
          transform: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Override any centering or middle alignment */
        div[contenteditable="true"],
        div[contenteditable="true"] * {
          text-align: left !important;
          vertical-align: top !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Theme-aware Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: backgroundColor, borderBottomColor: borderColor }]}>
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleBold()}
            label="B"
            isActive={stylesState?.isBold}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleItalic()}
            label="I"
            isActive={stylesState?.isItalic}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleUnderline()}
            label="U"
            isActive={stylesState?.isUnderline}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
        </View>
        
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon="list"
            onPress={() => editorRef.current?.toggleUnorderedList()}
            label="•"
            isActive={stylesState?.isUnorderedList}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="list"
            onPress={() => editorRef.current?.toggleOrderedList()}
            label="1."
            isActive={stylesState?.isOrderedList}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
        </View>

        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleH1()}
            label="H1"
            isActive={stylesState?.isH1}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleH2()}
            label="H2"
            isActive={stylesState?.isH2}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="text"
            onPress={() => editorRef.current?.toggleH3()}
            label="H3"
            isActive={stylesState?.isH3}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
        </View>

        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon="code"
            onPress={() => editorRef.current?.toggleInlineCode()}
            label="Code"
            isActive={stylesState?.isInlineCode}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
          <ToolbarButton
            icon="code"
            onPress={() => editorRef.current?.toggleCodeblock()}
            label="Block"
            isActive={stylesState?.isCodeblock}
            textColor={textColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
          />
        </View>
      </View>

      {/* Rich Text Editor */}
      <EnrichedTextInput
        ref={editorRef}
        onChangeText={handleChangeText}
        onChangeHtml={handleChangeHtml}
        onChangeState={handleChangeState}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        editable={!disabled}
        multiline={true}
        textAlignVertical="top"
        testID="enriched-text-input"
        style={[
          styles.editor,
          {
            backgroundColor: disabled ? '#F5F5F5' : backgroundColor,
            color: textColor,
            borderColor: isFocused ? accentColor : borderColor,
          },
          style,
        ]}
        htmlStyle={{
          fontSize: 16,
          lineHeight: 24,
          fontFamily: 'System',
          margin: 0,
          padding: '16px',
          textAlign: 'left',
          verticalAlign: 'top',
          display: 'block',
          minHeight: '200px',
          height: 'auto',
          // Force text to start at the top
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          // Remove any centering
          textAlignVertical: 'top',
          // Ensure proper text flow
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          // Override any positioning
          position: 'relative',
          top: 'auto',
          bottom: 'auto',
          left: 'auto',
          right: 'auto',
          transform: 'none',
          // Force content to start at top
          flexDirection: 'column',
          alignContent: 'flex-start',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  toolbarGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  toolbarButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editor: {
    flex: 1,
    padding: 0,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    // Force text alignment to top
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    // Remove any default centering
    textAlign: 'left',
    verticalAlign: 'top',
    // Ensure proper positioning
    position: 'relative',
    height: 'auto',
    minHeight: 200,
    // Override any centering behavior
    alignContent: 'flex-start',
    alignSelf: 'stretch',
  },
});
