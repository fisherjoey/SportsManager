/**
 * @fileoverview CacheService Unit Tests
 *
 * Comprehensive test suite for CacheService covering both Redis and in-memory cache modes
 */

import { jest } from '@jest/globals';

// Mock Redis module
const mockRedis = {
  isReady: true,
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
};

// Mock the Redis config module before importing CacheService
jest.mock('../config/redis', () => mockRedis, { virtual: true });

// Import CacheService after setting up mocks
const CacheService = require('../CacheService.ts').default;

describe('CacheService', () => {
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Store original process.env
    originalProcessEnv = { ...process.env };

    // Reset Redis mock state
    mockRedis.isReady = true;
  });

  afterEach(() => {
    // Restore process.env
    process.env = originalProcessEnv;
  });

  describe('Redis Mode', () => {
    beforeEach(() => {
      delete process.env.DISABLE_REDIS;
      mockRedis.isReady = true;
    });

    describe('get', () => {
      it('should retrieve and parse value from Redis', async () => {
        const key = 'test:key';
        const value = { data: 'test', count: 42 };
        mockRedis.get.mockResolvedValue(JSON.stringify(value));

        const result = await CacheService.get(key);

        expect(mockRedis.get).toHaveBeenCalledWith(key);
        expect(result).toEqual(value);
      });

      it('should return null if Redis returns null', async () => {
        const key = 'test:key';
        mockRedis.get.mockResolvedValue(null);

        const result = await CacheService.get(key);

        expect(mockRedis.get).toHaveBeenCalledWith(key);
        expect(result).toBeNull();
      });

      it('should handle Redis errors gracefully', async () => {
        const key = 'test:key';
        mockRedis.get.mockRejectedValue(new Error('Redis connection error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.get(key);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Cache get error:', 'Redis connection error');
        consoleSpy.mockRestore();
      });

      it('should handle JSON parse errors gracefully', async () => {
        const key = 'test:key';
        mockRedis.get.mockResolvedValue('invalid json');

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.get(key);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('set', () => {
      it('should store value in Redis with default TTL', async () => {
        const key = 'test:key';
        const value = { data: 'test' };
        mockRedis.setex.mockResolvedValue('OK');

        const result = await CacheService.set(key, value);

        expect(mockRedis.setex).toHaveBeenCalledWith(key, 300, JSON.stringify(value));
        expect(result).toBe(true);
      });

      it('should store value in Redis with custom TTL', async () => {
        const key = 'test:key';
        const value = { data: 'test' };
        const ttl = 600;
        mockRedis.setex.mockResolvedValue('OK');

        const result = await CacheService.set(key, value, ttl);

        expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
        expect(result).toBe(true);
      });

      it('should handle Redis errors gracefully', async () => {
        const key = 'test:key';
        const value = { data: 'test' };
        mockRedis.setex.mockRejectedValue(new Error('Redis connection error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.set(key, value);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache set error:', 'Redis connection error');
        consoleSpy.mockRestore();
      });
    });

    describe('del', () => {
      it('should delete key from Redis', async () => {
        const key = 'test:key';
        mockRedis.del.mockResolvedValue(1);

        const result = await CacheService.del(key);

        expect(mockRedis.del).toHaveBeenCalledWith(key);
        expect(result).toBe(true);
      });

      it('should handle Redis errors gracefully', async () => {
        const key = 'test:key';
        mockRedis.del.mockRejectedValue(new Error('Redis connection error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.del(key);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache delete error:', 'Redis connection error');
        consoleSpy.mockRestore();
      });
    });

    describe('clearPattern', () => {
      it('should clear keys matching pattern in Redis', async () => {
        const pattern = 'test:*';
        const keys = ['test:key1', 'test:key2'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(2);

        const result = await CacheService.clearPattern(pattern);

        expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
        expect(mockRedis.del).toHaveBeenCalledWith(...keys);
        expect(result).toBe(true);
      });

      it('should handle empty key list', async () => {
        const pattern = 'test:*';
        mockRedis.keys.mockResolvedValue([]);

        const result = await CacheService.clearPattern(pattern);

        expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
        expect(mockRedis.del).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle Redis errors gracefully', async () => {
        const pattern = 'test:*';
        mockRedis.keys.mockRejectedValue(new Error('Redis connection error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.clearPattern(pattern);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache clear pattern error:', 'Redis connection error');
        consoleSpy.mockRestore();
      });
    });

    describe('clearAll', () => {
      it('should clear all keys in Redis', async () => {
        mockRedis.flushdb.mockResolvedValue('OK');

        const result = await CacheService.clearAll();

        expect(mockRedis.flushdb).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedis.flushdb.mockRejectedValue(new Error('Redis connection error'));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await CacheService.clearAll();

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache clear all error:', 'Redis connection error');
        consoleSpy.mockRestore();
      });
    });

    describe('getStats', () => {
      it('should return Redis stats', async () => {
        const redisInfo = 'keyspace_hits:100\nkeyspace_misses:10';
        mockRedis.info.mockResolvedValue(redisInfo);

        const result = await CacheService.getStats();

        expect(mockRedis.info).toHaveBeenCalledWith('stats');
        expect(result).toEqual({
          type: 'redis',
          connected: true,
          info: redisInfo
        });
      });
    });
  });

  describe('In-Memory Mode', () => {
    beforeEach(() => {
      process.env.DISABLE_REDIS = 'true';
    });

    describe('get', () => {
      it('should retrieve value from in-memory cache', async () => {
        const key = 'test:key';
        const value = { data: 'test', count: 42 };

        // Set value first
        await CacheService.set(key, value);

        const result = await CacheService.get(key);

        expect(result).toEqual(value);
      });

      it('should return null for non-existent key', async () => {
        const key = 'non:existent';

        const result = await CacheService.get(key);

        expect(result).toBeNull();
      });

      it('should return null for expired key', async () => {
        const key = 'test:key';
        const value = { data: 'test' };

        // Set value with very short TTL
        await CacheService.set(key, value, 0.001); // 1ms

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await CacheService.get(key);

        expect(result).toBeNull();
      });

      it('should clean up expired entries on get', async () => {
        const key1 = 'test:key1';
        const key2 = 'test:key2';
        const value = { data: 'test' };

        // Set one expired and one valid entry
        await CacheService.set(key1, value, 0.001); // 1ms
        await CacheService.set(key2, value, 300); // 5 minutes

        // Wait for first entry to expire
        await new Promise(resolve => setTimeout(resolve, 10));

        // Access to trigger cleanup
        await CacheService.get(key1);

        // Check that expired entry is cleaned up
        const stats = await CacheService.getStats();
        expect(stats.size).toBe(1);
        expect(stats.keys).toEqual([key2]);
      });
    });

    describe('set', () => {
      it('should store value in in-memory cache with default TTL', async () => {
        const key = 'test:key';
        const value = { data: 'test' };

        const result = await CacheService.set(key, value);

        expect(result).toBe(true);

        const retrieved = await CacheService.get(key);
        expect(retrieved).toEqual(value);
      });

      it('should store value in in-memory cache with custom TTL', async () => {
        const key = 'test:key';
        const value = { data: 'test' };
        const ttl = 1; // 1 second

        const result = await CacheService.set(key, value, ttl);

        expect(result).toBe(true);

        // Should be available immediately
        const retrieved = await CacheService.get(key);
        expect(retrieved).toEqual(value);
      });

      it('should trigger cleanup of expired entries', async () => {
        const key1 = 'test:key1';
        const key2 = 'test:key2';
        const value = { data: 'test' };

        // Set expired entry
        await CacheService.set(key1, value, 0.001); // 1ms

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10));

        // Set new entry should trigger cleanup
        await CacheService.set(key2, value);

        const stats = await CacheService.getStats();
        expect(stats.keys).not.toContain(key1);
        expect(stats.keys).toContain(key2);
      });
    });

    describe('del', () => {
      it('should delete key from in-memory cache', async () => {
        const key = 'test:key';
        const value = { data: 'test' };

        await CacheService.set(key, value);
        const result = await CacheService.del(key);

        expect(result).toBe(true);

        const retrieved = await CacheService.get(key);
        expect(retrieved).toBeNull();
      });

      it('should return true even for non-existent key', async () => {
        const key = 'non:existent';

        const result = await CacheService.del(key);

        expect(result).toBe(true);
      });
    });

    describe('clearPattern', () => {
      it('should clear keys matching pattern in in-memory cache', async () => {
        const keys = ['test:key1', 'test:key2', 'other:key3'];
        const value = { data: 'test' };

        // Set multiple keys
        for (const key of keys) {
          await CacheService.set(key, value);
        }

        const result = await CacheService.clearPattern('test:*');

        expect(result).toBe(true);

        // Check that only test: keys were cleared
        expect(await CacheService.get('test:key1')).toBeNull();
        expect(await CacheService.get('test:key2')).toBeNull();
        expect(await CacheService.get('other:key3')).toEqual(value);
      });

      it('should handle complex patterns', async () => {
        const keys = ['user:123:profile', 'user:456:profile', 'user:123:settings'];
        const value = { data: 'test' };

        // Set multiple keys
        for (const key of keys) {
          await CacheService.set(key, value);
        }

        const result = await CacheService.clearPattern('user:123:*');

        expect(result).toBe(true);

        // Check that only user:123: keys were cleared
        expect(await CacheService.get('user:123:profile')).toBeNull();
        expect(await CacheService.get('user:123:settings')).toBeNull();
        expect(await CacheService.get('user:456:profile')).toEqual(value);
      });
    });

    describe('clearAll', () => {
      it('should clear all keys in in-memory cache', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const value = { data: 'test' };

        // Set multiple keys
        for (const key of keys) {
          await CacheService.set(key, value);
        }

        const result = await CacheService.clearAll();

        expect(result).toBe(true);

        // Check that all keys were cleared
        for (const key of keys) {
          expect(await CacheService.get(key)).toBeNull();
        }

        const stats = await CacheService.getStats();
        expect(stats.size).toBe(0);
      });
    });

    describe('getStats', () => {
      it('should return in-memory cache stats', async () => {
        const keys = ['key1', 'key2'];
        const value = { data: 'test' };

        // Set some keys
        for (const key of keys) {
          await CacheService.set(key, value);
        }

        const result = await CacheService.getStats();

        expect(result).toEqual({
          type: 'in-memory',
          size: 2,
          keys: expect.arrayContaining(keys)
        });
      });
    });

    describe('cleanupInMemoryCache', () => {
      it('should be called automatically', async () => {
        const key = 'test:key';
        const value = { data: 'test' };

        // Set expired entry
        await CacheService.set(key, value, 0.001); // 1ms

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10));

        // Trigger cleanup by setting new value
        await CacheService.set('other:key', value);

        const stats = await CacheService.getStats();
        expect(stats.keys).not.toContain(key);
      });
    });
  });

  describe('Fallback Behavior', () => {
    beforeEach(() => {
      // Simulate Redis not available
      mockRedis.isReady = false;
      delete process.env.DISABLE_REDIS;
    });

    it('should fall back to in-memory cache when Redis is not ready', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      await CacheService.set(key, value);
      const result = await CacheService.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should return in-memory stats when Redis is not ready', async () => {
      const result = await CacheService.getStats();

      expect(result.type).toBe('in-memory');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('keys');
    });
  });
});