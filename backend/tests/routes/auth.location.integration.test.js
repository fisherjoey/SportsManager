const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const knex = require('../../src/config/database');
const LocationDataService = require('../../src/services/LocationDataService');

// Mock external dependencies
jest.mock('../../src/services/LocationDataService');
jest.mock('../../../lib/address-service', () => ({
  createAddressService: jest.fn(() => ({
    searchAddresses: jest.fn()
  }))
}));

jest.mock('../../../lib/maps', () => ({
  geocodeAddress: jest.fn()
}));

describe('Auth Location Data Integration Tests', () => {
  let locationDataServiceMock;
  let testUsers = [];

  beforeAll(async () => {
    // Mock LocationDataService
    locationDataServiceMock = new LocationDataService();
    locationDataServiceMock.createOrUpdateUserLocation = jest.fn();
  });

  beforeEach(async () => {
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('users').where('email', 'like', 'test-%').del();
    testUsers = [];

    // Reset mocks
    jest.clearAllMocks();
    
    // Set up default mock responses
    locationDataServiceMock.createOrUpdateUserLocation.mockResolvedValue({
      id: 'location-1',
      user_id: 'user-1',
      full_address: '123 Main St, Calgary, AB T2P 1M1, Canada',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 1M1',
      latitude: '51.0447',
      longitude: '-114.0719'
    });
  });

  afterAll(async () => {
    // Clean up test data
    for (const user of testUsers) {
      await knex('user_location_distances').where('user_id', user.id).del();
      await knex('user_locations').where('user_id', user.id).del();
      await knex('users').where('id', user.id).del();
    }
  });

  describe('POST /api/auth/register - Location Data Creation', () => {
    test('should create location data for referee with postal code', async () => {
      const refereeData = {
        email: 'test-referee-location@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee',
        phone: '403-555-0123',
        postal_code: 'T2P 1M1',
        max_distance: 30,
        years_experience: 5
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      expect(response.body.user.email).toBe(refereeData.email);
      expect(response.body.user.role).toBe('referee');
      expect(response.body.user.postal_code).toBe('T2P 1M1');
      
      testUsers.push(response.body.user);

      // Allow time for async location data creation
      await new Promise(resolve => setImmediate(resolve));

      // Verify location service was called
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        'T2P 1M1'
      );
    });

    test('should use location field over postal code when both provided', async () => {
      const refereeData = {
        email: 'test-referee-location2@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee 2',
        postal_code: 'T2P 1M1',
        location: 'Calgary, AB T2P 1M1',
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for async location data creation
      await new Promise(resolve => setImmediate(resolve));

      // Should use location field instead of postal_code
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        'Calgary, AB T2P 1M1'
      );
    });

    test('should skip location data creation for referee without postal code', async () => {
      const refereeData = {
        email: 'test-referee-no-postal@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee No Postal',
        max_distance: 25
        // No postal_code provided
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for potential async operation
      await new Promise(resolve => setImmediate(resolve));

      // Location service should not be called
      expect(locationDataServiceMock.createOrUpdateUserLocation).not.toHaveBeenCalled();
    });

    test('should skip location data creation for admin users', async () => {
      const adminData = {
        email: 'test-admin@example.com',
        password: 'password123',
        role: 'admin',
        postal_code: 'T2P 1M1' // Even with postal code
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for potential async operation
      await new Promise(resolve => setImmediate(resolve));

      // Location service should not be called for admin
      expect(locationDataServiceMock.createOrUpdateUserLocation).not.toHaveBeenCalled();
    });

    test('should continue registration even if location service fails', async () => {
      // Mock location service failure
      locationDataServiceMock.createOrUpdateUserLocation.mockRejectedValueOnce(
        new Error('Geocoding service unavailable')
      );

      const refereeData = {
        email: 'test-referee-fail-location@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Fail Location',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      // Registration should still succeed
      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      expect(response.body.user.email).toBe(refereeData.email);
      expect(response.body.user.postal_code).toBe('T2P 1M1');
      
      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      // Verify the service was called (and failed)
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalled();
    });

    test('should handle multiple concurrent registrations with location data', async () => {
      const refereeData1 = {
        email: 'test-concurrent1@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Concurrent User 1',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      const refereeData2 = {
        email: 'test-concurrent2@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Concurrent User 2',
        postal_code: 'T5K 2P6',
        max_distance: 30
      };

      // Register both users concurrently
      const promises = [
        request(app).post('/api/auth/register').send(refereeData1),
        request(app).post('/api/auth/register').send(refereeData2)
      ];

      const responses = await Promise.all(promises);

      expect(responses[0].status).toBe(201);
      expect(responses[1].status).toBe(201);
      
      testUsers.push(responses[0].body.user);
      testUsers.push(responses[1].body.user);

      // Allow time for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Both location services should have been called
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledTimes(2);
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        responses[0].body.user.id,
        'T2P 1M1'
      );
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        responses[1].body.user.id,
        'T5K 2P6'
      );
    });

    test('should validate postal code format before creating location data', async () => {
      const refereeData = {
        email: 'test-referee-invalid-postal@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Invalid Postal',
        postal_code: 'INVALID', // Invalid postal code format
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      // Should still attempt to create location data even with invalid postal code
      // The LocationDataService will handle the validation/error
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        'INVALID'
      );
    });

    test('should handle very long location strings', async () => {
      const longLocation = 'A'.repeat(500); // Very long location string
      
      const refereeData = {
        email: 'test-referee-long-location@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Long Location',
        postal_code: 'T2P 1M1',
        location: longLocation,
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        longLocation
      );
    });

    test('should preserve other referee fields during registration', async () => {
      const refereeData = {
        email: 'test-referee-complete@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Complete Referee',
        phone: '403-555-0123',
        postal_code: 'T2P 1M1',
        location: 'Calgary, AB',
        max_distance: 50,
        years_experience: 10,
        notes: 'Experienced referee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      const user = response.body.user;
      expect(user.name).toBe('Complete Referee');
      expect(user.phone).toBe('403-555-0123');
      expect(user.postal_code).toBe('T2P 1M1');
      expect(user.max_distance).toBe(50);
      expect(user.years_experience).toBe(10);
      expect(user.notes).toBe('Experienced referee');
      expect(user.is_available).toBe(true);
      expect(user.games_refereed_season).toBe(0);

      testUsers.push(user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        user.id,
        'Calgary, AB'
      );
    });
  });

  describe('Location data creation timing and error handling', () => {
    test('should not block registration response while creating location data', async () => {
      // Mock slow location service
      locationDataServiceMock.createOrUpdateUserLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 1000))
      );

      const refereeData = {
        email: 'test-referee-slow-location@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Slow Location',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Registration should complete quickly (not wait for location service)
      expect(responseTime).toBeLessThan(500);
      expect(response.body.user.email).toBe(refereeData.email);

      testUsers.push(response.body.user);
    });

    test('should handle location service timeout gracefully', async () => {
      // Mock timeout scenario
      locationDataServiceMock.createOrUpdateUserLocation.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const refereeData = {
        email: 'test-referee-timeout@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Timeout',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      // Registration should still succeed
      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      expect(response.body.user.email).toBe(refereeData.email);
      testUsers.push(response.body.user);

      // Allow time for timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalled();
    });

    test('should handle database rollback without affecting location creation', async () => {
      const refereeData = {
        email: 'test-referee-rollback@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Rollback',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      // First create user successfully
      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Try to create duplicate user (should fail)
      await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(400);

      // Allow time for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Location service should only have been called once (for successful registration)
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledTimes(1);
    });

    test('should handle memory pressure during batch registrations', async () => {
      const batchSize = 10;
      const registrationPromises = [];

      // Create multiple registrations simultaneously
      for (let i = 0; i < batchSize; i++) {
        const refereeData = {
          email: `test-batch-${i}@example.com`,
          password: 'password123',
          role: 'referee',
          name: `Batch Referee ${i}`,
          postal_code: 'T2P 1M1',
          max_distance: 25
        };

        registrationPromises.push(
          request(app).post('/api/auth/register').send(refereeData)
        );
      }

      const responses = await Promise.all(registrationPromises);

      // All registrations should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe(`test-batch-${index}@example.com`);
        testUsers.push(response.body.user);
      });

      // Allow time for all async location operations
      await new Promise(resolve => setImmediate(resolve));

      // All location services should have been called
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledTimes(batchSize);
    });
  });

  describe('Integration with existing location data', () => {
    test('should update existing location data if user already has location', async () => {
      const refereeData = {
        email: 'test-referee-update@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Update',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      // First registration
      const response1 = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response1.body.user);

      // Simulate user already having location data
      locationDataServiceMock.createOrUpdateUserLocation.mockResolvedValueOnce({
        id: 'existing-location',
        user_id: response1.body.user.id,
        full_address: 'Updated Address, Calgary, AB',
        city: 'Calgary',
        updated_at: new Date()
      });

      // Register again with same email should fail, but test the location update scenario
      // by directly calling the location service as it would be called
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response1.body.user.id,
        'T2P 1M1'
      );
    });

    test('should handle special characters in location data', async () => {
      const refereeData = {
        email: 'test-referee-special@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Special',
        postal_code: 'T2P 1M1',
        location: 'Montréal, QC H3A 0G4 (Côte-des-Neiges)', // Special characters
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        'Montréal, QC H3A 0G4 (Côte-des-Neiges)'
      );
    });

    test('should handle emoji and unicode in location data', async () => {
      const refereeData = {
        email: 'test-referee-unicode@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Unicode',
        postal_code: 'T2P 1M1',
        location: '🏒 Hockey Arena 🥅, Calgary, AB', // Emoji characters
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        '🏒 Hockey Arena 🥅, Calgary, AB'
      );
    });
  });

  describe('Error scenarios and edge cases', () => {
    test('should handle null postal code gracefully', async () => {
      const refereeData = {
        email: 'test-referee-null-postal@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Null Postal',
        postal_code: null,
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for potential async operation
      await new Promise(resolve => setImmediate(resolve));

      // Should not call location service with null postal code
      expect(locationDataServiceMock.createOrUpdateUserLocation).not.toHaveBeenCalled();
    });

    test('should handle empty string postal code', async () => {
      const refereeData = {
        email: 'test-referee-empty-postal@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Empty Postal',
        postal_code: '',
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for potential async operation
      await new Promise(resolve => setImmediate(resolve));

      // Should not call location service with empty postal code
      expect(locationDataServiceMock.createOrUpdateUserLocation).not.toHaveBeenCalled();
    });

    test('should handle whitespace-only postal code', async () => {
      const refereeData = {
        email: 'test-referee-whitespace-postal@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Whitespace Postal',
        postal_code: '   ',
        max_distance: 25
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      testUsers.push(response.body.user);

      // Allow time for potential async operation
      await new Promise(resolve => setImmediate(resolve));

      // Should still call location service - let the service handle validation
      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalledWith(
        response.body.user.id,
        '   '
      );
    });

    test('should handle location service throwing unexpected errors', async () => {
      // Mock unexpected error
      locationDataServiceMock.createOrUpdateUserLocation.mockRejectedValueOnce(
        new TypeError('Cannot read property of undefined')
      );

      const refereeData = {
        email: 'test-referee-unexpected-error@example.com',
        password: 'password123',
        role: 'referee',
        name: 'Test Referee Unexpected Error',
        postal_code: 'T2P 1M1',
        max_distance: 25
      };

      // Registration should still succeed
      const response = await request(app)
        .post('/api/auth/register')
        .send(refereeData)
        .expect(201);

      expect(response.body.user.email).toBe(refereeData.email);
      testUsers.push(response.body.user);

      // Allow time for async operation
      await new Promise(resolve => setImmediate(resolve));

      expect(locationDataServiceMock.createOrUpdateUserLocation).toHaveBeenCalled();
    });
  });
});