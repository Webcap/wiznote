import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useThemeColor } from '../hooks/useThemeColor';
import { useAuth } from '../hooks/useAuth';

// Import changelog data
import changelogData from '../data/changelog.json';

interface ChangelogVersion {
  version: string;
  date: string;
  sections: {
    title: string;
    emoji: string;
    items: {
      title: string;
      description: string;
      details?: string[];
    }[];
  }[];
}

export default function ChangelogScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tintColor = useThemeColor({}, 'tint');
  const accentColor = useThemeColor({}, 'accentPrimary');
  
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set(['1.3.5']));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(version)) {
        newSet.delete(version);
      } else {
        newSet.add(version);
      }
      return newSet;
    });
  };

  const toggleItem = (itemKey: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Mobile header only
  const renderMobileHeader = () => (
    <ThemedView style={styles.mobileHeader}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <ThemedText style={styles.headerTitle}>Changelog</ThemedText>
      <View style={styles.headerRight} />
    </ThemedView>
  );

  const renderVersionCard = (versionData: ChangelogVersion) => {
    const isExpanded = expandedVersions.has(versionData.version);
    const isLatest = versionData.version === changelogData.versions[0].version;

    return (
      <ThemedView key={versionData.version} style={styles.versionCard}>
        <Pressable onPress={() => toggleVersion(versionData.version)}>
          <View style={styles.versionHeader}>
            <View style={styles.versionTitleContainer}>
              <ThemedText style={styles.versionNumber}>
                v{versionData.version}
              </ThemedText>
              {isLatest && (
                <View style={[styles.latestBadge, { backgroundColor: accentColor }]}>
                  <ThemedText style={styles.latestBadgeText}>Latest</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.versionMetaRow}>
              <ThemedText style={[styles.versionDate, { color: textSecondary }]}>
                {versionData.date}
              </ThemedText>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={textSecondary} 
              />
            </View>
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.versionContent}>
            {versionData.sections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionEmoji}>{section.emoji}</ThemedText>
                  <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
                </View>

                {section.items.map((item, itemIndex) => {
                  const itemKey = `${versionData.version}-${sectionIndex}-${itemIndex}`;
                  const isItemExpanded = expandedItems.has(itemKey);
                  const hasDetails = item.details && item.details.length > 0;

                  return (
                    <View key={itemIndex} style={styles.changeItem}>
                      <Pressable 
                        onPress={() => hasDetails && toggleItem(itemKey)}
                        disabled={!hasDetails}
                      >
                        <View style={styles.changeItemHeader}>
                          <View style={styles.bulletPoint} />
                          <View style={styles.changeItemContent}>
                            <ThemedText style={styles.changeTitle}>
                              {item.title}
                            </ThemedText>
                            {hasDetails && (
                              <Ionicons 
                                name={isItemExpanded ? "chevron-up" : "chevron-down"} 
                                size={16} 
                                color={textSecondary} 
                                style={styles.expandIcon}
                              />
                            )}
                          </View>
                        </View>
                      </Pressable>

                      <ThemedText style={[styles.changeDescription, { color: textSecondary }]}>
                        {item.description}
                      </ThemedText>

                      {hasDetails && isItemExpanded && (
                        <View style={styles.detailsList}>
                          {item.details!.map((detail, detailIndex) => (
                            <View key={detailIndex} style={styles.detailItem}>
                              <View style={styles.detailBullet} />
                              <ThemedText style={[styles.detailText, { color: textSecondary }]}>
                                {detail}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ThemedView>
    );
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Changelog"
        subtitle="Track all updates and improvements"
        sidebar={isAuthenticated ? <UserSidebar activePage="changelog" /> : null}
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
              <ThemedText style={styles.webHeaderTitle}>Changelog</ThemedText>
              <ThemedText style={[styles.webHeaderSubtitle, { color: textSecondary }]}>
                Track all updates and improvements
              </ThemedText>
            </View>
            <View style={styles.webHeaderRight} />
          </View>
        }
      >
        <View style={styles.webContent}>
          <View style={styles.intro}>
            <ThemedText style={styles.introText}>
              All notable changes to WizNote are documented here. The format follows{' '}
              <ThemedText style={[styles.link, { color: tintColor }]}>Keep a Changelog</ThemedText>
              {' '}and this project adheres to{' '}
              <ThemedText style={[styles.link, { color: tintColor }]}>Semantic Versioning</ThemedText>.
            </ThemedText>
          </View>

          <View style={styles.versionsContainer}>
            {changelogData.versions.map(renderVersionCard)}
          </View>
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderMobileHeader()}

      <View style={styles.intro}>
        <ThemedText style={styles.introText}>
          All notable changes to WizNote are documented here. The format follows{' '}
          <ThemedText style={[styles.link, { color: tintColor }]}>Keep a Changelog</ThemedText>
          {' '}and this project adheres to{' '}
          <ThemedText style={[styles.link, { color: tintColor }]}>Semantic Versioning</ThemedText>.
        </ThemedText>
      </View>

      <View style={styles.versionsContainer}>
        {changelogData.versions.map(renderVersionCard)}
      </View>
    </ScrollView>
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
  // Web Header (following design.json three-section layout)
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
  // Intro Section
  intro: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
    paddingVertical: 20,
    marginBottom: 10,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontWeight: '600',
  },
  // Versions Container
  versionsContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
    gap: 16,
  },
  // Version Card
  versionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  versionHeader: {
    marginBottom: 0,
  },
  versionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  versionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  latestBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  latestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionDate: {
    fontSize: 14,
  },
  // Version Content
  versionContent: {
    marginTop: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Change Items
  changeItem: {
    marginLeft: 8,
    marginBottom: 16,
  },
  changeItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6A5ACD',
    marginTop: 8,
  },
  changeItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginBottom: 4,
  },
  expandIcon: {
    marginLeft: 8,
  },
  changeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 18,
  },
  // Details List
  detailsList: {
    marginTop: 12,
    marginLeft: 18,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9BA1A6',
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

