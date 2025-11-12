import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { NoteCard } from '../../components/NoteCard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth } from '../../hooks/useAuth';
import { useNotes } from '../../hooks/useNotes';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../../hooks/useTranslation';
import { Note } from '../../types/Note';

// Import web components
import { UserSidebar } from '../../components/web/UserSidebar';
import { WebLayout } from '../../components/web/WebLayout';

export default function SearchScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSearching, setIsSearching] = useState(false);
  const [noteType, setNoteType] = useState<'all' | 'text' | 'audio' | 'pdf'>('all');

  const { user, isAdmin } = useAuth();
  const { notes, getFilteredNotes, loading } = useNotes(user?.id || '', user?.email || null);

  // Helper to check note type
  const isAudioNote = (note: Note) => {
    return (
      note.audioFiles && note.audioFiles.length > 0
    ) || note.audioUri;
  };

  const isPDFNote = (note: Note) => {
    return (note.pdfFiles && note.pdfFiles.length > 0) || !!note.pdfUrl || note.type === 'pdf';
  };

  const filteredNotes = getFilteredNotes({
    searchQuery,
    tags: selectedTags,
    showArchived,
    showFavorites: false,
    sortBy,
    sortOrder,
  }).filter(note => {
    if (noteType === 'all') return true;
    if (noteType === 'audio') return isAudioNote(note);
    if (noteType === 'pdf') return isPDFNote(note);
    if (noteType === 'text') return !isAudioNote(note) && !isPDFNote(note);
    return true;
  });

  const allTags = Array.from(new Set(notes?.flatMap(note => note.tags || []) || []));

  const handleNotePress = (note: Note) => {
    router.push(`/note/${note.id}` as any);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setShowArchived(false);
    setSortBy('updatedAt');
    setSortOrder('desc');
  };

  const iconColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#F5F6FA', dark: '#282828' }, 'backgroundSecondary');
  const inputText = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'backgroundTertiary');
  const tagBg = useThemeColor({ light: '#E5E7EB', dark: '#282828' }, 'backgroundSecondary');
  const tagText = useThemeColor({ light: '#687076', dark: '#A0A0A0' }, 'textMuted');
  const selectedTagBg = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'accentPrimary');
  const selectedTagText = useThemeColor({ light: '#fff', dark: '#fff' }, 'text');

  // Web layout
  if (Platform.OS === 'web') {

    return (
      <WebLayout
        title={t('search.search')}
        subtitle={t('search.findYourNotes')}
        sidebar={
          <UserSidebar
            activePage="search"
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        }
        header={
          <View style={styles.webHeader}>
            <TouchableOpacity style={styles.webBackButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={iconColor} />
              <ThemedText style={styles.webBackText}>{t('search.back')}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.webHeaderTitle}>
              {t('search.searchNotes')}
            </ThemedText>
            <View style={styles.webHeaderRight}>
              <ThemedText style={styles.webNoteCount}>
                {filteredNotes.length} {filteredNotes.length === 1 ? t('search.result') : t('search.results')}
              </ThemedText>
            </View>
          </View>
        }
      >
        <View style={styles.webContent}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: inputBg, borderColor }] }>
              <Ionicons name="search" size={20} color={iconColor} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: inputText }]}
                placeholder={t('search.searchNotesPlaceholder')}
                placeholderTextColor={tagText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={iconColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <ThemedText style={styles.sectionTitle}>{t('search.filters')}</ThemedText>
            
            {/* Note Type Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>{t('search.noteType')}</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['all', 'text', 'audio', 'pdf'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.sortButton, noteType === type && styles.activeSortButton]}
                    onPress={() => setNoteType(type as any)}
                  >
                    <ThemedText style={[styles.sortButtonText, noteType === type && styles.activeSortButtonText]}>
                      {type === 'all' ? t('search.all') : type === 'text' ? t('search.text') : type === 'audio' ? t('search.audio') : t('search.pdf')}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <View style={styles.filterSection}>
                <ThemedText style={styles.filterLabel}>{t('search.tags')}</ThemedText>
                <View style={styles.tagsContainer}>
                  {allTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tag, { backgroundColor: selectedTags.includes(tag) ? selectedTagBg : tagBg, borderColor }, selectedTags.includes(tag) && styles.selectedTag]}
                      onPress={() => toggleTag(tag)}
                    >
                      <ThemedText style={[styles.tagText, { color: selectedTags.includes(tag) ? selectedTagText : tagText }]}>
                        #{tag}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>{t('search.sortBy')}</ThemedText>
              <View style={styles.sortButtons}>
                {['updatedAt', 'createdAt', 'title'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sortButton, sortBy === option && styles.activeSortButton]}
                    onPress={() => setSortBy(option as any)}
                  >
                    <ThemedText style={[styles.sortButtonText, sortBy === option && styles.activeSortButtonText]}>
                      {option === 'updatedAt' ? t('search.lastModified') : option === 'createdAt' ? t('search.createdDate') : t('search.title')}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Order Toggle */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.filterLabel}>{t('search.order')}</ThemedText>
              <View style={styles.orderButtons}>
                {['desc', 'asc'].map(order => (
                  <TouchableOpacity
                    key={order}
                    style={[styles.orderButton, sortOrder === order && styles.activeOrderButton]}
                    onPress={() => setSortOrder(order as any)}
                  >
                    <ThemedText style={[styles.orderButtonText, sortOrder === order && styles.activeOrderButtonText]}>
                      {order === 'desc' ? t('search.newestFirst') : t('search.oldestFirst')}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Archived Toggle */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.archivedToggle}
                onPress={() => setShowArchived(!showArchived)}
              >
                <Ionicons
                  name={showArchived ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={showArchived ? '#6A5ACD' : tagText}
                />
                <ThemedText style={[styles.archivedText, showArchived && styles.archivedTextActive]}>
                  {t('search.showArchivedNotes')}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Clear Filters */}
            {(searchQuery || selectedTags.length > 0 || showArchived) && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <ThemedText style={styles.clearFiltersText}>{t('search.clearAllFilters')}</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            <ThemedText style={styles.resultsTitle}>
              {filteredNotes.length} {filteredNotes.length === 1 ? t('search.noteFound') : t('search.notesFound')}
            </ThemedText>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size={40} />
                <ThemedText style={styles.loadingText}>{t('search.searchingNotes')}</ThemedText>
              </View>
            ) : (
              <FlatList
                data={filteredNotes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <NoteCard
                    note={item}
                    onPress={handleNotePress}
                    onTogglePin={() => {}}
                    onToggleArchive={() => {}}
                    onToggleFavorite={() => {}}
                    onDelete={() => {}}
                  />
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </WebLayout>
    );
  }

  // Mobile layout (existing code)
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>{t('search.searchNotes')}</ThemedText>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: inputBg, borderColor }] }>
          <Ionicons name="search" size={20} color={iconColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: inputText }]}
            placeholder={t('search.searchNotesPlaceholder')}
            placeholderTextColor={tagText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ThemedText style={styles.sectionTitle}>{t('search.filters')}</ThemedText>
        
        {/* Note Type Filter */}
        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>{t('search.noteType')}</ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['all', 'text', 'audio', 'pdf'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.sortButton, noteType === type && styles.activeSortButton]}
                onPress={() => setNoteType(type as any)}
              >
                <ThemedText style={[styles.sortButtonText, noteType === type && styles.activeSortButtonText]}>
                  {type === 'all' ? t('search.all') : type === 'text' ? t('search.text') : type === 'audio' ? t('search.audio') : t('search.pdf')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <View style={styles.filterSection}>
            <ThemedText style={styles.filterLabel}>{t('search.tags')}</ThemedText>
            <View style={styles.tagsContainer}>
              {allTags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, { backgroundColor: selectedTags.includes(tag) ? selectedTagBg : tagBg, borderColor }, selectedTags.includes(tag) && styles.selectedTag]}
                  onPress={() => toggleTag(tag)}
                >
                  <ThemedText style={[styles.tagText, { color: selectedTags.includes(tag) ? selectedTagText : tagText }]}>
                    #{tag}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>{t('search.sortBy')}</ThemedText>
          <View style={styles.sortButtons}>
            {['updatedAt', 'createdAt', 'title'].map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.sortButton, sortBy === option && styles.activeSortButton]}
                onPress={() => setSortBy(option as any)}
              >
                <ThemedText style={[styles.sortButtonText, sortBy === option && styles.activeSortButtonText]}>
                  {option === 'updatedAt' ? t('search.lastModified') : option === 'createdAt' ? t('search.createdDate') : t('search.title')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order Toggle */}
        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>{t('search.order')}</ThemedText>
          <View style={styles.orderButtons}>
            {['desc', 'asc'].map(order => (
              <TouchableOpacity
                key={order}
                style={[styles.orderButton, sortOrder === order && styles.activeOrderButton]}
                onPress={() => setSortOrder(order as any)}
              >
                <ThemedText style={[styles.orderButtonText, sortOrder === order && styles.activeOrderButtonText]}>
                  {order === 'desc' ? t('search.newestFirst') : t('search.oldestFirst')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Archived Toggle */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.archivedToggle}
            onPress={() => setShowArchived(!showArchived)}
          >
            <Ionicons
              name={showArchived ? 'checkbox' : 'square-outline'}
              size={20}
              color={showArchived ? '#6A5ACD' : tagText}
            />
            <ThemedText style={[styles.archivedText, showArchived && styles.archivedTextActive]}>
              {t('search.showArchivedNotes')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Clear Filters */}
        {(searchQuery || selectedTags.length > 0 || showArchived) && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <ThemedText style={styles.clearFiltersText}>{t('search.clearAllFilters')}</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <ThemedText style={styles.resultsTitle}>
          {filteredNotes.length} {filteredNotes.length === 1 ? t('search.noteFound') : t('search.notesFound')}
        </ThemedText>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size={40} />
            <ThemedText style={styles.loadingText}>{t('search.searchingNotes')}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                  <NoteCard
                note={item}
                onPress={handleNotePress}
                onTogglePin={() => {}}
                onToggleArchive={() => {}}
                    onToggleFavorite={() => {}}
                onDelete={() => {}}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedTag: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTagText: {
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeSortButton: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  sortButtonText: {
    fontSize: 14,
  },
  activeSortButtonText: {
  },
  orderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  orderButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeOrderButton: {
    backgroundColor: '#6A5ACD',
    borderColor: '#6A5ACD',
  },
  orderButtonText: {
    fontSize: 14,
  },
  activeOrderButtonText: {
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  archivedText: {
    fontSize: 16,
  },
  archivedTextActive: {
  },
  clearFiltersButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 40,
  },
  resultsTitle: {
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  // Web specific styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: -24,
    minWidth: 80,
  },
  webBackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  webNoteCount: {
    fontSize: 16,
    color: '#6A5ACD',
    fontWeight: '600',
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
}); 