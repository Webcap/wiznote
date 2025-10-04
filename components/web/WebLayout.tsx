import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemedView } from '../ThemedView';

interface WebLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  header?: React.ReactNode;
  scrollable?: boolean; // Add option to enable/disable scrolling
  title?: string; // Page title for the web version
  subtitle?: string; // Optional subtitle
}

export function WebLayout({ children, sidebar, rightSidebar, header, scrollable = true, title, subtitle }: WebLayoutProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  // Set page title for web
  usePageTitle({ title, subtitle });

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable ? {
    style: [styles.scrollContent, { backgroundColor }],
    contentContainerStyle: styles.scrollContentContainer,
    showsVerticalScrollIndicator: true,
  } : {
    style: [styles.content, { backgroundColor }],
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Left Sidebar */}
      {sidebar && (
        <ThemedView style={[styles.sidebar, { borderRightColor: borderColor, backgroundColor }]}>
          {sidebar}
        </ThemedView>
      )}
      
      {/* Main Content */}
      <View style={[styles.mainContent, { backgroundColor }]}>
        {/* Header */}
        {header && (
          <ThemedView style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
            {header}
          </ThemedView>
        )}
        
        {/* Content */}
        <ContentWrapper {...contentWrapperProps}>
          {children}
        </ContentWrapper>
      </View>

      {/* Right Sidebar */}
      {rightSidebar && (
        <ThemedView style={[styles.rightSidebar, { borderLeftColor: borderColor, backgroundColor }]}>
          {rightSidebar}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 240,
        paddingVertical: 16,
        paddingHorizontal: 12,
      },
      '@media (max-width: 480px)': {
        width: 200,
        paddingVertical: 12,
        paddingHorizontal: 8,
      },
    } : {}),
  },
  rightSidebar: {
    width: 280,
    borderLeftWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 240,
        paddingVertical: 16,
        paddingHorizontal: 12,
      },
      '@media (max-width: 480px)': {
        width: 200,
        paddingVertical: 12,
        paddingHorizontal: 8,
      },
    } : {}),
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    height: '100vh',
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    // Remove fixed height to allow custom header content
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        paddingHorizontal: 16,
      },
      '@media (max-width: 480px)': {
        paddingHorizontal: 12,
      },
    } : {}),
  },
  content: {
    flex: 1,
    padding: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 16,
      },
      '@media (max-width: 480px)': {
        padding: 12,
      },
    } : {}),
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 24,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 16,
      },
      '@media (max-width: 480px)': {
        padding: 12,
      },
    } : {}),
  },
}); 