import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
// @ts-ignore - react-dom types not available in React Native environment
import { createPortal } from 'react-dom';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useThemeColor } from '../hooks/useThemeColor';
import { accountDeletionService } from '../services/AccountDeletionService';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemedText } from './ThemedText';

interface DeleteAccountModalProps {
  visible: boolean;
  userId: string;
  userEmail: string;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

export const DeleteAccountModal = ({ 
  visible, 
  userId, 
  userEmail, 
  onClose, 
  onDeleteSuccess 
}: DeleteAccountModalProps) => {
  const { showSnackbar } = useSnackbar();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const borderColor = useThemeColor({}, 'border');
  const dangerColor = '#FF6B6B';

  const handleClose = () => {
    setPassword('');
    setConfirmText('');
    setShowPassword(false);
    onClose();
  };

  const handleDelete = async () => {
    // Validation
    if (!password.trim()) {
      const message = 'Please enter your password to confirm deletion.';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 3000);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    if (confirmText.trim().toLowerCase() !== 'delete') {
      const message = 'Please type "DELETE" to confirm account deletion.';
      if (Platform.OS === 'web') {
        showSnackbar(message, 'error', 3000);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    // Show final confirmation
    const confirmDeletion = () => {
      performDeletion();
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '⚠️ FINAL WARNING ⚠️\n\n' +
        'This action is PERMANENT and CANNOT be undone!\n\n' +
        'All your data will be permanently deleted:\n' +
        '• All notes and content\n' +
        '• All quizzes and flashcards\n' +
        '• All files (audio, PDFs)\n' +
        '• Your account and profile\n\n' +
        'Are you absolutely sure you want to continue?'
      );
      if (confirmed) {
        confirmDeletion();
      }
    } else {
      Alert.alert(
        '⚠️ FINAL WARNING',
        'This action is PERMANENT and CANNOT be undone!\n\n' +
        'All your data will be permanently deleted:\n' +
        '• All notes and content\n' +
        '• All quizzes and flashcards\n' +
        '• All files (audio, PDFs)\n' +
        '• Your account and profile\n\n' +
        'Are you absolutely sure you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Everything', 
            style: 'destructive',
            onPress: confirmDeletion
          }
        ]
      );
    }
  };

  const performDeletion = async () => {
    setLoading(true);
    showSnackbar('Deleting your account...', 'info', 3000);

    try {
      const result = await accountDeletionService.deleteAccountWithVerification(
        userId,
        userEmail,
        password
      );

      if (result.success) {
        showSnackbar('Your account has been permanently deleted.', 'success', 5000);
        handleClose();
        onDeleteSuccess();
      } else {
        const errorMessage = result.error || 'Failed to delete account. Please try again.';
        if (Platform.OS === 'web') {
          showSnackbar(errorMessage, 'error', 5000);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      if (Platform.OS === 'web') {
        showSnackbar(errorMessage, 'error', 5000);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const canDelete = password.trim().length > 0 && confirmText.trim().toLowerCase() === 'delete';

  if (!visible) return null;

  // Web modal using createPortal
  if (Platform.OS === 'web') {
    const modalContent = (
      <div style={webStyles.modalOverlay} onClick={handleClose}>
        <div style={{...webStyles.container, backgroundColor}} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{...webStyles.header, borderBottomColor: borderColor}}>
            <div style={webStyles.headerIcon}>
              <Ionicons name="warning" size={24} color={dangerColor} />
            </div>
            <h2 style={{...webStyles.headerTitle, color: dangerColor}}>Delete Account</h2>
            <button style={webStyles.closeButton} onClick={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={textColor} />
            </button>
          </div>

          <div style={webStyles.content}>
            {/* Warning */}
            <div style={{...webStyles.warningBox, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
              <Ionicons name="alert-circle" size={20} color={dangerColor} />
              <div style={{...webStyles.warningText, color: '#991B1B'}}>
                <strong>Warning:</strong> This action is permanent and cannot be undone!
              </div>
            </div>

            {/* Info */}
            <div style={webStyles.section}>
              <p style={{...webStyles.infoText, color: textColor}}>
                Deleting your account will permanently remove:
              </p>
              <ul style={{...webStyles.list, color: textMutedColor}}>
                <li>All your notes and content</li>
                <li>All quizzes and flashcards</li>
                <li>All uploaded files (audio, PDFs)</li>
                <li>All usage data and statistics</li>
                <li>Your account and profile information</li>
                <li>Your subscription (if any)</li>
              </ul>
            </div>

            {/* Password Input */}
            <div style={webStyles.section}>
              <label style={{...webStyles.label, color: textColor}}>
                Confirm your password <span style={{ color: dangerColor }}>*</span>
              </label>
              <div style={{...webStyles.passwordContainer, backgroundColor: backgroundSecondary, borderColor}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{...webStyles.input, color: textColor, backgroundColor: 'transparent'}}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={webStyles.eyeButton}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={textMutedColor} 
                  />
                </button>
              </div>
            </div>

            {/* Confirmation Text Input */}
            <div style={webStyles.section}>
              <label style={{...webStyles.label, color: textColor}}>
                Type "DELETE" to confirm <span style={{ color: dangerColor }}>*</span>
              </label>
              <input
                type="text"
                style={{
                  ...webStyles.confirmInput,
                  backgroundColor: backgroundSecondary,
                  borderColor,
                  color: textColor,
                }}
                placeholder='Type "DELETE" in capital letters'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{...webStyles.actions, borderTopColor: borderColor}}>
            <button
              style={{...webStyles.cancelButton, borderColor, color: textColor}}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              style={{
                ...webStyles.deleteButton,
                backgroundColor: canDelete ? dangerColor : '#CCCCCC',
                opacity: canDelete && !loading ? 1 : 0.6,
              }}
              onClick={handleDelete}
              disabled={!canDelete || loading}
            >
              {loading ? (
                <LoadingSpinner size={20} color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  Delete My Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }

  // Mobile modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <View style={styles.headerIcon}>
                  <Ionicons name="warning" size={24} color={dangerColor} />
                </View>
                <ThemedText style={[styles.headerTitle, { color: dangerColor }]}>
                  Delete Account
                </ThemedText>
                <TouchableOpacity onPress={handleClose} disabled={loading}>
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                  
                  {/* Warning */}
                  <View style={[styles.warningBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                    <Ionicons name="alert-circle" size={20} color={dangerColor} />
                    <ThemedText style={[styles.warningText, { color: '#991B1B' }]}>
                      Warning: This action is permanent and cannot be undone!
                    </ThemedText>
                  </View>

                  {/* Info */}
                  <View style={styles.section}>
                    <ThemedText style={styles.infoText}>
                      Deleting your account will permanently remove:
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • All your notes and content
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • All quizzes and flashcards
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • All uploaded files (audio, PDFs)
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • All usage data and statistics
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • Your account and profile
                    </ThemedText>
                    <ThemedText style={[styles.listItem, { color: textMutedColor }]}>
                      • Your subscription (if any)
                    </ThemedText>
                  </View>

                  {/* Password Input */}
                  <View style={styles.section}>
                    <ThemedText style={styles.label}>
                      Confirm your password <ThemedText style={{ color: dangerColor }}>*</ThemedText>
                    </ThemedText>
                    <View style={[styles.passwordContainer, { backgroundColor: backgroundSecondary, borderColor }]}>
                      <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder="Enter your password"
                        placeholderTextColor={textMutedColor}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                        autoCapitalize="none"
                        autoComplete="password"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                        <Ionicons 
                          name={showPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color={textMutedColor} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirmation Text Input */}
                  <View style={styles.section}>
                    <ThemedText style={styles.label}>
                      Type "DELETE" to confirm <ThemedText style={{ color: dangerColor }}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.confirmInput,
                        { backgroundColor: backgroundSecondary, borderColor, color: textColor }
                      ]}
                      placeholder='Type "DELETE" in capital letters'
                      placeholderTextColor={textMutedColor}
                      value={confirmText}
                      onChangeText={setConfirmText}
                      editable={!loading}
                      autoCapitalize="characters"
                      autoComplete="off"
                    />
                  </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.actions, { borderTopColor: borderColor }]}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor }]}
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      { 
                        backgroundColor: canDelete ? dangerColor : '#CCCCCC',
                        opacity: canDelete && !loading ? 1 : 0.6,
                      }
                    ]}
                    onPress={handleDelete}
                    disabled={!canDelete || loading}
                  >
                    {loading ? (
                      <LoadingSpinner size={20} color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={20} color="#FFFFFF" />
                        <ThemedText style={styles.deleteButtonText}>Delete My Account</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '90%',
    width: '100%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 14,
    marginLeft: 8,
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  eyeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 16,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '90vh',
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
  headerIcon: {
    width: '32px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    flex: 1,
    textAlign: 'center' as const,
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
    overflowY: 'auto' as const,
    marginTop: '20px',
    marginBottom: '20px',
  },
  warningBox: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    marginBottom: '16px',
    gap: '8px',
  },
  warningText: {
    flex: 1,
    fontSize: '14px',
    lineHeight: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px',
    marginBottom: '8px',
    marginTop: 0,
  },
  list: {
    fontSize: '14px',
    marginLeft: '16px',
    marginTop: '4px',
    marginBottom: '4px',
    lineHeight: '1.6',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    display: 'block',
  },
  passwordContainer: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderRadius: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    gap: '8px',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '10px 0',
  },
  eyeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmInput: {
    width: '100%',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
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
  },
  deleteButton: {
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
  },
};

