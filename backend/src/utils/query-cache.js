/**
 * @fileoverview Query result caching utility for frequently accessed database queries
 * @description This module provides in-memory caching for expensive database queries
 * with TTL-based expiration and cache invalidation strategies.
 */

/**
 * In-memory cache for query results with TTL support
 */
class QueryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.maxCacheSize = 1000; // Maximum number of cache entries
  }

  /**
   * Get a cached result by key
   * @param {string} key - Cache key
   * @returns {*|null} Cached result or null if not found/expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      // Track cache miss
      try {
        const { trackCacheOperation } = require('../middleware/performanceMonitor');
        trackCacheOperation(false);
      } catch (err) {
        // Ignore if monitoring not available
      }
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.delete(key);
      // Track cache miss (expired)
      try {
        const { trackCacheOperation } = require('../middleware/performanceMonitor');
        trackCacheOperation(false);
      } catch (err) {
        // Ignore if monitoring not available
      }
      return null;
    }

    // Track cache hit
    try {
      const { trackCacheOperation } = require('../middleware/performanceMonitor');
      trackCacheOperation(true);
    } catch (err) {
      // Ignore if monitoring not available
    }

    // Update access time for LRU tracking
    cached.accessed = Date.now();
    return cached.data;
  }

  /**
   * Set a cache entry with TTL
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl = this.defaultTTL) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Enforce max cache size by removing oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      this._evictOldest();
    }

    const expires = Date.now() + ttl;
    const cacheEntry = {
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
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
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
  _evictOldest() {
    if (this.cache.size === 0) return;

    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestTime) {
        oldestTime = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Generate cache key from query parameters
   * @param {string} table - Table name
   * @param {Object} filters - Filter parameters
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {string} Generated cache key
   */
  generateKey(table, filters = {}, options = {}) {
    const keyParts = [
      table,
      JSON.stringify(filters),
      JSON.stringify(options)
    ];
    
    return keyParts.join('::');
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match keys (simple string match)
   */
  invalidateByPattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Cache a query result with automatic key generation
   * @param {Function} queryFn - Function that executes the query
   * @param {string} table - Table name for cache key
   * @param {Object} filters - Filter parameters for cache key
   * @param {Object} options - Query options for cache key
   * @param {number} ttl - Cache TTL (optional)
   * @returns {Promise<*>} Query result (cached or fresh)
   */
  async cacheQuery(queryFn, table, filters = {}, options = {}, ttl = this.defaultTTL) {
    const key = this.generateKey(table, filters, options);
    
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute query and cache result
    const result = await queryFn();
    this.set(key, result, ttl);
    
    return result;
  }
}

/**
 * Cache invalidation strategies for different operations
 */
const CacheInvalidation = {
  /**
   * Invalidate game-related caches
   * @param {QueryCache} cache - Cache instance
   * @param {string} gameId - Optional specific game ID
   */
  invalidateGames(cache, gameId = null) {
    cache.invalidateByPattern('games');
    cache.invalidateByPattern('leagues'); // Games affect league counts
    cache.invalidateByPattern('teams'); // Games affect team counts
    
    if (gameId) {
      cache.invalidateByPattern(`game:${gameId}`);
    }
  },

  /**
   * Invalidate team-related caches
   * @param {QueryCache} cache - Cache instance
   * @param {string} teamId - Optional specific team ID
   */
  invalidateTeams(cache, teamId = null) {
    cache.invalidateByPattern('teams');
    cache.invalidateByPattern('leagues'); // Teams affect league counts
    
    if (teamId) {
      cache.invalidateByPattern(`team:${teamId}`);
    }
  },

  /**
   * Invalidate league-related caches
   * @param {QueryCache} cache - Cache instance
   * @param {string} leagueId - Optional specific league ID
   */
  invalidateLeagues(cache, leagueId = null) {
    cache.invalidateByPattern('leagues');
    
    if (leagueId) {
      cache.invalidateByPattern(`league:${leagueId}`);
      cache.invalidateByPattern('teams'); // League changes affect team queries
    }
  },

  /**
   * Invalidate assignment-related caches
   * @param {QueryCache} cache - Cache instance
   * @param {string} gameId - Optional specific game ID
   */
  invalidateAssignments(cache, gameId = null) {
    cache.invalidateByPattern('assignments');
    cache.invalidateByPattern('games'); // Assignments affect game data
    
    if (gameId) {
      cache.invalidateByPattern(`game:${gameId}`);
    }
  }
};

/**
 * Singleton cache instance
 */
const queryCache = new QueryCache();

/**
 * Helper functions for common caching patterns
 */
const CacheHelpers = {
  /**
   * Cache expensive aggregation queries
   * @param {Function} queryFn - Function that executes the aggregation
   * @param {string} type - Type of aggregation (games, teams, leagues)
   * @param {Object} filters - Filter parameters
   * @param {number} ttl - Cache TTL (default: 10 minutes for aggregations)
   * @returns {Promise<*>} Aggregation result
   */
  async cacheAggregation(queryFn, type, filters = {}, ttl = 10 * 60 * 1000) {
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
   * @param {Function} queryFn - Function that executes the lookup
   * @param {string} type - Type of lookup data
   * @param {number} ttl - Cache TTL (default: 30 minutes for lookup data)
   * @returns {Promise<*>} Lookup data
   */
  async cacheLookupData(queryFn, type, ttl = 30 * 60 * 1000) {
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
   * @param {Function} queryFn - Function that executes the paginated query
   * @param {string} table - Table name
   * @param {Object} filters - Filter parameters
   * @param {Object} pagination - Pagination parameters
   * @param {number} ttl - Cache TTL (default: 5 minutes for lists)
   * @returns {Promise<*>} Paginated results
   */
  async cachePaginatedQuery(queryFn, table, filters = {}, pagination = {}, ttl = 5 * 60 * 1000) {
    return queryCache.cacheQuery(
      queryFn,
      table,
      filters,
      pagination,
      ttl
    );
  }
};

module.exports = {
  QueryCache,
  queryCache,
  CacheInvalidation,
  CacheHelpers
};