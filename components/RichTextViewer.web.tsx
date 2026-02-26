import React, { useMemo, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { sanitizeNoteContent } from '../utils/sanitization';

interface RichTextViewerProps {
  content: string;
  contentFormat?: 'plain' | 'html';
  style?: any;
  textStyle?: any;
  /** Use tighter spacing (e.g. for shared note view) */
  compact?: boolean;
}

const RichTextViewerComponent: React.FC<RichTextViewerProps> = ({
  content,
  contentFormat = 'plain',
  style,
  textStyle,
  compact = false,
}) => {
  const colorAppliedRef = useRef<string | null>(null);
  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    
    let html: string;
    
    // If content format is plain, convert markdown-like formatting to HTML
    if (contentFormat === 'plain') {
      let html = content;
      
      // Convert markdown-style formatting to HTML
      // Headers
      html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
      
      // Convert all H1 headers consistently
      html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
      
      // Bold text (**text** or __text__)
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      // Italic text (*text* or _text_)
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Underline text
      html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
      
      // Lists
      html = html.replace(/^[\s]*[-*+] (.*?)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
      
      // Numbered lists
      html = html.replace(/^[\s]*\d+\. (.*?)$/gm, '<li>$1</li>');
      
      // Turn intentional blank lines into compact spacers
      html = html.replace(/\n\s*\n+/g, '\n<div class="rtv-spacer"></div>\n');

      // Convert single-line breaks to paragraphs instead of <br>
      // Do NOT wrap lines that already start with known block tags
      html = html.replace(/^(?!<h[1-6]|<ul|<ol|<li|<p|<blockquote|<pre|<code|<div)(.+)$/gm, '<p>$1</p>');
      
      // Don't wrap in paragraphs - let headings stand alone
      // if (!html.includes('<p>') && !html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>')) {
      //   html = `<p>${html}</p>`;
      // }
      
      // Debug log for line break conversion
      if (__DEV__) {
        console.log('🔍 RichTextViewer: Line break conversion:', {
          originalLength: content.length,
          convertedLength: html.length,
          hasBrTags: html.includes('<br>'),
          hasPTags: html.includes('<p>'),
          brCount: (html.match(/<br>/g) || []).length,
          pCount: (html.match(/<p>/g) || []).length,
          preview: html.substring(0, 200),
          fullHtml: html
        });
      }
      
      html = sanitizeNoteContent(html);
    } else {
      // For HTML content, use the robust sanitization utility
      html = sanitizeNoteContent(content);
    }

    // Compact mode: collapse block structure to eliminate line gaps (shared notes)
    if (compact && html) {
      // Remove empty paragraphs
      html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
      html = html.replace(/<p>\s*<\/p>/gi, '');
      // Merge consecutive paragraphs into one block with <br> between lines
      html = html.replace(/<\/p>\s*<p>/gi, '<br>');
      // Merge consecutive divs that wrap single blocks (e.g. <div><p>A</p></div><div><p>B</p></div>)
      html = html.replace(/<\/div>\s*<div>/gi, '<br>');
    }

    return html;
  }, [content, contentFormat, compact]);

  // Inject CSS styles for rich text rendering
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'rich-text-viewer-styles';
      let existingStyle = document.getElementById(styleId);
      
      if (!existingStyle) {
        existingStyle = document.createElement('style');
        existingStyle.id = styleId;
        existingStyle.textContent = `
          .rich-text-viewer {
            line-height: 1.35;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
            background-color: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Compact: minimal margins on all block elements */
          .rich-text-viewer > *:first-child {
            margin-top: 0 !important;
          }
          .rich-text-viewer > *:last-child {
            margin-bottom: 0 !important;
          }
          
          .rich-text-viewer,
          .rich-text-viewer *,
          .rich-text-viewer *::before,
          .rich-text-viewer *::after {
            background-color: transparent !important;
          }
          
          .rich-text-viewer * {
            color: inherit !important;
          }
          
          .rich-text-viewer h1,
          .rich-text-viewer h2,
          .rich-text-viewer h3,
          .rich-text-viewer h4,
          .rich-text-viewer h5,
          .rich-text-viewer h6,
          .rich-text-viewer p,
          .rich-text-viewer div,
          .rich-text-viewer span,
          .rich-text-viewer li,
          .rich-text-viewer td,
          .rich-text-viewer th,
          .rich-text-viewer strong,
          .rich-text-viewer b,
          .rich-text-viewer em,
          .rich-text-viewer i,
          .rich-text-viewer u,
          .rich-text-viewer code {
            color: inherit !important;
          }
          
          .rich-text-viewer h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            color: inherit !important;
            display: block !important;
            text-align: left !important;
            line-height: 1 !important;
          }
          
          .rich-text-viewer h1 + * {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          
          .rich-text-viewer * + h1 {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          
          /* Remove spacing between consecutive H1s */
          .rich-text-viewer h1 + br + h1 {
            margin-top: 0 !important;
          }
          
          .rich-text-viewer br + h1 {
            margin-top: 0 !important;
          }
          
          
          .rich-text-viewer h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0.35em 0 0.15em 0 !important;
            line-height: 1.25;
            color: inherit !important;
            border-bottom: 1px solid currentColor;
            border-bottom-opacity: 0.15;
            padding-bottom: 0.2rem;
          }
          
          .rich-text-viewer h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.3em 0 0.12em 0 !important;
            line-height: 1.25;
            color: inherit !important;
          }
          
          .rich-text-viewer h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0.25em 0 0.1em 0 !important;
            line-height: 1.3;
            color: inherit !important;
          }
          
          .rich-text-viewer h5 {
            font-size: 1rem;
            font-weight: 600;
            margin: 0.2em 0 0.08em 0 !important;
            line-height: 1.3;
            color: inherit !important;
          }
          
          .rich-text-viewer h6 {
            font-size: 0.875rem;
            font-weight: 600;
            margin: 0.2em 0 0.08em 0 !important;
            line-height: 1.3;
            color: inherit !important;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .rich-text-viewer p {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.4 !important;
            color: inherit !important;
          }

          /* Collapse empty paragraphs to avoid big gaps */
          .rich-text-viewer p:empty {
            display: none !important;
          }

          /* Compact spacing for paragraphs that only contain <br> (common editor output) */
          .rich-text-viewer p:has(> br:only-child) {
            margin: 0 0 0.2em 0 !important;
            padding: 0 !important;
            line-height: 0 !important;
            min-height: 0 !important;
          }

          .rich-text-viewer p:has(> br:only-child) br {
            display: none !important;
          }

          /* Compact spacer for intentional blank lines */
          .rich-text-viewer .rtv-spacer {
            display: block;
            height: 0.3rem;
            margin: 0;
            padding: 0;
          }
          
          .rich-text-viewer span,
          .rich-text-viewer div {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .rich-text-viewer p:first-child {
            margin-top: 0;
          }
          
          .rich-text-viewer p:last-child {
            margin-bottom: 0;
          }
          
          .rich-text-viewer ul, .rich-text-viewer ol {
            margin: 0.25em 0 !important;
            padding-left: 1.5rem;
            color: inherit !important;
          }
          
          .rich-text-viewer ul {
            list-style-type: disc;
          }
          
          .rich-text-viewer ol {
            list-style-type: decimal;
          }
          
          .rich-text-viewer li {
            margin: 0.08em 0 !important;
            line-height: 1.4;
            color: inherit !important;
          }

          .rich-text-viewer img {
            margin: 0.2em 0 !important;
            padding: 0 !important;
            max-width: 100%;
            height: auto;
            display: block;
            vertical-align: middle;
          }
          
          .rich-text-viewer strong, .rich-text-viewer b {
            font-weight: 700 !important;
            color: inherit !important;
            font-style: normal !important;
            text-decoration: none !important;
            margin: 0 !important;
            padding: 0 !important;
            line-height: inherit !important;
          }
          
          /* Special rule for H1-style strong elements */
          .rich-text-viewer strong[style*="font-size: 3rem"] {
            font-size: 3rem !important;
            font-weight: 700 !important;
            display: inline !important;
          }
          
          
          .rich-text-viewer em, .rich-text-viewer i {
            font-style: italic;
            color: inherit !important;
          }
          
          .rich-text-viewer u {
            text-decoration: underline;
            color: inherit !important;
          }
          
          .rich-text-viewer s, .rich-text-viewer del {
            text-decoration: line-through;
            color: inherit !important;
          }
          
          .rich-text-viewer a {
            color: #6A5ACD;
            text-decoration: underline;
            transition: all 0.2s ease;
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
            margin: 0 -0.125rem;
          }
          
          .rich-text-viewer a:hover {
            color: #5A4ABD;
            background-color: rgba(106, 90, 205, 0.1);
            text-decoration: none;
          }
          
          .rich-text-viewer a:focus {
            outline: 2px solid #6A5ACD;
            outline-offset: 2px;
          }
          
          .rich-text-viewer code {
            background-color: rgba(106, 90, 205, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
            font-size: 0.875rem;
            color: inherit !important;
            border: 1px solid rgba(106, 90, 205, 0.2);
          }
          
          .rich-text-viewer pre {
            background-color: rgba(106, 90, 205, 0.05);
            padding: 0.75rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 0.35em 0 !important;
            border: 1px solid rgba(106, 90, 205, 0.15);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .rich-text-viewer pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            border: none;
            font-size: 0.875rem;
            color: inherit !important;
          }
          
          .rich-text-viewer blockquote {
            margin: 0.35em 0 !important;
            padding: 0.5rem 0.75rem;
            border-left: 4px solid #6A5ACD;
            background-color: rgba(106, 90, 205, 0.05);
            border-radius: 0 0.5rem 0.5rem 0;
            font-style: italic;
            color: inherit !important;
          }
          
          .rich-text-viewer blockquote p {
            margin: 0;
            color: inherit !important;
          }
          
          .rich-text-viewer blockquote p:not(:last-child) {
            margin-bottom: 0.25rem;
          }
          
          .rich-text-viewer hr {
            border: none;
            height: 2px;
            background: linear-gradient(to right, transparent, rgba(106, 90, 205, 0.3), transparent);
            margin: 0.5em 0 !important;
          }
          
          .rich-text-viewer table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.35em 0 !important;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .rich-text-viewer th, .rich-text-viewer td {
            padding: 0.5rem 0.75rem;
            text-align: left;
            border-bottom: 1px solid rgba(106, 90, 205, 0.2);
            color: inherit !important;
          }
          
          .rich-text-viewer th {
            background-color: rgba(106, 90, 205, 0.1);
            font-weight: 600;
            color: inherit !important;
          }
          
          .rich-text-viewer tr:hover {
            background-color: rgba(106, 90, 205, 0.05);
          }
          
          .rich-text-viewer br {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 0 !important;
            line-height: 0 !important;
            content: '' !important;
          }

          /* Compact mode: minimal spacing for shared/public views */
          .rich-text-viewer.rich-text-viewer-compact {
            line-height: 1.3 !important;
          }
          .rich-text-viewer.rich-text-viewer-compact p,
          .rich-text-viewer.rich-text-viewer-compact div,
          .rich-text-viewer.rich-text-viewer-compact h2,
          .rich-text-viewer.rich-text-viewer-compact h3,
          .rich-text-viewer.rich-text-viewer-compact h4,
          .rich-text-viewer.rich-text-viewer-compact h5,
          .rich-text-viewer.rich-text-viewer-compact h6 {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.35 !important;
          }
          .rich-text-viewer.rich-text-viewer-compact p + p,
          .rich-text-viewer.rich-text-viewer-compact div + div,
          .rich-text-viewer.rich-text-viewer-compact * + p,
          .rich-text-viewer.rich-text-viewer-compact * + div {
            margin-top: 0 !important;
          }
          .rich-text-viewer.rich-text-viewer-compact ul,
          .rich-text-viewer.rich-text-viewer-compact ol {
            margin: 0.15em 0 !important;
          }
          .rich-text-viewer.rich-text-viewer-compact li {
            margin: 0 !important;
            line-height: 1.35 !important;
          }
          .rich-text-viewer.rich-text-viewer-compact img {
            margin: 0.1em 0 !important;
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .rich-text-viewer a {
              color: #8B7ED8;
            }
            
            .rich-text-viewer a:hover {
              color: #7A6EC8;
              background-color: rgba(139, 126, 216, 0.1);
            }
            
            .rich-text-viewer code {
              background-color: rgba(139, 126, 216, 0.15);
              border-color: rgba(139, 126, 216, 0.3);
            }
            
            .rich-text-viewer pre {
              background-color: rgba(139, 126, 216, 0.08);
              border-color: rgba(139, 126, 216, 0.2);
            }
            
            .rich-text-viewer blockquote {
              border-left-color: #8B7ED8;
              background-color: rgba(139, 126, 216, 0.08);
            }
            
            .rich-text-viewer hr {
              background: linear-gradient(to right, transparent, rgba(139, 126, 216, 0.4), transparent);
            }
            
            .rich-text-viewer th {
              background-color: rgba(139, 126, 216, 0.15);
            }
            
            .rich-text-viewer th, .rich-text-viewer td {
              border-bottom-color: rgba(139, 126, 216, 0.3);
            }
            
            .rich-text-viewer tr:hover {
              background-color: rgba(139, 126, 216, 0.08);
            }
          }
          
        `;
        document.head.appendChild(existingStyle);
        if (__DEV__) console.log('🔍 RichTextViewer: CSS styles injected successfully');
      }
    }
  }, []);

  // For web platform, render HTML content
  if (Platform.OS === 'web') {
    // Debug theme colors
    if (__DEV__) {
      console.log('🔍 RichTextViewer: Theme debug:', {
        textStyle: textStyle,
        hasColor: !!textStyle?.color,
        colorValue: textStyle?.color,
        sanitizedContentLength: sanitizedContent.length,
        contentPreview: sanitizedContent.substring(0, 100)
      });
    }

    // Use the provided color or fall back to inherit
    const themeColor = textStyle?.color || 'inherit';
    
    return (
      <View style={[styles.container, style]}>
        <div
          className={`rich-text-viewer${compact ? ' rich-text-viewer-compact' : ''}`}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          style={{
            ...styles.htmlContent,
            ...(compact && { lineHeight: 20, padding: 12 }),
            color: themeColor,
            backgroundColor: 'transparent',
            // Force color on all child elements
            '--force-color': themeColor
          } as any}
          ref={(el) => {
            if (el) {
              // Get the actual theme color from the parent or use smart detection
              let forceColor = themeColor;
              
              // If we don't have a specific color, detect theme and use appropriate color
              if (forceColor === 'inherit' || !forceColor) {
                const isDarkTheme = document.documentElement.classList.contains('dark') || 
                                   window.matchMedia('(prefers-color-scheme: dark)').matches ||
                                   document.body.style.backgroundColor === 'rgb(0, 0, 0)' ||
                                   document.body.style.backgroundColor === 'black' ||
                                   getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)';
                
                forceColor = isDarkTheme ? '#ffffff' : '#000000';
              }
              
              // Only apply color if it hasn't been applied yet or if it changed
              if (colorAppliedRef.current !== forceColor) {
                // Force color on ALL elements including text nodes
                const allElements = el.querySelectorAll('*');
                allElements.forEach((element: any) => {
                  element.style.color = forceColor;
                  element.style.setProperty('color', forceColor, 'important');
                });
                
                // Also force on the container itself
                el.style.color = forceColor;
                el.style.setProperty('color', forceColor, 'important');
                
                // Force color on text nodes too
                const walker = document.createTreeWalker(
                  el,
                  NodeFilter.SHOW_TEXT,
                  null,
                  false
                );
                
                let textNode;
                while (textNode = walker.nextNode()) {
                  if (textNode.parentElement) {
                    textNode.parentElement.style.color = forceColor;
                    textNode.parentElement.style.setProperty('color', forceColor, 'important');
                  }
                }
                
                colorAppliedRef.current = forceColor;
                if (__DEV__) console.log('🔍 RichTextViewer: FORCED color', forceColor, 'on', allElements.length, 'elements + text nodes');
              }
            }
          }}
        />
      </View>
    );
  }

  // For native platforms or plain text, render as regular text
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.textContent, textStyle]}>
        {contentFormat === 'html' ? sanitizedContent.replace(/<[^>]*>/g, '') : content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  htmlContent: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: 'inherit',
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

// Memoize component to prevent unnecessary re-renders
export const RichTextViewer = memo(RichTextViewerComponent, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.contentFormat === nextProps.contentFormat &&
    prevProps.compact === nextProps.compact &&
    JSON.stringify(prevProps.textStyle) === JSON.stringify(nextProps.textStyle)
  );
});

export default RichTextViewer;
