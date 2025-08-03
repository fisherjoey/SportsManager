const LocationDataService = require('./LocationDataService');
const knex = require('../config/database');

describe('LocationDataService', () => {
  let service;
  let testUserId;

  beforeAll(async () => {
    service = new LocationDataService();
    
    // Create a test user
    const [user] = await knex('users').insert({
      email: 'test-location@example.com',
      password_hash: 'test-hash',
      role: 'referee',
      name: 'Test User',
      postal_code: 'T2P 1M1', // Calgary postal code
      location: 'Calgary, AB'
    }).returning('*');
    
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await knex('user_location_distances').where('user_id', testUserId).del();
      await knex('user_locations').where('user_id', testUserId).del();
      await knex('users').where('id', testUserId).del();
    }
  });

  test('should create location data for user', async () => {
    const result = await service.createOrUpdateUserLocation(testUserId, 'T2P 1M1, Calgary, AB');
    
    expect(result).toBeDefined();
    expect(result.user_id).toBe(testUserId);
    expect(result.postal_code).toBe('T2P 1M1');
    expect(result.city).toBe('Calgary');
    expect(result.province).toBe('AB');
  });

  test('should get user location data', async () => {
    const result = await service.getUserLocation(testUserId);
    
    expect(result).toBeDefined();
    expect(result.user_id).toBe(testUserId);
    expect(result.postal_code).toBe('T2P 1M1');
  });

  test('should extract postal code from address', () => {
    const postalCode = service.extractPostalCode('123 Main St, Calgary, AB T2P 1M1');
    expect(postalCode).toBe('T2P 1M1');
  });

  test('should handle invalid address gracefully', async () => {
    await expect(service.createOrUpdateUserLocation(testUserId, 'INVALID_ADDRESS_12345'))
      .rejects.toThrow('No location data found for address');
  });
});