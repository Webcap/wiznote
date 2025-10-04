import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { noteSharingService } from '../services/NoteSharingService';
import { Note, ShareOptions, SharePermission } from '../types/Note';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ShareCardProps {
  note: Note;
  onClose: () => void;
  onShareSuccess?: () => void;
}

export const ShareCard = ({ note, onClose, onShareSuccess }: ShareCardProps) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permission, setPermission] = useState<SharePermission>('read');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const borderColor = useThemeColor({}, 'border');
  const accentPrimary = useThemeColor({}, 'accentPrimary');

  useEffect(() => {
    if (searchQuery.length > 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!user) return;
    
    setSearching(true);
    try {
      const results = await noteSharingService.searchUsers(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        showSnackbar('No users found matching your search', 'info', 3000);
      } else {
        showSnackbar(`Found ${results.length} user${results.length === 1 ? '' : 's'}`, 'success', 2000);
      }
    } catch (error) {
      console.error('Search error:', error);
      showSnackbar('Search failed. Please try again.', 'error', 3000);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(user.email || user.display_name || '');
    setSearchResults([]);
    showSnackbar(`Selected ${user.display_name || user.email}`, 'success', 2000);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    showSnackbar('Selection cleared', 'info', 1500);
  };

  const handleShare = async () => {
    if (!selectedUser || !user) return;

    setLoading(true);
    showSnackbar('Sharing note...', 'info', 2000);
    
    try {
      const shareOptions: ShareOptions = {
        sharedWithUserId: selectedUser.id,
        permission,
        message: message.trim() || undefined,
      };

      await noteSharingService.shareNote(note.id, user.id, shareOptions);
      
      showSnackbar(`Note shared successfully with ${selectedUser.display_name || selectedUser.email}!`, 'success', 4000);
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to share note. Please try again.';
      showSnackbar(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!searchQuery.includes('@') || !user) return;

    setLoading(true);
    showSnackbar('Sharing note via email...', 'info', 2000);
    
    try {
      const shareOptions: ShareOptions = {
        sharedWithEmail: searchQuery,
        permission,
        message: message.trim() || undefined,
      };

      await noteSharingService.shareNote(note.id, user.id, shareOptions);
      
      showSnackbar(`Note shared successfully with ${searchQuery}!`, 'success', 4000);
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to share note. Please try again.';
      showSnackbar(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const canShare = selectedUser || (searchQuery.includes('@') && searchQuery.length > 5);

  return (
    <ThemedView style={[styles.card, { backgroundColor, borderColor }]}>
      {/* Drag Handle */}
      <View style={[styles.dragHandle, { backgroundColor: textMutedColor }]} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Share Note
        </ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Note Info */}
        <View style={[styles.noteInfo, { backgroundColor: backgroundSecondary }]}>
          <Ionicons name="document-text" size={16} color={accentPrimary} />
          <ThemedText style={[styles.noteTitle, { color: textColor }]} numberOfLines={2}>
            {note.title}
          </ThemedText>
        </View>

        {/* User Search */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Share with
          </ThemedText>
          <View style={[styles.searchContainer, { backgroundColor: backgroundSecondary, borderColor }]}>
            <Ionicons name="search" size={16} color={textMutedColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search users or enter email..."
              placeholderTextColor={textMutedColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSelection}>
                <Ionicons name="close-circle" size={16} color={textMutedColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {searching && (
            <View style={styles.searchingContainer}>
              <LoadingSpinner size={16} />
              <ThemedText style={[styles.searchingText, { color: textMutedColor }]}>
                Searching...
              </ThemedText>
            </View>
          )}

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.searchResultItem, { borderColor }]}
                  onPress={() => handleUserSelect(user)}
                >
                  <Ionicons name="person" size={16} color={textMutedColor} />
                  <View style={styles.userInfo}>
                    <ThemedText style={[styles.userName, { color: textColor }]}>
                      {user.display_name || 'Unknown User'}
                    </ThemedText>
                    <ThemedText style={[styles.userEmail, { color: textMutedColor }]}>
                      {user.email}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected User */}
          {selectedUser && (
            <View style={[styles.selectedUser, { backgroundColor: backgroundSecondary, borderColor }]}>
              <Ionicons name="checkmark-circle" size={16} color={accentPrimary} />
              <View style={styles.userInfo}>
                <ThemedText style={[styles.userName, { color: textColor }]}>
                  {selectedUser.display_name || 'Unknown User'}
                </ThemedText>
                <ThemedText style={[styles.userEmail, { color: textMutedColor }]}>
                  {selectedUser.email}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={handleClearSelection}>
                <Ionicons name="close-circle" size={16} color={textMutedColor} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Permission Level */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Permission Level
          </ThemedText>
          <View style={styles.permissionOptions}>
            {[
              { key: 'read' as SharePermission, label: 'View Only', icon: 'eye' },
              { key: 'admin' as SharePermission, label: 'Admin', icon: 'shield' },
              { key: 'edit' as SharePermission, label: 'Edit', icon: 'create' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.permissionOption,
                  { 
                    backgroundColor: permission === option.key ? accentPrimary : backgroundSecondary,
                    borderColor: permission === option.key ? accentPrimary : borderColor,
                  }
                ]}
                onPress={() => setPermission(option.key)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={16} 
                  color={permission === option.key ? '#FFFFFF' : textMutedColor} 
                />
                <ThemedText style={[
                  styles.permissionText,
                  { color: permission === option.key ? '#FFFFFF' : textColor }
                ]}>
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Optional Message */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Message (Optional)
          </ThemedText>
          <TextInput
            style={[styles.messageInput, { 
              backgroundColor: backgroundSecondary, 
              borderColor, 
              color: textColor 
            }]}
            placeholder="Add a message..."
            placeholderTextColor={textMutedColor}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor }]}
          onPress={onClose}
        >
          <ThemedText style={[styles.cancelButtonText, { color: textColor }]}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.shareButton,
            { 
              backgroundColor: canShare ? accentPrimary : '#CCCCCC',
              opacity: canShare ? 1 : 0.6,
            }
          ]}
          onPress={canShare ? (selectedUser ? handleShare : handleEmailShare) : undefined}
          disabled={!canShare || loading}
        >
          {loading ? (
            <LoadingSpinner size={16} color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share" size={16} color="#FFFFFF" />
              <ThemedText style={styles.shareButtonText}>Share</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0,
    maxHeight: '90%',
    width: '100%',
    marginHorizontal: 0,
    marginVertical: 0,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  noteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    gap: 8,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  searchingText: {
    fontSize: 12,
  },
  searchResults: {
    marginTop: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
  },
  permissionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
