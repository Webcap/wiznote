import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: any;
}

export const LoadingSpinner = ({ 
  size = 40, 
  color,
  style 
}: LoadingSpinnerProps) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Use theme-aware colors
  const themeColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({ light: '#E0E0E0', dark: '#333333' }, 'backgroundTertiary');
  
  // Use provided color or fall back to theme color
  const spinnerColor = color || themeColor;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderWidth: 4,
            borderColor: borderColor, // theme-aware border color
            borderTopColor: spinnerColor,   // main color for the top
            borderRadius: size / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {},
}); 