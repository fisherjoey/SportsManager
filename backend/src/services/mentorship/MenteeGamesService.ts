/**
 * MenteeGamesService - Service for retrieving games assigned to mentees
 *
 * This service provides functionality to fetch game assignments for mentees
 * in the mentorship system, including filtering, pagination, and detailed
 * game information with team, location, and position details.
 */

import { Knex } from 'knex';
import { NotFoundError } from '../../utils/errors';

// Interface for mentee game filters
export interface MenteeGamesFilters {
  page?: number;
  limit?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

// Interface for mentee game data returned to clients
export interface MenteeGame {
  id: string;
  gameDate: string;
  gameTime?: string;
  homeTeam: string;
  awayTeam: string;
  location: string;
  level: string;
  status: string;
  assignmentStatus: string;
  position?: string;
}

// Interface for paginated response
export interface MenteeGamesResult {
  data: MenteeGame[];
  total: number;
  page: number;
  limit: number;
}

// Database row interface for query results
interface GameAssignmentRow {
  game_id: string;
  game_date: string;
  game_time: string | null;
  home_team_name: string;
  away_team_name: string;
  location: string;
  level: string;
  game_status: string;
  assignment_status: string;
  position_name: string | null;
}

/**
 * MenteeGamesService class
 * Handles retrieval of game assignments for mentees with comprehensive filtering
 */
class MenteeGamesService {
  private db: Knex;

  /**
   * Constructor
   * @param db - Knex database instance (optional for testing)
   */
  constructor(db?: Knex) {
    if (!db) {
      // Import default database connection if not provided
      const dbModule = require('../../config/database');
      this.db = dbModule.default || dbModule;
    } else {
      this.db = db;
    }
  }

  /**
   * Get games assigned to a mentee
   * @param menteeId - UUID of the mentee
   * @param filters - Optional filters for pagination and date range
   * @returns Paginated list of games assigned to the mentee
   * @throws NotFoundError if mentee not found
   */
  async getMenteeGames(
    menteeId: string,
    filters: MenteeGamesFilters = {}
  ): Promise<MenteeGamesResult> {
    try {
      // Extract and validate filters with defaults
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
      const offset = (page - 1) * limit;

      // First, get the mentee to verify existence and get user_id
      const mentee = await this.db('mentees')
        .where('id', menteeId)
        .first();

      if (!mentee) {
        throw new NotFoundError('Mentee', menteeId);
      }

      // Build the base query for game assignments
      let query = this.db('game_assignments as ga')
        .select(
          'g.id as game_id',
          'g.game_date',
          'g.game_time',
          'ht.name as home_team_name',
          'at.name as away_team_name',
          this.db.raw('COALESCE(l.name, g.location) as location'),
          'g.level',
          'g.status as game_status',
          'ga.status as assignment_status',
          'p.name as position_name'
        )
        .join('games as g', 'ga.game_id', 'g.id')
        .leftJoin('teams as ht', 'g.home_team_id', 'ht.id')
        .leftJoin('teams as at', 'g.away_team_id', 'at.id')
        .leftJoin('locations as l', 'g.location_id', 'l.id')
        .leftJoin('positions as p', 'ga.position_id', 'p.id')
        .where('ga.user_id', mentee.user_id);

      // Apply status filter if provided
      if (filters.status) {
        query = query.where('ga.status', filters.status);
      }

      // Apply date range filters if provided
      if (filters.fromDate) {
        query = query.where('g.game_date', '>=', filters.fromDate);
      }

      if (filters.toDate) {
        query = query.where('g.game_date', '<=', filters.toDate);
      }

      // Get total count for pagination - build a separate count query
      let countQuery = this.db('game_assignments as ga')
        .join('games as g', 'ga.game_id', 'g.id')
        .where('ga.user_id', mentee.user_id);

      // Apply same filters to count query
      if (filters.status) {
        countQuery = countQuery.where('ga.status', filters.status);
      }
      if (filters.fromDate) {
        countQuery = countQuery.where('g.game_date', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        countQuery = countQuery.where('g.game_date', '<=', filters.toDate);
      }

      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(String(totalResult?.count || 0));

      // Apply ordering and pagination
      const games = await query
        .orderBy('g.game_date', 'asc')
        .orderBy('g.game_time', 'asc')
        .limit(limit)
        .offset(offset) as GameAssignmentRow[];

      // Transform database rows to MenteeGame format
      const data: MenteeGame[] = games.map(row => ({
        id: row.game_id,
        gameDate: row.game_date,
        gameTime: row.game_time || undefined,
        homeTeam: row.home_team_name || 'TBD',
        awayTeam: row.away_team_name || 'TBD',
        location: row.location || 'TBD',
        level: row.level || 'Unknown',
        status: row.game_status || 'scheduled',
        assignmentStatus: row.assignment_status || 'pending',
        position: row.position_name || undefined
      }));

      return {
        data,
        total,
        page,
        limit
      };
    } catch (error: any) {
      // Re-throw NotFoundError as-is
      if (error instanceof NotFoundError) {
        throw error;
      }

      // Log and wrap other errors
      console.error(`Error fetching games for mentee ${menteeId}:`, error);
      throw new Error(`Failed to fetch mentee games: ${error.message}`);
    }
  }
}

// Export singleton instance
const menteeGamesServiceInstance = new MenteeGamesService();
export default menteeGamesServiceInstance;

// Also export the class for testing
export { MenteeGamesService };
