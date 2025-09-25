/**
 * @fileoverview Query result caching utility for frequently accessed database queries
 * @description This module provides in-memory caching for expensive database queries
 * with TTL-based expiration and cache invalidation strategies.
 */

/**
 * Configuration options for QueryCache
 */
export interface QueryCacheOptions {
  defaultTTL?: number;
  maxCacheSize?: number;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  data: T;
  expires: number;
  created: number;
  accessed: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  expired: number;
  active: number;
}

/**
 * Cache key type - string identifier for cached data
 */
export type CacheKey = string;

/**
 * Query function type - async function that returns data to be cached
 */
export type QueryFunction<T = any> = () => Promise<T>;

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  pattern?: string;
  exact?: boolean;
  cascade?: boolean;
}

/**
 * Performance monitoring interface
 */
interface PerformanceMonitor {
  trackCacheOperation(hit: boolean): void;
}

/**
 * In-memory cache for query results with TTL support
 */
export class QueryCache {
  private cache: Map<CacheKey, CacheEntry>;
  private timers: Map<CacheKey, NodeJS.Timeout>;
  private readonly defaultTTL: number;
  private readonly maxCacheSize: number;

  constructor(options: QueryCacheOptions = {}) {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = options.maxCacheSize || 1000; // Maximum number of cache entries
  }

  /**
   * Get a cached result by key
   * @param key - Cache key
   * @returns Cached result or null if not found/expired
   */
  get<T = any>(key: CacheKey): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      // Track cache miss
      this.trackCacheOperation(false);
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.delete(key);
      // Track cache miss (expired)
      this.trackCacheOperation(false);
      return null;
    }

    // Track cache hit
    this.trackCacheOperation(true);

    // Update access time for LRU tracking
    cached.accessed = Date.now();
    return cached.data as T;
  }

  /**
   * Set a cache entry with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T = any>(key: CacheKey, data: T, ttl: number = this.defaultTTL): void {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Enforce max cache size by removing oldest entries before adding new one
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      this._evictOldest();
    }

    const expires = Date.now() + ttl;
    const cacheEntry: CacheEntry<T> = {
      data,
      expires,
      created: Date.now(),
      accessed: Date.now()
    };

    this.cache.set(key, cacheEntry);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Delete a cache entry
   * @param key - Cache key to delete
   */
  delete(key: CacheKey): boolean {
    const existed = this.cache.delete(key);

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      expired: expiredCount,
      active: this.cache.size - expiredCount
    };
  }

  /**
   * Evict the oldest cache entry (LRU)
   * @private
   */
  private _evictOldest(): void {
    if (this.cache.size === 0) {
      return;
    }

    let oldestKey: CacheKey | null = null;
    let oldestAccessTime = Number.MAX_SAFE_INTEGER;

    // Find the entry with the oldest access time (LRU)
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestAccessTime) {
        oldestAccessTime = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Generate cache key from query parameters
   * @param table - Table name
   * @param filters - Filter parameters
   * @param options - Query options (pagination, sorting)
   * @returns Generated cache key
   */
  generateKey(
    table: string,
    filters: Record<string, any> = {},
    options: Record<string, any> = {}
  ): CacheKey {
    const keyParts = [
      table,
      JSON.stringify(filters),
      JSON.stringify(options)
    ];

    return keyParts.join('::');
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Pattern to match keys (simple string match)
   * @param options - Invalidation options
   */
  invalidateByPattern(pattern: string, options: InvalidationOptions = {}): number {
    const keysToDelete: CacheKey[] = [];

    for (const key of this.cache.keys()) {
      if (options.exact ? key === pattern : key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Cache a query result with automatic key generation
   * @param queryFn - Function that executes the query
   * @param table - Table name for cache key
   * @param filters - Filter parameters for cache key
   * @param options - Query options for cache key
   * @param ttl - Cache TTL (optional)
   * @returns Query result (cached or fresh)
   */
  async cacheQuery<T = any>(
    queryFn: QueryFunction<T>,
    table: string,
    filters: Record<string, any> = {},
    options: Record<string, any> = {},
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const key = this.generateKey(table, filters, options);

    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn();
    this.set(key, result, ttl);

    return result;
  }

  /**
   * Get all cache keys matching a pattern
   * @param pattern - Pattern to match
   * @returns Array of matching keys
   */
  getKeysMatching(pattern: string): CacheKey[] {
    const matchingKeys: CacheKey[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Check if a key exists in cache (without accessing it)
   * @param key - Cache key to check
   * @returns True if key exists and is not expired
   */
  has(key: CacheKey): boolean {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Track cache operation for performance monitoring
   * @private
   */
  private trackCacheOperation(hit: boolean): void {
    try {
      // Try to import performance monitor dynamically to avoid circular dependencies
      const performanceMonitor = require('../middleware/performanceMonitor') as { trackCacheOperation: PerformanceMonitor['trackCacheOperation'] };
      performanceMonitor.trackCacheOperation(hit);
    } catch (err) {
      // Ignore if monitoring not available
    }
  }
}

/**
 * Cache invalidation strategies for different operations
 */
export const CacheInvalidation = {
  /**
   * Invalidate game-related caches
   * @param cache - Cache instance
   * @param gameId - Optional specific game ID
   */
  invalidateGames(cache: QueryCache, gameId?: string): void {
    cache.invalidateByPattern('games');
    cache.invalidateByPattern('leagues'); // Games affect league counts
    cache.invalidateByPattern('teams'); // Games affect team counts

    if (gameId) {
      cache.invalidateByPattern(`game:${gameId}`);
    }
  },

  /**
   * Invalidate team-related caches
   * @param cache - Cache instance
   * @param teamId - Optional specific team ID
   */
  invalidateTeams(cache: QueryCache, teamId?: string): void {
    cache.invalidateByPattern('teams');
    cache.invalidateByPattern('leagues'); // Teams affect league counts

    if (teamId) {
      cache.invalidateByPattern(`team:${teamId}`);
    }
  },

  /**
   * Invalidate league-related caches
   * @param cache - Cache instance
   * @param leagueId - Optional specific league ID
   */
  invalidateLeagues(cache: QueryCache, leagueId?: string): void {
    cache.invalidateByPattern('leagues');

    if (leagueId) {
      cache.invalidateByPattern(`league:${leagueId}`);
      cache.invalidateByPattern('teams'); // League changes affect team queries
    }
  },

  /**
   * Invalidate assignment-related caches
   * @param cache - Cache instance
   * @param gameId - Optional specific game ID
   */
  invalidateAssignments(cache: QueryCache, gameId?: string): void {
    cache.invalidateByPattern('assignments');
    cache.invalidateByPattern('games'); // Assignments affect game data

    if (gameId) {
      cache.invalidateByPattern(`game:${gameId}`);
    }
  },

  /**
   * Invalidate user-related caches
   * @param cache - Cache instance
   * @param userId - Optional specific user ID
   */
  invalidateUsers(cache: QueryCache, userId?: string): void {
    cache.invalidateByPattern('users');
    cache.invalidateByPattern('referees'); // User changes might affect referee data

    if (userId) {
      cache.invalidateByPattern(`user:${userId}`);
    }
  },

  /**
   * Invalidate all entity-related caches (for major changes)
   * @param cache - Cache instance
   */
  invalidateAll(cache: QueryCache): void {
    cache.clear();
  }
};

/**
 * Singleton cache instance
 */
export const queryCache = new QueryCache();

/**
 * Helper functions for common caching patterns
 */
export const CacheHelpers = {
  /**
   * Cache expensive aggregation queries
   * @param queryFn - Function that executes the aggregation
   * @param type - Type of aggregation (games, teams, leagues)
   * @param filters - Filter parameters
   * @param ttl - Cache TTL (default: 10 minutes for aggregations)
   * @returns Aggregation result
   */
  async cacheAggregation<T = any>(
    queryFn: QueryFunction<T>,
    type: string,
    filters: Record<string, any> = {},
    ttl: number = 10 * 60 * 1000
  ): Promise<T> {
    return queryCache.cacheQuery(
      queryFn,
      `${type}_aggregation`,
      filters,
      {},
      ttl
    );
  },

  /**
   * Cache lookup data (options, filter values, etc.)
   * @param queryFn - Function that executes the lookup
   * @param type - Type of lookup data
   * @param ttl - Cache TTL (default: 30 minutes for lookup data)
   * @returns Lookup data
   */
  async cacheLookupData<T = any>(
    queryFn: QueryFunction<T>,
    type: string,
    ttl: number = 30 * 60 * 1000
  ): Promise<T> {
    return queryCache.cacheQuery(
      queryFn,
      `lookup_${type}`,
      {},
      {},
      ttl
    );
  },

  /**
   * Cache paginated list queries
   * @param queryFn - Function that executes the paginated query
   * @param table - Table name
   * @param filters - Filter parameters
   * @param pagination - Pagination parameters
   * @param ttl - Cache TTL (default: 5 minutes for lists)
   * @returns Paginated results
   */
  async cachePaginatedQuery<T = any>(
    queryFn: QueryFunction<T>,
    table: string,
    filters: Record<string, any> = {},
    pagination: Record<string, any> = {},
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    return queryCache.cacheQuery(
      queryFn,
      table,
      filters,
      pagination,
      ttl
    );
  },

  /**
   * Cache configuration or settings data
   * @param queryFn - Function that executes the settings query
   * @param configType - Type of configuration
   * @param ttl - Cache TTL (default: 60 minutes for configuration)
   * @returns Configuration data
   */
  async cacheConfiguration<T = any>(
    queryFn: QueryFunction<T>,
    configType: string,
    ttl: number = 60 * 60 * 1000
  ): Promise<T> {
    return queryCache.cacheQuery(
      queryFn,
      `config_${configType}`,
      {},
      {},
      ttl
    );
  },

  /**
   * Cache dashboard summary data
   * @param queryFn - Function that executes the dashboard query
   * @param userId - User ID for personalized dashboards
   * @param ttl - Cache TTL (default: 2 minutes for dashboards)
   * @returns Dashboard data
   */
  async cacheDashboardData<T = any>(
    queryFn: QueryFunction<T>,
    userId: string,
    ttl: number = 2 * 60 * 1000
  ): Promise<T> {
    return queryCache.cacheQuery(
      queryFn,
      'dashboard',
      { userId },
      {},
      ttl
    );
  }
};

// Re-export types for external use
export type {
  QueryCacheOptions as IQueryCacheOptions,
  CacheEntry as ICacheEntry,
  CacheStats as ICacheStats,
  CacheKey as ICacheKey,
  QueryFunction as IQueryFunction,
  InvalidationOptions as IInvalidationOptions
};