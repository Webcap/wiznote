/**
 * Query Cache Utility
 * 
 * Provides caching and request deduplication for database queries
 */

interface CachedQuery<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingQuery<T> {
  promise: Promise<T>;
  timestamp: number;
}

class QueryCache {
  private cache: Map<string, CachedQuery<any>> = new Map();
  private pendingQueries: Map<string, PendingQuery<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached queries

  /**
   * Get cached data or execute query with deduplication
   */
  async getOrExecute<T>(
    key: string,
    queryFn: () => Promise<T>,
    options?: {
      ttl?: number; // Time to live in milliseconds
      forceRefresh?: boolean; // Force refresh even if cached
    }
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false } = options || {};

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
      
      // Remove expired cache
      if (cached && Date.now() >= cached.expiresAt) {
        this.cache.delete(key);
      }
    }

    // Check if query is already pending (deduplication)
    const pending = this.pendingQueries.get(key);
    if (pending) {
      // If pending query is recent (within 1 second), reuse it
      if (Date.now() - pending.timestamp < 1000) {
        return pending.promise;
      }
      // Otherwise, remove stale pending query
      this.pendingQueries.delete(key);
    }

    // Execute query and cache result
    const promise = queryFn().then((data) => {
      // Cache the result
      this.set(key, data, ttl);
      // Remove from pending
      this.pendingQueries.delete(key);
      return data;
    }).catch((error) => {
      // Remove from pending on error
      this.pendingQueries.delete(key);
      throw error;
    });

    // Store as pending for deduplication
    this.pendingQueries.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Set cache value
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Enforce max cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Get cached value (without executing query)
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    
    // Remove expired cache
    if (cached && Date.now() >= cached.expiresAt) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Invalidate cache for a key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingQueries.delete(key);
  }

  /**
   * Invalidate cache matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingQueries.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    this.cache.forEach((entry) => {
      if (now < entry.expiresAt) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingQueries: this.pendingQueries.size,
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

