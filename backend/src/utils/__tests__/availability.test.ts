/**
 * Test suite for availability utility functions
 */

import {
  validateAvailabilityWindow,
  checkTimeOverlap,
  formatAvailabilityResponse,
  calculateAvailabilityScore,
  hasSchedulingConflict,
  findAvailableReferees,
  AvailabilityWindow,
  TimeWindow,
  GameTime,
  RefereeWithAvailability,
  AvailabilityResponse
} from '../availability';

describe('Availability Utils', () => {
  describe('validateAvailabilityWindow', () => {
    it('should return true for valid availability window', () => {
      const validWindow: AvailabilityWindow = {
        date: '2023-10-15',
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      };

      expect(validateAvailabilityWindow(validWindow)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const incompleteWindow = {
        date: '2023-10-15',
        start_time: '09:00'
        // missing end_time
      } as AvailabilityWindow;

      expect(validateAvailabilityWindow(incompleteWindow)).toBe(false);
    });

    it('should return false for invalid time format', () => {
      const invalidTimeWindow: AvailabilityWindow = {
        date: '2023-10-15',
        start_time: '25:00', // Invalid hour
        end_time: '17:00',
        is_available: true
      };

      expect(validateAvailabilityWindow(invalidTimeWindow)).toBe(false);
    });

    it('should return false when end time is before start time', () => {
      const invalidOrderWindow: AvailabilityWindow = {
        date: '2023-10-15',
        start_time: '17:00',
        end_time: '09:00', // End before start
        is_available: true
      };

      expect(validateAvailabilityWindow(invalidOrderWindow)).toBe(false);
    });

    it('should return false when start and end times are equal', () => {
      const equalTimeWindow: AvailabilityWindow = {
        date: '2023-10-15',
        start_time: '12:00',
        end_time: '12:00',
        is_available: true
      };

      expect(validateAvailabilityWindow(equalTimeWindow)).toBe(false);
    });

    it('should handle edge case times correctly', () => {
      const edgeCaseWindow: AvailabilityWindow = {
        date: '2023-10-15',
        start_time: '00:00',
        end_time: '23:59',
        is_available: true
      };

      expect(validateAvailabilityWindow(edgeCaseWindow)).toBe(true);
    });
  });

  describe('checkTimeOverlap', () => {
    it('should detect overlap when new window starts during existing', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '17:00' };
      const newWindow: TimeWindow = { start_time: '12:00', end_time: '20:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should detect overlap when new window ends during existing', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '17:00' };
      const newWindow: TimeWindow = { start_time: '06:00', end_time: '12:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should detect overlap when new window contains existing', () => {
      const existing: TimeWindow = { start_time: '12:00', end_time: '14:00' };
      const newWindow: TimeWindow = { start_time: '09:00', end_time: '17:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should detect overlap when existing contains new', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '17:00' };
      const newWindow: TimeWindow = { start_time: '12:00', end_time: '14:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should return false for non-overlapping windows', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '12:00' };
      const newWindow: TimeWindow = { start_time: '13:00', end_time: '17:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(false);
    });

    it('should return false for adjacent windows', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '12:00' };
      const newWindow: TimeWindow = { start_time: '12:00', end_time: '15:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(false);
    });

    it('should handle exact same time windows', () => {
      const existing: TimeWindow = { start_time: '09:00', end_time: '17:00' };
      const newWindow: TimeWindow = { start_time: '09:00', end_time: '17:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });
  });

  describe('formatAvailabilityResponse', () => {
    it('should format availability response correctly', () => {
      const refereeId = 'ref-123';
      const availability: AvailabilityWindow[] = [
        {
          date: '2023-10-15',
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        }
      ];

      const response = formatAvailabilityResponse(refereeId, availability);

      expect(response).toEqual({
        success: true,
        data: {
          refereeId: 'ref-123',
          availability: availability,
          count: 1
        }
      });
    });

    it('should handle empty availability array', () => {
      const refereeId = 'ref-456';
      const availability: AvailabilityWindow[] = [];

      const response = formatAvailabilityResponse(refereeId, availability);

      expect(response.data.count).toBe(0);
      expect(response.data.availability).toEqual([]);
    });
  });

  describe('calculateAvailabilityScore', () => {
    it('should return 10 for available referee during game time', () => {
      const referee: RefereeWithAvailability = {
        id: 'ref-123',
        name: 'John Doe',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
          }
        ]
      };

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(10);
    });

    it('should return 0 for unavailable referee', () => {
      const referee: RefereeWithAvailability = {
        id: 'ref-123',
        name: 'John Doe',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '09:00',
            end_time: '17:00',
            is_available: false // Not available
          }
        ]
      };

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(0);
    });

    it('should return 0 for referee with no availability windows', () => {
      const referee: RefereeWithAvailability = {
        id: 'ref-123',
        name: 'John Doe',
        isAvailable: true,
        availability: []
      };

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(0);
    });

    it('should return 0 for referee with no overlapping availability', () => {
      const referee: RefereeWithAvailability = {
        id: 'ref-123',
        name: 'John Doe',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '18:00', // After game time
            end_time: '20:00',
            is_available: true
          }
        ]
      };

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(0);
    });
  });

  describe('hasSchedulingConflict', () => {
    it('should detect conflict when referee is not available during game time', () => {
      const availability: AvailabilityWindow[] = [
        {
          date: '2023-10-15',
          start_time: '10:00',
          end_time: '15:00',
          is_available: false // Conflict
        }
      ];

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(hasSchedulingConflict(availability, gameTime)).toBe(true);
    });

    it('should return false when referee is available during game time', () => {
      const availability: AvailabilityWindow[] = [
        {
          date: '2023-10-15',
          start_time: '10:00',
          end_time: '15:00',
          is_available: true // Available
        }
      ];

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(hasSchedulingConflict(availability, gameTime)).toBe(false);
    });

    it('should return false when no time overlap', () => {
      const availability: AvailabilityWindow[] = [
        {
          date: '2023-10-15',
          start_time: '16:00',
          end_time: '18:00',
          is_available: false // Not available but no overlap
        }
      ];

      const gameTime: GameTime = {
        start: '12:00',
        end: '14:00'
      };

      expect(hasSchedulingConflict(availability, gameTime)).toBe(false);
    });
  });

  describe('findAvailableReferees', () => {
    const sampleReferees: RefereeWithAvailability[] = [
      {
        id: 'ref-1',
        name: 'Available Referee',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '09:00',
            end_time: '17:00',
            is_available: true
          }
        ]
      },
      {
        id: 'ref-2',
        name: 'Unavailable Referee',
        isAvailable: false,
        availability: []
      },
      {
        id: 'ref-3',
        name: 'Conflicted Referee',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '12:00',
            end_time: '14:00',
            is_available: false // Conflict during game time
          }
        ]
      },
      {
        id: 'ref-4',
        name: 'Another Available Referee',
        isAvailable: true,
        availability: [
          {
            date: '2023-10-15',
            start_time: '10:00',
            end_time: '16:00',
            is_available: true
          }
        ]
      }
    ];

    const gameTime: GameTime = {
      start: '12:00',
      end: '14:00'
    };

    it('should return only available referees', () => {
      const availableReferees = findAvailableReferees(sampleReferees, gameTime);

      expect(availableReferees).toHaveLength(2);
      expect(availableReferees.map(r => r.id)).toEqual(['ref-1', 'ref-4']);
    });

    it('should sort referees by availability score', () => {
      const availableReferees = findAvailableReferees(sampleReferees, gameTime);

      // Both should have score of 10, but order should be maintained
      expect(availableReferees[0].availabilityScore).toBe(10);
      expect(availableReferees[1].availabilityScore).toBe(10);
    });

    it('should filter out referees with isAvailable = false', () => {
      const availableReferees = findAvailableReferees(sampleReferees, gameTime);

      expect(availableReferees.find(r => r.id === 'ref-2')).toBeUndefined();
    });

    it('should filter out referees with scheduling conflicts', () => {
      const availableReferees = findAvailableReferees(sampleReferees, gameTime);

      expect(availableReferees.find(r => r.id === 'ref-3')).toBeUndefined();
    });

    it('should handle empty referees array', () => {
      const availableReferees = findAvailableReferees([], gameTime);

      expect(availableReferees).toEqual([]);
    });

    it('should handle referees without availability property', () => {
      const refereesWithoutAvailability: RefereeWithAvailability[] = [
        {
          id: 'ref-no-avail',
          name: 'No Availability',
          isAvailable: true
        }
      ];

      const availableReferees = findAvailableReferees(refereesWithoutAvailability, gameTime);

      expect(availableReferees).toHaveLength(1);
      expect(availableReferees[0].availabilityScore).toBe(0);
    });
  });
});