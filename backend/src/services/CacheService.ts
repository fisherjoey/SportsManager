/**
 * @fileoverview Cache Service
 *
 * Provides caching functionality with Redis when available,
 * falls back to in-memory cache when Redis is disabled
 */

import type { RedisClient, CacheEntry, CacheStats, ICacheService } from '../types/cache';

class CacheService implements ICacheService {
  private inMemoryCache: Map<string, CacheEntry>;
  private useRedis: boolean;
  private redis: RedisClient | null = null;

  constructor() {
    this.inMemoryCache = new Map<string, CacheEntry>();
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = require('../config/redis');
    } catch (error) {
      console.log('ℹ️ Cache: Redis not available, using in-memory cache');
      this.redis = null;
    }
    this.useRedis = !process.env.DISABLE_REDIS && this.redis && this.redis.isReady;
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis && this.redis.isReady) {
        const value = await this.redis.get(key);
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
      console.warn('Cache get error:', (error as Error).message);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  async set<T = any>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> {
    try {
      if (this.useRedis && this.redis && this.redis.isReady) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
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
      console.warn('Cache set error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redis && this.redis.isReady) {
        await this.redis.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.warn('Cache delete error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Clear cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redis && this.redis.isReady) {
        const keys = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
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
      console.warn('Cache clear pattern error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<boolean> {
    try {
      if (this.useRedis && this.redis && this.redis.isReady) {
        await this.redis.flushdb();
      } else {
        this.inMemoryCache.clear();
      }
      return true;
    } catch (error) {
      console.warn('Cache clear all error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupInMemoryCache(): void {
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
  async getStats(): Promise<CacheStats> {
    if (this.useRedis && this.redis && this.redis.isReady) {
      const info = await this.redis.info('stats');
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

export default new CacheService();