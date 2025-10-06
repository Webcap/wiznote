import AsyncStorage from '@react-native-async-storage/async-storage';

export class FeatureCacheService {
  private memoryCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private CACHE_PREFIX = 'feature_cache_';

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const expiry = this.cacheExpiry.get(key) || 0;
      if (Date.now() < expiry) {
        return this.memoryCache.get(key);
      } else {
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < this.DEFAULT_TTL) {
          // Cache in memory for faster access
          this.memoryCache.set(key, data);
          this.cacheExpiry.set(key, Date.now() + this.DEFAULT_TTL);
          return data;
        }
      }
    } catch (error) {
      console.warn('FeatureCacheService: Cache read error:', error);
    }

    return null;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiry = Date.now() + (ttl || this.DEFAULT_TTL);

    // Store in memory
    this.memoryCache.set(key, data);
    this.cacheExpiry.set(key, expiry);

    // Store in AsyncStorage
    try {
      await AsyncStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('FeatureCacheService: Cache write error:', error);
    }
  }

  /**
   * Remove a specific key from cache
   */
  async remove(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);
    this.cacheExpiry.delete(key);

    // Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('FeatureCacheService: Cache remove error:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }

    // Clear AsyncStorage entries matching pattern
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('FeatureCacheService: Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.cacheExpiry.clear();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('FeatureCacheService: Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    memorySize: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let expiredEntries = 0;

    for (const [key, expiry] of this.cacheExpiry) {
      if (now >= expiry) {
        expiredEntries++;
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      memorySize: this.getMemorySize(),
      expiredEntries,
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, expiry] of this.cacheExpiry) {
      if (now >= expiry) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries from memory
    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
      this.cacheExpiry.delete(key);
    });

    // Clean up AsyncStorage expired entries
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const { timestamp } = JSON.parse(stored);
            if (now - timestamp >= this.DEFAULT_TTL) {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('FeatureCacheService: Cleanup error:', error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    if (this.memoryCache.has(key)) {
      const expiry = this.cacheExpiry.get(key) || 0;
      return Date.now() < expiry;
    }
    return false;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Get cache size in memory
   */
  private getMemorySize(): number {
    let size = 0;
    for (const [key, value] of this.memoryCache) {
      size += key.length;
      size += JSON.stringify(value).length;
    }
    return size;
  }

  /**
   * Set cache prefix
   */
  setPrefix(prefix: string): void {
    this.CACHE_PREFIX = prefix;
  }

  /**
   * Get cache prefix
   */
  getPrefix(): string {
    return this.CACHE_PREFIX;
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.DEFAULT_TTL = ttl;
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.DEFAULT_TTL;
  }
}

// Export singleton instance
export const featureCacheService = new FeatureCacheService(); 