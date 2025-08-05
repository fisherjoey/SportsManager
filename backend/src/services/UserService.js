/**
 * UserService - User and referee management service
 * 
 * This service extends BaseService to provide specialized user and referee
 * management operations, including role-based queries, availability updates,
 * and referee-specific data handling.
 */

const BaseService = require('./BaseService');
const bcrypt = require('bcryptjs');

class UserService extends BaseService {
  constructor(db) {
    super('users', db, {
      defaultOrderBy: 'name',
      defaultOrderDirection: 'asc',
      enableAuditTrail: true
    });
  }

  /**
   * Find users by role with optional filters
   * @param {string} role - User role ('referee', 'admin', 'assignor')
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   * @returns {Array} Users matching the role and filters
   */
  async findByRole(role, filters = {}, options = {}) {
    try {
      const conditions = { role, ...filters };
      
      // For referees, include referee level information and roles
      if (role === 'referee') {
        options.include = options.include || [];
        options.include.push({
          table: 'referee_levels',
          on: 'users.referee_level_id = referee_levels.id',
          type: 'left'
        });
        
        // Add referee-specific select fields
        if (!options.select) {
          options.select = [
            'users.*',
            'referee_levels.name as level_name',
            'referee_levels.allowed_divisions',
            'referee_levels.min_experience_years'
          ];
        }
      }
      
      const users = await this.findWhere(conditions, options);
      
      // For referees, enhance with white whistle display logic and roles
      if (role === 'referee') {
        return await Promise.all(users.map(user => this.enhanceRefereeData(user)));
      }
      
      return users;
    } catch (error) {
      console.error(`Error finding users by role ${role}:`, error);
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }

  /**
   * Update user availability status
   * @param {string} userId - User ID
   * @param {boolean} isAvailable - Availability status
   * @param {Object} options - Update options
   * @returns {Object} Updated user record
   */
  async updateAvailability(userId, isAvailable, options = {}) {
    try {
      // Validate that user exists and is a referee
      const user = await this.findById(userId, { select: ['id', 'role'] });
      
      if (user.role !== 'referee') {
        throw new Error('Only referees can have their availability updated');
      }
      
      const updatedUser = await this.update(userId, { 
        is_available: isAvailable,
        availability_updated_at: new Date()
      }, options);
      
      // Log availability change for audit purposes
      if (this.options.enableAuditTrail) {
        console.log(`User ${userId} availability changed to: ${isAvailable}`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error(`Error updating availability for user ${userId}:`, error);
      throw new Error(`Failed to update user availability: ${error.message}`);
    }
  }

  /**
   * Get user with complete referee details including assignments
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} User with referee details
   */
  async getUserWithRefereeDetails(userId, options = {}) {
    try {
      // Get user with referee level information
      const user = await this.db('users')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'users.*',
          'referee_levels.name as level_name',
          'referee_levels.allowed_divisions',
          'referee_levels.min_experience_years',
          'referee_levels.wage_amount as level_pay_rate'
        )
        .where('users.id', userId)
        .first();

      if (!user) {
        throw new Error(`User not found with id: ${userId}`);
      }

      // If user is a referee, get additional referee-specific data
      if (user.role === 'referee') {
        // Enhance with white whistle display logic and roles
        await this.enhanceRefereeData(user);

        // Get recent assignments
        const recentAssignments = await this.db('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .join('teams as home_teams', 'games.home_team_id', 'home_teams.id')
          .join('teams as away_teams', 'games.away_team_id', 'away_teams.id')
          .join('positions', 'game_assignments.position_id', 'positions.id')
          .select(
            'game_assignments.*',
            'games.game_date',
            'games.game_time',
            'games.location',
            'games.level',
            'home_teams.name as home_team_name',
            'away_teams.name as away_team_name',
            'positions.name as position_name'
          )
          .where('game_assignments.user_id', userId)
          .orderBy('games.game_date', 'desc')
          .limit(options.assignmentLimit || 10);

        // Get assignment statistics
        const assignmentStats = await this.db('game_assignments')
          .join('games', 'game_assignments.game_id', 'games.id')
          .select(
            this.db.raw('COUNT(*) as total_assignments'),
            this.db.raw('COUNT(CASE WHEN game_assignments.status = \'accepted\' THEN 1 END) as accepted_assignments'),
            this.db.raw('COUNT(CASE WHEN game_assignments.status = \'declined\' THEN 1 END) as declined_assignments'),
            this.db.raw('COUNT(CASE WHEN game_assignments.status = \'completed\' THEN 1 END) as completed_assignments'),
            this.db.raw('SUM(game_assignments.calculated_wage) as total_earnings')
          )
          .where('game_assignments.user_id', userId)
          .first();

        // Add referee-specific data to user object
        user.recent_assignments = recentAssignments;
        user.assignment_stats = {
          total: parseInt(assignmentStats.total_assignments) || 0,
          accepted: parseInt(assignmentStats.accepted_assignments) || 0,
          declined: parseInt(assignmentStats.declined_assignments) || 0,
          completed: parseInt(assignmentStats.completed_assignments) || 0,
          total_earnings: parseFloat(assignmentStats.total_earnings) || 0
        };
      }

      return user;
    } catch (error) {
      console.error(`Error getting user with referee details ${userId}:`, error);
      throw new Error(`Failed to get user details: ${error.message}`);
    }
  }

  /**
   * Bulk update multiple users efficiently
   * @param {Array} updates - Array of update objects { id, data }
   * @param {Object} options - Update options
   * @returns {Object} Update results
   */
  async bulkUpdateUsers(updates, options = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and cannot be empty');
    }

    if (updates.length > 100) {
      throw new Error('Bulk update limited to 100 users at once');
    }

    return await this.withTransaction(async (trx) => {
      const results = {
        successful: [],
        failed: [],
        total: updates.length
      };

      for (const update of updates) {
        try {
          const { id, data } = update;
          
          if (!id || !data) {
            results.failed.push({
              id,
              error: 'Missing id or data in update object'
            });
            continue;
          }

          // Validate user exists
          const existingUser = await trx('users').where('id', id).first();
          if (!existingUser) {
            results.failed.push({
              id,
              error: 'User not found'
            });
            continue;
          }

          // Perform update
          const updatedUser = await this.update(id, data, { transaction: trx });
          results.successful.push({
            id,
            user: updatedUser
          });

        } catch (error) {
          console.error(`Error updating user ${update.id}:`, error);
          results.failed.push({
            id: update.id,
            error: error.message
          });
        }
      }

      return results;
    });
  }

  /**
   * Create a new referee with proper defaults
   * @param {Object} refereeData - Referee data
   * @param {Object} options - Creation options
   * @returns {Object} Created referee
   */
  async createReferee(refereeData, options = {}) {
    try {
      // Validate required referee fields
      if (!refereeData.name || !refereeData.email || !refereeData.postal_code) {
        throw new Error('Name, email, and postal_code are required for referee creation');
      }

      // Check if email already exists
      const existingUser = await this.findWhere({ email: refereeData.email });
      if (existingUser.length > 0) {
        throw new Error('Email already exists');
      }

      // Set referee defaults
      const refereeWithDefaults = {
        role: 'referee',
        is_available: true,
        max_distance: 25,
        wage_per_game: 0,
        availability_strategy: 'WHITELIST',
        ...refereeData,
        // Hash password if provided, otherwise set a temporary one
        password_hash: refereeData.password 
          ? await bcrypt.hash(refereeData.password, 12)
          : await bcrypt.hash(`temp_password_${  Date.now()}`, 12)
      };

      // Remove plain password from data
      delete refereeWithDefaults.password;

      const referee = await this.create(refereeWithDefaults, options);
      
      // Remove password hash from returned object
      delete referee.password_hash;
      
      return referee;
    } catch (error) {
      console.error('Error creating referee:', error);
      throw new Error(`Failed to create referee: ${error.message}`);
    }
  }

  /**
   * Find available referees for a specific date/time
   * @param {string} gameDate - Game date (YYYY-MM-DD)
   * @param {string} gameTime - Game time (HH:MM)
   * @param {Object} options - Query options
   * @returns {Array} Available referees
   */
  async findAvailableReferees(gameDate, gameTime, options = {}) {
    try {
      const { level, maxDistance, location } = options;

      let query = this.db('users')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'users.*',
          'referee_levels.name as level_name',
          'referee_levels.allowed_divisions'
        )
        .where('users.role', 'referee')
        .where('users.is_available', true)
        .whereNotExists(function() {
          this.select('*')
            .from('game_assignments')
            .join('games', 'game_assignments.game_id', 'games.id')
            .whereRaw('game_assignments.user_id = users.id')
            .where('games.game_date', gameDate)
            .where('games.game_time', gameTime)
            .whereIn('game_assignments.status', ['pending', 'accepted']);
        });

      // Filter by level if specified
      if (level) {
        query = query.whereRaw(
          `referee_levels.allowed_divisions IS NULL OR 
           JSON_SEARCH(referee_levels.allowed_divisions, 'one', ?) IS NOT NULL`,
          [level]
        );
      }

      // Filter by maximum distance if location provided
      if (maxDistance && location) {
        query = query.where('users.max_distance', '>=', maxDistance);
      }

      const availableReferees = await query.orderBy('users.name', 'asc');

      return availableReferees;
    } catch (error) {
      console.error(`Error finding available referees for ${gameDate} ${gameTime}:`, error);
      throw new Error(`Failed to find available referees: ${error.message}`);
    }
  }

  /**
   * Enhance referee data with white whistle display logic and roles
   * @param {Object} user - User object to enhance
   * @returns {Object} Enhanced user object
   */
  async enhanceRefereeData(user) {
    try {
      // Determine white whistle display based on level and individual flag
      user.should_display_white_whistle = this.shouldDisplayWhiteWhistle(
        user.new_referee_level || user.level_name,
        user.is_white_whistle
      );

      // Get referee roles for this user
      const refereeRoles = await this.db('user_referee_roles')
        .join('referee_roles', 'user_referee_roles.referee_role_id', 'referee_roles.id')
        .select(
          'referee_roles.name',
          'referee_roles.description',
          'referee_roles.permissions',
          'user_referee_roles.assigned_at',
          'user_referee_roles.is_active'
        )
        .where('user_referee_roles.user_id', user.id)
        .where('user_referee_roles.is_active', true)
        .where('referee_roles.is_active', true);

      user.referee_roles = refereeRoles;
      
      // Add computed fields for easier access
      user.role_names = refereeRoles.map(role => role.name);
      user.can_evaluate = refereeRoles.some(role => {
        const permissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;
        return permissions.can_evaluate;
      });
      user.can_mentor = refereeRoles.some(role => {
        const permissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;
        return permissions.can_mentor;
      });

      return user;
    } catch (error) {
      console.error(`Error enhancing referee data for user ${user.id}:`, error);
      // Return user without enhancement rather than failing
      user.should_display_white_whistle = false;
      user.referee_roles = [];
      user.role_names = [];
      user.can_evaluate = false;
      user.can_mentor = false;
      return user;
    }
  }

  /**
   * Determine if white whistle should be displayed based on CLAUDE.md specifications
   * @param {string} level - Referee level (Rookie, Junior, Senior)
   * @param {boolean} isWhiteWhistle - Individual white whistle flag
   * @returns {boolean} Whether to display white whistle icon
   */
  shouldDisplayWhiteWhistle(level, isWhiteWhistle) {
    if (!level) {
      return false;
    }

    switch (level.toLowerCase()) {
    case 'rookie':
      return true; // Rookies always display white whistle
    case 'junior':
      return Boolean(isWhiteWhistle); // Conditionally based on flag
    case 'senior':
      return false; // Seniors never display white whistle
    default:
      return false;
    }
  }

  /**
   * Update referee level and white whistle status
   * @param {string} userId - User ID
   * @param {string} newLevel - New referee level (Rookie, Junior, Senior)
   * @param {boolean} isWhiteWhistle - White whistle flag (only applies to Junior level)
   * @returns {Object} Updated user
   */
  async updateRefereeLevel(userId, newLevel, isWhiteWhistle = null) {
    try {
      // Validate level
      const validLevels = ['Rookie', 'Junior', 'Senior'];
      if (!validLevels.includes(newLevel)) {
        throw new Error(`Invalid referee level: ${newLevel}. Must be one of: ${validLevels.join(', ')}`);
      }

      // Get the referee level record
      const refereeLevel = await this.db('referee_levels')
        .where('name', newLevel)
        .first();

      if (!refereeLevel) {
        throw new Error(`Referee level '${newLevel}' not found in database`);
      }

      // Determine white whistle status based on level
      let finalWhiteWhistleStatus;
      switch (newLevel) {
      case 'Rookie':
        finalWhiteWhistleStatus = true; // Always true for Rookie
        break;
      case 'Junior':
        finalWhiteWhistleStatus = isWhiteWhistle !== null ? isWhiteWhistle : false;
        break;
      case 'Senior':
        finalWhiteWhistleStatus = false; // Always false for Senior
        break;
      }

      // Update user record
      const updatedUser = await this.update(userId, {
        new_referee_level: newLevel,
        referee_level_id: refereeLevel.id,
        is_white_whistle: finalWhiteWhistleStatus
      });

      return updatedUser;
    } catch (error) {
      console.error(`Error updating referee level for user ${userId}:`, error);
      throw new Error(`Failed to update referee level: ${error.message}`);
    }
  }

  /**
   * Assign role to referee
   * @param {string} userId - User ID
   * @param {string} roleName - Role name to assign
   * @param {string} assignedBy - ID of admin assigning the role
   * @returns {Object} Assignment result
   */
  async assignRefereeRole(userId, roleName, assignedBy) {
    try {
      // Verify user is a referee
      const user = await this.findById(userId, { select: ['id', 'role'] });
      if (!user || user.role !== 'referee') {
        throw new Error('User is not a referee');
      }

      // Get the role
      const role = await this.db('referee_roles')
        .where('name', roleName)
        .where('is_active', true)
        .first();

      if (!role) {
        throw new Error(`Role '${roleName}' not found or inactive`);
      }

      // Check if already assigned
      const existingAssignment = await this.db('user_referee_roles')
        .where('user_id', userId)
        .where('referee_role_id', role.id)
        .where('is_active', true)
        .first();

      if (existingAssignment) {
        throw new Error(`User already has role '${roleName}'`);
      }

      // Assign role
      const assignment = await this.db('user_referee_roles').insert({
        id: this.db.raw('gen_random_uuid()'),
        user_id: userId,
        referee_role_id: role.id,
        assigned_by: assignedBy,
        assigned_at: new Date(),
        is_active: true
      }).returning('*');

      return assignment[0];
    } catch (error) {
      console.error(`Error assigning role ${roleName} to user ${userId}:`, error);
      throw new Error(`Failed to assign role: ${error.message}`);
    }
  }

  /**
   * Remove role from referee
   * @param {string} userId - User ID
   * @param {string} roleName - Role name to remove
   * @returns {boolean} Success status
   */
  async removeRefereeRole(userId, roleName) {
    try {
      // Get the role
      const role = await this.db('referee_roles')
        .where('name', roleName)
        .first();

      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Deactivate assignment
      const result = await this.db('user_referee_roles')
        .where('user_id', userId)
        .where('referee_role_id', role.id)
        .update({ is_active: false });

      return result > 0;
    } catch (error) {
      console.error(`Error removing role ${roleName} from user ${userId}:`, error);
      throw new Error(`Failed to remove role: ${error.message}`);
    }
  }

  /**
   * Hook called after user creation
   * @param {Object} user - Created user
   * @param {Object} options - Creation options
   */
  async afterCreate(user, options) {
    if (this.options.enableAuditTrail) {
      console.log(`User created: ${user.id} (${user.role})`);
    }
    
    // If creating a referee, assign default role
    if (user.role === 'referee') {
      try {
        await this.assignRefereeRole(user.id, 'Referee', null);
      } catch (error) {
        console.warn(`Failed to assign default role to new referee ${user.id}:`, error.message);
      }
    }
  }

  /**
   * Hook called after user update
   * @param {Object} user - Updated user
   * @param {Object} previousUser - Previous user state
   * @param {Object} options - Update options
   */
  async afterUpdate(user, previousUser, options) {
    if (this.options.enableAuditTrail) {
      const changes = this._getChangedFields(previousUser, user);
      if (changes.length > 0) {
        console.log(`User updated: ${user.id}, changed fields: ${changes.join(', ')}`);
      }
    }
  }

  /**
   * Get changed fields between two user objects
   * @private
   * @param {Object} before - Previous state
   * @param {Object} after - Current state
   * @returns {Array} Changed field names
   */
  _getChangedFields(before, after) {
    const changes = [];
    const fields = ['name', 'email', 'phone', 'is_available', 'wage_per_game', 'max_distance'];
    
    fields.forEach(field => {
      if (before[field] !== after[field]) {
        changes.push(field);
      }
    });
    
    return changes;
  }
}

module.exports = UserService;