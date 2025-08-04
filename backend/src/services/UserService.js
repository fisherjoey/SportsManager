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
      
      // For referees, include referee level information
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
      
      return await this.findWhere(conditions, options);
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
          'referee_levels.pay_rate as level_pay_rate'
        )
        .where('users.id', userId)
        .first();

      if (!user) {
        throw new Error(`User not found with id: ${userId}`);
      }

      // If user is a referee, get additional referee-specific data
      if (user.role === 'referee') {
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
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'accepted' THEN 1 END) as accepted_assignments"),
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'declined' THEN 1 END) as declined_assignments"),
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'completed' THEN 1 END) as completed_assignments"),
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
          : await bcrypt.hash('temp_password_' + Date.now(), 12)
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
   * Hook called after user creation
   * @param {Object} user - Created user
   * @param {Object} options - Creation options
   */
  async afterCreate(user, options) {
    if (this.options.enableAuditTrail) {
      console.log(`User created: ${user.id} (${user.role})`);
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

  /**
   * Determine if referee should display white whistle based on level and individual flag
   * @param {string} levelName - Referee level name ('Rookie', 'Junior', 'Senior')
   * @param {boolean} isWhiteWhistle - Individual white whistle flag
   * @returns {boolean} Whether to display white whistle
   */
  shouldDisplayWhiteWhistle(levelName, isWhiteWhistle) {
    switch (levelName) {
      case 'Rookie':
        return true; // Always display for Rookie
      case 'Junior':
        return Boolean(isWhiteWhistle); // Conditional based on individual flag
      case 'Senior':
        return false; // Never display for Senior
      default:
        return false; // Default to no white whistle for unknown levels
    }
  }

  /**
   * Get referee with enhanced details including white whistle display logic and roles
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Enhanced referee details
   */
  async getRefereeWithEnhancedDetails(userId, options = {}) {
    try {
      // Get user with referee level information
      const referee = await this.db('users')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'users.*',
          'referee_levels.name as level_name',
          'referee_levels.wage_amount as level_wage',
          'referee_levels.allowed_divisions',
          'referee_levels.description as level_description'
        )
        .where('users.id', userId)
        .first();

      if (!referee) {
        throw new Error(`User not found with id: ${userId}`);
      }

      // Get user roles
      const roles = await this.db('referee_roles')
        .join('user_roles', 'referee_roles.id', 'user_roles.role_id')
        .select('referee_roles.name', 'referee_roles.description')
        .where('user_roles.user_id', userId)
        .where('referee_roles.is_active', true);

      // Add white whistle display logic
      referee.should_display_white_whistle = this.shouldDisplayWhiteWhistle(
        referee.level_name, 
        referee.is_white_whistle
      );

      // Add roles array
      referee.roles = roles.map(role => role.name);
      referee.role_details = roles;

      // If user is a referee, get additional referee-specific data
      if (referee.role === 'referee') {
        // Get recent assignments with enhanced details
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
            'games.game_type',
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
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'accepted' THEN 1 END) as accepted_assignments"),
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'declined' THEN 1 END) as declined_assignments"),
            this.db.raw("COUNT(CASE WHEN game_assignments.status = 'completed' THEN 1 END) as completed_assignments"),
            this.db.raw('SUM(game_assignments.calculated_wage) as total_earnings'),
            this.db.raw('AVG(game_assignments.calculated_wage) as avg_wage_per_game')
          )
          .where('game_assignments.user_id', userId)
          .first();

        // Add referee-specific data to user object
        referee.recent_assignments = recentAssignments;
        referee.assignment_stats = {
          total: parseInt(assignmentStats.total_assignments) || 0,
          accepted: parseInt(assignmentStats.accepted_assignments) || 0,
          declined: parseInt(assignmentStats.declined_assignments) || 0,
          completed: parseInt(assignmentStats.completed_assignments) || 0,
          total_earnings: parseFloat(assignmentStats.total_earnings) || 0,
          avg_wage_per_game: parseFloat(assignmentStats.avg_wage_per_game) || 0
        };
      }

      return referee;
    } catch (error) {
      console.error(`Error getting enhanced referee details ${userId}:`, error);
      throw new Error(`Failed to get enhanced referee details: ${error.message}`);
    }
  }

  /**
   * Find all referees with enhanced details including white whistle display and roles
   * @param {Object} filters - Filters to apply
   * @param {Object} options - Query options
   * @returns {Array} Enhanced referee list
   */
  async findRefereesWithEnhancedDetails(filters = {}, options = {}) {
    try {
      let query = this.db('users')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'users.id',
          'users.name',
          'users.email',
          'users.phone',
          'users.is_available',
          'users.is_white_whistle',
          'users.postal_code',
          'users.max_distance',
          'users.location',
          'users.notes',
          'referee_levels.name as level_name',
          'referee_levels.wage_amount as level_wage'
        )
        .where('users.role', 'referee');

      // Apply filters
      if (filters.level) {
        query = query.where('referee_levels.name', filters.level);
      }
      if (filters.is_available !== undefined) {
        query = query.where('users.is_available', filters.is_available);
      }
      if (filters.location) {
        query = query.where('users.location', 'ilike', `%${filters.location}%`);
      }

      // Apply ordering
      query = query.orderBy(options.orderBy || 'users.name', options.orderDirection || 'asc');

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const referees = await query;

      // Enhance each referee with white whistle logic and roles
      const enhancedReferees = await Promise.all(
        referees.map(async (referee) => {
          // Add white whistle display logic
          referee.should_display_white_whistle = this.shouldDisplayWhiteWhistle(
            referee.level_name,
            referee.is_white_whistle
          );

          // Get roles for this referee
          const roles = await this.db('referee_roles')
            .join('user_roles', 'referee_roles.id', 'user_roles.role_id')
            .select('referee_roles.name')
            .where('user_roles.user_id', referee.id)
            .where('referee_roles.is_active', true);

          referee.roles = roles.map(role => role.name);

          return referee;
        })
      );

      return enhancedReferees;
    } catch (error) {
      console.error('Error finding referees with enhanced details:', error);
      throw new Error(`Failed to find referees: ${error.message}`);
    }
  }
}

module.exports = UserService;