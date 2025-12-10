/**
 * @fileoverview Mentor Mentees Service - Session 2D
 * @description Service for managing mentor's mentees with game statistics
 * @version 1.0.0
 */

import { Knex } from 'knex';
import { NotFoundError } from '../../utils/errors';

/**
 * Interface for mentor mentee details
 */
export interface MentorMentee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl?: string;
  currentLevel?: string;
  assignmentStatus: string;
  startDate: string;
  endDate?: string;
  stats: {
    totalGames: number;
    completedGames: number;
    upcomingGames: number;
  };
}

/**
 * Interface for mentor mentees filters
 */
export interface MentorMenteesFilters {
  page?: number;
  limit?: number;
  status?: string; // 'active', 'completed', 'paused', 'terminated'
}

/**
 * Interface for paginated mentees response
 */
export interface MentorMenteesResponse {
  data: MentorMentee[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Service class for managing mentor's mentees
 */
export class MentorMenteesService {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Get mentor's mentees with game statistics
   * @param mentorId - UUID of the mentor
   * @param filters - Optional filters for pagination and status
   * @returns Paginated list of mentees with stats
   */
  async getMentorMentees(
    mentorId: string,
    filters: MentorMenteesFilters = {}
  ): Promise<MentorMenteesResponse> {
    // Verify mentor exists
    const mentor = await this.db('mentors')
      .where('id', mentorId)
      .first();

    if (!mentor) {
      throw new NotFoundError('Mentor', mentorId);
    }

    // Set default pagination values
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Build base query for mentees
    let query = this.db('mentorship_assignments as ma')
      .join('mentees as m', 'ma.mentee_id', 'm.id')
      .leftJoin('mentee_profiles as mp', 'm.id', 'mp.mentee_id')
      .where('ma.mentor_id', mentorId)
      .select(
        'm.id',
        'm.first_name',
        'm.last_name',
        'm.email',
        'm.profile_photo_url',
        'mp.current_level',
        'ma.status as assignment_status',
        'ma.start_date',
        'ma.end_date'
      );

    // Apply status filter if provided
    if (filters.status) {
      query = query.where('ma.status', filters.status);
    }

    // Get total count - build a separate count query
    let countQuery = this.db('mentorship_assignments as ma')
      .join('mentees as m', 'ma.mentee_id', 'm.id')
      .where('ma.mentor_id', mentorId);

    if (filters.status) {
      countQuery = countQuery.where('ma.status', filters.status);
    }

    const countResult = await countQuery.count('* as count').first();
    const total = parseInt(String(countResult?.count || 0), 10);

    // Apply pagination
    const mentees = await query
      .orderBy('ma.start_date', 'desc')
      .limit(limit)
      .offset(offset);

    // Get game stats for each mentee in parallel
    const menteesWithStats = await Promise.all(
      mentees.map(async (mentee) => {
        const stats = await this.getMenteeGameStats(mentee.id);

        return {
          id: mentee.id,
          firstName: mentee.first_name,
          lastName: mentee.last_name,
          email: mentee.email,
          profilePhotoUrl: mentee.profile_photo_url || undefined,
          currentLevel: mentee.current_level || undefined,
          assignmentStatus: mentee.assignment_status,
          startDate: mentee.start_date,
          endDate: mentee.end_date || undefined,
          stats,
        };
      })
    );

    return {
      data: menteesWithStats,
      total,
      page,
      limit,
    };
  }

  /**
   * Get game statistics for a specific mentee
   * @param menteeId - UUID of the mentee
   * @returns Game statistics object
   */
  private async getMenteeGameStats(menteeId: string): Promise<{
    totalGames: number;
    completedGames: number;
    upcomingGames: number;
  }> {
    // Get mentee's user_id
    const mentee = await this.db('mentees')
      .where('id', menteeId)
      .select('user_id')
      .first();

    if (!mentee || !mentee.user_id) {
      return {
        totalGames: 0,
        completedGames: 0,
        upcomingGames: 0,
      };
    }

    const userId = mentee.user_id;

    // Get total games assigned to this mentee (as referee)
    const [totalResult] = await this.db('game_assignments')
      .where('user_id', userId)
      .count('* as count');
    const totalGames = parseInt(totalResult.count as string, 10);

    // Get completed games (where game date is in the past)
    const [completedResult] = await this.db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .where('ga.user_id', userId)
      .where('g.game_date', '<', this.db.fn.now())
      .count('* as count');
    const completedGames = parseInt(completedResult.count as string, 10);

    // Get upcoming games (where game date is in the future)
    const [upcomingResult] = await this.db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .where('ga.user_id', userId)
      .where('g.game_date', '>=', this.db.fn.now())
      .count('* as count');
    const upcomingGames = parseInt(upcomingResult.count as string, 10);

    return {
      totalGames,
      completedGames,
      upcomingGames,
    };
  }
}

export default MentorMenteesService;
