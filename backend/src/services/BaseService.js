/**
 * BaseService - Foundation service class for centralized business logic
 * 
 * This class provides common CRUD operations, transaction support, and
 * error handling patterns that can be extended by specific service implementations.
 * It follows the Repository pattern and integrates with Knex.js for database operations.
 */

const { asyncHandler } = require('../middleware/errorHandling');

class BaseService {
  /**
   * Constructor for BaseService
   * @param {string} tableName - Primary table name for this service
   * @param {Object} db - Knex database instance
   * @param {Object} options - Service configuration options
   */
  constructor(tableName, db, options = {}) {
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
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @returns {Object|null} Record or null if not found
   */
  async findById(id, options = {}) {
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
      
      return record;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by id ${id}:`, error);
      throw new Error(`Failed to find ${this.tableName.slice(0, -1)}: ${error.message}`);
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {Object} options - Creation options
   * @returns {Object} Created record
   */
  async create(data, options = {}) {
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
      
      return record;
    } catch (error) {
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
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Object} Updated record
   */
  async update(id, data, options = {}) {
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
      
      const [record] = await trx(this.tableName)
        .where('id', id)
        .update(updateData)
        .returning('*');
      
      // Handle post-update hooks
      if (this.afterUpdate) {
        await this.afterUpdate(record, existingRecord, options);
      }
      
      return record;
    } catch (error) {
      console.error(`Error updating ${this.tableName} record ${id}:`, error);
      throw new Error(`Failed to update ${this.tableName.slice(0, -1)}: ${error.message}`);
    }
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   */
  async delete(id, options = {}) {
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
      throw new Error(`Failed to delete ${this.tableName.slice(0, -1)}: ${error.message}`);
    }
  }

  /**
   * Find records with pagination and filtering
   * @param {Object} filters - Query filters
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @param {Object} options - Query options
   * @returns {Object} Paginated results
   */
  async findWithPagination(filters = {}, page = 1, limit = null, options = {}) {
    try {
      // Validate and set pagination parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.min(
        this.options.maxLimit,
        Math.max(1, parseInt(limit) || this.options.defaultLimit)
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
      const orderBy = options.orderBy || this.options.defaultOrderBy;
      const orderDirection = options.orderDirection || this.options.defaultOrderDirection;
      query = query.orderBy(orderBy, orderDirection);

      // Apply pagination
      query = query.limit(validatedLimit).offset(offset);

      // Execute queries in parallel
      const [records, countResult] = await Promise.all([
        query,
        countQuery.count('* as total').first()
      ]);

      const total = parseInt(countResult.total);
      const totalPages = Math.ceil(total / validatedLimit);

      return {
        data: records,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          totalPages,
          hasNextPage: validatedPage < totalPages,
          hasPreviousPage: validatedPage > 1
        }
      };
    } catch (error) {
      console.error(`Error finding ${this.tableName} with pagination:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Find records with custom conditions
   * @param {Object} conditions - Query conditions
   * @param {Object} options - Query options
   * @returns {Array} Matching records
   */
  async findWhere(conditions, options = {}) {
    try {
      let query = this.db(this.tableName).where(conditions);

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

      return await query;
    } catch (error) {
      console.error(`Error finding ${this.tableName} with conditions:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Bulk create records
   * @param {Array} records - Array of record data
   * @param {Object} options - Creation options
   * @returns {Array} Created records
   */
  async bulkCreate(records, options = {}) {
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

      return createdRecords;
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName} records:`, error);
      throw new Error(`Failed to bulk create ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Execute operations within a transaction
   * @param {Function} callback - Transaction callback
   * @returns {*} Transaction result
   */
  async withTransaction(callback) {
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
   * @param {Object} query - Knex query builder
   * @param {Object} filters - Filter conditions
   * @returns {Object} Modified query builder
   */
  _applyFilters(query, filters) {
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.whereIn(key, value);
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
   * @param {Object} query - Knex query builder
   * @param {Array} includes - Include definitions
   * @returns {Object} Modified query builder
   */
  _applyIncludes(query, includes) {
    includes.forEach(include => {
      if (typeof include === 'string') {
        // Simple join: 'users'
        query = query.leftJoin(include, `${this.tableName}.${include.slice(0, -1)}_id`, `${include}.id`);
      } else if (typeof include === 'object') {
        // Complex join with custom conditions
        const { table, as, on, type = 'left' } = include;
        if (type === 'left') {
          query = query.leftJoin(`${table} as ${as || table}`, on);
        } else if (type === 'inner') {
          query = query.innerJoin(`${table} as ${as || table}`, on);
        }
      }
    });

    return query;
  }
}

module.exports = BaseService;