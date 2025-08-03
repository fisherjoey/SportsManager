/**
 * GameStateService Unit Tests
 * 
 * Tests for the GameStateService class that provides game status calculation,
 * assignment validation, and conflict detection for game-related operations.
 */

const GameStateService = require('../../src/services/GameStateService');

// Mock dependencies
jest.mock('../../src/services/conflictDetectionService');
const { checkAssignmentConflicts, checkGameSchedulingConflicts } = require('../../src/services/conflictDetectionService');

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

describe('GameStateService', () => {
  let gameStateService;

  beforeEach(() => {
    jest.clearAllMocks();
    gameStateService = new GameStateService(mockTable);
  });

  describe('Constructor', () => {
    it('should initialize with database connection', () => {
      expect(gameStateService.db).toBe(mockTable);
    });
  });

  describe('calculateGameStatus', () => {
    const mockGame = {
      id: 'game123',
      game_date: '2024-01-15',
      game_time: '19:00',
      location: 'Downtown Arena',
      refs_needed: 2,
      home_team_name: 'Team A',
      away_team_name: 'Team B'
    };

    const mockAssignments = [
      {
        id: 'assign1',
        user_id: 'user1',
        position_id: 'pos1',
        status: 'accepted',
        referee_name: 'John Referee',
        position_name: 'Referee',
        assigned_at: new Date('2024-01-10')
      }
    ];

    beforeEach(() => {
      // Mock database calls
      let callCount = 0;
      mockTable.mockImplementation((tableName) => {
        callCount++;
        const qb = { ...mockQueryBuilder };
        
        if (tableName === 'games') {
          qb.first = jest.fn().mockResolvedValue(mockGame);
        } else if (tableName === 'game_assignments') {
          qb.mockResolvedValue(mockAssignments);
        }
        
        return qb;
      });

      // Mock conflict analysis
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: []
      });

      checkGameSchedulingConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: []
      });
    });

    it('should calculate game status with partially assigned referees', async () => {
      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.gameId).toBe('game123');
      expect(result.status).toBe('partially_assigned');
      expect(result.statusReason).toBe('1 of 2 referees assigned');
      expect(result.assignmentSummary.currentReferees).toBe(1);
      expect(result.assignmentSummary.requiredReferees).toBe(2);
      expect(result.assignmentSummary.isFullyStaffed).toBe(false);
      expect(result.healthScore).toBeLessThan(100);
    });

    it('should calculate game status with fully assigned referees', async () => {
      const fullAssignments = [
        ...mockAssignments,
        {
          id: 'assign2',
          user_id: 'user2',
          position_id: 'pos2',
          status: 'accepted',
          referee_name: 'Jane Referee',
          position_name: 'Assistant Referee',
          assigned_at: new Date('2024-01-10')
        }
      ];

      mockTable.mockImplementation((tableName) => {
        const qb = { ...mockQueryBuilder };
        
        if (tableName === 'games') {
          qb.first = jest.fn().mockResolvedValue(mockGame);
        } else if (tableName === 'game_assignments') {
          qb.mockResolvedValue(fullAssignments);
        }
        
        return qb;
      });

      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.status).toBe('fully_assigned');
      expect(result.statusReason).toBe('All 2 referee positions filled');
      expect(result.assignmentSummary.isFullyStaffed).toBe(true);
      expect(result.healthScore).toBe(100);
    });

    it('should calculate game status with no assigned referees', async () => {
      mockTable.mockImplementation((tableName) => {
        const qb = { ...mockQueryBuilder };
        
        if (tableName === 'games') {
          qb.first = jest.fn().mockResolvedValue(mockGame);
        } else if (tableName === 'game_assignments') {
          qb.mockResolvedValue([]);
        }
        
        return qb;
      });

      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.status).toBe('unassigned');
      expect(result.statusReason).toBe('No referees assigned');
      expect(result.assignmentSummary.currentReferees).toBe(0);
      expect(result.healthScore).toBeLessThan(100);
    });

    it('should detect and report assignment conflicts', async () => {
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'time_conflict', message: 'Referee double-booked' }],
        warnings: []
      });

      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('assignment_conflict');
      expect(result.issues[0].conflicts).toEqual([{ type: 'time_conflict', message: 'Referee double-booked' }]);
      expect(result.healthScore).toBeLessThan(80); // Penalty for conflicts
    });

    it('should detect and report venue conflicts', async () => {
      checkGameSchedulingConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'venue_conflict', message: 'Venue already booked' }]
      });

      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('venue_conflict');
      expect(result.healthScore).toBeLessThan(80);
    });

    it('should throw error when game not found', async () => {
      mockTable.mockImplementation(() => ({
        ...mockQueryBuilder,
        first: jest.fn().mockResolvedValue(null)
      }));

      await expect(gameStateService.calculateGameStatus('nonexistent')).rejects.toThrow('Game not found');
    });

    it('should handle conflict analysis errors gracefully', async () => {
      checkAssignmentConflicts.mockRejectedValue(new Error('Analysis failed'));

      const result = await gameStateService.calculateGameStatus('game123');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('validation_error');
      expect(result.issues[0].error).toBe('Analysis failed');
    });
  });

  describe('validateAssignment', () => {
    const mockAssignmentData = {
      game_id: 'game123',
      user_id: 'user456',
      position_id: 'pos789'
    };

    const mockGame = { id: 'game123', refs_needed: 2 };
    const mockUser = { id: 'user456', role: 'referee', is_available: true };
    const mockPosition = { id: 'pos789', name: 'Referee' };

    beforeEach(() => {
      // Mock Promise.all for parallel queries
      jest.spyOn(Promise, 'all').mockResolvedValue([mockGame, mockUser, mockPosition]);

      // Mock existing assignments check
      mockQueryBuilder.mockResolvedValue([]); // No existing assignments

      // Mock current assignment count
      mockQueryBuilder.count = jest.fn().mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.first = jest.fn().mockResolvedValue({ count: '0' });

      // Mock conflict analysis
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
        isQualified: true
      });
    });

    afterEach(() => {
      if (Promise.all.mockRestore) {
        Promise.all.mockRestore();
      }
    });

    it('should validate assignment successfully', async () => {
      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(true);
      expect(result.canAssign).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.conflictAnalysis.hasConflicts).toBe(false);
    });

    it('should reject assignment with missing required fields', async () => {
      const invalidData = { game_id: 'game123' }; // Missing user_id and position_id

      const result = await gameStateService.validateAssignment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.canAssign).toBe(false);
      expect(result.errors).toContain('Missing required fields: game_id, user_id, position_id');
    });

    it('should reject assignment when game not found', async () => {
      Promise.all.mockResolvedValue([null, mockUser, mockPosition]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Game not found');
    });

    it('should reject assignment when referee not found', async () => {
      Promise.all.mockResolvedValue([mockGame, null, mockPosition]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee not found or not active');
    });

    it('should reject assignment when position not found', async () => {
      Promise.all.mockResolvedValue([mockGame, mockUser, null]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Position not found');
    });

    it('should reject assignment when referee unavailable', async () => {
      const unavailableUser = { ...mockUser, is_available: false };
      Promise.all.mockResolvedValue([mockGame, unavailableUser, mockPosition]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee is marked as unavailable');
    });

    it('should reject assignment when referee already assigned', async () => {
      mockQueryBuilder.mockResolvedValue([
        { user_id: 'user456', position_id: 'other_pos' } // Referee already assigned
      ]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referee is already assigned to this game');
    });

    it('should reject assignment when position already filled', async () => {
      mockQueryBuilder.mockResolvedValue([
        { user_id: 'other_user', position_id: 'pos789' } // Position already filled
      ]);

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Position is already filled for this game');
    });

    it('should reject assignment when game at capacity', async () => {
      mockQueryBuilder.first = jest.fn().mockResolvedValue({ count: '2' }); // Game at capacity

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Game has reached maximum number of referees');
    });

    it('should reject assignment with conflicts', async () => {
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [{ type: 'time_conflict' }],
        errors: ['Referee has time conflict'],
        isQualified: true
      });

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(false);
      expect(result.canAssign).toBe(false);
      expect(result.errors).toContain('Referee has time conflict');
      expect(result.conflictAnalysis.hasConflicts).toBe(true);
    });

    it('should include warnings in validation result', async () => {
      checkAssignmentConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: ['Referee level may not be suitable'],
        isQualified: true
      });

      const result = await gameStateService.validateAssignment(mockAssignmentData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Referee level may not be suitable');
    });
  });

  describe('validateBulkAssignments', () => {
    const mockAssignments = [
      { game_id: 'game1', user_id: 'user1', position_id: 'pos1' },
      { game_id: 'game2', user_id: 'user2', position_id: 'pos2' },
      { game_id: 'game3', user_id: 'user3', position_id: 'pos3' }
    ];

    beforeEach(() => {
      gameStateService.validateAssignment = jest.fn()
        .mockResolvedValueOnce({ isValid: true, canAssign: true, warnings: [] })
        .mockResolvedValueOnce({ isValid: false, canAssign: false, errors: ['Game not found'], warnings: [] })
        .mockResolvedValueOnce({ isValid: true, canAssign: true, warnings: ['Level warning'] });
    });

    it('should validate bulk assignments successfully', async () => {
      const result = await gameStateService.validateBulkAssignments(mockAssignments);

      expect(result.summary.total).toBe(3);
      expect(result.summary.validCount).toBe(2);
      expect(result.summary.invalidCount).toBe(1);
      expect(result.summary.canAssignCount).toBe(2);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });

    it('should throw error for empty assignments array', async () => {
      await expect(gameStateService.validateBulkAssignments([])).rejects.toThrow('Assignments array is required and cannot be empty');
    });

    it('should throw error for too many assignments', async () => {
      const tooManyAssignments = new Array(51).fill({ game_id: 'game', user_id: 'user', position_id: 'pos' });

      await expect(gameStateService.validateBulkAssignments(tooManyAssignments)).rejects.toThrow('Bulk validation limited to 50 assignments at once');
    });

    it('should handle validation errors gracefully', async () => {
      gameStateService.validateAssignment = jest.fn()
        .mockResolvedValueOnce({ isValid: true, canAssign: true, warnings: [] })
        .mockRejectedValueOnce(new Error('Validation failed'))
        .mockResolvedValueOnce({ isValid: true, canAssign: true, warnings: [] });

      const result = await gameStateService.validateBulkAssignments(mockAssignments);

      expect(result.summary.validCount).toBe(2);
      expect(result.summary.invalidCount).toBe(1);
      expect(result.invalid[0].validation.errors[0]).toBe('Validation failed');
    });
  });

  describe('getRefereeConflicts', () => {
    const mockAssignments = [
      {
        id: 'assign1',
        game_id: 'game1',
        game_date: '2024-01-15',
        game_time: '19:00',
        end_time: '21:00',
        location: 'Arena A',
        home_team_name: 'Team A',
        away_team_name: 'Team B',
        position_name: 'Referee'
      },
      {
        id: 'assign2',
        game_id: 'game2',
        game_date: '2024-01-15',
        game_time: '20:30',
        end_time: '22:30',
        location: 'Arena B',
        home_team_name: 'Team C',
        away_team_name: 'Team D',
        position_name: 'Assistant Referee'
      }
    ];

    beforeEach(() => {
      mockQueryBuilder.mockResolvedValue(mockAssignments);
    });

    it('should detect time overlap conflicts', async () => {
      const result = await gameStateService.getRefereeConflicts('user123', '2024-01-15', '2024-01-15');

      expect(result.refereeId).toBe('user123');
      expect(result.assignments).toHaveLength(2);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('time_overlap');
      expect(result.summary.hasConflicts).toBe(true);
    });

    it('should detect travel time warnings', async () => {
      const nonOverlappingAssignments = [
        {
          ...mockAssignments[0],
          game_time: '17:00',
          end_time: '19:00'
        },
        {
          ...mockAssignments[1],
          game_time: '19:15',
          end_time: '21:15'
        }
      ];

      mockQueryBuilder.mockResolvedValue(nonOverlappingAssignments);

      const result = await gameStateService.getRefereeConflicts('user123', '2024-01-15', '2024-01-15');

      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('travel_time');
    });

    it('should handle assignments at same location without travel warnings', async () => {
      const sameLocationAssignments = mockAssignments.map(a => ({
        ...a,
        location: 'Same Arena'
      }));

      mockQueryBuilder.mockResolvedValue(sameLocationAssignments);

      const result = await gameStateService.getRefereeConflicts('user123', '2024-01-15', '2024-01-15');

      expect(result.warnings.filter(w => w.type === 'travel_time')).toHaveLength(0);
    });

    it('should return empty results when no assignments found', async () => {
      mockQueryBuilder.mockResolvedValue([]);

      const result = await gameStateService.getRefereeConflicts('user123', '2024-01-15', '2024-01-15');

      expect(result.assignments).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.summary.hasConflicts).toBe(false);
    });
  });

  describe('Helper methods', () => {
    describe('_calculateEndTime', () => {
      it('should calculate end time with default 2-hour duration', () => {
        const endTime = gameStateService._calculateEndTime('19:00');
        expect(endTime).toBe('21:00');
      });

      it('should calculate end time with custom duration', () => {
        const endTime = gameStateService._calculateEndTime('19:00', 1.5);
        expect(endTime).toBe('20:30');
      });

      it('should handle midnight crossover', () => {
        const endTime = gameStateService._calculateEndTime('23:30', 1);
        expect(endTime).toBe('00:30');
      });
    });

    describe('_checkTimeOverlap', () => {
      it('should detect overlapping times', () => {
        const overlap = gameStateService._checkTimeOverlap(
          { start: '19:00', end: '21:00' },
          { start: '20:00', end: '22:00' }
        );
        expect(overlap).toBe(true);
      });

      it('should detect non-overlapping times', () => {
        const overlap = gameStateService._checkTimeOverlap(
          { start: '19:00', end: '21:00' },
          { start: '21:30', end: '23:30' }
        );
        expect(overlap).toBe(false);
      });

      it('should handle adjacent times as non-overlapping', () => {
        const overlap = gameStateService._checkTimeOverlap(
          { start: '19:00', end: '21:00' },
          { start: '21:00', end: '23:00' }
        );
        expect(overlap).toBe(false);
      });
    });

    describe('_timeToMinutes', () => {
      it('should convert time to minutes correctly', () => {
        expect(gameStateService._timeToMinutes('19:30')).toBe(1170); // 19*60 + 30
        expect(gameStateService._timeToMinutes('00:15')).toBe(15);
        expect(gameStateService._timeToMinutes('12:00')).toBe(720);
      });
    });

    describe('_getTimeBetween', () => {
      it('should calculate time difference correctly', () => {
        expect(gameStateService._getTimeBetween('19:00', '21:00')).toBe(120); // 2 hours
        expect(gameStateService._getTimeBetween('21:00', '19:00')).toBe(120); // Absolute difference
        expect(gameStateService._getTimeBetween('19:30', '20:15')).toBe(45); // 45 minutes
      });
    });

    describe('_calculateTravelTime', () => {
      it('should return 0 for same location', () => {
        expect(gameStateService._calculateTravelTime('Arena A', 'Arena A')).toBe(0);
      });

      it('should return default travel time for different locations', () => {
        expect(gameStateService._calculateTravelTime('Arena A', 'Arena B')).toBe(30);
      });
    });

    describe('_formatAssignmentForConflict', () => {
      it('should format assignment data correctly', () => {
        const assignment = {
          id: 'assign1',
          game_id: 'game1',
          game_date: '2024-01-15',
          game_time: '19:00',
          location: 'Arena A',
          home_team_name: 'Team A',
          away_team_name: 'Team B',
          position_name: 'Referee',
          status: 'accepted'
        };

        const formatted = gameStateService._formatAssignmentForConflict(assignment);

        expect(formatted).toEqual({
          id: 'assign1',
          gameId: 'game1',
          date: '2024-01-15',
          time: '19:00',
          location: 'Arena A',
          teams: 'Team A vs Team B',
          position: 'Referee',
          status: 'accepted'
        });
      });
    });
  });
});