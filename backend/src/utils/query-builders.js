/**
 * @fileoverview Reusable query building utilities for Knex.js
 * @description This module provides standardized query building patterns
 * for common database operations like pagination, filtering, and counting.
 * All methods work with Knex.js query objects and maintain query chaining.
 */

/**
 * QueryBuilder class containing static methods for common query operations
 */
class QueryBuilder {
  /**
   * Apply pagination to a Knex query
   * @param {Object} query - Knex query object
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of items per page
   * @returns {Object} Modified Knex query with pagination applied
   * @example
   * const paginatedQuery = QueryBuilder.applyPagination(
   *   db('users'), 
   *   2, 
   *   10
   * );
   */
  static applyPagination(query, page = 1, limit = 50) {
    // Validate parameters
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.min(300, Math.max(1, parseInt(limit, 10) || 50));
    
    const offset = (validPage - 1) * validLimit;
    
    return query.limit(validLimit).offset(offset);
  }

  /**
   * Apply common filters to a query based on provided filter object
   * @param {Object} query - Knex query object
   * @param {Object} filters - Object containing filter criteria
   * @param {Object} filterMap - Map of filter keys to database columns
   * @returns {Object} Modified Knex query with filters applied
   * @example
   * const filteredQuery = QueryBuilder.applyCommonFilters(
   *   db('games'),
   *   { status: 'scheduled', level: 'Elite' },
   *   { status: 'games.status', level: 'games.level' }
   * );
   */
  static applyCommonFilters(query, filters = {}, filterMap = {}) {
    let modifiedQuery = query;

    Object.entries(filters).forEach(([key, value]) => {
      // Skip null, undefined, or empty string values
      if (value === null || value === undefined || value === '') {
        return;
      }

      // Get the database column name from the filter map
      const column = filterMap[key] || key;

      // Handle different filter types
      switch (key) {
      case 'date_from':
        modifiedQuery = modifiedQuery.where(column, '>=', value);
        break;
        
      case 'date_to':
        modifiedQuery = modifiedQuery.where(column, '<=', value);
        break;
        
      case 'search':
        // Generic search that can be customized per use case
        if (typeof value === 'string' && value.trim()) {
          modifiedQuery = modifiedQuery.where(function() {
            // This is a basic implementation - should be customized per table
            this.where(column, 'ilike', `%${value.trim()}%`);
          });
        }
        break;
        
      case 'is_available':
      case 'white_whistle':
        // Boolean filters
        modifiedQuery = modifiedQuery.where(column, value === 'true' || value === true);
        break;
        
      default:
        // Exact match for other filters
        modifiedQuery = modifiedQuery.where(column, value);
        break;
      }
    });

    return modifiedQuery;
  }

  /**
   * Build a count query from a base query
   * @param {Object} baseQuery - Base Knex query object (without pagination)
   * @param {string} countColumn - Column to count (default: '*')
   * @returns {Object} Count query that can be executed
   * @example
   * const countQuery = QueryBuilder.buildCountQuery(
   *   db('users').where('role', 'referee')
   * );
   * const totalCount = await countQuery.first();
   */
  static buildCountQuery(baseQuery, countColumn = '*') {
    // Clone the base query to avoid modifying the original
    const countQuery = baseQuery.clone();
    
    // Clear any existing select, order by, limit, offset
    countQuery.clearSelect();
    countQuery.clearOrder();
    countQuery.limit(undefined);
    countQuery.offset(undefined);
    
    // Add count select
    return countQuery.count(`${countColumn} as count`);
  }

  /**
   * Apply sorting to a query
   * @param {Object} query - Knex query object
   * @param {string} sortBy - Column to sort by
   * @param {string} sortOrder - Sort direction ('asc' or 'desc')
   * @param {Array<string>} allowedColumns - List of allowed columns for sorting
   * @returns {Object} Modified Knex query with sorting applied
   * @example
   * const sortedQuery = QueryBuilder.applySorting(
   *   db('games'),
   *   'game_date',
   *   'desc',
   *   ['game_date', 'level', 'status']
   * );
   */
  static applySorting(query, sortBy, sortOrder = 'asc', allowedColumns = []) {
    // Validate sort parameters
    if (!sortBy || !allowedColumns.includes(sortBy)) {
      return query;
    }

    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) 
      ? sortOrder.toLowerCase() 
      : 'asc';

    return query.orderBy(sortBy, validSortOrder);
  }

  /**
   * Apply date range filters to a query
   * @param {Object} query - Knex query object
   * @param {string} dateColumn - Database column name for date filtering
   * @param {string|Date} dateFrom - Start date
   * @param {string|Date} dateTo - End date
   * @returns {Object} Modified Knex query with date filters applied
   * @example
   * const dateFilteredQuery = QueryBuilder.applyDateRange(
   *   db('games'),
   *   'game_date',
   *   '2024-01-01',
   *   '2024-12-31'
   * );
   */
  static applyDateRange(query, dateColumn, dateFrom, dateTo) {
    let modifiedQuery = query;

    if (dateFrom) {
      modifiedQuery = modifiedQuery.where(dateColumn, '>=', dateFrom);
    }

    if (dateTo) {
      modifiedQuery = modifiedQuery.where(dateColumn, '<=', dateTo);
    }

    return modifiedQuery;
  }

  /**
   * Apply search filters across multiple columns
   * @param {Object} query - Knex query object
   * @param {string} searchTerm - Search term
   * @param {Array<string>} searchColumns - Columns to search in
   * @returns {Object} Modified Knex query with search applied
   * @example
   * const searchQuery = QueryBuilder.applyMultiColumnSearch(
   *   db('users'),
   *   'john',
   *   ['name', 'email']
   * );
   */
  static applyMultiColumnSearch(query, searchTerm, searchColumns = []) {
    if (!searchTerm || !searchTerm.trim() || searchColumns.length === 0) {
      return query;
    }

    const cleanSearchTerm = searchTerm.trim();

    return query.where(function() {
      searchColumns.forEach((column, index) => {
        if (index === 0) {
          this.where(column, 'ilike', `%${cleanSearchTerm}%`);
        } else {
          this.orWhere(column, 'ilike', `%${cleanSearchTerm}%`);
        }
      });
    });
  }

  /**
   * Build a paginated response with total count
   * @param {Object} query - Base query for data
   * @param {Object} filters - Filter parameters
   * @param {Object} options - Pagination and sorting options
   * @param {Function} transformFn - Optional function to transform each result
   * @returns {Object} Object containing data, pagination info, and total count
   * @example
   * const result = await QueryBuilder.buildPaginatedResponse(
   *   db('games'),
   *   { status: 'scheduled' },
   *   { page: 1, limit: 10, sortBy: 'game_date', sortOrder: 'asc' }
   * );
   */
  static async buildPaginatedResponse(query, filters = {}, options = {}, transformFn = null) {
    const {
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = 'asc',
      allowedSortColumns = [],
      filterMap = {}
    } = options;

    // Build the base query with filters
    let dataQuery = this.applyCommonFilters(query.clone(), filters, filterMap);
    
    // Apply sorting if provided
    if (sortBy && allowedSortColumns.length > 0) {
      dataQuery = this.applySorting(dataQuery, sortBy, sortOrder, allowedSortColumns);
    }

    // Get total count before pagination
    const countResult = await this.buildCountQuery(dataQuery).first();
    const totalCount = parseInt(countResult.count, 10);

    // Apply pagination to data query
    dataQuery = this.applyPagination(dataQuery, page, limit);

    // Execute the data query
    let data = await dataQuery;

    // Apply transformation if provided
    if (transformFn && typeof transformFn === 'function') {
      data = data.map(transformFn);
    }

    // Calculate pagination metadata
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.min(300, Math.max(1, parseInt(limit, 10) || 50));
    const totalPages = Math.ceil(totalCount / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    return {
      data,
      pagination: {
        page: validPage,
        limit: validLimit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
  }

  /**
   * Build a query for finding related records (for joins)
   * @param {Object} db - Knex database instance
   * @param {string} table - Table name
   * @param {Array} ids - Array of IDs to find
   * @param {string} idColumn - Column name for ID matching
   * @returns {Object} Knex query for related records
   * @example
   * const assignmentsQuery = QueryBuilder.buildRelatedQuery(
   *   db,
   *   'game_assignments',
   *   [1, 2, 3],
   *   'game_id'
   * );
   */
  static buildRelatedQuery(db, table, ids, idColumn = 'id') {
    if (!ids || ids.length === 0) {
      // Return empty query that won't match anything
      return db(table).where(idColumn, null);
    }

    return db(table).whereIn(idColumn, ids);
  }

  /**
   * Validate and sanitize pagination parameters
   * @param {Object} params - Raw pagination parameters
   * @returns {Object} Validated pagination parameters
   * @example
   * const validated = QueryBuilder.validatePaginationParams({
   *   page: '2',
   *   limit: '25',
   *   sortBy: 'name',
   *   sortOrder: 'desc'
   * });
   */
  static validatePaginationParams(params = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = 'asc'
    } = params;

    return {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(300, Math.max(1, parseInt(limit, 10) || 50)),
      sortBy: sortBy || null,
      sortOrder: ['asc', 'desc'].includes(String(sortOrder).toLowerCase()) 
        ? String(sortOrder).toLowerCase() 
        : 'asc'
    };
  }
}

/**
 * Helper functions for common query patterns
 */
const QueryHelpers = {
  /**
   * Create a filter map for common game filters
   * @returns {Object} Filter map for games
   */
  getGameFilterMap() {
    return {
      status: 'games.status',
      level: 'games.level',
      game_type: 'games.game_type',
      postal_code: 'games.postal_code',
      date_from: 'games.game_date',
      date_to: 'games.game_date'
    };
  },

  /**
   * Create a filter map for common referee filters
   * @returns {Object} Filter map for referees
   */
  getRefereeFilterMap() {
    return {
      level: 'referee_levels.name',
      postal_code: 'users.postal_code',
      is_available: 'users.is_available',
      white_whistle: 'users.white_whistle',
      search: 'users.name' // This will need custom handling for multi-column search
    };
  },

  /**
   * Create a filter map for common assignment filters
   * @returns {Object} Filter map for assignments
   */
  getAssignmentFilterMap() {
    return {
      game_id: 'game_assignments.game_id',
      user_id: 'game_assignments.user_id',
      status: 'game_assignments.status',
      date_from: 'games.game_date',
      date_to: 'games.game_date'
    };
  },

  /**
   * Get allowed sort columns for games
   * @returns {Array<string>} Allowed sort columns
   */
  getGameSortColumns() {
    return ['game_date', 'level', 'status', 'game_type', 'location'];
  },

  /**
   * Get allowed sort columns for referees
   * @returns {Array<string>} Allowed sort columns
   */
  getRefereeSortColumns() {
    return ['name', 'email', 'postal_code', 'is_available'];
  },

  /**
   * Get allowed sort columns for assignments
   * @returns {Array<string>} Allowed sort columns
   */
  getAssignmentSortColumns() {
    return ['created_at', 'status', 'calculated_wage'];
  }
};

module.exports = {
  QueryBuilder,
  QueryHelpers
};