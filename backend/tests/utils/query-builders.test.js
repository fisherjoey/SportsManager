const { QueryBuilder, QueryHelpers } = require('../../src/utils/query-builders');

// Mock Knex query object
const createMockQuery = () => {
  const mockQuery = {
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    clearOrder: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis()
  };
  
  // Make clone return a new mock with the same methods
  mockQuery.clone.mockReturnValue(createMockQuery());
  
  return mockQuery;
};

describe('QueryBuilder', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = createMockQuery();
  });

  describe('applyPagination', () => {
    it('should apply correct limit and offset for page 1', () => {
      const result = QueryBuilder.applyPagination(mockQuery, 1, 10);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
      expect(result).toBe(mockQuery);
    });

    it('should apply correct limit and offset for page 2', () => {
      QueryBuilder.applyPagination(mockQuery, 2, 10);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.offset).toHaveBeenCalledWith(10);
    });

    it('should apply correct limit and offset for page 3 with limit 25', () => {
      QueryBuilder.applyPagination(mockQuery, 3, 25);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(mockQuery.offset).toHaveBeenCalledWith(50);
    });

    it('should handle default values', () => {
      QueryBuilder.applyPagination(mockQuery);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should handle invalid page numbers', () => {
      QueryBuilder.applyPagination(mockQuery, 0, 10);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
      
      QueryBuilder.applyPagination(mockQuery, -5, 10);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should enforce maximum limit', () => {
      QueryBuilder.applyPagination(mockQuery, 1, 200);
      expect(mockQuery.limit).toHaveBeenCalledWith(100);
    });

    it('should enforce minimum limit', () => {
      QueryBuilder.applyPagination(mockQuery, 1, 0);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should handle string inputs', () => {
      QueryBuilder.applyPagination(mockQuery, '2', '15');
      
      expect(mockQuery.limit).toHaveBeenCalledWith(15);
      expect(mockQuery.offset).toHaveBeenCalledWith(15);
    });
  });

  describe('applyCommonFilters', () => {
    it('should apply exact match filters', () => {
      const filters = { status: 'active', level: 'elite' };
      const filterMap = { status: 'games.status', level: 'games.level' };
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('games.status', 'active');
      expect(mockQuery.where).toHaveBeenCalledWith('games.level', 'elite');
    });

    it('should apply date range filters', () => {
      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-12-31'
      };
      const filterMap = {
        date_from: 'games.game_date',
        date_to: 'games.game_date'
      };
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
      expect(mockQuery.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-12-31');
    });

    it('should apply boolean filters', () => {
      const filters = {
        is_available: 'true',
        white_whistle: false
      };
      const filterMap = {
        is_available: 'users.is_available',
        white_whistle: 'users.white_whistle'
      };
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('users.is_available', true);
      expect(mockQuery.where).toHaveBeenCalledWith('users.white_whistle', false);
    });

    it('should handle search filters', () => {
      const filters = { search: 'john doe' };
      const filterMap = { search: 'users.name' };
      
      // Mock the where function to accept a callback
      mockQuery.where.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          const mockThis = {
            where: jest.fn().mockReturnThis()
          };
          callback.call(mockThis);
        }
        return mockQuery;
      });
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should skip null, undefined, and empty string values', () => {
      const filters = {
        status: null,
        level: undefined,
        name: '',
        valid: 'value'
      };
      const filterMap = {
        status: 'games.status',
        level: 'games.level',
        name: 'users.name',
        valid: 'table.valid'
      };
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('table.valid', 'value');
      expect(mockQuery.where).toHaveBeenCalledTimes(1);
    });

    it('should use column name from filter map', () => {
      const filters = { status: 'active' };
      const filterMap = { status: 'games.game_status' };
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('games.game_status', 'active');
    });

    it('should use filter key as column name when not in filter map', () => {
      const filters = { status: 'active' };
      const filterMap = {};
      
      QueryBuilder.applyCommonFilters(mockQuery, filters, filterMap);
      
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('buildCountQuery', () => {
    it('should clone base query and add count', () => {
      const countQuery = QueryBuilder.buildCountQuery(mockQuery);
      
      expect(mockQuery.clone).toHaveBeenCalled();
      expect(countQuery.clearSelect).toHaveBeenCalled();
      expect(countQuery.clearOrder).toHaveBeenCalled();
      expect(countQuery.count).toHaveBeenCalledWith('* as count');
    });

    it('should use custom count column', () => {
      const countQuery = QueryBuilder.buildCountQuery(mockQuery, 'id');
      
      expect(countQuery.count).toHaveBeenCalledWith('id as count');
    });

    it('should clear limit and offset', () => {
      const countQuery = QueryBuilder.buildCountQuery(mockQuery);
      
      expect(countQuery.limit).toHaveBeenCalledWith(undefined);
      expect(countQuery.offset).toHaveBeenCalledWith(undefined);
    });
  });

  describe('applySorting', () => {
    it('should apply sorting with valid parameters', () => {
      const allowedColumns = ['name', 'date', 'status'];
      
      QueryBuilder.applySorting(mockQuery, 'name', 'desc', allowedColumns);
      
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'desc');
    });

    it('should default to asc order', () => {
      const allowedColumns = ['name'];
      
      QueryBuilder.applySorting(mockQuery, 'name', undefined, allowedColumns);
      
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('should handle invalid sort order', () => {
      const allowedColumns = ['name'];
      
      QueryBuilder.applySorting(mockQuery, 'name', 'invalid', allowedColumns);
      
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('should not apply sorting for disallowed columns', () => {
      const allowedColumns = ['name', 'date'];
      
      const result = QueryBuilder.applySorting(mockQuery, 'evil_column', 'desc', allowedColumns);
      
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should not apply sorting when sortBy is empty', () => {
      const allowedColumns = ['name'];
      
      QueryBuilder.applySorting(mockQuery, '', 'desc', allowedColumns);
      
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
    });
  });

  describe('applyDateRange', () => {
    it('should apply date from filter', () => {
      QueryBuilder.applyDateRange(mockQuery, 'created_at', '2024-01-01', null);
      
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '>=', '2024-01-01');
    });

    it('should apply date to filter', () => {
      QueryBuilder.applyDateRange(mockQuery, 'created_at', null, '2024-12-31');
      
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<=', '2024-12-31');
    });

    it('should apply both date filters', () => {
      QueryBuilder.applyDateRange(mockQuery, 'created_at', '2024-01-01', '2024-12-31');
      
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '>=', '2024-01-01');
      expect(mockQuery.where).toHaveBeenCalledWith('created_at', '<=', '2024-12-31');
    });

    it('should not apply filters when dates are null', () => {
      QueryBuilder.applyDateRange(mockQuery, 'created_at', null, null);
      
      expect(mockQuery.where).not.toHaveBeenCalled();
    });
  });

  describe('applyMultiColumnSearch', () => {
    beforeEach(() => {
      // Mock the where function to accept a callback
      mockQuery.where.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          const mockThis = {
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis()
          };
          callback.call(mockThis);
        }
        return mockQuery;
      });
    });

    it('should apply multi-column search', () => {
      const searchColumns = ['name', 'email', 'phone'];
      
      QueryBuilder.applyMultiColumnSearch(mockQuery, 'john', searchColumns);
      
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not apply search when searchTerm is empty', () => {
      const searchColumns = ['name', 'email'];
      
      const result = QueryBuilder.applyMultiColumnSearch(mockQuery, '', searchColumns);
      
      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should not apply search when searchColumns is empty', () => {
      const result = QueryBuilder.applyMultiColumnSearch(mockQuery, 'john', []);
      
      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should trim search term', () => {
      const searchColumns = ['name'];
      
      QueryBuilder.applyMultiColumnSearch(mockQuery, '  john  ', searchColumns);
      
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('buildRelatedQuery', () => {
    const mockDb = jest.fn().mockReturnValue(mockQuery);

    it('should build query with whereIn for valid IDs', () => {
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

    it('should handle null IDs', () => {
      QueryBuilder.buildRelatedQuery(mockDb, 'assignments', null, 'game_id');
      
      expect(mockQuery.where).toHaveBeenCalledWith('game_id', null);
    });

    it('should use default ID column', () => {
      const ids = [1, 2, 3];
      
      QueryBuilder.buildRelatedQuery(mockDb, 'assignments', ids);
      
      expect(mockQuery.whereIn).toHaveBeenCalledWith('id', ids);
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate and sanitize pagination parameters', () => {
      const params = {
        page: '2',
        limit: '25',
        sortBy: 'name',
        sortOrder: 'DESC'
      };
      
      const result = QueryBuilder.validatePaginationParams(params);
      
      expect(result).toEqual({
        page: 2,
        limit: 25,
        sortBy: 'name',
        sortOrder: 'desc'
      });
    });

    it('should apply default values', () => {
      const result = QueryBuilder.validatePaginationParams({});
      
      expect(result).toEqual({
        page: 1,
        limit: 50,
        sortBy: null,
        sortOrder: 'asc'
      });
    });

    it('should enforce minimum page', () => {
      const result = QueryBuilder.validatePaginationParams({ page: 0 });
      expect(result.page).toBe(1);
      
      const result2 = QueryBuilder.validatePaginationParams({ page: -5 });
      expect(result2.page).toBe(1);
    });

    it('should enforce limit bounds', () => {
      const result1 = QueryBuilder.validatePaginationParams({ limit: 0 });
      expect(result1.limit).toBe(1);
      
      const result2 = QueryBuilder.validatePaginationParams({ limit: 200 });
      expect(result2.limit).toBe(100);
    });

    it('should handle invalid sort order', () => {
      const result = QueryBuilder.validatePaginationParams({ sortOrder: 'invalid' });
      expect(result.sortOrder).toBe('asc');
    });
  });

  describe('buildPaginatedResponse', () => {
    const mockDb = {
      table: jest.fn().mockReturnValue(mockQuery)
    };

    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock the query chain for count
      const countResult = { count: '100' };
      mockQuery.first = jest.fn().mockResolvedValue(countResult);
      
      // Mock the data query result
      const mockData = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' }
      ];
      
      // Create separate mock queries for count and data
      const countQuery = createMockQuery();
      countQuery.first = jest.fn().mockResolvedValue(countResult);
      
      const dataQuery = createMockQuery();
      dataQuery.then = jest.fn().mockResolvedValue(mockData);
      
      // Make clone return appropriate queries
      let cloneCallCount = 0;
      mockQuery.clone.mockImplementation(() => {
        cloneCallCount++;
        if (cloneCallCount === 1) return dataQuery;
        if (cloneCallCount === 2) return countQuery;
        return createMockQuery();
      });
      
      // Make the final query executable
      Object.assign(mockQuery, {
        then: jest.fn().mockResolvedValue(mockData),
        catch: jest.fn(),
        finally: jest.fn()
      });
    });

    it('should build paginated response with data and metadata', async () => {
      const filters = { status: 'active' };
      const options = {
        page: 1,
        limit: 10,
        filterMap: { status: 'table.status' }
      };
      
      const result = await QueryBuilder.buildPaginatedResponse(mockQuery, filters, options);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalCount: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPrevPage: false
      });
    });

    it('should apply transformation function', async () => {
      const transformFn = (item) => ({ ...item, transformed: true });
      const options = { page: 1, limit: 10 };
      
      const result = await QueryBuilder.buildPaginatedResponse(mockQuery, {}, options, transformFn);
      
      expect(result.data).toEqual([
        { id: 1, name: 'Test 1', transformed: true },
        { id: 2, name: 'Test 2', transformed: true }
      ]);
    });

    it('should calculate pagination metadata correctly', async () => {
      const options = { page: 3, limit: 15 };
      
      const result = await QueryBuilder.buildPaginatedResponse(mockQuery, {}, options);
      
      expect(result.pagination).toEqual({
        page: 3,
        limit: 15,
        totalCount: 100,
        totalPages: 7,
        hasNextPage: true,
        hasPrevPage: true
      });
    });
  });
});

describe('QueryHelpers', () => {
  describe('getGameFilterMap', () => {
    it('should return correct filter map for games', () => {
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
    it('should return correct filter map for referees', () => {
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
    it('should return correct filter map for assignments', () => {
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

  describe('sort column helpers', () => {
    it('should return allowed sort columns for games', () => {
      const columns = QueryHelpers.getGameSortColumns();
      expect(columns).toContain('game_date');
      expect(columns).toContain('level');
      expect(columns).toContain('status');
    });

    it('should return allowed sort columns for referees', () => {
      const columns = QueryHelpers.getRefereeSortColumns();
      expect(columns).toContain('name');
      expect(columns).toContain('email');
      expect(columns).toContain('is_available');
    });

    it('should return allowed sort columns for assignments', () => {
      const columns = QueryHelpers.getAssignmentSortColumns();
      expect(columns).toContain('created_at');
      expect(columns).toContain('status');
      expect(columns).toContain('calculated_wage');
    });
  });
});