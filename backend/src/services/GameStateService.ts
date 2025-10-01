/**
 * GameStateService - Game status management and assignment validation service
 *
 * This service provides centralized game status calculation logic, assignment
 * conflict detection, and validation methods for game-related operations.
 * It works closely with AssignmentService and ConflictDetectionService.
 */

import { Knex } from 'knex';
import { checkAssignmentConflicts, checkGameSchedulingConflicts } from './conflictDetectionService';

// Core interfaces for game state management
interface GameDetails {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  refs_needed: number;
  game_date: string;
  game_time: string;
  end_time?: string;
  location: string;
  level?: string;
  game_type?: string;
}

interface GameAssignment {
  id: string;
  game_id: string;
  user_id: string;
  position_id: string;
  referee_name: string;
  position_name: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  assigned_at: string;
}

interface AssignmentSummary {
  id: string;
  referee: string;
  position: string;
  status: string;
  assignedAt: string;
}

interface ConflictIssue {
  type: 'assignment_conflict' | 'venue_conflict' | 'validation_error';
  assignmentId?: string;
  referee?: string;
  position?: string;
  conflicts?: any[];
  error?: string;
  gameId?: string;
  message?: string;
}

interface ConflictWarning {
  type: 'assignment_warning' | 'scheduling_check_error' | 'travel_time';
  assignmentId?: string;
  referee?: string;
  warnings?: string[];
  error?: string;
  message?: string;
}

interface GameStatusResult {
  gameId: string;
  status: 'unassigned' | 'partially_assigned' | 'fully_assigned';
  statusReason: string;
  healthScore: number;
  assignmentSummary: {
    currentReferees: number;
    requiredReferees: number;
    isFullyStaffed: boolean;
    assignments: AssignmentSummary[];
  };
  issues: ConflictIssue[];
  warnings: ConflictWarning[];
  lastUpdated: Date;
}

interface GameStatusOptions {
  transaction?: Knex.Transaction;
}

interface AssignmentData {
  game_id: string;
  user_id: string;
  position_id: string;
}

interface ValidationResult {
  isValid: boolean;
  canAssign: boolean;
  errors: string[];
  warnings: string[];
  conflictAnalysis?: {
    hasConflicts: boolean;
    conflicts: any[];
    isQualified: boolean;
  };
  gameInfo?: {
    id: string;
    date: string;
    time: string;
    location: string;
    currentRefs: number;
    maxRefs: number;
  };
}

interface BulkValidationItem {
  index: number;
  assignment: AssignmentData;
  validation: ValidationResult;
}

interface BulkValidationResult {
  valid: BulkValidationItem[];
  invalid: BulkValidationItem[];
  warnings: Array<{
    index: number;
    assignment: AssignmentData;
    warnings: string[];
  }>;
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
    canAssignCount: number;
  };
}

interface TimeSlot {
  start: string;
  end: string;
}

interface RefereeAssignmentDetails {
  id: string;
  game_id: string;
  game_date: string;
  game_time: string;
  end_time?: string;
  location: string;
  level?: string;
  home_team_name: string;
  away_team_name: string;
  position_name: string;
  status: string;
}

interface ConflictDetails {
  type: 'time_overlap' | 'travel_time';
  assignment1: FormattedAssignment;
  assignment2: FormattedAssignment;
  message: string;
  travelTimeNeeded?: number;
  timeAvailable?: number;
}

interface FormattedAssignment {
  id: string;
  gameId: string;
  date: string;
  time: string;
  location: string;
  teams: string;
  position: string;
  status: string;
}

interface RefereeConflictAnalysis {
  refereeId: string;
  dateRange: {
    from: string;
    to: string;
  };
  assignments: FormattedAssignment[];
  conflicts: ConflictDetails[];
  warnings: ConflictDetails[];
  summary: {
    totalAssignments: number;
    conflictCount: number;
    warningCount: number;
    hasConflicts: boolean;
  };
}

class GameStateService {
  private db: Knex;

  /**
   * Constructor for GameStateService
   * @param db - Knex database instance
   */
  constructor(db: Knex) {
    if (!db) {
      throw new Error('GameStateService requires a database connection');
    }
    this.db = db;
  }

  /**
   * Calculate and update game status based on current assignments
   * @param gameId - Game ID
   * @param options - Calculation options
   * @returns Game status information
   */
  async calculateGameStatus(gameId: string, options: GameStatusOptions = {}): Promise<GameStatusResult> {
    const trx = options.transaction || this.db;

    try {
      // Get game details
      const game = await trx('games')
        .leftJoin('teams as home_team', 'games.home_team_id', 'home_team.id')
        .leftJoin('teams as away_team', 'games.away_team_id', 'away_team.id')
        .select(
          'games.*',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name'
        )
        .where('games.id', gameId)
        .first() as GameDetails | undefined;

      if (!game) {
        throw new Error('Game not found');
      }

      // Get current assignments
      const assignments = await trx('game_assignments')
        .join('users', 'game_assignments.user_id', 'users.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .select(
          'game_assignments.*',
          'users.name as referee_name',
          'positions.name as position_name'
        )
        .where('game_assignments.game_id', gameId)
        .whereIn('game_assignments.status', ['pending', 'accepted']) as GameAssignment[];

      // Calculate status
      const refsNeeded = game.refs_needed || 2;
      const currentRefs = assignments.length;

      let status: 'unassigned' | 'partially_assigned' | 'fully_assigned' = 'unassigned';
      let statusReason = 'No referees assigned';

      if (currentRefs > 0 && currentRefs < refsNeeded) {
        status = 'partially_assigned';
        statusReason = `${currentRefs} of ${refsNeeded} referees assigned`;
      } else if (currentRefs >= refsNeeded) {
        status = 'fully_assigned';
        statusReason = `All ${refsNeeded} referee positions filled`;
      }

      // Check for any conflicts or issues
      const issues: ConflictIssue[] = [];
      const warnings: ConflictWarning[] = [];

      // Check for assignment conflicts
      for (const assignment of assignments) {
        try {
          const conflictAnalysis = await checkAssignmentConflicts({
            game_id: gameId,
            user_id: assignment.user_id,
            position_id: assignment.position_id
          } as any);

          if (conflictAnalysis.hasConflicts) {
            issues.push({
              type: 'assignment_conflict',
              assignmentId: assignment.id,
              referee: assignment.referee_name,
              position: assignment.position_name,
              conflicts: conflictAnalysis.conflicts
            });
          }

          if (conflictAnalysis.warnings && conflictAnalysis.warnings.length > 0) {
            warnings.push({
              type: 'assignment_warning',
              assignmentId: assignment.id,
              referee: assignment.referee_name,
              warnings: conflictAnalysis.warnings
            });
          }
        } catch (error: any) {
          console.error(`Error checking conflicts for assignment ${assignment.id}:`, error);
          issues.push({
            type: 'validation_error',
            assignmentId: assignment.id,
            referee: assignment.referee_name,
            error: error.message
          });
        }
      }

      // Check game scheduling conflicts
      try {
        const gameConflicts = await checkGameSchedulingConflicts({
          location: game.location,
          game_date: game.game_date,
          game_time: game.game_time,
          end_time: game.end_time
        }, gameId);

        if (gameConflicts.hasConflicts) {
          issues.push({
            type: 'venue_conflict',
            conflicts: gameConflicts.conflicts
          });
        }
      } catch (error: any) {
        console.error(`Error checking game scheduling conflicts for game ${gameId}:`, error);
        warnings.push({
          type: 'scheduling_check_error',
          error: error.message
        });
      }

      // Calculate overall health score
      let healthScore = 100;

      // Deduct points for missing referees
      if (currentRefs < refsNeeded) {
        const missingRefs = refsNeeded - currentRefs;
        healthScore -= (missingRefs / refsNeeded) * 40; // Up to 40 points for missing refs
      }

      // Deduct points for issues
      healthScore -= issues.length * 20; // 20 points per issue
      healthScore -= warnings.length * 5; // 5 points per warning

      healthScore = Math.max(0, Math.round(healthScore));

      return {
        gameId,
        status,
        statusReason,
        healthScore,
        assignmentSummary: {
          currentReferees: currentRefs,
          requiredReferees: refsNeeded,
          isFullyStaffed: currentRefs >= refsNeeded,
          assignments: assignments.map(a => ({
            id: a.id,
            referee: a.referee_name,
            position: a.position_name,
            status: a.status,
            assignedAt: a.assigned_at
          }))
        },
        issues,
        warnings,
        lastUpdated: new Date()
      };

    } catch (error: any) {
      console.error(`Error calculating game status for game ${gameId}:`, error);
      throw new Error(`Failed to calculate game status: ${error.message}`);
    }
  }

  /**
   * Validate if an assignment can be made without conflicts
   * @param assignmentData - Assignment data to validate
   * @returns Validation result
   */
  async validateAssignment(assignmentData: AssignmentData): Promise<ValidationResult> {
    try {
      const { game_id, user_id, position_id } = assignmentData;

      if (!game_id || !user_id || !position_id) {
        return {
          isValid: false,
          canAssign: false,
          errors: ['Missing required fields: game_id, user_id, position_id'],
          warnings: []
        };
      }

      // Check basic prerequisites
      const [game, user, position] = await Promise.all([
        this.db('games').where('id', game_id).first(),
        this.db('users').where('id', user_id).where('role', 'referee').first(),
        this.db('positions').where('id', position_id).first()
      ]);

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!game) {
        errors.push('Game not found');
      }
      if (!user) {
        errors.push('Referee not found or not active');
      }
      if (!position) {
        errors.push('Position not found');
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          canAssign: false,
          errors,
          warnings
        };
      }

      // Check if referee is available
      if (!user.is_available) {
        errors.push('Referee is marked as unavailable');
      }

      // Check for existing assignments
      const existingAssignments = await this.db('game_assignments')
        .where('game_id', game_id)
        .where(function() {
          this.where('user_id', user_id).orWhere('position_id', position_id);
        })
        .whereIn('status', ['pending', 'accepted']);

      if (existingAssignments.length > 0) {
        const userAssignment = existingAssignments.find(a => a.user_id === user_id);
        const positionAssignment = existingAssignments.find(a => a.position_id === position_id);

        if (userAssignment) {
          errors.push('Referee is already assigned to this game');
        }
        if (positionAssignment) {
          errors.push('Position is already filled for this game');
        }
      }

      // Check game capacity
      const currentAssignmentCount = await this.db('game_assignments')
        .where('game_id', game_id)
        .whereIn('status', ['pending', 'accepted'])
        .count('* as count')
        .first() as { count: string };

      if (parseInt(currentAssignmentCount.count) >= game.refs_needed) {
        errors.push('Game has reached maximum number of referees');
      }

      // Run comprehensive conflict detection
      let conflictAnalysis = { hasConflicts: false, conflicts: [], warnings: [], isQualified: true };

      try {
        conflictAnalysis = await checkAssignmentConflicts(assignmentData) as any;

        if (conflictAnalysis.hasConflicts) {
          errors.push(...(conflictAnalysis as any).errors || []);
        }

        warnings.push(...(conflictAnalysis.warnings || []));
      } catch (conflictError: any) {
        console.error('Error during conflict analysis:', conflictError);
        warnings.push('Could not complete full conflict analysis');
      }

      const isValid = errors.length === 0;
      const canAssign = isValid && !conflictAnalysis.hasConflicts;

      return {
        isValid,
        canAssign,
        errors,
        warnings,
        conflictAnalysis: {
          hasConflicts: conflictAnalysis.hasConflicts,
          conflicts: conflictAnalysis.conflicts || [],
          isQualified: conflictAnalysis.isQualified !== false
        },
        gameInfo: {
          id: game.id,
          date: game.game_date,
          time: game.game_time,
          location: game.location,
          currentRefs: parseInt(currentAssignmentCount.count),
          maxRefs: game.refs_needed
        }
      };

    } catch (error: any) {
      console.error('Error validating assignment:', error);
      return {
        isValid: false,
        canAssign: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate bulk assignment operations
   * @param assignments - Array of assignment data
   * @returns Bulk validation results
   */
  async validateBulkAssignments(assignments: AssignmentData[]): Promise<BulkValidationResult> {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Assignments array is required and cannot be empty');
    }

    if (assignments.length > 50) {
      throw new Error('Bulk validation limited to 50 assignments at once');
    }

    try {
      const results: BulkValidationResult = {
        valid: [],
        invalid: [],
        warnings: [],
        summary: {
          total: assignments.length,
          validCount: 0,
          invalidCount: 0,
          canAssignCount: 0
        }
      };

      // Validate each assignment
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];

        try {
          const validation = await this.validateAssignment(assignment);

          const result: BulkValidationItem = {
            index: i,
            assignment,
            validation
          };

          if (validation.isValid) {
            results.valid.push(result);
            results.summary.validCount++;

            if (validation.canAssign) {
              results.summary.canAssignCount++;
            }
          } else {
            results.invalid.push(result);
            results.summary.invalidCount++;
          }

          // Collect warnings
          if (validation.warnings && validation.warnings.length > 0) {
            results.warnings.push({
              index: i,
              assignment,
              warnings: validation.warnings
            });
          }

        } catch (error: any) {
          console.error(`Error validating assignment ${i}:`, error);

          results.invalid.push({
            index: i,
            assignment,
            validation: {
              isValid: false,
              canAssign: false,
              errors: [error.message],
              warnings: []
            }
          });
          results.summary.invalidCount++;
        }
      }

      return results;

    } catch (error: any) {
      console.error('Error in bulk assignment validation:', error);
      throw new Error(`Bulk validation failed: ${error.message}`);
    }
  }

  /**
   * Get assignment conflicts for a specific referee across multiple games
   * @param refereeId - Referee user ID
   * @param dateFrom - Start date (YYYY-MM-DD)
   * @param dateTo - End date (YYYY-MM-DD)
   * @returns Conflict analysis
   */
  async getRefereeConflicts(refereeId: string, dateFrom: string, dateTo: string): Promise<RefereeConflictAnalysis> {
    try {
      // Get all assignments for the referee in the date range
      const assignments = await this.db('game_assignments')
        .join('games', 'game_assignments.game_id', 'games.id')
        .join('teams as home_team', 'games.home_team_id', 'home_team.id')
        .join('teams as away_team', 'games.away_team_id', 'away_team.id')
        .join('positions', 'game_assignments.position_id', 'positions.id')
        .select(
          'game_assignments.*',
          'games.game_date',
          'games.game_time',
          'games.end_time',
          'games.location',
          'games.level',
          'home_team.name as home_team_name',
          'away_team.name as away_team_name',
          'positions.name as position_name'
        )
        .where('game_assignments.user_id', refereeId)
        .where('games.game_date', '>=', dateFrom)
        .where('games.game_date', '<=', dateTo)
        .whereIn('game_assignments.status', ['pending', 'accepted'])
        .orderBy('games.game_date', 'asc')
        .orderBy('games.game_time', 'asc') as RefereeAssignmentDetails[];

      const conflicts: ConflictDetails[] = [];
      const warnings: ConflictDetails[] = [];

      // Check for conflicts between assignments
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const assignment1 = assignments[i];
          const assignment2 = assignments[j];

          // Skip if different dates
          if (assignment1.game_date !== assignment2.game_date) {
            continue;
          }

          // Check for time overlap
          const endTime1 = assignment1.end_time || this._calculateEndTime(assignment1.game_time);
          const endTime2 = assignment2.end_time || this._calculateEndTime(assignment2.game_time);

          if (this._checkTimeOverlap(
            { start: assignment1.game_time, end: endTime1 },
            { start: assignment2.game_time, end: endTime2 }
          )) {
            conflicts.push({
              type: 'time_overlap',
              assignment1: this._formatAssignmentForConflict(assignment1),
              assignment2: this._formatAssignmentForConflict(assignment2),
              message: `Time conflict between games on ${assignment1.game_date}`
            });
          }

          // Check for travel time conflicts
          else if (assignment1.location !== assignment2.location) {
            const travelTimeNeeded = this._calculateTravelTime(assignment1.location, assignment2.location);
            const timeBetween = this._getTimeBetween(endTime1, assignment2.game_time);

            if (timeBetween < travelTimeNeeded) {
              warnings.push({
                type: 'travel_time',
                assignment1: this._formatAssignmentForConflict(assignment1),
                assignment2: this._formatAssignmentForConflict(assignment2),
                travelTimeNeeded,
                timeAvailable: timeBetween,
                message: `Tight schedule between ${assignment1.location} and ${assignment2.location}`
              });
            }
          }
        }
      }

      return {
        refereeId,
        dateRange: { from: dateFrom, to: dateTo },
        assignments: assignments.map(a => this._formatAssignmentForConflict(a)),
        conflicts,
        warnings,
        summary: {
          totalAssignments: assignments.length,
          conflictCount: conflicts.length,
          warningCount: warnings.length,
          hasConflicts: conflicts.length > 0
        }
      };

    } catch (error: any) {
      console.error(`Error getting referee conflicts for ${refereeId}:`, error);
      throw new Error(`Failed to analyze referee conflicts: ${error.message}`);
    }
  }

  /**
   * Helper method to calculate end time
   * @private
   */
  _calculateEndTime(startTime: string, durationHours: number = 2): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (durationHours * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Helper method to check time overlap
   * @private
   */
  _checkTimeOverlap(time1: TimeSlot, time2: TimeSlot): boolean {
    const start1 = this._timeToMinutes(time1.start);
    const end1 = this._timeToMinutes(time1.end);
    const start2 = this._timeToMinutes(time2.start);
    const end2 = this._timeToMinutes(time2.end);

    return !(end1 <= start2 || end2 <= start1);
  }

  /**
   * Helper method to convert time to minutes
   * @private
   */
  _timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper method to calculate time between two times
   * @private
   */
  _getTimeBetween(time1: string, time2: string): number {
    const minutes1 = this._timeToMinutes(time1);
    const minutes2 = this._timeToMinutes(time2);
    return Math.abs(minutes2 - minutes1);
  }

  /**
   * Helper method to estimate travel time between locations
   * @private
   */
  _calculateTravelTime(location1: string, location2: string): number {
    // Simple heuristic - in a real implementation, this would use a mapping service
    if (location1 === location2) {
      return 0;
    }
    return 30; // Default 30 minutes travel time between different locations
  }

  /**
   * Helper method to format assignment for conflict reporting
   * @private
   */
  _formatAssignmentForConflict(assignment: RefereeAssignmentDetails): FormattedAssignment {
    return {
      id: assignment.id,
      gameId: assignment.game_id,
      date: assignment.game_date,
      time: assignment.game_time,
      location: assignment.location,
      teams: `${assignment.home_team_name} vs ${assignment.away_team_name}`,
      position: assignment.position_name,
      status: assignment.status
    };
  }
}

export default GameStateService;