# Lazy Loading Implementation

This document outlines the lazy loading system implemented in WizNote to improve performance and user experience.

## Overview

Lazy loading helps reduce initial bundle size, improve page load times, and provide better user experience by loading content only when needed.

## Components Created

### 1. `hooks/useLazyLoading.ts`
Core lazy loading hook with features:
- **Basic lazy loading** with retry logic
- **Intersection observer** for viewport-based loading
- **Image lazy loading** with placeholder support
- **Viewport lazy loading** with customizable thresholds
- **Debounced lazy loading** for search and filtering
- **Paginated lazy loading** for infinite scroll

### 2. `hooks/useLazyData.ts`
Advanced data lazy loading with:
- **Caching system** with configurable cache and stale times
- **Background refresh** for stale data
- **Infinite scroll** with prefetching
- **Search debouncing** with minimum query length
- **Optimistic updates** for better UX

### 3. `components/LazyWrapper.tsx`
React component wrappers for:
- **LazyWrapper** - Basic lazy loading with loading states
- **LazyViewport** - Viewport-based lazy loading
- **withLazyLoading** - HOC for lazy loading components
- **useLazyComponent** - Hook for lazy component loading

## Implementation Details

### Home Screen (`app/(tabs)/index.tsx`)

#### Feature Flags Lazy Loading
```typescript
const featureFlags = useLazyData(
  'feature-flags',
  async () => {
    if (!isAuthenticated) return {};
    return await featureFlagService.getFeatureFlags();
  },
  {
    enabled: isAuthenticated,
    delay: 100, // Small delay to prevent blocking
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    staleTime: 1 * 60 * 1000, // 1 minute stale time
  }
);
```

#### Notes Grid Lazy Loading
```typescript
<LazyViewport
  fallback={<SkeletonLoader />}
  delay={100}
>
  <View style={styles.webNotesGrid}>
    {filteredNotes.map((note) => (
      <WebNoteCard key={note.id} note={note} />
    ))}
  </View>
</LazyViewport>
```

#### Mobile Notes Lists
```typescript
<LazyWrapper delay={50}>
  <FlatList
    data={pinnedNotes}
    renderItem={({ item }) => <NoteCard note={item} />}
  />
</LazyWrapper>
```

### Skeleton Loading States

Added skeleton loading states for better perceived performance:
- **Web notes grid** - 6 skeleton cards with animated lines
- **Mobile lists** - Standard loading spinners
- **Feature flags** - Background loading with caching

## Performance Benefits

### 1. **Reduced Initial Load Time**
- Feature flags load with 100ms delay
- Notes grid loads only when in viewport
- Mobile lists load with staggered delays (50ms, 100ms)

### 2. **Better Caching**
- Feature flags cached for 5 minutes
- Background refresh for stale data
- Intelligent cache invalidation

### 3. **Improved User Experience**
- Skeleton loading states
- Smooth transitions
- No blocking operations

### 4. **Memory Optimization**
- Components load only when needed
- Automatic cleanup on unmount
- Efficient re-rendering

## Usage Examples

### Basic Lazy Loading
```typescript
const { data, loading, error } = useLazyLoading(
  () => fetchData(),
  [dependency],
  { delay: 100, retryCount: 3 }
);
```

### Viewport-Based Loading
```typescript
const { ref, Component, hasIntersected } = useLazyComponent(
  () => import('./HeavyComponent'),
  { rootMargin: '100px', delay: 200 }
);
```

### Cached Data Loading
```typescript
const { data, loading, isStale, refresh } = useLazyData(
  'cache-key',
  fetchFunction,
  { cacheTime: 300000, staleTime: 60000 }
);
```

### Infinite Scroll
```typescript
const { data, loadingMore, hasMore, loadMore } = useLazyInfiniteData(
  'notes',
  (page, pageSize) => fetchNotes(page, pageSize),
  20,
  { prefetchNextPage: true }
);
```

## Configuration Options

### Lazy Loading Options
- `delay` - Initial delay before loading (ms)
- `retryCount` - Number of retry attempts
- `retryDelay` - Delay between retries (ms)
- `enabled` - Enable/disable lazy loading

### Caching Options
- `cacheTime` - How long to keep data in cache (ms)
- `staleTime` - When data becomes stale (ms)
- `backgroundRefresh` - Refresh stale data in background

### Viewport Options
- `rootMargin` - Margin around viewport (px)
- `threshold` - Intersection threshold (0-1)
- `delay` - Delay after intersection (ms)

## Best Practices

### 1. **Use Appropriate Delays**
- Critical content: 0-50ms
- Secondary content: 100-200ms
- Heavy components: 300-500ms

### 2. **Implement Skeleton States**
- Match actual content layout
- Use subtle animations
- Provide loading feedback

### 3. **Cache Strategically**
- Cache frequently accessed data
- Use appropriate stale times
- Implement cache invalidation

### 4. **Handle Errors Gracefully**
- Provide retry mechanisms
- Show fallback content
- Log errors for debugging

## Future Enhancements

### 1. **Virtual Scrolling**
- For large lists (1000+ items)
- Reduce DOM nodes
- Improve scroll performance

### 2. **Preloading**
- Preload next page content
- Predictive loading based on user behavior
- Background prefetching

### 3. **Service Worker Integration**
- Cache API responses
- Offline support
- Background sync

### 4. **Analytics Integration**
- Track loading performance
- Monitor user engagement
- Optimize based on metrics

## Monitoring

### Performance Metrics
- Time to first contentful paint
- Time to interactive
- Bundle size reduction
- Memory usage

### User Experience Metrics
- Loading state duration
- Error rates
- Retry success rates
- Cache hit rates

The lazy loading system provides a solid foundation for performance optimization while maintaining excellent user experience.
