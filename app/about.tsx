import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useThemeColor } from '../hooks/useThemeColor';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { getAppVersion } from '../utils/appVersion';

export default function AboutScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  
  const appVersion = getAppVersion();

  // Hide Expo Router header on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const hideHeader = () => {
        const header = document.querySelector('header');
        if (header) {
          header.style.display = 'none';
        }
      };
      
      hideHeader();
      const timer = setTimeout(hideHeader, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const features = [
    {
      icon: 'create',
      title: 'Smart Note Taking',
      description: 'Create and organize notes with rich text formatting and media support',
    },
    {
      icon: 'mic',
      title: 'Audio Recording',
      description: 'Record audio notes and transcribe them with AI-powered speech recognition',
    },
    {
      icon: 'document-text',
      title: 'PDF Support',
      description: 'Import and annotate PDF documents directly within your notes',
    },
    {
      icon: 'school',
      title: 'Flashcards & Quizzes',
      description: 'Generate study materials automatically from your notes using AI',
    },
    {
      icon: 'sparkles',
      title: 'AI Summaries',
      description: 'Get instant AI-generated summaries and key insights from your notes',
    },
    {
      icon: 'share-social',
      title: 'Easy Sharing',
      description: 'Share notes with secure links and collaborate with others',
    },
    {
      icon: 'cloud-upload',
      title: 'Cloud Sync',
      description: 'Access your notes anywhere with automatic cloud synchronization',
    },
    {
      icon: 'lock-closed',
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected with enterprise-grade security',
    },
  ];

  const links = [
    {
      icon: 'globe',
      title: 'Website',
      url: 'https://wiznote.app',
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      onPress: () => router.push('/help'),
    },
    {
      icon: 'document-text',
      title: 'Privacy Policy',
      onPress: () => router.push('/privacy'),
    },
    {
      icon: 'document-text',
      title: 'Terms of Service',
      onPress: () => router.push('/terms'),
    },
    {
      icon: 'list',
      title: 'Changelog',
      onPress: () => router.push('/changelog'),
    },
  ];

  // Mobile header only
  const renderMobileHeader = () => (
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

  const renderContent = () => (
    <View style={styles.content}>
      {/* Logo & App Info */}
      <View style={styles.logoSection}>
        <Logo size={120} />
        <ThemedText style={styles.appName}>WizNote</ThemedText>
        <ThemedText style={[styles.appVersion, { color: textSecondary }]}>
          Version {appVersion}
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: textSecondary }]}>
          Your intelligent note-taking companion
        </ThemedText>
      </View>

      {/* Description */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor }]}>
        <ThemedText style={styles.descriptionText}>
          WizNote is a modern, AI-powered note-taking application designed to help you capture,
          organize, and study your notes more effectively. With features like audio transcription,
          AI summaries, and automatic flashcard generation, WizNote transforms the way you learn
          and retain information.
        </ThemedText>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresSection}>
        <ThemedText style={styles.sectionTitle}>Features</ThemedText>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={[styles.featureCard, { backgroundColor: backgroundSecondary, borderColor }]}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: accentPrimary + '20' }]}>
                <Ionicons name={feature.icon as any} size={24} color={accentPrimary} />
              </View>
              <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
              <ThemedText style={[styles.featureDescription, { color: textSecondary }]}>
                {feature.description}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.linksSection}>
        <ThemedText style={styles.sectionTitle}>Quick Links</ThemedText>
        <View style={styles.linksList}>
          {links.map((link, index) => (
            <Pressable
              key={index}
              style={[styles.linkCard, { backgroundColor: backgroundSecondary, borderColor }]}
              onPress={link.onPress || (() => handleLinkPress(link.url!))}
            >
              <View style={styles.linkContent}>
                <Ionicons name={link.icon as any} size={20} color={accentPrimary} />
                <ThemedText style={styles.linkTitle}>{link.title}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondary} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
          Made with ❤️ for students and lifelong learners
        </ThemedText>
        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
          © {new Date().getFullYear()} WizNote. All rights reserved.
        </ThemedText>
      </View>
    </View>
  );

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <WebLayout
          title="About WizNote"
          subtitle="Learn more about your intelligent note-taking companion"
          sidebar={isAuthenticated ? <UserSidebar activePage="about" /> : null}
          header={
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
          }
        >
          <ScrollView 
            style={styles.webContent}
            showsVerticalScrollIndicator={false}
          >
            {renderContent()}
          </ScrollView>
        </WebLayout>
      </>
    );
  }

  // Mobile layout
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView 
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderMobileHeader()}
        {renderContent()}
      </ScrollView>
    </>
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
    flex: 1,
    padding: 20,
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
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
    gap: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  appVersion: {
    fontSize: 16,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Description Section
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  // Features Section
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    width: Platform.OS === 'web' ? 'calc(50% - 8px)' : '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Links Section
  linksSection: {
    marginBottom: 32,
  },
  linksList: {
    gap: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});


