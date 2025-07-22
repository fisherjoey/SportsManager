// Simple standalone test for availability utilities without database setup
const { 
  validateAvailabilityWindow,
  checkTimeOverlap,
  formatAvailabilityResponse,
  calculateAvailabilityScore,
  hasSchedulingConflict,
  findAvailableReferees
} = require('../../src/utils/availability');

describe('Availability Utilities (Standalone)', () => {
  describe('validateAvailabilityWindow', () => {
    it('should validate required fields', () => {
      const validWindow = {
        date: '2025-01-20',
        start_time: '09:00',
        end_time: '12:00'
      };

      expect(validateAvailabilityWindow(validWindow)).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidWindow = {
        date: '2025-01-20'
        // Missing start_time and end_time
      };

      expect(validateAvailabilityWindow(invalidWindow)).toBe(false);
    });

    it('should reject invalid time format', () => {
      const invalidWindow = {
        date: '2025-01-20',
        start_time: '25:00', // Invalid hour
        end_time: '12:00'
      };

      expect(validateAvailabilityWindow(invalidWindow)).toBe(false);
    });

    it('should reject end time before start time', () => {
      const invalidWindow = {
        date: '2025-01-20',
        start_time: '15:00',
        end_time: '12:00' // End before start
      };

      expect(validateAvailabilityWindow(invalidWindow)).toBe(false);
    });
  });

  describe('checkTimeOverlap', () => {
    it('should detect overlapping time windows', () => {
      const existing = { start_time: '09:00', end_time: '12:00' };
      const newWindow = { start_time: '10:00', end_time: '13:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should detect when new window contains existing', () => {
      const existing = { start_time: '10:00', end_time: '11:00' };
      const newWindow = { start_time: '09:00', end_time: '12:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should detect when existing contains new window', () => {
      const existing = { start_time: '09:00', end_time: '12:00' };
      const newWindow = { start_time: '10:00', end_time: '11:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(true);
    });

    it('should not detect non-overlapping windows', () => {
      const existing = { start_time: '09:00', end_time: '12:00' };
      const newWindow = { start_time: '13:00', end_time: '15:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(false);
    });

    it('should handle adjacent windows correctly', () => {
      const existing = { start_time: '09:00', end_time: '12:00' };
      const newWindow = { start_time: '12:00', end_time: '15:00' };

      expect(checkTimeOverlap(existing, newWindow)).toBe(false);
    });
  });

  describe('formatAvailabilityResponse', () => {
    it('should format availability data correctly', () => {
      const rawData = [
        {
          id: 'avail-1',
          referee_id: 'ref-1',
          date: '2025-01-20',
          start_time: '09:00',
          end_time: '12:00',
          is_available: true,
          reason: null
        }
      ];

      const formatted = formatAvailabilityResponse('ref-1', rawData);

      expect(formatted).toEqual({
        success: true,
        data: {
          refereeId: 'ref-1',
          availability: rawData,
          count: 1
        }
      });
    });

    it('should handle empty availability data', () => {
      const formatted = formatAvailabilityResponse('ref-1', []);

      expect(formatted.data.count).toBe(0);
      expect(formatted.data.availability).toEqual([]);
    });
  });

  describe('calculateAvailabilityScore', () => {
    it('should return 10 for available referees', () => {
      const referee = {
        availability: [
          { start_time: '09:00', end_time: '17:00', is_available: true }
        ]
      };
      const gameTime = { start: '10:00', end: '12:00' };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(10);
    });

    it('should return 0 for unavailable referees', () => {
      const referee = {
        availability: [
          { start_time: '10:00', end_time: '12:00', is_available: false }
        ]
      };
      const gameTime = { start: '10:00', end: '12:00' };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(0);
    });

    it('should return 0 for referees with no availability data', () => {
      const referee = { availability: [] };
      const gameTime = { start: '10:00', end: '12:00' };

      expect(calculateAvailabilityScore(referee, gameTime)).toBe(0);
    });
  });

  describe('hasSchedulingConflict', () => {
    it('should detect conflicts with unavailable windows', () => {
      const availability = [
        { start_time: '09:00', end_time: '11:00', is_available: false, reason: 'Busy' }
      ];
      const gameTime = { start: '10:00', end: '12:00' };

      expect(hasSchedulingConflict(availability, gameTime)).toBe(true);
    });

    it('should not detect conflicts with available windows', () => {
      const availability = [
        { start_time: '09:00', end_time: '13:00', is_available: true }
      ];
      const gameTime = { start: '10:00', end: '12:00' };

      expect(hasSchedulingConflict(availability, gameTime)).toBe(false);
    });
  });

  describe('findAvailableReferees', () => {
    it('should filter and score referees correctly', () => {
      const referees = [
        {
          id: 'ref-1',
          name: 'John Doe',
          isAvailable: true,
          availability: [
            { start_time: '09:00', end_time: '17:00', is_available: true }
          ]
        },
        {
          id: 'ref-2',
          name: 'Jane Smith',
          isAvailable: true,
          availability: [
            { start_time: '10:00', end_time: '12:00', is_available: false, reason: 'Busy' }
          ]
        },
        {
          id: 'ref-3',
          name: 'Bob Wilson',
          isAvailable: false,
          availability: []
        }
      ];

      const gameTime = { start: '10:00', end: '12:00' };
      const available = findAvailableReferees(referees, gameTime);

      expect(available.length).toBe(1); // Only ref-1 should be available
      expect(available[0].id).toBe('ref-1');
      expect(available[0].availabilityScore).toBe(10);
    });

    it('should return empty array when no referees available', () => {
      const referees = [
        {
          id: 'ref-1',
          name: 'Unavailable Referee',
          isAvailable: false
        }
      ];

      const gameTime = { start: '10:00', end: '12:00' };
      const available = findAvailableReferees(referees, gameTime);

      expect(available.length).toBe(0);
    });

    it('should sort referees by availability score', () => {
      const referees = [
        {
          id: 'ref-1',
          name: 'Partial Availability',
          isAvailable: true,
          availability: [
            { start_time: '08:00', end_time: '10:00', is_available: true }
          ]
        },
        {
          id: 'ref-2', 
          name: 'Full Availability',
          isAvailable: true,
          availability: [
            { start_time: '09:00', end_time: '15:00', is_available: true }
          ]
        }
      ];

      const gameTime = { start: '10:00', end: '12:00' };
      const available = findAvailableReferees(referees, gameTime);

      expect(available.length).toBe(2);
      expect(available[0].id).toBe('ref-2'); // Should be first with higher score
      expect(available[0].availabilityScore).toBe(10);
      expect(available[1].availabilityScore).toBe(0);
    });
  });
});