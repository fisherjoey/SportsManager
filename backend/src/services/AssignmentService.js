/**
 * AssignmentService - Assignment operations service
 * 
 * This service extends BaseService to provide specialized assignment management
 * operations, including conflict checking, bulk operations, and game status updates.
 * It integrates with the conflict detection service and wage calculation utilities.
 */

const BaseService = require('./BaseService');
const { checkAssignmentConflicts } = require('./conflictDetectionService');
const { calculateFinalWage, getWageBreakdown } = require('../utils/wage-calculator');
const { getOrganizationSettings } = require('../utils/organization-settings');

class AssignmentService extends BaseService {
  constructor(db) {
    super('game_assignments', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true
    });
  }

  /**
   * Create a new assignment with comprehensive conflict checking
   * @param {Object} assignmentData - Assignment data
   * @param {Object} options - Creation options
   * @returns {Object} Created assignment with wage breakdown
   */
  async createAssignment(assignmentData, options = {}) {
    return await this.withTransaction(async (trx) => {
      try {
        const { game_id, user_id, position_id, assigned_by } = assignmentData;

        // Validate required fields
        if (!game_id || !user_id || !position_id) {
          throw new Error('game_id, user_id, and position_id are required');
        }

        // Check if game exists
        const game = await trx('games').where('id', game_id).first();
        if (!game) {
          throw new Error('Game not found');
        }

        // Check if referee exists and is available
        const referee = await trx('users')
          .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
          .select(
            'users.*',
            'referee_levels.name as level_name',
            'referee_levels.allowed_divisions'
          )
          .where('users.id', user_id)
          .where('users.role', 'referee')
          .first();

        if (!referee) {
          throw new Error('Referee not found or not active');
        }

        // Check if position exists
        const position = await trx('positions').where('id', position_id).first();
        if (!position) {
          throw new Error('Position not found');
        }

        // Check for existing assignments
        const existingPositionAssignment = await trx('game_assignments')
          .where('game_id', game_id)
          .where('position_id', position_id)
          .whereIn('status', ['pending', 'accepted'])
          .first();

        if (existingPositionAssignment) {
          throw new Error('Position already filled for this game');
        }

        const existingRefereeAssignment = await trx('game_assignments')
          .where('game_id', game_id)
          .where('user_id', user_id)
          .whereIn('status', ['pending', 'accepted'])
          .first();

        if (existingRefereeAssignment) {
          throw new Error('Referee already assigned to this game');
        }

        // Check if game has reached maximum referees
        const currentAssignments = await trx('game_assignments')
          .where('game_id', game_id)
          .whereIn('status', ['pending', 'accepted'])
          .count('* as count')
          .first();

        if (parseInt(currentAssignments.count) >= game.refs_needed) {
          throw new Error('Game has reached maximum number of referees');
        }

        // Run comprehensive conflict detection
        const conflictAnalysis = await checkAssignmentConflicts(assignmentData);

        if (conflictAnalysis.hasConflicts) {
          throw new Error(`Assignment conflicts detected: ${conflictAnalysis.errors.join(', ')}`);
        }

        // Get organization settings for wage calculation
        const orgSettings = await getOrganizationSettings();
        const assignedRefereesCount = parseInt(currentAssignments.count) + 1;

        // Calculate final wage
        const finalWage = calculateFinalWage(
          referee.wage_per_game || game.pay_rate,
          game.wage_multiplier || 1.0,
          orgSettings.payment_model || 'INDIVIDUAL',
          orgSettings.default_game_rate || 0,
          assignedRefereesCount
        );

        // Create assignment
        const assignmentRecord = {
          game_id,
          user_id,
          position_id,
          assigned_by,
          status: 'pending',
          assigned_at: new Date(),
          calculated_wage: finalWage
        };

        const assignment = await this.create(assignmentRecord, { transaction: trx });

        // Get wage breakdown for response
        const wageBreakdown = getWageBreakdown(
          referee.wage_per_game || game.pay_rate,
          game.wage_multiplier || 1.0,
          game.wage_multiplier_reason || '',
          orgSettings.payment_model || 'INDIVIDUAL',
          orgSettings.default_game_rate || 0,
          assignedRefereesCount
        );

        // Update game status
        await this._updateGameStatus(game_id, trx);

        return {
          assignment,
          wageBreakdown,
          warnings: conflictAnalysis.warnings || []
        };

      } catch (error) {
        console.error('Error creating assignment:', error);
        throw error;
      }
    });
  }

  /**
   * Bulk update assignment statuses with game status updates
   * @param {Array} updates - Array of update objects
   * @param {Object} options - Update options
   * @returns {Object} Update results
   */
  async bulkUpdateAssignments(updates, options = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and cannot be empty');
    }

    if (updates.length > 100) {
      throw new Error('Maximum 100 assignments can be updated at once');
    }

    return await this.withTransaction(async (trx) => {
      const results = {
        updatedAssignments: [],
        updateErrors: [],
        summary: {
          totalSubmitted: updates.length,
          successfulUpdates: 0,
          failedUpdates: 0
        }
      };

      const affectedGameIds = new Set();

      for (const updateData of updates) {
        try {
          const { assignment_id, status, calculated_wage } = updateData;

          if (!assignment_id || !status) {
            results.updateErrors.push({
              assignmentId: assignment_id,
              error: 'Missing assignment_id or status'
            });
            continue;
          }

          // Validate status
          const validStatuses = ['pending', 'accepted', 'declined', 'completed'];
          if (!validStatuses.includes(status)) {
            results.updateErrors.push({
              assignmentId: assignment_id,
              error: 'Invalid status value'
            });
            continue;
          }

          // Check if assignment exists
          const existingAssignment = await trx('game_assignments')
            .where('id', assignment_id)
            .first();

          if (!existingAssignment) {
            results.updateErrors.push({
              assignmentId: assignment_id,
              error: 'Assignment not found'
            });
            continue;
          }

          // Prepare update data
          const updateFields = {
            status,
            updated_at: new Date()
          };

          if (calculated_wage !== undefined) {
            updateFields.calculated_wage = calculated_wage;
          }

          // Update assignment
          const updatedAssignment = await this.update(
            assignment_id, 
            updateFields, 
            { transaction: trx }
          );

          results.updatedAssignments.push(updatedAssignment);
          results.summary.successfulUpdates++;

          // Track affected games for status updates
          affectedGameIds.add(existingAssignment.game_id);

        } catch (error) {
          console.error(`Error updating assignment ${updateData.assignment_id}:`, error);
          results.updateErrors.push({
            assignmentId: updateData.assignment_id,
            error: error.message
          });
          results.summary.failedUpdates++;
        }
      }

      // Update game statuses for all affected games
      for (const gameId of affectedGameIds) {
        try {
          await this._updateGameStatus(gameId, trx);
        } catch (error) {
          console.error(`Error updating game status for game ${gameId}:`, error);
          // Don't fail the entire transaction for game status update errors
        }
      }

      if (results.summary.successfulUpdates === 0 && results.summary.failedUpdates > 0) {
        throw new Error('All assignment updates failed');
      }

      return results;
    });
  }

  /**
   * Update game status based on current assignment count
   * @param {string} gameId - Game ID
   * @param {Object} options - Update options
   * @returns {Object} Updated game status
   */
  async updateGameStatus(gameId, options = {}) {
    const trx = options.transaction || this.db;
    return await this._updateGameStatus(gameId, trx);
  }

  /**
   * Get assignments with enhanced data (game, referee, position details)
   * @param {Object} filters - Query filters 
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @param {Object} options - Query options
   * @returns {Object} Paginated assignment results
   */
  async getAssignmentsWithDetails(filters = {}, page = 1, limit = 50, options = {}) {
    try {
      const offset = (page - 1) * limit;

      // Build query with all necessary joins
      let query = this.db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('users', 'game_assignments.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .join('teams as home_team', 'games.home_team_id', 'home_team.id')
        .join('teams as away_team', 'games.away_team_id', 'away_team.id')
        .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
        .select(
          'game_assignments.*',
          'games.game_date',
          'games.game_time',
          'games.location',
          'games.level',
          'games.pay_rate',
          'games.wage_multiplier',
          'games.wage_multiplier_reason',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name',
          'users.name as referee_name',
          'users.email as referee_email',
          'positions.name as position_name',
          'referee_levels.name as referee_level'
        );

      // Apply filters
      if (filters.game_id) {
        query = query.where('game_assignments.game_id', filters.game_id);
      }
      if (filters.user_id) {
        query = query.where('game_assignments.user_id', filters.user_id);
      }
      if (filters.status) {
        query = query.where('game_assignments.status', filters.status);
      }
      if (filters.date_from) {
        query = query.where('games.game_date', '>=', filters.date_from);
      }
      if (filters.date_to) {
        query = query.where('games.game_date', '<=', filters.date_to);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count('* as total').first();
      
      // Apply pagination and ordering
      query = query
        .orderBy('games.game_date', 'asc')
        .limit(limit)
        .offset(offset);

      const [assignments, countResult] = await Promise.all([
        query,
        countQuery
      ]);

      const total = parseInt(countResult.total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };

    } catch (error) {
      console.error('Error getting assignments with details:', error);
      throw new Error(`Failed to get assignments: ${error.message}`);
    }
  }

  /**
   * Bulk remove assignments with game status updates
   * @param {Array} assignmentIds - Array of assignment IDs
   * @param {Object} options - Removal options
   * @returns {Object} Removal results
   */
  async bulkRemoveAssignments(assignmentIds, options = {}) {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      throw new Error('Assignment IDs array is required and cannot be empty');
    }

    if (assignmentIds.length > 100) {
      throw new Error('Maximum 100 assignments can be removed at once');
    }

    return await this.withTransaction(async (trx) => {
      try {
        // Get assignments before deletion for game status updates
        const assignmentsToDelete = await trx('game_assignments')
          .whereIn('id', assignmentIds)
          .select('id', 'game_id');

        if (assignmentsToDelete.length === 0) {
          return {
            deletedCount: 0,
            affectedGames: 0,
            warnings: ['No assignments found with provided IDs']
          };
        }

        // Get unique game IDs for status updates
        const gameIds = [...new Set(assignmentsToDelete.map(a => a.game_id))];

        // Delete assignments
        const deletedCount = await trx('game_assignments')
          .whereIn('id', assignmentIds)
          .del();

        // Update game statuses for affected games
        for (const gameId of gameIds) {
          await this._updateGameStatus(gameId, trx);
        }

        const notFoundIds = assignmentIds.filter(id => 
          !assignmentsToDelete.find(a => a.id === id)
        );

        return {
          deletedCount,
          affectedGames: gameIds.length,
          summary: {
            totalRequested: assignmentIds.length,
            successfullyDeleted: deletedCount,
            notFound: notFoundIds.length
          },
          warnings: notFoundIds.length > 0 ? ['Some assignment IDs were not found'] : []
        };

      } catch (error) {
        console.error('Error bulk removing assignments:', error);
        throw error;
      }
    });
  }

  /**
   * Get available referees for a specific game with conflict checking
   * @param {string} gameId - Game ID
   * @param {Object} options - Query options
   * @returns {Array} Available referees with availability analysis
   */
  async getAvailableRefereesForGame(gameId, options = {}) {
    try {
      const game = await this.db('games').where('id', gameId).first();
      if (!game) {
        throw new Error('Game not found');
      }

      // Get potential referees
      const potentialReferees = await this.db('users')
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
            .where('games.game_date', game.game_date)
            .where('games.game_time', game.game_time)
            .where('games.id', '!=', gameId)
            .whereIn('game_assignments.status', ['pending', 'accepted']);
        });

      // Analyze each referee for conflicts and qualifications
      const analyzedReferees = [];
      
      for (const referee of potentialReferees) {
        try {
          const assignmentData = {
            game_id: gameId,
            user_id: referee.id,
            position_id: 'dummy' // We're just checking conflicts, not assigning
          };

          const conflictAnalysis = await checkAssignmentConflicts(assignmentData);

          analyzedReferees.push({
            ...referee,
            availability_status: conflictAnalysis.hasConflicts ? 'conflict' : 'available',
            conflicts: conflictAnalysis.conflicts || [],
            warnings: conflictAnalysis.warnings || [],
            is_qualified: conflictAnalysis.isQualified !== false,
            can_assign: !conflictAnalysis.hasConflicts
          });

        } catch (error) {
          console.error(`Error analyzing referee ${referee.id} for game ${gameId}:`, error);
          analyzedReferees.push({
            ...referee,
            availability_status: 'error',
            conflicts: [],
            warnings: [`Analysis error: ${error.message}`],
            is_qualified: false,
            can_assign: false
          });
        }
      }

      return {
        game: {
          id: game.id,
          date: game.game_date,
          time: game.game_time,
          location: game.location,
          level: game.level
        },
        referees: analyzedReferees,
        summary: {
          total: analyzedReferees.length,
          available: analyzedReferees.filter(r => r.can_assign).length,
          conflicts: analyzedReferees.filter(r => r.availability_status === 'conflict').length,
          errors: analyzedReferees.filter(r => r.availability_status === 'error').length
        }
      };

    } catch (error) {
      console.error(`Error getting available referees for game ${gameId}:`, error);
      throw new Error(`Failed to get available referees: ${error.message}`);
    }
  }

  /**
   * Internal method to update game status based on assignments
   * @private
   * @param {string} gameId - Game ID
   * @param {Object} trx - Transaction object
   * @returns {Object} Updated game
   */
  async _updateGameStatus(gameId, trx) {
    try {
      const game = await trx('games').where('id', gameId).first();
      if (!game) {
        throw new Error('Game not found');
      }

      const activeAssignments = await trx('game_assignments')
        .where('game_id', gameId)
        .whereIn('status', ['pending', 'accepted'])
        .count('* as count')
        .first();

      const assignmentCount = parseInt(activeAssignments.count);
      let gameStatus = 'unassigned';

      if (assignmentCount > 0 && assignmentCount < game.refs_needed) {
        gameStatus = 'assigned'; // Partially assigned
      } else if (assignmentCount >= game.refs_needed) {
        gameStatus = 'assigned'; // Fully assigned
      }

      const [updatedGame] = await trx('games')
        .where('id', gameId)
        .update({ 
          status: gameStatus, 
          updated_at: new Date() 
        })
        .returning('*');

      return updatedGame;

    } catch (error) {
      console.error(`Error updating game status for game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Hook called after assignment creation
   * @param {Object} assignment - Created assignment
   * @param {Object} options - Creation options
   */
  async afterCreate(assignment, options) {
    if (this.options.enableAuditTrail) {
      console.log(`Assignment created: ${assignment.id} for game ${assignment.game_id}`);
    }
  }

  /**
   * Hook called after assignment update
   * @param {Object} assignment - Updated assignment
   * @param {Object} previousAssignment - Previous assignment state
   * @param {Object} options - Update options
   */
  async afterUpdate(assignment, previousAssignment, options) {
    if (this.options.enableAuditTrail && previousAssignment.status !== assignment.status) {
      console.log(`Assignment status changed: ${assignment.id} from ${previousAssignment.status} to ${assignment.status}`);
    }
  }
}

module.exports = AssignmentService;