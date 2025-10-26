import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function HamburgerMenu({ isOpen, onToggle, onClose, children }: HamburgerMenuProps) {
  const slideAnim = useRef(new Animated.Value(-300)).current; // Start off-screen
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isMobile, setIsMobile] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  // Detect mobile screen size
  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateSize = () => {
        const { width } = Dimensions.get('window');
        setIsMobile(width < 768);
      };

      updateSize();
      const subscription = Dimensions.addEventListener('change', updateSize);
      return () => subscription?.remove();
    } else {
      setIsMobile(true);
    }
  }, []);

  // Animate sidebar slide in/out
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -300,
          useNativeDriver: false,
          tension: 100,
          friction: 9,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOpen]);

  // Close on navigation (detect URL changes)
  useEffect(() => {
    if (isOpen && Platform.OS === 'web') {
      const handlePopState = () => onClose();
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isOpen, onClose]);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Hamburger Button */}
      <TouchableOpacity
        style={[styles.hamburgerButton, { backgroundColor }]}
        onPress={onToggle}
        accessibilityLabel="Toggle menu"
        accessibilityRole="button"
      >
        <Ionicons
          name={isOpen ? 'close' : 'menu'}
          size={24}
          color={textColor}
        />
      </TouchableOpacity>

      {/* Backdrop Overlay */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor,
            borderRightColor: borderColor,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>

        {/* Sidebar Content - Scrollable */}
        <View style={styles.scrollContainer}>
          {children}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  hamburgerButton: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    } : {}),
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: Math.min(280, Dimensions.get('window').width * 0.85),
    maxWidth: 300,
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    } : {}),
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    alignSelf: 'flex-end',
    marginRight: -8,
    marginTop: -8,
    zIndex: 10,
  },
  scrollContainer: {
    flex: 1,
    paddingTop: 8,
    ...(Platform.OS === 'web' ? {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      maxHeight: 'calc(100vh - 60px)',
    } : {}),
  },
});
