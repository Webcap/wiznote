import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
// @ts-ignore - react-dom types not available in React Native environment
import { createPortal } from 'react-dom';
import {
    Modal,
    Platform,
    StyleSheet,
    View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';
import { useTranslation } from '../hooks/useTranslation';
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permission, setPermission] = useState<SharePermission>('read');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [publicLink, setPublicLink] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Reset state when modal closes; fetch existing public link when modal opens
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedUser(null);
      setSearchResults([]);
      setPermission('read');
      setMessage('');
      setPublicLink('');
    } else if (note && user) {
      noteSharingService.getExistingPublicShare(note.id, user.id).then((existing) => {
        if (existing) setPublicLink(existing.shareUrl);
      });
    }
  }, [visible, note?.id, user?.id]);

  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const textSecondary = useThemeColor({}, 'textSecondary');
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
        showSnackbar(t('share.noUsersFound'), 'info', 3000);
      } else {
        const message = results.length === 1 
          ? t('share.usersFound', { count: results.length })
          : t('share.usersFoundPlural', { count: results.length });
        showSnackbar(message, 'success', 2000);
      }
    } catch (error) {
      console.error('Search error:', error);
      showSnackbar(t('share.searchFailed'), 'error', 3000);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(user.email || user.display_name || '');
    setSearchResults([]);
    showSnackbar(t('share.selectedUser', { user: user.display_name || user.email }), 'success', 2000);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    showSnackbar(t('share.selectionCleared'), 'info', 1500);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleShare = async () => {
    if (!selectedUser || !user) return;

    setLoading(true);
    showSnackbar(t('share.sharingNote'), 'info', 2000);
    
    try {
      const shareOptions: ShareOptions = {
        sharedWithUserId: selectedUser.id,
        permission,
        message: message.trim() || undefined,
      };

      await noteSharingService.shareNote(note!.id, user!.id, shareOptions);
      
      showSnackbar(t('share.noteSharedSuccess', { user: selectedUser.display_name || selectedUser.email }), 'success', 4000);
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMessage = error instanceof Error ? error.message : t('share.shareFailed');
      showSnackbar(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!searchQuery.includes('@') || !user) return;

    setLoading(true);
    showSnackbar(t('share.sharingViaEmail'), 'info', 2000);
    
    try {
      const shareOptions: ShareOptions = {
        sharedWithEmail: searchQuery,
        permission,
        message: message.trim() || undefined,
      };

      await noteSharingService.shareNote(note!.id, user!.id, shareOptions);
      
      showSnackbar(t('share.noteSharedEmailSuccess', { email: searchQuery }), 'success', 4000);
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sharing note:', error);
      const errorMessage = error instanceof Error ? error.message : t('share.shareFailed');
      showSnackbar(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublicLink = async () => {
    if (!user) return;

    setLoading(true);
    showSnackbar(t('share.creatingPublicLink'), 'info', 2000);
    
    try {
      const { shareUrl, alreadyExisted } = await noteSharingService.createPublicShare(
        note!.id, 
        user!.id
      );
      
      setPublicLink(shareUrl);
      showSnackbar(alreadyExisted ? t('share.publicLinkAlreadyExists') : t('share.publicLinkCreated'), 'success', 3000);
    } catch (error) {
      console.error('Error creating public link:', error);
      const errorMessage = error instanceof Error ? error.message : t('share.createPublicLinkFailed');
      showSnackbar(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!publicLink) return;
    
    navigator.clipboard.writeText(publicLink).then(() => {
      setLinkCopied(true);
      showSnackbar(t('share.linkCopied'), 'success', 2000);
      
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => {
      showSnackbar(t('share.copyLinkFailed'), 'error', 2000);
    });
  };

  const canShare = selectedUser || (searchQuery.includes('@') && searchQuery.length > 5);

  // Mobile-specific hooks (must be called before any conditional returns)
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);
  
  const handleSheetChanges = useCallback((index: number) => {
    console.log('📱 Bottom sheet index:', index);
    if (index === -1) {
      onClose();
    }
  }, [onClose]);
  
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );
  
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      bottomSheetRef.current?.expand();
    } else if (!visible && Platform.OS !== 'web') {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

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
            <h2 style={{...webStyles.headerTitle, color: textColor}}>{t('share.shareNote')}</h2>
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
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>{t('share.shareWith')}</h3>
              <div style={{...webStyles.searchContainer, backgroundColor: backgroundSecondary, borderColor}}>
                <Ionicons name="search" size={20} color={textMutedColor} />
                <input
                  style={{...webStyles.searchInput, color: textColor, backgroundColor: 'transparent'}}
                  placeholder={t('share.searchUsersOrEmail')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoCapitalize="none"
                  type="email"
                />
                {searchQuery.length > 0 && !selectedUser && (
                  <button onClick={handleClearSearch} style={webStyles.clearButton}>
                    <Ionicons name="close-circle" size={20} color={textMutedColor} />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searching && (
                <div style={webStyles.searchingContainer}>
                  <LoadingSpinner size={20} />
                  <span style={{...webStyles.searchingText, color: textMutedColor}}>{t('share.searching')}</span>
                </div>
              )}

              {searchResults.length > 0 && (
                <div style={webStyles.searchResults}>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      style={{...webStyles.searchResultItem, borderColor}}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserSelect(user);
                      }}
                    >
                      <Ionicons name="person" size={20} color={textMutedColor} />
                      <div style={webStyles.userInfo}>
                        <div style={{...webStyles.userName, color: textColor}}>{user.display_name || t('share.unknownUser')}</div>
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
                    <div style={{...webStyles.userName, color: textColor}}>{selectedUser.display_name || t('share.unknownUser')}</div>
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
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>{t('share.permissionLevel')}</h3>
              <div style={webStyles.permissionOptions}>
                {[
                  { key: 'read' as SharePermission, labelKey: 'share.viewOnly', icon: 'eye' },
                  { key: 'admin' as SharePermission, labelKey: 'share.admin', icon: 'shield' },
                  { key: 'edit' as SharePermission, labelKey: 'share.edit', icon: 'create' },
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
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Message */}
            <div style={webStyles.section}>
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>{t('share.messageOptional')}</h3>
              <textarea
                style={{
                  ...webStyles.messageInput,
                  backgroundColor: backgroundSecondary,
                  borderColor,
                  color: textColor,
                }}
                placeholder={t('share.addMessage')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Public Link Section */}
            <div style={webStyles.section}>
              <h3 style={{...webStyles.sectionTitle, color: textColor}}>{t('share.publicLink')}</h3>
              <p style={{...webStyles.sectionSubtitle, color: textMutedColor}}>
                {t('share.publicLinkDescription')}
              </p>
              
              {!publicLink ? (
                <button
                  style={{
                    ...webStyles.createLinkButton,
                    backgroundColor: backgroundSecondary,
                    borderColor,
                    color: accentPrimary,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreatePublicLink();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size={20} color={accentPrimary} />
                  ) : (
                    <>
                      <Ionicons name="link" size={20} color={accentPrimary} />
                      {t('share.createPublicLink')}
                    </>
                  )}
                </button>
              ) : (
                <div style={{
                  ...webStyles.linkContainer,
                  backgroundColor: backgroundSecondary,
                  borderColor,
                }}>
                  <Ionicons name="link" size={20} color={accentPrimary} />
                  <div style={{...webStyles.linkText, color: textColor}}>
                    {publicLink}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink();
                    }}
                    style={webStyles.copyButton}
                  >
                    <Ionicons 
                      name={linkCopied ? "checkmark-circle" : "copy"} 
                      size={20} 
                      color={linkCopied ? "#10B981" : accentPrimary} 
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{...webStyles.actions, borderTopColor: borderColor}}>
            <button
              style={{...webStyles.cancelButton, borderColor, color: textColor}}
              onClick={onClose}
            >
              {t('share.cancel')}
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
                  {t('share.shareButton')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }

  // Mobile modal using Bottom Sheet
  console.log('📱 Rendering mobile ShareModal with BottomSheet:', { visible, note: note?.id, platform: Platform.OS });
  
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureContainer}>
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          backdropComponent={renderBackdrop}
          enablePanDownToClose={true}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backgroundStyle={{ backgroundColor }}
          handleIndicatorStyle={{ backgroundColor: textSecondary }}
        >
          <ShareCard
            note={note}
            onClose={onClose}
            onShareSuccess={onShareSuccess}
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
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
    backgroundColor: 'transparent',
    borderWidth: 0,
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
    backgroundColor: 'transparent',
    borderWidth: 0,
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
  sectionSubtitle: {
    fontSize: '12px',
    marginBottom: '12px',
    marginTop: '0',
  },
  createLinkButton: {
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
    fontWeight: '600',
    transition: 'all 0.2s',
    '&:hover': {
      opacity: 0.8,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
  linkContainer: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    gap: '8px',
  },
  linkText: {
    flex: 1,
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  copyButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
