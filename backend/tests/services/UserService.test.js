/**
 * UserService Unit Tests
 * 
 * Tests for the UserService class that provides user and referee management
 * operations, including role-based queries, availability updates, and
 * referee-specific data handling.
 */

const UserService = require('../../src/services/UserService');
const bcrypt = require('bcryptjs');

// Mock bcrypt
jest.mock('bcryptjs');

// Mock database
const mockDb = {
  transaction: jest.fn(),
  raw: jest.fn()
};

// Mock query builder
const mockQueryBuilder = {
  where: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
  returning: jest.fn(),
  first: jest.fn(),
  limit: jest.fn(),
  offset: jest.fn(),
  orderBy: jest.fn(),
  count: jest.fn(),
  leftJoin: jest.fn(),
  innerJoin: jest.fn(),
  join: jest.fn(),
  clone: jest.fn(),
  clearSelect: jest.fn(),
  whereIn: jest.fn(),
  whereNotExists: jest.fn(),
  whereRaw: jest.fn(),
  groupBy: jest.fn()
};

// Setup chainable mock methods
Object.keys(mockQueryBuilder).forEach(key => {
  mockQueryBuilder[key].mockReturnValue(mockQueryBuilder);
});

// Mock table function
const mockTable = jest.fn(() => mockQueryBuilder);
Object.setPrototypeOf(mockTable, mockDb);
Object.assign(mockTable, mockDb);

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockTable);
  });

  describe('Constructor', () => {
    it('should initialize with correct table and options', () => {
      expect(userService.tableName).toBe('users');
      expect(userService.db).toBe(mockTable);
      expect(userService.options.defaultOrderBy).toBe('name');
      expect(userService.options.enableAuditTrail).toBe(true);
    });
  });

  describe('findByRole', () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', role: 'referee' },
      { id: '2', name: 'Jane Smith', role: 'referee' }
    ];

    beforeEach(() => {
      mockQueryBuilder.mockResolvedValue(mockUsers);
    });

    it('should find users by role', async () => {
      const result = await userService.findByRole('referee');

      expect(mockTable).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ role: 'referee' });
      expect(result).toEqual(mockUsers);
    });

    it('should include referee level information for referees', async () => {
      await userService.findByRole('referee');

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'referee_levels',
        'users.referee_level_id = referee_levels.id'
      );
    });

    it('should apply additional filters', async () => {
      const filters = { is_available: true, postal_code: 'M5V' };
      
      await userService.findByRole('referee', filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        role: 'referee',
        is_available: true,
        postal_code: 'M5V'
      });
    });

    it('should handle non-referee roles without level joins', async () => {
      await userService.findByRole('admin');

      expect(mockQueryBuilder.leftJoin).not.toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ role: 'admin' });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQueryBuilder.mockRejectedValue(dbError);

      await expect(userService.findByRole('referee')).rejects.toThrow('Failed to find users by role: Database error');
    });
  });

  describe('updateAvailability', () => {
    const mockUser = { id: '123', role: 'referee', name: 'John Doe' };
    const mockUpdatedUser = { ...mockUser, is_available: false };

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(mockUser);
      mockQueryBuilder.returning.mockResolvedValue([mockUpdatedUser]);
    });

    it('should update referee availability', async () => {
      const result = await userService.updateAvailability('123', false);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', '123');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_available: false,
        availability_updated_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error for non-referee users', async () => {
      const adminUser = { id: '123', role: 'admin' };
      mockQueryBuilder.first.mockResolvedValue(adminUser);

      await expect(userService.updateAvailability('123', true)).rejects.toThrow('Only referees can have their availability updated');
    });

    it('should throw error when user not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(userService.updateAvailability('123', true)).rejects.toThrow('users not found with id: 123');
    });
  });

  describe('getUserWithRefereeDetails', () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      role: 'referee',
      level_name: 'Senior',
      allowed_divisions: '["Elite", "Competitive"]'
    };

    const mockAssignments = [
      {
        id: 'assign1',
        game_date: '2024-01-15',
        game_time: '19:00',
        home_team_name: 'Team A',
        away_team_name: 'Team B'
      }
    ];

    const mockStats = {
      total_assignments: '10',
      accepted_assignments: '8',
      declined_assignments: '1',
      completed_assignments: '7',
      total_earnings: '560.00'
    };

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(mockUser);
      mockQueryBuilder.mockResolvedValueOnce(mockUser);
      mockQueryBuilder.mockResolvedValueOnce(mockAssignments);
      mockQueryBuilder.mockResolvedValueOnce(mockStats);
    });

    it('should get user with referee details', async () => {
      // Mock the sequential database calls
      let callCount = 0;
      mockTable.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - get user with level
          return {
            ...mockQueryBuilder,
            first: jest.fn().mockResolvedValue(mockUser)
          };
        } else if (callCount === 2) {
          // Second call - get assignments
          return {
            ...mockQueryBuilder,
            mockResolvedValue: jest.fn().mockResolvedValue(mockAssignments)
          };
        } else {
          // Third call - get stats
          return {
            ...mockQueryBuilder,
            first: jest.fn().mockResolvedValue(mockStats)
          };
        }
      });

      const result = await userService.getUserWithRefereeDetails('123');

      expect(result.id).toBe('123');
      expect(result.name).toBe('John Doe');
    });

    it('should handle non-referee users', async () => {
      const adminUser = { id: '123', name: 'Admin User', role: 'admin' };
      
      mockTable.mockImplementation(() => ({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(adminUser)
      }));

      const result = await userService.getUserWithRefereeDetails('123');

      expect(result.id).toBe('123');
      expect(result.recent_assignments).toBeUndefined();
      expect(result.assignment_stats).toBeUndefined();
    });

    it('should throw error when user not found', async () => {
      mockTable.mockImplementation(() => ({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(null)
      }));

      await expect(userService.getUserWithRefereeDetails('123')).rejects.toThrow('User not found with id: 123');
    });
  });

  describe('bulkUpdateUsers', () => {
    const mockUpdates = [
      { id: '1', data: { name: 'Updated Name 1' } },
      { id: '2', data: { name: 'Updated Name 2' } }
    ];

    const mockExistingUser = { id: '1', name: 'Original Name' };
    const mockUpdatedUser = { id: '1', name: 'Updated Name 1' };

    beforeEach(() => {
      // Mock transaction
      const mockTrx = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      mockTable.transaction = jest.fn().mockResolvedValue(mockTrx);

      // Mock the transaction callback
      userService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockTrx);
      });
    });

    it('should perform bulk updates successfully', async () => {
      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(mockExistingUser)
      });

      userService.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      const result = await userService.bulkUpdateUsers(mockUpdates);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(2);
    });

    it('should throw error for empty updates array', async () => {
      await expect(userService.bulkUpdateUsers([])).rejects.toThrow('Updates array is required and cannot be empty');
    });

    it('should throw error for too many updates', async () => {
      const tooManyUpdates = new Array(101).fill({ id: '1', data: {} });

      await expect(userService.bulkUpdateUsers(tooManyUpdates)).rejects.toThrow('Bulk update limited to 100 users at once');
    });

    it('should handle validation errors', async () => {
      const invalidUpdates = [
        { id: '1', data: { name: 'Valid' } },
        { data: { name: 'Missing ID' } }, // Missing id
        { id: '3' } // Missing data
      ];

      userService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTrx = {};
        return await callback(mockTrx);
      });

      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(mockExistingUser)
      });

      userService.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      const result = await userService.bulkUpdateUsers(invalidUpdates);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error).toBe('Missing id or data in update object');
    });
  });

  describe('createReferee', () => {
    const mockRefereeData = {
      name: 'New Referee',
      email: 'referee@example.com',
      postal_code: 'M5V 1A1',
      password: 'password123'
    };

    const mockCreatedReferee = {
      id: '456',
      ...mockRefereeData,
      role: 'referee',
      is_available: true
    };

    beforeEach(() => {
      bcrypt.hash.mockResolvedValue('hashed_password');
      mockQueryBuilder.mockResolvedValue([]); // No existing users
      userService.create = jest.fn().mockResolvedValue({
        ...mockCreatedReferee,
        password_hash: 'hashed_password'
      });
    });

    it('should create referee with proper defaults', async () => {
      const result = await userService.createReferee(mockRefereeData);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'referee',
          is_available: true,
          max_distance: 25,
          wage_per_game: 0,
          availability_strategy: 'WHITELIST',
          password_hash: 'hashed_password'
        })
      );

      expect(result.password_hash).toBeUndefined(); // Should be removed from response
    });

    it('should throw error if required fields are missing', async () => {
      const invalidData = { name: 'Test' }; // Missing email and postal_code

      await expect(userService.createReferee(invalidData)).rejects.toThrow('Name, email, and postal_code are required for referee creation');
    });

    it('should throw error if email already exists', async () => {
      userService.findWhere = jest.fn().mockResolvedValue([{ id: '123', email: 'referee@example.com' }]);

      await expect(userService.createReferee(mockRefereeData)).rejects.toThrow('Email already exists');
    });

    it('should generate temporary password if none provided', async () => {
      const dataWithoutPassword = { ...mockRefereeData };
      delete dataWithoutPassword.password;

      await userService.createReferee(dataWithoutPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        expect.stringMatching(/^temp_password_\d+$/),
        12
      );
    });
  });

  describe('findAvailableReferees', () => {
    const mockReferees = [
      { id: '1', name: 'Referee 1', level_name: 'Senior' },
      { id: '2', name: 'Referee 2', level_name: 'Junior' }
    ];

    beforeEach(() => {
      mockQueryBuilder.mockResolvedValue(mockReferees);
    });

    it('should find available referees for specific date/time', async () => {
      const result = await userService.findAvailableReferees('2024-01-15', '19:00');

      expect(mockTable).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('users.role', 'referee');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('users.is_available', true);
      expect(mockQueryBuilder.whereNotExists).toHaveBeenCalled();
      expect(result).toEqual(mockReferees);
    });

    it('should filter by level when provided', async () => {
      await userService.findAvailableReferees('2024-01-15', '19:00', { level: 'Elite' });

      expect(mockQueryBuilder.whereRaw).toHaveBeenCalledWith(
        expect.stringContaining('JSON_SEARCH'),
        ['Elite']
      );
    });

    it('should filter by distance when location provided', async () => {
      await userService.findAvailableReferees('2024-01-15', '19:00', { 
        maxDistance: 25, 
        location: 'Downtown Arena' 
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('users.max_distance', '>=', 25);
    });
  });

  describe('afterCreate hook', () => {
    it('should log user creation when audit trail is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockUser = { id: '123', role: 'referee' };

      await userService.afterCreate(mockUser, {});

      expect(consoleSpy).toHaveBeenCalledWith('User created: 123 (referee)');

      consoleSpy.mockRestore();
    });
  });

  describe('afterUpdate hook', () => {
    it('should log changed fields when audit trail is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const previousUser = { id: '123', name: 'Old Name', email: 'old@example.com' };
      const updatedUser = { id: '123', name: 'New Name', email: 'old@example.com' };

      await userService.afterUpdate(updatedUser, previousUser, {});

      expect(consoleSpy).toHaveBeenCalledWith('User updated: 123, changed fields: name');

      consoleSpy.mockRestore();
    });

    it('should not log when no fields changed', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const user = { id: '123', name: 'Same Name', email: 'same@example.com' };

      await userService.afterUpdate(user, user, {});

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('_getChangedFields', () => {
    it('should identify changed fields correctly', () => {
      const before = { 
        id: '123', 
        name: 'Old Name', 
        email: 'old@example.com', 
        is_available: true,
        wage_per_game: 50
      };
      const after = { 
        id: '123', 
        name: 'New Name', 
        email: 'new@example.com', 
        is_available: true,
        wage_per_game: 60
      };

      const changes = userService._getChangedFields(before, after);

      expect(changes).toEqual(['name', 'email', 'wage_per_game']);
    });

    it('should return empty array when no fields changed', () => {
      const user = { 
        id: '123', 
        name: 'Same Name', 
        email: 'same@example.com',
        is_available: true
      };

      const changes = userService._getChangedFields(user, user);

      expect(changes).toEqual([]);
    });
  });
});