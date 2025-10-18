import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyLoading } from './useLazyLoading';

/**
 * Hook for lazy loading data with caching and background refresh
 */
export const useLazyData = <T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    enabled?: boolean;
    delay?: number;
    cacheTime?: number;
    staleTime?: number;
    retryCount?: number;
    retryDelay?: number;
    backgroundRefresh?: boolean;
  } = {}
) => {
  const {
    enabled = true,
    delay = 0,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000, // 1 minute
    retryCount = 3,
    retryDelay = 1000,
    backgroundRefresh = true
  } = options;

  const [cache, setCache] = useState<Map<string, { data: T; timestamp: number; stale: boolean }>>(new Map());
  const [isStale, setIsStale] = useState(false);
  const backgroundRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCachedData = useCallback((cacheKey: string): T | null => {
    const cached = cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cacheTime;
    const isStaleData = now - cached.timestamp > staleTime;

    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }

    if (isStaleData && !cached.stale) {
      setCache(prev => new Map(prev.set(cacheKey, { ...cached, stale: true })));
      setIsStale(true);
    }

    return cached.data;
  }, [cache, cacheTime, staleTime]);

  const setCachedData = useCallback((cacheKey: string, data: T) => {
    setCache(prev => new Map(prev.set(cacheKey, {
      data,
      timestamp: Date.now(),
      stale: false
    })));
    setIsStale(false);
  }, []);

  const fetchWithCache = useCallback(async (): Promise<T> => {
    const cached = getCachedData(key);
    if (cached && !isStale) {
      return cached;
    }

    const data = await fetchFunction();
    setCachedData(key, data);
    return data;
  }, [key, fetchFunction, getCachedData, setCachedData, isStale]);

  const lazyLoading = useLazyLoading(fetchWithCache, [key, enabled], {
    delay,
    retryCount,
    retryDelay,
    enabled
  });

  // Background refresh for stale data
  useEffect(() => {
    if (!backgroundRefresh || !isStale || !lazyLoading.data) return;

    const refreshData = async () => {
      try {
        const freshData = await fetchFunction();
        setCachedData(key, freshData);
      } catch (error) {
        console.warn('Background refresh failed:', error);
      }
    };

    backgroundRefreshRef.current = setTimeout(refreshData, 1000);

    return () => {
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }
    };
  }, [isStale, backgroundRefresh, fetchFunction, key, setCachedData, lazyLoading.data]);

  const invalidateCache = useCallback(() => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
    lazyLoading.refresh();
  }, [key, lazyLoading]);

  const clearAllCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    ...lazyLoading,
    isStale,
    invalidateCache,
    clearAllCache,
    cacheSize: cache.size
  };
};

/**
 * Hook for lazy loading with pagination and infinite scroll
 */
export const useLazyInfiniteData = <T>(
  key: string,
  fetchFunction: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>,
  pageSize: number = 20,
  options: {
    enabled?: boolean;
    delay?: number;
    cacheTime?: number;
    prefetchNextPage?: boolean;
  } = {}
) => {
  const {
    enabled = true,
    delay = 0,
    cacheTime = 5 * 60 * 1000,
    prefetchNextPage = true
  } = options;

  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState<number | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPage = useCallback(async (page: number, isLoadMore: boolean = false) => {
    if (!enabled) return;

    if (isLoadMore) {
      setLoadingMore(true);
    }
    setError(null);

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await fetchFunction(page, pageSize);
      
      if (isLoadMore) {
        setAllData(prev => [...prev, ...result.data]);
      } else {
        setAllData(result.data);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCurrentPage(page);

      // Prefetch next page if enabled and there are more pages
      if (prefetchNextPage && result.hasMore && !isLoadMore) {
        setTimeout(() => {
          loadPage(page + 1, true);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFunction, pageSize, delay, enabled, prefetchNextPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadPage(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, currentPage, loadPage]);

  const refresh = useCallback(() => {
    setAllData([]);
    setCurrentPage(0);
    setHasMore(true);
    loadPage(0, false);
  }, [loadPage]);

  useEffect(() => {
    if (enabled) {
      loadPage(0, false);
    }
  }, [enabled]);

  return {
    data: allData,
    loading: allData.length === 0 && !error,
    loadingMore,
    error,
    hasMore,
    total,
    currentPage,
    loadMore,
    refresh
  };
};

/**
 * Hook for lazy loading with search debouncing
 */
export const useLazySearch = <T>(
  key: string,
  searchFunction: (query: string) => Promise<T[]>,
  options: {
    enabled?: boolean;
    delay?: number;
    minQueryLength?: number;
    debounceMs?: number;
  } = {}
) => {
  const {
    enabled = true,
    delay = 0,
    minQueryLength = 2,
    debounceMs = 300
  } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!enabled || debouncedQuery.length < minQueryLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const searchResults = await searchFunction(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchFunction, enabled, minQueryLength, delay]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch,
    hasResults: results.length > 0,
    isSearching: loading && debouncedQuery.length >= minQueryLength
  };
};

/**
 * Hook for lazy loading with optimistic updates
 */
export const useLazyOptimisticData = <T>(
  key: string,
  fetchFunction: () => Promise<T>,
  updateFunction: (data: T, updates: Partial<T>) => Promise<T>,
  options: {
    enabled?: boolean;
    delay?: number;
    optimisticDelay?: number;
  } = {}
) => {
  const {
    enabled = true,
    delay = 0,
    optimisticDelay = 100
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<T>>>(new Map());

  const lazyLoading = useLazyData(key, fetchFunction, { enabled, delay });

  const optimisticUpdate = useCallback(async (updates: Partial<T>, updateId?: string) => {
    if (!data) return;

    const id = updateId || Date.now().toString();
    
    // Apply optimistic update immediately
    setData(prev => prev ? { ...prev, ...updates } : null);
    setOptimisticUpdates(prev => new Map(prev.set(id, updates)));

    try {
      // Apply real update with delay
      if (optimisticDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, optimisticDelay));
      }

      const updatedData = await updateFunction(data, updates);
      setData(updatedData);
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } catch (err) {
      // Revert optimistic update on error
      setData(prev => prev ? { ...prev, ...updates } : null);
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      setError(err instanceof Error ? err : new Error('Update failed'));
    }
  }, [data, updateFunction, optimisticDelay]);

  return {
    data: lazyLoading.data || data,
    loading: lazyLoading.loading || loading,
    error: lazyLoading.error || error,
    refresh: lazyLoading.refresh,
    optimisticUpdate,
    hasOptimisticUpdates: optimisticUpdates.size > 0
  };
};
