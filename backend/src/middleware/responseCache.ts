/**
 * Simple In-Memory Response Cache Middleware
 *
 * Provides basic caching for frequently accessed endpoints to improve performance.
 * Uses LRU (Least Recently Used) cache with configurable TTL and size limits.
 */

import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

interface AuthenticatedUser {
  id: string;
  [key: string]: any;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

interface CachedResponse {
  statusCode: number;
  data: any;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: number;
  keyCount: number;
  memoryUsage: NodeJS.MemoryUsage;
}

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: RequestWithUser) => string;
  condition?: (req: RequestWithUser) => boolean;
}

interface CacheConfig {
  ttl: number;
  condition: (req: RequestWithUser) => boolean;
}

interface ResponseCacheOptions {
  defaultTTL?: number;
  maxKeys?: number;
  checkPeriod?: number;
}

class ResponseCache {
  private cache: NodeCache;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
  };

  constructor(options: ResponseCacheOptions = {}) {
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
  generateKey(req: RequestWithUser): string {
    const { path, query = {}, user } = req as any;
    const queryString = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');

    return `${user?.id || 'anonymous'}:${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Cache middleware factory
   */
  middleware(options: CacheMiddlewareOptions = {}) {
    const ttl = options.ttl || this.cache.options.stdTTL || 300;
    const keyGenerator = options.keyGenerator || this.generateKey.bind(this);
    const condition = options.condition || (() => true);

    return (req: RequestWithUser, res: Response, next: NextFunction): void => {
      // Skip caching for non-GET requests or if condition fails
      if ((req as any).method !== 'GET' || !condition(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const cached = this.cache.get(key) as CachedResponse | undefined;

      if (cached) {
        this.stats.hits++;
        console.log(`[CACHE HIT] ${key}`);

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key);

        res.status(cached.statusCode).json(cached.data);
        return;
      }

      this.stats.misses++;
      console.log(`[CACHE MISS] ${key}`);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cacheEntry: CachedResponse = {
            statusCode: res.statusCode,
            data: data
          };

          this.cache.set(key, cacheEntry, ttl);

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
  clearPattern(pattern: string): number {
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
  clearAll(): number {
    const keyCount = this.cache.keys().length;
    this.cache.flushAll();
    console.log(`[CACHE CLEAR ALL] Cleared ${keyCount} keys`);
    return keyCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0';

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
  invalidateUser(userId: string): number {
    return this.clearPattern(`${userId}:`);
  }

  /**
   * Invalidate cache for specific path
   */
  invalidatePath(path: string): number {
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
const cacheConfigs: Record<string, CacheConfig> = {
  // Short cache for frequently changing data
  short: {
    ttl: 60, // 1 minute
    condition: (req: RequestWithUser) => Boolean(req.user?.id) // Only cache for authenticated users
  },

  // Medium cache for semi-static data
  medium: {
    ttl: 300, // 5 minutes
    condition: (req: RequestWithUser) => Boolean(req.user?.id)
  },

  // Long cache for rarely changing data
  long: {
    ttl: 1800, // 30 minutes
    condition: (req: RequestWithUser) => Boolean(req.user?.id)
  },

  // Categories and reference data cache
  reference: {
    ttl: 3600, // 1 hour
    condition: () => true // Cache for all users
  }
};

// Create middleware functions
const shortCache = responseCache.middleware(cacheConfigs.short);
const mediumCache = responseCache.middleware(cacheConfigs.medium);
const longCache = responseCache.middleware(cacheConfigs.long);
const referenceCache = responseCache.middleware(cacheConfigs.reference);

// Custom cache middleware
const customCache = (options: CacheMiddlewareOptions) => responseCache.middleware(options);

// Cache management functions
const clearUserCache = (userId: string): number => responseCache.invalidateUser(userId);
const clearPathCache = (path: string): number => responseCache.invalidatePath(path);
const clearAllCache = (): number => responseCache.clearAll();
const getCacheStats = (): CacheStats => responseCache.getStats();

// Export everything
export {
  responseCache,
  cacheConfigs,

  // Middleware shortcuts
  shortCache,
  mediumCache,
  longCache,
  referenceCache,

  // Custom cache middleware
  customCache,

  // Cache management functions
  clearUserCache,
  clearPathCache,
  clearAllCache,
  getCacheStats,

  // Export types for external use
  type CacheMiddlewareOptions,
  type CacheConfig,
  type CacheStats,
  type ResponseCacheOptions,
  type RequestWithUser
};