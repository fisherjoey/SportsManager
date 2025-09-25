/**
 * @fileoverview Cache Service Types
 *
 * Type definitions for cache operations and Redis configuration
 */

export interface RedisClient {
  isReady: boolean;
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushdb(): Promise<string>;
  info(section?: string): Promise<string>;
}

export interface CacheEntry<T = any> {
  value: T;
  expiry: number;
}

export interface CacheStats {
  type: 'redis' | 'in-memory';
  connected?: boolean;
  info?: string;
  size?: number;
  keys?: string[];
}

export interface ICacheService {
  /**
   * Get a value from cache
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL in seconds
   */
  set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;

  /**
   * Delete a key from cache
   */
  del(key: string): Promise<boolean>;

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  clearAll(): Promise<boolean>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
}