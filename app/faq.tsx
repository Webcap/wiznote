import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { WebLayout } from '../components/web/WebLayout';
import { UserSidebar } from '../components/web/UserSidebar';
import { useThemeColor } from '../hooks/useThemeColor';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import faqData from '../data/faq.json';

interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: string;
  questions: FAQQuestion[];
}

interface FAQData {
  categories: FAQCategory[];
  supportContact: {
    message: string;
    cta: string;
    description: string;
  };
}

export default function FAQScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tintColor = useThemeColor({}, 'tint');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const faqContent = faqData as FAQData;

  // Filter categories and questions based on search
  const filteredCategories = faqContent.categories
    .filter(category => {
      if (selectedCategory && category.id !== selectedCategory) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        category.title.toLowerCase().includes(query) ||
        category.questions.some(
          q =>
            q.question.toLowerCase().includes(query) ||
            q.answer.toLowerCase().includes(query)
        )
      );
    })
    .map(category => ({
      ...category,
      questions: category.questions.filter(q => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          q.question.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query)
        );
      }),
    }))
    .filter(category => category.questions.length > 0);

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

  // Clear search when category changes
  useEffect(() => {
    if (selectedCategory) {
      setSearchQuery('');
    }
  }, [selectedCategory]);

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

  // Mobile header only
  const renderMobileHeader = () => (
    <ThemedView style={styles.mobileHeader}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <ThemedText style={styles.headerTitle}>{t('faq.title')}</ThemedText>
      <View style={styles.headerRight} />
    </ThemedView>
  );

  const renderCategory = (category: FAQCategory, categoryIndex: number) => {
    return (
      <View key={category.id} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Ionicons
            name={category.icon as any}
            size={24}
            color={accentColor}
          />
          <ThemedText style={styles.categoryTitle}>{category.title}</ThemedText>
        </View>

        <View style={styles.questionsContainer}>
          {category.questions.map((item, itemIndex) => {
            const itemKey = `${category.id}-${itemIndex}`;
            const isExpanded = expandedItems.has(itemKey);

            return (
              <ThemedView
                key={itemIndex}
                style={[styles.questionCard, { backgroundColor: backgroundSecondary }]}
              >
                <Pressable onPress={() => toggleItem(itemKey)}>
                  <View style={styles.questionHeader}>
                    <ThemedText style={styles.questionText}>
                      {item.question}
                    </ThemedText>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={textSecondary}
                    />
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.answerContainer}>
                    <ThemedText
                      style={[styles.answerText, { color: textSecondary }]}
                    >
                      {item.answer}
                    </ThemedText>
                  </View>
                )}
              </ThemedView>
            );
          })}
        </View>
      </View>
    );
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <WebLayout
        title={t('faq.title')}
        subtitle={t('faq.subtitle')}
        sidebar={isAuthenticated ? <UserSidebar activePage="faq" /> : null}
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
              <ThemedText style={styles.webHeaderTitle}>
                {t('faq.title')}
              </ThemedText>
              <ThemedText
                style={[styles.webHeaderSubtitle, { color: textSecondary }]}
              >
                {t('faq.subtitle')}
              </ThemedText>
            </View>
            <View style={styles.webHeaderRight} />
          </View>
        }
      >
        <View style={styles.webContent}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: backgroundSecondary,
                  color: textColor,
                  borderColor: borderColor,
                },
              ]}
              placeholder={t('faq.searchPlaceholder')}
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Category Filter (Desktop) */}
          {!searchQuery && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilter}
              contentContainerStyle={styles.categoryFilterContent}
            >
              <Pressable
                onPress={() => setSelectedCategory(null)}
                style={[
                  styles.categoryFilterChip,
                  {
                    backgroundColor:
                      selectedCategory === null
                        ? accentColor
                        : backgroundSecondary,
                    borderColor: borderColor,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.categoryFilterText,
                    {
                      color:
                        selectedCategory === null ? '#FFFFFF' : textColor,
                    },
                  ]}
                >
                  {t('faq.allCategories')}
                </ThemedText>
              </Pressable>
              {faqContent.categories.map(category => (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[
                    styles.categoryFilterChip,
                    {
                      backgroundColor:
                        selectedCategory === category.id
                          ? accentColor
                          : backgroundSecondary,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={
                      selectedCategory === category.id
                        ? '#FFFFFF'
                        : textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.categoryFilterText,
                      {
                        color:
                          selectedCategory === category.id
                            ? '#FFFFFF'
                            : textColor,
                      },
                    ]}
                  >
                    {category.title}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* FAQ Content */}
          <View style={styles.faqContent}>
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="help-circle-outline" size={64} color={textSecondary} />
                <ThemedText
                  style={[styles.emptyStateText, { color: textSecondary }]}
                >
                  {t('faq.noResults')}
                </ThemedText>
              </View>
            ) : (
              filteredCategories.map((category, index) =>
                renderCategory(category, index)
              )
            )}
          </View>

          {/* Support CTA */}
          <View
            style={[
              styles.supportCTA,
              { backgroundColor: backgroundSecondary, borderColor: borderColor },
            ]}
          >
            <Ionicons name="headset" size={32} color={accentColor} />
            <View style={styles.supportCTAContent}>
              <ThemedText style={styles.supportCTATitle}>
                {faqContent.supportContact.message}
              </ThemedText>
              <ThemedText
                style={[styles.supportCTADescription, { color: textSecondary }]}
              >
                {faqContent.supportContact.description}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.supportCTAButton, { backgroundColor: accentColor }]}
              onPress={() => router.push('/help')}
            >
              <ThemedText style={styles.supportCTAButtonText}>
                {faqContent.supportContact.cta}
              </ThemedText>
            </Pressable>
          </View>
        </View>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: backgroundSecondary,
              color: textColor,
              borderColor: borderColor,
            },
          ]}
          placeholder={t('faq.searchPlaceholder')}
          placeholderTextColor={textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={textSecondary} />
          </Pressable>
        )}
      </View>

      {/* FAQ Content */}
      <View style={styles.faqContent}>
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color={textSecondary} />
            <ThemedText
              style={[styles.emptyStateText, { color: textSecondary }]}
            >
              {t('faq.noResults')}
            </ThemedText>
          </View>
        ) : (
          filteredCategories.map((category, index) =>
            renderCategory(category, index)
          )
        )}
      </View>

      {/* Support CTA */}
      <View
        style={[
          styles.supportCTA,
          { backgroundColor: backgroundSecondary, borderColor: borderColor },
        ]}
      >
        <Ionicons name="headset" size={32} color={accentColor} />
        <View style={styles.supportCTAContent}>
          <ThemedText style={styles.supportCTATitle}>
            {faqContent.supportContact.message}
          </ThemedText>
          <ThemedText
            style={[styles.supportCTADescription, { color: textSecondary }]}
          >
            {faqContent.supportContact.description}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.supportCTAButton, { backgroundColor: accentColor }]}
          onPress={() => router.push('/help')}
        >
          <ThemedText style={styles.supportCTAButtonText}>
            {faqContent.supportContact.cta}
          </ThemedText>
                 </Pressable>
       </View>
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
    padding: 20,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
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
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  // Category Filter
  categoryFilter: {
    marginBottom: 24,
  },
  categoryFilterContent: {
    gap: 12,
    paddingRight: 20,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // FAQ Content
  faqContent: {
    gap: 32,
    marginBottom: 32,
  },
  categorySection: {
    gap: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  questionsContainer: {
    gap: 12,
  },
  questionCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  answerContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Support CTA
  supportCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
    marginTop: 32,
    ...(Platform.OS === 'web' ? {} : { marginHorizontal: 20 }),
  },
  supportCTAContent: {
    flex: 1,
    gap: 4,
  },
  supportCTATitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  supportCTADescription: {
    fontSize: 14,
  },
  supportCTAButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportCTAButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
