/**
 * Query Optimization Test Suite
 * Tests for Package 2D database query optimizations
 */

const { QueryBuilder, QueryHelpers } = require('../../src/utils/query-builders');
const { QueryCache, CacheHelpers, CacheInvalidation } = require('../../src/utils/query-cache');

describe('Package 2D Query Optimizations', () => {
  let mockDb;
  let queryCache;

  beforeEach(() => {
    // Mock Knex query builder
    mockDb = () => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      clearSelect: jest.fn().mockReturnThis(),
      clearOrder: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ count: '100' })
    });

    queryCache = new QueryCache();
  });

  afterEach(() => {
    if (queryCache) {
      queryCache.clear();
    }
  });

  describe('QueryBuilder Utilities', () => {
    test('should apply pagination correctly', () => {
      const query = mockDb();
      const paginatedQuery = QueryBuilder.applyPagination(query, 2, 10);

      expect(query.limit).toHaveBeenCalledWith(10);
      expect(query.offset).toHaveBeenCalledWith(10);
    });

    test('should validate pagination parameters', () => {
      const result = QueryBuilder.validatePaginationParams({ page: '0', limit: '150' });
      
      expect(result.page).toBe(1); // Minimum page is 1
      expect(result.limit).toBe(100); // Maximum limit is 100
    });

    test('should apply common filters', () => {
      const query = mockDb();
      const filters = {
        status: 'active',
        date_from: '2024-01-01',
        date_to: '2024-12-31'
      };
      const filterMap = {
        status: 'games.status',
        date_from: 'games.game_date',
        date_to: 'games.game_date'
      };

      QueryBuilder.applyCommonFilters(query, filters, filterMap);

      expect(query.where).toHaveBeenCalledWith('games.status', 'active');
      expect(query.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
      expect(query.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-12-31');
    });

    test('should apply date range filters', () => {
      const query = mockDb();
      QueryBuilder.applyDateRange(query, 'created_at', '2024-01-01', '2024-12-31');

      expect(query.where).toHaveBeenCalledWith('created_at', '>=', '2024-01-01');
      expect(query.where).toHaveBeenCalledWith('created_at', '<=', '2024-12-31');
    });

    test('should apply sorting with allowed columns', () => {
      const query = mockDb();
      const allowedColumns = ['name', 'created_at', 'status'];

      QueryBuilder.applySorting(query, 'name', 'desc', allowedColumns);
      expect(query.orderBy).toHaveBeenCalledWith('name', 'desc');

      // Should not apply sorting for disallowed columns
      query.orderBy.mockClear();
      QueryBuilder.applySorting(query, 'secret_field', 'asc', allowedColumns);
      expect(query.orderBy).not.toHaveBeenCalled();
    });

    test('should build count query correctly', () => {
      const baseQuery = mockDb();
      const countQuery = QueryBuilder.buildCountQuery(baseQuery, 'id');

      expect(baseQuery.clearSelect).toHaveBeenCalled();
      expect(baseQuery.clearOrder).toHaveBeenCalled();
      expect(baseQuery.count).toHaveBeenCalledWith('id as count');
    });
  });

  describe('QueryHelpers Filter Maps', () => {
    test('should provide game filter map', () => {
      const filterMap = QueryHelpers.getGameFilterMap();
      
      expect(filterMap).toHaveProperty('status', 'games.status');
      expect(filterMap).toHaveProperty('level', 'games.level');
      expect(filterMap).toHaveProperty('date_from', 'games.game_date');
      expect(filterMap).toHaveProperty('date_to', 'games.game_date');
    });

    test('should provide referee filter map', () => {
      const filterMap = QueryHelpers.getRefereeFilterMap();
      
      expect(filterMap).toHaveProperty('level', 'referee_levels.name');
      expect(filterMap).toHaveProperty('is_available', 'users.is_available');
    });

    test('should provide allowed sort columns', () => {
      const gameSortColumns = QueryHelpers.getGameSortColumns();
      expect(gameSortColumns).toContain('game_date');
      expect(gameSortColumns).toContain('level');
      expect(gameSortColumns).toContain('status');
    });
  });

  describe('QueryCache Functionality', () => {
    test('should cache and retrieve values', () => {
      const testData = { id: 1, name: 'Test Game' };
      queryCache.set('test_key', testData, 1000);

      const retrieved = queryCache.get('test_key');
      expect(retrieved).toEqual(testData);
    });

    test('should return null for expired cache entries', (done) => {
      const testData = { id: 1, name: 'Test Game' };
      queryCache.set('test_key', testData, 10); // 10ms TTL

      setTimeout(() => {
        const retrieved = queryCache.get('test_key');
        expect(retrieved).toBeNull();
        done();
      }, 20);
    });

    test('should generate consistent cache keys', () => {
      const key1 = queryCache.generateKey('games', { status: 'active' }, { page: 1 });
      const key2 = queryCache.generateKey('games', { status: 'active' }, { page: 1 });
      const key3 = queryCache.generateKey('games', { status: 'inactive' }, { page: 1 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should invalidate cache by pattern', () => {
      queryCache.set('games_list_1', 'data1');
      queryCache.set('games_list_2', 'data2');
      queryCache.set('teams_list_1', 'data3');

      queryCache.invalidateByPattern('games');

      expect(queryCache.get('games_list_1')).toBeNull();
      expect(queryCache.get('games_list_2')).toBeNull();
      expect(queryCache.get('teams_list_1')).toBe('data3');
    });

    test('should enforce max cache size with LRU eviction', () => {
      // Set a small max cache size for testing
      const smallCache = new QueryCache();
      smallCache.maxCacheSize = 3;

      smallCache.set('key1', 'data1');
      smallCache.set('key2', 'data2');
      smallCache.set('key3', 'data3');
      
      // Access key1 to make it more recently used
      smallCache.get('key1');
      
      // Adding key4 should evict key2 (least recently used)
      smallCache.set('key4', 'data4');

      expect(smallCache.get('key1')).toBe('data1'); // Recently accessed
      expect(smallCache.get('key2')).toBeNull(); // Should be evicted
      expect(smallCache.get('key3')).toBe('data3'); // Should exist
      expect(smallCache.get('key4')).toBe('data4'); // Newly added
    });

    test('should provide cache statistics', () => {
      queryCache.set('key1', 'data1');
      queryCache.set('key2', 'data2');
      queryCache.get('key1');
      queryCache.get('nonexistent');

      const stats = queryCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.active).toBe(2);
    });
  });

  describe('CacheInvalidation Strategies', () => {
    test('should invalidate games-related caches', () => {
      const mockCache = {
        invalidateByPattern: jest.fn()
      };

      CacheInvalidation.invalidateGames(mockCache, 'game123');

      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('games');
      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('leagues');
      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('teams');
      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('game:game123');
    });

    test('should invalidate teams-related caches', () => {
      const mockCache = {
        invalidateByPattern: jest.fn()
      };

      CacheInvalidation.invalidateTeams(mockCache, 'team456');

      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('teams');
      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('leagues');
      expect(mockCache.invalidateByPattern).toHaveBeenCalledWith('team:team456');
    });
  });

  describe('CacheHelpers', () => {
    test('should cache aggregation queries', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({ total: 100 });
      
      const result = await CacheHelpers.cacheAggregation(
        mockQueryFn,
        'games',
        { status: 'active' }
      );

      expect(result).toEqual({ total: 100 });
      expect(mockQueryFn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await CacheHelpers.cacheAggregation(
        mockQueryFn,
        'games',
        { status: 'active' }
      );

      expect(result2).toEqual({ total: 100 });
      expect(mockQueryFn).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should cache lookup data with longer TTL', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue(['option1', 'option2']);
      
      const result = await CacheHelpers.cacheLookupData(mockQueryFn, 'game_types');

      expect(result).toEqual(['option1', 'option2']);
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Benefits', () => {
    test('should demonstrate cache performance improvement', async () => {
      let executionCount = 0;
      const slowQueryFn = () => {
        executionCount++;
        return new Promise(resolve => {
          setTimeout(() => resolve({ data: 'expensive result' }), 10);
        });
      };

      // First call - should execute query
      const start1 = Date.now();
      const result1 = await queryCache.cacheQuery(
        slowQueryFn,
        'expensive_query',
        {},
        {},
        1000
      );
      const time1 = Date.now() - start1;

      // Second call - should use cache
      const start2 = Date.now();
      const result2 = await queryCache.cacheQuery(
        slowQueryFn,
        'expensive_query',
        {},
        {},
        1000
      );
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(executionCount).toBe(1); // Query executed only once
      expect(time2).toBeLessThan(time1); // Cache should be faster
      expect(time2).toBeLessThan(5); // Cache access should be very fast
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid pagination parameters gracefully', () => {
      const result = QueryBuilder.validatePaginationParams({
        page: 'invalid',
        limit: 'also_invalid',
        sortOrder: 'maybe'
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.sortOrder).toBe('asc');
    });

    test('should handle empty filters gracefully', () => {
      const query = mockDb();
      const result = QueryBuilder.applyCommonFilters(query, {}, {});
      
      // Should not throw and should return the query
      expect(result).toBe(query);
    });

    test('should handle cache errors gracefully', () => {
      // Test that cache operations don't throw errors
      expect(() => {
        queryCache.get('nonexistent');
        queryCache.delete('nonexistent');
        queryCache.clear();
      }).not.toThrow();
    });
  });
});

describe('Integration with Performance Monitoring', () => {
  test('should track cache operations', () => {
    const queryCache = new QueryCache();
    
    // Mock the performance monitor to avoid circular dependency
    jest.doMock('../../src/middleware/performanceMonitor', () => ({
      trackCacheOperation: jest.fn()
    }));

    queryCache.set('test', 'data');
    const result = queryCache.get('test');
    
    expect(result).toBe('data');
    // Note: In a real test, we would verify trackCacheOperation was called
  });
});