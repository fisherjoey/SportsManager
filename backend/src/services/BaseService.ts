/**
 * BaseService - Foundation service class for centralized business logic
 * 
 * This class provides common CRUD operations, transaction support, and
 * error handling patterns that can be extended by specific service implementations.
 * It follows the Repository pattern and integrates with Knex.js for database operations.
 */

import { Database, UUID, Timestamp, PaginatedResult, Knex } from '../types';

// Service configuration options interface
export interface ServiceOptions {
  // Default pagination settings
  defaultLimit?: number;
  maxLimit?: number;
  // Default ordering
  defaultOrderBy?: string;
  defaultOrderDirection?: 'asc' | 'desc';
  // Error handling
  throwOnNotFound?: boolean;
  // Audit trails
  enableAuditTrail?: boolean;
}

// Query options for database operations
export interface QueryOptions {
  select?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include?: JoinOptions[];
  transaction?: Knex.Transaction;
  auditUserId?: string; // For audit trail tracking
}

// Join options for including related data
export interface JoinOptions {
  table: string;
  as?: string;
  on: string;
  type?: 'left' | 'right' | 'inner' | 'outer';
}

// Base entity interface with common fields
export interface BaseEntity {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
  updated_by?: UUID;
}

export abstract class BaseService<T extends BaseEntity = BaseEntity> {
  protected tableName: string;
  protected db: Database;
  protected options: ServiceOptions;

  /**
   * Constructor for BaseService
   */
  constructor(tableName: string, db: Database, options: ServiceOptions = {}) {
    if (!tableName || !db) {
      throw new Error('BaseService requires tableName and db parameters');
    }
    
    this.tableName = tableName;
    this.db = db;
    this.options = {
      // Default pagination settings
      defaultLimit: 50,
      maxLimit: 200,
      // Default ordering
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      // Error handling
      throwOnNotFound: true,
      // Audit trails
      enableAuditTrail: false,
      ...options
    };
  }

  /**
   * Find a single record by ID
   */
  async findById(id: UUID, options: QueryOptions = {}): Promise<T | null> {
    try {
      const { select, include } = options;
      
      let query = this.db(this.tableName).where('id', id);
      
      if (select) {
        query = query.select(select);
      }
      
      // Handle joins for related data
      if (include && Array.isArray(include)) {
        query = this._applyIncludes(query, include);
      }
      
      const record = await query.first();
      
      if (!record && this.options.throwOnNotFound) {
        throw new Error(`${this.tableName.slice(0, -1)} not found with id: ${id}`);
      }
      
      return record as T | null;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by id ${id}:`, error);
      throw new Error(`Failed to find ${this.tableName.slice(0, -1)}: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, options: QueryOptions = {}): Promise<T> {
    const trx = options.transaction || this.db;
    
    try {
      // Add timestamps if not present
      const recordData = {
        ...data,
        created_at: data.created_at || new Date(),
        updated_at: data.updated_at || new Date()
      };
      
      console.log(`Creating ${this.tableName} record with data:`, JSON.stringify(recordData, null, 2));
      
      const [record] = await trx(this.tableName)
        .insert(recordData)
        .returning('*');
      
      // Handle post-creation hooks
      if (this.afterCreate) {
        await this.afterCreate(record, options);
      }
      
      return record as T;
    } catch (error: any) {
      console.error(`Error creating ${this.tableName} record:`, error);
      console.error('Database error details:', {
        code: error.code,
        detail: error.detail,
        table: error.table,
        constraint: error.constraint,
        column: error.column
      });
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`${this.tableName.slice(0, -1)} already exists`);
      }
      
      throw new Error(`Failed to create ${this.tableName.slice(0, -1)}: ${error.message}`);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: UUID, data: Partial<T>, options: QueryOptions = {}): Promise<T> {
    const trx = options.transaction || this.db;
    
    try {
      // Check if record exists first
      const existingRecord = await trx(this.tableName).where('id', id).first();
      if (!existingRecord) {
        throw new Error(`${this.tableName.slice(0, -1)} not found with id: ${id}`);
      }
      
      // Add updated timestamp
      const updateData = {
        ...data,
        updated_at: new Date()
      };
      
      const records = await trx(this.tableName)
        .where('id', id)
        .update(updateData)
        .returning('*');
      
      const record = records[0];
      
      // Handle post-update hooks
      if (this.afterUpdate) {
        await this.afterUpdate(record, existingRecord, options);
      }
      
      return record as T;
    } catch (error) {
      console.error(`Error updating ${this.tableName} record ${id}:`, error);
      throw new Error(`Failed to update ${this.tableName.slice(0, -1)}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: UUID, options: QueryOptions = {}): Promise<boolean> {
    const trx = options.transaction || this.db;
    
    try {
      // Get record before deletion for hooks
      const existingRecord = await trx(this.tableName).where('id', id).first();
      if (!existingRecord) {
        if (this.options.throwOnNotFound) {
          throw new Error(`${this.tableName.slice(0, -1)} not found with id: ${id}`);
        }
        return false;
      }
      
      // Handle pre-deletion hooks
      if (this.beforeDelete) {
        await this.beforeDelete(existingRecord, options);
      }
      
      const deletedCount = await trx(this.tableName).where('id', id).del();
      
      // Handle post-deletion hooks
      if (this.afterDelete) {
        await this.afterDelete(existingRecord, options);
      }
      
      return deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting ${this.tableName} record ${id}:`, error);
      throw new Error(`Failed to delete ${this.tableName.slice(0, -1)}: ${(error as Error).message}`);
    }
  }

  /**
   * Find records with pagination and filtering
   */
  async findWithPagination(
    filters: Record<string, any> = {}, 
    page: number = 1, 
    limit: number | null = null, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    try {
      // Validate and set pagination parameters
      const validatedPage = Math.max(1, parseInt(page.toString()) || 1);
      const validatedLimit = Math.min(
        this.options.maxLimit!,
        Math.max(1, parseInt(String(limit || this.options.defaultLimit!)))
      );
      const offset = (validatedPage - 1) * validatedLimit;

      // Build base query
      let query = this.db(this.tableName);
      let countQuery = this.db(this.tableName);

      // Apply filters
      query = this._applyFilters(query, filters);
      countQuery = this._applyFilters(countQuery, filters);

      // Apply includes/joins
      if (options.include && Array.isArray(options.include)) {
        query = this._applyIncludes(query, options.include);
      }

      // Apply selection
      if (options.select) {
        query = query.select(options.select);
      }

      // Apply ordering
      const orderBy = options.orderBy || this.options.defaultOrderBy!;
      const orderDirection = options.orderDirection || this.options.defaultOrderDirection!;
      query = query.orderBy(orderBy, orderDirection);

      // Apply pagination
      query = query.limit(validatedLimit).offset(offset);

      // Execute queries in parallel
      const [records, countResult] = await Promise.all([
        query,
        countQuery.count('* as total').first()
      ]);

      if (!countResult) {
        throw new Error('Failed to get count result');
      }

      const total = parseInt((countResult as any).total);
      const totalPages = Math.ceil(total / validatedLimit);

      return {
        data: records as T[],
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          totalPages,
          hasNext: validatedPage < totalPages,
          hasPrevious: validatedPage > 1
        }
      };
    } catch (error) {
      console.error(`Error finding ${this.tableName} with pagination:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Find records with custom conditions
   */
  async findWhere(conditions: Partial<T>, options: QueryOptions = {}): Promise<T[]> {
    try {
      let query = this.db(this.tableName);
      
      // Apply conditions one by one
      Object.keys(conditions).forEach(key => {
        if (conditions[key as keyof T] !== undefined) {
          query = query.where(key, conditions[key as keyof T]);
        }
      });

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.include && Array.isArray(options.include)) {
        query = this._applyIncludes(query, options.include);
      }

      if (options.orderBy) {
        const direction = options.orderDirection || 'asc';
        query = query.orderBy(options.orderBy, direction);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const records = await query;
      return records as T[];
    } catch (error) {
      console.error(`Error finding ${this.tableName} with conditions:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk create records
   */
  async bulkCreate(records: Partial<T>[], options: QueryOptions = {}): Promise<T[]> {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Records array is required and cannot be empty');
    }

    if (records.length > 1000) {
      throw new Error('Bulk create limited to 1000 records at once');
    }

    const trx = options.transaction || this.db;

    try {
      // Add timestamps to all records
      const recordsWithTimestamps = records.map(record => ({
        ...record,
        created_at: record.created_at || new Date(),
        updated_at: record.updated_at || new Date()
      }));

      const createdRecords = await trx(this.tableName)
        .insert(recordsWithTimestamps)
        .returning('*');

      return createdRecords as T[];
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName} records:`, error);
      throw new Error(`Failed to bulk create ${this.tableName}: ${(error as Error).message}`);
    }
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<TResult>(callback: (trx: Knex.Transaction) => Promise<TResult>): Promise<TResult> {
    const trx = await this.db.transaction();

    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      console.error(`Transaction failed for ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Apply filters to a query builder
   * @private
   */
  private _applyFilters(query: Knex.QueryBuilder, filters: Record<string, any>): Knex.QueryBuilder {
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.whereIn(key, value as any[]);
        } else if (typeof value === 'object' && value.operator) {
          // Handle complex filters like { operator: '>=', value: 100 }
          query = query.where(key, value.operator, value.value);
        } else {
          query = query.where(key, value);
        }
      }
    });

    return query;
  }

  /**
   * Apply joins to a query builder
   * @private
   */
  private _applyIncludes(query: Knex.QueryBuilder, includes: JoinOptions[]): Knex.QueryBuilder {
    includes.forEach(include => {
      // Complex join with custom conditions
      const { table, as, on, type = 'left' } = include;
      const tableName = `${table}${as ? ` as ${as}` : ''}`;
      
      // Split the 'on' condition into left and right parts
      // Example: "users.id = assignments.user_id"
      const onParts = on.split('=').map(part => part.trim());
      
      if (type === 'left') {
        query = query.leftJoin(tableName, onParts[0], onParts[1]);
      } else if (type === 'inner') {
        query = query.innerJoin(tableName, onParts[0], onParts[1]);
      }
    });

    return query;
  }

  // Lifecycle hooks (optional for subclasses to override)
  protected async afterCreate?(record: T, options: QueryOptions): Promise<void>;
  protected async afterUpdate?(record: T, oldRecord: T, options: QueryOptions): Promise<void>;
  protected async beforeDelete?(record: T, options: QueryOptions): Promise<void>;
  protected async afterDelete?(record: T, options: QueryOptions): Promise<void>;
}

// Default export for backward compatibility
export default BaseService;