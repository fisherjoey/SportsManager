/**
 * @fileoverview ConflictDetectionService Unit Tests
 *
 * Comprehensive test suite for ConflictDetectionService covering helper functions,
 * core logic, and integration scenarios.
 */

import { jest } from '@jest/globals';

// Import the service to test helper functions directly
import * as ConflictDetectionService from '../conflictDetectionService';

describe('ConflictDetectionService', () => {
  describe('Helper functions', () => {
    describe('calculateEndTime', () => {
      it('should calculate end time with default 2-hour duration', () => {
        const result = ConflictDetectionService.calculateEndTime('14:00');
        expect(result).toBe('16:00');
      });

      it('should calculate end time with custom duration', () => {
        const result = ConflictDetectionService.calculateEndTime('14:00', 1.5);
        expect(result).toBe('15:30');
      });

      it('should handle overnight games', () => {
        const result = ConflictDetectionService.calculateEndTime('23:00', 3);
        expect(result).toBe('02:00');
      });

      it('should handle fractional hours correctly', () => {
        const result = ConflictDetectionService.calculateEndTime('14:15', 2.25);
        expect(result).toBe('16:30');
      });

      it('should handle minutes in start time', () => {
        const result = ConflictDetectionService.calculateEndTime('14:45');
        expect(result).toBe('16:45');
      });

      it('should handle zero duration', () => {
        const result = ConflictDetectionService.calculateEndTime('14:00', 0);
        expect(result).toBe('14:00');
      });

      it('should handle very long duration', () => {
        const result = ConflictDetectionService.calculateEndTime('10:00', 25); // 25 hours
        expect(result).toBe('11:00'); // Should wrap to next day
      });
    });

    describe('addMinutes', () => {
      it('should add minutes correctly within same hour', () => {
        const result = ConflictDetectionService.addMinutes('14:00', 30);
        expect(result).toBe('14:30');
      });

      it('should handle hour overflow', () => {
        const result = ConflictDetectionService.addMinutes('14:45', 30);
        expect(result).toBe('15:15');
      });

      it('should handle day overflow', () => {
        const result = ConflictDetectionService.addMinutes('23:45', 30);
        expect(result).toBe('00:15');
      });

      it('should handle large minute additions', () => {
        const result = ConflictDetectionService.addMinutes('10:00', 150);
        expect(result).toBe('12:30');
      });

      it('should maintain proper format for midnight crossover', () => {
        const result = ConflictDetectionService.addMinutes('23:59', 2);
        expect(result).toBe('00:01');
      });
    });

    describe('subtractMinutes', () => {
      it('should subtract minutes correctly within same hour', () => {
        const result = ConflictDetectionService.subtractMinutes('14:30', 15);
        expect(result).toBe('14:15');
      });

      it('should handle hour underflow', () => {
        const result = ConflictDetectionService.subtractMinutes('14:15', 30);
        expect(result).toBe('13:45');
      });

      it('should handle day underflow', () => {
        const result = ConflictDetectionService.subtractMinutes('00:15', 30);
        expect(result).toBe('23:45');
      });

      it('should handle large minute subtractions', () => {
        const result = ConflictDetectionService.subtractMinutes('12:30', 150);
        expect(result).toBe('10:00');
      });
    });

    describe('getMinutesBetween', () => {
      it('should calculate minutes between times correctly', () => {
        const result = ConflictDetectionService.getMinutesBetween('14:00', '15:30');
        expect(result).toBe(90);
      });

      it('should handle same-day times', () => {
        const result = ConflictDetectionService.getMinutesBetween('09:15', '09:45');
        expect(result).toBe(30);
      });

      it('should handle next-day times', () => {
        const result = ConflictDetectionService.getMinutesBetween('23:00', '01:00');
        expect(result).toBe(120); // 2 hours
      });

      it('should handle exact hour boundaries', () => {
        const result = ConflictDetectionService.getMinutesBetween('12:00', '13:00');
        expect(result).toBe(60);
      });

      it('should handle same time', () => {
        const result = ConflictDetectionService.getMinutesBetween('14:00', '14:00');
        expect(result).toBe(0);
      });
    });

    describe('checkTravelTimeConflict', () => {
      it('should return false for same location games', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:30', endTime: '18:30', location: 'Field A' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(false);
      });

      it('should detect travel time conflict between different locations', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:15', endTime: '18:15', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // Only 15 minutes gap, less than 30 min required
      });

      it('should allow sufficient travel time', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:45', endTime: '18:45', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(false); // 45 minutes gap, more than 30 min required
      });

      it('should use custom minimum travel time', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:40', endTime: '18:40', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2, 45);
        expect(result).toBe(true); // 40 minutes gap, less than 45 min required
      });

      it('should return false for overlapping games', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '15:00', endTime: '17:00', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(false); // Overlapping games handled by time overlap check
      });

      it('should check both game order scenarios', () => {
        const game1 = { startTime: '16:00', endTime: '18:00', location: 'Field A' };
        const game2 = { startTime: '14:00', endTime: '15:45', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // 15 minutes gap between game2 end and game1 start
      });

      it('should handle exact minimum travel time', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:30', endTime: '18:30', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(false); // Exactly 30 minutes, meets minimum requirement
      });

      it('should handle games with same start and end times', () => {
        const game1 = { startTime: '14:00', endTime: '14:00', location: 'Field A' };
        const game2 = { startTime: '14:15', endTime: '14:30', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // 15 minutes is less than 30 min requirement
      });

      it('should handle very long games', () => {
        const game1 = { startTime: '08:00', endTime: '20:00', location: 'Field A' };
        const game2 = { startTime: '20:15', endTime: '22:00', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // Only 15 minutes between very long games
      });
    });
  });

  describe('Complex time scenarios', () => {
    describe('calculateEndTime with complex scenarios', () => {
      it('should handle minute precision correctly', () => {
        const result = ConflictDetectionService.calculateEndTime('13:37', 2.5);
        expect(result).toBe('16:07');
      });

      it('should handle late evening start times', () => {
        const result = ConflictDetectionService.calculateEndTime('22:30', 3);
        expect(result).toBe('01:30');
      });
    });

    describe('Time arithmetic edge cases', () => {
      it('should handle time calculations across midnight boundary', () => {
        const addResult = ConflictDetectionService.addMinutes('23:30', 90);
        expect(addResult).toBe('01:00');

        const subtractResult = ConflictDetectionService.subtractMinutes('01:30', 90);
        expect(subtractResult).toBe('00:00');
      });

      it('should handle very large time additions and subtractions', () => {
        const addResult = ConflictDetectionService.addMinutes('12:00', 1440); // 24 hours
        expect(addResult).toBe('12:00'); // Should wrap around

        const subtractResult = ConflictDetectionService.subtractMinutes('12:00', 1440); // 24 hours
        expect(subtractResult).toBe('12:00'); // Should wrap around
      });
    });

    describe('Travel time with complex scheduling', () => {
      it('should handle multiple location changes', () => {
        // Simulate referee traveling from A to B to C
        const game1 = { startTime: '10:00', endTime: '12:00', location: 'Field A' };
        const game2 = { startTime: '12:15', endTime: '14:15', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // Only 15 minutes between different locations
      });

      it('should handle zero travel time scenarios', () => {
        const game1 = { startTime: '14:00', endTime: '16:00', location: 'Field A' };
        const game2 = { startTime: '16:00', endTime: '18:00', location: 'Field B' };

        const result = ConflictDetectionService.checkTravelTimeConflict(game1, game2);
        expect(result).toBe(true); // Zero minutes between different locations
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should validate service exports exist', () => {
      expect(typeof ConflictDetectionService.calculateEndTime).toBe('function');
      expect(typeof ConflictDetectionService.addMinutes).toBe('function');
      expect(typeof ConflictDetectionService.subtractMinutes).toBe('function');
      expect(typeof ConflictDetectionService.getMinutesBetween).toBe('function');
      expect(typeof ConflictDetectionService.checkTravelTimeConflict).toBe('function');
      expect(typeof ConflictDetectionService.checkRefereeDoubleBooking).toBe('function');
      expect(typeof ConflictDetectionService.checkVenueConflict).toBe('function');
      expect(typeof ConflictDetectionService.validateRefereeQualifications).toBe('function');
      expect(typeof ConflictDetectionService.checkAssignmentConflicts).toBe('function');
      expect(typeof ConflictDetectionService.checkGameSchedulingConflicts).toBe('function');
    });

    it('should handle time format consistency', () => {
      // Test that all time functions return consistent HH:MM format
      const times = ['09:00', '12:30', '23:45', '00:15'];

      times.forEach(time => {
        const calculated = ConflictDetectionService.calculateEndTime(time, 1);
        expect(calculated).toMatch(/^\d{2}:\d{2}$/);

        const added = ConflictDetectionService.addMinutes(time, 30);
        expect(added).toMatch(/^\d{2}:\d{2}$/);

        const subtracted = ConflictDetectionService.subtractMinutes(time, 30);
        expect(subtracted).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('should maintain mathematical consistency', () => {
      const startTime = '14:30';
      const duration = 90; // 1.5 hours

      // Calculate end time using duration
      const endTime1 = ConflictDetectionService.calculateEndTime(startTime, 1.5);

      // Calculate end time using addMinutes
      const endTime2 = ConflictDetectionService.addMinutes(startTime, duration);

      expect(endTime1).toBe(endTime2);

      // Verify we can get back to start time
      const backToStart = ConflictDetectionService.subtractMinutes(endTime1, duration);
      expect(backToStart).toBe(startTime);
    });
  });
});