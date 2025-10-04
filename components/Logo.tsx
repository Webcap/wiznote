import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, {
    Circle,
    Ellipse,
    G,
    Line,
    Path,
    Rect
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
  showBackground?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 120, 
  style, 
  showBackground = true 
}) => {
  const scale = size / 120; // Scale factor based on original 120x120 size
  
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Background circle */}
        {showBackground && (
          <Circle 
            cx="60" 
            cy="60" 
            r="56" 
            fill="#4F46E5" 
            stroke="#1E293B" 
            strokeWidth="2"
          />
        )}
        
        {/* Document/Note */}
        <Rect 
          x="35" 
          y="40" 
          width="38" 
          height="48" 
          rx="4" 
          fill="#F8FAFC" 
          stroke="#1E293B" 
          strokeWidth="1.5"
        />
        
        {/* Text lines */}
        <Line x1="40" y1="50" x2="68" y2="50" stroke="#CBD5E1" strokeWidth="1" />
        <Line x1="40" y1="56" x2="65" y2="56" stroke="#CBD5E1" strokeWidth="1" />
        <Line x1="40" y1="62" x2="68" y2="62" stroke="#CBD5E1" strokeWidth="1" />
        <Line x1="40" y1="68" x2="62" y2="68" stroke="#CBD5E1" strokeWidth="1" />
        
        {/* Star */}
        <Path 
          d="M74 35 L82 60 L66 60 Z" 
          fill="#F59E0B" 
          stroke="#1E293B" 
          strokeWidth="1.5"
        />
        
        {/* Star tail */}
        <Ellipse 
          cx="74" 
          cy="60" 
          rx="10" 
          ry="3" 
          fill="#F59E0B" 
          stroke="#1E293B" 
          strokeWidth="1.5"
        />
        
        {/* Sparkles */}
        <G fill="#F59E0B">
          <Path d="M85 45 L86.5 47.5 L89 46 L87.5 48.5 L90 50 L87.5 49.5 L89 52 L86.5 50.5 L85 53 L86.5 50.5 L84 52 L85.5 49.5 L83 48 L85.5 48.5 L84 46 L86.5 47.5 Z" />
          <Circle cx="95" cy="35" r="1.5" />
          <Circle cx="88" cy="28" r="1" />
        </G>
        
        {/* Star tail end */}
        <Path d="M78 65 L85 72 L83 74 L76 67 Z" fill="#1E293B" />
        <Circle cx="86" cy="73" r="1.5" fill="#F59E0B" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
