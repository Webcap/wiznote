import React, { useMemo, memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColor } from '@/hooks/useThemeColor';

interface RichTextViewerProps {
  content: string;
  contentFormat?: 'plain' | 'html';
  style?: any;
  textStyle?: any;
}

const RichTextViewerComponent: React.FC<RichTextViewerProps> = ({
  content,
  contentFormat = 'plain',
  style,
  textStyle
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textSecondary');
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Memoize HTML content generation to prevent unnecessary WebView recreation
  const htmlContent = useMemo(() => {
    if (!content) return '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow-y: auto;
              overflow-x: hidden;
            }
            body {
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 16px;
              line-height: 24px;
              color: ${textColor};
              background-color: ${backgroundColor};
              word-wrap: break-word;
              -webkit-text-size-adjust: 100%;
            }
            h1, h2, h3, h4, h5, h6 {
              margin: 16px 0 8px 0;
              font-weight: 600;
              color: ${textColor};
            }
            h1 { font-size: 28px; }
            h2 { font-size: 24px; }
            h3 { font-size: 20px; }
            p {
              margin: 8px 0;
              color: ${textColor};
            }
            ul, ol {
              margin: 8px 0;
              padding-left: 24px;
            }
            li {
              margin: 4px 0;
              color: ${textColor};
            }
            strong {
              font-weight: 600;
              color: ${textColor};
            }
            em {
              font-style: italic;
              color: ${textColor};
            }
            u {
              text-decoration: underline;
              color: ${textColor};
            }
            code {
              background-color: ${backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff' ? '#F5F5F5' : 'rgba(106, 90, 205, 0.2)'};
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              color: ${textColor};
            }
            a {
              color: #007AFF;
              text-decoration: none;
            }
          </style>
          <script>
            function updateHeight() {
              const height = Math.max(
                document.documentElement.scrollHeight,
                document.documentElement.clientHeight
              );
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'height',
                height: height
              }));
            }
            
            // Update height on load
            window.addEventListener('load', updateHeight);
            
            // Also update immediately in case load already fired
            setTimeout(updateHeight, 100);
          </script>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }, [content, backgroundColor, textColor]);

  if (__DEV__) {
    console.log('🔍 RichTextViewerNative received:', {
      contentFormat,
      contentLength: content?.length,
      contentPreview: content?.substring(0, 100),
      shouldRenderHTML: contentFormat === 'html' && content
    });
  }
  
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height') {
        setContentHeight(data.height);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Reset height when content changes
  useEffect(() => {
    setContentHeight(undefined);
  }, [content]);

  // For HTML content, render in WebView for proper formatting
  if (contentFormat === 'html' && content) {
    return (
      <View style={[styles.container, style, { backgroundColor }]}>
        <WebView
          source={{ html: htmlContent }}
          style={[styles.webview, { 
            backgroundColor, 
            height: contentHeight || 300,
            minHeight: 300 
          }]}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          scalesPageToFit={true}
          nestedScrollEnabled={true}
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
          onMessage={handleMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (__DEV__) console.error('🔍 RichTextViewer WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (__DEV__) console.error('🔍 RichTextViewer WebView HTTP error:', nativeEvent);
          }}
          onLoad={() => {
            if (__DEV__) console.log('🔍 RichTextViewer WebView loaded successfully');
          }}
        />
      </View>
    );
  }

  // For plain text, just display as text
  const displayText = content || '';
  
  return (
    <View style={[styles.container, style, { backgroundColor }]}>
      <Text style={[styles.textContent, textStyle, { color: textColor }]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  webview: {
    width: '100%',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    padding: 20,
  },
});

// Memoize component to prevent unnecessary re-renders
export const RichTextViewer = memo(RichTextViewerComponent);

export default RichTextViewer;
