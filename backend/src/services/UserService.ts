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
  availability_strategy?: AvailabilityStrategy;
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
   * Enhance user data with new roles and referee profile
   */
  async enhanceUserWithRoles(user: User): Promise<AuthenticatedUser> {
    if (!user) return user as unknown as AuthenticatedUser;
    
    const roles = await this.getUserRoles(user.id);
    const isReferee = roles.some(r => (r as any).category === 'referee_type');

    let refereeData: Partial<EnhancedUser> = {};
    if (isReferee) {
      // Lazy load referee service to avoid circular dependency
      if (!this._refereeService) {
        const RefereeService = require('./RefereeService');
        this._refereeService = new RefereeService(this.db);
      }

      try {
        const profile = await this._refereeService.getRefereeProfile(user.id);
        refereeData = {
          referee_profile: profile,
          is_referee: true
        };
      } catch (error) {
        console.warn(`Failed to get referee profile for user ${user.id}:`, (error as Error).message);
        refereeData = {
          referee_profile: null,
          is_referee: true
        };
      }
    }

    return {
      ...user,
      roles: roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: (r as any).category,
        referee_config: (r as any).referee_config
      } as any)),
      // Keep legacy role for backward compatibility
      legacy_role: user.role,
      permissions: [], // Will be populated by auth middleware
      resource_permissions: {},
      ...refereeData
    } as unknown as AuthenticatedUser;
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
        availability_strategy: AvailabilityStrategy.WHITELIST,
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

      // Get referee roles for this user
      const refereeRoles = await (this.db('user_referee_roles') as any)
        .join('referee_roles', 'user_referee_roles.referee_role_id', 'referee_roles.id')
        .select(
          'referee_roles.name',
          'referee_roles.description',
          'referee_roles.permissions',
          'user_referee_roles.assigned_at',
          'user_referee_roles.is_active'
        )
        .where('user_referee_roles.user_id', user.id)
        .where('user_referee_roles.is_active', true)
        .where('referee_roles.is_active', true);

      user.referee_roles = refereeRoles.map(role => ({
        ...role,
        permissions: typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions
      })) as RefereeRole[];
      
      // Add computed fields for easier access
      user.role_names = refereeRoles.map(role => role.name);
      user.can_evaluate = refereeRoles.some(role => {
        const permissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;
        return permissions.can_evaluate;
      });
      user.can_mentor = refereeRoles.some(role => {
        const permissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;
        return permissions.can_mentor;
      });

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
   * Assign role to referee
   */
  async assignRefereeRole(userId: UUID, roleName: string, assignedBy: UUID | null): Promise<any> {
    try {
      // Verify user is a referee
      const user = await this.findById(userId, { select: ['id', 'role'] });
      if (!user || user.role !== 'referee') {
        throw new Error('User is not a referee');
      }

      // Get the role
      const role = await this.db('referee_roles')
        .where('name', roleName)
        .where('is_active', true)
        .first();

      if (!role) {
        throw new Error(`Role '${roleName}' not found or inactive`);
      }

      // Check if already assigned
      const existingAssignment = await this.db('user_referee_roles')
        .where('user_id', userId)
        .where('referee_role_id', role.id)
        .where('is_active', true)
        .first();

      if (existingAssignment) {
        throw new Error(`User already has role '${roleName}'`);
      }

      // Assign role
      const assignment = await this.db('user_referee_roles').insert({
        id: this.db.raw('gen_random_uuid()'),
        user_id: userId,
        referee_role_id: role.id,
        assigned_by: assignedBy,
        assigned_at: new Date(),
        is_active: true
      }).returning('*');

      return assignment[0];
    } catch (error) {
      console.error(`Error assigning role ${roleName} to user ${userId}:`, error);
      throw new Error(`Failed to assign role: ${(error as Error).message}`);
    }
  }

  /**
   * Remove role from referee
   */
  async removeRefereeRole(userId: UUID, roleName: string): Promise<boolean> {
    try {
      // Get the role
      const role = await this.db('referee_roles')
        .where('name', roleName)
        .first();

      if (!role) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Deactivate assignment
      const result = await this.db('user_referee_roles')
        .where('user_id', userId)
        .where('referee_role_id', role.id)
        .update({ is_active: false });

      return result > 0;
    } catch (error) {
      console.error(`Error removing role ${roleName} from user ${userId}:`, error);
      throw new Error(`Failed to remove role: ${(error as Error).message}`);
    }
  }

  /**
   * Hook called after user creation
   */
  protected async afterCreate(user: User, options: QueryOptions): Promise<void> {
    if (this.options.enableAuditTrail) {
      console.log(`User created: ${user.id} (${user.role})`);
    }
    
    // If creating a referee, assign default role
    if (user.role === 'referee') {
      try {
        await this.assignRefereeRole(user.id, 'Referee', null);
      } catch (error) {
        console.warn(`Failed to assign default role to new referee ${user.id}:`, (error as Error).message);
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
