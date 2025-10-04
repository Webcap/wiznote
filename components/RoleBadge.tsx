import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { UserRole, getRoleColor, getRoleDisplayName, getRoleIcon } from '../types/User';
import { ThemedText } from './ThemedText';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  style?: any;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'medium',
  showIcon = true,
  showText = true,
  style,
}) => {
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const roleColor = getRoleColor(role);
  const roleIcon = getRoleIcon(role);
  const roleDisplayName = getRoleDisplayName(role);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontSize: 10,
          iconSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          fontSize: 14,
          iconSize: 18,
        };
      default: // medium
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          fontSize: 12,
          iconSize: 14,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: roleColor + '20', // 20% opacity
          borderColor: roleColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={roleIcon as any}
          size={sizeStyles.iconSize}
          color={roleColor}
          style={styles.icon}
        />
      )}
      {showText && (
        <ThemedText
          style={[
            styles.text,
            {
              fontSize: sizeStyles.fontSize,
              color: roleColor,
            },
          ]}
        >
          {roleDisplayName}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
}); 