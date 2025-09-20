import { Request, Response } from 'express';

// Mock NodeCache before importing responseCache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => []),
    flushAll: jest.fn(),
    options: {
      stdTTL: 300
    }
  }));
});

import {
  responseCache,
  cacheConfigs,
  shortCache,
  mediumCache,
  longCache,
  referenceCache,
  customCache,
  clearUserCache,
  clearPathCache,
  clearAllCache,
  getCacheStats
} from '../responseCache';

describe('Response Cache Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockCache: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get the mock cache instance
    mockCache = (responseCache as any).cache;

    // Create mock request
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      query: { page: '1', limit: '10' },
      user: { id: 'user123' }
    };

    // Create mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    nextFunction = jest.fn();
  });

  describe('ResponseCache class', () => {
    it('should initialize with default options', () => {
      expect(responseCache).toBeDefined();
      expect(mockCache).toBeDefined();
    });

    it('should generate cache key from request', () => {
      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toBe('user123:/api/test?limit=10&page=1');
    });

    it('should generate cache key for anonymous user', () => {
      delete mockRequest.user;
      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toBe('anonymous:/api/test?limit=10&page=1');
    });

    it('should generate cache key without query parameters', () => {
      mockRequest.query = {};
      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toBe('user123:/api/test');
    });
  });

  describe('middleware function', () => {
    it('should skip caching for non-GET requests', () => {
      mockRequest.method = 'POST';

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should skip caching when condition fails', () => {
      const middleware = responseCache.middleware({
        condition: () => false
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should return cached response when cache hit', () => {
      const cachedData = {
        statusCode: 200,
        data: { message: 'cached response' }
      };
      mockCache.get.mockReturnValue(cachedData);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache-Key', expect.any(String));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'cached response' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should proceed to next middleware on cache miss', () => {
      mockCache.get.mockReturnValue(null);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockCache.get).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.json).toBeDefined(); // json method should be overridden
    });

    it('should cache successful responses on cache miss', () => {
      mockCache.get.mockReturnValue(null);

      const middleware = responseCache.middleware({ ttl: 600 });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response
      const originalJson = jest.fn();
      const responseData = { message: 'test response' };

      // Call the overridden json method
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        {
          statusCode: 200,
          data: responseData
        },
        600
      );
      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('should not cache unsuccessful responses', () => {
      mockCache.get.mockReturnValue(null);
      mockResponse.statusCode = 500;

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response
      const responseData = { error: 'server error' };
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockCache.set).not.toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('should use custom key generator', () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');

      const middleware = responseCache.middleware({
        keyGenerator: customKeyGenerator
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest);
      expect(mockCache.get).toHaveBeenCalledWith('custom-key');
    });

    it('should use custom TTL', () => {
      mockCache.get.mockReturnValue(null);

      const middleware = responseCache.middleware({ ttl: 1800 });
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response
      (mockResponse.json as jest.Mock)({ data: 'test' });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        1800
      );
    });
  });

  describe('cache management methods', () => {
    it('should clear cache by pattern', () => {
      mockCache.keys.mockReturnValue(['user123:/api/test', 'user456:/api/test', 'user123:/api/other']);
      mockCache.del = jest.fn();

      const deletedCount = responseCache.clearPattern('user123');

      expect(mockCache.del).toHaveBeenCalledTimes(2);
      expect(mockCache.del).toHaveBeenCalledWith('user123:/api/test');
      expect(mockCache.del).toHaveBeenCalledWith('user123:/api/other');
      expect(deletedCount).toBe(2);
    });

    it('should clear all cache', () => {
      mockCache.keys.mockReturnValue(['key1', 'key2', 'key3']);

      const deletedCount = responseCache.clearAll();

      expect(mockCache.flushAll).toHaveBeenCalled();
      expect(deletedCount).toBe(3);
    });

    it('should get cache statistics', () => {
      mockCache.keys.mockReturnValue(['key1', 'key2']);

      // Mock stats
      (responseCache as any).stats = {
        hits: 10,
        misses: 5,
        sets: 3
      };

      const stats = responseCache.getStats();

      expect(stats).toEqual({
        hits: 10,
        misses: 5,
        sets: 3,
        hitRate: 66.67,
        keyCount: 2,
        memoryUsage: expect.any(Object)
      });
    });

    it('should invalidate user cache', () => {
      jest.spyOn(responseCache, 'clearPattern').mockReturnValue(5);

      const deletedCount = responseCache.invalidateUser('user123');

      expect(responseCache.clearPattern).toHaveBeenCalledWith('user123:');
      expect(deletedCount).toBe(5);
    });

    it('should invalidate path cache', () => {
      jest.spyOn(responseCache, 'clearPattern').mockReturnValue(3);

      const deletedCount = responseCache.invalidatePath('/api/test');

      expect(responseCache.clearPattern).toHaveBeenCalledWith(':/api/test');
      expect(deletedCount).toBe(3);
    });
  });

  describe('cache configurations', () => {
    it('should have predefined cache configurations', () => {
      expect(cacheConfigs.short).toEqual({
        ttl: 60,
        condition: expect.any(Function)
      });

      expect(cacheConfigs.medium).toEqual({
        ttl: 300,
        condition: expect.any(Function)
      });

      expect(cacheConfigs.long).toEqual({
        ttl: 1800,
        condition: expect.any(Function)
      });

      expect(cacheConfigs.reference).toEqual({
        ttl: 3600,
        condition: expect.any(Function)
      });
    });

    it('should validate cache config conditions', () => {
      // Test authenticated user conditions
      expect(cacheConfigs.short.condition(mockRequest)).toBe(true);
      expect(cacheConfigs.medium.condition(mockRequest)).toBe(true);
      expect(cacheConfigs.long.condition(mockRequest)).toBe(true);

      // Test anonymous user conditions
      delete mockRequest.user;
      expect(cacheConfigs.short.condition(mockRequest)).toBe(false);
      expect(cacheConfigs.medium.condition(mockRequest)).toBe(false);
      expect(cacheConfigs.long.condition(mockRequest)).toBe(false);
      expect(cacheConfigs.reference.condition(mockRequest)).toBe(true); // Reference allows anonymous
    });
  });

  describe('middleware shortcuts', () => {
    it('should provide shortcut middleware functions', () => {
      expect(shortCache).toBeDefined();
      expect(mediumCache).toBeDefined();
      expect(longCache).toBeDefined();
      expect(referenceCache).toBeDefined();
    });

    it('should provide custom cache middleware', () => {
      const customOptions = { ttl: 120, condition: () => true };
      const customMiddleware = customCache(customOptions);
      expect(customMiddleware).toBeDefined();
      expect(typeof customMiddleware).toBe('function');
    });
  });

  describe('cache management functions', () => {
    it('should provide clearUserCache function', () => {
      jest.spyOn(responseCache, 'invalidateUser').mockReturnValue(5);

      const result = clearUserCache('user123');

      expect(responseCache.invalidateUser).toHaveBeenCalledWith('user123');
      expect(result).toBe(5);
    });

    it('should provide clearPathCache function', () => {
      jest.spyOn(responseCache, 'invalidatePath').mockReturnValue(3);

      const result = clearPathCache('/api/test');

      expect(responseCache.invalidatePath).toHaveBeenCalledWith('/api/test');
      expect(result).toBe(3);
    });

    it('should provide clearAllCache function', () => {
      jest.spyOn(responseCache, 'clearAll').mockReturnValue(10);

      const result = clearAllCache();

      expect(responseCache.clearAll).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it('should provide getCacheStats function', () => {
      const mockStats = { hits: 5, misses: 2, hitRate: 71.43 };
      jest.spyOn(responseCache, 'getStats').mockReturnValue(mockStats);

      const result = getCacheStats();

      expect(responseCache.getStats).toHaveBeenCalled();
      expect(result).toBe(mockStats);
    });
  });

  describe('edge cases', () => {
    it('should handle requests without user', () => {
      delete mockRequest.user;

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle requests without query parameters', () => {
      delete mockRequest.query;

      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toBe('user123:/api/test');
    });

    it('should handle empty query object', () => {
      mockRequest.query = {};

      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toBe('user123:/api/test');
    });

    it('should handle complex query parameters', () => {
      mockRequest.query = {
        filter: 'name',
        sort: 'date',
        page: '2',
        include: ['comments', 'tags']
      };

      const key = (responseCache as any).generateKey(mockRequest);
      expect(key).toContain('user123:/api/test?');
      expect(key).toContain('filter=name');
      expect(key).toContain('sort=date');
    });

    it('should handle cache statistics with zero requests', () => {
      (responseCache as any).stats = {
        hits: 0,
        misses: 0,
        sets: 0
      };

      // Mock the keys method to return an empty array
      mockCache.keys.mockReturnValue([]);

      const stats = responseCache.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.keyCount).toBe(0);
    });

    it('should update statistics on cache hit', () => {
      const cachedData = { statusCode: 200, data: { test: true } };
      mockCache.get.mockReturnValue(cachedData);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect((responseCache as any).stats.hits).toBe(1);
    });

    it('should update statistics on cache miss', () => {
      mockCache.get.mockReturnValue(null);
      const initialMisses = (responseCache as any).stats.misses;

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect((responseCache as any).stats.misses).toBe(initialMisses + 1);
    });

    it('should update statistics on cache set', () => {
      mockCache.get.mockReturnValue(null);
      const initialSets = (responseCache as any).stats.sets;

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate successful response
      (mockResponse.json as jest.Mock)({ data: 'test' });

      expect((responseCache as any).stats.sets).toBe(initialSets + 1);
    });
  });

  describe('console logging', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log cache hit', () => {
      const cachedData = { statusCode: 200, data: { test: true } };
      mockCache.get.mockReturnValue(cachedData);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE HIT]')
      );
    });

    it('should log cache miss', () => {
      mockCache.get.mockReturnValue(null);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE MISS]')
      );
    });

    it('should log cache set', () => {
      mockCache.get.mockReturnValue(null);

      const middleware = responseCache.middleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate successful response
      (mockResponse.json as jest.Mock)({ data: 'test' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE SET]')
      );
    });
  });
});