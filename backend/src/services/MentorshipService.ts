/**
 * MentorshipService - Mentorship relationship management service
 *
 * This service extends BaseService to provide specialized mentorship management
 * operations, including mentor-mentee relationship CRUD, eligibility validation,
 * lifecycle management, and authorization controls with comprehensive type safety.
 *
 * Key Features:
 * - Complete CRUD operations for mentorship relationships
 * - Mentor eligibility validation based on referee roles and permissions
 * - Mentorship lifecycle management (active, paused, completed, terminated)
 * - Authorization controls ensuring mentors only access their mentees
 * - Query methods for retrieving mentorships by mentor or mentee
 * - Business logic for preventing duplicate relationships
 * - Support for date-based filtering and status transitions
 */

import { Knex } from 'knex';
import BaseService from './BaseService';

// Core interfaces for mentorship management
interface MentorshipData {
  mentor_id: string;
  mentee_id: string;
  start_date: string;
  notes?: string;
}

interface MentorshipRecord {
  id: string;
  mentor_id: string;
  mentee_id: string;
  start_date: string;
  end_date?: string | null;
  status: MentorshipStatus;
  notes?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface MentorshipWithMenteeDetails extends MentorshipRecord {
  mentee_name?: string;
  mentee_email?: string;
  mentee_phone?: string;
  mentee_is_available?: boolean;
}

interface MentorshipWithMentorDetails extends MentorshipRecord {
  mentor_name?: string;
  mentor_email?: string;
  mentor_phone?: string;
}

interface MentorshipWithFullDetails extends MentorshipRecord {
  mentor_name?: string;
  mentor_email?: string;
  mentee_name?: string;
  mentee_email?: string;
  mentee_phone?: string;
  mentee_is_available?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_available?: boolean;
}

interface AvailableMentor {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface MentorshipStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  terminated: number;
}

interface MentorshipQueryOptions {
  status?: MentorshipStatus;
  includeDetails?: boolean;
}

interface CreateMentorshipOptions {
  transaction?: Knex.Transaction;
}

interface UpdateMentorshipOptions {
  transaction?: Knex.Transaction;
}

type MentorshipStatus = 'active' | 'paused' | 'completed' | 'terminated';

class MentorshipService extends BaseService {
  /**
   * Constructor for MentorshipService
   * @param db - Knex database instance
   */
  constructor(db: Knex) {
    super('mentorships', db, {
      defaultOrderBy: 'start_date',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true,
      throwOnNotFound: true
    });
  }

  /**
   * Create a new mentorship relationship
   * @param mentorshipData - Mentorship data
   * @param options - Creation options
   * @returns Created mentorship record
   * @throws Error if mentor eligibility check fails or relationship already exists
   */
  async createMentorship(
    mentorshipData: MentorshipData,
    options: CreateMentorshipOptions = {}
  ): Promise<MentorshipRecord> {
    try {
      const { mentor_id, mentee_id, start_date, notes } = mentorshipData;

      // Validate required fields
      if (!mentor_id || !mentee_id || !start_date) {
        throw new Error('mentor_id, mentee_id, and start_date are required');
      }

      // Prevent self-mentorship
      if (mentor_id === mentee_id) {
        throw new Error('A user cannot mentor themselves');
      }

      // Validate mentor eligibility
      await this.validateMentorEligibility(mentor_id);

      // Check if relationship already exists (active or recent)
      await this.checkExistingRelationship(mentor_id, mentee_id);

      // Validate both users exist and mentee is a referee
      await this.validateUsers(mentor_id, mentee_id);

      const mentorshipRecord: Partial<MentorshipRecord> = {
        mentor_id,
        mentee_id,
        start_date,
        status: 'active',
        notes: notes || null
      };

      const mentorship = await this.create(mentorshipRecord, options) as MentorshipRecord;

      console.log(`Mentorship created: ${mentor_id} -> ${mentee_id} (${mentorship.id})`);
      return mentorship;

    } catch (error: any) {
      console.error('Error creating mentorship:', error);
      throw new Error(`Failed to create mentorship: ${error.message}`);
    }
  }

  /**
   * Get mentorships by mentor ID
   * @param mentorId - Mentor user ID
   * @param options - Query options
   * @returns Array of mentorship records
   */
  async getMentorshipsByMentor(
    mentorId: string,
    options: MentorshipQueryOptions = {}
  ): Promise<MentorshipWithMenteeDetails[]> {
    try {
      const { status, includeDetails = true } = options;

      let query = this.db('mentorships').where('mentor_id', mentorId);

      if (status) {
        query = query.where('status', status);
      }

      if (includeDetails) {
        query = query
          .leftJoin('users as mentees', 'mentorships.mentee_id', 'mentees.id')
          .select(
            'mentorships.*',
            'mentees.name as mentee_name',
            'mentees.email as mentee_email',
            'mentees.phone as mentee_phone',
            'mentees.is_available as mentee_is_available'
          );
      } else {
        query = query.select('mentorships.*');
      }

      const mentorships = await query.orderBy('mentorships.start_date', 'desc') as MentorshipWithMenteeDetails[];

      return mentorships;
    } catch (error: any) {
      console.error(`Error getting mentorships for mentor ${mentorId}:`, error);
      throw new Error(`Failed to get mentorships: ${error.message}`);
    }
  }

  /**
   * Get mentorships by mentee ID
   * @param menteeId - Mentee user ID
   * @param options - Query options
   * @returns Array of mentorship records
   */
  async getMentorshipsByMentee(
    menteeId: string,
    options: MentorshipQueryOptions = {}
  ): Promise<MentorshipWithMentorDetails[]> {
    try {
      const { status, includeDetails = true } = options;

      let query = this.db('mentorships').where('mentee_id', menteeId);

      if (status) {
        query = query.where('status', status);
      }

      if (includeDetails) {
        query = query
          .leftJoin('users as mentors', 'mentorships.mentor_id', 'mentors.id')
          .select(
            'mentorships.*',
            'mentors.name as mentor_name',
            'mentors.email as mentor_email',
            'mentors.phone as mentor_phone'
          );
      } else {
        query = query.select('mentorships.*');
      }

      const mentorships = await query.orderBy('mentorships.start_date', 'desc') as MentorshipWithMentorDetails[];

      return mentorships;
    } catch (error: any) {
      console.error(`Error getting mentorships for mentee ${menteeId}:`, error);
      throw new Error(`Failed to get mentorships: ${error.message}`);
    }
  }

  /**
   * Get ALL mentorships (admin only)
   * @param options - Query options
   * @returns Array of all mentorship records
   */
  async getAllMentorships(
    options: MentorshipQueryOptions = {}
  ): Promise<any[]> {
    try {
      const { status, includeDetails = true } = options;

      let query = this.db('mentorships');

      if (status) {
        query = query.where('status', status);
      }

      if (includeDetails) {
        query = query
          .select(
            'mentorships.*',
            'mentor.name as mentor_name',
            'mentor.email as mentor_email',
            'mentor.phone as mentor_phone',
            'mentee.name as mentee_name',
            'mentee.email as mentee_email',
            'mentee.phone as mentee_phone'
          )
          .leftJoin('users as mentor', 'mentorships.mentor_id', 'mentor.id')
          .leftJoin('users as mentee', 'mentorships.mentee_id', 'mentee.id');
      }

      const mentorships = await query.orderBy('mentorships.created_at', 'desc');

      return mentorships;
    } catch (error: any) {
      console.error('Error getting all mentorships:', error);
      throw new Error(`Failed to get all mentorships: ${error.message}`);
    }
  }

  /**
   * Get a specific mentorship with full details
   * @param mentorshipId - Mentorship ID
   * @param requestingUserId - ID of user requesting access
   * @param options - Query options
   * @returns Mentorship record with details
   * @throws Error if user doesn't have access to the mentorship
   */
  async getMentorshipWithDetails(
    mentorshipId: string,
    requestingUserId: string,
    options: Record<string, any> = {}
  ): Promise<MentorshipWithFullDetails> {
    try {
      const mentorship = await this.db('mentorships')
        .leftJoin('users as mentors', 'mentorships.mentor_id', 'mentors.id')
        .leftJoin('users as mentees', 'mentorships.mentee_id', 'mentees.id')
        .select(
          'mentorships.*',
          'mentors.name as mentor_name',
          'mentors.email as mentor_email',
          'mentees.name as mentee_name',
          'mentees.email as mentee_email',
          'mentees.phone as mentee_phone',
          'mentees.is_available as mentee_is_available'
        )
        .where('mentorships.id', mentorshipId)
        .first() as MentorshipWithFullDetails | undefined;

      if (!mentorship) {
        throw new Error('Mentorship not found');
      }

      // Verify user has access to this mentorship
      if (mentorship.mentor_id !== requestingUserId && mentorship.mentee_id !== requestingUserId) {
        throw new Error('Access denied: You can only view your own mentorship relationships');
      }

      return mentorship;
    } catch (error: any) {
      console.error(`Error getting mentorship details ${mentorshipId}:`, error);
      throw new Error(`Failed to get mentorship details: ${error.message}`);
    }
  }

  /**
   * Update mentorship status
   * Only users with mentorship management permissions can update status
   * @param mentorshipId - Mentorship ID
   * @param newStatus - New status (active, paused, completed, terminated)
   * @param userId - User ID performing the update (for authorization)
   * @param options - Update options
   * @returns Updated mentorship record
   * @throws Error if status transition is invalid or user lacks permission
   */
  async updateMentorshipStatus(
    mentorshipId: string,
    newStatus: MentorshipStatus,
    userId: string,
    options: UpdateMentorshipOptions = {}
  ): Promise<MentorshipRecord> {
    try {
      // Validate status
      const validStatuses: MentorshipStatus[] = ['active', 'paused', 'completed', 'terminated'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get current mentorship
      const mentorship = await this.findById(mentorshipId) as MentorshipRecord;

      console.log(`[MentorshipService] Checking permissions for user ${userId} to update mentorship ${mentorshipId}`);

      // First, let's see what roles this user has
      const userRoles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .select('roles.name', 'user_roles.is_active');

      console.log(`[MentorshipService] User roles:`, userRoles);

      // Check if user has admin/manage permissions
      // First check if user is Super Admin (has automatic bypass)
      const isSuperAdmin = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Super Admin')
        .first();

      console.log(`[MentorshipService] Is Super Admin:`, !!isSuperAdmin);

      // Then check for specific mentorship management permissions
      let hasSpecificPermission = false;
      if (!isSuperAdmin) {
        hasSpecificPermission = await this.db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .join('role_permissions', 'roles.id', 'role_permissions.role_id')
          .join('permissions', 'role_permissions.permission_id', 'permissions.id')
          .where('user_roles.user_id', userId)
          .where('user_roles.is_active', true)
          .whereIn('permissions.name', ['mentorships:manage', 'mentorships:update', 'system:admin'])
          .first();
      }

      console.log(`[MentorshipService] Has specific permission:`, !!hasSpecificPermission);

      const hasManagePermission = isSuperAdmin || hasSpecificPermission;

      console.log(`[MentorshipService] Final permission check result:`, !!hasManagePermission);

      // Only users with proper permissions can update mentorship status
      if (!hasManagePermission) {
        console.error(`[MentorshipService] Access denied for user ${userId}`);
        throw new Error('Access denied: You need mentorship management permissions to update mentorship status');
      }

      // Prepare update data
      const updateData: Partial<MentorshipRecord> = {
        status: newStatus,
        updated_at: new Date()
      };

      // Set end_date if completing or terminating
      if (newStatus === 'completed' || newStatus === 'terminated') {
        updateData.end_date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      } else if (newStatus === 'active' && mentorship.end_date) {
        // Clear end_date if reactivating
        updateData.end_date = null;
      }

      const updatedMentorship = await this.update(mentorshipId, updateData, options) as MentorshipRecord;

      console.log(`Mentorship ${mentorshipId} status updated to: ${newStatus}`);
      return updatedMentorship;

    } catch (error: any) {
      console.error(`Error updating mentorship status ${mentorshipId}:`, error);
      throw new Error(`Failed to update mentorship status: ${error.message}`);
    }
  }

  /**
   * Check if a user can be a mentor
   * @param userId - User ID to check
   * @returns True if user can be a mentor
   */
  async canUserBeMentor(userId: string): Promise<boolean> {
    try {
      await this.validateMentorEligibility(userId);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get mentorship statistics for a mentor
   * @param mentorId - Mentor user ID
   * @returns Statistics object
   */
  async getMentorshipStats(mentorId: string): Promise<MentorshipStats> {
    try {
      const stats = await this.db('mentorships')
        .select(
          this.db.raw('COUNT(*) as total_mentorships'),
          this.db.raw('COUNT(CASE WHEN status = \'active\' THEN 1 END) as active_mentorships'),
          this.db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_mentorships'),
          this.db.raw('COUNT(CASE WHEN status = \'paused\' THEN 1 END) as paused_mentorships'),
          this.db.raw('COUNT(CASE WHEN status = \'terminated\' THEN 1 END) as terminated_mentorships')
        )
        .where('mentor_id', mentorId)
        .first() as {
          total_mentorships: string;
          active_mentorships: string;
          completed_mentorships: string;
          paused_mentorships: string;
          terminated_mentorships: string;
        };

      return {
        total: parseInt(stats.total_mentorships) || 0,
        active: parseInt(stats.active_mentorships) || 0,
        completed: parseInt(stats.completed_mentorships) || 0,
        paused: parseInt(stats.paused_mentorships) || 0,
        terminated: parseInt(stats.terminated_mentorships) || 0
      };
    } catch (error: any) {
      console.error(`Error getting mentorship stats for ${mentorId}:`, error);
      throw new Error(`Failed to get mentorship statistics: ${error.message}`);
    }
  }

  /**
   * Validate mentor eligibility based on referee roles and permissions
   * @private
   * @param userId - User ID to validate
   * @throws Error if user is not eligible to be a mentor
   */
  private async validateMentorEligibility(userId: string): Promise<void> {
    try {
      // Check if user exists and has mentor capability
      const user = await this.db('users').where('id', userId).first() as User | undefined;
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has the "Mentorship Coordinator" RBAC role
      const hasRbacRole = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Mentorship Coordinator')
        .where('user_roles.is_active', true)
        .where('roles.is_active', true)
        .first();

      if (hasRbacRole) {
        return; // User has proper RBAC role
      }

      // Check if user has mentoring permission through RBAC
      // Check for either mentorships:manage or mentorships:create permissions
      const hasMentorRole = await this.db('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.id')
        .join('role_permissions as rp', 'r.id', 'rp.role_id')
        .join('permissions as p', 'rp.permission_id', 'p.id')
        .where('ur.user_id', userId)
        .whereIn('p.name', ['mentorships:manage', 'mentorships:create', 'mentorship.provide'])
        .where('ur.is_active', true)
        .first();

      if (!hasMentorRole) {
        throw new Error('User does not have mentor permissions. User must have "Mentorship Coordinator" RBAC role or "Mentor" referee capability.');
      }

    } catch (error: any) {
      console.error(`Error validating mentor eligibility for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check for existing mentorship relationships
   * @private
   * @param mentorId - Mentor user ID
   * @param menteeId - Mentee user ID
   * @throws Error if relationship already exists
   */
  private async checkExistingRelationship(mentorId: string, menteeId: string): Promise<void> {
    try {
      const existingMentorship = await this.db('mentorships')
        .where('mentor_id', mentorId)
        .where('mentee_id', menteeId)
        .whereIn('status', ['active', 'paused'])
        .first() as MentorshipRecord | undefined;

      if (existingMentorship) {
        throw new Error(`Active mentorship relationship already exists between these users (Status: ${existingMentorship.status})`);
      }

      // Check for recent completed mentorships (within last 30 days)
      const recentCompleted = await this.db('mentorships')
        .where('mentor_id', mentorId)
        .where('mentee_id', menteeId)
        .where('status', 'completed')
        .where('end_date', '>=', this.db.raw("CURRENT_DATE - INTERVAL '30 days'"))
        .first();

      if (recentCompleted) {
        throw new Error('Cannot create new mentorship: A mentorship between these users was completed within the last 30 days');
      }

    } catch (error: any) {
      console.error(`Error checking existing relationship ${mentorId} -> ${menteeId}:`, error);
      throw error;
    }
  }

  /**
   * Validate that both users exist and mentee is eligible
   * @private
   * @param mentorId - Mentor user ID
   * @param menteeId - Mentee user ID
   * @throws Error if validation fails
   */
  private async validateUsers(mentorId: string, menteeId: string): Promise<void> {
    try {
      // Check if both users exist
      const [mentor, mentee] = await Promise.all([
        this.db('users').where('id', mentorId).first() as Promise<User | undefined>,
        this.db('users').where('id', menteeId).first() as Promise<User | undefined>
      ]);

      if (!mentor) {
        throw new Error('Mentor user not found');
      }

      if (!mentee) {
        throw new Error('Mentee user not found');
      }

      // Verify mentee is a referee (either role='referee' or has referee roles)
      const isReferee = mentee.role === 'referee' ||
        await this.db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', menteeId)
          .where('roles.category', 'referee_type')
          .where('user_roles.is_active', true)
          .first();

      if (!isReferee) {
        throw new Error('Mentee must be a referee to participate in mentorship program');
      }

    } catch (error: any) {
      console.error(`Error validating users ${mentorId}, ${menteeId}:`, error);
      throw error;
    }
  }

  /**
   * Find available mentors for a mentee
   * @param menteeId - Mentee user ID
   * @param options - Query options
   * @returns Available mentors
   */
  async findAvailableMentors(menteeId: string, options: Record<string, any> = {}): Promise<AvailableMentor[]> {
    try {
      // Get users who have mentor capability and are not already mentoring this mentee
      const availableMentors = await this.db('users')
        .select(
          'users.id',
          'users.name',
          'users.email',
          'users.phone'
        )
        .where(function() {
          // Users with Mentorship Coordinator RBAC role
          this.whereExists(function() {
            this.select('*')
              .from('user_roles')
              .join('roles', 'user_roles.role_id', 'roles.id')
              .whereRaw('user_roles.user_id = users.id')
              .where('roles.name', 'Mentorship Coordinator')
              .where('user_roles.is_active', true)
              .where('roles.is_active', true);
          })
          // OR users with mentorship permission through RBAC
          .orWhereExists(function() {
            this.select('*')
              .from('user_roles as ur')
              .join('roles as r', 'ur.role_id', 'r.id')
              .join('role_permissions as rp', 'r.id', 'rp.role_id')
              .join('permissions as p', 'rp.permission_id', 'p.id')
              .whereRaw('ur.user_id = users.id')
              .where('p.name', 'mentorship.provide')
              .where('ur.is_active', true);
          });
        })
        .whereNotExists(function() {
          // Exclude users already mentoring this mentee
          this.select('*')
            .from('mentorships')
            .whereRaw('mentorships.mentor_id = users.id')
            .where('mentee_id', menteeId)
            .whereIn('status', ['active', 'paused']);
        })
        .where('users.id', '!=', menteeId) // Can't mentor yourself
        .orderBy('users.name') as AvailableMentor[];

      return availableMentors;
    } catch (error: any) {
      console.error(`Error finding available mentors for mentee ${menteeId}:`, error);
      throw new Error(`Failed to find available mentors: ${error.message}`);
    }
  }

  /**
   * Hook called after mentorship creation
   * @param mentorship - Created mentorship
   * @param options - Creation options
   */
  async afterCreate(mentorship: MentorshipRecord, options: Record<string, any>): Promise<void> {
    if (this.options.enableAuditTrail) {
      console.log(`Mentorship relationship created: ${mentorship.mentor_id} -> ${mentorship.mentee_id} (${mentorship.id})`);
    }
  }

  /**
   * Hook called after mentorship update
   * @param mentorship - Updated mentorship
   * @param previousMentorship - Previous mentorship state
   * @param options - Update options
   */
  async afterUpdate(
    mentorship: MentorshipRecord,
    previousMentorship: MentorshipRecord,
    options: Record<string, any>
  ): Promise<void> {
    if (this.options.enableAuditTrail && previousMentorship.status !== mentorship.status) {
      console.log(`Mentorship ${mentorship.id} status changed: ${previousMentorship.status} -> ${mentorship.status}`);
    }
  }
}

export default MentorshipService;