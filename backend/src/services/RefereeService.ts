/**
 * RefereeService - Enhanced Referee Management Service
 *
 * This service builds on the existing RBAC system to provide comprehensive
 * referee management including type-based roles, individual profiles, and
 * business logic for referee operations.
 */

import { BaseService, ServiceOptions, QueryOptions } from './BaseService';
import { Database, UUID, Timestamp, PaginatedResult, Knex } from '../types';

// Referee-specific type definitions
export interface RefereeConfig {
  default_wage_rate?: number;
  evaluation_level?: string;
  mentorship_level?: string;
  [key: string]: any;
}

export interface RoleWithConfig {
  id: UUID;
  name: string;
  description?: string;
  category: string;
  referee_config?: RefereeConfig;
  is_active: boolean;
  [key: string]: any;
}

export interface RefereeProfileEntity {
  id: UUID;
  user_id: UUID;
  wage_amount: number;
  certification_number?: string;
  certification_date?: Timestamp;
  certification_expiry?: Timestamp;
  certification_level?: string;
  emergency_contact?: string;
  special_qualifications?: string;
  notes?: string;
  is_white_whistle?: boolean;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: UUID;
  updated_by?: UUID;
}

export interface RefereeCapability {
  id: UUID;
  name: string;
  description?: string;
  config: RefereeConfig;
}

export interface RefereeProfileWithDetails extends RefereeProfileEntity {
  // User data (when includeUser option is used)
  name?: string;
  email?: string;
  phone?: string;
  is_available?: boolean;

  // Referee role information
  referee_type: RoleWithConfig | null;
  capabilities: RefereeCapability[];
  show_white_whistle: boolean;

  // Computed fields
  computed_fields: {
    type_config: RefereeConfig;
    capability_count: number;
    effective_wage: number;
    is_senior: boolean;
    is_junior: boolean;
    is_rookie: boolean;
  };
}

export interface RefereeProfileFilters {
  search?: string;
  wage_min?: number;
  wage_max?: number;
  experience_min?: number;
  is_white_whistle?: boolean;
}

export interface RefereeProfileGetOptions extends QueryOptions {
  includeUser?: boolean;
}

export interface UpdateWageOptions extends QueryOptions {
  notes?: string;
}

export interface ChangeRefereeTypeOptions extends QueryOptions {
  updateWageToDefault?: boolean;
}

export interface RefereeTypeChangeResult {
  message: string;
  changed: boolean;
  new_role?: string;
  previous_roles?: string[];
}

export interface CreateRefereeProfileData {
  wage_amount?: number;
  certification_number?: string;
  certification_date?: Timestamp;
  certification_expiry?: Timestamp;
  certification_level?: string;
  emergency_contact?: string;
  special_qualifications?: string;
  notes?: string;
  is_white_whistle?: boolean;
  [key: string]: any;
}

export interface RefereeType {
  id: UUID;
  name: string;
  description?: string;
  referee_config?: RefereeConfig;
  config: RefereeConfig;
}

export interface UserRoleEntity {
  id: UUID;
  user_id: UUID;
  role_id: UUID;
  assigned_by: UUID;
  assigned_at: Timestamp;
  is_active: boolean;
  expires_at?: Timestamp;
}

export default class RefereeService extends BaseService<RefereeProfileEntity> {
  private _userService: any = null;
  private _roleService: any = null;

  constructor(db: Database, options: ServiceOptions = {}) {
    super('referee_profiles', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true,
      throwOnNotFound: false,
      ...options
    });
  }

  /**
   * Get UserService instance (lazy loaded)
   * @private
   */
  private get userService(): any {
    if (!this._userService) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const UserService = require('./UserService');
      this._userService = new UserService(this.db);
    }
    return this._userService;
  }

  /**
   * Get RoleService instance (lazy loaded)
   * @private
   */
  private get roleService(): any {
    if (!this._roleService) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RoleService = require('./RoleService');
      this._roleService = new RoleService(this.db);
    }
    return this._roleService;
  }

  /**
   * Check if a user is a referee
   */
  async isReferee(userId: UUID): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.some(role => role.category === 'referee_type');
    } catch (error) {
      console.error(`Error checking if user ${userId} is referee:`, error);
      return false;
    }
  }

  /**
   * Get referee type role for a user (Senior/Junior/Rookie)
   */
  async getRefereeType(userId: UUID): Promise<RoleWithConfig | null> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.find(role => role.category === 'referee_type') || null;
    } catch (error) {
      console.error(`Error getting referee type for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get referee capability roles for a user (Evaluator/Mentor/Inspector)
   */
  async getUserRefereeCapabilities(userId: UUID): Promise<RoleWithConfig[]> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.filter(role => role.category === 'referee_capability');
    } catch (error) {
      console.error(`Error getting referee capabilities for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user roles with category information
   * @private
   */
  private async getUserRoles(userId: UUID): Promise<RoleWithConfig[]> {
    try {
      const roles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.is_active', true)
        .select('roles.*');

      return roles as RoleWithConfig[];
    } catch (error) {
      console.error(`Error getting roles for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Determine if white whistle should be displayed for a referee
   */
  async shouldDisplayWhiteWhistle(
    userId: UUID,
    refereeType: RoleWithConfig | null = null,
    profile: RefereeProfileEntity | null = null
  ): Promise<boolean> {
    try {
      // Use provided data or fetch if not provided
      if (!refereeType) {
        refereeType = await this.getRefereeType(userId);
      }
      if (!refereeType) return false;

      if (!profile) {
        // Get profile data directly from DB without calling getRefereeProfile to avoid circular dependency
        profile = await this.db('referee_profiles')
          .where('user_id', userId)
          .where('is_active', true)
          .first() as RefereeProfileEntity | null;
      }

      // Business logic for white whistle display
      switch (refereeType.name) {
        case 'Senior Referee':
          return false; // Senior referees never show white whistle

        case 'Rookie Referee':
          return true; // Rookie referees always show white whistle

        case 'Junior Referee':
          // Junior referees show white whistle based on individual flag
          return profile?.is_white_whistle || false;

        default:
          return false;
      }
    } catch (error) {
      console.error(`Error determining white whistle display for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get complete referee profile with computed fields
   */
  async getRefereeProfile(
    userId: UUID,
    options: RefereeProfileGetOptions = {}
  ): Promise<RefereeProfileWithDetails | null> {
    try {
      // Get base profile
      const profiles = await this.findWhere({ user_id: userId, is_active: true });
      const profile = profiles[0] || null;

      if (!profile) {
        if (await this.isReferee(userId)) {
          // Referee exists but no profile - this shouldn't happen
          console.warn(`Referee ${userId} exists but has no profile`);
        }
        return null;
      }

      // Get referee type and capabilities
      const [refereeType, capabilities] = await Promise.all([
        this.getRefereeType(userId),
        this.getUserRefereeCapabilities(userId)
      ]);

      // Pass the referee type and profile to avoid circular dependency
      const showWhiteWhistle = await this.shouldDisplayWhiteWhistle(userId, refereeType, profile);

      // Include user data if requested
      let userData: Partial<RefereeProfileWithDetails> = {};
      if (options.includeUser) {
        const user = await this.db('users').where('id', userId).first();
        userData = {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
          is_available: user?.is_available
        };
      }

      const refereeCapabilities: RefereeCapability[] = capabilities.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        config: c.referee_config || {}
      }));

      return {
        ...profile,
        ...userData,
        referee_type: refereeType,
        capabilities: refereeCapabilities,
        show_white_whistle: showWhiteWhistle,
        computed_fields: {
          type_config: refereeType?.referee_config || {},
          capability_count: capabilities.length,
          effective_wage: profile.wage_amount,
          is_senior: refereeType?.name === 'Senior Referee',
          is_junior: refereeType?.name === 'Junior Referee',
          is_rookie: refereeType?.name === 'Rookie Referee'
        }
      } as RefereeProfileWithDetails;
    } catch (error) {
      console.error(`Error getting referee profile for user ${userId}:`, error);
      throw new Error(`Failed to get referee profile: ${(error as Error).message}`);
    }
  }

  /**
   * Update individual referee wage
   */
  async updateWage(
    userId: UUID,
    newWage: number,
    updatedBy: UUID,
    options: UpdateWageOptions = {}
  ): Promise<RefereeProfileEntity> {
    try {
      await this.validateReferee(userId);

      if (newWage <= 0) {
        throw new Error('Wage amount must be greater than zero');
      }

      if (newWage > 500) {
        throw new Error('Wage amount cannot exceed $500 per game');
      }

      const profiles = await this.findWhere({ user_id: userId, is_active: true });
      if (!profiles.length) {
        throw new Error('Referee profile not found');
      }

      const updatedProfile = await this.update(profiles[0].id, {
        wage_amount: newWage,
        notes: options.notes || profiles[0].notes
      }, {
        ...options,
        auditUserId: updatedBy
      });

      // Log wage change for audit
      console.log(`Referee ${userId} wage updated to $${newWage} by ${updatedBy}`);

      return updatedProfile;
    } catch (error) {
      console.error(`Error updating wage for referee ${userId}:`, error);
      throw new Error(`Failed to update referee wage: ${(error as Error).message}`);
    }
  }

  /**
   * Change referee type (role reassignment)
   */
  async changeRefereeType(
    userId: UUID,
    newTypeName: string,
    updatedBy: UUID,
    options: ChangeRefereeTypeOptions = {}
  ): Promise<RefereeTypeChangeResult> {
    const validTypes = ['Senior Referee', 'Junior Referee', 'Rookie Referee'];

    if (!validTypes.includes(newTypeName)) {
      throw new Error(`Invalid referee type: ${newTypeName}. Valid types: ${validTypes.join(', ')}`);
    }

    try {
      await this.validateReferee(userId);

      return await this.withTransaction(async (trx: Knex.Transaction) => {
        // Get current referee type role
        const currentRoles = await trx('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', userId)
          .where('roles.category', 'referee_type')
          .where('user_roles.is_active', true)
          .select('user_roles.*', 'roles.name');

        // Get new referee type role
        const newRole = await trx('roles')
          .where({ name: newTypeName, category: 'referee_type' })
          .first();

        if (!newRole) {
          throw new Error(`Referee type role not found: ${newTypeName}`);
        }

        // If user already has this role, no change needed
        if (currentRoles.some((r: any) => r.name === newTypeName)) {
          return { message: 'User already has this referee type', changed: false };
        }

        // Deactivate current referee type roles
        for (const currentRole of currentRoles) {
          await trx('user_roles')
            .where('id', currentRole.id)
            .update({ is_active: false });
        }

        // Add new referee type role
        await trx('user_roles').insert({
          user_id: userId,
          role_id: newRole.id,
          assigned_by: updatedBy,
          assigned_at: new Date(),
          is_active: true
        });

        // Update wage to default for new type if requested
        if (options.updateWageToDefault && newRole.referee_config?.default_wage_rate) {
          const profiles = await trx('referee_profiles')
            .where({ user_id: userId, is_active: true });

          if (profiles.length) {
            await trx('referee_profiles')
              .where('id', profiles[0].id)
              .update({
                wage_amount: newRole.referee_config.default_wage_rate,
                updated_at: new Date()
              });
          }
        }

        console.log(`Referee ${userId} type changed to ${newTypeName} by ${updatedBy}`);

        return {
          message: `Referee type changed to ${newTypeName}`,
          changed: true,
          new_role: newRole.name,
          previous_roles: currentRoles.map((r: any) => r.name)
        };
      });
    } catch (error) {
      console.error(`Error changing referee type for ${userId}:`, error);
      throw new Error(`Failed to change referee type: ${(error as Error).message}`);
    }
  }

  /**
   * Create referee profile when assigning first referee role
   */
  async createRefereeProfile(
    userId: UUID,
    refereeTypeRole: RoleWithConfig,
    initialData: CreateRefereeProfileData = {}
  ): Promise<RefereeProfileEntity> {
    try {
      const defaultWage = refereeTypeRole.referee_config?.default_wage_rate || 35.00;

      const profileData: Partial<RefereeProfileEntity> = {
        user_id: userId,
        wage_amount: initialData.wage_amount || defaultWage,
        certification_number: initialData.certification_number,
        certification_date: initialData.certification_date,
        certification_expiry: initialData.certification_expiry,
        certification_level: initialData.certification_level,
        emergency_contact: initialData.emergency_contact,
        special_qualifications: initialData.special_qualifications,
        notes: initialData.notes,
        is_active: true,
        ...initialData
      };

      const profile = await this.create(profileData);

      console.log(`Created referee profile for user ${userId} with type ${refereeTypeRole.name}`);

      return profile;
    } catch (error) {
      console.error(`Error creating referee profile for user ${userId}:`, error);
      throw new Error(`Failed to create referee profile: ${(error as Error).message}`);
    }
  }

  /**
   * Get all referee profiles with pagination and filtering
   */
  async getRefereeProfiles(
    filters: RefereeProfileFilters = {},
    page: number = 1,
    limit: number = 50,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<RefereeProfileWithDetails>> {
    try {
      // Build query with user joins
      let query = this.db('referee_profiles')
        .join('users', 'referee_profiles.user_id', 'users.id')
        .where('referee_profiles.is_active', true);

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('users.name', 'ilike', `%${filters.search}%`)
              .orWhere('users.email', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.wage_min !== undefined) {
        query = query.where('referee_profiles.wage_amount', '>=', filters.wage_min);
      }

      if (filters.wage_max !== undefined) {
        query = query.where('referee_profiles.wage_amount', '<=', filters.wage_max);
      }

      if (filters.experience_min !== undefined) {
        const currentYear = new Date().getFullYear();
        const maxStartYear = currentYear - filters.experience_min;
        query = query.where('users.year_started_refereeing', '<=', maxStartYear)
                    .whereNotNull('users.year_started_refereeing');
      }

      if (filters.is_white_whistle !== undefined) {
        query = query.where('referee_profiles.is_white_whistle', filters.is_white_whistle);
      }

      // Get total count
      const countQuery = query.clone().count('* as total').first();

      // Apply pagination and ordering
      const offset = (page - 1) * limit;
      query = query
        .select(
          'referee_profiles.*',
          'users.name',
          'users.email',
          'users.phone',
          'users.is_available'
        )
        .orderBy('users.name', 'asc')
        .limit(limit)
        .offset(offset);

      const [profiles, countResult] = await Promise.all([query, countQuery]);
      const total = parseInt((countResult as any).total);

      // Enhance profiles with role information
      const enhancedProfiles = await Promise.all(
        profiles.map(async (profile: any) => {
          const [refereeType, capabilities] = await Promise.all([
            this.getRefereeType(profile.user_id),
            this.getUserRefereeCapabilities(profile.user_id)
          ]);

          // Pass both refereeType and profile to avoid circular dependency
          const showWhiteWhistle = await this.shouldDisplayWhiteWhistle(profile.user_id, refereeType, profile);

          const refereeCapabilities: RefereeCapability[] = capabilities.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            config: c.referee_config || {}
          }));

          return {
            ...profile,
            referee_type: refereeType,
            capabilities: refereeCapabilities,
            show_white_whistle: showWhiteWhistle,
            computed_fields: {
              type_config: refereeType?.referee_config || {},
              capability_count: capabilities.length,
              effective_wage: profile.wage_amount,
              is_senior: refereeType?.name === 'Senior Referee',
              is_junior: refereeType?.name === 'Junior Referee',
              is_rookie: refereeType?.name === 'Rookie Referee'
            }
          } as RefereeProfileWithDetails;
        })
      );

      return {
        data: enhancedProfiles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting referee profiles:', error);
      throw new Error(`Failed to get referee profiles: ${(error as Error).message}`);
    }
  }

  /**
   * Validate that a user is a referee
   * @private
   */
  private async validateReferee(userId: UUID): Promise<void> {
    const isRef = await this.isReferee(userId);
    if (!isRef) {
      throw new Error('User is not a referee');
    }
  }

  /**
   * Get available referee types with their configurations
   */
  async getRefereeTypes(): Promise<RefereeType[]> {
    try {
      const types = await this.db('roles')
        .where('category', 'referee_type')
        .where('is_active', true)
        .select('id', 'name', 'description', 'referee_config')
        .orderBy('name');

      return types.map((type: any) => ({
        ...type,
        config: type.referee_config || {}
      })) as RefereeType[];
    } catch (error) {
      console.error('Error getting referee types:', error);
      throw new Error(`Failed to get referee types: ${(error as Error).message}`);
    }
  }

  /**
   * Get available referee capabilities with their configurations (static method)
   */
  async getAvailableRefereeCapabilities(): Promise<RefereeType[]> {
    try {
      const capabilities = await this.db('roles')
        .where('category', 'referee_capability')
        .where('is_active', true)
        .select('id', 'name', 'description', 'referee_config')
        .orderBy('name');

      return capabilities.map((cap: any) => ({
        ...cap,
        config: cap.referee_config || {}
      })) as RefereeType[];
    } catch (error) {
      console.error('Error getting referee capabilities:', error);
      throw new Error(`Failed to get referee capabilities: ${(error as Error).message}`);
    }
  }
}