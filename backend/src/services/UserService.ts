/**
 * UserService - User and referee management service (TypeScript version)
 * 
 * This service extends BaseService to provide specialized user and referee
 * management operations, including role-based queries, availability updates,
 * and referee-specific data handling.
 */

import { BaseService, QueryOptions, ServiceOptions } from './BaseService';
import { Database, User, RoleEntity, AuthenticatedUser, UUID, UserRole, AvailabilityStrategy } from '../types';
import * as bcrypt from 'bcryptjs';

// Additional types specific to UserService
export interface RefereeRole {
  id: UUID;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  assigned_at: string;
  is_active: boolean;
}

export interface EnhancedUser extends User {
  roles: RoleEntity[];
  legacy_role: string;
  referee_profile?: any;
  is_referee?: boolean;
  referee_level?: string | null;
  should_display_white_whistle?: boolean;
  referee_roles?: RefereeRole[];
  role_names?: string[];
  can_evaluate?: boolean;
  can_mentor?: boolean;
  level_name?: string;
  allowed_divisions?: string[];
  min_experience_years?: number;
  level_pay_rate?: number;
  recent_assignments?: any[];
  assignment_stats?: {
    total: number;
    accepted: number;
    declined: number;
    completed: number;
    total_earnings: number;
  };
}

export interface BulkUpdateResult {
  successful: Array<{ id: UUID; user: User }>;
  failed: Array<{ id: UUID; error: string }>;
  total: number;
}

export interface CreateRefereeData {
  name: string;
  email: string;
  postal_code: string;
  password?: string;
  phone?: string;
  max_distance?: number;
  wage_per_game?: number;
}

export class UserService extends BaseService<User> {
  private _refereeService?: any; // Lazy loaded to avoid circular dependency

  constructor(db: Database) {
    super('users', db, {
      defaultOrderBy: 'name',
      defaultOrderDirection: 'asc',
      enableAuditTrail: true
    } as ServiceOptions);
  }

  /**
   * Find users by role with optional filters
   */
  async findByRole(
    role: string, 
    filters: Partial<User> = {}, 
    options: QueryOptions = {}
  ): Promise<EnhancedUser[]> {
    try {
      const conditions = { role: role as UserRole, ...filters };
      
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
        return await Promise.all(users.map(user => this.enhanceRefereeData(user as EnhancedUser)));
      }
      
      return users as EnhancedUser[];
    } catch (error) {
      console.error(`Error finding users by role ${role}:`, error);
      throw new Error(`Failed to find users by role: ${(error as Error).message}`);
    }
  }

  /**
   * Update user availability status
   */
  async updateAvailability(
    userId: UUID, 
    isAvailable: boolean, 
    options: QueryOptions = {}
  ): Promise<User> {
    try {
      // Validate that user exists and is a referee
      const user = await this.findById(userId, { select: ['id', 'role'] });
      
      if (!user) {
        throw new Error(`User not found with id: ${userId}`);
      }
      
      if (user.role !== UserRole.REFEREE) {
        throw new Error('Only referees can have their availability updated');
      }
      
      const updatedUser = await this.update(userId, { 
        is_available: isAvailable,
        availability_updated_at: new Date()
      } as Partial<User>, options);
      
      // Log availability change for audit purposes
      if (this.options.enableAuditTrail) {
        console.log(`User ${userId} availability changed to: ${isAvailable}`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error(`Error updating availability for user ${userId}:`, error);
      throw new Error(`Failed to update user availability: ${(error as Error).message}`);
    }
  }

  /**
   * Get user roles from the new RBAC system
   */
  async getUserRoles(userId: UUID): Promise<RoleEntity[]> {
    try {
      const roles = await (this.db('user_roles') as any)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.is_active', true)
        .select(
          'roles.id',
          'roles.name',
          'roles.description',
          'roles.category',
          'roles.referee_config'
        );

      return roles as RoleEntity[];
    } catch (error) {
      console.error(`Error getting roles for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if a user has the base Referee role
   * @param userId - The user ID to check
   * @returns True if user has Referee role
   */
  async isReferee(userId: UUID): Promise<boolean> {
    try {
      const result = await (this.db('user_roles') as any)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('roles.name', 'Referee')
        .where('user_roles.is_active', true)
        .first();

      return !!result;
    } catch (error) {
      console.error(`Error checking if user ${userId} is referee:`, error);
      return false;
    }
  }

  /**
   * Get the referee specialization level for a user
   * @param userId - The user ID to check
   * @returns The referee level name or null if not a specialized referee
   */
  async getRefereeLevel(userId: UUID): Promise<string | null> {
    try {
      const result = await (this.db('user_roles') as any)
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.is_active', true)
        .whereIn('roles.name', [
          'Head Referee',
          'Senior Referee',
          'Junior Referee',
          'Rookie Referee',
          'Referee Coach'
        ])
        .select('roles.name')
        .orderByRaw(`
          CASE roles.name
            WHEN 'Head Referee' THEN 1
            WHEN 'Senior Referee' THEN 2
            WHEN 'Junior Referee' THEN 3
            WHEN 'Rookie Referee' THEN 4
            WHEN 'Referee Coach' THEN 5
            ELSE 6
          END
        `)
        .first();

      return result?.name || null;
    } catch (error) {
      console.error(`Error getting referee level for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get all users who are referees
   * @param includeInactive - Whether to include inactive users
   * @returns Array of referee users with their roles
   */
  async getAllReferees(includeInactive: boolean = false): Promise<EnhancedUser[]> {
    try {
      let query = (this.db('users as u') as any)
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('r.name', 'Referee')
        .where('ur.is_active', true)
        .distinct('u.*');

      if (!includeInactive) {
        query = query.where('u.is_active', true);
      }

      const referees = await query;

      // Enhance each referee with all their roles
      return Promise.all(
        referees.map((ref: User) => this.enhanceUserWithRoles(ref))
      );
    } catch (error) {
      console.error('Error getting all referees:', error);
      return [];
    }
  }

  /**
   * Get referee roles for a user
   * @param userId - The user ID
   * @returns Array of referee-related roles
   */
  async getUserRefereeRoles(userId: UUID): Promise<RefereeRole[]> {
    try {
      const roles = await (this.db('user_roles as ur') as any)
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.user_id', userId)
        .where('ur.is_active', true)
        .where('r.name', 'LIKE', '%Referee%')
        .select(
          'r.id',
          'r.name',
          'r.description',
          'ur.assigned_at',
          (this.db.raw('COALESCE(ur.is_active, true) as is_active') as any)
        );

      // Return roles without permissions since they're managed by Cerbos
      return roles.map((role: any) => ({
        ...role,
        permissions: {} // Permissions managed by Cerbos
      }));
    } catch (error) {
      console.error(`Error getting referee roles for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if a user can mentor other referees
   * @param userId - The user ID to check
   * @returns True if user can mentor
   */
  async canMentor(userId: UUID): Promise<boolean> {
    try {
      const result = await (this.db('user_roles as ur') as any)
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.user_id', userId)
        .where('ur.is_active', true)
        .whereIn('r.name', ['Mentorship Coordinator', 'Super Admin'])
        .first();

      return !!result;
    } catch (error) {
      console.error(`Error checking if user ${userId} can mentor:`, error);
      return false;
    }
  }

  /**
   * Check if a user can evaluate other referees
   * @param userId - The user ID to check
   * @returns True if user can evaluate
   */
  async canEvaluate(userId: UUID): Promise<boolean> {
    try {
      const result = await (this.db('user_roles as ur') as any)
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.user_id', userId)
        .where('ur.is_active', true)
        .whereIn('r.name', ['Senior Referee', 'Head Referee', 'Referee Coach', 'Super Admin'])
        .first();

      return !!result;
    } catch (error) {
      console.error(`Error checking if user ${userId} can evaluate:`, error);
      return false;
    }
  }

  /**
   * Enhance a user object with their roles and referee information
   * @param user - The base user object
   * @returns Enhanced user with roles and computed properties
   */
  async enhanceUserWithRoles(user: User): Promise<EnhancedUser> {
    if (!user) {return user as unknown as EnhancedUser;}

    try {
      // Get all roles for the user
      const roles = await this.getUserRoles(user.id);

      // Compute is_referee from roles (not stored in database)
      const isReferee = roles.some(r => r.name === 'Referee');

      // Get referee level if applicable
      const refereeLevel = isReferee ? await this.getRefereeLevel(user.id) : null;

      // Get referee-specific roles if applicable
      const refereeRoles = isReferee ? await this.getUserRefereeRoles(user.id) : [];

      // Check special capabilities
      const canMentorUser = isReferee ? await this.canMentor(user.id) : false;
      const canEvaluateUser = isReferee ? await this.canEvaluate(user.id) : false;

      // Build enhanced user object
      const enhancedUser: EnhancedUser = {
        ...user,
        roles,
        legacy_role: user.role || 'user', // Keep for backward compatibility
        is_referee: isReferee, // Computed property
        referee_level: refereeLevel,
        referee_roles: refereeRoles,
        role_names: roles.map(r => r.name),
        can_mentor: canMentorUser,
        can_evaluate: canEvaluateUser,
        // Keep white_whistle for UI display if needed
        should_display_white_whistle: refereeLevel === 'Senior Referee' ||
                                      refereeLevel === 'Head Referee'
      };

      // Add referee profile data if user is a referee
      if (isReferee) {
        // Check if referees table exists
        try {
          const refereeProfile = await (this.db('referees') as any)
            .where('user_id', user.id)
            .first();

          if (refereeProfile) {
            enhancedUser.referee_profile = refereeProfile;
          }
        } catch (error) {
          // Table might not exist, continue without profile
          console.warn(`Referees table not found or error accessing it for user ${user.id}`);
        }
      }

      return enhancedUser;
    } catch (error) {
      console.error(`Error enhancing user ${user.id}:`, error);
      // Return user with minimal enhancement on error
      return {
        ...user,
        roles: [],
        legacy_role: user.role || 'user',
        is_referee: false,
        role_names: [],
        referee_roles: [],
        can_mentor: false,
        can_evaluate: false
      } as EnhancedUser;
    }
  }

  /**
   * Get user with complete referee details including assignments
   */
  async getUserWithRefereeDetails(userId: UUID, options: { assignmentLimit?: number } = {}): Promise<EnhancedUser> {
    try {
      // Get user with referee level information
      const user = await (this.db('users') as any)
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

      const enhancedUser = user as EnhancedUser;

      // If user is a referee, get additional referee-specific data
      if (user.role === 'referee') {
        // Enhance with white whistle display logic and roles
        await this.enhanceRefereeData(enhancedUser);

        // Get recent assignments
        const recentAssignments = await (this.db('game_assignments') as any)
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
        const assignmentStats = await (this.db('game_assignments') as any)
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
        enhancedUser.recent_assignments = recentAssignments;
        enhancedUser.assignment_stats = {
          total: parseInt((assignmentStats as any).total_assignments) || 0,
          accepted: parseInt((assignmentStats as any).accepted_assignments) || 0,
          declined: parseInt((assignmentStats as any).declined_assignments) || 0,
          completed: parseInt((assignmentStats as any).completed_assignments) || 0,
          total_earnings: parseFloat((assignmentStats as any).total_earnings) || 0
        };
      }

      return enhancedUser;
    } catch (error) {
      console.error(`Error getting user with referee details ${userId}:`, error);
      throw new Error(`Failed to get user details: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk update multiple users efficiently
   */
  async bulkUpdateUsers(
    updates: Array<{ id: UUID; data: Partial<User> }>, 
    options: QueryOptions = {}
  ): Promise<BulkUpdateResult> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required and cannot be empty');
    }

    if (updates.length > 100) {
      throw new Error('Bulk update limited to 100 users at once');
    }

    return await this.withTransaction(async (trx) => {
      const results: BulkUpdateResult = {
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
            error: (error as Error).message
          });
        }
      }

      return results;
    });
  }

  /**
   * Create a new referee with proper defaults
   */
  async createReferee(refereeData: CreateRefereeData, options: QueryOptions = {}): Promise<User> {
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
      const refereeWithDefaults: Partial<User> = {
        role: UserRole.REFEREE,
        is_available: true,
        max_distance: 25,
        wage_per_game: 0,
        ...refereeData,
        // Hash password if provided, otherwise set a temporary one
        password_hash: refereeData.password
          ? await bcrypt.hash(refereeData.password, 12)
          : await bcrypt.hash(`temp_password_${Date.now()}`, 12)
      };

      const referee = await this.create(refereeWithDefaults, options);
      
      // Remove password hash from returned object
      const { password_hash, ...refereeWithoutPassword } = referee;
      
      return refereeWithoutPassword as User;
    } catch (error) {
      console.error('Error creating referee:', error);
      throw new Error(`Failed to create referee: ${(error as Error).message}`);
    }
  }

  /**
   * Get all referees with filtering and pagination
   * @param filters - Optional filters for the query
   * @returns Paginated referee results
   */
  async getReferees(filters?: {
    level?: string;
    available?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: EnhancedUser[], total: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const offset = (page - 1) * limit;

      // Start with base query for all referees
      let query = (this.db('users as u') as any)
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('r.name', 'Referee')
        .where('ur.is_active', true);

      // Count query (before pagination)
      let countQuery = (this.db('users as u') as any)
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('r.name', 'Referee')
        .where('ur.is_active', true);

      // Apply filters
      if (filters?.available !== undefined) {
        query = query.where('u.is_available', filters.available);
        countQuery = countQuery.where('u.is_available', filters.available);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.where('u.name', 'ILIKE', searchTerm)
            .orWhere('u.email', 'ILIKE', searchTerm);
        });
        countQuery = countQuery.where(function() {
          this.where('u.name', 'ILIKE', searchTerm)
            .orWhere('u.email', 'ILIKE', searchTerm);
        });
      }

      // Filter by referee level if specified
      if (filters?.level) {
        // Need to join again to check for specialization role
        query = query
          .join('user_roles as ur2', 'u.id', 'ur2.user_id')
          .join('roles as r2', 'ur2.role_id', 'r2.id')
          .where('ur2.is_active', true)
          .where('r2.name', filters.level);

        countQuery = countQuery
          .join('user_roles as ur2', 'u.id', 'ur2.user_id')
          .join('roles as r2', 'ur2.role_id', 'r2.id')
          .where('ur2.is_active', true)
          .where('r2.name', filters.level);
      }

      // Get total count
      const [{ count }] = await countQuery
        .countDistinct('u.id as count');

      // Get paginated results
      const referees = await query
        .distinct('u.*')
        .orderBy('u.name', 'asc')
        .limit(limit)
        .offset(offset);

      // Enhance all referees with their roles
      const enhancedReferees = await Promise.all(
        referees.map((ref: User) => this.enhanceUserWithRoles(ref))
      );

      return {
        data: enhancedReferees,
        total: parseInt(count as string, 10)
      };
    } catch (error) {
      console.error('Error getting referees with filters:', error);
      return {
        data: [],
        total: 0
      };
    }
  }

  /**
   * Find available referees for a specific date/time
   */
  async findAvailableReferees(
    gameDate: string, 
    gameTime: string, 
    options: { level?: string; maxDistance?: number; location?: string } = {}
  ): Promise<EnhancedUser[]> {
    try {
      const { level, maxDistance, location } = options;

      let query = (this.db('users') as any)
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

      return availableReferees as EnhancedUser[];
    } catch (error) {
      console.error(`Error finding available referees for ${gameDate} ${gameTime}:`, error);
      throw new Error(`Failed to find available referees: ${(error as Error).message}`);
    }
  }

  /**
   * Enhance referee data with white whistle display logic and roles
   */
  async enhanceRefereeData(user: EnhancedUser): Promise<EnhancedUser> {
    try {
      // Determine white whistle display based on level and individual flag
      user.should_display_white_whistle = this.shouldDisplayWhiteWhistle(
        (user as any).new_referee_level || user.level_name,
        (user as any).is_white_whistle
      );

      // Use the new getUserRefereeRoles method instead of direct table query
      const refereeRoles = await this.getUserRefereeRoles(user.id);

      user.referee_roles = refereeRoles;

      // Add computed fields for easier access
      user.role_names = refereeRoles.map(role => role.name);
      user.can_evaluate = await this.canEvaluate(user.id);
      user.can_mentor = await this.canMentor(user.id);

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
   */
  shouldDisplayWhiteWhistle(level?: string, isWhiteWhistle?: boolean): boolean {
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
   */
  async updateRefereeLevel(
    userId: UUID, 
    newLevel: string, 
    isWhiteWhistle: boolean | null = null
  ): Promise<User> {
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
      let finalWhiteWhistleStatus: boolean;
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
      default:
        finalWhiteWhistleStatus = false;
      }

      // Update user record
      const updatedUser = await this.update(userId, {
        new_referee_level: newLevel,
        referee_level_id: refereeLevel.id,
        is_white_whistle: finalWhiteWhistleStatus
      } as Partial<User>);

      return updatedUser;
    } catch (error) {
      console.error(`Error updating referee level for user ${userId}:`, error);
      throw new Error(`Failed to update referee level: ${(error as Error).message}`);
    }
  }

  /**
   * Assign a referee role to a user
   * @param userId - The user to assign role to
   * @param roleName - The referee role name
   * @param assignedBy - The user making the assignment
   */
  async assignRefereeRole(
    userId: UUID,
    roleName: 'Rookie Referee' | 'Junior Referee' | 'Senior Referee' | 'Head Referee' | 'Referee Coach',
    assignedBy: UUID
  ): Promise<void> {
    try {
      // First ensure user has base Referee role
      const hasBaseRole = await this.isReferee(userId);
      if (!hasBaseRole) {
        const refereeRole = await (this.db('roles') as any)
          .where('name', 'Referee')
          .first();

        if (refereeRole) {
          await (this.db('user_roles') as any).insert({
            user_id: userId,
            role_id: refereeRole.id,
            assigned_at: (this.db.fn.now() as any),
            assigned_by: assignedBy,
            is_active: true
          }).onConflict(['user_id', 'role_id']).ignore();
        }
      }

      // Get the specialization role
      const role = await (this.db('roles') as any)
        .where('name', roleName)
        .first();

      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      // Remove other referee specialization roles (user can only have one)
      const otherRefereeRoles = await (this.db('roles') as any)
        .whereIn('name', [
          'Rookie Referee',
          'Junior Referee',
          'Senior Referee',
          'Head Referee',
          'Referee Coach'
        ])
        .where('name', '!=', roleName)
        .select('id');

      if (otherRefereeRoles.length > 0) {
        await (this.db('user_roles') as any)
          .where('user_id', userId)
          .whereIn('role_id', otherRefereeRoles.map(r => r.id))
          .delete();
      }

      // Assign the new specialization role
      await (this.db('user_roles') as any).insert({
        user_id: userId,
        role_id: role.id,
        assigned_at: (this.db.fn.now() as any),
        assigned_by: assignedBy,
        is_active: true
      }).onConflict(['user_id', 'role_id']).ignore();
    } catch (error) {
      console.error(`Error assigning role ${roleName} to user ${userId}:`, error);
      throw new Error(`Failed to assign role: ${(error as Error).message}`);
    }
  }

  /**
   * Promote a referee to the next level
   * @param userId - The referee to promote
   * @param promotedBy - The user making the promotion
   */
  async promoteReferee(userId: UUID, promotedBy: UUID): Promise<string> {
    try {
      const currentLevel = await this.getRefereeLevel(userId);

      let newLevel: string;
      switch (currentLevel) {
        case 'Rookie Referee':
          newLevel = 'Junior Referee';
          break;
        case 'Junior Referee':
          newLevel = 'Senior Referee';
          break;
        case 'Senior Referee':
          newLevel = 'Head Referee';
          break;
        default:
          throw new Error('Cannot promote from current level');
      }

      await this.assignRefereeRole(
        userId,
        newLevel as any,
        promotedBy
      );

      return newLevel;
    } catch (error) {
      console.error(`Error promoting referee ${userId}:`, error);
      throw new Error(`Failed to promote referee: ${(error as Error).message}`);
    }
  }

  /**
   * Remove role from referee (legacy method - updated to use new role system)
   */
  async removeRefereeRole(userId: UUID, roleName: string): Promise<boolean> {
    try {
      // Get the role
      const role = await (this.db('roles') as any)
        .where('name', roleName)
        .first();

      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Remove assignment
      const result = await (this.db('user_roles') as any)
        .where('user_id', userId)
        .where('role_id', role.id)
        .delete();

      return result > 0;
    } catch (error) {
      console.error(`Error removing role ${roleName} from user ${userId}:`, error);
      throw new Error(`Failed to remove role: ${(error as Error).message}`);
    }
  }

  /**
   * Get eligible referees for a game assignment
   * @param gameId - The game ID
   * @returns Array of eligible referees
   */
  async getEligibleRefereesForGame(gameId: UUID): Promise<EnhancedUser[]> {
    try {
      // Instead of querying user_referee_roles table
      const referees = await (this.db('users as u') as any)
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .leftJoin('game_assignments as ga', function() {
          this.on('u.id', 'ga.referee_id')
            .andOn('ga.game_id', (this as any).db.raw('?', [gameId]));
        })
        .where('r.name', 'Referee')
        .where('ur.is_active', true)
        .where('u.is_available', true)
        .whereNull('ga.id') // Not already assigned to this game
        .distinct('u.*');

      return Promise.all(
        referees.map((ref: User) => this.enhanceUserWithRoles(ref))
      );
    } catch (error) {
      console.error(`Error getting eligible referees for game ${gameId}:`, error);
      return [];
    }
  }

  /**
   * Get mentees for a mentor
   * @param mentorId - The mentor's user ID
   * @returns Array of mentee users
   */
  async getMentees(mentorId: UUID): Promise<EnhancedUser[]> {
    try {
      // Check if user can mentor
      const canMentorUser = await this.canMentor(mentorId);
      if (!canMentorUser) {
        return [];
      }

      // Get mentees from mentorship relationships
      const mentees = await (this.db('mentorships as m') as any)
        .join('users as u', 'm.mentee_id', 'u.id')
        .where('m.mentor_id', mentorId)
        .where('m.is_active', true)
        .select('u.*');

      return Promise.all(
        mentees.map((mentee: User) => this.enhanceUserWithRoles(mentee))
      );
    } catch (error) {
      console.error(`Error getting mentees for mentor ${mentorId}:`, error);
      return [];
    }
  }

  /**
   * Hook called after user creation
   */
  protected async afterCreate(user: User, options: QueryOptions): Promise<void> {
    if (this.options.enableAuditTrail) {
      console.log(`User created: ${user.id} (${user.role})`);
    }

    // If creating a referee, assign base Referee role and default specialization
    if (user.role === 'referee') {
      try {
        // Assign base Referee role first
        const refereeRole = await (this.db('roles') as any)
          .where('name', 'Referee')
          .first();

        if (refereeRole) {
          await (this.db('user_roles') as any).insert({
            user_id: user.id,
            role_id: refereeRole.id,
            assigned_at: (this.db.fn.now() as any),
            assigned_by: null,
            is_active: true
          }).onConflict(['user_id', 'role_id']).ignore();

          // Assign default rookie level
          await this.assignRefereeRole(user.id, 'Rookie Referee', user.id);
        }
      } catch (error) {
        console.warn(`Failed to assign default roles to new referee ${user.id}:`, (error as Error).message);
      }
    }
  }

  /**
   * Hook called after user update
   */
  protected async afterUpdate(user: User, previousUser: User, options: QueryOptions): Promise<void> {
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
   */
  private _getChangedFields(before: User, after: User): string[] {
    const changes: string[] = [];
    const fields: (keyof User)[] = ['name', 'email', 'phone', 'is_available', 'wage_per_game', 'max_distance'];
    
    fields.forEach(field => {
      if (before[field] !== after[field]) {
        changes.push(field as string);
      }
    });
    
    return changes;
  }
}
export default UserService;
