import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface LogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  showBackground?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 120, style }) => {
  return (
    <Image
      source={require('../assets/images/WiznoteLogoNov25.png')}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
};
