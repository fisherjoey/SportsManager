const LocationDataService = require('../../src/services/LocationDataService');
const DistanceCalculationService = require('../../src/services/DistanceCalculationService');
const knex = require('../../src/config/database');

// Mock external dependencies for performance testing
jest.mock('../../../lib/address-service', () => ({
  createAddressService: jest.fn(() => ({
    searchAddresses: jest.fn()
  }))
}));

jest.mock('../../../lib/maps', () => ({
  geocodeAddress: jest.fn(),
  calculateDistanceAndDriveTime: jest.fn()
}));

describe('Location Services Performance Tests', () => {
  let locationDataService;
  let distanceCalculationService;
  let addressServiceMock;
  let geocodeAddressMock;
  let calculateDistanceAndDriveTimeMock;
  let testUsers = [];
  let testLocations = [];

  // Performance test configuration
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_LOCATION_CREATION: 1000, // ms
    BATCH_LOCATION_CREATION_PER_ITEM: 200, // ms per item
    SINGLE_DISTANCE_CALCULATION: 2000, // ms
    BATCH_DISTANCE_CALCULATION_PER_ITEM: 1500, // ms per item
    DATABASE_QUERY_RESPONSE: 100, // ms
    MEMORY_USAGE_THRESHOLD: 100, // MB
    CONCURRENT_OPERATIONS: 50 // max concurrent operations
  };

  beforeAll(async () => {
    locationDataService = new LocationDataService();
    distanceCalculationService = new DistanceCalculationService();
    
    // Get mocked dependencies
    const { createAddressService } = require('../../../lib/address-service');
    const { geocodeAddress, calculateDistanceAndDriveTime } = require('../../../lib/maps');
    
    addressServiceMock = createAddressService();
    geocodeAddressMock = geocodeAddress;
    calculateDistanceAndDriveTimeMock = calculateDistanceAndDriveTime;
    
    // Set up fast mock responses for performance testing
    addressServiceMock.searchAddresses.mockResolvedValue([{
      id: 'mock-1',
      displayName: 'Mock Address, Calgary, AB T2P 1M1, Canada',
      streetNumber: '123',
      streetName: 'Mock St',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1M1',
      country: 'Canada',
      coordinates: { lat: 51.0447, lng: -114.0719 },
      confidence: 0.95,
      type: 'street_address'
    }]);
    
    geocodeAddressMock.mockResolvedValue({
      lat: 51.0447,
      lng: -114.0719
    });
    
    calculateDistanceAndDriveTimeMock.mockResolvedValue({
      distance: '15.2 km',
      duration: '18 mins',
      distanceValue: 15200,
      durationValue: 1080
    });
  });

  beforeEach(async () => {
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('locations').where('name', 'like', 'Perf Test%').del();
    await knex('users').where('email', 'like', 'perf-test-%').del();
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
  const createTestUsers = async (count) => {
    const users = [];
    const batchSize = 100;
    
    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, count - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        batch.push({
          email: `perf-test-user-${i + j}@example.com`,
          password_hash: 'test-hash',
          role: 'referee',
          name: `Perf Test User ${i + j}`,
          postal_code: 'T2P 1M1'
        });
      }
      
      const batchUsers = await knex('users').insert(batch).returning('*');
      users.push(...batchUsers);
    }
    
    testUsers.push(...users);
    return users;
  };

  const createTestLocations = async (count) => {
    const locations = [];
    const batchSize = 100;
    
    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, count - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        batch.push({
          name: `Perf Test Arena ${i + j}`,
          address: `${i + j} Test St`,
          city: 'Calgary',
          province: 'AB',
          postal_code: 'T2P 2M2',
          country: 'Canada',
          latitude: 51.0550 + (Math.random() - 0.5) * 0.1,
          longitude: -114.0850 + (Math.random() - 0.5) * 0.1,
          is_active: true
        });
      }
      
      const batchLocations = await knex('locations').insert(batch).returning('*');
      locations.push(...batchLocations);
    }
    
    testLocations.push(...locations);
    return locations;
  };

  const measurePerformance = async (operation, label) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    const result = await operation();
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
    const memoryDelta = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB
    
    console.log(`${label}:`);
    console.log(`  Execution time: ${executionTime.toFixed(2)}ms`);
    console.log(`  Memory delta: ${memoryDelta.toFixed(2)}MB`);
    console.log(`  Final heap used: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    return {
      result,
      executionTime,
      memoryDelta,
      finalHeapUsed: endMemory.heapUsed / 1024 / 1024
    };
  };

  describe('LocationDataService Performance', () => {
    test('should create single user location within performance threshold', async () => {
      const user = await createTestUsers(1);
      
      const { executionTime } = await measurePerformance(
        () => locationDataService.createOrUpdateUserLocation(user[0].id, 'T2P 1M1, Calgary, AB'),
        'Single Location Creation'
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_LOCATION_CREATION);
    });

    test('should handle batch location creation efficiently', async () => {
      const userCount = 50;
      const users = await createTestUsers(userCount);
      const userAddresses = users.map(user => ({
        userId: user.id,
        address: `${user.postal_code}, Calgary, AB`
      }));
      
      const { executionTime, result } = await measurePerformance(
        () => locationDataService.batchCreateUserLocations(userAddresses),
        `Batch Location Creation (${userCount} users)`
      );
      
      const avgTimePerItem = executionTime / userCount;
      expect(avgTimePerItem).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_LOCATION_CREATION_PER_ITEM);
      expect(result.successful).toHaveLength(userCount);
    });

    test('should scale batch location creation linearly', async () => {
      const smallBatch = 10;
      const largeBatch = 50;
      
      // Test small batch
      const smallUsers = await createTestUsers(smallBatch);
      const smallAddresses = smallUsers.map(user => ({
        userId: user.id,
        address: `${user.postal_code}, Calgary, AB`
      }));
      
      const { executionTime: smallTime } = await measurePerformance(
        () => locationDataService.batchCreateUserLocations(smallAddresses),
        `Small Batch (${smallBatch} users)`
      );
      
      // Clean up for large batch
      await knex('user_locations').whereIn('user_id', smallUsers.map(u => u.id)).del();
      
      // Test large batch
      const largeUsers = await createTestUsers(largeBatch);
      const largeAddresses = largeUsers.map(user => ({
        userId: user.id,
        address: `${user.postal_code}, Calgary, AB`
      }));
      
      const { executionTime: largeTime } = await measurePerformance(
        () => locationDataService.batchCreateUserLocations(largeAddresses),
        `Large Batch (${largeBatch} users)`
      );
      
      // Check if scaling is roughly linear (allowing 20% variance for overhead)
      const scalingFactor = largeTime / smallTime;
      const expectedScaling = largeBatch / smallBatch;
      const scalingEfficiency = scalingFactor / expectedScaling;
      
      console.log(`Scaling efficiency: ${(scalingEfficiency * 100).toFixed(1)}%`);
      expect(scalingEfficiency).toBeLessThan(1.5); // Should not be more than 50% overhead
    });

    test('should handle concurrent location creation requests', async () => {
      const concurrentRequests = 20;
      const users = await createTestUsers(concurrentRequests);
      
      const { executionTime, result } = await measurePerformance(
        () => Promise.all(
          users.map(user => 
            locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
          )
        ),
        `Concurrent Location Creation (${concurrentRequests} requests)`
      );
      
      expect(result).toHaveLength(concurrentRequests);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_LOCATION_CREATION * 2);
    });

    test('should maintain performance with large existing dataset', async () => {
      // Create background data
      const backgroundUsers = await createTestUsers(100);
      await Promise.all(
        backgroundUsers.map(user =>
          locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
        )
      );
      
      // Test performance with existing data
      const newUser = await createTestUsers(1);
      
      const { executionTime } = await measurePerformance(
        () => locationDataService.createOrUpdateUserLocation(newUser[0].id, 'T2P 1M1, Calgary, AB'),
        'Location Creation with Large Dataset'
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_LOCATION_CREATION);
    });

    test('should efficiently query users needing location data', async () => {
      const userCount = 200;
      const users = await createTestUsers(userCount);
      
      // Create location data for half the users
      const halfPoint = Math.floor(userCount / 2);
      await Promise.all(
        users.slice(0, halfPoint).map(user =>
          locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
        )
      );
      
      const { executionTime, result } = await measurePerformance(
        () => locationDataService.getUsersNeedingLocationData(),
        `Query Users Needing Location Data (${userCount} total users)`
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_RESPONSE);
      expect(result).toHaveLength(halfPoint);
    });
  });

  describe('DistanceCalculationService Performance', () => {
    test('should calculate single distance within performance threshold', async () => {
      const user = await createTestUsers(1);
      const location = await createTestLocations(1);
      
      // Create user location first
      await locationDataService.createOrUpdateUserLocation(user[0].id, 'T2P 1M1, Calgary, AB');
      
      const { executionTime } = await measurePerformance(
        () => distanceCalculationService.calculateUserLocationDistance(user[0].id, location[0].id),
        'Single Distance Calculation'
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_DISTANCE_CALCULATION);
    });

    test('should handle batch distance calculations efficiently', async () => {
      const userCount = 20;
      const locationCount = 10;
      
      const users = await createTestUsers(userCount);
      const locations = await createTestLocations(locationCount);
      
      // Create user locations
      await Promise.all(
        users.map(user =>
          locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
        )
      );
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.calculateUserDistancesToAllLocations(users[0].id),
        `User Distance Calculation to All Locations (${locationCount} locations)`
      );
      
      const avgTimePerLocation = executionTime / locationCount;
      expect(avgTimePerLocation).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_DISTANCE_CALCULATION_PER_ITEM);
      expect(result.successful).toHaveLength(locationCount);
    });

    test('should handle reverse batch calculation efficiently', async () => {
      const userCount = 20;
      const users = await createTestUsers(userCount);
      const location = await createTestLocations(1);
      
      // Create user locations
      await Promise.all(
        users.map(user =>
          locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
        )
      );
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.calculateAllUsersDistanceToLocation(location[0].id),
        `All Users Distance Calculation to Location (${userCount} users)`
      );
      
      const avgTimePerUser = executionTime / userCount;
      expect(avgTimePerUser).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_DISTANCE_CALCULATION_PER_ITEM);
      expect(result.successful).toHaveLength(userCount);
    });

    test('should maintain consistent performance with rate limiting', async () => {
      const user = await createTestUsers(1);
      const locations = await createTestLocations(5);
      
      await locationDataService.createOrUpdateUserLocation(user[0].id, 'T2P 1M1, Calgary, AB');
      
      // Mock delay to simulate rate limiting
      const originalDelay = distanceCalculationService.delay;
      let delayCallCount = 0;
      distanceCalculationService.delay = jest.fn().mockImplementation((ms) => {
        delayCallCount++;
        return new Promise(resolve => setTimeout(resolve, 10)); // Faster for testing
      });
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.calculateUserDistancesToAllLocations(user[0].id),
        'Distance Calculation with Rate Limiting'
      );
      
      expect(result.successful).toHaveLength(5);
      expect(delayCallCount).toBe(5); // Should delay after each calculation
      
      // Should include rate limiting delays
      expect(executionTime).toBeGreaterThan(40); // 5 * 10ms delays
      
      // Restore original delay
      distanceCalculationService.delay = originalDelay;
    });

    test('should efficiently query user distances with filters', async () => {
      const user = await createTestUsers(1);
      const locations = await createTestLocations(50);
      
      // Create distance records
      await knex('user_location_distances').insert(
        locations.map((location, index) => ({
          user_id: user[0].id,
          location_id: location.id,
          distance_meters: 5000 + (index * 1000),
          drive_time_minutes: 10 + index,
          calculation_successful: true
        }))
      );
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.getUserDistances(user[0].id, {
          maxDriveTimeMinutes: 30,
          maxDistanceMeters: 25000
        }),
        'Filtered Distance Query (50 records)'
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_RESPONSE);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(50);
    });

    test('should handle failed calculation retry efficiently', async () => {
      const userCount = 10;
      const locationCount = 5;
      
      const users = await createTestUsers(userCount);
      const locations = await createTestLocations(locationCount);
      
      // Create failed calculation records
      const failedRecords = [];
      for (const user of users) {
        for (const location of locations) {
          failedRecords.push({
            user_id: user.id,
            location_id: location.id,
            calculation_successful: false,
            calculation_attempts: 1,
            needs_recalculation: true,
            calculation_error: 'Test failure'
          });
        }
      }
      
      await knex('user_location_distances').insert(failedRecords);
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.retryFailedCalculations(25),
        `Retry Failed Calculations (${failedRecords.length} records)`
      );
      
      expect(result.successful).toHaveLength(25);
      
      const avgTimePerRetry = executionTime / 25;
      expect(avgTimePerRetry).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_DISTANCE_CALCULATION_PER_ITEM);
    });

    test('should efficiently calculate statistics', async () => {
      const recordCount = 500;
      const users = await createTestUsers(10);
      const locations = await createTestLocations(10);
      
      // Create various calculation records
      const records = [];
      for (let i = 0; i < recordCount; i++) {
        records.push({
          user_id: users[i % users.length].id,
          location_id: locations[i % locations.length].id,
          distance_meters: 5000 + (Math.random() * 20000),
          drive_time_minutes: 10 + Math.floor(Math.random() * 40),
          calculation_successful: Math.random() > 0.1, // 90% success rate
          needs_recalculation: Math.random() > 0.8 // 20% need recalculation
        });
      }
      
      await knex('user_location_distances').insert(records);
      
      const { executionTime, result } = await measurePerformance(
        () => distanceCalculationService.getCalculationStats(),
        `Calculate Statistics (${recordCount} records)`
      );
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_RESPONSE);
      expect(result.totalCalculations).toBe(recordCount);
      expect(result.averageDistanceMeters).toBeGreaterThan(0);
    });
  });

  describe('Memory Management and Resource Usage', () => {
    test('should maintain reasonable memory usage during large operations', async () => {
      const largeUserCount = 100;
      const users = await createTestUsers(largeUserCount);
      const userAddresses = users.map(user => ({
        userId: user.id,
        address: `${user.postal_code}, Calgary, AB`
      }));
      
      const { memoryDelta, finalHeapUsed } = await measurePerformance(
        () => locationDataService.batchCreateUserLocations(userAddresses),
        'Large Batch Memory Usage'
      );
      
      expect(finalHeapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_THRESHOLD);
      console.log(`Memory efficiency: ${(memoryDelta / largeUserCount).toFixed(2)}MB per user`);
    });

    test('should handle memory cleanup after batch operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform several batch operations
      for (let i = 0; i < 5; i++) {
        const users = await createTestUsers(20);
        const userAddresses = users.map(user => ({
          userId: user.id,
          address: `${user.postal_code}, Calgary, AB`
        }));
        
        await locationDataService.batchCreateUserLocations(userAddresses);
        
        // Clean up immediately
        await knex('user_locations').whereIn('user_id', users.map(u => u.id)).del();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;
      
      console.log(`Memory growth after cleanup: ${memoryGrowth.toFixed(2)}MB`);
      expect(memoryGrowth).toBeLessThan(50); // Should not grow by more than 50MB
    });

    test('should handle database connection pooling efficiently', async () => {
      const concurrentOperations = 20;
      const users = await createTestUsers(concurrentOperations);
      
      const { executionTime } = await measurePerformance(
        () => Promise.all(
          users.map(user => knex('users').where('id', user.id).first())
        ),
        `Concurrent Database Queries (${concurrentOperations} queries)`
      );
      
      // Should handle concurrent queries efficiently
      const avgTimePerQuery = executionTime / concurrentOperations;
      expect(avgTimePerQuery).toBeLessThan(50); // 50ms per query
    });
  });

  describe('Stress Testing and Load Limits', () => {
    test('should handle maximum concurrent location creation', async () => {
      const maxConcurrent = PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS;
      const users = await createTestUsers(maxConcurrent);
      
      const startTime = Date.now();
      const promises = users.map(user =>
        locationDataService.createOrUpdateUserLocation(user.id, 'T2P 1M1, Calgary, AB')
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(maxConcurrent);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Handled ${maxConcurrent} concurrent operations in ${endTime - startTime}ms`);
    });

    test('should degrade gracefully under extreme load', async () => {
      const extremeLoad = 100;
      const users = await createTestUsers(extremeLoad);
      
      // Add artificial delay to simulate slow external API
      addressServiceMock.searchAddresses.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{
          id: 'mock-1',
          displayName: 'Mock Address',
          city: 'Calgary',
          province: 'AB',
          postalCode: 'T2P 1M1',
          coordinates: { lat: 51.0447, lng: -114.0719 }
        }]), 100))
      );
      
      const { executionTime, result } = await measurePerformance(
        () => locationDataService.batchCreateUserLocations(
          users.map(user => ({ userId: user.id, address: 'T2P 1M1' }))
        ),
        `Extreme Load Test (${extremeLoad} users with 100ms delay)`
      );
      
      // Should complete even under stress (allowing for delays)
      expect(result.successful.length + result.failed.length).toBe(extremeLoad);
      
      const avgTimePerUser = executionTime / extremeLoad;
      console.log(`Average time per user under load: ${avgTimePerUser.toFixed(2)}ms`);
      
      // Reset mock
      addressServiceMock.searchAddresses.mockResolvedValue([{
        id: 'mock-1',
        displayName: 'Mock Address',
        city: 'Calgary',
        province: 'AB',
        postalCode: 'T2P 1M1',
        coordinates: { lat: 51.0447, lng: -114.0719 }
      }]);
    });

    test('should maintain database integrity under concurrent writes', async () => {
      const users = await createTestUsers(50);
      
      // Attempt to create the same location data concurrently for same user
      const sameUserOperations = Array(10).fill().map(() =>
        locationDataService.createOrUpdateUserLocation(users[0].id, 'T2P 1M1, Calgary, AB')
      );
      
      const results = await Promise.allSettled(sameUserOperations);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(0);
      
      // Verify only one location record exists
      const locationRecords = await knex('user_locations').where('user_id', users[0].id);
      expect(locationRecords).toHaveLength(1);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should benchmark baseline performance', async () => {
      const baselineTests = [
        {
          name: 'Single Location Creation',
          operation: async () => {
            const user = await createTestUsers(1);
            return locationDataService.createOrUpdateUserLocation(user[0].id, 'T2P 1M1, Calgary, AB');
          },
          threshold: PERFORMANCE_THRESHOLDS.SINGLE_LOCATION_CREATION
        },
        {
          name: 'Single Distance Calculation',
          operation: async () => {
            const user = await createTestUsers(1);
            const location = await createTestLocations(1);
            await locationDataService.createOrUpdateUserLocation(user[0].id, 'T2P 1M1, Calgary, AB');
            return distanceCalculationService.calculateUserLocationDistance(user[0].id, location[0].id);
          },
          threshold: PERFORMANCE_THRESHOLDS.SINGLE_DISTANCE_CALCULATION
        },
        {
          name: 'Database Query Response',
          operation: async () => {
            return knex('users').where('role', 'referee').limit(100);
          },
          threshold: PERFORMANCE_THRESHOLDS.DATABASE_QUERY_RESPONSE
        }
      ];
      
      const results = [];
      
      for (const test of baselineTests) {
        const { executionTime } = await measurePerformance(
          test.operation,
          `Baseline: ${test.name}`
        );
        
        const passed = executionTime < test.threshold;
        results.push({
          name: test.name,
          executionTime,
          threshold: test.threshold,
          passed
        });
        
        expect(passed).toBe(true);
        
        // Clean up between tests
        await knex('user_location_distances').del();
        await knex('user_locations').del();
        await knex('locations').where('name', 'like', 'Perf Test%').del();
        await knex('users').where('email', 'like', 'perf-test-%').del();
        testUsers = [];
        testLocations = [];
      }
      
      console.log('\n=== PERFORMANCE BASELINE RESULTS ===');
      results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${result.name}: ${result.executionTime.toFixed(2)}ms (threshold: ${result.threshold}ms) ${status}`);
      });
    });
  });
});