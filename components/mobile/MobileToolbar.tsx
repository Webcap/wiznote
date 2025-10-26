import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '../../hooks/useThemeColor';

interface MobileToolbarProps {
  onFormat: (format: string) => void;
  onMoreOptions?: () => void;
  style?: any;
}

const PRIMARY_BUTTONS = [
  { id: 'bold', label: 'B', icon: null },
  { id: 'italic', label: 'I', icon: null },
  { id: 'underline', label: 'U', icon: null },
  { id: 'heading1', label: 'H1', icon: null },
  { id: 'heading2', label: 'H2', icon: null },
];

const ICON_BUTTONS = [
  { id: 'bullet', icon: 'list', label: 'Bullet List' },
  { id: 'number', icon: 'list-outline', label: 'Number List' },
  { id: 'code', icon: 'code', label: 'Code' },
  { id: 'link', icon: 'link', label: 'Link' },
];

export function MobileToolbar({ onFormat, onMoreOptions, style }: MobileToolbarProps) {
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');

  if (Platform.OS !== 'web') {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Show simplified toolbar on mobile
  if (isMobile) {
    return (
      <View style={[styles.container, { backgroundColor, borderBottomColor: borderColor }, style]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Primary Formatting Buttons */}
          <View style={styles.toolbarGroup}>
            {PRIMARY_BUTTONS.map((button) => (
              <TouchableOpacity
                key={button.id}
                style={[styles.toolbarButton, { borderColor }]}
                onPress={() => onFormat(button.id)}
              >
                <ThemedText style={[styles.toolbarButtonText, { color: iconColor }]}>
                  {button.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.separator, { backgroundColor: borderColor }]} />

          {/* Icon Buttons */}
          <View style={styles.toolbarGroup}>
            {ICON_BUTTONS.map((button) => (
              <TouchableOpacity
                key={button.id}
                style={[styles.toolbarButton, { borderColor }]}
                onPress={() => onFormat(button.id)}
                accessibilityLabel={button.label}
              >
                <Ionicons name={button.icon} size={20} color={iconColor} />
              </TouchableOpacity>
            ))}
          </View>

          {onMoreOptions && (
            <>
              <View style={[styles.separator, { backgroundColor: borderColor }]} />
              <TouchableOpacity
                style={[styles.toolbarButton, styles.moreButton, { borderColor }]}
                onPress={onMoreOptions}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={iconColor} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // Desktop layout - return full toolbar in a future implementation if needed
  return null;
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? {
      position: 'sticky',
      top: 0,
      zIndex: 100,
    } : {}),
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  toolbarGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':active': {
        backgroundColor: 'rgba(106, 90, 205, 0.2)',
      },
    } : {}),
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  separator: {
    width: 1,
    height: 32,
    marginHorizontal: 4,
  },
  moreButton: {
    minWidth: 44,
  },
});
