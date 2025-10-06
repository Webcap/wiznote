import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
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
    if (visible) {
      // Slide in from bottom
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        tension: 100,
        friction: 8,
      }).start();

      // Auto hide after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideSnackbar();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Slide out to bottom
      Animated.spring(animation, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
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

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
          opacity: animation,
        },
      ]}
    >
      <View
        style={[
          styles.snackbar,
          {
            backgroundColor: typeStyles.backgroundColor,
            borderColor: backgroundColor,
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
    maxWidth: 400,
    alignSelf: 'center',
  },
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