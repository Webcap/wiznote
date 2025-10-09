import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
// @ts-ignore - react-dom types not available in React Native environment
import { createPortal } from 'react-dom';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    View
} from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { noteSharingService } from '../services/NoteSharingService';
import { Note, ShareOptions, SharePermission } from '../types/Note';
import { LoadingSpinner } from './LoadingSpinner';
import { ShareCard } from './ShareCard';

interface ShareModalProps {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
  onShareSuccess?: () => void;
}

export const ShareModal = ({ visible, onClose, onShareSuccess, note }: ShareModalProps) => {
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

      await noteSharingService.shareNote(note!.id, user!.id, shareOptions);
      
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

      await noteSharingService.shareNote(note!.id, user!.id, shareOptions);
      
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

  if (!visible || !note) return null;

  // Web modal using createPortal
  if (Platform.OS === 'web') {
    console.log('🌐 Rendering web ShareModal:', { visible, note: note?.id, platform: Platform.OS });
    
    const modalContent = (
      <div style={webStyles.modalOverlay} onClick={onClose}>
        <div style={{...webStyles.container, backgroundColor}} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{...webStyles.header, borderBottomColor: borderColor}}>
            <div style={webStyles.headerSpacer} />
            <h2 style={{...webStyles.headerTitle, color: textColor}}>Share Note</h2>
            <button style={webStyles.closeButton} onClick={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </button>
          </div>

          <div style={webStyles.content}>
            {/* Note Info */}
            <div style={{...webStyles.noteInfo, backgroundColor: backgroundSecondary}}>
              <Ionicons name="document-text" size={20} color={accentPrimary} />
              <div style={{...webStyles.noteTitle, color: textColor}}>{note.title}</div>
            </div>

            {/* User Search */}
            <div style={webStyles.section}>
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>Share with</h3>
              <div style={{...webStyles.searchContainer, backgroundColor: backgroundSecondary, borderColor}}>
                <Ionicons name="search" size={20} color={textMutedColor} />
                <input
                  style={{...webStyles.searchInput, color: textColor, backgroundColor: 'transparent'}}
                  placeholder="Search users or enter email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoCapitalize="none"
                  type="email"
                />
                {searchQuery.length > 0 && (
                  <button onClick={handleClearSelection} style={webStyles.clearButton}>
                    <Ionicons name="close-circle" size={20} color={textMutedColor} />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searching && (
                <div style={webStyles.searchingContainer}>
                  <LoadingSpinner size={20} />
                  <span style={{...webStyles.searchingText, color: textMutedColor}}>Searching...</span>
                </div>
              )}

              {searchResults.length > 0 && (
                <div style={webStyles.searchResults}>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      style={{...webStyles.searchResultItem, borderColor}}
                      onClick={() => handleUserSelect(user)}
                    >
                      <Ionicons name="person" size={20} color={textMutedColor} />
                      <div style={webStyles.userInfo}>
                        <div style={{...webStyles.userName, color: textColor}}>{user.display_name || 'Unknown User'}</div>
                        <div style={{...webStyles.userEmail, color: textMutedColor}}>{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div style={{...webStyles.selectedUser, backgroundColor: backgroundSecondary, borderColor}}>
                  <Ionicons name="checkmark-circle" size={20} color={accentPrimary} />
                  <div style={webStyles.userInfo}>
                    <div style={{...webStyles.userName, color: textColor}}>{selectedUser.display_name || 'Unknown User'}</div>
                    <div style={{...webStyles.userEmail, color: textMutedColor}}>{selectedUser.email}</div>
                  </div>
                  <button onClick={handleClearSelection} style={webStyles.clearButton}>
                    <Ionicons name="close-circle" size={20} color={textMutedColor} />
                  </button>
                </div>
              )}
            </div>

            {/* Permission Level */}
            <div style={webStyles.section}>
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>Permission Level</h3>
              <div style={webStyles.permissionOptions}>
                {[
                  { key: 'read' as SharePermission, label: 'View Only', icon: 'eye' },
                  { key: 'admin' as SharePermission, label: 'Admin', icon: 'shield' },
                  { key: 'edit' as SharePermission, label: 'Edit', icon: 'create' },
                ].map((option) => (
                  <button
                    key={option.key}
                    style={{
                      ...webStyles.permissionOption,
                      backgroundColor: permission === option.key ? accentPrimary : backgroundSecondary,
                      borderColor: permission === option.key ? accentPrimary : borderColor,
                      color: permission === option.key ? '#FFFFFF' : textColor,
                    }}
                    onClick={() => setPermission(option.key)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={permission === option.key ? '#FFFFFF' : textMutedColor} 
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Message */}
            <div style={webStyles.section}>
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>Message (Optional)</h3>
              <textarea
                style={{
                  ...webStyles.messageInput,
                  backgroundColor: backgroundSecondary,
                  borderColor,
                  color: textColor,
                }}
                placeholder="Add a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{...webStyles.actions, borderTopColor: borderColor}}>
            <button
              style={{...webStyles.cancelButton, borderColor, color: textColor}}
              onClick={onClose}
            >
              Cancel
            </button>
            
            <button
              style={{
                ...webStyles.shareButton,
                backgroundColor: canShare ? accentPrimary : '#CCCCCC',
                opacity: canShare ? 1 : 0.6,
              }}
              onClick={canShare ? (selectedUser ? handleShare : handleEmailShare) : undefined}
              disabled={!canShare || loading}
            >
              {loading ? (
                <LoadingSpinner size={20} color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share" size={20} color="#FFFFFF" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }

  // Mobile modal using ShareCard
  console.log('📱 Rendering mobile ShareModal with ShareCard:', { visible, note: note?.id, platform: Platform.OS });
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ShareCard
            note={note}
            onClose={onClose}
            onShareSuccess={onShareSuccess}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
  },
});

const webStyles = {
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  container: {
    width: '100%',
    maxWidth: '500px',
    minHeight: '400px',
    borderRadius: 16,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    '@media (max-width: 640px)': {
      maxWidth: '95%',
      margin: '10px',
      maxHeight: '95vh',
    },
  },
  header: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid' as const,
  },
  headerSpacer: {
    width: '32px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: '0 24px',
    minHeight: '300px',
    overflowY: 'auto' as const,
  },
  noteInfo: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    margin: '20px 0',
    gap: '12px',
  },
  noteTitle: {
    fontSize: '16px',
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '8px 0',
    '&:focus': {
      outline: 'none',
    },
  },
  clearButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingContainer: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px 0',
    gap: '8px',
  },
  searchingText: {
    fontSize: '14px',
  },
  searchResults: {
    marginTop: '8px',
  },
  searchResultItem: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid' as const,
    cursor: 'pointer',
    gap: '12px',
    '&:hover': {
      opacity: 0.8,
    },
  },
  selectedUser: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    marginTop: '8px',
    gap: '12px',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: '12px',
  },
  permissionOptions: {
    display: 'flex',
    gap: '8px',
  },
  permissionOption: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    cursor: 'pointer',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    '&:hover': {
      opacity: 0.8,
    },
  },
  messageInput: {
    width: '100%',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    minHeight: '100px',
    lineHeight: '1.5',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    '&:focus': {
      outline: 'none',
    },
  },
  actions: {
    display: 'flex',
    flexDirection: 'row' as const,
    padding: '20px 24px',
    borderTopWidth: 1,
    borderTopStyle: 'solid' as const,
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    '&:hover': {
      opacity: 0.8,
    },
  },
  shareButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    transition: 'all 0.2s',
    '&:hover': {
      opacity: 0.9,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
};
