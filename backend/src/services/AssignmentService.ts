/**
 * AssignmentService - Assignment operations service
 * 
 * This service extends BaseService to provide specialized assignment management
 * operations, including conflict checking, bulk operations, and game status updates.
 * It integrates with the conflict detection service and wage calculation utilities.
 */

import { BaseService, QueryOptions } from './BaseService';
import { 
  Database, 
  UUID, 
  Timestamp, 
  AssignmentEntity, 
  AssignmentStatus,
  Knex,
  GameEntity,
  User,
  PositionEntity,
  PaginatedResult
} from '../types';

// Import utility functions (will need typing later)
import { checkAssignmentConflicts } from './conflictDetectionService';
const { calculateFinalWage, getWageBreakdown } = require('../utils/wage-calculator');
const { getOrganizationSettings } = require('../utils/organization-settings');

// Extended types for AssignmentService specific operations
export interface AssignmentWithDetails extends AssignmentEntity {
  game_date: string;
  game_time: string;
  location: string;
  level: string;
  pay_rate: number;
  wage_multiplier: number;
  wage_multiplier_reason?: string;
  home_team_name: string;
  away_team_name: string;
  referee_name: string;
  referee_email: string;
  position_name: string;
  referee_level?: string;
}

export interface AssignmentCreationData {
  game_id: UUID;
  user_id: UUID;
  position_id: UUID;
  assigned_by?: UUID;
}

export interface AssignmentCreationResult {
  assignment: AssignmentEntity;
  wageBreakdown: WageBreakdown;
  warnings: string[];
}

export interface WageBreakdown {
  baseWage: number;
  multiplier: number;
  multiplierReason: string;
  finalWage: number;
  isMultiplied: boolean;
  calculation: string;
  paymentModel: 'INDIVIDUAL' | 'FLAT_RATE';
  assignedRefereesCount?: number;
}

export interface BulkUpdateData {
  assignment_id: UUID;
  status: AssignmentStatus;
  calculated_wage?: number;
}

export interface BulkUpdateResult {
  updatedAssignments: AssignmentEntity[];
  updateErrors: Array<{
    assignmentId: UUID;
    error: string;
  }>;
  summary: {
    totalSubmitted: number;
    successfulUpdates: number;
    failedUpdates: number;
  };
}

export interface BulkRemovalResult {
  deletedCount: number;
  affectedGames: number;
  summary: {
    totalRequested: number;
    successfullyDeleted: number;
    notFound: number;
  };
  warnings: string[];
}

export interface AvailableReferee extends User {
  level_name?: string;
  allowed_divisions?: string;
  availability_status: 'available' | 'conflict' | 'error';
  conflicts: ConflictDetails[];
  warnings: string[];
  is_qualified: boolean;
  can_assign: boolean;
}

export interface ConflictDetails {
  type: string;
  gameId?: UUID;
  gameTime?: string;
  teams?: string;
  location?: string;
  message: string;
}

export interface ConflictAnalysis {
  hasConflicts: boolean;
  conflicts?: ConflictDetails[];
  warnings?: string[];
  errors?: string[];
  isQualified?: boolean;
}

export interface AvailableRefereesResult {
  game: {
    id: UUID;
    date: string;
    time: string;
    location: string;
    level: string;
  };
  referees: AvailableReferee[];
  summary: {
    total: number;
    available: number;
    conflicts: number;
    errors: number;
  };
}

export interface AssignmentFilters {
  game_id?: UUID;
  user_id?: UUID;
  status?: AssignmentStatus;
  date_from?: string;
  date_to?: string;
}

export interface OrganizationSettings {
  id: UUID;
  organization_name: string;
  payment_model: 'INDIVIDUAL' | 'FLAT_RATE';
  default_game_rate?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export class AssignmentService extends BaseService<AssignmentEntity> {
  constructor(db: Database) {
    super('game_assignments', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true
    });
  }

  /**
   * Create a new assignment with comprehensive conflict checking
   */
  async createAssignment(assignmentData: AssignmentCreationData, options: QueryOptions = {}): Promise<AssignmentCreationResult> {
    return await this.withTransaction(async (trx: Knex.Transaction) => {
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
        const referee = await (trx as any)('users')
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
        const position = await (trx as any)('positions').where('id', position_id).first();
        if (!position) {
          throw new Error('Position not found');
        }

        // Check for existing assignments
        const existingPositionAssignment = await (trx as any)('game_assignments')
          .where('game_id', game_id)
          .where('position_id', position_id)
          .whereIn('status', ['pending', 'accepted'])
          .first();

        if (existingPositionAssignment) {
          throw new Error('Position already filled for this game');
        }

        const existingRefereeAssignment = await (trx as any)('game_assignments')
          .where('game_id', game_id)
          .where('user_id', user_id)
          .whereIn('status', ['pending', 'accepted'])
          .first();

        if (existingRefereeAssignment) {
          throw new Error('Referee already assigned to this game');
        }

        // Check if game has reached maximum referees
        const currentAssignments = await (trx as any)('game_assignments')
          .where('game_id', game_id)
          .whereIn('status', ['pending', 'accepted'])
          .count('* as count')
          .first();

        if (parseInt((currentAssignments as any).count) >= game.refs_needed) {
          throw new Error('Game has reached maximum number of referees');
        }

        // Run comprehensive conflict detection
        const conflictAnalysis: ConflictAnalysis = await checkAssignmentConflicts(assignmentData);

        if (conflictAnalysis.hasConflicts) {
          throw new Error(`Assignment conflicts detected: ${conflictAnalysis.errors?.join(', ')}`);
        }

        // Get organization settings for wage calculation
        const orgSettings: OrganizationSettings = await getOrganizationSettings();
        const assignedRefereesCount = parseInt((currentAssignments as any).count) + 1;

        // Calculate final wage
        const finalWage = calculateFinalWage(
          referee.wage_per_game || game.pay_rate,
          game.wage_multiplier || 1.0,
          orgSettings.payment_model || 'INDIVIDUAL',
          orgSettings.default_game_rate || 0,
          assignedRefereesCount
        );

        // Create assignment
        const assignmentRecord: Partial<AssignmentEntity> = {
          game_id,
          user_id,
          position_id,
          assigned_by,
          status: AssignmentStatus.PENDING,
          calculated_wage: finalWage
        };

        const assignment = await this.create(assignmentRecord, { transaction: trx });

        // Get wage breakdown for response
        const wageBreakdown: WageBreakdown = getWageBreakdown(
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
   */
  async bulkUpdateAssignments(updates: BulkUpdateData[], options: QueryOptions = {}): Promise<BulkUpdateResult> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and cannot be empty');
    }

    if (updates.length > 100) {
      throw new Error('Maximum 100 assignments can be updated at once');
    }

    return await this.withTransaction(async (trx: Knex.Transaction) => {
      const results: BulkUpdateResult = {
        updatedAssignments: [],
        updateErrors: [],
        summary: {
          totalSubmitted: updates.length,
          successfulUpdates: 0,
          failedUpdates: 0
        }
      };

      const affectedGameIds = new Set<UUID>();

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
          const existingAssignment = await (trx as any)('game_assignments')
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
          const updateFields: Partial<AssignmentEntity> = {
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
            error: (error as Error).message
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
   */
  async updateGameStatus(gameId: UUID, options: QueryOptions = {}): Promise<GameEntity> {
    const trx = options.transaction || this.db;
    return await this._updateGameStatus(gameId, trx);
  }

  /**
   * Get assignments with enhanced data (game, referee, position details)
   */
  async getAssignmentsWithDetails(
    filters: AssignmentFilters = {}, 
    page: number = 1, 
    limit: number = 50, 
    options: QueryOptions = {}
  ): Promise<PaginatedResult<AssignmentWithDetails>> {
    try {
      const offset = (page - 1) * limit;

      // Build query with all necessary joins
      let query = (this.db as any)('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('users', 'game_assignments.user_id', 'users.id')
        // .join('positions', 'game_assignments.position_id', 'positions.id') // TODO: positions table doesn't exist yet
        .join('teams as home_team', 'games.home_team_id', 'home_team.id')
        .join('teams as away_team', 'games.away_team_id', 'away_team.id')
        // .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id') // TODO: referee_levels table doesn't exist yet
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
          'users.email as referee_email'
          // TODO: add back when positions and referee_levels tables exist:
          // 'positions.name as position_name',
          // 'referee_levels.name as referee_level'
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

      const total = parseInt((countResult as any).total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: assignments as AssignmentWithDetails[],
        pagination: {
          page: parseInt(page.toString()),
          limit: parseInt(limit.toString()),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };

    } catch (error) {
      console.error('Error getting assignments with details:', error);
      throw new Error(`Failed to get assignments: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk remove assignments with game status updates
   */
  async bulkRemoveAssignments(assignmentIds: UUID[], options: QueryOptions = {}): Promise<BulkRemovalResult> {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      throw new Error('Assignment IDs array is required and cannot be empty');
    }

    if (assignmentIds.length > 100) {
      throw new Error('Maximum 100 assignments can be removed at once');
    }

    return await this.withTransaction(async (trx: Knex.Transaction) => {
      try {
        // Get assignments before deletion for game status updates
        const assignmentsToDelete = await (trx as any)('game_assignments')
          .whereIn('id', assignmentIds)
          .select('id', 'game_id');

        if (assignmentsToDelete.length === 0) {
          return {
            deletedCount: 0,
            affectedGames: 0,
            summary: {
              totalRequested: assignmentIds.length,
              successfullyDeleted: 0,
              notFound: assignmentIds.length
            },
            warnings: ['No assignments found with provided IDs']
          };
        }

        // Get unique game IDs for status updates
        const gameIds = [...new Set(assignmentsToDelete.map((a: any) => a.game_id as UUID))];

        // Delete assignments
        const deletedCount = await (trx as any)('game_assignments')
          .whereIn('id', assignmentIds)
          .del();

        // Update game statuses for affected games
        for (const gameId of gameIds) {
          await this._updateGameStatus(gameId as UUID, trx);
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
   */
  async getAvailableRefereesForGame(gameId: UUID, options: QueryOptions = {}): Promise<AvailableRefereesResult> {
    try {
      const game = await this.db('games').where('id', gameId).first();
      if (!game) {
        throw new Error('Game not found');
      }

      // Get potential referees
      const potentialReferees = await (this.db as any)('users')
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
      const analyzedReferees: AvailableReferee[] = [];
      
      for (const referee of potentialReferees) {
        try {
          const assignmentData = {
            game_id: gameId,
            user_id: referee.id,
            position_id: 'dummy' // We're just checking conflicts, not assigning
          };

          const conflictAnalysis: ConflictAnalysis = await checkAssignmentConflicts(assignmentData);

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
            warnings: [`Analysis error: ${(error as Error).message}`],
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
      throw new Error(`Failed to get available referees: ${(error as Error).message}`);
    }
  }

  /**
   * Internal method to update game status based on assignments
   * @private
   */
  private async _updateGameStatus(gameId: UUID, trx: Knex.Transaction | Database): Promise<GameEntity> {
    try {
      const game = await (trx as any)('games').where('id', gameId).first();
      if (!game) {
        throw new Error('Game not found');
      }

      const activeAssignments = await (trx as any)('game_assignments')
        .where('game_id', gameId)
        .whereIn('status', ['pending', 'accepted'])
        .count('* as count')
        .first();

      const assignmentCount = parseInt((activeAssignments as any).count);
      let gameStatus = 'unassigned';

      if (assignmentCount > 0 && assignmentCount < game.refs_needed) {
        gameStatus = 'assigned'; // Partially assigned
      } else if (assignmentCount >= game.refs_needed) {
        gameStatus = 'assigned'; // Fully assigned
      }

      const [updatedGame] = await (trx as any)('games')
        .where('id', gameId)
        .update({ 
          status: gameStatus, 
          updated_at: new Date() 
        })
        .returning('*');

      return updatedGame as GameEntity;

    } catch (error) {
      console.error(`Error updating game status for game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Hook called after assignment creation
   */
  protected async afterCreate(assignment: AssignmentEntity, options: QueryOptions): Promise<void> {
    if (this.options.enableAuditTrail) {
      console.log(`Assignment created: ${assignment.id} for game ${assignment.game_id}`);
    }
  }

  /**
   * Hook called after assignment update
   */
  protected async afterUpdate(assignment: AssignmentEntity, previousAssignment: AssignmentEntity, options: QueryOptions): Promise<void> {
    if (this.options.enableAuditTrail && previousAssignment.status !== assignment.status) {
      console.log(`Assignment status changed: ${assignment.id} from ${previousAssignment.status} to ${assignment.status}`);
    }
  }
}
export default AssignmentService;
