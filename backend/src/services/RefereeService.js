/**
 * RefereeService - Enhanced Referee Management Service
 * 
 * This service builds on the existing RBAC system to provide comprehensive
 * referee management including type-based roles, individual profiles, and
 * business logic for referee operations.
 */

const BaseService = require('./BaseService');

class RefereeService extends BaseService {
  constructor(db) {
    super('referee_profiles', db, {
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableAuditTrail: true,
      throwOnNotFound: false
    });
    
    // Lazy load other services to avoid circular dependencies
    this._userService = null;
    this._roleService = null;
  }

  /**
   * Get UserService instance (lazy loaded)
   * @private
   */
  get userService() {
    if (!this._userService) {
      const UserService = require('./UserService');
      this._userService = new UserService(this.db);
    }
    return this._userService;
  }

  /**
   * Get RoleService instance (lazy loaded)
   * @private
   */
  get roleService() {
    if (!this._roleService) {
      const RoleService = require('./RoleService');
      this._roleService = new RoleService(this.db);
    }
    return this._roleService;
  }

  /**
   * Check if a user is a referee
   * @param {string} userId - User ID
   * @returns {boolean} True if user has any referee_type role
   */
  async isReferee(userId) {
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
   * @param {string} userId - User ID
   * @returns {Object|null} Referee type role object or null
   */
  async getRefereeType(userId) {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.find(role => role.category === 'referee_type') || null;
    } catch (error) {
      console.error(`Error getting referee type for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get referee capability roles (Evaluator/Mentor/Inspector)
   * @param {string} userId - User ID
   * @returns {Array} Array of capability role objects
   */
  async getRefereeCapabilities(userId) {
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
   * @param {string} userId - User ID
   * @returns {Array} Array of role objects with category
   */
  async getUserRoles(userId) {
    try {
      const roles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', userId)
        .where('user_roles.is_active', true)
        .select('roles.*');
      
      return roles;
    } catch (error) {
      console.error(`Error getting roles for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Determine if white whistle should be displayed for a referee
   * @param {string} userId - User ID
   * @param {Object} refereeType - Optional referee type to avoid circular call
   * @param {Object} profile - Optional profile data to avoid circular call
   * @returns {boolean} True if white whistle should be shown
   */
  async shouldDisplayWhiteWhistle(userId, refereeType = null, profile = null) {
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
          .first();
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
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object|null} Complete referee profile or null
   */
  async getRefereeProfile(userId, options = {}) {
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
        this.getRefereeCapabilities(userId)
      ]);
      
      // Pass the referee type and profile to avoid circular dependency
      const showWhiteWhistle = await this.shouldDisplayWhiteWhistle(userId, refereeType, profile);

      // Include user data if requested
      let userData = {};
      if (options.includeUser) {
        const user = await this.db('users').where('id', userId).first();
        userData = {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
          is_available: user?.is_available
        };
      }

      return {
        ...profile,
        ...userData,
        referee_type: refereeType,
        capabilities: capabilities.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          config: c.referee_config
        })),
        show_white_whistle: showWhiteWhistle,
        computed_fields: {
          type_config: refereeType?.referee_config || {},
          capability_count: capabilities.length,
          effective_wage: profile.wage_amount,
          is_senior: refereeType?.name === 'Senior Referee',
          is_junior: refereeType?.name === 'Junior Referee',
          is_rookie: refereeType?.name === 'Rookie Referee'
        }
      };
    } catch (error) {
      console.error(`Error getting referee profile for user ${userId}:`, error);
      throw new Error(`Failed to get referee profile: ${error.message}`);
    }
  }

  /**
   * Update individual referee wage
   * @param {string} userId - User ID
   * @param {number} newWage - New wage amount
   * @param {string} updatedBy - ID of user making the update
   * @param {Object} options - Update options
   * @returns {Object} Updated profile
   */
  async updateWage(userId, newWage, updatedBy, options = {}) {
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
      throw new Error(`Failed to update referee wage: ${error.message}`);
    }
  }

  /**
   * Change referee type (role reassignment)
   * @param {string} userId - User ID
   * @param {string} newTypeName - New referee type name
   * @param {string} updatedBy - ID of user making the update
   * @param {Object} options - Update options
   * @returns {Object} Operation result
   */
  async changeRefereeType(userId, newTypeName, updatedBy, options = {}) {
    const validTypes = ['Senior Referee', 'Junior Referee', 'Rookie Referee'];
    
    if (!validTypes.includes(newTypeName)) {
      throw new Error(`Invalid referee type: ${newTypeName}. Valid types: ${validTypes.join(', ')}`);
    }

    try {
      await this.validateReferee(userId);

      return await this.withTransaction(async (trx) => {
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
        if (currentRoles.some(r => r.name === newTypeName)) {
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
          previous_roles: currentRoles.map(r => r.name)
        };
      });
    } catch (error) {
      console.error(`Error changing referee type for ${userId}:`, error);
      throw new Error(`Failed to change referee type: ${error.message}`);
    }
  }

  /**
   * Create referee profile when assigning first referee role
   * @param {string} userId - User ID
   * @param {Object} refereeTypeRole - Referee type role object
   * @param {Object} initialData - Initial profile data
   * @returns {Object} Created profile
   */
  async createRefereeProfile(userId, refereeTypeRole, initialData = {}) {
    try {
      const defaultWage = refereeTypeRole.referee_config?.default_wage_rate || 35.00;

      const profileData = {
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
      throw new Error(`Failed to create referee profile: ${error.message}`);
    }
  }

  /**
   * Get all referee profiles with pagination and filtering
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @param {Object} options - Query options
   * @returns {Object} Paginated referee profiles with enhanced data
   */
  async getRefereeProfiles(filters = {}, page = 1, limit = 50, options = {}) {
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

      if (filters.wage_min) {
        query = query.where('referee_profiles.wage_amount', '>=', filters.wage_min);
      }

      if (filters.wage_max) {
        query = query.where('referee_profiles.wage_amount', '<=', filters.wage_max);
      }

      if (filters.experience_min) {
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
      const total = parseInt(countResult.total);

      // Enhance profiles with role information
      const enhancedProfiles = await Promise.all(
        profiles.map(async (profile) => {
          const [refereeType, capabilities] = await Promise.all([
            this.getRefereeType(profile.user_id),
            this.getRefereeCapabilities(profile.user_id)
          ]);
          
          // Pass both refereeType and profile to avoid circular dependency
          const showWhiteWhistle = await this.shouldDisplayWhiteWhistle(profile.user_id, refereeType, profile);

          return {
            ...profile,
            referee_type: refereeType,
            capabilities: capabilities.map(c => ({
              name: c.name,
              description: c.description
            })),
            show_white_whistle: showWhiteWhistle
          };
        })
      );

      return {
        data: enhancedProfiles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting referee profiles:', error);
      throw new Error(`Failed to get referee profiles: ${error.message}`);
    }
  }

  /**
   * Validate that a user is a referee
   * @private
   * @param {string} userId - User ID
   * @throws {Error} If user is not a referee
   */
  async validateReferee(userId) {
    const isRef = await this.isReferee(userId);
    if (!isRef) {
      throw new Error('User is not a referee');
    }
  }

  /**
   * Get available referee types with their configurations
   * @returns {Array} Available referee types
   */
  async getRefereeTypes() {
    try {
      const types = await this.db('roles')
        .where('category', 'referee_type')
        .where('is_active', true)
        .select('id', 'name', 'description', 'referee_config')
        .orderBy('name');

      return types.map(type => ({
        ...type,
        config: type.referee_config || {}
      }));
    } catch (error) {
      console.error('Error getting referee types:', error);
      throw new Error(`Failed to get referee types: ${error.message}`);
    }
  }

  /**
   * Get available referee capabilities with their configurations
   * @returns {Array} Available referee capabilities
   */
  async getRefereeCapabilities() {
    try {
      const capabilities = await this.db('roles')
        .where('category', 'referee_capability')
        .where('is_active', true)
        .select('id', 'name', 'description', 'referee_config')
        .orderBy('name');

      return capabilities.map(cap => ({
        ...cap,
        config: cap.referee_config || {}
      }));
    } catch (error) {
      console.error('Error getting referee capabilities:', error);
      throw new Error(`Failed to get referee capabilities: ${error.message}`);
    }
  }
}

module.exports = RefereeService;