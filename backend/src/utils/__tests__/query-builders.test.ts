/**
 * Comprehensive tests for the query-builders utility TypeScript implementation
 */

import { QueryBuilder, QueryHelpers } from '../query-builders';

// Mock Knex query object
interface MockKnexQuery {
  limit: jest.Mock;
  offset: jest.Mock;
  where: jest.Mock;
  clone: jest.Mock;
  clearSelect: jest.Mock;
  clearOrder: jest.Mock;
  count: jest.Mock;
  orderBy: jest.Mock;
  whereIn: jest.Mock;
  first: jest.Mock;
}

const createMockQuery = (): MockKnexQuery => ({
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  clone: jest.fn().mockReturnThis(),
  clearSelect: jest.fn().mockReturnThis(),
  clearOrder: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue({ count: '10' })
});

describe('QueryBuilder', () => {
  let mockQuery: MockKnexQuery;

  beforeEach(() => {
    mockQuery = createMockQuery();
    mockQuery.clone.mockReturnValue(mockQuery);
  });

  describe('applyPagination', () => {
    it('should apply default pagination', () => {
      QueryBuilder.applyPagination(mockQuery as any);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should apply custom pagination', () => {
      QueryBuilder.applyPagination(mockQuery as any, 3, 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });

    it('should validate page parameter', () => {
      QueryBuilder.applyPagination(mockQuery as any, 0, 25);

      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(mockQuery.offset).toHaveBeenCalledWith(0); // page corrected to 1
    });

    it('should validate limit parameter', () => {
      QueryBuilder.applyPagination(mockQuery as any, 1, 500);

      expect(mockQuery.limit).toHaveBeenCalledWith(300); // limit capped at 300
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should handle string inputs', () => {
      QueryBuilder.applyPagination(mockQuery as any, '2' as any, '15' as any);

      expect(mockQuery.limit).toHaveBeenCalledWith(15);
      expect(mockQuery.offset).toHaveBeenCalledWith(15);
    });

    it('should handle invalid inputs', () => {
      QueryBuilder.applyPagination(mockQuery as any, 'invalid' as any, 'bad' as any);

      expect(mockQuery.limit).toHaveBeenCalledWith(50); // default limit
      expect(mockQuery.offset).toHaveBeenCalledWith(0); // default page
    });
  });

  describe('applyCommonFilters', () => {
    it('should skip null, undefined, and empty string values', () => {
      const filters = {
        status: 'active',
        level: null,
        name: undefined,
        email: ''
      };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(1);
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
    });

    it('should use filter map for column mapping', () => {
      const filters = { status: 'active' };
      const filterMap = { status: 'games.status' };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters, filterMap);

      expect(mockQuery.where).toHaveBeenCalledWith('games.status', 'active');
    });

    it('should handle date_from filter', () => {
      const filters = { date_from: '2024-01-01' };
      const filterMap = { date_from: 'games.game_date' };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters, filterMap);

      expect(mockQuery.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
    });

    it('should handle date_to filter', () => {
      const filters = { date_to: '2024-12-31' };
      const filterMap = { date_to: 'games.game_date' };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters, filterMap);

      expect(mockQuery.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-12-31');
    });

    it('should handle search filter', () => {
      const filters = { search: 'john doe' };
      const filterMap = { search: 'users.name' };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters, filterMap);

      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle boolean filters', () => {
      const filters = { is_available: 'true', white_whistle: true };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('is_available', true);
      expect(mockQuery.where).toHaveBeenCalledWith('white_whistle', true);
    });

    it('should handle exact match filters', () => {
      const filters = { level: 'Elite', game_type: 'Regular' };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('level', 'Elite');
      expect(mockQuery.where).toHaveBeenCalledWith('game_type', 'Regular');
    });
  });

  describe('buildCountQuery', () => {
    it('should build count query with default column', () => {
      const countQuery = QueryBuilder.buildCountQuery(mockQuery as any);

      expect(mockQuery.clearSelect).toHaveBeenCalled();
      expect(mockQuery.clearOrder).toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalledWith(undefined);
      expect(mockQuery.offset).toHaveBeenCalledWith(undefined);
      expect(mockQuery.count).toHaveBeenCalledWith('* as count');
    });

    it('should build count query with custom column', () => {
      QueryBuilder.buildCountQuery(mockQuery as any, 'id');

      expect(mockQuery.count).toHaveBeenCalledWith('id as count');
    });

    it('should clone the base query', () => {
      QueryBuilder.buildCountQuery(mockQuery as any);

      expect(mockQuery.clone).toHaveBeenCalled();
    });
  });

  describe('applySorting', () => {
    it('should apply valid sorting', () => {
      const allowedColumns = ['name', 'email', 'created_at'];

      QueryBuilder.applySorting(mockQuery as any, 'name', 'desc', allowedColumns);

      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'desc');
    });

    it('should ignore invalid sort column', () => {
      const allowedColumns = ['name', 'email'];

      const result = QueryBuilder.applySorting(mockQuery as any, 'invalid_column', 'asc', allowedColumns);

      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should default to asc for invalid sort order', () => {
      const allowedColumns = ['name'];

      QueryBuilder.applySorting(mockQuery as any, 'name', 'invalid' as any, allowedColumns);

      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('should handle missing sortBy', () => {
      const allowedColumns = ['name'];

      const result = QueryBuilder.applySorting(mockQuery as any, undefined as any, 'desc', allowedColumns);

      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });
  });

  describe('applyDateRange', () => {
    it('should apply date from filter only', () => {
      QueryBuilder.applyDateRange(mockQuery as any, 'created_at', '2024-01-01', undefined);

      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '>=', '2024-01-01');
      expect(mockQuery.where).toHaveBeenCalledTimes(1);
    });

    it('should apply date to filter only', () => {
      QueryBuilder.applyDateRange(mockQuery as any, 'created_at', undefined, '2024-12-31');

      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<=', '2024-12-31');
      expect(mockQuery.where).toHaveBeenCalledTimes(1);
    });

    it('should apply both date filters', () => {
      QueryBuilder.applyDateRange(mockQuery as any, 'created_at', '2024-01-01', '2024-12-31');

      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '>=', '2024-01-01');
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<=', '2024-12-31');
      expect(mockQuery.where).toHaveBeenCalledTimes(2);
    });

    it('should handle missing dates', () => {
      const result = QueryBuilder.applyDateRange(mockQuery as any, 'created_at', undefined, undefined);

      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });
  });

  describe('applyMultiColumnSearch', () => {
    it('should apply multi-column search', () => {
      const searchColumns = ['name', 'email', 'description'];

      QueryBuilder.applyMultiColumnSearch(mockQuery as any, 'john', searchColumns);

      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty search term', () => {
      const searchColumns = ['name', 'email'];

      const result = QueryBuilder.applyMultiColumnSearch(mockQuery as any, '', searchColumns);

      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should handle empty search columns', () => {
      const result = QueryBuilder.applyMultiColumnSearch(mockQuery as any, 'john', []);

      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should trim search term', () => {
      const searchColumns = ['name'];

      QueryBuilder.applyMultiColumnSearch(mockQuery as any, '  john  ', searchColumns);

      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('buildPaginatedResponse', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = jest.fn().mockReturnValue(mockQuery);
      // Mock the async methods
      mockQuery.first = jest.fn().mockResolvedValue({ count: '25' });
      (mockQuery as any).then = jest.fn().mockResolvedValue([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]);
    });

    it('should build paginated response with defaults', async () => {
      // Mock the static methods
      jest.spyOn(QueryBuilder, 'applyCommonFilters').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'buildCountQuery').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'applyPagination').mockReturnValue(mockQuery as any);

      const result = await QueryBuilder.buildPaginatedResponse(mockQuery as any);

      expect(result).toEqual({
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalCount: 25,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    });

    it('should apply transformation function', async () => {
      jest.spyOn(QueryBuilder, 'applyCommonFilters').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'buildCountQuery').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'applyPagination').mockReturnValue(mockQuery as any);

      const transformFn = (item: any) => ({ ...item, transformed: true });

      const result = await QueryBuilder.buildPaginatedResponse(
        mockQuery as any,
        {},
        {},
        transformFn
      );

      expect(result.data).toEqual([
        { id: 1, name: 'Item 1', transformed: true },
        { id: 2, name: 'Item 2', transformed: true }
      ]);
    });

    it('should calculate pagination metadata correctly', async () => {
      jest.spyOn(QueryBuilder, 'applyCommonFilters').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'buildCountQuery').mockReturnValue(mockQuery as any);
      jest.spyOn(QueryBuilder, 'applyPagination').mockReturnValue(mockQuery as any);

      mockQuery.first.mockResolvedValue({ count: '100' });

      const result = await QueryBuilder.buildPaginatedResponse(
        mockQuery as any,
        {},
        { page: 2, limit: 10 }
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        totalCount: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPrevPage: true
      });
    });
  });

  describe('buildRelatedQuery', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = jest.fn().mockReturnValue(mockQuery);
    });

    it('should build query with IDs', () => {
      const ids = [1, 2, 3];

      QueryBuilder.buildRelatedQuery(mockDb, 'assignments', ids, 'game_id');

      expect(mockDb).toHaveBeenCalledWith('assignments');
      expect(mockQuery.whereIn).toHaveBeenCalledWith('game_id', ids);
    });

    it('should handle empty IDs array', () => {
      QueryBuilder.buildRelatedQuery(mockDb, 'assignments', [], 'game_id');

      expect(mockDb).toHaveBeenCalledWith('assignments');
      expect(mockQuery.where).toHaveBeenCalledWith('game_id', null);
    });

    it('should use default ID column', () => {
      const ids = [1, 2, 3];

      QueryBuilder.buildRelatedQuery(mockDb, 'assignments', ids);

      expect(mockQuery.whereIn).toHaveBeenCalledWith('id', ids);
    });
  });

  describe('validatePaginationParams', () => {
    it('should return defaults for empty params', () => {
      const result = QueryBuilder.validatePaginationParams();

      expect(result).toEqual({
        page: 1,
        limit: 50,
        sortBy: null,
        sortOrder: 'asc'
      });
    });

    it('should validate and convert parameters', () => {
      const params = {
        page: '3',
        limit: '25',
        sortBy: 'name',
        sortOrder: 'DESC'
      };

      const result = QueryBuilder.validatePaginationParams(params);

      expect(result).toEqual({
        page: 3,
        limit: 25,
        sortBy: 'name',
        sortOrder: 'desc'
      });
    });

    it('should handle invalid parameters', () => {
      const params = {
        page: 'invalid',
        limit: 'bad',
        sortOrder: 'invalid'
      };

      const result = QueryBuilder.validatePaginationParams(params);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        sortBy: null,
        sortOrder: 'asc'
      });
    });

    it('should enforce limits', () => {
      const params = {
        page: '0',
        limit: '500'
      };

      const result = QueryBuilder.validatePaginationParams(params);

      expect(result).toEqual({
        page: 1,
        limit: 300,
        sortBy: null,
        sortOrder: 'asc'
      });
    });
  });
});

  describe('SQL Injection Prevention', () => {
    it('should safely handle malicious filter values', () => {
      const maliciousFilters = {
        status: "'; DROP TABLE users; --",
        level: "1' OR '1'='1",
        search: "<script>alert('xss')</script>"
      };

      // The QueryBuilder should use parameterized queries through Knex
      // This test verifies the filters are passed through properly
      QueryBuilder.applyCommonFilters(mockQuery as any, maliciousFilters);

      // Knex handles parameterization, so we just verify the values are passed as parameters
      expect(mockQuery.where).toHaveBeenCalledWith('status', "'; DROP TABLE users; --");
      expect(mockQuery.where).toHaveBeenCalledWith('level', "1' OR '1'='1");
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle malicious sort columns safely', () => {
      const allowedColumns = ['name', 'email'];

      // Try to inject malicious SQL in sortBy
      const result = QueryBuilder.applySorting(
        mockQuery as any,
        'name; DROP TABLE users; --',
        'asc',
        allowedColumns
      );

      // Should not call orderBy since the column is not in allowed list
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should validate sort order values', () => {
      const allowedColumns = ['name'];

      QueryBuilder.applySorting(
        mockQuery as any,
        'name',
        'asc; DROP TABLE users; --',
        allowedColumns
      );

      // Should default to 'asc' for invalid sort order
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme pagination values', () => {
      // Test maximum values
      QueryBuilder.applyPagination(mockQuery as any, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      expect(mockQuery.limit).toHaveBeenCalledWith(300); // Capped at 300
      expect(mockQuery.offset).toHaveBeenCalledWith((Number.MAX_SAFE_INTEGER - 1) * 300);
    });

    it('should handle negative pagination values', () => {
      QueryBuilder.applyPagination(mockQuery as any, -10, -5);

      expect(mockQuery.limit).toHaveBeenCalledWith(50); // Default limit
      expect(mockQuery.offset).toHaveBeenCalledWith(0); // Page corrected to 1
    });

    it('should handle non-numeric pagination strings', () => {
      QueryBuilder.applyPagination(mockQuery as any, 'not-a-number', 'also-not-a-number');

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should handle very long search terms', () => {
      const longSearch = 'a'.repeat(10000);
      const filters = { search: longSearch };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      // Should still process the search
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle special characters in search', () => {
      const specialChars = "!@#$%^&*()[]{}|\\:;\"'<>?,./`~";
      const filters = { search: specialChars };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty arrays for multi-column search', () => {
      const result = QueryBuilder.applyMultiColumnSearch(mockQuery as any, 'test', []);

      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should handle unicode characters in search', () => {
      const unicodeSearch = '测试 テスト тест 🔍';
      const filters = { search: unicodeSearch };

      QueryBuilder.applyCommonFilters(mockQuery as any, filters);

      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Performance Tests', () => {
    it('should handle large filter objects efficiently', () => {
      const largeFilters: any = {};

      // Create 1000 filter properties
      for (let i = 0; i < 1000; i++) {
        largeFilters[`filter_${i}`] = `value_${i}`;
      }

      const startTime = Date.now();
      QueryBuilder.applyCommonFilters(mockQuery as any, largeFilters);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large arrays for buildRelatedQuery', () => {
      const mockDb = jest.fn().mockReturnValue(mockQuery);
      const largeIds = Array.from({ length: 10000 }, (_, i) => i);

      const startTime = Date.now();
      QueryBuilder.buildRelatedQuery(mockDb, 'test_table', largeIds);
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(50);
      expect(mockQuery.whereIn).toHaveBeenCalledWith('id', largeIds);
    });
  });
});

describe('QueryHelpers', () => {
  describe('getGameFilterMap', () => {
    it('should return game filter map', () => {
      const filterMap = QueryHelpers.getGameFilterMap();

      expect(filterMap).toEqual({
        status: 'games.status',
        level: 'games.level',
        game_type: 'games.game_type',
        postal_code: 'games.postal_code',
        date_from: 'games.game_date',
        date_to: 'games.game_date'
      });
    });
  });

  describe('getRefereeFilterMap', () => {
    it('should return referee filter map', () => {
      const filterMap = QueryHelpers.getRefereeFilterMap();

      expect(filterMap).toEqual({
        level: 'referee_levels.name',
        postal_code: 'users.postal_code',
        is_available: 'users.is_available',
        white_whistle: 'users.white_whistle',
        search: 'users.name'
      });
    });
  });

  describe('getAssignmentFilterMap', () => {
    it('should return assignment filter map', () => {
      const filterMap = QueryHelpers.getAssignmentFilterMap();

      expect(filterMap).toEqual({
        game_id: 'game_assignments.game_id',
        user_id: 'game_assignments.user_id',
        status: 'game_assignments.status',
        date_from: 'games.game_date',
        date_to: 'games.game_date'
      });
    });
  });

  describe('sort column getters', () => {
    it('should return game sort columns', () => {
      const columns = QueryHelpers.getGameSortColumns();

      expect(columns).toEqual(['game_date', 'level', 'status', 'game_type', 'location']);
    });

    it('should return referee sort columns', () => {
      const columns = QueryHelpers.getRefereeSortColumns();

      expect(columns).toEqual(['name', 'email', 'postal_code', 'is_available']);
    });

    it('should return assignment sort columns', () => {
      const columns = QueryHelpers.getAssignmentSortColumns();

      expect(columns).toEqual(['created_at', 'status', 'calculated_wage']);
    });
  });
});