/**
 * Tests for Conflict Detection Service
 * 
 * Tests the basic functionality of conflict detection without requiring
 * a full database setup. These are lightweight tests for the core logic.
 */

const {
  calculateEndTime,
  addMinutes,
  subtractMinutes,
  checkTravelTimeConflict,
  getMinutesBetween
} = require('../../src/services/conflictDetectionService');

describe('Conflict Detection Service - Helper Functions', () => {
  
  describe('calculateEndTime', () => {
    it('should calculate end time with default 2-hour duration', () => {
      expect(calculateEndTime('14:00')).toBe('16:00');
      expect(calculateEndTime('09:30')).toBe('11:30');
    });

    it('should handle end time past midnight', () => {
      expect(calculateEndTime('23:00')).toBe('01:00');
      expect(calculateEndTime('22:30')).toBe('00:30');
    });

    it('should handle custom duration', () => {
      expect(calculateEndTime('14:00', 1.5)).toBe('15:30');
      expect(calculateEndTime('10:00', 3)).toBe('13:00');
    });
  });

  describe('addMinutes', () => {
    it('should add minutes correctly', () => {
      expect(addMinutes('14:00', 30)).toBe('14:30');
      expect(addMinutes('14:45', 30)).toBe('15:15');
    });

    it('should handle hour rollover', () => {
      expect(addMinutes('14:45', 45)).toBe('15:30');
      expect(addMinutes('23:45', 30)).toBe('00:15');
    });

    it('should handle large minute additions', () => {
      expect(addMinutes('10:00', 150)).toBe('12:30');
      expect(addMinutes('22:00', 180)).toBe('01:00');
    });
  });

  describe('subtractMinutes', () => {
    it('should subtract minutes correctly', () => {
      expect(subtractMinutes('14:30', 30)).toBe('14:00');
      expect(subtractMinutes('15:15', 45)).toBe('14:30');
    });

    it('should handle hour rollover backwards', () => {
      expect(subtractMinutes('01:00', 30)).toBe('00:30');
      expect(subtractMinutes('00:15', 30)).toBe('23:45');
    });

    it('should handle large minute subtractions', () => {
      expect(subtractMinutes('12:30', 150)).toBe('10:00');
      expect(subtractMinutes('02:00', 180)).toBe('23:00');
    });
  });

  describe('getMinutesBetween', () => {
    it('should calculate minutes between times correctly', () => {
      expect(getMinutesBetween('14:00', '15:30')).toBe(90);
      expect(getMinutesBetween('09:15', '10:00')).toBe(45);
    });

    it('should handle next day scenarios', () => {
      expect(getMinutesBetween('23:30', '01:00')).toBe(90);
      expect(getMinutesBetween('22:00', '02:30')).toBe(270);
    });

    it('should handle same time', () => {
      expect(getMinutesBetween('14:00', '14:00')).toBe(0);
    });
  });

  describe('checkTravelTimeConflict', () => {
    it('should detect travel time conflicts', () => {
      const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
      const game2 = { startTime: '16:15', endTime: '18:15', location: 'Field B' };
      
      expect(checkTravelTimeConflict(game1, game2)).toBe(true);
    });

    it('should not detect conflicts with sufficient travel time', () => {
      const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
      const game2 = { startTime: '16:45', endTime: '18:45', location: 'Field B' };
      
      expect(checkTravelTimeConflict(game1, game2)).toBe(false);
    });

    it('should not detect conflicts at same location', () => {
      const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
      const game2 = { startTime: '16:15', endTime: '18:15', location: 'Field A' };
      
      expect(checkTravelTimeConflict(game1, game2)).toBe(false);
    });

    it('should work with games in reverse order', () => {
      const game1 = { startTime: '16:15', endTime: '18:15', location: 'Field B' };
      const game2 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
      
      expect(checkTravelTimeConflict(game1, game2)).toBe(true);
    });

    it('should not detect conflicts for overlapping games', () => {
      const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
      const game2 = { startTime: '15:00', endTime: '17:00', location: 'Field B' };
      
      expect(checkTravelTimeConflict(game1, game2)).toBe(false);
    });
  });
});

describe('Conflict Detection Service - Logic Tests', () => {
  // These tests would require database mocking for full functionality
  // For now, we're testing the helper functions which contain the core logic
  
  it('should be importable without errors', () => {
    expect(() => {
      require('../../src/services/conflictDetectionService');
    }).not.toThrow();
  });
});