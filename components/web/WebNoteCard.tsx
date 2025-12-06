import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, Pressable } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Note } from '../../types/Note';
import { ThemedText } from '../ThemedText';

interface WebNoteCardProps {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onToggleFavorite?: () => void;
  onTogglePin?: () => void;
  isSelected?: boolean;
}

export function WebNoteCard({ 
  note, 
  onPress, 
  onLongPress,
  onEdit, 
  onDelete, 
  onArchive,
  onToggleFavorite,
  onTogglePin,
  isSelected = false 
}: WebNoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const textColor = useThemeColor({}, 'textSecondary');

  if (Platform.OS !== 'web') {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getPlainText = (value: Note): string => {
    if (value.content && value.content.trim().length > 0) {
      return value.content;
    }

    if (value.contentHtml) {
      const withoutTags = value.contentHtml
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ');
      return withoutTags.trim();
    }

    return '';
  };

  const getPreview = (value: Note) => {
    const plainText = getPlainText(value);
    return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
  };

  return (
    <Pressable
      style={[
        styles.container,
        { 
          backgroundColor,
          borderColor: isSelected ? accentColor : borderColor,
          borderWidth: isSelected ? 2 : 1,
        },
        isHovered && styles.hovered
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ThemedText type="subtitle" style={styles.title}>
            {note.title || 'Untitled Note'}
          </ThemedText>
          {note.isArchived && (
            <View style={styles.archivedBadge}>
              <ThemedText style={styles.archivedText}>Archived</ThemedText>
            </View>
          )}
        </View>
        
        {/* Action Buttons - Always visible on mobile by checking window width if available, otherwise rely on hover */}
        <View style={[
          styles.actions, 
          { opacity: (isHovered || isSelected) ? 1 : 0 },
          // Add a class or style for mobile visibility handled via media queries in styles
        ]}>
            {onToggleFavorite && (
              <TouchableOpacity style={styles.actionButton} onPress={onToggleFavorite}>
                <Ionicons 
                  name={note.isFavorite ? "star" : "star-outline"} 
                  size={16} 
                  color={note.isFavorite ? "#FFD700" : textColor}
                />
              </TouchableOpacity>
            )}
            {onTogglePin && (
              <TouchableOpacity style={styles.actionButton} onPress={onTogglePin}>
                <Ionicons 
                  name={note.isPinned ? "pin" : "pin-outline"} 
                  size={16} 
                  color={note.isPinned ? accentColor : textColor}
                />
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                <Ionicons name="pencil" size={16} color={textColor} />
              </TouchableOpacity>
            )}
            {onArchive && (
              <TouchableOpacity style={styles.actionButton} onPress={onArchive}>
                <Ionicons 
                  name={note.isArchived ? "archive-outline" : "archive"} 
                  size={16} 
                  color={textColor} 
                />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                <Ionicons name="trash" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
      </View>

      {/* Content Preview */}
      <ThemedText style={styles.preview} numberOfLines={3}>
        {getPreview(note)}
      </ThemedText>

      {/* Footer */}
      <View style={styles.footer}>
        <ThemedText style={styles.date}>
          {formatDate(note.createdAt)}
        </ThemedText>
        
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tags}>
            {note.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <ThemedText style={styles.tagText}>#{tag}</ThemedText>
              </View>
            ))}
            {note.tags.length > 3 && (
              <ThemedText style={styles.moreTags}>+{note.tags.length - 3}</ThemedText>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
    } : {
      display: 'flex',
    }),
    flexDirection: 'column',
    height: 140,
    width: 300, // Default width for desktop grid
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        padding: 16,
        height: 'auto',
        minHeight: 120,
        width: '100%',
        maxWidth: '100%',
        marginHorizontal: 0,
        borderRadius: 16,
        marginBottom: 0,
      },
      '@media (max-width: 480px)': {
        padding: 14,
        marginHorizontal: 0,
        minHeight: 110,
        borderRadius: 14,
      },
    } : {}),
  },
  hovered: {
    transform: [{ translateY: -2 }],
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    flexShrink: 0, // Prevent header from shrinking
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    marginRight: 4,
    fontSize: 14,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 22,
      },
    } : {}),
  },
  archivedBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  archivedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        opacity: 1, // Always show actions on mobile
        gap: 10,
      },
    } : {}),
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        width: 40, // Larger touch targets
        height: 40,
        borderRadius: 20,
      },
    } : {}),
  },
  preview: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 8,
    color: '#A0A0A0',
    flex: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical' as any,
    } : {}),
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 15,
        lineHeight: 22,
        color: '#888888',
        WebkitLineClamp: 3,
        marginBottom: 10,
      },
    } : {}),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0, // Prevent footer from shrinking
  },
  date: {
    fontSize: 10,
    color: '#666666',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 13,
        fontWeight: '500',
      },
    } : {}),
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tag: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? {
      '@media (max-width: 768px)': {
        fontSize: 12, // Larger tag text
      },
    } : {}),
  },
  moreTags: {
    fontSize: 10,
    color: '#666666',
  },
}); 