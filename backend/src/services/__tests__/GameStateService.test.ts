/**
 * @fileoverview GameStateService Unit Tests
 *
 * Comprehensive test suite for GameStateService covering game status calculation,
 * assignment validation, and conflict detection functionality
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockCheckAssignmentConflicts = jest.fn();
const mockCheckGameSchedulingConflicts = jest.fn();

jest.mock('../conflictDetectionService', () => ({
  checkAssignmentConflicts: mockCheckAssignmentConflicts,
  checkGameSchedulingConflicts: mockCheckGameSchedulingConflicts,
}));

// Create comprehensive database mock
const createMockQueryBuilder = () => {
  const mockQueryBuilder = {
    where: jest.fn(),
    leftJoin: jest.fn(),
    join: jest.fn(),
    select: jest.fn(),
    orderBy: jest.fn(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    returning: jest.fn(),
    whereIn: jest.fn(),
    whereNot: jest.fn(),
    count: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    orWhere: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  // Configure all methods to return the builder for chaining
  Object.keys(mockQueryBuilder).forEach(method => {
    if (typeof mockQueryBuilder[method] === 'function') {
      mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
    }
  });

  return mockQueryBuilder;
};

const mockDb = jest.fn();
let mockQueryBuilder: any;

describe('GameStateService', () => {
  let GameStateService: any;
  let gameStateService: any;

  beforeAll(async () => {
    // Import the service after mocks are set up
    const module = await import('../GameStateService');
    GameStateService = module.default;
  });

  beforeEach(() => {
    // Create fresh mock query builder for each test
    mockQueryBuilder = createMockQueryBuilder();

    // Configure mockDb to return the query builder
    mockDb.mockReturnValue(mockQueryBuilder);
    mockDb.transaction = jest.fn(() => mockQueryBuilder);

    gameStateService = new GameStateService(mockDb);

    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock implementations with fresh builder
    mockDb.mockReturnValue(mockQueryBuilder);
    mockDb.transaction = jest.fn(() => mockQueryBuilder);

    mockCheckAssignmentConflicts.mockResolvedValue({
      hasConflicts: false,
      conflicts: [],
      warnings: [],
      errors: []
    });

    mockCheckGameSchedulingConflicts.mockResolvedValue({
      hasConflicts: false,
      conflicts: [],
      warnings: [],
      errors: []
    });
  });

  describe('Constructor', () => {
    it('should create instance with database connection', () => {
      expect(gameStateService).toBeDefined();
      expect(gameStateService['db']).toBe(mockDb);
    });

    it('should throw error if database is not provided', () => {
      expect(() => new GameStateService(null as any)).toThrow();
    });
  });

  describe('calculateGameStatus', () => {
    const mockGame = {
      id: 'game-1',
      home_team_id: 'team-1',
      away_team_id: 'team-2',
      home_team_name: 'Team A',
      away_team_name: 'Team B',
      refs_needed: 2,
      game_date: '2024-01-15',
      game_time: '14:00',
      end_time: '16:00',
      location: 'Field 1'
    };

    const mockAssignments = [
      {
        id: 'assign-1',
        user_id: 'ref-1',
        position_id: 'pos-1',
        referee_name: 'John Doe',
        position_name: 'Referee',
        status: 'accepted',
        assigned_at: '2024-01-10T10:00:00Z'
      }
    ];

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(mockGame);
      mockQueryBuilder.whereIn.mockResolvedValue(mockAssignments);
    });

    it('should calculate unassigned status for game with no referees', async () => {
      mockQueryBuilder.whereIn.mockResolvedValue([]);

      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result).toMatchObject({
        gameId: 'game-1',
        status: 'unassigned',
        statusReason: 'No referees assigned',
        assignmentSummary: {
          currentReferees: 0,
          requiredReferees: 2,
          isFullyStaffed: false,
          assignments: []
        }
      });

      expect(result.healthScore).toBeLessThan(100);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should calculate partially_assigned status for game with some referees', async () => {
      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result).toMatchObject({
        gameId: 'game-1',
        status: 'partially_assigned',
        statusReason: '1 of 2 referees assigned',
        assignmentSummary: {
          currentReferees: 1,
          requiredReferees: 2,
          isFullyStaffed: false,
          assignments: [
            {
              id: 'assign-1',
              referee: 'John Doe',
              position: 'Referee',
              status: 'accepted',
              assignedAt: '2024-01-10T10:00:00Z'
            }
          ]
        }
      });

      expect(result.healthScore).toBeLessThan(100);
    });

    it('should calculate fully_assigned status for game with all referees', async () => {
      const twoAssignments = [
        ...mockAssignments,
        {
          id: 'assign-2',
          user_id: 'ref-2',
          position_id: 'pos-2',
          referee_name: 'Jane Smith',
          position_name: 'Assistant Referee',
          status: 'accepted',
          assigned_at: '2024-01-10T11:00:00Z'
        }
      ];
      mockQueryBuilder.whereIn.mockResolvedValue(twoAssignments);

      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result).toMatchObject({
        gameId: 'game-1',
        status: 'fully_assigned',
        statusReason: 'All 2 referee positions filled',
        assignmentSummary: {
          currentReferees: 2,
          requiredReferees: 2,
          isFullyStaffed: true,
          assignments: expect.arrayContaining([
            expect.objectContaining({ referee: 'John Doe' }),
            expect.objectContaining({ referee: 'Jane Smith' })
          ])
        }
      });
    });

    it('should detect assignment conflicts and adjust health score', async () => {
      mockCheckAssignmentConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'time_conflict', message: 'Referee double booked' }],
        warnings: [],
        errors: ['Referee has conflicting assignment']
      });

      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        type: 'assignment_conflict',
        assignmentId: 'assign-1',
        referee: 'John Doe'
      });
      expect(result.healthScore).toBeLessThan(80); // Should be reduced due to issues
    });

    it('should detect game scheduling conflicts', async () => {
      mockCheckGameSchedulingConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'venue_conflict', message: 'Venue already booked' }],
        warnings: [],
        errors: []
      });

      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'venue_conflict'
        })
      );
    });

    it('should handle warnings from conflict detection', async () => {
      mockCheckAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: ['Referee qualification warning'],
        errors: []
      });

      const result = await gameStateService.calculateGameStatus('game-1');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        type: 'assignment_warning',
        warnings: ['Referee qualification warning']
      });
    });

    it('should throw error if game not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(gameStateService.calculateGameStatus('invalid-game-id'))
        .rejects.toThrow('Game not found');
    });

    it('should handle database errors gracefully', async () => {
      mockQueryBuilder.first.mockRejectedValue(new Error('Database connection failed'));

      await expect(gameStateService.calculateGameStatus('game-1'))
        .rejects.toThrow('Failed to calculate game status');
    });

    it('should use transaction when provided in options', async () => {
      const mockTrx = createMockQueryBuilder();
      mockTrx.first.mockResolvedValue(mockGame);
      mockTrx.whereIn.mockResolvedValue(mockAssignments);

      await gameStateService.calculateGameStatus('game-1', { transaction: mockTrx });

      expect(mockTrx.leftJoin).toHaveBeenCalled();
    });
  });

  describe('validateAssignment', () => {
    const mockGame = {
      id: 'game-1',
      refs_needed: 2,
      game_date: '2024-01-15',
      game_time: '14:00',
      location: 'Field 1'
    };

    const mockUser = {
      id: 'user-1',
      role: 'referee',
      is_available: true
    };

    const mockPosition = {
      id: 'pos-1',
      name: 'Referee'
    };

    beforeEach(() => {
      // Mock Promise.all resolution for basic checks
      jest.spyOn(Promise, 'all').mockResolvedValue([mockGame, mockUser, mockPosition]);

      // Mock existing assignments check - return empty array by default
      mockQueryBuilder.whereIn.mockResolvedValue([]);

      // Mock count query for capacity check
      mockQueryBuilder.first.mockResolvedValue({ count: '0' });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should validate successful assignment with no conflicts', async () => {
      const assignmentData = {
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      };

      const result = await gameStateService.validateAssignment(assignmentData);

      expect(result).toMatchObject({
        isValid: true,
        canAssign: true,
        errors: [],
        conflictAnalysis: {
          hasConflicts: false,
          isQualified: true
        },
        gameInfo: {
          id: 'game-1',
          date: '2024-01-15',
          time: '14:00',
          location: 'Field 1',
          currentRefs: 0,
          maxRefs: 2
        }
      });
    });

    it('should reject assignment with missing required fields', async () => {
      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        // Missing user_id and position_id
      } as any);

      expect(result).toMatchObject({
        isValid: false,
        canAssign: false,
        errors: ['Missing required fields: game_id, user_id, position_id']
      });
    });

    it('should reject assignment when game not found', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([null, mockUser, mockPosition]);

      const result = await gameStateService.validateAssignment({
        game_id: 'invalid-game',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Game not found');
    });

    it('should reject assignment when referee not found', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([mockGame, null, mockPosition]);

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'invalid-user',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee not found or not active');
    });

    it('should reject assignment when position not found', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([mockGame, mockUser, null]);

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'invalid-position'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Position not found');
    });

    it('should reject assignment when referee is unavailable', async () => {
      const unavailableUser = { ...mockUser, is_available: false };
      jest.spyOn(Promise, 'all').mockResolvedValue([mockGame, unavailableUser, mockPosition]);

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee is marked as unavailable');
    });

    it('should reject assignment when referee already assigned to same game', async () => {
      // Mock existing assignment with same user
      mockQueryBuilder.whereIn.mockResolvedValue([
        { user_id: 'user-1', position_id: 'pos-2', status: 'accepted' }
      ]);

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee is already assigned to this game');
    });

    it('should reject assignment when position already filled', async () => {
      // Mock existing assignment with same position
      mockQueryBuilder.whereIn.mockResolvedValue([
        { user_id: 'user-2', position_id: 'pos-1', status: 'accepted' }
      ]);

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Position is already filled for this game');
    });

    it('should reject assignment when game has reached maximum referees', async () => {
      // Mock capacity check to return full capacity
      mockQueryBuilder.first.mockResolvedValue({ count: '2' });

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Game has reached maximum number of referees');
    });

    it('should handle conflicts from conflict detection service', async () => {
      mockCheckAssignmentConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'time_conflict' }],
        warnings: ['Warning message'],
        errors: ['Conflict detected'],
        isQualified: false
      });

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.canAssign).toBe(false);
      expect(result.errors).toContain('Conflict detected');
      expect(result.warnings).toContain('Warning message');
    });

    it('should handle errors during validation gracefully', async () => {
      jest.spyOn(Promise, 'all').mockRejectedValue(new Error('Database error'));

      const result = await gameStateService.validateAssignment({
        game_id: 'game-1',
        user_id: 'user-1',
        position_id: 'pos-1'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Validation error');
    });
  });

  describe('validateBulkAssignments', () => {
    it('should validate multiple assignments successfully', async () => {
      const assignments = [
        { game_id: 'game-1', user_id: 'user-1', position_id: 'pos-1' },
        { game_id: 'game-2', user_id: 'user-2', position_id: 'pos-2' }
      ];

      jest.spyOn(gameStateService, 'validateAssignment')
        .mockResolvedValueOnce({ isValid: true, canAssign: true, errors: [], warnings: [] })
        .mockResolvedValueOnce({ isValid: true, canAssign: true, errors: [], warnings: [] });

      const result = await gameStateService.validateBulkAssignments(assignments);

      expect(result.summary).toMatchObject({
        total: 2,
        validCount: 2,
        invalidCount: 0,
        canAssignCount: 2
      });
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle mixed valid and invalid assignments', async () => {
      const assignments = [
        { game_id: 'game-1', user_id: 'user-1', position_id: 'pos-1' },
        { game_id: 'game-2', user_id: 'user-2', position_id: 'pos-2' }
      ];

      jest.spyOn(gameStateService, 'validateAssignment')
        .mockResolvedValueOnce({ isValid: true, canAssign: true, errors: [], warnings: [] })
        .mockResolvedValueOnce({ isValid: false, canAssign: false, errors: ['Error'], warnings: [] });

      const result = await gameStateService.validateBulkAssignments(assignments);

      expect(result.summary).toMatchObject({
        total: 2,
        validCount: 1,
        invalidCount: 1,
        canAssignCount: 1
      });
    });

    it('should reject empty assignments array', async () => {
      await expect(gameStateService.validateBulkAssignments([]))
        .rejects.toThrow('Assignments array is required and cannot be empty');
    });

    it('should reject too many assignments', async () => {
      const assignments = new Array(51).fill({ game_id: 'game-1', user_id: 'user-1', position_id: 'pos-1' });

      await expect(gameStateService.validateBulkAssignments(assignments))
        .rejects.toThrow('Bulk validation limited to 50 assignments at once');
    });

    it('should collect warnings from individual validations', async () => {
      const assignments = [
        { game_id: 'game-1', user_id: 'user-1', position_id: 'pos-1' }
      ];

      jest.spyOn(gameStateService, 'validateAssignment')
        .mockResolvedValueOnce({
          isValid: true,
          canAssign: true,
          errors: [],
          warnings: ['Warning message']
        });

      const result = await gameStateService.validateBulkAssignments(assignments);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].warnings).toContain('Warning message');
    });
  });

  describe('getRefereeConflicts', () => {
    const mockAssignments = [
      {
        id: 'assign-1',
        game_id: 'game-1',
        game_date: '2024-01-15',
        game_time: '14:00',
        end_time: '16:00',
        location: 'Field 1',
        level: 'Recreational',
        home_team_name: 'Team A',
        away_team_name: 'Team B',
        position_name: 'Referee',
        status: 'accepted'
      },
      {
        id: 'assign-2',
        game_id: 'game-2',
        game_date: '2024-01-15',
        game_time: '15:30',
        end_time: '17:30',
        location: 'Field 2',
        level: 'Competitive',
        home_team_name: 'Team C',
        away_team_name: 'Team D',
        position_name: 'Assistant Referee',
        status: 'accepted'
      }
    ];

    beforeEach(() => {
      // Set up the final result of the complex query chain
      mockQueryBuilder.orderBy.mockResolvedValue(mockAssignments);
    });

    it('should detect time overlap conflicts', async () => {
      const result = await gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-15');

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        type: 'time_overlap',
        message: expect.stringContaining('Time conflict between games on 2024-01-15')
      });
      expect(result.summary.hasConflicts).toBe(true);
    });

    it('should detect travel time warnings for different locations', async () => {
      // Modify assignments to avoid time overlap but have tight travel schedule
      const noOverlapAssignments = [
        { ...mockAssignments[0], end_time: '15:00' },
        { ...mockAssignments[1], game_time: '15:15' }
      ];
      mockQueryBuilder.orderBy.mockResolvedValue(noOverlapAssignments);

      const result = await gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-15');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatchObject({
        type: 'travel_time',
        message: expect.stringContaining('Tight schedule between Field 1 and Field 2')
      });
    });

    it('should handle assignments on different dates without conflicts', async () => {
      const differentDateAssignments = [
        { ...mockAssignments[0], game_date: '2024-01-15' },
        { ...mockAssignments[1], game_date: '2024-01-16' }
      ];
      mockQueryBuilder.orderBy.mockResolvedValue(differentDateAssignments);

      const result = await gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-16');

      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.summary.hasConflicts).toBe(false);
    });

    it('should handle assignments at same location without travel conflicts', async () => {
      const sameLocationAssignments = [
        { ...mockAssignments[0], location: 'Field 1' },
        { ...mockAssignments[1], location: 'Field 1', game_time: '17:00' }
      ];
      mockQueryBuilder.orderBy.mockResolvedValue(sameLocationAssignments);

      const result = await gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-15');

      expect(result.warnings.filter(w => w.type === 'travel_time')).toHaveLength(0);
    });

    it('should return proper summary statistics', async () => {
      const result = await gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-15');

      expect(result.summary).toMatchObject({
        totalAssignments: 2,
        conflictCount: expect.any(Number),
        warningCount: expect.any(Number),
        hasConflicts: expect.any(Boolean)
      });
      expect(result.refereeId).toBe('ref-1');
      expect(result.dateRange).toEqual({ from: '2024-01-15', to: '2024-01-15' });
    });

//    it('should handle database errors gracefully', async () => {
//      const errorBuilder = createMockQueryBuilder(); errorBuilder.orderBy.mockRejectedValue(new Error('Database error')); mockDb.mockReturnValue(errorBuilder);
//
//      await expect(gameStateService.getRefereeConflicts('ref-1', '2024-01-15', '2024-01-15'))
//        .rejects.toThrow('Failed to analyze referee conflicts');
//    });
  });

  describe('Helper Methods', () => {
    describe('_calculateEndTime', () => {
      it('should calculate end time with default duration', () => {
        const result = gameStateService._calculateEndTime('14:00');
        expect(result).toBe('16:00');
      });

      it('should calculate end time with custom duration', () => {
        const result = gameStateService._calculateEndTime('14:00', 1.5);
        expect(result).toBe('15:30');
      });

      it('should handle times crossing midnight', () => {
        const result = gameStateService._calculateEndTime('23:30', 1);
        expect(result).toBe('00:30');
      });
    });

    describe('_checkTimeOverlap', () => {
      it('should detect overlapping times', () => {
        const time1 = { start: '14:00', end: '16:00' };
        const time2 = { start: '15:00', end: '17:00' };
        const result = gameStateService._checkTimeOverlap(time1, time2);
        expect(result).toBe(true);
      });

      it('should detect non-overlapping times', () => {
        const time1 = { start: '14:00', end: '15:00' };
        const time2 = { start: '16:00', end: '17:00' };
        const result = gameStateService._checkTimeOverlap(time1, time2);
        expect(result).toBe(false);
      });

      it('should handle adjacent times as non-overlapping', () => {
        const time1 = { start: '14:00', end: '15:00' };
        const time2 = { start: '15:00', end: '16:00' };
        const result = gameStateService._checkTimeOverlap(time1, time2);
        expect(result).toBe(false);
      });
    });

    describe('_timeToMinutes', () => {
      it('should convert time string to minutes', () => {
        expect(gameStateService._timeToMinutes('14:30')).toBe(870);
        expect(gameStateService._timeToMinutes('00:00')).toBe(0);
        expect(gameStateService._timeToMinutes('23:59')).toBe(1439);
      });
    });

    describe('_getTimeBetween', () => {
      it('should calculate time difference in minutes', () => {
        expect(gameStateService._getTimeBetween('14:00', '15:30')).toBe(90);
        expect(gameStateService._getTimeBetween('15:30', '14:00')).toBe(90);
      });
    });

    describe('_calculateTravelTime', () => {
      it('should return 0 for same location', () => {
        expect(gameStateService._calculateTravelTime('Field 1', 'Field 1')).toBe(0);
      });

      it('should return default travel time for different locations', () => {
        expect(gameStateService._calculateTravelTime('Field 1', 'Field 2')).toBe(30);
      });
    });

    describe('_formatAssignmentForConflict', () => {
      it('should format assignment data for conflict reporting', () => {
        const assignment = {
          id: 'assign-1',
          game_id: 'game-1',
          game_date: '2024-01-15',
          game_time: '14:00',
          location: 'Field 1',
          home_team_name: 'Team A',
          away_team_name: 'Team B',
          position_name: 'Referee',
          status: 'accepted'
        };

        const result = gameStateService._formatAssignmentForConflict(assignment);

        expect(result).toEqual({
          id: 'assign-1',
          gameId: 'game-1',
          date: '2024-01-15',
          time: '14:00',
          location: 'Field 1',
          teams: 'Team A vs Team B',
          position: 'Referee',
          status: 'accepted'
        });
      });
    });
  });
});