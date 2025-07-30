const LocationDataService = require('./LocationDataService');
const knex = require('../config/database');

// Mock external dependencies
jest.mock('../../../lib/address-service', () => ({
  createAddressService: jest.fn(() => ({
    searchAddresses: jest.fn().mockResolvedValue([{
      id: 'test-1',
      displayName: '123 Main St, Calgary, AB T2P 1M1, Canada',
      streetNumber: '123',
      streetName: 'Main St',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1M1',
      country: 'Canada',
      coordinates: { lat: 51.0447, lng: -114.0719 },
      confidence: 0.95,
      type: 'street_address'
    }])
  }))
}));

jest.mock('../../../lib/maps', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({
    lat: 51.0447,
    lng: -114.0719
  })
}));

describe('LocationDataService - Basic Tests', () => {
  let service;
  let testUser;

  beforeAll(async () => {
    service = new LocationDataService();
  });

  beforeEach(async () => {
    // Clean up test data
    await knex('user_location_distances').del();
    await knex('user_locations').del();
    await knex('users').where('email', 'like', 'test-%').del();
    
    // Create test user
    [testUser] = await knex('users').insert({
      email: 'test-location@example.com',
      password_hash: 'test-hash',
      role: 'referee',
      name: 'Test User',
      postal_code: 'T2P 1M1'
    }).returning('*');
  });

  afterAll(async () => {
    // Clean up
    if (testUser) {
      await knex('user_location_distances').where('user_id', testUser.id).del();
      await knex('user_locations').where('user_id', testUser.id).del();
      await knex('users').where('id', testUser.id).del();
    }
  });

  test('should create location data for user', async () => {
    const result = await service.createOrUpdateUserLocation(testUser.id, 'T2P 1M1, Calgary, AB');
    
    expect(result).toBeDefined();
    expect(result.user_id).toBe(testUser.id);
    expect(result.postal_code).toBe('T2P 1M1');
    expect(result.city).toBe('Calgary');
    expect(result.province).toBe('AB');
  });

  test('should get user location data', async () => {
    await service.createOrUpdateUserLocation(testUser.id, 'T2P 1M1, Calgary, AB');
    
    const result = await service.getUserLocation(testUser.id);
    
    expect(result).toBeDefined();
    expect(result.user_id).toBe(testUser.id);
    expect(result.postal_code).toBe('T2P 1M1');
  });

  test('should extract postal code from address', () => {
    const postalCode = service.extractPostalCode('123 Main St, Calgary, AB T2P 1M1');
    expect(postalCode).toBe('T2P 1M1');
  });

  test('should handle invalid address gracefully', async () => {
    // Mock empty response for invalid address
    const { createAddressService } = require('../../../lib/address-service');
    const mockService = createAddressService();
    mockService.searchAddresses.mockResolvedValueOnce([]);
    
    await expect(service.createOrUpdateUserLocation(testUser.id, 'INVALID_ADDRESS_12345'))
      .rejects.toThrow('No location data found for address');
  });
});