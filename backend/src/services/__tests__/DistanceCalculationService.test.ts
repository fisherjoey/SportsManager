/**
 * @fileoverview DistanceCalculationService Unit Tests
 *
 * Comprehensive test suite for DistanceCalculationService covering distance calculations,
 * mathematical operations, batch processing, rate limiting, and error recovery
 */

import { jest } from '@jest/globals';

// Mock external dependencies
const mockLocationDataService = {
  getUserLocation: jest.fn(),
};

const mockCalculateDistanceAndDriveTime = jest.fn();

// Mock external modules
jest.mock('../LocationDataService', () => {
  return jest.fn().mockImplementation(() => mockLocationDataService);
});

jest.mock('../../../../lib/maps', () => ({
  calculateDistanceAndDriveTime: mockCalculateDistanceAndDriveTime,
}));

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
  limit: jest.fn(),
  fn: {
    now: jest.fn(() => 'NOW()')
  },
  raw: jest.fn()
};

// Configure chaining
Object.keys(mockDb).forEach(key => {
  if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn' && key !== 'raw') {
    (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
  }
});

// Mock the database config module by setting up require mock
jest.mock('../config/database', () => mockDb);

describe('DistanceCalculationService', () => {
  let DistanceCalculationService: any;
  let distanceCalculationService: any;

  beforeAll(async () => {
    // Import the service after mocks are set up
    const module = await import('../DistanceCalculationService');
    DistanceCalculationService = module.default;
  });

  beforeEach(() => {
    distanceCalculationService = new DistanceCalculationService();

    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock chains
    Object.keys(mockDb).forEach(key => {
      if (typeof mockDb[key as keyof typeof mockDb] === 'function' && key !== 'fn' && key !== 'raw') {
        (mockDb[key as keyof typeof mockDb] as jest.Mock).mockReturnValue(mockDb);
      }
    });

    // Setup default mock implementations
    mockLocationDataService.getUserLocation.mockResolvedValue({
      user_id: 'user-1',
      latitude: 51.0447,
      longitude: -114.0719,
      full_address: '123 Main St, Calgary, AB'
    });

    mockCalculateDistanceAndDriveTime.mockResolvedValue({
      distance: '15.2 km',
      distanceValue: 15200,
      duration: '18 mins',
      durationValue: 1080
    });

    // Mock successful database operations
    mockDb.first.mockResolvedValue({
      id: 'location-1',
      name: 'Sports Complex',
      latitude: 51.0800,
      longitude: -114.1300,
      is_active: true
    });

    mockDb.returning.mockResolvedValue([{
      id: 1,
      user_id: 'user-1',
      location_id: 'location-1',
      distance_meters: 15200,
      drive_time_minutes: 18
    }]);
  });

  describe('Constructor', () => {
    it('should create instance with LocationDataService and default settings', () => {
      expect(distanceCalculationService).toBeDefined();
      expect(distanceCalculationService.locationDataService).toBeDefined();
      expect(distanceCalculationService.rateLimitDelay).toBe(1000);
      expect(distanceCalculationService.maxRetries).toBe(3);
      expect(distanceCalculationService.retryDelay).toBe(5000);
    });
  });

  describe('calculateUserLocationDistance', () => {
    it('should successfully calculate distance between user and location', async () => {
      const result = await distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1');

      expect(mockLocationDataService.getUserLocation).toHaveBeenCalledWith('user-1');
      expect(mockCalculateDistanceAndDriveTime).toHaveBeenCalledWith(
        { lat: 51.0447, lng: -114.0719 },
        { lat: 51.0800, lng: -114.1300 }
      );
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          location_id: 'location-1',
          distance_meters: 15200,
          drive_time_minutes: 18,
          calculation_successful: true
        })
      );
      expect(result).toEqual(expect.objectContaining({
        user_id: 'user-1',
        location_id: 'location-1'
      }));
    });

    it('should update existing distance record when already exists', async () => {
      const existingRecord = {
        id: 1,
        user_id: 'user-1',
        location_id: 'location-1',
        calculation_attempts: 2
      };

      // Mock sequence: first call for location check, second for existing distance
      mockDb.first
        .mockResolvedValueOnce({ // location check
          id: 'location-1',
          latitude: 51.0800,
          longitude: -114.1300,
          is_active: true
        })
        .mockResolvedValueOnce(existingRecord); // existing distance check

      const result = await distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1');

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          calculation_attempts: 3,
          calculation_successful: true
        })
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw error when user location not found', async () => {
      mockLocationDataService.getUserLocation.mockResolvedValue(null);

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('No location data found for user user-1');
    });

    it('should throw error when user coordinates missing', async () => {
      mockLocationDataService.getUserLocation.mockResolvedValue({
        user_id: 'user-1',
        latitude: null,
        longitude: null
      });

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('User user-1 location data missing coordinates');
    });

    it('should throw error when game location not found', async () => {
      mockDb.first
        .mockResolvedValueOnce(null); // location not found

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('Location location-1 not found or inactive');
    });

    it('should throw error when game location coordinates missing', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          id: 'location-1',
          latitude: null,
          longitude: null
        });

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('Location location-1 missing coordinates');
    });

    it('should throw error when distance calculation fails', async () => {
      mockCalculateDistanceAndDriveTime.mockResolvedValue(null);

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('Distance calculation failed - no route found');
    });

    it('should record failed calculation on error', async () => {
      const recordFailedSpy = jest.spyOn(distanceCalculationService, 'recordFailedCalculation')
        .mockResolvedValue(undefined);

      mockCalculateDistanceAndDriveTime.mockRejectedValue(new Error('API error'));

      await expect(
        distanceCalculationService.calculateUserLocationDistance('user-1', 'location-1')
      ).rejects.toThrow('API error');

      expect(recordFailedSpy).toHaveBeenCalledWith('user-1', 'location-1', 'API error');
    });
  });

  describe('calculateUserDistancesToAllLocations', () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Location 1' },
      { id: 'loc-2', name: 'Location 2' },
      { id: 'loc-3', name: 'Location 3' }
    ];

    beforeEach(() => {
      mockDb.select.mockResolvedValue(mockLocations);
      jest.spyOn(distanceCalculationService, 'delay').mockResolvedValue(undefined);
    });

    it('should calculate distances to all locations successfully', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1', location_id: 'loc-1' })
        .mockResolvedValueOnce({ id: 2, user_id: 'user-1', location_id: 'loc-2' })
        .mockResolvedValueOnce({ id: 3, user_id: 'user-1', location_id: 'loc-3' });

      const result = await distanceCalculationService.calculateUserDistancesToAllLocations('user-1');

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalLocations).toBe(3);
      expect(result.userId).toBe('user-1');
      expect(distanceCalculationService.delay).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1', location_id: 'loc-1' })
        .mockRejectedValueOnce(new Error('Calculation failed'))
        .mockResolvedValueOnce({ id: 3, user_id: 'user-1', location_id: 'loc-3' });

      const result = await distanceCalculationService.calculateUserDistancesToAllLocations('user-1');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        locationId: 'loc-2',
        locationName: 'Location 2',
        error: 'Calculation failed'
      });
      expect(result.totalLocations).toBe(3);
    });

    it('should respect rate limits with delays', async () => {
      const delaySpy = jest.spyOn(distanceCalculationService, 'delay').mockResolvedValue(undefined);
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance').mockResolvedValue({ id: 1 });

      await distanceCalculationService.calculateUserDistancesToAllLocations('user-1');

      expect(delaySpy).toHaveBeenCalledTimes(3);
      expect(delaySpy).toHaveBeenCalledWith(1000);
    });

    it('should apply delay even on calculation errors', async () => {
      const delaySpy = jest.spyOn(distanceCalculationService, 'delay').mockResolvedValue(undefined);
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance').mockRejectedValue(new Error('Error'));

      await distanceCalculationService.calculateUserDistancesToAllLocations('user-1');

      expect(delaySpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculateAllUsersDistanceToLocation', () => {
    const mockUsers = [
      { user_id: 'user-1', name: 'John Doe' },
      { user_id: 'user-2', name: 'Jane Smith' },
      { user_id: 'user-3', name: 'Bob Johnson' }
    ];

    beforeEach(() => {
      mockDb.select.mockResolvedValue(mockUsers);
      jest.spyOn(distanceCalculationService, 'delay').mockResolvedValue(undefined);
    });

    it('should calculate distances for all users successfully', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1', location_id: 'loc-1' })
        .mockResolvedValueOnce({ id: 2, user_id: 'user-2', location_id: 'loc-1' })
        .mockResolvedValueOnce({ id: 3, user_id: 'user-3', location_id: 'loc-1' });

      const result = await distanceCalculationService.calculateAllUsersDistanceToLocation('loc-1');

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalUsers).toBe(3);
      expect(result.locationId).toBe('loc-1');
    });

    it('should handle partial failures for users', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1', location_id: 'loc-1' })
        .mockRejectedValueOnce(new Error('User location error'))
        .mockResolvedValueOnce({ id: 3, user_id: 'user-3', location_id: 'loc-1' });

      const result = await distanceCalculationService.calculateAllUsersDistanceToLocation('loc-1');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        userId: 'user-2',
        userName: 'Jane Smith',
        error: 'User location error'
      });
    });
  });

  describe('getUserDistances', () => {
    const mockDistances = [
      {
        id: 1,
        user_id: 'user-1',
        location_id: 'loc-1',
        distance_meters: 5000,
        drive_time_minutes: 8,
        location_name: 'Close Location',
        location_city: 'Calgary'
      },
      {
        id: 2,
        user_id: 'user-1',
        location_id: 'loc-2',
        distance_meters: 15000,
        drive_time_minutes: 20,
        location_name: 'Far Location',
        location_city: 'Calgary'
      }
    ];

    beforeEach(() => {
      mockDb.select.mockResolvedValue(mockDistances);
    });

    it('should return all distances for user without filters', async () => {
      const result = await distanceCalculationService.getUserDistances('user-1');

      expect(mockDb.join).toHaveBeenCalledWith('locations', 'user_location_distances.location_id', 'locations.id');
      expect(mockDb.where).toHaveBeenCalledWith('user_location_distances.user_id', 'user-1');
      expect(mockDb.orderBy).toHaveBeenCalledWith('user_location_distances.drive_time_minutes', 'asc');
      expect(result).toEqual(mockDistances);
    });

    it('should apply maxDriveTimeMinutes filter', async () => {
      await distanceCalculationService.getUserDistances('user-1', { maxDriveTimeMinutes: 15 });

      expect(mockDb.where).toHaveBeenCalledWith('user_location_distances.drive_time_minutes', '<=', 15);
    });

    it('should apply maxDistanceMeters filter', async () => {
      await distanceCalculationService.getUserDistances('user-1', { maxDistanceMeters: 10000 });

      expect(mockDb.where).toHaveBeenCalledWith('user_location_distances.distance_meters', '<=', 10000);
    });

    it('should apply city filter', async () => {
      await distanceCalculationService.getUserDistances('user-1', { city: 'Calgary' });

      expect(mockDb.where).toHaveBeenCalledWith('locations.city', 'ilike', '%Calgary%');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database error'));

      await expect(
        distanceCalculationService.getUserDistances('user-1')
      ).rejects.toThrow('Database error');
    });
  });

  describe('recordFailedCalculation', () => {
    it('should update existing record with failure details', async () => {
      const existingRecord = {
        id: 1,
        user_id: 'user-1',
        location_id: 'location-1',
        calculation_attempts: 1
      };

      // Mock sequence for checking existing record
      mockDb.first.mockResolvedValueOnce(existingRecord);

      await distanceCalculationService.recordFailedCalculation('user-1', 'location-1', 'API error');

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          calculation_successful: false,
          calculation_error: 'API error',
          calculation_attempts: 2,
          needs_recalculation: true
        })
      );
    });

    it('should create new record for first failure', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await distanceCalculationService.recordFailedCalculation('user-1', 'location-1', 'API error');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          location_id: 'location-1',
          calculation_successful: false,
          calculation_error: 'API error',
          calculation_attempts: 1,
          needs_recalculation: true
        })
      );
    });

    it('should handle database errors silently', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(
        distanceCalculationService.recordFailedCalculation('user-1', 'location-1', 'API error')
      ).resolves.toBeUndefined();
    });
  });

  describe('retryFailedCalculations', () => {
    const mockFailedCalculations = [
      { user_id: 'user-1', location_id: 'loc-1', calculation_attempts: 1 },
      { user_id: 'user-2', location_id: 'loc-2', calculation_attempts: 2 }
    ];

    beforeEach(() => {
      mockDb.select.mockResolvedValue(mockFailedCalculations);
      jest.spyOn(distanceCalculationService, 'delay').mockResolvedValue(undefined);
    });

    it('should retry failed calculations successfully', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1' })
        .mockResolvedValueOnce({ id: 2, user_id: 'user-2' });

      const result = await distanceCalculationService.retryFailedCalculations(10);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalRetried).toBe(2);
    });

    it('should handle retry failures', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserLocationDistance')
        .mockResolvedValueOnce({ id: 1, user_id: 'user-1' })
        .mockRejectedValueOnce(new Error('Still failing'));

      const result = await distanceCalculationService.retryFailedCalculations(10);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        userId: 'user-2',
        locationId: 'loc-2',
        attempts: 2,
        error: 'Still failing'
      });
    });

    it('should limit retries to specified maximum', async () => {
      const result = await distanceCalculationService.retryFailedCalculations(5);

      expect(mockDb.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getCalculationStats', () => {
    const mockStats = {
      total_calculations: '100',
      successful_calculations: '85',
      failed_calculations: '15',
      need_recalculation: '5',
      avg_drive_time_minutes: '22.5',
      avg_distance_meters: '18750.0'
    };

    beforeEach(() => {
      mockDb.first.mockResolvedValue(mockStats);
    });

    it('should return calculation statistics', async () => {
      const result = await distanceCalculationService.getCalculationStats();

      expect(mockDb.raw).toHaveBeenCalledWith('COUNT(*) as total_calculations');
      expect(result).toEqual({
        totalCalculations: 100,
        successfulCalculations: 85,
        failedCalculations: 15,
        needRecalculation: 5,
        averageDriveTimeMinutes: 22.5,
        averageDistanceMeters: 18750.0
      });
    });

    it('should handle null averages gracefully', async () => {
      mockDb.first.mockResolvedValue({
        ...mockStats,
        avg_drive_time_minutes: null,
        avg_distance_meters: null
      });

      const result = await distanceCalculationService.getCalculationStats();

      expect(result.averageDriveTimeMinutes).toBe(0);
      expect(result.averageDistanceMeters).toBe(0);
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      jest.useFakeTimers();
      const delayPromise = distanceCalculationService.delay(1000);

      jest.advanceTimersByTime(1000);
      await delayPromise;

      jest.useRealTimers();
      // Test passes if no timeout occurs
    });
  });

  describe('initializeAllDistances', () => {
    const mockUsers = [
      { user_id: 'user-1', name: 'John Doe' },
      { user_id: 'user-2', name: 'Jane Smith' }
    ];

    const mockLocations = [
      { id: 'loc-1', name: 'Location 1' },
      { id: 'loc-2', name: 'Location 2' }
    ];

    beforeEach(() => {
      // First call for users, second call for locations
      mockDb.select
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockLocations);
    });

    it('should initialize distances for all users and locations', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserDistancesToAllLocations')
        .mockResolvedValueOnce({
          userId: 'user-1',
          successful: [{ id: 1 }, { id: 2 }],
          failed: [],
          totalLocations: 2
        })
        .mockResolvedValueOnce({
          userId: 'user-2',
          successful: [{ id: 3 }, { id: 4 }],
          failed: [],
          totalLocations: 2
        });

      const result = await distanceCalculationService.initializeAllDistances();

      expect(result.totalUsers).toBe(2);
      expect(result.totalLocations).toBe(2);
      expect(result.totalCalculations).toBe(4);
      expect(result.successfulCalculations).toBe(4);
      expect(result.failedCalculations).toBe(0);
    });

    it('should handle batch calculation failures', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserDistancesToAllLocations')
        .mockResolvedValueOnce({
          userId: 'user-1',
          successful: [{ id: 1 }],
          failed: [{ locationId: 'loc-2', error: 'Error' }],
          totalLocations: 2
        })
        .mockRejectedValueOnce(new Error('Batch failed'));

      const result = await distanceCalculationService.initializeAllDistances();

      expect(result.successfulCalculations).toBe(1);
      expect(result.failedCalculations).toBe(2); // 1 failed calculation + 1 failed user
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0]).toMatchObject({
        userId: 'user-2',
        userName: 'Jane Smith',
        error: 'Batch failed'
      });
    });

    it('should calculate correct estimation for completion time', async () => {
      jest.spyOn(distanceCalculationService, 'calculateUserDistancesToAllLocations').mockResolvedValue({
        userId: 'user-1',
        successful: [],
        failed: [],
        totalLocations: 2
      });

      const result = await distanceCalculationService.initializeAllDistances();

      expect(result.totalCalculations).toBe(4); // 2 users × 2 locations
    });
  });
});