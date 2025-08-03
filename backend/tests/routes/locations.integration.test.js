const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const knex = require('../../src/config/database');
const DistanceCalculationService = require('../../src/services/DistanceCalculationService');

// Mock external dependencies
jest.mock('../../src/services/DistanceCalculationService');
jest.mock('../../../lib/maps', () => ({
  calculateDistanceAndDriveTime: jest.fn()
}));

describe('Locations API Integration Tests', () => {
  let adminToken;
  let refereeToken;
  let adminUser;
  let refereeUser;
  let testLocations = [];
  let distanceServiceMock;

  beforeAll(async () => {
    // Create test users
    const passwordHash = await bcrypt.hash('password123', 12);
    
    [adminUser] = await knex('users').insert({
      email: 'admin@test.com',
      password_hash: passwordHash,
      role: 'admin',
      name: 'Admin User'
    }).returning('*');

    [refereeUser] = await knex('users').insert({
      email: 'referee@test.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'Referee User',
      postal_code: 'T2P 1M1'
    }).returning('*');

    // Generate JWT tokens
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    refereeToken = jwt.sign(
      { userId: refereeUser.id, email: refereeUser.email, role: 'referee' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock DistanceCalculationService
    distanceServiceMock = new DistanceCalculationService();
    distanceServiceMock.calculateAllUsersDistanceToLocation = jest.fn().mockResolvedValue({
      successful: [],
      failed: [],
      totalUsers: 0
    });
    distanceServiceMock.calculateUserDistancesToAllLocations = jest.fn().mockResolvedValue({
      successful: [],
      failed: [],
      totalLocations: 0
    });
    distanceServiceMock.getUserDistances = jest.fn().mockResolvedValue([]);
    distanceServiceMock.getCalculationStats = jest.fn().mockResolvedValue({
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      needRecalculation: 0,
      averageDistanceMeters: 0,
      averageDriveTimeMinutes: 0
    });
    distanceServiceMock.retryFailedCalculations = jest.fn().mockResolvedValue({
      successful: [],
      failed: [],
      totalRetried: 0
    });
    distanceServiceMock.initializeAllDistances = jest.fn().mockResolvedValue({
      totalUsers: 0,
      totalLocations: 0,
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0
    });
  });

  beforeEach(async () => {
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('games').where('location_id', 'in', testLocations.map(l => l.id)).del();
    await knex('locations').where('name', 'like', 'Test%').del();
    testLocations = [];
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up all test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('games').where('location_id', 'in', testLocations.map(l => l.id)).del();
    await knex('locations').where('name', 'like', 'Test%').del();
    await knex('users').whereIn('id', [adminUser.id, refereeUser.id]).del();
  });

  /**
   * Helper function to create test location
   */
  const createTestLocation = async (overrides = {}) => {
    const locationData = {
      name: `Test Arena ${Date.now()}`,
      address: '123 Test St',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 1M1',
      country: 'Canada',
      latitude: 51.0447,
      longitude: -114.0719,
      is_active: true,
      ...overrides
    };

    const [location] = await knex('locations').insert(locationData).returning('*');
    testLocations.push(location);
    return location;
  };

  describe('GET /api/locations', () => {
    test('should return all active locations for authenticated user', async () => {
      const location1 = await createTestLocation({ name: 'Test Arena 1' });
      const location2 = await createTestLocation({ name: 'Test Arena 2' });
      await createTestLocation({ name: 'Inactive Arena', is_active: false });

      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map(l => l.name)).toContain('Test Arena 1');
      expect(response.body.map(l => l.name)).toContain('Test Arena 2');
      expect(response.body.map(l => l.name)).not.toContain('Inactive Arena');
    });

    test('should filter locations by search query', async () => {
      await createTestLocation({ name: 'Calgary Arena', city: 'Calgary' });
      await createTestLocation({ name: 'Edmonton Arena', city: 'Edmonton' });

      const response = await request(app)
        .get('/api/locations?search=Calgary')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Calgary Arena');
    });

    test('should filter locations by city', async () => {
      await createTestLocation({ name: 'Arena 1', city: 'Calgary' });
      await createTestLocation({ name: 'Arena 2', city: 'Edmonton' });

      const response = await request(app)
        .get('/api/locations?city=Calgary')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].city).toBe('Calgary');
    });

    test('should respect limit parameter', async () => {
      await createTestLocation({ name: 'Arena 1' });
      await createTestLocation({ name: 'Arena 2' });
      await createTestLocation({ name: 'Arena 3' });

      const response = await request(app)
        .get('/api/locations?limit=2')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/locations')
        .expect(401);
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(knex, 'from').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(500);
    });
  });

  describe('GET /api/locations/:id', () => {
    test('should return specific location by ID', async () => {
      const location = await createTestLocation({ name: 'Specific Arena' });

      const response = await request(app)
        .get(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.id).toBe(location.id);
      expect(response.body.name).toBe('Specific Arena');
    });

    test('should return 404 for non-existent location', async () => {
      await request(app)
        .get('/api/locations/non-existent-id')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });

    test('should return 404 for inactive location', async () => {
      const location = await createTestLocation({ is_active: false });

      await request(app)
        .get(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });

    test('should require authentication', async () => {
      const location = await createTestLocation();

      await request(app)
        .get(`/api/locations/${location.id}`)
        .expect(401);
    });
  });

  describe('POST /api/locations', () => {
    test('should create new location with admin privileges', async () => {
      const locationData = {
        name: 'New Test Arena',
        address: '456 New St',
        city: 'Calgary',
        province: 'AB',
        postal_code: 'T2P 2M2',
        country: 'Canada',
        latitude: 51.0550,
        longitude: -114.0850,
        capacity: 200,
        contact_name: 'John Doe',
        contact_phone: '403-555-0123',
        contact_email: 'john@arena.com',
        rental_rate: 150.00,
        parking_spaces: 50,
        facilities: ['Ice Rink', 'Concession'],
        accessibility_features: ['Wheelchair Access'],
        notes: 'New arena with modern facilities',
        hourly_rate: 100.00,
        game_rate: 200.00,
        cost_notes: 'Rates include maintenance'
      };

      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.name).toBe('New Test Arena');
      expect(response.body.address).toBe('456 New St');
      expect(response.body.capacity).toBe(200);
      expect(response.body.rental_rate).toBe('150');
      expect(JSON.parse(response.body.facilities)).toEqual(['Ice Rink', 'Concession']);

      // Verify it's in the database
      const dbLocation = await knex('locations').where('id', response.body.id).first();
      expect(dbLocation).toBeDefined();
      expect(dbLocation.name).toBe('New Test Arena');

      testLocations.push(response.body);
    });

    test('should trigger distance calculations for location with coordinates', async () => {
      const locationData = {
        name: 'Arena with Coordinates',
        address: '123 Main St',
        city: 'Calgary',
        postal_code: 'T2P 1M1',
        latitude: 51.0447,
        longitude: -114.0719
      };

      await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      // Allow time for async distance calculation trigger
      await new Promise(resolve => setImmediate(resolve));

      expect(distanceServiceMock.calculateAllUsersDistanceToLocation).toHaveBeenCalled();
    });

    test('should skip distance calculations for location without coordinates', async () => {
      const locationData = {
        name: 'Arena without Coordinates',
        address: '123 Main St',
        city: 'Calgary',
        postal_code: 'T2P 1M1'
        // No latitude/longitude
      };

      await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      expect(distanceServiceMock.calculateAllUsersDistanceToLocation).not.toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Arena'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should prevent duplicate locations', async () => {
      const locationData = {
        name: 'Duplicate Arena',
        address: '123 Duplicate St',
        city: 'Calgary',
        postal_code: 'T2P 1M1'
      };

      // Create first location
      await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(409);
    });

    test('should require admin role', async () => {
      const locationData = {
        name: 'Unauthorized Arena',
        address: '123 Main St',
        city: 'Calgary',
        postal_code: 'T2P 1M1'
      };

      await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send(locationData)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/locations')
        .send({ name: 'Test' })
        .expect(401);
    });

    test('should handle numeric field parsing', async () => {
      const locationData = {
        name: 'Numeric Test Arena',
        address: '123 Test St',
        city: 'Calgary',
        postal_code: 'T2P 1M1',
        latitude: '51.0447',
        longitude: '-114.0719',
        capacity: '200',
        rental_rate: '150.50',
        parking_spaces: '75'
      };

      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.latitude).toBe('51.0447');
      expect(response.body.longitude).toBe('-114.0719');
      expect(response.body.capacity).toBe(200);
      expect(response.body.rental_rate).toBe('150.5');
      expect(response.body.parking_spaces).toBe(75);

      testLocations.push(response.body);
    });
  });

  describe('PUT /api/locations/:id', () => {
    test('should update existing location with admin privileges', async () => {
      const location = await createTestLocation({ name: 'Original Arena' });

      const updateData = {
        name: 'Updated Arena',
        capacity: 300,
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Arena');
      expect(response.body.capacity).toBe(300);
      expect(response.body.notes).toBe('Updated notes');
      expect(response.body.address).toBe(location.address); // Unchanged
    });

    test('should handle partial updates', async () => {
      const location = await createTestLocation({
        name: 'Partial Update Arena',
        capacity: 100
      });

      const updateData = { capacity: 150 };

      const response = await request(app)
        .put(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.capacity).toBe(150);
      expect(response.body.name).toBe('Partial Update Arena'); // Unchanged
    });

    test('should return 404 for non-existent location', async () => {
      await request(app)
        .put('/api/locations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    test('should require admin role', async () => {
      const location = await createTestLocation();

      await request(app)
        .put(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });

    test('should handle coordinate updates', async () => {
      const location = await createTestLocation({
        latitude: null,
        longitude: null
      });

      const updateData = {
        latitude: 51.0550,
        longitude: -114.0850
      };

      const response = await request(app)
        .put(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.latitude).toBe('51.055');
      expect(response.body.longitude).toBe('-114.085');
    });
  });

  describe('DELETE /api/locations/:id', () => {
    test('should deactivate location without games', async () => {
      const location = await createTestLocation();

      await request(app)
        .delete(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify location is deactivated
      const dbLocation = await knex('locations').where('id', location.id).first();
      expect(dbLocation.is_active).toBe(false);
    });

    test('should prevent deletion of location with games', async () => {
      const location = await createTestLocation();

      // Create a game at this location
      await knex('games').insert({
        id: `game-${Date.now()}`,
        date: '2024-01-15',
        time: '19:00:00',
        home_team: 'Home Team',
        away_team: 'Away Team',
        location_id: location.id,
        assignor_id: adminUser.id
      });

      await request(app)
        .delete(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      // Verify location is still active
      const dbLocation = await knex('locations').where('id', location.id).first();
      expect(dbLocation.is_active).toBe(true);
    });

    test('should return 404 for non-existent location', async () => {
      await request(app)
        .delete('/api/locations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should require admin role', async () => {
      const location = await createTestLocation();

      await request(app)
        .delete(`/api/locations/${location.id}`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);
    });
  });

  describe('GET /api/locations/distances', () => {
    test('should return user distances with filters', async () => {
      const mockDistances = [
        {
          id: 1,
          location_id: 'loc-1',
          location_name: 'Close Arena',
          distance_meters: 5000,
          drive_time_minutes: 8
        },
        {
          id: 2,
          location_id: 'loc-2',
          location_name: 'Far Arena',
          distance_meters: 25000,
          drive_time_minutes: 35
        }
      ];

      distanceServiceMock.getUserDistances.mockResolvedValueOnce(mockDistances);

      const response = await request(app)
        .get('/api/locations/distances?maxDriveTimeMinutes=30&maxDistanceKm=20')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.distances).toEqual(mockDistances);
      expect(response.body.total).toBe(2);
      expect(response.body.filters.maxDriveTimeMinutes).toBe(30);
      expect(response.body.filters.maxDistanceKm).toBe(20);

      expect(distanceServiceMock.getUserDistances).toHaveBeenCalledWith(
        refereeUser.id,
        {
          maxDriveTimeMinutes: 30,
          maxDistanceMeters: 20000 // Converted from km
        }
      );
    });

    test('should handle empty distances', async () => {
      distanceServiceMock.getUserDistances.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/locations/distances')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.distances).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should apply limit parameter', async () => {
      const mockDistances = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        location_name: `Arena ${i + 1}`
      }));

      distanceServiceMock.getUserDistances.mockResolvedValueOnce(mockDistances);

      const response = await request(app)
        .get('/api/locations/distances?limit=5')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.distances).toHaveLength(5);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/locations/distances')
        .expect(401);
    });
  });

  describe('GET /api/locations/:locationId/distance', () => {
    test('should return distance to specific location', async () => {
      const location = await createTestLocation();

      // Create distance record
      await knex('user_location_distances').insert({
        user_id: refereeUser.id,
        location_id: location.id,
        distance_meters: 10000,
        distance_text: '10.0 km',
        drive_time_minutes: 15,
        drive_time_text: '15 mins',
        calculation_successful: true
      });

      const response = await request(app)
        .get(`/api/locations/${location.id}/distance`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(response.body.location_id).toBe(location.id);
      expect(response.body.distance_meters).toBe(10000);
      expect(response.body.drive_time_minutes).toBe(15);
      expect(response.body.location_name).toBe(location.name);
    });

    test('should return 404 for missing distance data', async () => {
      const location = await createTestLocation();

      await request(app)
        .get(`/api/locations/${location.id}/distance`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });

    test('should exclude failed calculations', async () => {
      const location = await createTestLocation();

      // Create failed distance record
      await knex('user_location_distances').insert({
        user_id: refereeUser.id,
        location_id: location.id,
        calculation_successful: false
      });

      await request(app)
        .get(`/api/locations/${location.id}/distance`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });

    test('should exclude inactive locations', async () => {
      const location = await createTestLocation({ is_active: false });

      await knex('user_location_distances').insert({
        user_id: refereeUser.id,
        location_id: location.id,
        calculation_successful: true
      });

      await request(app)
        .get(`/api/locations/${location.id}/distance`)
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });
  });

  describe('Admin endpoints', () => {
    describe('GET /api/locations/admin/distance-stats', () => {
      test('should return calculation statistics for admin', async () => {
        const mockStats = {
          totalCalculations: 100,
          successfulCalculations: 90,
          failedCalculations: 10,
          needRecalculation: 5,
          averageDistanceMeters: 15000,
          averageDriveTimeMinutes: 20
        };

        distanceServiceMock.getCalculationStats.mockResolvedValueOnce(mockStats);

        const response = await request(app)
          .get('/api/locations/admin/distance-stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toEqual(mockStats);
      });

      test('should require admin role', async () => {
        await request(app)
          .get('/api/locations/admin/distance-stats')
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);
      });
    });

    describe('POST /api/locations/admin/calculate-user-distances/:userId', () => {
      test('should trigger user distance calculation for admin', async () => {
        const response = await request(app)
          .post(`/api/locations/admin/calculate-user-distances/${refereeUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toContain('Distance calculation initiated');
        expect(response.body.userId).toBe(refereeUser.id);

        // Allow time for async operation
        await new Promise(resolve => setImmediate(resolve));
        expect(distanceServiceMock.calculateUserDistancesToAllLocations)
          .toHaveBeenCalledWith(refereeUser.id);
      });

      test('should return 404 for non-existent user', async () => {
        await request(app)
          .post('/api/locations/admin/calculate-user-distances/non-existent-user')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      test('should require admin role', async () => {
        await request(app)
          .post(`/api/locations/admin/calculate-user-distances/${refereeUser.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);
      });
    });

    describe('POST /api/locations/admin/calculate-location-distances/:locationId', () => {
      test('should trigger location distance calculation for admin', async () => {
        const location = await createTestLocation();

        const response = await request(app)
          .post(`/api/locations/admin/calculate-location-distances/${location.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toContain('Distance calculation initiated');
        expect(response.body.locationId).toBe(location.id);
        expect(response.body.locationName).toBe(location.name);

        // Allow time for async operation
        await new Promise(resolve => setImmediate(resolve));
        expect(distanceServiceMock.calculateAllUsersDistanceToLocation)
          .toHaveBeenCalledWith(location.id);
      });

      test('should return 404 for non-existent location', async () => {
        await request(app)
          .post('/api/locations/admin/calculate-location-distances/non-existent-location')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      test('should require admin role', async () => {
        const location = await createTestLocation();

        await request(app)
          .post(`/api/locations/admin/calculate-location-distances/${location.id}`)
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);
      });
    });

    describe('POST /api/locations/admin/retry-failed-calculations', () => {
      test('should trigger retry of failed calculations', async () => {
        const response = await request(app)
          .post('/api/locations/admin/retry-failed-calculations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ maxRetries: 5 })
          .expect(200);

        expect(response.body.message).toContain('Retry initiated');

        // Allow time for async operation
        await new Promise(resolve => setImmediate(resolve));
        expect(distanceServiceMock.retryFailedCalculations).toHaveBeenCalledWith(5);
      });

      test('should use default maxRetries when not provided', async () => {
        await request(app)
          .post('/api/locations/admin/retry-failed-calculations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Allow time for async operation
        await new Promise(resolve => setImmediate(resolve));
        expect(distanceServiceMock.retryFailedCalculations).toHaveBeenCalledWith(10);
      });

      test('should require admin role', async () => {
        await request(app)
          .post('/api/locations/admin/retry-failed-calculations')
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);
      });
    });

    describe('POST /api/locations/admin/initialize-all-distances', () => {
      test('should trigger initialization of all distances', async () => {
        const response = await request(app)
          .post('/api/locations/admin/initialize-all-distances')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toContain('Distance initialization started');
        expect(response.body.warning).toContain('monitor server logs');

        // Allow time for async operation
        await new Promise(resolve => setImmediate(resolve));
        expect(distanceServiceMock.initializeAllDistances).toHaveBeenCalled();
      });

      test('should require admin role', async () => {
        await request(app)
          .post('/api/locations/admin/initialize-all-distances')
          .set('Authorization', `Bearer ${refereeToken}`)
          .expect(403);
      });
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle service errors gracefully', async () => {
      distanceServiceMock.getUserDistances.mockRejectedValueOnce(new Error('Service error'));

      await request(app)
        .get('/api/locations/distances')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(500);
    });

    test('should handle malformed JSON in location data', async () => {
      const locationData = {
        name: 'Test Arena',
        address: '123 Test St',
        city: 'Calgary',
        postal_code: 'T2P 1M1',
        facilities: ['Ice Rink'], // Will be JSON.stringified
        accessibility_features: ['Wheelchair Access']
      };

      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      expect(JSON.parse(response.body.facilities)).toEqual(['Ice Rink']);
      expect(JSON.parse(response.body.accessibility_features)).toEqual(['Wheelchair Access']);

      testLocations.push(response.body);
    });

    test('should handle concurrent location creation', async () => {
      const locationData = {
        name: 'Concurrent Arena',
        address: '123 Concurrent St',
        city: 'Calgary',
        postal_code: 'T2P 1M1'
      };

      // Create multiple concurrent requests
      const promises = [
        request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(locationData),
        request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(locationData)
      ];

      const responses = await Promise.allSettled(promises);

      // One should succeed, one should fail with conflict
      const statuses = responses.map(r => r.value?.status);
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);
    });

    test('should handle invalid UUID parameters', async () => {
      await request(app)
        .get('/api/locations/invalid-uuid')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(404);
    });

    test('should handle very large location data', async () => {
      const locationData = {
        name: 'Large Data Arena',
        address: '123 Large St',
        city: 'Calgary',
        postal_code: 'T2P 1M1',
        notes: 'A'.repeat(10000), // Very long notes
        facilities: Array.from({ length: 100 }, (_, i) => `Facility ${i}`),
        accessibility_features: Array.from({ length: 50 }, (_, i) => `Feature ${i}`)
      };

      const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.notes).toHaveLength(10000);
      expect(JSON.parse(response.body.facilities)).toHaveLength(100);

      testLocations.push(response.body);
    });
  });
});