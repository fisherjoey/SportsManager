/**
 * AssignmentService Unit Tests
 * 
 * Tests for the AssignmentService class that provides assignment management
 * operations, including conflict checking, bulk operations, and game status updates.
 */

const AssignmentService = require('../../src/services/AssignmentService');

// Mock dependencies
jest.mock('../../src/services/conflictDetectionService');
jest.mock('../../src/utils/wage-calculator');
jest.mock('../../src/utils/organization-settings');

const { checkAssignmentConflicts } = require('../../src/services/conflictDetectionService');
const { calculateFinalWage, getWageBreakdown } = require('../../src/utils/wage-calculator');
const { getOrganizationSettings } = require('../../src/utils/organization-settings');

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

describe('AssignmentService', () => {
  let assignmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    assignmentService = new AssignmentService(mockTable);

    // Setup mock transaction
    const mockTrx = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    mockTable.transaction = jest.fn().mockResolvedValue(mockTrx);
    assignmentService.withTransaction = jest.fn().mockImplementation(async (callback) => {
      return await callback(mockTrx);
    });

    // Setup default mocks
    getOrganizationSettings.mockResolvedValue({
      payment_model: 'INDIVIDUAL',
      default_game_rate: 50
    });
    calculateFinalWage.mockReturnValue(60);
    getWageBreakdown.mockReturnValue({
      baseWage: 50,
      multiplier: 1.2,
      finalWage: 60
    });
  });

  describe('Constructor', () => {
    it('should initialize with correct table and options', () => {
      expect(assignmentService.tableName).toBe('game_assignments');
      expect(assignmentService.db).toBe(mockTable);
      expect(assignmentService.options.enableAuditTrail).toBe(true);
    });
  });

  describe('createAssignment', () => {
    const mockAssignmentData = {
      game_id: 'game123',
      user_id: 'user456',
      position_id: 'pos789',
      assigned_by: 'admin123'
    };

    const mockGame = {
      id: 'game123',
      game_date: '2024-01-15',
      game_time: '19:00',
      location: 'Downtown Arena',
      level: 'Elite',
      pay_rate: 50,
      wage_multiplier: 1.2,
      refs_needed: 2
    };

    const mockReferee = {
      id: 'user456',
      name: 'John Referee',
      role: 'referee',
      wage_per_game: 55,
      level_name: 'Senior'
    };

    const mockPosition = {
      id: 'pos789',
      name: 'Referee'
    };

    beforeEach(() => {
      // Mock database calls in transaction
      assignmentService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTrx = {
          ...mockQueryBuilder,
          commit: jest.fn(),
          rollback: jest.fn()
        };

        // Setup specific mock returns for different table calls
        let callCount = 0;
        mockTrx.mockImplementation = jest.fn((tableName) => {
          callCount++;
          
          const qb = { ...mockQueryBuilder };
          
          if (tableName === 'games') {
            qb.first = jest.fn().mockResolvedValue(mockGame);
          } else if (tableName === 'users') {
            qb.first = jest.fn().mockResolvedValue(mockReferee);
          } else if (tableName === 'positions') {
            qb.first = jest.fn().mockResolvedValue(mockPosition);
          } else if (tableName === 'game_assignments') {
            qb.first = jest.fn().mockResolvedValue(null); // No existing assignments
            qb.count = jest.fn().mockReturnValue(qb);
            qb.first = jest.fn().mockResolvedValue({ count: '0' });
          }
          
          return qb;
        });

        return await callback(mockTrx);
      });

      // Mock service methods
      assignmentService.create = jest.fn().mockResolvedValue({
        id: 'assign123',
        ...mockAssignmentData,
        status: 'pending',
        calculated_wage: 60
      });
      assignmentService._updateGameStatus = jest.fn().mockResolvedValue(mockGame);

      // Mock conflict detection
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: []
      });
    });

    it('should create assignment successfully', async () => {
      const result = await assignmentService.createAssignment(mockAssignmentData);

      expect(checkAssignmentConflicts).toHaveBeenCalledWith(mockAssignmentData);
      expect(calculateFinalWage).toHaveBeenCalled();
      expect(assignmentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          game_id: 'game123',
          user_id: 'user456',
          position_id: 'pos789',
          status: 'pending',
          calculated_wage: 60
        }),
        expect.any(Object)
      );

      expect(result.assignment).toBeDefined();
      expect(result.wageBreakdown).toBeDefined();
      expect(result.warnings).toEqual([]);
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = { game_id: 'game123' }; // Missing user_id and position_id

      await expect(assignmentService.createAssignment(invalidData)).rejects.toThrow('game_id, user_id, and position_id are required');
    });

    it('should throw error when conflicts detected', async () => {
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'double_booking' }],
        errors: ['Referee is double-booked']
      });

      await expect(assignmentService.createAssignment(mockAssignmentData)).rejects.toThrow('Assignment conflicts detected: Referee is double-booked');
    });

    it('should include warnings in response when present', async () => {
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: ['Referee level may not be suitable for this game']
      });

      const result = await assignmentService.createAssignment(mockAssignmentData);

      expect(result.warnings).toEqual(['Referee level may not be suitable for this game']);
    });
  });

  describe('bulkUpdateAssignments', () => {
    const mockUpdates = [
      { assignment_id: 'assign1', status: 'accepted' },
      { assignment_id: 'assign2', status: 'declined' }
    ];

    beforeEach(() => {
      assignmentService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTrx = {
          commit: jest.fn(),
          rollback: jest.fn()
        };
        return await callback(mockTrx);
      });

      assignmentService.update = jest.fn().mockResolvedValue({
        id: 'assign1',
        status: 'accepted'
      });

      assignmentService._updateGameStatus = jest.fn();
    });

    it('should perform bulk updates successfully', async () => {
      // Mock existing assignments
      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue({ id: 'assign1', game_id: 'game1' })
      });

      const result = await assignmentService.bulkUpdateAssignments(mockUpdates);

      expect(result.summary.totalSubmitted).toBe(2);
      expect(result.summary.successfulUpdates).toBe(2);
      expect(result.summary.failedUpdates).toBe(0);
      expect(result.updatedAssignments).toHaveLength(2);
    });

    it('should throw error for empty updates array', async () => {
      await expect(assignmentService.bulkUpdateAssignments([])).rejects.toThrow('Updates array is required and cannot be empty');
    });

    it('should throw error for too many updates', async () => {
      const tooManyUpdates = new Array(101).fill({ assignment_id: 'test', status: 'accepted' });

      await expect(assignmentService.bulkUpdateAssignments(tooManyUpdates)).rejects.toThrow('Maximum 100 assignments can be updated at once');
    });

    it('should handle validation errors', async () => {
      const invalidUpdates = [
        { assignment_id: 'assign1', status: 'accepted' },
        { assignment_id: 'assign2' }, // Missing status
        { status: 'accepted' } // Missing assignment_id
      ];

      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue({ id: 'assign1', game_id: 'game1' })
      });

      const result = await assignmentService.bulkUpdateAssignments(invalidUpdates);

      expect(result.summary.successfulUpdates).toBe(1);
      expect(result.summary.failedUpdates).toBe(2);
      expect(result.updateErrors).toHaveLength(2);
    });

    it('should handle assignment not found errors', async () => {
      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(null) // Assignment not found
      });

      const result = await assignmentService.bulkUpdateAssignments(mockUpdates);

      expect(result.summary.failedUpdates).toBe(2);
      expect(result.updateErrors[0].error).toBe('Assignment not found');
    });

    it('should rollback transaction when all updates fail', async () => {
      mockTable.mockReturnValue({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(null) // All assignments not found
      });

      await expect(assignmentService.bulkUpdateAssignments(mockUpdates)).rejects.toThrow('All assignment updates failed');
    });
  });

  describe('getAssignmentsWithDetails', () => {
    const mockAssignments = [
      {
        id: 'assign1',
        game_id: 'game1',
        user_id: 'user1',
        status: 'accepted',
        game_date: '2024-01-15',
        home_team_name: 'Team A',
        away_team_name: 'Team B',
        referee_name: 'John Referee'
      }
    ];

    const mockCountResult = { total: 10 };

    beforeEach(() => {
      // Mock Promise.all for parallel queries
      jest.spyOn(Promise, 'all').mockResolvedValue([mockAssignments, mockCountResult]);
    });

    afterEach(() => {
      Promise.all.mockRestore();
    });

    it('should return assignments with enhanced details', async () => {
      const result = await assignmentService.getAssignmentsWithDetails({}, 1, 10);

      expect(result.data).toEqual(mockAssignments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        game_id: 'game1',
        user_id: 'user1',
        status: 'accepted',
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };

      await assignmentService.getAssignmentsWithDetails(filters, 1, 10);

      expect(mockTable).toHaveBeenCalledWith('game_assignments');
      // Verify filter application through query builder calls
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('game_assignments.game_id', 'game1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('game_assignments.user_id', 'user1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('game_assignments.status', 'accepted');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('games.game_date', '>=', '2024-01-01');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('games.game_date', '<=', '2024-01-31');
    });

    it('should handle pagination correctly', async () => {
      await assignmentService.getAssignmentsWithDetails({}, 2, 5);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(5); // (2-1) * 5
    });
  });

  describe('bulkRemoveAssignments', () => {
    const mockAssignmentIds = ['assign1', 'assign2', 'assign3'];
    const mockAssignmentsToDelete = [
      { id: 'assign1', game_id: 'game1' },
      { id: 'assign2', game_id: 'game2' },
      { id: 'assign3', game_id: 'game1' }
    ];

    beforeEach(() => {
      assignmentService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTrx = {
          commit: jest.fn(),
          rollback: jest.fn(),
          ...mockQueryBuilder
        };

        // Mock finding assignments to delete
        mockTrx.mockReturnValue = jest.fn(() => ({
          ...mockQueryBuilder,
          whereIn: jest.fn().mockReturnValue({
            ...mockQueryBuilder,
            select: jest.fn().mockResolvedValue(mockAssignmentsToDelete)
          })
        }));

        return await callback(mockTrx);
      });

      assignmentService._updateGameStatus = jest.fn();
    });

    it('should bulk remove assignments successfully', async () => {
      mockQueryBuilder.del.mockResolvedValue(3);

      const result = await assignmentService.bulkRemoveAssignments(mockAssignmentIds);

      expect(result.deletedCount).toBe(3);
      expect(result.affectedGames).toBe(2); // game1 and game2
      expect(result.summary.totalRequested).toBe(3);
      expect(result.summary.successfullyDeleted).toBe(3);
    });

    it('should throw error for empty assignment IDs array', async () => {
      await expect(assignmentService.bulkRemoveAssignments([])).rejects.toThrow('Assignment IDs array is required and cannot be empty');
    });

    it('should throw error for too many assignment IDs', async () => {
      const tooManyIds = new Array(101).fill('assignId');

      await expect(assignmentService.bulkRemoveAssignments(tooManyIds)).rejects.toThrow('Maximum 100 assignments can be removed at once');
    });

    it('should handle case when no assignments found', async () => {
      assignmentService.withTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTrx = {
          ...mockQueryBuilder,
          commit: jest.fn(),
          rollback: jest.fn()
        };

        mockTrx.mockReturnValue = jest.fn(() => ({
          ...mockQueryBuilder,
          whereIn: jest.fn().mockReturnValue({
            ...mockQueryBuilder,
            select: jest.fn().mockResolvedValue([]) // No assignments found
          })
        }));

        return await callback(mockTrx);
      });

      const result = await assignmentService.bulkRemoveAssignments(mockAssignmentIds);

      expect(result.deletedCount).toBe(0);
      expect(result.warnings).toContain('No assignments found with provided IDs');
    });
  });

  describe('getAvailableRefereesForGame', () => {
    const mockGame = {
      id: 'game123',
      game_date: '2024-01-15',
      game_time: '19:00',
      location: 'Downtown Arena',
      level: 'Elite'
    };

    const mockReferees = [
      { id: 'ref1', name: 'Referee 1', level_name: 'Senior' },
      { id: 'ref2', name: 'Referee 2', level_name: 'Junior' }
    ];

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(mockGame);
      mockQueryBuilder.mockResolvedValue(mockReferees);

      // Mock conflict analysis for each referee
      checkAssignmentConflicts
        .mockResolvedValueOnce({
          hasConflicts: false,
          conflicts: [],
          warnings: [],
          isQualified: true
        })
        .mockResolvedValueOnce({
          hasConflicts: true,
          conflicts: [{ type: 'time_conflict' }],
          warnings: [],
          isQualified: true
        });
    });

    it('should return available referees with conflict analysis', async () => {
      const result = await assignmentService.getAvailableRefereesForGame('game123');

      expect(result.game.id).toBe('game123');
      expect(result.referees).toHaveLength(2);
      expect(result.referees[0].can_assign).toBe(true);
      expect(result.referees[1].can_assign).toBe(false);
      expect(result.summary.total).toBe(2);
      expect(result.summary.available).toBe(1);
      expect(result.summary.conflicts).toBe(1);
    });

    it('should throw error when game not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(assignmentService.getAvailableRefereesForGame('nonexistent')).rejects.toThrow('Game not found');
    });

    it('should handle conflict analysis errors gracefully', async () => {
      checkAssignmentConflicts
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce({
          hasConflicts: false,
          conflicts: [],
          warnings: []
        });

      const result = await assignmentService.getAvailableRefereesForGame('game123');

      expect(result.referees[0].availability_status).toBe('error');
      expect(result.referees[0].warnings[0]).toContain('Analysis error');
      expect(result.summary.errors).toBe(1);
    });
  });

  describe('_updateGameStatus', () => {
    const mockGame = {
      id: 'game123',
      refs_needed: 2
    };

    beforeEach(() => {
      mockQueryBuilder.first
        .mockResolvedValueOnce(mockGame) // Game lookup
        .mockResolvedValueOnce({ count: '1' }); // Assignment count

      mockQueryBuilder.returning.mockResolvedValue([{
        ...mockGame,
        status: 'assigned'
      }]);
    });

    it('should update game status to unassigned when no referees', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce(mockGame)
        .mockResolvedValueOnce({ count: '0' });

      mockQueryBuilder.returning.mockResolvedValue([{
        ...mockGame,
        status: 'unassigned'
      }]);

      const result = await assignmentService._updateGameStatus('game123', mockTable);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'unassigned',
        updated_at: expect.any(Date)
      });
    });

    it('should update game status to assigned when referees are assigned', async () => {
      const result = await assignmentService._updateGameStatus('game123', mockTable);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'assigned',
        updated_at: expect.any(Date)
      });
    });

    it('should throw error when game not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(assignmentService._updateGameStatus('nonexistent', mockTable)).rejects.toThrow('Game not found');
    });
  });

  describe('Hook methods', () => {
    it('should log assignment creation when audit trail enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockAssignment = { id: 'assign123', game_id: 'game456' };

      await assignmentService.afterCreate(mockAssignment, {});

      expect(consoleSpy).toHaveBeenCalledWith('Assignment created: assign123 for game game456');

      consoleSpy.mockRestore();
    });

    it('should log status changes when audit trail enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const previousAssignment = { id: 'assign123', status: 'pending' };
      const updatedAssignment = { id: 'assign123', status: 'accepted' };

      await assignmentService.afterUpdate(updatedAssignment, previousAssignment, {});

      expect(consoleSpy).toHaveBeenCalledWith('Assignment status changed: assign123 from pending to accepted');

      consoleSpy.mockRestore();
    });

    it('should not log when status unchanged', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const assignment = { id: 'assign123', status: 'pending' };

      await assignmentService.afterUpdate(assignment, assignment, {});

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});