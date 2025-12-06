import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Platform } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '../../hooks/useThemeColor';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
  showMenuButton?: boolean;
  rightActions?: React.ReactNode;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  onMenuPress, 
  showMenuButton = true,
  rightActions 
}: MobileHeaderProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor, borderBottomColor: borderColor }]}>
      <View style={styles.content}>
        {/* Left: Menu Button */}
        {showMenuButton && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            accessibilityLabel="Menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color={textColor} />
          </TouchableOpacity>
        )}

        {/* Center: Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.title, { color: textColor }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: textSecondaryColor }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>

        {/* Right: Actions */}
        {rightActions && (
          <View style={styles.rightActions}>
            {rightActions}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? {
      position: 'sticky',
      top: 0,
      zIndex: 100,
    } : {}),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 480px)': {
        fontSize: 20,
      },
    } : {}),
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
