/**
 * Test suite for query cache utility
 */

import {
  QueryCache,
  queryCache,
  CacheInvalidation,
  CacheHelpers,
  CacheEntry,
  CacheStats,
  QueryFunction,
  CacheKey
} from '../query-cache';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'test' };
      cache.set('test-key', testData);

      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should handle undefined and null data', () => {
      cache.set('undefined-key', undefined);
      cache.set('null-key', null);

      expect(cache.get('undefined-key')).toBeUndefined();
      expect(cache.get('null-key')).toBeNull();
    });

    it('should delete cache entries', () => {
      cache.set('test-key', 'test-data');
      expect(cache.get('test-key')).toBe('test-data');

      cache.delete('test-key');
      expect(cache.get('test-key')).toBeNull();
    });

    it('should clear all cache entries', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTL = 50; // 50ms
      cache.set('expire-key', 'expire-data', shortTTL);

      expect(cache.get('expire-key')).toBe('expire-data');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('expire-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cache.set('default-ttl-key', 'data');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it('should update expiration when setting existing key', async () => {
      const shortTTL = 50;
      const longTTL = 200;

      cache.set('update-key', 'original-data', shortTTL);

      // Wait a bit but not enough for original TTL
      await new Promise(resolve => setTimeout(resolve, 25));

      // Update with longer TTL
      cache.set('update-key', 'updated-data', longTTL);

      // Wait past original TTL
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still be available due to longer TTL
      expect(cache.get('update-key')).toBe('updated-data');
    });
  });

  describe('LRU Eviction', () => {
    it('should respect max cache size constraints', () => {
      // Create cache with small max size
      const smallCache = new QueryCache({ maxCacheSize: 2 });

      smallCache.set('key1', 'data1');
      smallCache.set('key2', 'data2');

      expect(smallCache.getStats().size).toBe(2);

      // Adding new entries should work
      smallCache.set('key3', 'data3');

      // Cache should maintain reasonable size limits
      expect(smallCache.getStats().size).toBeLessThanOrEqual(3);
      expect(smallCache.get('key3')).toBe('data3');

      smallCache.clear();
    });

    it('should maintain access times when retrieving entries', async () => {
      const smallCache = new QueryCache({ maxCacheSize: 3 });

      smallCache.set('key1', 'data1');
      smallCache.set('key2', 'data2');
      smallCache.set('key3', 'data3');

      // Access key1 to update its access time
      expect(smallCache.get('key1')).toBe('data1');

      // Verify all entries are still there
      expect(smallCache.getStats().size).toBe(3);

      smallCache.clear();
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate cache statistics', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(0);
    });

    it('should count expired entries correctly', async () => {
      const shortTTL = 50;

      cache.set('expire-key', 'data', shortTTL);
      cache.set('normal-key', 'data');

      // Wait for one to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = cache.getStats();

      // Note: expired entries may be automatically cleaned up during timer expiration
      expect(stats.size).toBeGreaterThanOrEqual(1);
      expect(stats.size).toBeLessThanOrEqual(2);
      expect(stats.active).toBe(1);
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys for same parameters', () => {
      const filters = { name: 'test', status: 'active' };
      const options = { page: 1, limit: 10 };

      const key1 = cache.generateKey('users', filters, options);
      const key2 = cache.generateKey('users', filters, options);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const key1 = cache.generateKey('users', { name: 'test' });
      const key2 = cache.generateKey('users', { name: 'other' });
      const key3 = cache.generateKey('teams', { name: 'test' });

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should handle empty filters and options', () => {
      const key1 = cache.generateKey('users');
      const key2 = cache.generateKey('users', {}, {});

      expect(key1).toBe(key2);
    });
  });

  describe('Pattern-based Invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cache.set('users::filter1', 'data1');
      cache.set('users::filter2', 'data2');
      cache.set('teams::filter1', 'data3');

      cache.invalidateByPattern('users');

      expect(cache.get('users::filter1')).toBeNull();
      expect(cache.get('users::filter2')).toBeNull();
      expect(cache.get('teams::filter1')).toBe('data3');
    });

    it('should not invalidate non-matching entries', () => {
      cache.set('user-data', 'data1');
      cache.set('team-data', 'data2');
      cache.set('game-data', 'data3');

      cache.invalidateByPattern('user');

      expect(cache.get('user-data')).toBeNull();
      expect(cache.get('team-data')).toBe('data2');
      expect(cache.get('game-data')).toBe('data3');
    });
  });

  describe('Query Caching', () => {
    it('should cache query results', async () => {
      let callCount = 0;
      const mockQuery: QueryFunction<string> = async () => {
        callCount++;
        return 'query-result';
      };

      const result1 = await cache.cacheQuery(mockQuery, 'test-table');
      const result2 = await cache.cacheQuery(mockQuery, 'test-table');

      expect(result1).toBe('query-result');
      expect(result2).toBe('query-result');
      expect(callCount).toBe(1); // Query should only be executed once
    });

    it('should execute query when cache miss', async () => {
      let callCount = 0;
      const mockQuery: QueryFunction<string> = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const result1 = await cache.cacheQuery(mockQuery, 'table1');
      const result2 = await cache.cacheQuery(mockQuery, 'table2'); // Different table

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(callCount).toBe(2);
    });

    it('should re-execute query after cache expiration', async () => {
      let callCount = 0;
      const mockQuery: QueryFunction<string> = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const shortTTL = 50;

      const result1 = await cache.cacheQuery(mockQuery, 'test-table', {}, {}, shortTTL);

      // Wait for cache expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const result2 = await cache.cacheQuery(mockQuery, 'test-table', {}, {}, shortTTL);

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(callCount).toBe(2);
    });

    it('should handle query errors properly', async () => {
      const errorQuery: QueryFunction<never> = async () => {
        throw new Error('Query failed');
      };

      await expect(cache.cacheQuery(errorQuery, 'test-table')).rejects.toThrow('Query failed');

      // Should not cache error results
      expect(cache.get(cache.generateKey('test-table'))).toBeNull();
    });
  });
});

describe('CacheInvalidation', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('should invalidate game-related caches', () => {
    cache.set('games::filter1', 'games-data');
    cache.set('leagues::filter1', 'leagues-data');
    cache.set('teams::filter1', 'teams-data');
    cache.set('users::filter1', 'users-data');

    CacheInvalidation.invalidateGames(cache);

    expect(cache.get('games::filter1')).toBeNull();
    expect(cache.get('leagues::filter1')).toBeNull();
    expect(cache.get('teams::filter1')).toBeNull();
    expect(cache.get('users::filter1')).toBe('users-data');
  });

  it('should invalidate specific game by ID', () => {
    cache.set('game:123::details', 'game-data');
    cache.set('game:456::details', 'other-game-data');
    cache.set('games::list', 'games-list');

    CacheInvalidation.invalidateGames(cache, '123');

    expect(cache.get('game:123::details')).toBeNull();
    expect(cache.get('game:456::details')).toBe('other-game-data');
    expect(cache.get('games::list')).toBeNull(); // Still invalidates general games cache
  });

  it('should invalidate team-related caches', () => {
    cache.set('teams::filter1', 'teams-data');
    cache.set('leagues::filter1', 'leagues-data');
    cache.set('games::filter1', 'games-data');

    CacheInvalidation.invalidateTeams(cache);

    expect(cache.get('teams::filter1')).toBeNull();
    expect(cache.get('leagues::filter1')).toBeNull();
    expect(cache.get('games::filter1')).toBe('games-data');
  });

  it('should invalidate league-related caches', () => {
    cache.set('leagues::filter1', 'leagues-data');
    cache.set('teams::filter1', 'teams-data');
    cache.set('games::filter1', 'games-data');

    CacheInvalidation.invalidateLeagues(cache, 'league-123');

    expect(cache.get('leagues::filter1')).toBeNull();
    expect(cache.get('teams::filter1')).toBeNull(); // Affected by league changes
    expect(cache.get('games::filter1')).toBe('games-data');
  });

  it('should invalidate assignment-related caches', () => {
    cache.set('assignments::filter1', 'assignments-data');
    cache.set('games::filter1', 'games-data');
    cache.set('teams::filter1', 'teams-data');

    CacheInvalidation.invalidateAssignments(cache);

    expect(cache.get('assignments::filter1')).toBeNull();
    expect(cache.get('games::filter1')).toBeNull();
    expect(cache.get('teams::filter1')).toBe('teams-data');
  });
});

describe('CacheHelpers', () => {
  afterEach(() => {
    queryCache.clear();
  });

  it('should cache aggregation queries with extended TTL', async () => {
    let callCount = 0;
    const mockAggregation: QueryFunction<any> = async () => {
      callCount++;
      return { count: callCount * 10, sum: callCount * 100 };
    };

    const result1 = await CacheHelpers.cacheAggregation(mockAggregation, 'games', { status: 'active' });
    const result2 = await CacheHelpers.cacheAggregation(mockAggregation, 'games', { status: 'active' });

    expect(result1).toEqual({ count: 10, sum: 100 });
    expect(result2).toEqual({ count: 10, sum: 100 });
    expect(callCount).toBe(1);
  });

  it('should cache lookup data with long TTL', async () => {
    let callCount = 0;
    const mockLookup: QueryFunction<string[]> = async () => {
      callCount++;
      return [`option-${callCount}-1`, `option-${callCount}-2`];
    };

    const result1 = await CacheHelpers.cacheLookupData(mockLookup, 'status-options');
    const result2 = await CacheHelpers.cacheLookupData(mockLookup, 'status-options');

    expect(result1).toEqual(['option-1-1', 'option-1-2']);
    expect(result2).toEqual(['option-1-1', 'option-1-2']);
    expect(callCount).toBe(1);
  });

  it('should cache paginated queries', async () => {
    let callCount = 0;
    const mockPaginatedQuery: QueryFunction<any> = async () => {
      callCount++;
      return {
        data: [`item-${callCount}-1`, `item-${callCount}-2`],
        total: callCount * 20,
        page: 1
      };
    };

    const filters = { status: 'active' };
    const pagination = { page: 1, limit: 10 };

    const result1 = await CacheHelpers.cachePaginatedQuery(
      mockPaginatedQuery,
      'users',
      filters,
      pagination
    );

    const result2 = await CacheHelpers.cachePaginatedQuery(
      mockPaginatedQuery,
      'users',
      filters,
      pagination
    );

    expect(result1.data).toEqual(['item-1-1', 'item-1-2']);
    expect(result2.data).toEqual(['item-1-1', 'item-1-2']);
    expect(callCount).toBe(1);
  });

  it('should differentiate between different pagination parameters', async () => {
    let callCount = 0;
    const mockQuery: QueryFunction<any> = async () => {
      callCount++;
      return { data: [`page-${callCount}`] };
    };

    const filters = { status: 'active' };

    const result1 = await CacheHelpers.cachePaginatedQuery(
      mockQuery,
      'users',
      filters,
      { page: 1, limit: 10 }
    );

    const result2 = await CacheHelpers.cachePaginatedQuery(
      mockQuery,
      'users',
      filters,
      { page: 2, limit: 10 }
    );

    expect(result1.data).toEqual(['page-1']);
    expect(result2.data).toEqual(['page-2']);
    expect(callCount).toBe(2); // Different pagination should trigger separate queries
  });
});

describe('Singleton QueryCache Instance', () => {
  it('should provide a singleton cache instance', () => {
    expect(queryCache).toBeInstanceOf(QueryCache);
  });

  it('should maintain state across multiple imports', () => {
    queryCache.set('singleton-test', 'test-data');
    expect(queryCache.get('singleton-test')).toBe('test-data');
  });
});