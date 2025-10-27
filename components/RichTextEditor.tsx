import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, TextInput as RNTextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
}

 // Quill editor HTML template for mobile WebView
const getQuillHTML = (placeholder: string, backgroundColor: string, textColor: string, borderColor: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${backgroundColor};
      color: ${textColor};
      height: auto;
      min-height: 200px;
    }
    #editor {
      min-height: 200px;
      font-size: 16px;
      line-height: 24px;
      height: auto;
    }
    .ql-editor {
      color: ${textColor} !important;
      background: ${backgroundColor} !important;
      min-height: 200px;
      height: auto;
    }
    .ql-editor.ql-blank::before {
      color: #999 !important;
      font-style: normal;
    }
    .ql-container {
      border: none !important;
      border-radius: 0 !important;
      background: ${backgroundColor} !important;
    }
    .ql-toolbar {
      border: none !important;
      border-bottom: 1px solid ${borderColor} !important;
      background: ${backgroundColor} !important;
    }
    .ql-stroke {
      stroke: ${textColor} !important;
    }
    .ql-fill {
      fill: ${textColor} !important;
    }
    .ql-picker-label {
      color: ${textColor} !important;
    }
    .ql-snow .ql-picker-options {
      background: ${backgroundColor} !important;
      border-color: ${borderColor} !important;
    }
    .ql-snow .ql-picker-item {
      color: ${textColor} !important;
    }
  </style>
</head>
<body>
  <div id="editor" placeholder="${placeholder}"></div>
  <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
  <script>
    var quill = new Quill('#editor', {
      theme: 'snow',
      placeholder: '${placeholder}',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'header': [1, 2, 3, false] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['code-block']
        ]
      }
    });
    
    quill.on('text-change', function(delta, oldContents, source) {
      if (source === 'user') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'content-change',
          html: quill.root.innerHTML,
          text: quill.getText()
        }));
      }
    });
    
    // Expose function to set content
    window.setQuillContent = function(html) {
      quill.root.innerHTML = html || '';
      // Ensure editor expands to fit content
      setTimeout(function() {
        var editor = quill.root;
        editor.style.height = 'auto';
        editor.style.overflow = 'visible';
      }, 100);
    };
    
    // Notify ready
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ready'
    }));
  </script>
</body>
</html>
`;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('🔍 RichTextEditor handleMessage:', data.type);
      
      if (data.type === 'ready') {
        console.log('🔍 RichTextEditor: Editor ready');
        setIsReady(true);
        if (value && webViewRef.current) {
          setTimeout(() => {
            // Use injectJavaScript to call the function directly
            webViewRef.current?.injectJavaScript(`
              try {
                if (window.setQuillContent) {
                  window.setQuillContent(${JSON.stringify(value)});
                }
              } catch (e) {
                console.error('Error setting content:', e);
              }
            `);
          }, 100);
        }
      } else if (data.type === 'content-change') {
        console.log('🔍 RichTextEditor: Content changed', { 
          htmlLength: data.html?.length, 
          htmlPreview: data.html?.substring(0, 100),
          textLength: data.text?.length 
        });
        onChange?.(data.html, data.text || '');
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [value, onChange]);

  useEffect(() => {
    if (isReady && value && webViewRef.current) {
      // Use injectJavaScript to call the function directly
      webViewRef.current.injectJavaScript(`
        try {
          if (window.setQuillContent) {
            window.setQuillContent(${JSON.stringify(value)});
          }
        } catch (e) {
          console.error('Error setting content:', e);
        }
      `);
    }
  }, [value, isReady]);

  // For mobile, use WebView with Quill
  return (
    <View style={[styles.container, style, { backgroundColor }]}>
      <WebView
        ref={webViewRef}
        source={{ html: getQuillHTML(placeholder, backgroundColor, textColor, borderColor) }}
        style={[styles.webview, style, { backgroundColor }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
    maxHeight: '100%',
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  webview: {
    flex: 1,
    height: '100%',
  },
});
