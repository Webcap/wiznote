import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';

interface OfflineIndicatorProps {
  isVisible: boolean;
  message?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  isVisible, 
  message = 'You are offline. Some features may be limited.' 
}) => {
  const backgroundColor = useThemeColor({}, 'danger');
  const textColor = useThemeColor({}, 'background');

  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ThemedText style={[styles.message, { color: textColor }]}>
        {message}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 