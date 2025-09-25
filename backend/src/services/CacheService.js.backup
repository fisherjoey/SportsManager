/**
 * @fileoverview Cache Service
 * 
 * Provides caching functionality with Redis when available,
 * falls back to in-memory cache when Redis is disabled
 */

let redis = null;
try {
  redis = require('../config/redis');
} catch (error) {
  console.log('ℹ️ Cache: Redis not available, using in-memory cache');
}

class CacheService {
  constructor() {
    this.inMemoryCache = new Map();
    this.useRedis = !process.env.DISABLE_REDIS && redis && redis.isReady;
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      if (this.useRedis && redis && redis.isReady) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Use in-memory cache
        const cached = this.inMemoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        }
        this.inMemoryCache.delete(key);
        return null;
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.useRedis && redis && redis.isReady) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        // Use in-memory cache
        this.inMemoryCache.set(key, {
          value: value,
          expiry: Date.now() + (ttlSeconds * 1000)
        });
        
        // Clean up expired entries periodically
        this.cleanupInMemoryCache();
      }
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key) {
    try {
      if (this.useRedis && redis && redis.isReady) {
        await redis.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Clear cache entries matching a pattern
   */
  async clearPattern(pattern) {
    try {
      if (this.useRedis && redis && redis.isReady) {
        const keys = await redis.keys(pattern);
        if (keys && keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        // For in-memory cache, convert pattern to regex
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.inMemoryCache.keys()) {
          if (regex.test(key)) {
            this.inMemoryCache.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.warn('Cache clear pattern error:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll() {
    try {
      if (this.useRedis && redis && redis.isReady) {
        await redis.flushdb();
      } else {
        this.inMemoryCache.clear();
      }
      return true;
    } catch (error) {
      console.warn('Cache clear all error:', error.message);
      return false;
    }
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  cleanupInMemoryCache() {
    const now = Date.now();
    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (cached.expiry <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.useRedis && redis && redis.isReady) {
      const info = await redis.info('stats');
      return {
        type: 'redis',
        connected: true,
        info: info
      };
    } else {
      return {
        type: 'in-memory',
        size: this.inMemoryCache.size,
        keys: Array.from(this.inMemoryCache.keys())
      };
    }
  }
}

module.exports = new CacheService();