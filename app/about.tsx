import React from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useThemeColor } from '../hooks/useThemeColor';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { getAppVersion, getFullVersion, getBuildNumber } from '../utils/appVersion';

export default function AboutScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  
  // Get version information
  const appVersion = getAppVersion();
  const fullVersion = getFullVersion();
  const buildNumber = getBuildNumber();

  const openURL = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const renderHeader = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webHeader}>
          <View style={styles.webHeaderLeft}>
            <Pressable
              onPress={() => router.back()}
              style={styles.webBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </Pressable>
          </View>
          <View style={styles.webHeaderCenter}>
            <ThemedText style={styles.webHeaderTitle}>About WizNote</ThemedText>
            <ThemedText style={[styles.webHeaderSubtitle, { color: textSecondary }]}>
              Your intelligent note-taking companion
            </ThemedText>
          </View>
          <View style={styles.webHeaderRight} />
        </View>
      );
    }

    return (
      <ThemedView style={styles.mobileHeader}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>About WizNote</ThemedText>
        <View style={styles.headerRight} />
      </ThemedView>
    );
  };

  const content = (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {Platform.OS !== 'web' && renderHeader()}

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Logo size={120} />
        <ThemedText style={styles.appName}>WizNote</ThemedText>
        <ThemedText style={[styles.version, { color: textSecondary }]}>
          Version {appVersion}
        </ThemedText>
        {buildNumber && (
          <ThemedText style={[styles.buildNumber, { color: textSecondary }]}>
            Build {buildNumber}
          </ThemedText>
        )}
        <ThemedText style={[styles.tagline, { color: textSecondary }]}>
          Your intelligent note-taking companion
        </ThemedText>
      </View>

      {/* Description */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText style={styles.cardTitle}>What is WizNote?</ThemedText>
        <ThemedText style={[styles.cardText, { color: textSecondary }]}>
          WizNote is a powerful, AI-enhanced note-taking application designed to help you capture, 
          organize, and learn from your notes. Whether you're a student, professional, or lifelong 
          learner, WizNote provides the tools you need to stay organized and productive.
        </ThemedText>
      </View>

      {/* Features */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText style={styles.cardTitle}>Key Features</ThemedText>
        <View style={styles.featureList}>
          <FeatureItem icon="document-text" text="Rich text notes with formatting" color={accentColor} />
          <FeatureItem icon="mic" text="Audio recording and transcription" color={accentColor} />
          <FeatureItem icon="document" text="PDF import and text extraction" color={accentColor} />
          <FeatureItem icon="sparkles" text="AI-powered summaries and insights" color={accentColor} />
          <FeatureItem icon="school" text="Flashcard generation for studying" color={accentColor} />
          <FeatureItem icon="help-circle" text="Quiz creation from your notes" color={accentColor} />
          <FeatureItem icon="share-social" text="Note sharing with others" color={accentColor} />
          <FeatureItem icon="archive" text="Organization with tags and archives" color={accentColor} />
          <FeatureItem icon="sync" text="Real-time sync across devices" color={accentColor} />
          <FeatureItem icon="moon" text="Dark mode support" color={accentColor} />
        </View>
      </View>

      {/* Links */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText style={styles.cardTitle}>More Information</ThemedText>
        <Pressable 
          style={styles.linkItem}
          onPress={() => router.push('/privacy')}
        >
          <Ionicons name="shield-checkmark" size={20} color={accentColor} />
          <ThemedText style={styles.linkText}>Privacy Policy</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </Pressable>
        <Pressable 
          style={styles.linkItem}
          onPress={() => router.push('/terms')}
        >
          <Ionicons name="document-text" size={20} color={accentColor} />
          <ThemedText style={styles.linkText}>Terms of Service</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </Pressable>
        <Pressable 
          style={styles.linkItem}
          onPress={() => router.push('/changelog')}
        >
          <Ionicons name="list" size={20} color={accentColor} />
          <ThemedText style={styles.linkText}>Changelog</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </Pressable>
        <Pressable 
          style={styles.linkItem}
          onPress={() => router.push('/help')}
        >
          <Ionicons name="help-circle" size={20} color={accentColor} />
          <ThemedText style={styles.linkText}>Help & Support</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </Pressable>
        <Pressable 
          style={styles.linkItem}
          onPress={() => openURL('https://wiznote.app')}
        >
          <Ionicons name="globe" size={20} color={accentColor} />
          <ThemedText style={styles.linkText}>Visit Website</ThemedText>
          <Ionicons name="open" size={20} color={textSecondary} />
        </Pressable>
      </View>

      {/* Credits */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText style={styles.cardTitle}>Credits</ThemedText>
        <ThemedText style={[styles.cardText, { color: textSecondary }]}>
          WizNote is built with React Native, Expo, and powered by AI technologies 
          including OpenAI's Whisper and GPT models. We use Supabase for backend services 
          and Stripe for secure payment processing.
        </ThemedText>
      </View>

      {/* Copyright */}
      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
          © 2024-2025 WizNote Team
        </ThemedText>
        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
          All rights reserved
        </ThemedText>
        <ThemedText style={[styles.footerText, { color: textSecondary, marginTop: 10 }]}>
          Made with ❤️ for learners everywhere
        </ThemedText>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="About WizNote"
        subtitle="Your intelligent note-taking companion"
        sidebar={isAuthenticated ? <UserSidebar activePage="about" /> : null}
        header={renderHeader()}
      >
        <View style={styles.webContent}>
          {content}
        </View>
      </WebLayout>
    );
  }

  return content;
}

interface FeatureItemProps {
  icon: string;
  text: string;
  color: string;
}

function FeatureItem({ icon, text, color }: FeatureItemProps) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={20} color={color} />
      <ThemedText style={[styles.featureText, { color: textSecondary }]}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  webContent: {
    padding: 20,
  },
  // Web Header
  webHeader: {
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
  },
  webHeaderLeft: {
    flex: 0,
    minWidth: 40,
  },
  webHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderRight: {
    flex: 0,
    minWidth: 40,
  },
  webBackButton: {
    padding: 8,
    borderRadius: 8,
  },
  webHeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  webHeaderSubtitle: {
    fontSize: 16,
  },
  // Mobile Header
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  // Logo Section
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  version: {
    fontSize: 16,
    marginTop: 8,
  },
  buildNumber: {
    fontSize: 14,
    marginTop: 2,
  },
  tagline: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  // Cards
  card: {
    marginHorizontal: Platform.OS === 'web' ? 0 : 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Features
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  // Links
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  linkText: {
    fontSize: 16,
    flex: 1,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

