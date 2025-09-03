/**
 * UserService - User and referee management service (JavaScript compatibility bridge)
 * 
 * This compatibility layer delegates all operations to the TypeScript implementation
 * while maintaining backward compatibility for JavaScript consumers.
 */

// Import the compiled TypeScript implementation
const { UserService: TypeScriptUserService } = require('../../dist/services/UserService');

/**
 * JavaScript compatibility wrapper for UserService
 * Delegates all operations to the TypeScript implementation
 */
class UserService {
  constructor(db) {
    // Create an instance of the TypeScript UserService
    this._tsService = new TypeScriptUserService(db);
    
    // Expose the database instance for backward compatibility
    this.db = db;
    this.options = this._tsService.options;
    this.tableName = this._tsService.tableName;
  }

  // Delegate all methods to TypeScript implementation
  
  /**
   * Find users by role with optional filters
   * @param {string} role - User role ('referee', 'admin', 'assignor')
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Array} Users matching the role and filters
   */
  async findByRole(role, filters = {}, options = {}) {
    return await this._tsService.findByRole(role, filters, options);
  }

  /**
   * Update user availability status
   * @param {string} userId - User ID
   * @param {boolean} isAvailable - Availability status
   * @param {Object} options - Update options
   * @returns {Object} Updated user record
   */
  async updateAvailability(userId, isAvailable, options = {}) {
    return await this._tsService.updateAvailability(userId, isAvailable, options);
  }

  /**
   * Get user roles from the new RBAC system
   * @param {string} userId - User ID
   * @returns {Array} Array of role objects with enhanced data
   */
  async getUserRoles(userId) {
    return await this._tsService.getUserRoles(userId);
  }

  /**
   * Enhance user data with new roles and referee profile
   * @param {Object} user - User object
   * @returns {Object} User with roles array and referee data
   */
  async enhanceUserWithRoles(user) {
    return await this._tsService.enhanceUserWithRoles(user);
  }

  /**
   * Get user with complete referee details including assignments
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} User with referee details
   */
  async getUserWithRefereeDetails(userId, options = {}) {
    return await this._tsService.getUserWithRefereeDetails(userId, options);
  }

  /**
   * Bulk update multiple users efficiently
   * @param {Array} updates - Array of update objects { id, data }
   * @param {Object} options - Update options
   * @returns {Object} Update results
   */
  async bulkUpdateUsers(updates, options = {}) {
    return await this._tsService.bulkUpdateUsers(updates, options);
  }

  /**
   * Create a new referee with proper defaults
   * @param {Object} refereeData - Referee data
   * @param {Object} options - Creation options
   * @returns {Object} Created referee
   */
  async createReferee(refereeData, options = {}) {
    return await this._tsService.createReferee(refereeData, options);
  }

  /**
   * Find available referees for a specific date/time
   * @param {string} gameDate - Game date (YYYY-MM-DD)
   * @param {string} gameTime - Game time (HH:MM)
   * @param {Object} options - Query options
   * @returns {Array} Available referees
   */
  async findAvailableReferees(gameDate, gameTime, options = {}) {
    return await this._tsService.findAvailableReferees(gameDate, gameTime, options);
  }

  /**
   * Enhance referee data with white whistle display logic and roles
   * @param {Object} user - User object to enhance
   * @returns {Object} Enhanced user object
   */
  async enhanceRefereeData(user) {
    return await this._tsService.enhanceRefereeData(user);
  }

  /**
   * Determine if white whistle should be displayed
   * @param {string} level - Referee level (Rookie, Junior, Senior)
   * @param {boolean} isWhiteWhistle - Individual white whistle flag
   * @returns {boolean} Whether to display white whistle icon
   */
  shouldDisplayWhiteWhistle(level, isWhiteWhistle) {
    return this._tsService.shouldDisplayWhiteWhistle(level, isWhiteWhistle);
  }

  /**
   * Update referee level and white whistle status
   * @param {string} userId - User ID
   * @param {string} newLevel - New referee level (Rookie, Junior, Senior)
   * @param {boolean} isWhiteWhistle - White whistle flag (only applies to Junior level)
   * @returns {Object} Updated user
   */
  async updateRefereeLevel(userId, newLevel, isWhiteWhistle = null) {
    return await this._tsService.updateRefereeLevel(userId, newLevel, isWhiteWhistle);
  }

  /**
   * Assign role to referee
   * @param {string} userId - User ID
   * @param {string} roleName - Role name to assign
   * @param {string} assignedBy - ID of admin assigning the role
   * @returns {Object} Assignment result
   */
  async assignRefereeRole(userId, roleName, assignedBy) {
    return await this._tsService.assignRefereeRole(userId, roleName, assignedBy);
  }

  /**
   * Remove role from referee
   * @param {string} userId - User ID
   * @param {string} roleName - Role name to remove
   * @returns {boolean} Success status
   */
  async removeRefereeRole(userId, roleName) {
    return await this._tsService.removeRefereeRole(userId, roleName);
  }

  // Delegate BaseService methods
  async findById(id, options = {}) {
    return await this._tsService.findById(id, options);
  }

  async create(data, options = {}) {
    return await this._tsService.create(data, options);
  }

  async update(id, data, options = {}) {
    return await this._tsService.update(id, data, options);
  }

  async delete(id, options = {}) {
    return await this._tsService.delete(id, options);
  }

  async findWithPagination(filters = {}, page = 1, limit = null, options = {}) {
    return await this._tsService.findWithPagination(filters, page, limit, options);
  }

  async findWhere(conditions, options = {}) {
    return await this._tsService.findWhere(conditions, options);
  }

  async bulkCreate(records, options = {}) {
    return await this._tsService.bulkCreate(records, options);
  }

  async withTransaction(callback) {
    return await this._tsService.withTransaction(callback);
  }

  // Lifecycle hook delegations (these are called by BaseService)
  async afterCreate(user, options) {
    // These hooks are implemented in the TypeScript version
    // but we need to forward them if called directly
    return this._tsService.afterCreate && this._tsService.afterCreate(user, options);
  }

  async afterUpdate(user, previousUser, options) {
    return this._tsService.afterUpdate && this._tsService.afterUpdate(user, previousUser, options);
  }
}

module.exports = UserService;