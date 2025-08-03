/**
 * Simple In-Memory Response Cache Middleware
 * 
 * Provides basic caching for frequently accessed endpoints to improve performance.
 * Uses LRU (Least Recently Used) cache with configurable TTL and size limits.
 */

const NodeCache = require('node-cache');

class ResponseCache {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.defaultTTL || 300, // 5 minutes default
      maxKeys: options.maxKeys || 1000,
      checkperiod: options.checkPeriod || 120, // Check for expired keys every 2 minutes
      useClones: false // Better performance, but be careful with object mutations
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const { path, query, user } = req;
    const queryString = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');
    
    return `${user?.id || 'anonymous'}:${path}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Cache middleware factory
   */
  middleware(options = {}) {
    const ttl = options.ttl || this.cache.options.stdTTL;
    const keyGenerator = options.keyGenerator || this.generateKey.bind(this);
    const condition = options.condition || (() => true);

    return (req, res, next) => {
      // Skip caching for non-GET requests or if condition fails
      if (req.method !== 'GET' || !condition(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const cached = this.cache.get(key);

      if (cached) {
        this.stats.hits++;
        console.log(`[CACHE HIT] ${key}`);
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key);
        
        return res.status(cached.statusCode).json(cached.data);
      }

      this.stats.misses++;
      console.log(`[CACHE MISS] ${key}`);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.cache.set(key, {
            statusCode: res.statusCode,
            data: data
          }, ttl);
          
          this.stats.sets++;
          console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
        }

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', key);
        
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern) {
    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    keysToDelete.forEach(key => {
      this.cache.del(key);
    });
    
    console.log(`[CACHE CLEAR] Cleared ${keysToDelete.length} keys matching pattern: ${pattern}`);
    return keysToDelete.length;
  }

  /**
   * Clear all cache
   */
  clearAll() {
    const keyCount = this.cache.keys().length;
    this.cache.flushAll();
    console.log(`[CACHE CLEAR ALL] Cleared ${keyCount} keys`);
    return keyCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate),
      keyCount: this.cache.keys().length,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUser(userId) {
    return this.clearPattern(`${userId}:`);
  }

  /**
   * Invalidate cache for specific path
   */
  invalidatePath(path) {
    return this.clearPattern(`:${path}`);
  }
}

// Create singleton instance
const responseCache = new ResponseCache({
  defaultTTL: 300,     // 5 minutes
  maxKeys: 2000,       // Store up to 2000 responses
  checkPeriod: 120     // Check for expired keys every 2 minutes
});

// Predefined cache configurations for common endpoints
const cacheConfigs = {
  // Short cache for frequently changing data
  short: {
    ttl: 60, // 1 minute
    condition: (req) => req.user && req.user.id // Only cache for authenticated users
  },
  
  // Medium cache for semi-static data
  medium: {
    ttl: 300, // 5 minutes
    condition: (req) => req.user && req.user.id
  },
  
  // Long cache for rarely changing data
  long: {
    ttl: 1800, // 30 minutes
    condition: (req) => req.user && req.user.id
  },

  // Categories and reference data cache
  reference: {
    ttl: 3600, // 1 hour
    condition: (req) => true // Cache for all users
  }
};

// Export middleware functions and cache instance
module.exports = {
  responseCache,
  cacheConfigs,
  
  // Middleware shortcuts
  shortCache: responseCache.middleware(cacheConfigs.short),
  mediumCache: responseCache.middleware(cacheConfigs.medium),
  longCache: responseCache.middleware(cacheConfigs.long),
  referenceCache: responseCache.middleware(cacheConfigs.reference),
  
  // Custom cache middleware
  customCache: (options) => responseCache.middleware(options),
  
  // Cache management functions
  clearUserCache: (userId) => responseCache.invalidateUser(userId),
  clearPathCache: (path) => responseCache.invalidatePath(path),
  clearAllCache: () => responseCache.clearAll(),
  getCacheStats: () => responseCache.getStats()
};