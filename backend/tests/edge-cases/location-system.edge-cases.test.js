const LocationDataService = require('../../src/services/LocationDataService');
const DistanceCalculationService = require('../../src/services/DistanceCalculationService');
const knex = require('../../src/config/database');

// Mock external dependencies
jest.mock('../../../lib/address-service', () => ({
  createAddressService: jest.fn(() => ({
    searchAddresses: jest.fn()
  }))
}));

jest.mock('../../../lib/maps', () => ({
  geocodeAddress: jest.fn(),
  calculateDistanceAndDriveTime: jest.fn()
}));

describe('Location System Edge Cases and Error Scenarios', () => {
  let locationDataService;
  let distanceCalculationService;
  let addressServiceMock;
  let geocodeAddressMock;
  let calculateDistanceAndDriveTimeMock;
  let testUsers = [];
  let testLocations = [];

  beforeAll(async () => {
    locationDataService = new LocationDataService();
    distanceCalculationService = new DistanceCalculationService();
    
    // Get mocked dependencies
    const { createAddressService } = require('../../../lib/address-service');
    const { geocodeAddress, calculateDistanceAndDriveTime } = require('../../../lib/maps');
    
    addressServiceMock = createAddressService();
    geocodeAddressMock = geocodeAddress;
    calculateDistanceAndDriveTimeMock = calculateDistanceAndDriveTime;
  });

  beforeEach(async () => {
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('locations').where('name', 'like', 'Edge%').del();
    await knex('users').where('email', 'like', 'edge-%').del();
    testUsers = [];
    testLocations = [];
    
    // Reset mocks
    jest.clearAllMocks();
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
   * Helper functions
   */
  const createTestUser = async (overrides = {}) => {
    const userData = {
      email: `edge-${Date.now()}-${Math.random()}@example.com`,
      password_hash: 'test-hash',
      role: 'referee',
      name: 'Edge Test User',
      postal_code: 'T2P 1M1',
      ...overrides
    };

    const [user] = await knex('users').insert(userData).returning('*');
    testUsers.push(user);
    return user;
  };

  const createTestLocation = async (overrides = {}) => {
    const locationData = {
      name: `Edge Test Arena ${Date.now()}`,
      address: '123 Edge St',
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

  describe('LocationDataService Edge Cases', () => {
    describe('Extreme Input Handling', () => {
      test('should handle extremely long addresses', async () => {
        const user = await createTestUser();
        const longAddress = 'A'.repeat(10000); // 10KB address
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'long-1',
          displayName: longAddress,
          city: 'Calgary',
          province: 'AB',
          coordinates: { lat: 51.0447, lng: -114.0719 }
        }]);
        
        const result = await locationDataService.createOrUpdateUserLocation(user.id, longAddress);
        
        expect(result.full_address).toBe(longAddress);
      });

      test('should handle addresses with special characters and encoding', async () => {
        const user = await createTestUser();
        const specialCharsAddress = '测试地址 123 Müller Straße, Côte-des-Neiges, Montréal, QC 🏠';
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'special-1',
          displayName: specialCharsAddress,
          city: 'Montréal',
          province: 'QC',
          coordinates: { lat: 45.5017, lng: -73.5673 }
        }]);
        
        const result = await locationDataService.createOrUpdateUserLocation(user.id, specialCharsAddress);
        
        expect(result.full_address).toBe(specialCharsAddress);
        expect(result.city).toBe('Montréal');
      });

      test('should handle malformed JSON in address service response', async () => {
        const user = await createTestUser();
        
        // Create circular reference to test JSON.stringify handling
        const circularData = { name: 'Test' };
        circularData.self = circularData;
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'circular-1',
          displayName: 'Test Address',
          city: 'Calgary',
          province: 'AB',
          coordinates: { lat: 51.0447, lng: -114.0719 },
          circularData
        }]);
        
        // Should not throw error, just handle gracefully
        const result = await locationDataService.createOrUpdateUserLocation(user.id, 'Test Address');
        
        expect(result.full_address).toBe('Test Address');
      });

      test('should handle null and undefined values in address response', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: null,
          displayName: undefined,
          streetNumber: null,
          streetName: undefined,
          city: null,
          province: null,
          postalCode: null,
          country: null,
          coordinates: null,
          confidence: undefined,
          type: null
        }]);
        
        const result = await locationDataService.createOrUpdateUserLocation(user.id, 'Incomplete Address');
        
        expect(result.full_address).toBe('Incomplete Address');
        expect(result.city).toBe('');
        expect(result.province).toBe('AB');
        expect(result.country).toBe('Canada');
      });

      test('should handle empty array from address service', async () => {
        const user = await createTestUser();
        addressServiceMock.searchAddresses.mockResolvedValueOnce([]);
        
        await expect(locationDataService.createOrUpdateUserLocation(user.id, 'Invalid Address'))
          .rejects.toThrow('No location data found for address: Invalid Address');
      });

      test('should handle address service returning invalid coordinates', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'invalid-coords',
          displayName: 'Test Address',
          city: 'Calgary',
          coordinates: {
            lat: 'invalid',
            lng: null
          }
        }]);
        
        geocodeAddressMock.mockResolvedValueOnce({ lat: 51.0447, lng: -114.0719 });
        
        const result = await locationDataService.createOrUpdateUserLocation(user.id, 'Test Address');
        
        // Should fallback to geocoding
        expect(result.latitude).toBe('51.0447');
        expect(result.longitude).toBe('-114.0719');
      });
    });

    describe('Network and API Error Scenarios', () => {
      test('should handle address service timeout', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses.mockImplementation(
          () => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
        );
        
        await expect(locationDataService.createOrUpdateUserLocation(user.id, 'Address'))
          .rejects.toThrow('Failed to process location data');
      });

      test('should handle address service rate limiting', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        
        addressServiceMock.searchAddresses
          .mockRejectedValueOnce(new Error('Rate limit exceeded'))
          .mockResolvedValueOnce([{
            id: 'success',
            displayName: 'Success Address',
            city: 'Calgary',
            coordinates: { lat: 51.0447, lng: -114.0719 }
          }]);
        
        // First should fail
        await expect(locationDataService.createOrUpdateUserLocation(user1.id, 'Address 1'))
          .rejects.toThrow('Failed to process location data');
        
        // Second should succeed
        const result = await locationDataService.createOrUpdateUserLocation(user2.id, 'Address 2');
        expect(result.full_address).toBe('Success Address');
      });

      test('should handle geocoding service failures', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'no-coords',
          displayName: 'No Coords Address',
          city: 'Calgary',
          coordinates: null
        }]);
        
        geocodeAddressMock.mockRejectedValueOnce(new Error('Geocoding service down'));
        
        const result = await locationDataService.createOrUpdateUserLocation(user.id, 'No Coords Address');
        
        expect(result.latitude).toBeNull();
        expect(result.longitude).toBeNull();
      });

      test('should handle intermittent network errors', async () => {
        const user = await createTestUser();
        
        let callCount = 0;
        addressServiceMock.searchAddresses.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve([{
            id: 'retry-success',
            displayName: 'Retry Success',
            city: 'Calgary',
            coordinates: { lat: 51.0447, lng: -114.0719 }
          }]);
        });
        
        // First call should fail
        await expect(locationDataService.createOrUpdateUserLocation(user.id, 'Address'))
          .rejects.toThrow('Failed to process location data');
        
        // Reset for retry (simulating user retry)
        const result = await locationDataService.createOrUpdateUserLocation(user.id, 'Address');
        expect(result.full_address).toBe('Retry Success');
      });
    });

    describe('Database Constraint and Integrity Edge Cases', () => {
      test('should handle concurrent updates to same user location', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses
          .mockResolvedValueOnce([{
            id: 'concurrent-1',
            displayName: 'Address 1',
            city: 'Calgary',
            coordinates: { lat: 51.0447, lng: -114.0719 }
          }])
          .mockResolvedValueOnce([{
            id: 'concurrent-2',
            displayName: 'Address 2',
            city: 'Edmonton',
            coordinates: { lat: 53.5461, lng: -113.4938 }
          }]);
        
        // Execute concurrent updates
        const promises = [
          locationDataService.createOrUpdateUserLocation(user.id, 'Address 1'),
          locationDataService.createOrUpdateUserLocation(user.id, 'Address 2')
        ];
        
        const results = await Promise.all(promises);
        
        // Both should succeed
        expect(results).toHaveLength(2);
        
        // Should have only one record in database (last update wins)
        const locationRecords = await knex('user_locations').where('user_id', user.id);
        expect(locationRecords).toHaveLength(1);
      });

      test('should handle database connection loss during operation', async () => {
        const user = await createTestUser();
        
        addressServiceMock.searchAddresses.mockResolvedValueOnce([{
          id: 'db-error',
          displayName: 'DB Error Address',
          city: 'Calgary',
          coordinates: { lat: 51.0447, lng: -114.0719 }
        }]);
        
        // Mock database error
        const originalInsert = knex('user_locations').insert;
        jest.spyOn(knex('user_locations'), 'insert').mockImplementationOnce(() => {
          throw new Error('Connection lost');
        });
        
        await expect(locationDataService.createOrUpdateUserLocation(user.id, 'Address'))
          .rejects.toThrow('Failed to process location data');
        
        // Restore original method
        knex('user_locations').insert = originalInsert;
      });

      test('should handle invalid user ID format', async () => {
        const invalidUserIds = [
          null,
          undefined,
          '',
          'not-a-uuid',
          123,
          {},
          []
        ];
        
        for (const invalidId of invalidUserIds) {
          await expect(locationDataService.createOrUpdateUserLocation(invalidId, 'Valid Address'))
            .rejects.toThrow();
        }
      });

      test('should handle extremely large batch operations', async () => {
        const largeUserCount = 1000;
        const users = [];
        
        // Create users in batches to avoid memory issues
        for (let i = 0; i < largeUserCount; i += 100) {
          const batchUsers = await Promise.all(
            Array.from({ length: Math.min(100, largeUserCount - i) }, () => createTestUser())
          );
          users.push(...batchUsers);
        }
        
        const userAddresses = users.map(user => ({
          userId: user.id,
          address: `${user.postal_code}, Calgary, AB`
        }));
        
        addressServiceMock.searchAddresses.mockResolvedValue([{
          id: 'batch-success',
          displayName: 'Batch Success',
          city: 'Calgary',
          coordinates: { lat: 51.0447, lng: -114.0719 }
        }]);
        
        const result = await locationDataService.batchCreateUserLocations(userAddresses);
        
        expect(result.totalProcessed).toBe(largeUserCount);
        expect(result.successful.length + result.failed.length).toBe(largeUserCount);
      });
    });
  });

  describe('DistanceCalculationService Edge Cases', () => {
    describe('Coordinate and Location Edge Cases', () => {
      test('should handle extreme coordinate values', async () => {
        const user = await createTestUser();
        const location = await createTestLocation({
          latitude: 90.0, // North pole
          longitude: 180.0 // Date line
        });
        
        // Create user location at opposite extreme
        await knex('user_locations').insert({
          user_id: user.id,
          full_address: 'South Pole',
          latitude: -90.0,
          longitude: -180.0,
          city: 'Antarctic',
          province: 'AN',
          country: 'Antarctica',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
          distance: '20015 km', // Half the Earth's circumference
          duration: 'No route available',
          distanceValue: 20015000,
          durationValue: 0
        });
        
        const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
        
        expect(result.distance_meters).toBe(20015000);
        expect(result.drive_time_seconds).toBe(0);
      });

      test('should handle coordinates with high precision', async () => {
        const user = await createTestUser();
        const location = await createTestLocation({
          latitude: 51.04471234567890123456, // Very high precision
          longitude: -114.07194567890123456
        });
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.04481234567890987654',
          longitude: '-114.07204567890987654',
          full_address: 'High Precision Address',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
          distance: '0.01 km',
          duration: '1 min',
          distanceValue: 10,
          durationValue: 60
        });
        
        const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
        
        expect(result.distance_meters).toBe(10);
      });

      test('should handle same-location distance calculation', async () => {
        const user = await createTestUser();
        const location = await createTestLocation({
          latitude: 51.0447,
          longitude: -114.0719
        });
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.0447',
          longitude: '-114.0719',
          full_address: 'Same Location',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
          distance: '0 m',
          duration: '0 mins',
          distanceValue: 0,
          durationValue: 0
        });
        
        const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
        
        expect(result.distance_meters).toBe(0);
        expect(result.drive_time_seconds).toBe(0);
      });

      test('should handle coordinates in different formats', async () => {
        const user = await createTestUser();
        const location = await createTestLocation({
          latitude: 51.0447,
          longitude: -114.0719
        });
        
        // Test with string coordinates containing whitespace and formatting
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: ' 51.0550 ',
          longitude: ' -114.0850 ',
          full_address: 'Formatted Coords',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
          distance: '5.2 km',
          duration: '8 mins',
          distanceValue: 5200,
          durationValue: 480
        });
        
        const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
        
        expect(result.distance_meters).toBe(5200);
      });
    });

    describe('API Error and Timeout Scenarios', () => {
      test('should handle distance calculation API timeout', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.0447',
          longitude: '-114.0719',
          full_address: 'Timeout Test',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockImplementation(
          () => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
        );
        
        await expect(distanceCalculationService.calculateUserLocationDistance(user.id, location.id))
          .rejects.toThrow('Request timeout');
        
        // Verify failed calculation was recorded
        const failedRecord = await knex('user_location_distances')
          .where('user_id', user.id)
          .where('location_id', location.id)
          .first();
        
        expect(failedRecord.calculation_successful).toBe(false);
        expect(failedRecord.calculation_error).toBe('Request timeout');
      });

      test('should handle API rate limiting with exponential backoff', async () => {
        const user = await createTestUser();
        const locations = await Promise.all([
          createTestLocation({ name: 'Location 1' }),
          createTestLocation({ name: 'Location 2' }),
          createTestLocation({ name: 'Location 3' })
        ]);
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.0447',
          longitude: '-114.0719',
          full_address: 'Rate Limit Test',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        let callCount = 0;
        calculateDistanceAndDriveTimeMock.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('Rate limit exceeded - 429'));
          }
          return Promise.resolve({
            distance: '10 km',
            duration: '15 mins',
            distanceValue: 10000,
            durationValue: 900
          });
        });
        
        // Mock faster delay for testing
        const originalDelay = distanceCalculationService.delay;
        distanceCalculationService.delay = jest.fn().mockResolvedValue();
        
        const result = await distanceCalculationService.calculateUserDistancesToAllLocations(user.id);
        
        expect(result.successful).toHaveLength(1); // Only third call succeeds
        expect(result.failed).toHaveLength(2);
        
        // Restore delay
        distanceCalculationService.delay = originalDelay;
      });

      test('should handle partial API response corruption', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.0447',
          longitude: '-114.0719',
          full_address: 'Corrupt Response Test',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        // Mock corrupted response
        calculateDistanceAndDriveTimeMock.mockResolvedValueOnce({
          distance: null,
          duration: undefined,
          distanceValue: 'not-a-number',
          durationValue: Infinity
        });
        
        const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
        
        expect(result.distance_text).toBeNull();
        expect(result.duration_text).toBeUndefined();
        expect(result.distance_meters).toBe('not-a-number');
        expect(result.drive_time_seconds).toBe(Infinity);
      });
    });

    describe('Database State Edge Cases', () => {
      test('should handle orphaned distance records', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        // Create distance record with non-existent user
        await knex('user_location_distances').insert({
          user_id: 'non-existent-user',
          location_id: location.id,
          distance_meters: 10000,
          calculation_successful: true
        });
        
        const result = await distanceCalculationService.getUserDistances('non-existent-user');
        
        // Should return empty array without error
        expect(result).toEqual([]);
      });

      test('should handle inconsistent calculation states', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        // Create record marked as successful but with error data
        await knex('user_location_distances').insert({
          user_id: user.id,
          location_id: location.id,
          calculation_successful: true,
          calculation_error: 'This should not exist',
          distance_meters: null,
          drive_time_minutes: null
        });
        
        const distances = await distanceCalculationService.getUserDistances(user.id);
        
        // Should still return the record despite inconsistency
        expect(distances).toHaveLength(1);
        expect(distances[0].calculation_successful).toBe(true);
      });

      test('should handle massive retry scenarios', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        // Create record with maximum retry attempts
        await knex('user_location_distances').insert({
          user_id: user.id,
          location_id: location.id,
          calculation_successful: false,
          calculation_attempts: 999,
          needs_recalculation: true,
          calculation_error: 'Max retries reached'
        });
        
        const result = await distanceCalculationService.retryFailedCalculations(1);
        
        // Should skip records with too many attempts
        expect(result.totalRetried).toBe(0);
      });

      test('should handle null/undefined values in distance calculations', async () => {
        const user = await createTestUser();
        const location = await createTestLocation();
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: null,
          longitude: undefined,
          full_address: 'Null Coords',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        await expect(distanceCalculationService.calculateUserLocationDistance(user.id, location.id))
          .rejects.toThrow('location data missing coordinates');
      });
    });

    describe('Resource Exhaustion Scenarios', () => {
      test('should handle memory pressure during large calculations', async () => {
        const userCount = 50;
        const locationCount = 20;
        
        const users = await Promise.all(
          Array.from({ length: userCount }, () => createTestUser())
        );
        const locations = await Promise.all(
          Array.from({ length: locationCount }, () => createTestLocation())
        );
        
        // Create user locations
        await knex('user_locations').insert(
          users.map(user => ({
            user_id: user.id,
            latitude: '51.0447',
            longitude: '-114.0719',
            full_address: 'Memory Test',
            city: 'Calgary',
            province: 'AB',
            country: 'Canada',
            geocoding_provider: 'test'
          }))
        );
        
        // Mock successful calculations
        calculateDistanceAndDriveTimeMock.mockResolvedValue({
          distance: '10 km',
          duration: '15 mins',
          distanceValue: 10000,
          durationValue: 900
        });
        
        // Mock delay to prevent overwhelming
        const originalDelay = distanceCalculationService.delay;
        distanceCalculationService.delay = jest.fn().mockResolvedValue();
        
        const initialMemory = process.memoryUsage().heapUsed;
        
        const result = await distanceCalculationService.initializeAllDistances();
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB
        
        expect(result.totalCalculations).toBe(userCount * locationCount);
        expect(memoryGrowth).toBeLessThan(200); // Should not grow by more than 200MB
        
        // Restore delay
        distanceCalculationService.delay = originalDelay;
      });

      test('should handle database connection pool exhaustion', async () => {
        const user = await createTestUser();
        const locations = await Promise.all(
          Array.from({ length: 100 }, () => createTestLocation())
        );
        
        await knex('user_locations').insert({
          user_id: user.id,
          latitude: '51.0447',
          longitude: '-114.0719',
          full_address: 'Pool Test',
          city: 'Calgary',
          province: 'AB',
          country: 'Canada',
          geocoding_provider: 'test'
        });
        
        calculateDistanceAndDriveTimeMock.mockResolvedValue({
          distance: '10 km',
          duration: '15 mins',
          distanceValue: 10000,
          durationValue: 900
        });
        
        // Execute many concurrent calculations
        const promises = locations.map(location =>
          distanceCalculationService.calculateUserLocationDistance(user.id, location.id)
        );
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled');
        
        // Should handle most requests successfully despite pool pressure
        expect(successful.length).toBeGreaterThan(90);
      });
    });
  });

  describe('Data Integrity and Consistency Edge Cases', () => {
    test('should maintain referential integrity during concurrent operations', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      await knex('user_locations').insert({
        user_id: user.id,
        latitude: '51.0447',
        longitude: '-114.0719',
        full_address: 'Integrity Test',
        city: 'Calgary',
        province: 'AB',
        country: 'Canada',
        geocoding_provider: 'test'
      });
      
      calculateDistanceAndDriveTimeMock.mockResolvedValue({
        distance: '10 km',
        duration: '15 mins',
        distanceValue: 10000,
        durationValue: 900
      });
      
      // Execute multiple concurrent operations
      const operations = [
        distanceCalculationService.calculateUserLocationDistance(user.id, location.id),
        distanceCalculationService.calculateUserLocationDistance(user.id, location.id),
        locationDataService.createOrUpdateUserLocation(user.id, 'Updated Address')
      ];
      
      addressServiceMock.searchAddresses.mockResolvedValue([{
        id: 'updated',
        displayName: 'Updated Address',
        city: 'Calgary',
        coordinates: { lat: 51.0447, lng: -114.0719 }
      }]);
      
      const results = await Promise.allSettled(operations);
      
      // All operations should complete
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
      
      // Database should be in consistent state
      const userLocation = await knex('user_locations').where('user_id', user.id).first();
      const distanceRecords = await knex('user_location_distances')
        .where('user_id', user.id)
        .where('location_id', location.id);
      
      expect(userLocation).toBeDefined();
      expect(distanceRecords.length).toBeGreaterThan(0);
    });

    test('should handle transaction rollback scenarios', async () => {
      const user = await createTestUser();
      
      // Mock address service to succeed first, then fail
      let callCount = 0;
      addressServiceMock.searchAddresses.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([{
            id: 'success-1',
            displayName: 'Success Address',
            city: 'Calgary',
            coordinates: { lat: 51.0447, lng: -114.0719 }
          }]);
        }
        return Promise.reject(new Error('Service failure'));
      });
      
      // First call should succeed
      const result1 = await locationDataService.createOrUpdateUserLocation(user.id, 'Address 1');
      expect(result1.full_address).toBe('Success Address');
      
      // Second call should fail but not affect existing data
      await expect(locationDataService.createOrUpdateUserLocation(user.id, 'Address 2'))
        .rejects.toThrow('Failed to process location data');
      
      // Original data should still exist
      const existingLocation = await knex('user_locations').where('user_id', user.id).first();
      expect(existingLocation.full_address).toBe('Success Address');
    });

    test('should handle cleanup of orphaned records', async () => {
      const user = await createTestUser();
      
      // Create location data
      await locationDataService.createOrUpdateUserLocation(user.id, 'Test Address');
      
      addressServiceMock.searchAddresses.mockResolvedValue([{
        id: 'test',
        displayName: 'Test Address',
        city: 'Calgary',
        coordinates: { lat: 51.0447, lng: -114.0719 }
      }]);
      
      const locationsBefore = await knex('user_locations').where('user_id', user.id);
      expect(locationsBefore).toHaveLength(1);
      
      // Delete user (simulating cascade scenario)
      await knex('users').where('id', user.id).del();
      
      // Location records should be orphaned but system should handle gracefully
      const orphanedLocations = await knex('user_locations').where('user_id', user.id);
      expect(orphanedLocations).toHaveLength(1);
      
      // System queries should handle orphaned records gracefully
      const result = await locationDataService.getUsersNeedingLocationData();
      expect(result).not.toContainEqual(
        expect.objectContaining({ userId: user.id })
      );
    });
  });

  describe('System Boundary and Limit Testing', () => {
    test('should handle maximum database field lengths', async () => {
      const user = await createTestUser();
      const maxLengthAddress = 'A'.repeat(65535); // Maximum text field length
      
      addressServiceMock.searchAddresses.mockResolvedValueOnce([{
        id: 'max-length',
        displayName: maxLengthAddress,
        city: 'Calgary',
        province: 'AB',
        coordinates: { lat: 51.0447, lng: -114.0719 }
      }]);
      
      // Should handle without truncation error
      const result = await locationDataService.createOrUpdateUserLocation(user.id, maxLengthAddress);
      expect(result.full_address).toBe(maxLengthAddress);
    });

    test('should handle timezone edge cases in timestamps', async () => {
      const user = await createTestUser();
      const location = await createTestLocation();
      
      await knex('user_locations').insert({
        user_id: user.id,
        latitude: '51.0447',
        longitude: '-114.0719',
        full_address: 'Timezone Test',
        city: 'Calgary',
        province: 'AB',
        country: 'Canada',
        geocoding_provider: 'test'
      });
      
      calculateDistanceAndDriveTimeMock.mockResolvedValue({
        distance: '10 km',
        duration: '15 mins',
        distanceValue: 10000,
        durationValue: 900
      });
      
      // Mock system time to edge of day/month/year
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super('2023-12-31T23:59:59.999Z'); // End of year
        }
      };
      
      const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
      
      expect(result).toBeDefined();
      expect(result.calculated_at).toBeDefined();
      
      // Restore Date
      global.Date = originalDate;
    });

    test('should handle floating point precision edge cases', async () => {
      const user = await createTestUser();
      const location = await createTestLocation({
        latitude: 51.04471111111111111111, // Precision that might cause rounding
        longitude: -114.071944444444444444
      });
      
      await knex('user_locations').insert({
        user_id: user.id,
        latitude: '51.04472222222222222222',
        longitude: '-114.071955555555555555',
        full_address: 'Precision Test',
        city: 'Calgary',
        province: 'AB',
        country: 'Canada',
        geocoding_provider: 'test'
      });
      
      calculateDistanceAndDriveTimeMock.mockResolvedValue({
        distance: '0.001 km',
        duration: '0.1 mins',
        distanceValue: 1.2345678901234567890,
        durationValue: 6.9876543210987654321
      });
      
      const result = await distanceCalculationService.calculateUserLocationDistance(user.id, location.id);
      
      // Should handle floating point precision gracefully
      expect(typeof result.distance_meters).toBe('number');
      expect(typeof result.drive_time_seconds).toBe('number');
    });
  });
});