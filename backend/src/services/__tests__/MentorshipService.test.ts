/**
 * @fileoverview MentorshipService Unit Tests
 *
 * Comprehensive test suite for MentorshipService covering mentorship relationship management,
 * authorization controls, business logic validation, and complex relationship queries
 */

import { jest } from '@jest/globals';

// Mock BaseService
const mockBaseService = {
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../BaseService', () => {
  return jest.fn().mockImplementation(() => mockBaseService);
});

// Create mock database
const mockDb = {
  where: jest.fn(),
  leftJoin: jest.fn(),
  join: jest.fn(),
  select: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  returning: jest.fn(),
  whereNull: jest.fn(),
  whereNotNull: jest.fn(),
  orderBy: jest.fn(),
  whereIn: jest.fn(),
  whereExists: jest.fn(),
  whereNotExists: jest.fn(),
  orWhereExists: jest.fn(),
  whereRaw: jest.fn(),
  raw: jest.fn(),
  fn: {
    now: jest.fn(() => 'NOW()')
  }
};

// Configure chaining
Object.keys(mockDb).forEach(key => {
  if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn' && key !== 'raw') {
    (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
  }
});

describe('MentorshipService', () => {
  let MentorshipService: any;
  let mentorshipService: any;

  beforeAll(async () => {
    // Import the service after mocks are set up
    const module = await import('../MentorshipService');
    MentorshipService = module.default;
  });

  beforeEach(() => {
    mentorshipService = new MentorshipService(mockDb);

    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock chains
    Object.keys(mockDb).forEach(key => {
      if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn' && key !== 'raw') {
        (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
      }
    });

    // Setup default mock implementations
    mockDb.first.mockResolvedValue(null);
    mockBaseService.create.mockResolvedValue({
      id: 'mentorship-1',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      status: 'active',
      start_date: '2024-01-15'
    });
  });

  describe('Constructor', () => {
    it('should create instance extending BaseService with correct configuration', () => {
      expect(mentorshipService).toBeDefined();
      expect(mentorshipService.options).toMatchObject({
        defaultOrderBy: 'start_date',
        defaultOrderDirection: 'desc',
        enableAuditTrail: true,
        throwOnNotFound: true
      });
    });
  });

  describe('createMentorship', () => {
    const validMentorshipData = {
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      start_date: '2024-01-15',
      notes: 'Initial mentorship setup'
    };

    beforeEach(() => {
      // Mock successful validation methods
      jest.spyOn(mentorshipService, 'validateMentorEligibility').mockResolvedValue(undefined);
      jest.spyOn(mentorshipService, 'checkExistingRelationship').mockResolvedValue(undefined);
      jest.spyOn(mentorshipService, 'validateUsers').mockResolvedValue(undefined);
    });

    it('should create mentorship successfully with valid data', async () => {
      const result = await mentorshipService.createMentorship(validMentorshipData);

      expect(mentorshipService.validateMentorEligibility).toHaveBeenCalledWith('mentor-1');
      expect(mentorshipService.checkExistingRelationship).toHaveBeenCalledWith('mentor-1', 'mentee-1');
      expect(mentorshipService.validateUsers).toHaveBeenCalledWith('mentor-1', 'mentee-1');
      expect(mockBaseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-1',
          start_date: '2024-01-15',
          status: 'active',
          notes: 'Initial mentorship setup'
        }),
        {}
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'mentorship-1',
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        status: 'active'
      }));
    });

    it('should create mentorship without notes', async () => {
      const dataWithoutNotes = {
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        start_date: '2024-01-15'
      };

      await mentorshipService.createMentorship(dataWithoutNotes);

      expect(mockBaseService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null
        }),
        {}
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        mentor_id: 'mentor-1',
        // Missing mentee_id and start_date
      };

      await expect(
        mentorshipService.createMentorship(invalidData)
      ).rejects.toThrow('mentor_id, mentee_id, and start_date are required');
    });

    it('should prevent self-mentorship', async () => {
      const selfMentorshipData = {
        mentor_id: 'user-1',
        mentee_id: 'user-1',
        start_date: '2024-01-15'
      };

      await expect(
        mentorshipService.createMentorship(selfMentorshipData)
      ).rejects.toThrow('A user cannot mentor themselves');
    });

    it('should throw error when mentor eligibility validation fails', async () => {
      jest.spyOn(mentorshipService, 'validateMentorEligibility')
        .mockRejectedValue(new Error('User does not have mentor permissions'));

      await expect(
        mentorshipService.createMentorship(validMentorshipData)
      ).rejects.toThrow('User does not have mentor permissions');
    });

    it('should throw error when existing relationship check fails', async () => {
      jest.spyOn(mentorshipService, 'checkExistingRelationship')
        .mockRejectedValue(new Error('Active mentorship relationship already exists'));

      await expect(
        mentorshipService.createMentorship(validMentorshipData)
      ).rejects.toThrow('Active mentorship relationship already exists');
    });

    it('should handle database errors gracefully', async () => {
      mockBaseService.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        mentorshipService.createMentorship(validMentorshipData)
      ).rejects.toThrow('Failed to create mentorship');
    });
  });

  describe('getMentorshipsByMentor', () => {
    const mockMentorships = [
      {
        id: 'mentorship-1',
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        status: 'active',
        start_date: '2024-01-15',
        mentee_name: 'John Doe',
        mentee_email: 'john@example.com'
      },
      {
        id: 'mentorship-2',
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-2',
        status: 'completed',
        start_date: '2024-01-01',
        mentee_name: 'Jane Smith',
        mentee_email: 'jane@example.com'
      }
    ];

    beforeEach(() => {
      mockDb.orderBy.mockResolvedValue(mockMentorships);
    });

    it('should return mentorships with details by default', async () => {
      const result = await mentorshipService.getMentorshipsByMentor('mentor-1');

      expect(mockDb.where).toHaveBeenCalledWith('mentor_id', 'mentor-1');
      expect(mockDb.leftJoin).toHaveBeenCalledWith('users as mentees', 'mentorships.mentee_id', 'mentees.id');
      expect(mockDb.select).toHaveBeenCalledWith(
        'mentorships.*',
        'mentees.name as mentee_name',
        'mentees.email as mentee_email',
        'mentees.phone as mentee_phone',
        'mentees.is_available as mentee_is_available'
      );
      expect(mockDb.orderBy).toHaveBeenCalledWith('mentorships.start_date', 'desc');
      expect(result).toEqual(mockMentorships);
    });

    it('should filter by status when provided', async () => {
      await mentorshipService.getMentorshipsByMentor('mentor-1', { status: 'active' });

      expect(mockDb.where).toHaveBeenCalledWith('mentor_id', 'mentor-1');
      expect(mockDb.where).toHaveBeenCalledWith('status', 'active');
    });

    it('should return basic mentorships without details when includeDetails is false', async () => {
      await mentorshipService.getMentorshipsByMentor('mentor-1', { includeDetails: false });

      expect(mockDb.leftJoin).not.toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalledWith('mentorships.*');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      await expect(
        mentorshipService.getMentorshipsByMentor('mentor-1')
      ).rejects.toThrow('Failed to get mentorships');
    });
  });

  describe('getMentorshipsByMentee', () => {
    const mockMentorships = [
      {
        id: 'mentorship-1',
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        status: 'active',
        mentor_name: 'Senior Referee',
        mentor_email: 'senior@example.com'
      }
    ];

    beforeEach(() => {
      mockDb.orderBy.mockResolvedValue(mockMentorships);
    });

    it('should return mentorships with mentor details', async () => {
      const result = await mentorshipService.getMentorshipsByMentee('mentee-1');

      expect(mockDb.where).toHaveBeenCalledWith('mentee_id', 'mentee-1');
      expect(mockDb.leftJoin).toHaveBeenCalledWith('users as mentors', 'mentorships.mentor_id', 'mentors.id');
      expect(mockDb.select).toHaveBeenCalledWith(
        'mentorships.*',
        'mentors.name as mentor_name',
        'mentors.email as mentor_email',
        'mentors.phone as mentor_phone'
      );
      expect(result).toEqual(mockMentorships);
    });

    it('should filter by status when provided', async () => {
      await mentorshipService.getMentorshipsByMentee('mentee-1', { status: 'active' });

      expect(mockDb.where).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('getMentorshipWithDetails', () => {
    const mockMentorship = {
      id: 'mentorship-1',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      status: 'active',
      mentor_name: 'Senior Referee',
      mentee_name: 'Junior Referee'
    };

    beforeEach(() => {
      mockDb.first.mockResolvedValue(mockMentorship);
    });

    it('should return mentorship details for mentor', async () => {
      const result = await mentorshipService.getMentorshipWithDetails('mentorship-1', 'mentor-1');

      expect(mockDb.where).toHaveBeenCalledWith('mentorships.id', 'mentorship-1');
      expect(mockDb.leftJoin).toHaveBeenCalledWith('users as mentors', 'mentorships.mentor_id', 'mentors.id');
      expect(mockDb.leftJoin).toHaveBeenCalledWith('users as mentees', 'mentorships.mentee_id', 'mentees.id');
      expect(result).toEqual(mockMentorship);
    });

    it('should return mentorship details for mentee', async () => {
      const result = await mentorshipService.getMentorshipWithDetails('mentorship-1', 'mentee-1');

      expect(result).toEqual(mockMentorship);
    });

    it('should throw error when mentorship not found', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(
        mentorshipService.getMentorshipWithDetails('invalid-id', 'user-1')
      ).rejects.toThrow('Mentorship not found');
    });

    it('should deny access to unauthorized users', async () => {
      await expect(
        mentorshipService.getMentorshipWithDetails('mentorship-1', 'unauthorized-user')
      ).rejects.toThrow('Access denied: You can only view your own mentorship relationships');
    });
  });

  describe('updateMentorshipStatus', () => {
    const mockMentorship = {
      id: 'mentorship-1',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      status: 'active',
      end_date: null
    };

    beforeEach(() => {
      mockBaseService.findById.mockResolvedValue(mockMentorship);
      mockBaseService.update.mockResolvedValue({
        ...mockMentorship,
        status: 'completed',
        end_date: '2024-02-15'
      });
    });

    it('should update status to completed and set end_date', async () => {
      const result = await mentorshipService.updateMentorshipStatus('mentorship-1', 'completed', 'mentor-1');

      expect(mockBaseService.findById).toHaveBeenCalledWith('mentorship-1');
      expect(mockBaseService.update).toHaveBeenCalledWith(
        'mentorship-1',
        expect.objectContaining({
          status: 'completed',
          end_date: expect.any(String)
        }),
        {}
      );
      expect(result.status).toBe('completed');
    });

    it('should update status to terminated and set end_date', async () => {
      await mentorshipService.updateMentorshipStatus('mentorship-1', 'terminated', 'mentor-1');

      expect(mockBaseService.update).toHaveBeenCalledWith(
        'mentorship-1',
        expect.objectContaining({
          status: 'terminated',
          end_date: expect.any(String)
        }),
        {}
      );
    });

    it('should clear end_date when reactivating paused mentorship', async () => {
      const pausedMentorship = {
        ...mockMentorship,
        status: 'paused',
        end_date: '2024-02-01'
      };
      mockBaseService.findById.mockResolvedValue(pausedMentorship);

      await mentorshipService.updateMentorshipStatus('mentorship-1', 'active', 'mentor-1');

      expect(mockBaseService.update).toHaveBeenCalledWith(
        'mentorship-1',
        expect.objectContaining({
          status: 'active',
          end_date: null
        }),
        {}
      );
    });

    it('should throw error for invalid status', async () => {
      await expect(
        mentorshipService.updateMentorshipStatus('mentorship-1', 'invalid', 'mentor-1')
      ).rejects.toThrow('Invalid status: invalid');
    });

    it('should deny access to non-mentor users', async () => {
      await expect(
        mentorshipService.updateMentorshipStatus('mentorship-1', 'completed', 'unauthorized-user')
      ).rejects.toThrow('Access denied: Only the mentor can update mentorship status');
    });
  });

  describe('canUserBeMentor', () => {
    it('should return true if user passes mentor eligibility validation', async () => {
      jest.spyOn(mentorshipService, 'validateMentorEligibility').mockResolvedValue(undefined);

      const result = await mentorshipService.canUserBeMentor('user-1');

      expect(result).toBe(true);
      expect(mentorshipService.validateMentorEligibility).toHaveBeenCalledWith('user-1');
    });

    it('should return false if user fails mentor eligibility validation', async () => {
      jest.spyOn(mentorshipService, 'validateMentorEligibility')
        .mockRejectedValue(new Error('Not eligible'));

      const result = await mentorshipService.canUserBeMentor('user-1');

      expect(result).toBe(false);
    });
  });

  describe('getMentorshipStats', () => {
    const mockStats = {
      total_mentorships: '10',
      active_mentorships: '3',
      completed_mentorships: '5',
      paused_mentorships: '1',
      terminated_mentorships: '1'
    };

    beforeEach(() => {
      mockDb.first.mockResolvedValue(mockStats);
    });

    it('should return mentorship statistics', async () => {
      const result = await mentorshipService.getMentorshipStats('mentor-1');

      expect(mockDb.where).toHaveBeenCalledWith('mentor_id', 'mentor-1');
      expect(mockDb.raw).toHaveBeenCalledWith('COUNT(*) as total_mentorships');
      expect(result).toEqual({
        total: 10,
        active: 3,
        completed: 5,
        paused: 1,
        terminated: 1
      });
    });

    it('should handle null stats gracefully', async () => {
      mockDb.first.mockResolvedValue({
        total_mentorships: null,
        active_mentorships: null,
        completed_mentorships: null,
        paused_mentorships: null,
        terminated_mentorships: null
      });

      const result = await mentorshipService.getMentorshipStats('mentor-1');

      expect(result).toEqual({
        total: 0,
        active: 0,
        completed: 0,
        paused: 0,
        terminated: 0
      });
    });
  });

  describe('validateMentorEligibility', () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      role: 'referee'
    };

    beforeEach(() => {
      // First call for user check, subsequent calls for role checks
      mockDb.first
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null) // No RBAC role
        .mockResolvedValueOnce({ id: 1 }); // Has mentor referee role
    });

    it('should validate user with Mentorship Coordinator RBAC role', async () => {
      mockDb.first
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 1 }); // Has RBAC role

      await expect(
        mentorshipService.validateMentorEligibility('user-1')
      ).resolves.toBeUndefined();

      expect(mockDb.where).toHaveBeenCalledWith('user_roles.user_id', 'user-1');
      expect(mockDb.where).toHaveBeenCalledWith('roles.name', 'Mentorship Coordinator');
    });

    it('should validate user with Mentor referee role capability', async () => {
      await expect(
        mentorshipService.validateMentorEligibility('user-1')
      ).resolves.toBeUndefined();

      expect(mockDb.where).toHaveBeenCalledWith('user_referee_roles.user_id', 'user-1');
      expect(mockDb.where).toHaveBeenCalledWith('referee_roles.name', 'Mentor');
    });

    it('should throw error when user not found', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await expect(
        mentorshipService.validateMentorEligibility('invalid-user')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when user has no mentor permissions', async () => {
      mockDb.first
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null) // No RBAC role
        .mockResolvedValueOnce(null); // No referee role

      await expect(
        mentorshipService.validateMentorEligibility('user-1')
      ).rejects.toThrow('User does not have mentor permissions');
    });
  });

  describe('checkExistingRelationship', () => {
    it('should pass when no existing relationship found', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // No active/paused relationship
        .mockResolvedValueOnce(null); // No recent completed relationship

      await expect(
        mentorshipService.checkExistingRelationship('mentor-1', 'mentee-1')
      ).resolves.toBeUndefined();

      expect(mockDb.whereIn).toHaveBeenCalledWith('status', ['active', 'paused']);
    });

    it('should throw error when active relationship exists', async () => {
      mockDb.first.mockResolvedValueOnce({
        id: 'existing-1',
        status: 'active'
      });

      await expect(
        mentorshipService.checkExistingRelationship('mentor-1', 'mentee-1')
      ).rejects.toThrow('Active mentorship relationship already exists between these users (Status: active)');
    });

    it('should throw error when paused relationship exists', async () => {
      mockDb.first.mockResolvedValueOnce({
        id: 'existing-1',
        status: 'paused'
      });

      await expect(
        mentorshipService.checkExistingRelationship('mentor-1', 'mentee-1')
      ).rejects.toThrow('Active mentorship relationship already exists between these users (Status: paused)');
    });

    it('should throw error when recent completed relationship exists', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // No active/paused
        .mockResolvedValueOnce({ // Recent completed
          id: 'recent-1',
          status: 'completed',
          end_date: '2024-01-01'
        });

      await expect(
        mentorshipService.checkExistingRelationship('mentor-1', 'mentee-1')
      ).rejects.toThrow('Cannot create new mentorship: A mentorship between these users was completed within the last 30 days');
    });
  });

  describe('validateUsers', () => {
    const mockMentor = {
      id: 'mentor-1',
      name: 'Mentor User',
      role: 'referee'
    };

    const mockMentee = {
      id: 'mentee-1',
      name: 'Mentee User',
      role: 'referee'
    };

    beforeEach(() => {
      // Mock Promise.all resolution
      jest.spyOn(Promise, 'all').mockResolvedValue([mockMentor, mockMentee]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should validate both users when mentee is referee by role', async () => {
      await expect(
        mentorshipService.validateUsers('mentor-1', 'mentee-1')
      ).resolves.toBeUndefined();

      expect(Promise.all).toHaveBeenCalledWith([
        expect.any(Object), // mentor query
        expect.any(Object)  // mentee query
      ]);
    });

    it('should validate mentee with referee role capability when role is not referee', async () => {
      const nonRefereeUser = { ...mockMentee, role: 'user' };
      jest.spyOn(Promise, 'all').mockResolvedValue([mockMentor, nonRefereeUser]);

      // Mock the referee role check to return a role
      mockDb.first.mockResolvedValue({ id: 1 });

      await expect(
        mentorshipService.validateUsers('mentor-1', 'mentee-1')
      ).resolves.toBeUndefined();

      expect(mockDb.where).toHaveBeenCalledWith('roles.category', 'referee_type');
    });

    it('should throw error when mentor not found', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([null, mockMentee]);

      await expect(
        mentorshipService.validateUsers('mentor-1', 'mentee-1')
      ).rejects.toThrow('Mentor user not found');
    });

    it('should throw error when mentee not found', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([mockMentor, null]);

      await expect(
        mentorshipService.validateUsers('mentor-1', 'mentee-1')
      ).rejects.toThrow('Mentee user not found');
    });

    it('should throw error when mentee is not a referee', async () => {
      const nonRefereeUser = { ...mockMentee, role: 'user' };
      jest.spyOn(Promise, 'all').mockResolvedValue([mockMentor, nonRefereeUser]);

      // Mock no referee role found
      mockDb.first.mockResolvedValue(null);

      await expect(
        mentorshipService.validateUsers('mentor-1', 'mentee-1')
      ).rejects.toThrow('Mentee must be a referee to participate in mentorship program');
    });
  });

  describe('findAvailableMentors', () => {
    const mockMentors = [
      {
        id: 'mentor-1',
        name: 'Senior Referee 1',
        email: 'senior1@example.com',
        phone: '123-456-7890'
      },
      {
        id: 'mentor-2',
        name: 'Senior Referee 2',
        email: 'senior2@example.com',
        phone: '098-765-4321'
      }
    ];

    beforeEach(() => {
      mockDb.orderBy.mockResolvedValue(mockMentors);
    });

    it('should return available mentors excluding those already mentoring the mentee', async () => {
      const result = await mentorshipService.findAvailableMentors('mentee-1');

      expect(mockDb.select).toHaveBeenCalledWith(
        'users.id',
        'users.name',
        'users.email',
        'users.phone'
      );
      expect(mockDb.whereExists).toHaveBeenCalled();
      expect(mockDb.whereNotExists).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalledWith('users.id', '!=', 'mentee-1');
      expect(mockDb.orderBy).toHaveBeenCalledWith('users.name');
      expect(result).toEqual(mockMentors);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.orderBy.mockRejectedValue(new Error('Database error'));

      await expect(
        mentorshipService.findAvailableMentors('mentee-1')
      ).rejects.toThrow('Failed to find available mentors');
    });
  });

  describe('Lifecycle Hooks', () => {
    describe('afterCreate', () => {
      it('should log mentorship creation when audit trail is enabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        mentorshipService.options.enableAuditTrail = true;

        const mentorship = {
          id: 'mentorship-1',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-1'
        };

        await mentorshipService.afterCreate(mentorship, {});

        expect(consoleSpy).toHaveBeenCalledWith(
          'Mentorship relationship created: mentor-1 -> mentee-1 (mentorship-1)'
        );

        consoleSpy.mockRestore();
      });

      it('should not log when audit trail is disabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        mentorshipService.options.enableAuditTrail = false;

        const mentorship = {
          id: 'mentorship-1',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-1'
        };

        await mentorshipService.afterCreate(mentorship, {});

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('afterUpdate', () => {
      it('should log status changes when audit trail is enabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        mentorshipService.options.enableAuditTrail = true;

        const mentorship = {
          id: 'mentorship-1',
          status: 'completed'
        };

        const previousMentorship = {
          id: 'mentorship-1',
          status: 'active'
        };

        await mentorshipService.afterUpdate(mentorship, previousMentorship, {});

        expect(consoleSpy).toHaveBeenCalledWith(
          'Mentorship mentorship-1 status changed: active -> completed'
        );

        consoleSpy.mockRestore();
      });

      it('should not log when status unchanged', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        mentorshipService.options.enableAuditTrail = true;

        const mentorship = {
          id: 'mentorship-1',
          status: 'active',
          notes: 'Updated notes'
        };

        const previousMentorship = {
          id: 'mentorship-1',
          status: 'active',
          notes: 'Old notes'
        };

        await mentorshipService.afterUpdate(mentorship, previousMentorship, {});

        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });
});