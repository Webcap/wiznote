import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

interface SidebarItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  shortcut?: string;
  onPress: () => void;
  isActive?: boolean;
}

interface WebSidebarProps {
  items: SidebarItem[];
  onCreateNote?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
}

export function WebSidebar({ items, onCreateNote, onSearch, onSettings }: WebSidebarProps) {
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const shortcutBgColor = useThemeColor({}, 'backgroundTertiary');
  const shortcutTextColor = useThemeColor({}, 'textSecondary');

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Logo/Brand */}
      <View style={[styles.brand, { borderBottomColor: borderColor }]}>
        <ThemedText type="title" style={styles.logo}>
          WizNote
        </ThemedText>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {onCreateNote && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateNote}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>New Note</ThemedText>
            <ThemedText style={[styles.shortcut, { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.2)' }]}>⌘N</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Items */}
      <View style={styles.navigation}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              item.isActive && { backgroundColor: accentColor + '20' }
            ]}
            onPress={item.onPress}
          >
            <Ionicons 
              name={item.icon} 
              size={20} 
              color={item.isActive ? accentColor : iconColor} 
            />
            <ThemedText 
              style={[
                styles.navLabel,
                item.isActive && { color: accentColor }
              ]}
            >
              {item.label}
            </ThemedText>
            {item.shortcut && (
              <ThemedText style={[styles.shortcut, { color: shortcutTextColor, backgroundColor: shortcutBgColor }]}>{item.shortcut}</ThemedText>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { borderTopColor: borderColor }]}>
        {onSearch && (
          <TouchableOpacity style={styles.bottomItem} onPress={onSearch}>
            <Ionicons name="search" size={20} color={iconColor} />
            <ThemedText style={styles.bottomLabel}>Search</ThemedText>
            <ThemedText style={[styles.shortcut, { color: shortcutTextColor, backgroundColor: shortcutBgColor }]}>⌘K</ThemedText>
          </TouchableOpacity>
        )}
        {onSettings && (
          <TouchableOpacity style={styles.bottomItem} onPress={onSettings}>
            <Ionicons name="settings" size={20} color={iconColor} />
            <ThemedText style={styles.bottomLabel}>Settings</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  brand: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickActions: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  navigation: {
    flex: 1,
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  navLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  bottomActions: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  bottomLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  shortcut: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
}); 