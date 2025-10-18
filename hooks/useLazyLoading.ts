import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for lazy loading components and data
 */
export const useLazyLoading = <T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    delay?: number;
    retryCount?: number;
    retryDelay?: number;
    enabled?: boolean;
  } = {}
) => {
  const {
    delay = 0,
    retryCount = 3,
    retryDelay = 1000,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async (attempt: number = 0) => {
    if (!enabled || !mountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Add delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (!mountedRef.current) return;

      const result = await loadFunction();
      
      if (mountedRef.current) {
        setData(result);
        setRetryAttempt(0);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (attempt < retryCount) {
        // Retry with exponential backoff
        const retryDelayTime = retryDelay * Math.pow(2, attempt);
        setRetryAttempt(attempt + 1);
        
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            loadData(attempt + 1);
          }
        }, retryDelayTime);
      } else {
        setError(error);
        setRetryAttempt(0);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadFunction, delay, retryCount, retryDelay, enabled]);

  const retry = useCallback(() => {
    setRetryAttempt(0);
    loadData(0);
  }, [loadData]);

  const refresh = useCallback(() => {
    setData(null);
    loadData(0);
  }, [loadData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (enabled) {
      loadData(0);
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    retryAttempt,
    retry,
    refresh,
    isRetrying: retryAttempt > 0
  };
};

/**
 * Hook for lazy loading with intersection observer (for components)
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasIntersected]);

  return { ref, isIntersecting, hasIntersected };
};

/**
 * Hook for lazy loading images
 */
export const useLazyImage = (src: string, options: {
  placeholder?: string;
  errorImage?: string;
  delay?: number;
} = {}) => {
  const { placeholder, errorImage, delay = 0 } = options;
  
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { ref, hasIntersected } = useIntersectionObserver();

  useEffect(() => {
    if (!hasIntersected || !src) return;

    const loadImage = async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setLoading(false);
        setError(false);
      };
      
      img.onerror = () => {
        setImageSrc(errorImage || placeholder || '');
        setLoading(false);
        setError(true);
      };
      
      img.src = src;
    };

    loadImage();
  }, [src, hasIntersected, delay, placeholder, errorImage]);

  return {
    ref,
    src: imageSrc,
    loading,
    error,
    hasIntersected
  };
};

/**
 * Hook for lazy loading with viewport detection
 */
export const useViewportLazyLoading = <T>(
  loadFunction: () => Promise<T>,
  options: {
    rootMargin?: string;
    threshold?: number;
    delay?: number;
    enabled?: boolean;
  } = {}
) => {
  const {
    rootMargin = '100px',
    threshold = 0.1,
    delay = 0,
    enabled = true
  } = options;

  const { ref, hasIntersected } = useIntersectionObserver({
    rootMargin,
    threshold
  });

  const lazyLoading = useLazyLoading(loadFunction, [hasIntersected], {
    delay,
    enabled: enabled && hasIntersected
  });

  return {
    ref,
    hasIntersected,
    ...lazyLoading
  };
};

/**
 * Hook for debounced lazy loading
 */
export const useDebouncedLazyLoading = <T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = [],
  delay: number = 300
) => {
  const [debouncedDeps, setDebouncedDeps] = useState(dependencies);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedDeps(dependencies);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  return useLazyLoading(loadFunction, debouncedDeps);
};

/**
 * Hook for paginated lazy loading
 */
export const usePaginatedLazyLoading = <T>(
  loadFunction: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>,
  pageSize: number = 20,
  options: {
    enabled?: boolean;
    delay?: number;
  } = {}
) => {
  const { enabled = true, delay = 0 } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState<number | undefined>();

  const loadPage = useCallback(async (page: number, isLoadMore: boolean = false) => {
    if (!enabled) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await loadFunction(page, pageSize);
      
      if (isLoadMore) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadFunction, pageSize, delay, enabled]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      loadPage(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, loading, currentPage, loadPage]);

  const refresh = useCallback(() => {
    setData([]);
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
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    currentPage
  };
};
