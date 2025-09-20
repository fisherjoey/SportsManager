/**
 * @fileoverview RefereeService Unit Tests
 *
 * Comprehensive test suite for RefereeService covering referee management,
 * role-based operations, profile management, and business logic
 */

import { jest } from '@jest/globals';
import { Database, UUID, User, RoleEntity, UserRoleAssignment } from '../../types';

// Mock function that returns a query builder-like object
const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  del: jest.fn(),
  count: jest.fn(),
  clone: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNotNull: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
});

// Create mock database that can be called as a function and has methods
const mockDbFunction = jest.fn(() => createMockQueryBuilder());
const mockDb = Object.assign(mockDbFunction, {
  transaction: jest.fn(),
  from: jest.fn(),
  where: jest.fn(),
  first: jest.fn(),
  select: jest.fn(),
  join: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  returning: jest.fn(),
  del: jest.fn(),
  count: jest.fn(),
  clone: jest.fn(),
  leftJoin: jest.fn(),
  innerJoin: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  offset: jest.fn(),
  whereIn: jest.fn(),
  ilike: jest.fn(),
  whereNotNull: jest.fn(),
  orWhere: jest.fn(),
}) as unknown as Database;

// Mock BaseService methods
const mockBaseService = {
  tableName: 'referee_profiles',
  db: mockDb,
  options: {
    defaultOrderBy: 'created_at',
    defaultOrderDirection: 'desc',
    enableAuditTrail: true,
    throwOnNotFound: false,
  },
  findWhere: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  withTransaction: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
  findWithPagination: jest.fn(),
  bulkCreate: jest.fn(),
};

// Mock the BaseService class
jest.mock('../BaseService', () => {
  return {
    BaseService: jest.fn().mockImplementation(function(tableName: string, db: any, options: any) {
      this.tableName = tableName;
      this.db = db;
      this.options = {
        defaultOrderBy: 'created_at',
        defaultOrderDirection: 'desc',
        enableAuditTrail: true,
        throwOnNotFound: false,
        ...options
      };
      this.findWhere = mockBaseService.findWhere;
      this.create = mockBaseService.create;
      this.update = mockBaseService.update;
      this.withTransaction = mockBaseService.withTransaction;
      this.findById = mockBaseService.findById;
      this.delete = mockBaseService.delete;
      this.findWithPagination = mockBaseService.findWithPagination;
      this.bulkCreate = mockBaseService.bulkCreate;
      return this;
    })
  };
});

// Import RefereeService after setting up mocks
const { default: RefereeService } = require('../RefereeService.ts');

describe('RefereeService', () => {
  let refereeService: RefereeService;
  const mockUserId = 'user-123';
  const mockProfileId = 'profile-456';
  const mockRoleId = 'role-789';

  beforeEach(() => {
    jest.clearAllMocks();
    refereeService = new RefereeService(mockDb);
  });

  describe('constructor', () => {
    it('should initialize with correct table name and options', () => {
      expect(refereeService).toBeInstanceOf(RefereeService);
      expect(refereeService['tableName']).toBe('referee_profiles');
      expect(refereeService['options']).toMatchObject({
        defaultOrderBy: 'created_at',
        defaultOrderDirection: 'desc',
        enableAuditTrail: true,
        throwOnNotFound: false,
      });
    });
  });

  describe('isReferee', () => {
    it('should return true when user has referee_type role', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Senior Referee', category: 'referee_type' },
        { id: 'role-2', name: 'Admin', category: 'admin' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.isReferee(mockUserId);

      expect(result).toBe(true);
      expect(refereeService['getUserRoles']).toHaveBeenCalledWith(mockUserId);
    });

    it('should return false when user has no referee_type role', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Admin', category: 'admin' },
        { id: 'role-2', name: 'Manager', category: 'management' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.isReferee(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false and log error when getUserRoles throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(refereeService as any, 'getUserRoles').mockRejectedValue(new Error('DB Error'));

      const result = await refereeService.isReferee(mockUserId);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error checking if user ${mockUserId} is referee:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getRefereeType', () => {
    it('should return referee type role when found', async () => {
      const mockRefereeTypeRole = {
        id: 'role-1',
        name: 'Senior Referee',
        category: 'referee_type',
        referee_config: { default_wage_rate: 50 },
      };

      const mockRoles = [
        mockRefereeTypeRole,
        { id: 'role-2', name: 'Admin', category: 'admin' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.getRefereeType(mockUserId);

      expect(result).toEqual(mockRefereeTypeRole);
    });

    it('should return null when no referee type role found', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Admin', category: 'admin' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.getRefereeType(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null and log error when getUserRoles throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(refereeService as any, 'getUserRoles').mockRejectedValue(new Error('DB Error'));

      const result = await refereeService.getRefereeType(mockUserId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error getting referee type for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getUserRefereeCapabilities', () => {
    it('should return referee capability roles when found', async () => {
      const mockCapabilityRoles = [
        { id: 'role-1', name: 'Evaluator', category: 'referee_capability' },
        { id: 'role-2', name: 'Mentor', category: 'referee_capability' },
      ];

      const mockRoles = [
        ...mockCapabilityRoles,
        { id: 'role-3', name: 'Senior Referee', category: 'referee_type' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.getUserRefereeCapabilities(mockUserId);

      expect(result).toEqual(mockCapabilityRoles);
    });

    it('should return empty array when no capability roles found', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Senior Referee', category: 'referee_type' },
      ];

      jest.spyOn(refereeService as any, 'getUserRoles').mockResolvedValue(mockRoles);

      const result = await refereeService.getUserRefereeCapabilities(mockUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array and log error when getUserRoles throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(refereeService as any, 'getUserRoles').mockRejectedValue(new Error('DB Error'));

      const result = await refereeService.getUserRefereeCapabilities(mockUserId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error getting referee capabilities for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles with join to roles table', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Senior Referee', category: 'referee_type' },
      ];

      const mockQuery = createMockQueryBuilder();
      mockQuery.select = jest.fn().mockResolvedValue(mockRoles);

      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await (refereeService as any).getUserRoles(mockUserId);

      expect(result).toEqual(mockRoles);
      expect(mockDb).toHaveBeenCalledWith('user_roles');
      expect(mockQuery.join).toHaveBeenCalledWith('roles', 'user_roles.role_id', 'roles.id');
      expect(mockQuery.where).toHaveBeenCalledWith('user_roles.user_id', mockUserId);
      expect(mockQuery.where).toHaveBeenCalledWith('user_roles.is_active', true);
      expect(mockQuery.select).toHaveBeenCalledWith('roles.*');
    });

    it('should return empty array and log error when query fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockQuery = createMockQueryBuilder();
      mockQuery.select = jest.fn().mockRejectedValue(new Error('DB Error'));

      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await (refereeService as any).getUserRoles(mockUserId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error getting roles for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('shouldDisplayWhiteWhistle', () => {
    const mockProfile = {
      id: mockProfileId,
      user_id: mockUserId,
      is_white_whistle: true,
      wage_amount: 35.00,
    };

    it('should return false for Senior Referee', async () => {
      const mockRefereeType = { name: 'Senior Referee' };

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any,
        mockProfile as any
      );

      expect(result).toBe(false);
    });

    it('should return true for Rookie Referee', async () => {
      const mockRefereeType = { name: 'Rookie Referee' };

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any,
        mockProfile as any
      );

      expect(result).toBe(true);
    });

    it('should return profile flag for Junior Referee when is_white_whistle is true', async () => {
      const mockRefereeType = { name: 'Junior Referee' };

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any,
        mockProfile as any
      );

      expect(result).toBe(true);
    });

    it('should return false for Junior Referee when is_white_whistle is false', async () => {
      const mockRefereeType = { name: 'Junior Referee' };
      const profileWithoutWhiteWhistle = { ...mockProfile, is_white_whistle: false };

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any,
        profileWithoutWhiteWhistle as any
      );

      expect(result).toBe(false);
    });

    it('should return false for unknown referee type', async () => {
      const mockRefereeType = { name: 'Unknown Referee' };

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any,
        mockProfile as any
      );

      expect(result).toBe(false);
    });

    it('should fetch referee type when not provided', async () => {
      const mockRefereeType = { name: 'Senior Referee' };
      jest.spyOn(refereeService, 'getRefereeType').mockResolvedValue(mockRefereeType as any);

      const result = await refereeService.shouldDisplayWhiteWhistle(mockUserId);

      expect(result).toBe(false);
      expect(refereeService.getRefereeType).toHaveBeenCalledWith(mockUserId);
    });

    it('should fetch profile when not provided', async () => {
      const mockRefereeType = { name: 'Junior Referee' };
      const mockQuery = createMockQueryBuilder();
      mockQuery.first = jest.fn().mockResolvedValue(mockProfile);

      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await refereeService.shouldDisplayWhiteWhistle(
        mockUserId,
        mockRefereeType as any
      );

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('referee_profiles');
      expect(mockQuery.where).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.where).toHaveBeenCalledWith('is_active', true);
    });

    it('should return false when no referee type found', async () => {
      jest.spyOn(refereeService, 'getRefereeType').mockResolvedValue(null);

      const result = await refereeService.shouldDisplayWhiteWhistle(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false and log error when error occurs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(refereeService, 'getRefereeType').mockRejectedValue(new Error('DB Error'));

      const result = await refereeService.shouldDisplayWhiteWhistle(mockUserId);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Error determining white whistle display for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getRefereeProfile', () => {
    const mockProfile = {
      id: mockProfileId,
      user_id: mockUserId,
      wage_amount: 35.00,
      is_white_whistle: false,
      is_active: true,
    };

    const mockRefereeType = {
      id: 'role-1',
      name: 'Junior Referee',
      referee_config: { default_wage_rate: 35 },
    };

    const mockCapabilities = [
      {
        id: 'cap-1',
        name: 'Evaluator',
        description: 'Can evaluate other referees',
        referee_config: {},
      },
    ];

    beforeEach(() => {
      mockBaseService.findWhere.mockResolvedValue([mockProfile]);
      jest.spyOn(refereeService, 'getRefereeType').mockResolvedValue(mockRefereeType as any);
      jest.spyOn(refereeService, 'getUserRefereeCapabilities').mockResolvedValue(mockCapabilities as any);
      jest.spyOn(refereeService, 'shouldDisplayWhiteWhistle').mockResolvedValue(false);
    });

    it('should return complete referee profile with computed fields', async () => {
      const result = await refereeService.getRefereeProfile(mockUserId);

      expect(result).toMatchObject({
        id: mockProfileId,
        user_id: mockUserId,
        wage_amount: 35.00,
        referee_type: mockRefereeType,
        capabilities: [
          {
            id: 'cap-1',
            name: 'Evaluator',
            description: 'Can evaluate other referees',
            config: {},
          },
        ],
        show_white_whistle: false,
        computed_fields: {
          type_config: mockRefereeType.referee_config,
          capability_count: 1,
          effective_wage: 35.00,
          is_senior: false,
          is_junior: true,
          is_rookie: false,
        },
      });
    });

    it('should include user data when includeUser option is true', async () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        is_available: true,
      };

      const mockQuery = createMockQueryBuilder();
      mockQuery.first = jest.fn().mockResolvedValue(mockUser);
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await refereeService.getRefereeProfile(mockUserId, { includeUser: true });

      expect(result).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        is_available: true,
      });

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQuery.where).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should return null when no profile found and user is not a referee', async () => {
      mockBaseService.findWhere.mockResolvedValue([]);
      jest.spyOn(refereeService, 'isReferee').mockResolvedValue(false);

      const result = await refereeService.getRefereeProfile(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null and log warning when profile not found but user is referee', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockBaseService.findWhere.mockResolvedValue([]);
      jest.spyOn(refereeService, 'isReferee').mockResolvedValue(true);

      const result = await refereeService.getRefereeProfile(mockUserId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Referee ${mockUserId} exists but has no profile`
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when database operation fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBaseService.findWhere.mockRejectedValue(new Error('DB Error'));

      await expect(refereeService.getRefereeProfile(mockUserId))
        .rejects
        .toThrow('Failed to get referee profile: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error getting referee profile for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle computed fields for Senior Referee', async () => {
      const seniorRefereeType = { ...mockRefereeType, name: 'Senior Referee' };
      jest.spyOn(refereeService, 'getRefereeType').mockResolvedValue(seniorRefereeType as any);

      const result = await refereeService.getRefereeProfile(mockUserId);

      expect(result?.computed_fields).toMatchObject({
        is_senior: true,
        is_junior: false,
        is_rookie: false,
      });
    });

    it('should handle computed fields for Rookie Referee', async () => {
      const rookieRefereeType = { ...mockRefereeType, name: 'Rookie Referee' };
      jest.spyOn(refereeService, 'getRefereeType').mockResolvedValue(rookieRefereeType as any);

      const result = await refereeService.getRefereeProfile(mockUserId);

      expect(result?.computed_fields).toMatchObject({
        is_senior: false,
        is_junior: false,
        is_rookie: true,
      });
    });
  });

  describe('updateWage', () => {
    const mockProfile = {
      id: mockProfileId,
      user_id: mockUserId,
      wage_amount: 35.00,
      notes: 'Original notes',
    };

    const updatedBy = 'admin-123';

    beforeEach(() => {
      jest.spyOn(refereeService as any, 'validateReferee').mockResolvedValue(undefined);
      mockBaseService.findWhere.mockResolvedValue([mockProfile]);
      mockBaseService.update.mockResolvedValue({ ...mockProfile, wage_amount: 45.00 });
    });

    it('should update referee wage successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await refereeService.updateWage(mockUserId, 45.00, updatedBy);

      expect(result).toMatchObject({
        wage_amount: 45.00,
      });

      expect(mockBaseService.update).toHaveBeenCalledWith(
        mockProfileId,
        {
          wage_amount: 45.00,
          notes: 'Original notes',
        },
        {
          auditUserId: updatedBy,
        }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        `Referee ${mockUserId} wage updated to $45 by ${updatedBy}`
      );

      consoleSpy.mockRestore();
    });

    it('should update wage with custom notes', async () => {
      const customNotes = 'Updated wage for performance';

      await refereeService.updateWage(mockUserId, 45.00, updatedBy, { notes: customNotes });

      expect(mockBaseService.update).toHaveBeenCalledWith(
        mockProfileId,
        {
          wage_amount: 45.00,
          notes: customNotes,
        },
        {
          notes: customNotes,
          auditUserId: updatedBy,
        }
      );
    });

    it('should throw error for zero or negative wage', async () => {
      await expect(refereeService.updateWage(mockUserId, 0, updatedBy))
        .rejects
        .toThrow('Wage amount must be greater than zero');

      await expect(refereeService.updateWage(mockUserId, -10, updatedBy))
        .rejects
        .toThrow('Wage amount must be greater than zero');
    });

    it('should throw error for wage exceeding maximum', async () => {
      await expect(refereeService.updateWage(mockUserId, 501, updatedBy))
        .rejects
        .toThrow('Wage amount cannot exceed $500 per game');
    });

    it('should throw error when profile not found', async () => {
      mockBaseService.findWhere.mockResolvedValue([]);

      await expect(refereeService.updateWage(mockUserId, 45.00, updatedBy))
        .rejects
        .toThrow('Referee profile not found');
    });

    it('should throw error when validateReferee fails', async () => {
      jest.spyOn(refereeService as any, 'validateReferee')
        .mockRejectedValue(new Error('User is not a referee'));

      await expect(refereeService.updateWage(mockUserId, 45.00, updatedBy))
        .rejects
        .toThrow('User is not a referee');
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBaseService.update.mockRejectedValue(new Error('DB Error'));

      await expect(refereeService.updateWage(mockUserId, 45.00, updatedBy))
        .rejects
        .toThrow('Failed to update referee wage: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error updating wage for referee ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('changeRefereeType', () => {
    const updatedBy = 'admin-123';
    const mockCurrentRole = {
      id: 'old-role-id',
      name: 'Junior Referee',
      role_id: 'old-role-id',
    };

    const mockNewRole = {
      id: 'new-role-id',
      name: 'Senior Referee',
      referee_config: {
        default_wage_rate: 50.00,
      },
    };

    beforeEach(() => {
      jest.spyOn(refereeService as any, 'validateReferee').mockResolvedValue(undefined);
      mockBaseService.withTransaction.mockImplementation(async (callback) => {
        const mockTrx = createMockQueryBuilder();
        mockTrx.where = jest.fn().mockReturnThis();
        mockTrx.select = jest.fn().mockResolvedValue([mockCurrentRole]);
        mockTrx.first = jest.fn().mockResolvedValue(mockNewRole);
        mockTrx.update = jest.fn().mockResolvedValue(1);
        mockTrx.insert = jest.fn().mockResolvedValue([]);

        (mockTrx as any).mockTrxCall = (table: string) => {
          if (table === 'user_roles') {
            return {
              ...mockTrx,
              join: jest.fn().mockReturnThis(),
            };
          }
          if (table === 'roles') {
            return mockTrx;
          }
          return mockTrx;
        };

        return callback(mockTrx.mockTrxCall as any);
      });
    });

    it('should successfully change referee type', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await refereeService.changeRefereeType(mockUserId, 'Senior Referee', updatedBy);

      expect(result).toMatchObject({
        message: 'Referee type changed to Senior Referee',
        changed: true,
        new_role: 'Senior Referee',
        previous_roles: ['Junior Referee'],
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        `Referee ${mockUserId} type changed to Senior Referee by ${updatedBy}`
      );

      consoleSpy.mockRestore();
    });

    it('should return no change when user already has the role', async () => {
      const currentRoleWithSameName = { ...mockCurrentRole, name: 'Senior Referee' };

      mockBaseService.withTransaction.mockImplementation(async (callback) => {
        const mockTrx = createMockQueryBuilder();
        mockTrx.select = jest.fn().mockResolvedValue([currentRoleWithSameName]);
        mockTrx.first = jest.fn().mockResolvedValue(mockNewRole);

        (mockTrx as any).mockTrxCall = () => ({
          ...mockTrx,
          join: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        });

        return callback(mockTrx.mockTrxCall as any);
      });

      const result = await refereeService.changeRefereeType(mockUserId, 'Senior Referee', updatedBy);

      expect(result).toMatchObject({
        message: 'User already has this referee type',
        changed: false,
      });
    });

    it('should update wage to default when option is enabled', async () => {
      const mockProfile = { id: 'profile-id' };

      mockBaseService.withTransaction.mockImplementation(async (callback) => {
        const mockTrx = createMockQueryBuilder();
        mockTrx.select = jest.fn()
          .mockResolvedValueOnce([mockCurrentRole]) // For getting current roles
          .mockResolvedValueOnce([mockProfile]); // For getting profiles
        mockTrx.first = jest.fn().mockResolvedValue(mockNewRole);
        mockTrx.update = jest.fn().mockResolvedValue(1);
        mockTrx.insert = jest.fn().mockResolvedValue([]);

        (mockTrx as any).mockTrxCall = (table: string) => {
          if (table === 'referee_profiles') {
            return {
              ...mockTrx,
              where: jest.fn().mockReturnThis(),
            };
          }
          return {
            ...mockTrx,
            join: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
          };
        };

        return callback(mockTrx.mockTrxCall as any);
      });

      await refereeService.changeRefereeType(
        mockUserId,
        'Senior Referee',
        updatedBy,
        { updateWageToDefault: true }
      );

      // Verify that wage update was attempted
      expect(mockBaseService.withTransaction).toHaveBeenCalled();
    });

    it('should throw error for invalid referee type', async () => {
      await expect(refereeService.changeRefereeType(mockUserId, 'Invalid Type', updatedBy))
        .rejects
        .toThrow('Invalid referee type: Invalid Type. Valid types: Senior Referee, Junior Referee, Rookie Referee');
    });

    it('should throw error when new role not found', async () => {
      mockBaseService.withTransaction.mockImplementation(async (callback) => {
        const mockTrx = createMockQueryBuilder();
        mockTrx.select = jest.fn().mockResolvedValue([mockCurrentRole]);
        mockTrx.first = jest.fn().mockResolvedValue(null); // Role not found

        (mockTrx as any).mockTrxCall = () => ({
          ...mockTrx,
          join: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        });

        return callback(mockTrx.mockTrxCall as any);
      });

      await expect(refereeService.changeRefereeType(mockUserId, 'Senior Referee', updatedBy))
        .rejects
        .toThrow('Referee type role not found: Senior Referee');
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(refereeService as any, 'validateReferee')
        .mockRejectedValue(new Error('DB Error'));

      await expect(refereeService.changeRefereeType(mockUserId, 'Senior Referee', updatedBy))
        .rejects
        .toThrow('Failed to change referee type: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error changing referee type for ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createRefereeProfile', () => {
    const mockRefereeTypeRole = {
      id: 'role-id',
      name: 'Junior Referee',
      referee_config: {
        default_wage_rate: 35.00,
      },
    };

    it('should create referee profile with default values', async () => {
      const mockCreatedProfile = {
        id: mockProfileId,
        user_id: mockUserId,
        wage_amount: 35.00,
        is_active: true,
      };

      mockBaseService.create.mockResolvedValue(mockCreatedProfile);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await refereeService.createRefereeProfile(mockUserId, mockRefereeTypeRole as any);

      expect(result).toEqual(mockCreatedProfile);
      expect(mockBaseService.create).toHaveBeenCalledWith({
        user_id: mockUserId,
        wage_amount: 35.00,
        certification_number: undefined,
        certification_date: undefined,
        certification_expiry: undefined,
        certification_level: undefined,
        emergency_contact: undefined,
        special_qualifications: undefined,
        notes: undefined,
        is_active: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        `Created referee profile for user ${mockUserId} with type ${mockRefereeTypeRole.name}`
      );

      consoleSpy.mockRestore();
    });

    it('should create referee profile with custom initial data', async () => {
      const initialData = {
        wage_amount: 45.00,
        certification_number: 'CERT-123',
        notes: 'Experienced referee',
      };

      const mockCreatedProfile = {
        id: mockProfileId,
        user_id: mockUserId,
        ...initialData,
        is_active: true,
      };

      mockBaseService.create.mockResolvedValue(mockCreatedProfile);

      const result = await refereeService.createRefereeProfile(
        mockUserId,
        mockRefereeTypeRole as any,
        initialData
      );

      expect(result).toEqual(mockCreatedProfile);
      expect(mockBaseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          wage_amount: 45.00,
          certification_number: 'CERT-123',
          notes: 'Experienced referee',
          is_active: true,
        })
      );
    });

    it('should use default wage when role has no config', async () => {
      const roleWithoutConfig = {
        ...mockRefereeTypeRole,
        referee_config: undefined,
      };

      mockBaseService.create.mockResolvedValue({
        id: mockProfileId,
        user_id: mockUserId,
        wage_amount: 35.00,
      });

      await refereeService.createRefereeProfile(mockUserId, roleWithoutConfig as any);

      expect(mockBaseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          wage_amount: 35.00,
        })
      );
    });

    it('should handle creation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBaseService.create.mockRejectedValue(new Error('DB Error'));

      await expect(refereeService.createRefereeProfile(mockUserId, mockRefereeTypeRole as any))
        .rejects
        .toThrow('Failed to create referee profile: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error creating referee profile for user ${mockUserId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateReferee', () => {
    it('should pass validation when user is referee', async () => {
      jest.spyOn(refereeService, 'isReferee').mockResolvedValue(true);

      await expect(refereeService['validateReferee'](mockUserId))
        .resolves
        .not
        .toThrow();

      expect(refereeService.isReferee).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error when user is not referee', async () => {
      jest.spyOn(refereeService, 'isReferee').mockResolvedValue(false);

      await expect(refereeService['validateReferee'](mockUserId))
        .rejects
        .toThrow('User is not a referee');
    });
  });

  describe('getRefereeTypes', () => {
    it('should return available referee types', async () => {
      const mockTypes = [
        {
          id: 'type-1',
          name: 'Senior Referee',
          description: 'Experienced referee',
          referee_config: { default_wage_rate: 50 },
        },
        {
          id: 'type-2',
          name: 'Junior Referee',
          description: 'Intermediate referee',
          referee_config: { default_wage_rate: 35 },
        },
      ];

      const mockQuery = createMockQueryBuilder();
      mockQuery.orderBy = jest.fn().mockResolvedValue(mockTypes);
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await refereeService.getRefereeTypes();

      expect(result).toEqual([
        {
          id: 'type-1',
          name: 'Senior Referee',
          description: 'Experienced referee',
          referee_config: { default_wage_rate: 50 },
          config: { default_wage_rate: 50 },
        },
        {
          id: 'type-2',
          name: 'Junior Referee',
          description: 'Intermediate referee',
          referee_config: { default_wage_rate: 35 },
          config: { default_wage_rate: 35 },
        },
      ]);

      expect(mockDb).toHaveBeenCalledWith('roles');
      expect(mockQuery.where).toHaveBeenCalledWith('category', 'referee_type');
      expect(mockQuery.where).toHaveBeenCalledWith('is_active', true);
      expect(mockQuery.select).toHaveBeenCalledWith('id', 'name', 'description', 'referee_config');
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name');
    });

    it('should handle types with null referee_config', async () => {
      const mockTypes = [
        {
          id: 'type-1',
          name: 'Senior Referee',
          description: 'Experienced referee',
          referee_config: null,
        },
      ];

      const mockQuery = createMockQueryBuilder();
      mockQuery.orderBy = jest.fn().mockResolvedValue(mockTypes);
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await refereeService.getRefereeTypes();

      expect(result[0].config).toEqual({});
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockQuery = createMockQueryBuilder();
      mockQuery.orderBy = jest.fn().mockRejectedValue(new Error('DB Error'));
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      await expect(refereeService.getRefereeTypes())
        .rejects
        .toThrow('Failed to get referee types: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith('Error getting referee types:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('getRefereeCapabilities', () => {
    it('should return available referee capabilities', async () => {
      const mockCapabilities = [
        {
          id: 'cap-1',
          name: 'Evaluator',
          description: 'Can evaluate other referees',
          referee_config: { evaluation_level: 'senior' },
        },
        {
          id: 'cap-2',
          name: 'Mentor',
          description: 'Can mentor junior referees',
          referee_config: { mentorship_level: 'advanced' },
        },
      ];

      const mockQuery = createMockQueryBuilder();
      mockQuery.orderBy = jest.fn().mockResolvedValue(mockCapabilities);
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      const result = await refereeService.getAvailableRefereeCapabilities();

      expect(result).toEqual([
        {
          id: 'cap-1',
          name: 'Evaluator',
          description: 'Can evaluate other referees',
          referee_config: { evaluation_level: 'senior' },
          config: { evaluation_level: 'senior' },
        },
        {
          id: 'cap-2',
          name: 'Mentor',
          description: 'Can mentor junior referees',
          referee_config: { mentorship_level: 'advanced' },
          config: { mentorship_level: 'advanced' },
        },
      ]);

      expect(mockDb).toHaveBeenCalledWith('roles');
      expect(mockQuery.where).toHaveBeenCalledWith('category', 'referee_capability');
      expect(mockQuery.where).toHaveBeenCalledWith('is_active', true);
      expect(mockQuery.select).toHaveBeenCalledWith('id', 'name', 'description', 'referee_config');
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name');
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockQuery = createMockQueryBuilder();
      mockQuery.orderBy = jest.fn().mockRejectedValue(new Error('DB Error'));
      (mockDb as jest.Mock).mockReturnValue(mockQuery);

      await expect(refereeService.getRefereeCapabilities())
        .rejects
        .toThrow('Failed to get referee capabilities: DB Error');

      expect(consoleSpy).toHaveBeenCalledWith('Error getting referee capabilities:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});