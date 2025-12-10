/**
 * @fileoverview MenteeProfileService - Service for retrieving mentee profile information
 * @description Provides methods to fetch comprehensive mentee profile data including
 * mentor assignments, statistics, and personal information
 */

import { Knex } from 'knex';
import db from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import {
  MenteeProfileResponse,
  MenteeWithMentorship,
  MenteeStats,
  MentorInfo,
  GameAssignment
} from '../../types/mentorship.types';

/**
 * Service class for managing mentee profiles
 */
export class MenteeProfileService {
  private db: Knex;

  /**
   * Initialize the MenteeProfileService
   * @param database - Optional Knex database instance (defaults to global db)
   */
  constructor(database?: Knex) {
    this.db = database || db;
  }

  /**
   * Get comprehensive profile information for a mentee
   * @param menteeId - The mentee's ID (UUID)
   * @returns Complete mentee profile with mentor info and statistics
   * @throws NotFoundError if mentee is not found
   */
  async getMenteeProfile(menteeId: string): Promise<MenteeProfileResponse> {
    // Fetch mentee with profile data
    const menteeData = await this.db('mentees as m')
      .leftJoin('mentee_profiles as mp', 'm.id', 'mp.mentee_id')
      .select(
        'm.id',
        'm.user_id',
        'm.first_name',
        'm.last_name',
        'm.email',
        'm.phone',
        'm.date_of_birth',
        'm.profile_photo_url',
        'm.emergency_contact_name',
        'm.emergency_contact_phone',
        'm.street_address',
        'm.city',
        'm.province_state',
        'm.postal_zip_code',
        'mp.id as profile_id',
        'mp.current_level',
        'mp.development_goals',
        'mp.strengths',
        'mp.areas_for_improvement'
      )
      .where('m.id', menteeId)
      .first() as MenteeWithMentorship | undefined;

    if (!menteeData) {
      throw new NotFoundError('Mentee', menteeId);
    }

    // Fetch active mentor assignment
    const mentorshipData = await this.db('mentorship_assignments as ma')
      .leftJoin('mentors as mentor', 'ma.mentor_id', 'mentor.id')
      .select(
        'ma.id as mentorship_id',
        'ma.mentor_id',
        'ma.status as mentorship_status',
        'ma.start_date as mentorship_start_date',
        'ma.end_date as mentorship_end_date',
        'mentor.first_name as mentor_first_name',
        'mentor.last_name as mentor_last_name',
        'mentor.email as mentor_email',
        'mentor.specialization as mentor_specialization',
        'mentor.bio as mentor_bio'
      )
      .where('ma.mentee_id', menteeId)
      .where('ma.status', 'active')
      .first();

    // Calculate statistics from game assignments
    const stats = await this.calculateMenteeStats(menteeData.user_id, mentorshipData?.mentorship_start_date);

    // Build mentor info if exists
    let mentorInfo: MentorInfo | null = null;
    if (mentorshipData && mentorshipData.mentor_id) {
      mentorInfo = {
        id: mentorshipData.mentor_id,
        firstName: mentorshipData.mentor_first_name,
        lastName: mentorshipData.mentor_last_name,
        email: mentorshipData.mentor_email,
        specialization: mentorshipData.mentor_specialization || null,
        bio: mentorshipData.mentor_bio || null
      };
    }

    // Construct the response object with camelCase
    const response: MenteeProfileResponse = {
      // Basic information
      id: menteeData.id,
      userId: menteeData.user_id,
      firstName: menteeData.first_name,
      lastName: menteeData.last_name,
      email: menteeData.email,
      phone: menteeData.phone || null,
      dateOfBirth: menteeData.date_of_birth || null,
      profilePhotoUrl: menteeData.profile_photo_url || null,

      // Address information
      streetAddress: menteeData.street_address || null,
      city: menteeData.city || null,
      provinceState: menteeData.province_state || null,
      postalZipCode: menteeData.postal_zip_code || null,

      // Emergency contact
      emergencyContactName: menteeData.emergency_contact_name || null,
      emergencyContactPhone: menteeData.emergency_contact_phone || null,

      // Profile details
      currentLevel: menteeData.current_level || null,
      developmentGoals: menteeData.development_goals || null,
      strengths: menteeData.strengths || null,
      areasForImprovement: menteeData.areas_for_improvement || null,

      // Mentor information
      mentor: mentorInfo,
      mentorshipStatus: mentorshipData?.mentorship_status || null,
      mentorshipStartDate: mentorshipData?.mentorship_start_date || null,

      // Statistics
      stats
    };

    return response;
  }

  /**
   * Calculate mentee statistics from game assignments
   * @private
   * @param userId - The user ID associated with the mentee
   * @param mentorshipStartDate - Optional start date of mentorship for calculating days
   * @returns Mentee statistics object
   */
  private async calculateMenteeStats(userId: string, mentorshipStartDate?: string): Promise<MenteeStats> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get total games count
    const totalGamesResult = await this.db('game_assignments')
      .count('* as count')
      .where('user_id', userId)
      .first();
    const totalGames = parseInt(totalGamesResult?.count as string || '0', 10);

    // Get completed games (games in the past)
    const completedGamesResult = await this.db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .count('* as count')
      .where('ga.user_id', userId)
      .where('g.game_date', '<', today)
      .first();
    const completedGames = parseInt(completedGamesResult?.count as string || '0', 10);

    // Get upcoming games (games in the future)
    const upcomingGamesResult = await this.db('game_assignments as ga')
      .join('games as g', 'ga.game_id', 'g.id')
      .count('* as count')
      .where('ga.user_id', userId)
      .where('g.game_date', '>=', today)
      .first();
    const upcomingGames = parseInt(upcomingGamesResult?.count as string || '0', 10);

    // Calculate mentorship days
    let mentorshipDays = 0;
    if (mentorshipStartDate) {
      const startDate = new Date(mentorshipStartDate);
      const diffTime = now.getTime() - startDate.getTime();
      mentorshipDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      // Ensure non-negative
      mentorshipDays = Math.max(0, mentorshipDays);
    }

    return {
      totalGames,
      completedGames,
      upcomingGames,
      mentorshipDays
    };
  }
}

// Export singleton instance for easy importing
export const menteeProfileService = new MenteeProfileService();
