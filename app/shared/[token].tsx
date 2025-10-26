import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { noteSharingService } from '../../services/NoteSharingService';
import { Note } from '../../types/Note';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = SCREEN_WIDTH < 768;

export default function PublicShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const navigation = useNavigation();

  // Hide the header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    loadSharedNote();
  }, [token]);

  const loadSharedNote = async () => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await noteSharingService.accessPublicShare(token);
      setNote(result.note);
      setShareInfo(result.share);
      
    } catch (err) {
      console.error('Error loading shared note:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shared note');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centerContent}>
          <LoadingSpinner size={48} />
          <ThemedText style={[styles.loadingText, { color: textMutedColor }]}>
            Loading shared note...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !note) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <ThemedText style={[styles.errorTitle, { color: textColor }]}>
            {error || 'Note Not Found'}
          </ThemedText>
          <ThemedText style={[styles.errorMessage, { color: textMutedColor }]}>
            This link may have expired or been revoked.
          </ThemedText>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accentColor }]}
              onPress={() => router.push('/')}
            >
              <ThemedText style={styles.buttonText}>Go to Home</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: cardBackground }]}>
        <View style={[styles.headerContent, isWeb && !isMobile && styles.headerContentWeb]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBadge, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="share-social" size={24} color={accentColor} />
            </View>
            <View>
              <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                Shared Note
              </ThemedText>
              <ThemedText style={[styles.headerSubtitle, { color: textMutedColor }]}>
                Read-only access
              </ThemedText>
            </View>
          </View>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => router.back()} style={[styles.closeButton, { borderColor }]}>
              <Ionicons name="close" size={20} color={textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={[
          styles.content,
          isWeb && !isMobile && styles.contentWeb
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Share Info Banner */}
        <View style={[styles.shareBanner, { backgroundColor: cardBackground, borderColor }]}>
          <Ionicons name="information-circle" size={20} color={accentColor} />
          <View style={styles.shareInfo}>
            <ThemedText style={[styles.shareInfoText, { color: textMutedColor }]}>
              This is a read-only shared note
            </ThemedText>
            {shareInfo?.expires_at && (
              <ThemedText style={[styles.expiryText, { color: textMutedColor }]}>
                Expires: {formatDate(new Date(shareInfo.expires_at))}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Note Content */}
        <View style={[styles.noteCard, { backgroundColor: cardBackground, borderColor }]}>
          {/* Title */}
          <View style={styles.noteHeader}>
            <ThemedText style={[styles.noteTitle, { color: textColor }]}>
              {note.title}
            </ThemedText>
          </View>

          {/* Metadata */}
          <View style={styles.metadata}>
            {note.tags && note.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {note.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                    <ThemedText style={[styles.tagText, { color: accentColor }]}>
                      #{tag}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
            <ThemedText style={[styles.dateText, { color: textMutedColor }]}>
              Updated: {formatDate(note.updatedAt)}
            </ThemedText>
          </View>

          {/* Summary */}
          {note.summary && (
            <View style={[styles.summarySection, { backgroundColor: backgroundColor, borderColor }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text" size={16} color={accentColor} />
                <ThemedText style={[styles.summaryTitle, { color: textColor }]}>
                  Summary
                </ThemedText>
              </View>
              <ThemedText style={[styles.summaryText, { color: textMutedColor }]}>
                {note.summary}
              </ThemedText>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentSection}>
            <ThemedText style={[styles.contentText, { color: textColor }]}>
              {note.content}
            </ThemedText>
          </View>

          {/* Key Details */}
          {note.keyDetails && note.keyDetails.length > 0 && (
            <View style={[styles.keyDetailsSection, { backgroundColor: backgroundColor, borderColor }]}>
              <View style={styles.keyDetailsHeader}>
                <Ionicons name="key" size={16} color={accentColor} />
                <ThemedText style={[styles.keyDetailsTitle, { color: textColor }]}>
                  Key Details
                </ThemedText>
              </View>
              {note.keyDetails.map((detail, index) => (
                <View key={index} style={styles.keyDetailItem}>
                  <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                  <ThemedText style={[styles.keyDetailText, { color: textColor }]}>
                    {detail}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer with Branding */}
        {isWeb && (
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <View style={styles.footerContent}>
              {/* Branding Section */}
              <View style={styles.brandingSection}>
                <Image
                  source={require('../../assets/images/wiznote-logo.svg')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <View style={styles.brandInfo}>
                  <ThemedText style={[styles.brandName, { color: textColor }]}>
                    WizNote
                  </ThemedText>
                  <ThemedText style={[styles.brandTagline, { color: textMutedColor }]}>
                    Smart note-taking with AI-powered insights
                  </ThemedText>
                </View>
              </View>

              {/* Call to Action */}
              <ThemedText style={[styles.footerCTA, { color: textColor }]}>
                Want to create your own AI-powered notes?
              </ThemedText>
              
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary, { backgroundColor: accentColor }]}
                  onPress={() => router.push('/signup')}
                >
                  <Ionicons name="rocket" size={18} color="#FFFFFF" />
                  <ThemedText style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
                    Get Started Free
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary, { borderColor }]}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Ionicons name="log-in" size={18} color={accentColor} />
                  <ThemedText style={[styles.footerButtonText, { color: accentColor }]}>
                    Log In
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Features List */}
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <Ionicons name="mic" size={16} color={accentColor} />
                  <ThemedText style={[styles.featureText, { color: textMutedColor }]}>
                    Voice Notes
                  </ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="sparkles" size={16} color={accentColor} />
                  <ThemedText style={[styles.featureText, { color: textMutedColor }]}>
                    AI Summaries
                  </ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="document-text" size={16} color={accentColor} />
                  <ThemedText style={[styles.featureText, { color: textMutedColor }]}>
                    PDF Upload
                  </ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="school" size={16} color={accentColor} />
                  <ThemedText style={[styles.featureText, { color: textMutedColor }]}>
                    AI Quizzes
                  </ThemedText>
                </View>
              </View>

              {/* Copyright */}
              <ThemedText style={[styles.copyright, { color: textMutedColor }]}>
                © 2024 WizNote. All rights reserved.
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    ...(isWeb && {
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    } as any),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContentWeb: {
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: 40,
    paddingVertical: 24,
  } as any,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as any),
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  contentWeb: {
    maxWidth: 900,
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: 40,
    paddingVertical: 40,
  } as any,
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isWeb && !isMobile ? 60 : 40,
    gap: isWeb && !isMobile ? 24 : 16,
    maxWidth: isWeb && !isMobile ? 600 : undefined,
    marginHorizontal: 'auto',
  } as any,
  loadingText: {
    fontSize: isWeb && !isMobile ? 18 : 16,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: isWeb && !isMobile ? 28 : 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: isWeb && !isMobile ? 20 : 16,
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: isWeb && !isMobile ? 16 : 14,
    textAlign: 'center',
    marginTop: isWeb && !isMobile ? 12 : 8,
    lineHeight: isWeb && !isMobile ? 24 : 20,
    maxWidth: 400,
  },
  button: {
    paddingVertical: isWeb && !isMobile ? 14 : 12,
    paddingHorizontal: isWeb && !isMobile ? 32 : 24,
    borderRadius: isWeb && !isMobile ? 10 : 8,
    marginTop: isWeb && !isMobile ? 32 : 24,
    ...(isWeb && {
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
    } as any),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: isWeb && !isMobile ? 15 : 14,
    fontWeight: '700',
  },
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isWeb && !isMobile ? 20 : 16,
    borderRadius: isWeb && !isMobile ? 16 : 12,
    borderWidth: 1,
    marginBottom: isWeb && !isMobile ? 32 : 20,
    gap: 16,
    ...(isWeb && {
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    } as any),
  },
  shareInfo: {
    flex: 1,
  },
  shareInfoText: {
    fontSize: isWeb && !isMobile ? 15 : 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  expiryText: {
    fontSize: isWeb && !isMobile ? 13 : 12,
    marginTop: 6,
    lineHeight: 18,
  },
  noteCard: {
    borderRadius: isWeb && !isMobile ? 16 : 12,
    borderWidth: 1,
    padding: isWeb && !isMobile ? 32 : 20,
    marginBottom: isWeb && !isMobile ? 32 : 20,
    ...(isWeb && {
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    } as any),
  },
  noteHeader: {
    marginBottom: isWeb && !isMobile ? 24 : 16,
    paddingBottom: isWeb && !isMobile ? 20 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  noteTitle: {
    fontSize: isWeb && !isMobile ? 32 : 24,
    fontWeight: '700',
    lineHeight: isWeb && !isMobile ? 42 : 32,
    letterSpacing: -0.5,
  },
  metadata: {
    marginBottom: isWeb && !isMobile ? 24 : 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isWeb && !isMobile ? 10 : 8,
    marginBottom: isWeb && !isMobile ? 16 : 12,
  },
  tag: {
    paddingHorizontal: isWeb && !isMobile ? 14 : 12,
    paddingVertical: isWeb && !isMobile ? 8 : 6,
    borderRadius: 20,
    borderWidth: 1,
    ...(isWeb && {
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    } as any),
  },
  tagText: {
    fontSize: isWeb && !isMobile ? 13 : 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: isWeb && !isMobile ? 14 : 12,
    opacity: 0.7,
  },
  summarySection: {
    padding: isWeb && !isMobile ? 24 : 16,
    borderRadius: isWeb && !isMobile ? 12 : 8,
    borderWidth: 1,
    marginBottom: isWeb && !isMobile ? 32 : 20,
    ...(isWeb && {
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    } as any),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: isWeb && !isMobile ? 12 : 8,
  },
  summaryTitle: {
    fontSize: isWeb && !isMobile ? 16 : 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  summaryText: {
    fontSize: isWeb && !isMobile ? 15 : 14,
    lineHeight: isWeb && !isMobile ? 24 : 20,
  },
  contentSection: {
    marginBottom: isWeb && !isMobile ? 32 : 20,
  },
  contentText: {
    fontSize: isWeb && !isMobile ? 17 : 16,
    lineHeight: isWeb && !isMobile ? 28 : 24,
    ...(isWeb && {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    } as any),
  },
  keyDetailsSection: {
    padding: isWeb && !isMobile ? 24 : 16,
    borderRadius: isWeb && !isMobile ? 12 : 8,
    borderWidth: 1,
    ...(isWeb && {
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    } as any),
  },
  keyDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: isWeb && !isMobile ? 16 : 12,
    paddingBottom: isWeb && !isMobile ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  keyDetailsTitle: {
    fontSize: isWeb && !isMobile ? 16 : 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  keyDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: isWeb && !isMobile ? 12 : 8,
    paddingVertical: 4,
  },
  keyDetailText: {
    flex: 1,
    fontSize: isWeb && !isMobile ? 15 : 14,
    lineHeight: isWeb && !isMobile ? 24 : 20,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: isWeb && !isMobile ? 40 : 20,
    borderTopWidth: 1,
  } as any,
  footerContent: {
    alignItems: 'center',
    gap: isWeb && !isMobile ? 24 : 16,
    paddingVertical: isWeb && !isMobile ? 48 : 32,
    maxWidth: 900,
    width: '100%',
    marginHorizontal: 'auto',
  },
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  brandLogo: {
    width: 56,
    height: 56,
  },
  brandInfo: {
    gap: 4,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '400',
  },
  footerCTA: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    } as any),
  },
  footerButtonPrimary: {
    minWidth: 180,
  },
  footerButtonSecondary: {
    borderWidth: 2,
    minWidth: 140,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});

