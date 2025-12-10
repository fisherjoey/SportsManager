/**
 * MenteeAnalyticsService - Service for retrieving analytics data for mentees
 *
 * This service provides comprehensive analytics for mentees in the mentorship system,
 * including game statistics, acceptance rates, completion rates, level distribution,
 * monthly trends, and recent activity tracking.
 */

import { Knex } from 'knex';
import { NotFoundError } from '../../utils/errors';

// Interface for mentee analytics summary
export interface MenteeAnalyticsSummary {
  totalGames: number;
  completedGames: number;
  acceptanceRate: number;  // percentage
  completionRate: number;  // percentage
}

// Interface for statistics by level
export interface StatsByLevel {
  level: string;
  games: number;
  completed: number;
}

// Interface for statistics by month
export interface StatsByMonth {
  month: string;
  games: number;
  completed: number;
}

// Interface for recent activity
export interface RecentActivity {
  date: string;
  action: string;
  details: string;
}

// Interface for complete analytics data
export interface MenteeAnalytics {
  summary: MenteeAnalyticsSummary;
  byLevel: StatsByLevel[];
  byMonth: StatsByMonth[];
  recentActivity: RecentActivity[];
}

// Database row interfaces
interface SummaryStatsRow {
  total_games: string;
  completed_games: string;
  accepted_games: string;
  assigned_games: string;
}

interface LevelStatsRow {
  level: string;
  games: string;
  completed: string;
}

interface MonthStatsRow {
  month: string;
  games: string;
  completed: string;
}

interface ActivityRow {
  game_date: string;
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  level: string;
  location: string | null;
}

/**
 * MenteeAnalyticsService class
 * Handles retrieval and calculation of analytics data for mentees
 */
class MenteeAnalyticsService {
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
   * Get comprehensive analytics for a mentee
   * @param menteeId - UUID of the mentee
   * @returns Complete analytics data
   * @throws NotFoundError if mentee not found
   */
  async getMenteeAnalytics(menteeId: string): Promise<MenteeAnalytics> {
    try {
      // First, verify mentee exists and get user_id
      const mentee = await this.db('mentees')
        .where('id', menteeId)
        .first();

      if (!mentee) {
        throw new NotFoundError('Mentee', menteeId);
      }

      const userId = mentee.user_id;

      // Fetch all analytics data in parallel
      const [summary, byLevel, byMonth, recentActivity] = await Promise.all([
        this.getSummaryStats(userId),
        this.getStatsByLevel(userId),
        this.getStatsByMonth(userId),
        this.getRecentActivity(userId)
      ]);

      return {
        summary,
        byLevel,
        byMonth,
        recentActivity
      };
    } catch (error: any) {
      // Re-throw NotFoundError as-is
      if (error instanceof NotFoundError) {
        throw error;
      }

      // Log and wrap other errors
      console.error(`Error fetching analytics for mentee ${menteeId}:`, error);
      throw new Error(`Failed to fetch mentee analytics: ${error.message}`);
    }
  }

  /**
   * Get summary statistics for a mentee
   * @private
   * @param userId - User ID of the mentee
   * @returns Summary statistics
   */
  private async getSummaryStats(userId: string): Promise<MenteeAnalyticsSummary> {
    const result = await this.db('game_assignments as ga')
      .select(
        this.db.raw('COUNT(*) as total_games'),
        this.db.raw("COUNT(CASE WHEN ga.status = 'completed' THEN 1 END) as completed_games"),
        this.db.raw("COUNT(CASE WHEN ga.status = 'accepted' THEN 1 END) as accepted_games"),
        this.db.raw("COUNT(CASE WHEN ga.status = 'assigned' THEN 1 END) as assigned_games")
      )
      .where('ga.user_id', userId)
      .first() as unknown as SummaryStatsRow;

    const totalGames = parseInt(result.total_games);
    const completedGames = parseInt(result.completed_games);
    const acceptedGames = parseInt(result.accepted_games);
    const assignedGames = parseInt(result.assigned_games);

    // Calculate acceptance rate (accepted / (accepted + declined))
    // We need to get declined count separately
    const declinedResult = await this.db('game_assignments')
      .count('* as declined_count')
      .where('user_id', userId)
      .where('status', 'declined')
      .first() as { declined_count: string };

    const declinedGames = parseInt(declinedResult.declined_count);
    const totalResponses = acceptedGames + declinedGames;
    const acceptanceRate = totalResponses > 0
      ? Math.round((acceptedGames / totalResponses) * 100)
      : 0;

    // Calculate completion rate (completed / total)
    const completionRate = totalGames > 0
      ? Math.round((completedGames / totalGames) * 100)
      : 0;

    return {
      totalGames,
      completedGames,
      acceptanceRate,
      completionRate
    };
  }

  /**
   * Get statistics grouped by game level
   * @private
   * @param userId - User ID of the mentee
   * @returns Statistics by level
   */
  private async getStatsByLevel(userId: string): Promise<StatsByLevel[]> {
    const results = await this.db('game_assignments as ga')
      .select(
        'g.level',
        this.db.raw('COUNT(*) as games'),
        this.db.raw("COUNT(CASE WHEN ga.status = 'completed' THEN 1 END) as completed")
      )
      .join('games as g', 'ga.game_id', 'g.id')
      .where('ga.user_id', userId)
      .groupBy('g.level')
      .orderBy('g.level') as LevelStatsRow[];

    return results.map(row => ({
      level: row.level || 'Unknown',
      games: parseInt(row.games),
      completed: parseInt(row.completed)
    }));
  }

  /**
   * Get statistics grouped by month (last 6 months)
   * @private
   * @param userId - User ID of the mentee
   * @returns Statistics by month
   */
  private async getStatsByMonth(userId: string): Promise<StatsByMonth[]> {
    const results = await this.db('game_assignments as ga')
      .select(
        this.db.raw("TO_CHAR(g.game_date, 'YYYY-MM') as month"),
        this.db.raw('COUNT(*) as games'),
        this.db.raw("COUNT(CASE WHEN ga.status = 'completed' THEN 1 END) as completed")
      )
      .join('games as g', 'ga.game_id', 'g.id')
      .where('ga.user_id', userId)
      .where('g.game_date', '>=', this.db.raw("CURRENT_DATE - INTERVAL '6 months'"))
      .groupBy(this.db.raw("TO_CHAR(g.game_date, 'YYYY-MM')"))
      .orderBy('month', 'desc') as MonthStatsRow[];

    return results.map(row => ({
      month: row.month,
      games: parseInt(row.games),
      completed: parseInt(row.completed)
    }));
  }

  /**
   * Get recent activity (last 10 actions)
   * @private
   * @param userId - User ID of the mentee
   * @returns Recent activity entries
   */
  private async getRecentActivity(userId: string): Promise<RecentActivity[]> {
    const results = await this.db('game_assignments as ga')
      .select(
        'g.game_date',
        'ga.status',
        'ht.name as home_team_name',
        'at.name as away_team_name',
        'g.level',
        this.db.raw('COALESCE(l.name, g.location) as location')
      )
      .join('games as g', 'ga.game_id', 'g.id')
      .leftJoin('teams as ht', 'g.home_team_id', 'ht.id')
      .leftJoin('teams as at', 'g.away_team_id', 'at.id')
      .leftJoin('locations as l', 'g.location_id', 'l.id')
      .where('ga.user_id', userId)
      .orderBy('g.game_date', 'desc')
      .limit(10) as ActivityRow[];

    return results.map(row => {
      // Format action based on status
      let action = '';
      switch (row.status) {
        case 'assigned':
          action = 'Game Assigned';
          break;
        case 'accepted':
          action = 'Assignment Accepted';
          break;
        case 'declined':
          action = 'Assignment Declined';
          break;
        case 'completed':
          action = 'Game Completed';
          break;
        default:
          action = 'Status Updated';
      }

      // Format details
      const homeTeam = row.home_team_name || 'TBD';
      const awayTeam = row.away_team_name || 'TBD';
      const level = row.level || 'Unknown';
      const location = row.location || 'TBD';
      const details = `${homeTeam} vs ${awayTeam} (${level}) at ${location}`;

      return {
        date: row.game_date,
        action,
        details
      };
    });
  }
}

// Export singleton instance
const menteeAnalyticsServiceInstance = new MenteeAnalyticsService();
export default menteeAnalyticsServiceInstance;

// Also export the class for testing
export { MenteeAnalyticsService };
