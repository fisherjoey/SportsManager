/**
 * Simple smoke test for query-builders to verify basic functionality
 */

const { QueryBuilder, QueryHelpers } = require('../query-builders');

// Mock Knex query object for testing
const createMockQuery = () => ({
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  clone: jest.fn().mockReturnThis(),
  clearSelect: jest.fn().mockReturnThis(),
  clearOrder: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis()
});

describe('QueryBuilder - Basic Functionality', () => {
  test('should export QueryBuilder and QueryHelpers', () => {
    expect(typeof QueryBuilder).toBe('function');
    expect(typeof QueryHelpers).toBe('object');
  });

  test('should have all required static methods', () => {
    expect(typeof QueryBuilder.applyPagination).toBe('function');
    expect(typeof QueryBuilder.applyCommonFilters).toBe('function');
    expect(typeof QueryBuilder.buildCountQuery).toBe('function');
    expect(typeof QueryBuilder.applySorting).toBe('function');
    expect(typeof QueryBuilder.applyDateRange).toBe('function');
    expect(typeof QueryBuilder.validatePaginationParams).toBe('function');
  });

  test('should apply pagination correctly', () => {
    const mockQuery = createMockQuery();

    QueryBuilder.applyPagination(mockQuery, 2, 10);

    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(mockQuery.offset).toHaveBeenCalledWith(10);
  });

  test('should validate pagination parameters', () => {
    const result = QueryBuilder.validatePaginationParams({ page: '2', limit: '20' });

    expect(result).toEqual({
      page: 2,
      limit: 20,
      sortBy: null,
      sortOrder: 'asc'
    });
  });

  test('should have helper methods for filter maps', () => {
    expect(typeof QueryHelpers.getGameFilterMap).toBe('function');
    expect(typeof QueryHelpers.getRefereeFilterMap).toBe('function');
    expect(typeof QueryHelpers.getAssignmentFilterMap).toBe('function');
  });

  test('should return filter maps', () => {
    const gameMap = QueryHelpers.getGameFilterMap();
    const refereeMap = QueryHelpers.getRefereeFilterMap();

    expect(gameMap).toHaveProperty('status', 'games.status');
    expect(refereeMap).toHaveProperty('level', 'referee_levels.name');
  });

  test('should return sort columns', () => {
    const gameColumns = QueryHelpers.getGameSortColumns();
    const refereeColumns = QueryHelpers.getRefereeSortColumns();

    expect(Array.isArray(gameColumns)).toBe(true);
    expect(Array.isArray(refereeColumns)).toBe(true);
    expect(gameColumns.length).toBeGreaterThan(0);
    expect(refereeColumns.length).toBeGreaterThan(0);
  });
});