import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';
import { PDF_CONFIG } from '../constants/PDFConfig';

interface PDFSizeLimitWarningProps {
  visible: boolean;
  fileName: string;
  fileSize: number; // in bytes
  onClose: () => void;
  onCompress?: () => void; // Optional compress action
}

export function PDFSizeLimitWarning({ 
  visible, 
  fileName, 
  fileSize, 
  onClose,
  onCompress 
}: PDFSizeLimitWarningProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Shake animation for the warning icon
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  const maxSizeMB = PDF_CONFIG.MAX_FILE_SIZE_DISPLAY;
  const overByMB = ((fileSize - PDF_CONFIG.MAX_FILE_SIZE_BYTES) / (1024 * 1024)).toFixed(2);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  { scale: scaleAnim },
                ],
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedView style={[styles.modal, { backgroundColor: cardBg, borderColor }]}>
              {/* Warning Icon with Animation */}
              <Animated.View 
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ translateX: shakeAnim }],
                  }
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="warning" size={48} color="#F59E0B" />
                </View>
              </Animated.View>

              {/* Title */}
              <ThemedText style={[styles.title, { color: textColor }]}>
                File Too Large
              </ThemedText>

              {/* File Info */}
              <View style={[styles.fileInfo, { backgroundColor, borderColor }]}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document" size={20} color="#E74C3C" />
                </View>
                <View style={styles.fileDetails}>
                  <ThemedText style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
                    {fileName}
                  </ThemedText>
                  <ThemedText style={[styles.fileSize, { color: '#EF4444' }]}>
                    {fileSizeMB} MB
                  </ThemedText>
                </View>
              </View>

              {/* Message */}
              <ThemedText style={[styles.message, { color: textSecondary }]}>
                This file exceeds the maximum upload size of <ThemedText style={styles.highlight}>{maxSizeMB}</ThemedText> by{' '}
                <ThemedText style={[styles.highlight, { color: '#EF4444' }]}>{overByMB} MB</ThemedText>.
              </ThemedText>

              {/* Suggestions */}
              <View style={[styles.suggestions, { backgroundColor, borderColor }]}>
                <ThemedText style={[styles.suggestionsTitle, { color: textColor }]}>
                  💡 Suggestions:
                </ThemedText>
                <View style={styles.suggestionsList}>
                  <View style={styles.suggestionItem}>
                    <View style={styles.bulletPoint}>
                      <View style={[styles.bullet, { backgroundColor: textSecondary }]} />
                    </View>
                    <ThemedText style={[styles.suggestionText, { color: textSecondary }]}>
                      Compress the PDF using online tools
                    </ThemedText>
                  </View>
                  <View style={styles.suggestionItem}>
                    <View style={styles.bulletPoint}>
                      <View style={[styles.bullet, { backgroundColor: textSecondary }]} />
                    </View>
                    <ThemedText style={[styles.suggestionText, { color: textSecondary }]}>
                      Split into smaller documents
                    </ThemedText>
                  </View>
                  <View style={styles.suggestionItem}>
                    <View style={styles.bulletPoint}>
                      <View style={[styles.bullet, { backgroundColor: textSecondary }]} />
                    </View>
                    <ThemedText style={[styles.suggestionText, { color: textSecondary }]}>
                      Remove unnecessary images or pages
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {onCompress && (
                  <TouchableOpacity 
                    style={[styles.button, styles.compressButton]}
                    onPress={onCompress}
                  >
                    <Ionicons name="resize" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.compressButtonText}>
                      Compress PDF
                    </ThemedText>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.button, styles.closeButton, { borderColor }]}
                  onPress={onClose}
                >
                  <ThemedText style={[styles.closeButtonText, { color: textColor }]}>
                    Got It
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Close X Button */}
              <TouchableOpacity 
                style={styles.closeIcon}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </ThemedView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Platform.OS === 'web' ? 480 : '90%',
    maxWidth: 480,
  },
  modal: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  suggestions: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    paddingTop: 6,
    marginRight: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  compressButton: {
    backgroundColor: '#10B981',
  },
  compressButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});

