import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemedView } from '../ThemedView';
import { HamburgerMenu } from './HamburgerMenu';
import { MobileHeader } from './MobileHeader';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Set page title for web
  usePageTitle({ title, subtitle });

  // Detect mobile screen size
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const updateSize = () => {
        const { width } = Dimensions.get('window');
        setIsMobile(width < 768);
        // Close sidebar when switching to desktop
        if (width >= 768) {
          setIsSidebarOpen(false);
        }
      };

      updateSize();
      const subscription = Dimensions.addEventListener('change', updateSize);
      return () => subscription?.remove();
    }
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Mobile layout with hamburger menu
  if (isMobile && sidebar) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <HamburgerMenu isOpen={isSidebarOpen} onToggle={toggleSidebar} onClose={closeSidebar}>
          {sidebar}
        </HamburgerMenu>

        <View style={styles.mobileMainContent}>
          {(title || subtitle) && (
            <MobileHeader 
              title={title || ''} 
              subtitle={subtitle}
              onMenuPress={toggleSidebar}
            />
          )}
          {header && <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>{header}</View>}
          
          {scrollable ? (
            <ScrollView 
              style={[styles.scrollContent, { backgroundColor }]}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, { backgroundColor }]}>
              {children}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Desktop layout
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
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
      width: '100vw' as any,
    } : {
      height: '100%',
      width: '100%',
    }),
    margin: 0,
    padding: 0,
  },
  mobileMainContent: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
      maxHeight: '100vh' as any,
    } : {
      height: '100%',
      maxHeight: '100%',
    }),
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
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
    } : {
      height: '100%',
    }),
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