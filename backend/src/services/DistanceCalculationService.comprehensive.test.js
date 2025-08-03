const DistanceCalculationService = require('./DistanceCalculationService');
const LocationDataService = require('./LocationDataService');
const knex = require('../config/database');

// Mock external dependencies
jest.mock('./LocationDataService');
jest.mock('../../../lib/maps', () => ({
  calculateDistanceAndDriveTime: jest.fn()
}));

describe('DistanceCalculationService - Comprehensive Unit Tests', () => {
  let service;
  let locationDataServiceMock;
  let calculateDistanceAndDriveTimeMock;
  let testUsers = [];
  let testLocations = [];

  // Test data fixtures
  const mockUserLocation = {
    user_id: 'user-1',
    full_address: '123 Main St, Calgary, AB',
    city: 'Calgary',
    province: 'AB',
    postal_code: 'T2P 1M1',
    latitude: '51.0447',
    longitude: '-114.0719',
    geocoding_provider: 'nominatim'
  };

  const mockGameLocation = {
    id: 'location-1',
    name: 'Test Arena',
    address: '456 Arena St, Calgary, AB',
    city: 'Calgary',
    province: 'AB',
    postal_code: 'T2P 2M2',
    latitude: '51.0550',
    longitude: '-114.0850',
    is_active: true
  };

  const mockDistanceResult = {
    distance: '15.2 km',
    duration: '18 mins',
    distanceValue: 15200, // meters
    durationValue: 1080   // seconds (18 minutes)
  };

  beforeAll(async () => {
    service = new DistanceCalculationService();
    
    // Get mocked dependencies
    locationDataServiceMock = new LocationDataService();
    const { calculateDistanceAndDriveTime } = require('../../../lib/maps');
    calculateDistanceAndDriveTimeMock = calculateDistanceAndDriveTime;
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock responses
    locationDataServiceMock.getUserLocation.mockResolvedValue(mockUserLocation);
    calculateDistanceAndDriveTimeMock.mockResolvedValue(mockDistanceResult);
    
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('locations').where('name', 'like', 'Test%').del();
    await knex('users').where('email', 'like', 'test-%').del();
    testUsers = [];
    testLocations = [];
  });

  afterAll(async () => {
    // Clean up test data
    for (const user of testUsers) {
      await knex('user_location_distances').where('user_id', user.id).del();
      await knex('user_locations').where('user_id', user.id).del();
      await knex('users').where('id', user.id).del();
    }
    
    for (const location of testLocations) {
      await knex('locations').where('id', location.id).del();
    }
  });

  /**
   * Helper functions to create test data
   */
  const createTestUser = async (overrides = {}) => {
    const userData = {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password_hash: 'test-hash',
      role: 'referee',
      name: 'Test User',
      postal_code: 'T2P 1M1',
      ...overrides
    };

    const [user] = await knex('users').insert(userData).returning('*');
    testUsers.push(user);
    return user;
  };

  const createTestLocation = async (overrides = {}) => {
    const locationData = {
      name: `Test Arena ${Date.now()}`,
      address: '456 Test St',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 2M2',
      country: 'Canada',
      latitude: 51.0550,
      longitude: -114.0850,
      is_active: true,
      ...overrides
    };

    const [location] = await knex('locations').insert(locationData).returning('*');
    testLocations.push(location);
    return location;
  };

  const createTestUserLocation = async (userId, overrides = {}) => {
    const locationData = {
      user_id: userId,
      full_address: '123 Main St, Calgary, AB',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 1M1',
      latitude: '51.0447',
      longitude: '-114.0719',
      geocoding_provider: 'nominatim',
      ...overrides
    };

    const [userLocation] = await knex('user_locations').insert(locationData).returning('*');
    return userLocation;
  };

  describe('calculateUserLocationDistance', () => {
    test('should calculate distance between user and location successfully', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      const result = await service.calculateUserLocationDistance(user.id, location.id);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
      expect(result.location_id).toBe(location.id);
      expect(result.distance_meters).toBe(15200);
      expect(result.distance_text).toBe('15.2 km');
      expect(result.drive_time_seconds).toBe(1080);
      expect(result.drive_time_text).toBe('18 mins');
      expect(result.drive_time_minutes).toBe(18);
      expect(result.calculation_provider).toBe('openrouteservice');
      expect(result.calculation_successful).toBe(true);
      expect(result.calculation_error).toBeNull();
      
      // Verify it was saved to database
      const dbRecord = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id)
        .first();
      expect(dbRecord).toBeDefined();
    });

    test('should update existing distance record', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create initial distance record
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        distance_meters: 10000,
        calculation_attempts: 1
      });
      
      const result = await service.calculateUserLocationDistance(user.id, location.id);
      
      expect(result.distance_meters).toBe(15200);
      expect(result.calculation_attempts).toBe(2);
      
      // Verify only one record exists
      const records = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id);
      expect(records).toHaveLength(1);
    });

    test('should throw error when user location not found', async () => {
      const location = await createTestLocation();
      locationDataServiceMock.getUserLocation.mockResolvedValueOnce(null);
      
      await expect(service.calculateUserLocationDistance('non-existent-user', location.id))
        .rejects.toThrow('No location data found for user non-existent-user');
    });

    test('should throw error when user location missing coordinates', async () => {
      const location = await createTestLocation();
      locationDataServiceMock.getUserLocation.mockResolvedValueOnce({
        ...mockUserLocation,
        latitude: null,
        longitude: null
      });
      
      await expect(service.calculateUserLocationDistance('user-1', location.id))
        .rejects.toThrow('User user-1 location data missing coordinates');
    });

    test('should throw error when game location not found', async () => {
      await expect(service.calculateUserLocationDistance('user-1', 'non-existent-location'))
        .rejects.toThrow('Location non-existent-location not found or inactive');
    });

    test('should throw error when game location is inactive', async () => {
      const location = await createTestLocation({ is_active: false });
      
      await expect(service.calculateUserLocationDistance('user-1', location.id))
        .rejects.toThrow(`Location ${location.id} not found or inactive`);
    });

    test('should throw error when game location missing coordinates', async () => {
      const location = await createTestLocation({ latitude: null, longitude: null });
      
      await expect(service.calculateUserLocationDistance('user-1', location.id))
        .rejects.toThrow(`Location ${location.id} missing coordinates`);
    });

    test('should handle distance calculation failure', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      calculateDistanceAndDriveTimeMock.mockResolvedValueOnce(null);
      
      await expect(service.calculateUserLocationDistance(user.id, location.id))
        .rejects.toThrow('Distance calculation failed - no route found');
    });

    test('should record failed calculation in database', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      calculateDistanceAndDriveTimeMock.mockRejectedValueOnce(new Error('API Error'));
      
      try {
        await service.calculateUserLocationDistance(user.id, location.id);
      } catch (error) {
        // Expected to throw
      }
      
      // Verify failed calculation was recorded
      const failedRecord = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id)
        .first();
      
      expect(failedRecord).toBeDefined();
      expect(failedRecord.calculation_successful).toBe(false);
      expect(failedRecord.calculation_error).toBe('API Error');
      expect(failedRecord.needs_recalculation).toBe(true);
    });

    test('should handle coordinate parsing correctly', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Mock string coordinates
      locationDataServiceMock.getUserLocation.mockResolvedValueOnce({
        ...mockUserLocation,
        latitude: '51.0447',
        longitude: '-114.0719'
      });
      
      await service.calculateUserLocationDistance(user.id, location.id);
      
      expect(calculateDistanceAndDriveTimeMock).toHaveBeenCalledWith(
        { lat: 51.0447, lng: -114.0719 },
        { lat: 51.0550, lng: -114.0850 }
      );
    });
  });

  describe('calculateUserDistancesToAllLocations', () => {
    test('should calculate distances to all active locations', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation({ name: 'Arena 1' });
      const location2 = await createTestLocation({ name: 'Arena 2' });
      await createTestLocation({ name: 'Inactive Arena', is_active: false });
      
      const result = await service.calculateUserDistancesToAllLocations(user.id);
      
      expect(result.userId).toBe(user.id);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalLocations).toBe(2); // Only active locations
      
      // Verify database records
      const distances = await knex('user_location_distances').where('user_id', user.id);
      expect(distances).toHaveLength(2);
    });

    test('should handle partial failures during batch calculation', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation({ name: 'Good Arena' });
      const location2 = await createTestLocation({ name: 'Bad Arena' });
      
      // Mock success for first, failure for second
      calculateDistanceAndDriveTimeMock
        .mockResolvedValueOnce(mockDistanceResult)
        .mockRejectedValueOnce(new Error('Calculation failed'));
      
      const result = await service.calculateUserDistancesToAllLocations(user.id);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].locationId).toBe(location2.id);
      expect(result.failed[0].locationName).toBe('Bad Arena');
      expect(result.failed[0].error).toBe('Calculation failed');
    });

    test('should apply rate limiting delays', async () => {
      const user = await createTestUser();
      await createTestLocation({ name: 'Arena 1' });
      await createTestLocation({ name: 'Arena 2' });
      
      const delaySpy = jest.spyOn(service, 'delay');
      delaySpy.mockResolvedValue();
      
      await service.calculateUserDistancesToAllLocations(user.id);
      
      expect(delaySpy).toHaveBeenCalledWith(1000); // rateLimitDelay
      expect(delaySpy).toHaveBeenCalledTimes(2);
      
      delaySpy.mockRestore();
    });

    test('should handle user with no location data', async () => {
      const user = await createTestUser();
      locationDataServiceMock.getUserLocation.mockResolvedValueOnce(null);
      
      await expect(service.calculateUserDistancesToAllLocations(user.id))
        .rejects.toThrow('No location data found for user');
    });
  });

  describe('calculateAllUsersDistanceToLocation', () => {
    test('should calculate distances for all users to location', async () => {
      const user1 = await createTestUser({ name: 'User 1' });
      const user2 = await createTestUser({ name: 'User 2' });
      const location = await createTestLocation();
      
      // Create user locations
      await createTestUserLocation(user1.id);
      await createTestUserLocation(user2.id);
      
      const result = await service.calculateAllUsersDistanceToLocation(location.id);
      
      expect(result.locationId).toBe(location.id);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalUsers).toBe(2);
    });

    test('should handle partial failures for users', async () => {
      const user1 = await createTestUser({ name: 'Good User' });
      const user2 = await createTestUser({ name: 'Bad User' });
      const location = await createTestLocation();
      
      await createTestUserLocation(user1.id);
      await createTestUserLocation(user2.id);
      
      // Mock success for first user, failure for second
      locationDataServiceMock.getUserLocation
        .mockResolvedValueOnce(mockUserLocation)
        .mockRejectedValueOnce(new Error('User location error'));
      
      const result = await service.calculateAllUsersDistanceToLocation(location.id);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].userId).toBe(user2.id);
      expect(result.failed[0].userName).toBe('Bad User');
    });

    test('should only include referee users with coordinates', async () => {
      const refereeUser = await createTestUser({ role: 'referee' });
      const adminUser = await createTestUser({ role: 'admin' });
      const location = await createTestLocation();
      
      // Create user locations
      await createTestUserLocation(refereeUser.id);
      await createTestUserLocation(adminUser.id);
      
      const result = await service.calculateAllUsersDistanceToLocation(location.id);
      
      expect(result.totalUsers).toBe(1); // Only referee user
      expect(result.successful).toHaveLength(1);
    });

    test('should exclude users without coordinates', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create user location without coordinates
      await createTestUserLocation(user.id, { latitude: null, longitude: null });
      
      const result = await service.calculateAllUsersDistanceToLocation(location.id);
      
      expect(result.totalUsers).toBe(0);
      expect(result.successful).toHaveLength(0);
    });
  });

  describe('getUserDistances', () => {
    test('should return user distances with basic filtering', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation({ name: 'Close Arena' });
      const location2 = await createTestLocation({ name: 'Far Arena' });
      
      // Create distance records
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: location1.id,
          distance_meters: 5000,
          drive_time_minutes: 8,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: location2.id,
          distance_meters: 25000,
          drive_time_minutes: 35,
          calculation_successful: true
        }
      ]);
      
      const result = await service.getUserDistances(user.id);
      
      expect(result).toHaveLength(2);
      expect(result[0].location_name).toBe('Close Arena');
      expect(result[1].location_name).toBe('Far Arena');
      
      // Should be ordered by drive time
      expect(result[0].drive_time_minutes).toBeLessThan(result[1].drive_time_minutes);
    });

    test('should filter by maximum drive time', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation({ name: 'Close Arena' });
      const location2 = await createTestLocation({ name: 'Far Arena' });
      
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: location1.id,
          drive_time_minutes: 15,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: location2.id,
          drive_time_minutes: 45,
          calculation_successful: true
        }
      ]);
      
      const result = await service.getUserDistances(user.id, { maxDriveTimeMinutes: 30 });
      
      expect(result).toHaveLength(1);
      expect(result[0].location_name).toBe('Close Arena');
    });

    test('should filter by maximum distance', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation({ name: 'Close Arena' });
      const location2 = await createTestLocation({ name: 'Far Arena' });
      
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: location1.id,
          distance_meters: 10000,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: location2.id,
          distance_meters: 50000,
          calculation_successful: true
        }
      ]);
      
      const result = await service.getUserDistances(user.id, { maxDistanceMeters: 20000 });
      
      expect(result).toHaveLength(1);
      expect(result[0].location_name).toBe('Close Arena');
    });

    test('should filter by city', async () => {
      const user = await createTestUser();
      const calgaryLocation = await createTestLocation({ 
        name: 'Calgary Arena',
        city: 'Calgary'
      });
      const edmontonLocation = await createTestLocation({ 
        name: 'Edmonton Arena',
        city: 'Edmonton'
      });
      
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: calgaryLocation.id,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: edmontonLocation.id,
          calculation_successful: true
        }
      ]);
      
      const result = await service.getUserDistances(user.id, { city: 'Calgary' });
      
      expect(result).toHaveLength(1);
      expect(result[0].location_name).toBe('Calgary Arena');
    });

    test('should exclude failed calculations and inactive locations', async () => {
      const user = await createTestUser();
      const activeLocation = await createTestLocation({ name: 'Active Arena' });
      const inactiveLocation = await createTestLocation({ 
        name: 'Inactive Arena',
        is_active: false
      });
      
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: activeLocation.id,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: inactiveLocation.id,
          calculation_successful: true
        },
        {
          user_id: user.id,
          location_id: activeLocation.id,
          calculation_successful: false // Failed calculation
        }
      ]);
      
      const result = await service.getUserDistances(user.id);
      
      expect(result).toHaveLength(1);
      expect(result[0].location_name).toBe('Active Arena');
    });
  });

  describe('recordFailedCalculation', () => {
    test('should create new failed calculation record', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      await service.recordFailedCalculation(user.id, location.id, 'Test error');
      
      const record = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id)
        .first();
      
      expect(record).toBeDefined();
      expect(record.calculation_successful).toBe(false);
      expect(record.calculation_error).toBe('Test error');
      expect(record.calculation_attempts).toBe(1);
      expect(record.needs_recalculation).toBe(true);
    });

    test('should update existing failed calculation record', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create initial failed record
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        calculation_successful: false,
        calculation_attempts: 1
      });
      
      await service.recordFailedCalculation(user.id, location.id, 'Second error');
      
      const record = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id)
        .first();
      
      expect(record.calculation_attempts).toBe(2);
      expect(record.calculation_error).toBe('Second error');
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      const originalWhere = knex('user_location_distances').where;
      jest.spyOn(knex('user_location_distances'), 'where').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      // Should not throw error
      await expect(service.recordFailedCalculation('user-1', 'location-1', 'error'))
        .resolves.toBeUndefined();
    });
  });

  describe('retryFailedCalculations', () => {
    test('should retry failed calculations successfully', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create failed calculation record
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        calculation_successful: false,
        calculation_attempts: 1,
        needs_recalculation: true
      });
      
      const result = await service.retryFailedCalculations(5);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(result.totalRetried).toBe(1);
      
      // Verify record was updated
      const record = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id)
        .first();
      
      expect(record.calculation_successful).toBe(true);
    });

    test('should skip calculations that exceed max retry attempts', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create failed calculation with too many attempts
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        calculation_successful: false,
        calculation_attempts: 5, // Exceeds maxRetries (3)
        needs_recalculation: true
      });
      
      const result = await service.retryFailedCalculations(5);
      
      expect(result.totalRetried).toBe(0);
    });

    test('should handle retry failures', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        calculation_successful: false,
        calculation_attempts: 1,
        needs_recalculation: true
      });
      
      // Mock calculation failure
      calculateDistanceAndDriveTimeMock.mockRejectedValueOnce(new Error('Still failing'));
      
      const result = await service.retryFailedCalculations(5);
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Still failing');
    });

    test('should respect maxRetries parameter', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const location = await createTestLocation();
      
      // Create two failed calculations
      await knex('user_location_distances').insert([
        {
          user_id: user1.id,
          location_id: location.id,
          calculation_successful: false,
          calculation_attempts: 1,
          needs_recalculation: true
        },
        {
          user_id: user2.id,
          location_id: location.id,
          calculation_successful: false,
          calculation_attempts: 1,
          needs_recalculation: true
        }
      ]);
      
      const result = await service.retryFailedCalculations(1);
      
      expect(result.totalRetried).toBe(1); // Should only retry one
    });
  });

  describe('getCalculationStats', () => {
    test('should return comprehensive calculation statistics', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation();
      const location2 = await createTestLocation();
      
      // Create various calculation records
      await knex('user_location_distances').insert([
        {
          user_id: user.id,
          location_id: location1.id,
          calculation_successful: true,
          distance_meters: 10000,
          drive_time_minutes: 15
        },
        {
          user_id: user.id,
          location_id: location2.id,
          calculation_successful: true,
          distance_meters: 20000,
          drive_time_minutes: 25
        },
        {
          user_id: user.id,
          location_id: location1.id,
          calculation_successful: false,
          needs_recalculation: true
        }
      ]);
      
      const stats = await service.getCalculationStats();
      
      expect(stats.totalCalculations).toBe(3);
      expect(stats.successfulCalculations).toBe(2);
      expect(stats.failedCalculations).toBe(1);
      expect(stats.needRecalculation).toBe(1);
      expect(stats.averageDistanceMeters).toBe(15000); // (10000 + 20000) / 2
      expect(stats.averageDriveTimeMinutes).toBe(20); // (15 + 25) / 2
    });

    test('should handle empty statistics', async () => {
      const stats = await service.getCalculationStats();
      
      expect(stats.totalCalculations).toBe(0);
      expect(stats.successfulCalculations).toBe(0);
      expect(stats.failedCalculations).toBe(0);
      expect(stats.needRecalculation).toBe(0);
      expect(stats.averageDistanceMeters).toBe(0);
      expect(stats.averageDriveTimeMinutes).toBe(0);
    });
  });

  describe('initializeAllDistances', () => {
    test('should initialize distances for all users and locations', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const location1 = await createTestLocation();
      const location2 = await createTestLocation();
      
      await createTestUserLocation(user1.id);
      await createTestUserLocation(user2.id);
      
      const result = await service.initializeAllDistances();
      
      expect(result.totalUsers).toBe(2);
      expect(result.totalLocations).toBe(2);
      expect(result.totalCalculations).toBe(4); // 2 users * 2 locations
      expect(result.successfulCalculations).toBe(4);
      expect(result.failedCalculations).toBe(0);
      expect(result.userResults).toHaveLength(2);
    });

    test('should handle mixed success and failure scenarios', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const location = await createTestLocation();
      
      await createTestUserLocation(user1.id);
      await createTestUserLocation(user2.id);
      
      // Mock success for first user, failure for second
      locationDataServiceMock.getUserLocation
        .mockResolvedValueOnce(mockUserLocation)
        .mockRejectedValueOnce(new Error('User error'));
      
      const result = await service.initializeAllDistances();
      
      expect(result.totalUsers).toBe(2);
      expect(result.successfulCalculations).toBe(1);
      expect(result.failedCalculations).toBe(1);
      expect(result.userErrors).toHaveLength(1);
    });

    test('should handle no users or locations', async () => {
      const result = await service.initializeAllDistances();
      
      expect(result.totalUsers).toBe(0);
      expect(result.totalLocations).toBeGreaterThanOrEqual(0);
      expect(result.totalCalculations).toBe(0);
    });
  });

  describe('delay', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await service.delay(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Rate limiting and performance', () => {
    test('should respect rate limiting configuration', () => {
      expect(service.rateLimitDelay).toBe(1000);
      expect(service.maxRetries).toBe(3);
      expect(service.retryDelay).toBe(5000);
    });

    test('should handle concurrent calculation requests', async () => {
      const user = await createTestUser();
      const location1 = await createTestLocation();
      const location2 = await createTestLocation();
      
      // Simulate concurrent requests
      const promises = [
        service.calculateUserLocationDistance(user.id, location1.id),
        service.calculateUserLocationDistance(user.id, location2.id)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      expect(results[0].location_id).toBe(location1.id);
      expect(results[1].location_id).toBe(location2.id);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed distance calculation results', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Mock malformed response
      calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
        distance: null,
        duration: undefined,
        distanceValue: 'not-a-number',
        durationValue: -1
      });
      
      const result = await service.calculateUserLocationDistance(user.id, location.id);
      
      expect(result.distance_text).toBeNull();
      expect(result.duration_text).toBeUndefined();
      expect(result.distance_meters).toBe('not-a-number');
      expect(result.drive_time_seconds).toBe(-1);
      expect(result.drive_time_minutes).toBe(-1); // Math.round(-1/60)
    });

    test('should handle database constraint violations', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      // Create duplicate record to cause constraint violation
      await knex('user_location_distances').insert({
        user_id: user.id,
        location_id: location.id,
        calculation_successful: true
      });
      
      // This should update, not create duplicate
      await expect(service.calculateUserLocationDistance(user.id, location.id))
        .resolves.toBeDefined();
    });

    test('should handle very large datasets efficiently', async () => {
      // Test with mock data to avoid creating actual large dataset
      const mockUsers = Array.from({ length: 1000 }, (_, i) => ({
        user_id: `user-${i}`,
        name: `User ${i}`
      }));
      
      // Mock the database query
      jest.spyOn(knex, 'from').mockImplementationOnce(() => ({
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers)
      }));
      
      const location = await createTestLocation();
      const result = await service.calculateAllUsersDistanceToLocation(location.id);
      
      expect(result.totalUsers).toBe(1000);
    });
  });
});