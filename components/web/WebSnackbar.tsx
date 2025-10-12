import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { createPortal } from 'react-dom';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemedText } from '../ThemedText';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarProps {
  visible: boolean;
  message: string;
  type?: SnackbarType;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const WebSnackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onClose,
  action,
}) => {
  console.log('WebSnackbar component called with props:', { visible, message, type, duration });
  
  const [animation] = useState(new Animated.Value(0));
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#3CB371',
          icon: 'checkmark-circle',
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: '#FF6B6B',
          icon: 'close-circle',
          iconColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: '#FF8C00',
          icon: 'warning',
          iconColor: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#6A5ACD',
          icon: 'information-circle',
          iconColor: '#FFFFFF',
        };
    }
  };

  const typeStyles = getTypeStyles();

  useEffect(() => {
    console.log('WebSnackbar visibility changed:', visible, 'Message:', message, 'Type:', type);
    if (visible) {
      // Slide in from bottom
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: false, // Disable native driver for web
        tension: 100,
        friction: 8,
      }).start();

      // Auto hide after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          console.log('WebSnackbar auto-hiding after duration');
          hideSnackbar();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Slide out to bottom
      Animated.spring(animation, {
        toValue: 0,
        useNativeDriver: false, // Disable native driver for web
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible, duration]);

  const hideSnackbar = () => {
    onClose?.();
  };

  const handleActionPress = () => {
    action?.onPress();
    hideSnackbar();
  };

  if (!visible) {
    console.log('WebSnackbar not visible, returning null');
    return null;
  }

  console.log('WebSnackbar rendering, type:', type, 'message:', message);

  const snackbarContent = (
    <View
      style={{
        position: 'fixed' as any,
        bottom: 20,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'box-none' as any,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor: typeStyles.backgroundColor,
            borderColor: backgroundColor,
            maxWidth: 500,
            width: '100%',
          },
        ]}
      >
        <View style={styles.content}>
          <Ionicons
            name={typeStyles.icon as any}
            size={20}
            color={typeStyles.iconColor}
            style={styles.icon}
          />
          <ThemedText style={[styles.message, { color: '#FFFFFF' }]}>
            {message}
          </ThemedText>
        </View>
        
        <View style={styles.actions}>
          {action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleActionPress}
            >
              <ThemedText style={styles.actionText}>
                {action.label}
              </ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideSnackbar}
          >
            <Ionicons
              name="close"
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Use portal on web to render outside the DOM hierarchy
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    console.log('Rendering with createPortal to document.body');
    return createPortal(snackbarContent, document.body) as any;
  }

  console.log('Rendering without portal');
  return snackbarContent;
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as const,
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 9999,
    maxWidth: 500,
    marginHorizontal: 'auto',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingHorizontal: 20,
    pointerEvents: 'auto' as const,
  } as any,
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
}); 