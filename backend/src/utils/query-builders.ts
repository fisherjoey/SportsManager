/**
 * @fileoverview Reusable query building utilities for Knex.js with comprehensive TypeScript support
 * @description This module provides standardized, type-safe query building patterns
 * for common database operations like pagination, filtering, and counting.
 * All methods work with Knex.js query objects and maintain query chaining.
 */

import { Knex } from 'knex';

/**
 * Type definitions for query building
 */
export interface FilterMap {
  [key: string]: string;
}

export interface CommonFilters {
  [key: string]: any;
  date_from?: string | Date;
  date_to?: string | Date;
  search?: string;
  is_available?: boolean | string;
  white_whistle?: boolean | string;
}

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | string;
}

export interface ValidatedPaginationParams {
  page: number;
  limit: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  allowedSortColumns?: string[];
  filterMap?: FilterMap;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface CountResult {
  count: string | number;
}

export type TransformFunction<T, U> = (item: T) => U;
export type SortOrder = 'asc' | 'desc';

/**
 * QueryBuilder class containing static methods for common query operations with full type safety
 */
export class QueryBuilder {
  /**
   * Apply pagination to a Knex query with validation
   */
  static applyPagination(
    query: Knex.QueryBuilder,
    page: number | string = 1,
    limit: number | string = 50
  ): Knex.QueryBuilder {
    // Validate parameters
    const validPage = Math.max(1, parseInt(String(page), 10) || 1);
    const validLimit = Math.min(300, Math.max(1, parseInt(String(limit), 10) || 50));

    const offset = (validPage - 1) * validLimit;

    return query.limit(validLimit).offset(offset);
  }

  /**
   * Apply common filters to a query based on provided filter object with type safety
   */
  static applyCommonFilters(
    query: Knex.QueryBuilder,
    filters: CommonFilters = {},
    filterMap: FilterMap = {}
  ): Knex.QueryBuilder {
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
          modifiedQuery = modifiedQuery.where(function(this: Knex.QueryBuilder) {
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
   * Build a count query from a base query with proper typing
   */
  static buildCountQuery(
    baseQuery: Knex.QueryBuilder,
    countColumn: string = '*'
  ): Knex.QueryBuilder {
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
   * Apply sorting to a query with column validation
   */
  static applySorting(
    query: Knex.QueryBuilder,
    sortBy: string | undefined,
    sortOrder: string = 'asc',
    allowedColumns: string[] = []
  ): Knex.QueryBuilder {
    // Validate sort parameters
    if (!sortBy || !allowedColumns.includes(sortBy)) {
      return query;
    }

    const validSortOrder: SortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase())
      ? sortOrder.toLowerCase() as SortOrder
      : 'asc';

    return query.orderBy(sortBy, validSortOrder);
  }

  /**
   * Apply date range filters to a query with proper date handling
   */
  static applyDateRange(
    query: Knex.QueryBuilder,
    dateColumn: string,
    dateFrom?: string | Date,
    dateTo?: string | Date
  ): Knex.QueryBuilder {
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
   * Apply search filters across multiple columns with proper typing
   */
  static applyMultiColumnSearch(
    query: Knex.QueryBuilder,
    searchTerm: string | undefined,
    searchColumns: string[] = []
  ): Knex.QueryBuilder {
    if (!searchTerm || !searchTerm.trim() || searchColumns.length === 0) {
      return query;
    }

    const cleanSearchTerm = searchTerm.trim();

    return query.where(function(this: Knex.QueryBuilder) {
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
   * Build a paginated response with total count and proper typing
   */
  static async buildPaginatedResponse<T = any, U = T>(
    query: Knex.QueryBuilder,
    filters: CommonFilters = {},
    options: PaginationOptions = {},
    transformFn?: TransformFunction<T, U> | null
  ): Promise<PaginatedResponse<U>> {
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
    const countResult = await this.buildCountQuery(dataQuery).first() as CountResult;
    const totalCount = parseInt(String(countResult.count), 10);

    // Apply pagination to data query
    dataQuery = this.applyPagination(dataQuery, page, limit);

    // Execute the data query
    let data = await dataQuery as T[];

    // Apply transformation if provided
    if (transformFn && typeof transformFn === 'function') {
      data = data.map(transformFn) as any;
    }

    // Calculate pagination metadata
    const validPage = Math.max(1, parseInt(String(page), 10) || 1);
    const validLimit = Math.min(300, Math.max(1, parseInt(String(limit), 10) || 50));
    const totalPages = Math.ceil(totalCount / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    return {
      data: data as unknown as U[],
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
   * Build a query for finding related records (for joins) with proper typing
   */
  static buildRelatedQuery(
    db: Knex,
    table: string,
    ids: (string | number)[] | undefined,
    idColumn: string = 'id'
  ): Knex.QueryBuilder {
    if (!ids || ids.length === 0) {
      // Return empty query that won't match anything
      return db(table).where(idColumn, null);
    }

    return db(table).whereIn(idColumn, ids);
  }

  /**
   * Validate and sanitize pagination parameters with comprehensive type checking
   */
  static validatePaginationParams(params: PaginationParams = {}): ValidatedPaginationParams {
    const {
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = 'asc'
    } = params;

    return {
      page: Math.max(1, parseInt(String(page), 10) || 1),
      limit: Math.min(1000, Math.max(1, parseInt(String(limit), 10) || 50)),
      sortBy: sortBy || null,
      sortOrder: ['asc', 'desc'].includes(String(sortOrder).toLowerCase())
        ? String(sortOrder).toLowerCase() as SortOrder
        : 'asc'
    };
  }
}

/**
 * Type definitions for domain-specific filters
 */
export interface GameFilters extends CommonFilters {
  status?: string;
  level?: string;
  game_type?: string;
  postal_code?: string;
}

export interface RefereeFilters extends CommonFilters {
  level?: string;
  postal_code?: string;
  is_available?: boolean | string;
  white_whistle?: boolean | string;
}

export interface AssignmentFilters extends CommonFilters {
  game_id?: number;
  user_id?: number;
  status?: string;
}

/**
 * Helper functions for common query patterns with full type safety
 */
export class QueryHelpers {
  /**
   * Create a filter map for common game filters
   */
  static getGameFilterMap(): FilterMap {
    return {
      status: 'games.status',
      level: 'games.level',
      game_type: 'games.game_type',
      postal_code: 'games.postal_code',
      date_from: 'games.game_date',
      date_to: 'games.game_date'
    };
  }

  /**
   * Create a filter map for common referee filters
   */
  static getRefereeFilterMap(): FilterMap {
    return {
      level: 'referee_levels.name',
      postal_code: 'users.postal_code',
      is_available: 'users.is_available',
      white_whistle: 'users.white_whistle',
      search: 'users.name' // This will need custom handling for multi-column search
    };
  }

  /**
   * Create a filter map for common assignment filters
   */
  static getAssignmentFilterMap(): FilterMap {
    return {
      game_id: 'game_assignments.game_id',
      user_id: 'game_assignments.user_id',
      status: 'game_assignments.status',
      date_from: 'games.game_date',
      date_to: 'games.game_date'
    };
  }

  /**
   * Get allowed sort columns for games
   */
  static getGameSortColumns(): string[] {
    return ['game_date', 'level', 'status', 'game_type', 'location'];
  }

  /**
   * Get allowed sort columns for referees
   */
  static getRefereeSortColumns(): string[] {
    return ['name', 'email', 'postal_code', 'is_available'];
  }

  /**
   * Get allowed sort columns for assignments
   */
  static getAssignmentSortColumns(): string[] {
    return ['created_at', 'status', 'calculated_wage'];
  }
}

// Export types for external use
export type {
  Knex,
  FilterMap as QueryFilterMap,
  CommonFilters as QueryFilters,
  PaginationParams as QueryPaginationParams,
  PaginationOptions as QueryPaginationOptions,
  PaginatedResponse as QueryPaginatedResponse,
  TransformFunction as QueryTransformFunction
};

// Legacy export structure for CommonJS compatibility
const queryBuilders = {
  QueryBuilder,
  QueryHelpers
};

export default queryBuilders;

// CommonJS compatibility
module.exports = queryBuilders;
(module.exports as any).QueryBuilder = QueryBuilder;
(module.exports as any).QueryHelpers = QueryHelpers;
(module.exports as any).default = queryBuilders;