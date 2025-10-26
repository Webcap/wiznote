import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

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
  // Memoize HTML content generation to prevent unnecessary WebView recreation
  const htmlContent = useMemo(() => {
    if (!content) return '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 16px;
              line-height: 24px;
              color: #333333;
              background-color: #FFFFFF;
            }
            h1, h2, h3, h4, h5, h6 {
              margin: 16px 0 8px 0;
              font-weight: 600;
            }
            h1 { font-size: 28px; }
            h2 { font-size: 24px; }
            h3 { font-size: 20px; }
            p {
              margin: 8px 0;
            }
            ul, ol {
              margin: 8px 0;
              padding-left: 24px;
            }
            li {
              margin: 4px 0;
            }
            strong {
              font-weight: 600;
            }
            em {
              font-style: italic;
            }
            u {
              text-decoration: underline;
            }
            code {
              background-color: #F5F5F5;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
            }
            a {
              color: #007AFF;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }, [content]);

  if (__DEV__) {
    console.log('🔍 RichTextViewerNative received:', {
      contentFormat,
      contentLength: content?.length,
      contentPreview: content?.substring(0, 100),
      shouldRenderHTML: contentFormat === 'html' && content
    });
  }
  
  // For HTML content, render in WebView for proper formatting
  if (contentFormat === 'html' && content) {
    return (
      <View style={[styles.container, style]}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          scalesPageToFit={false}
          nestedScrollEnabled={true}
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
    minHeight: 100,
  },
  webview: {
    flex: 1,
    minHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    padding: 20,
  },
});

// Memoize component to prevent unnecessary re-renders
export const RichTextViewer = memo(RichTextViewerComponent, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.contentFormat === nextProps.contentFormat &&
    JSON.stringify(prevProps.textStyle) === JSON.stringify(nextProps.textStyle)
  );
});

export default RichTextViewer;
